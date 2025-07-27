// NOTE: agent.ts does not interact with the database, so no changes for Drizzle ORM are needed.
// It remains focused on AI analysis and web search logic. Minor type consistency updates

import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { z } from "zod";
import { db } from "../../../server/db/index";
import { and, eq, inArray, ne, sql} from "drizzle-orm";
import { pdfChunks, document, documentReferenceResolution } from "~/server/db/schema";

type PdfChunk = {
    id: number;
    content: string;
    page: number;
};

type AnalysisSpecification = {
    type: keyof typeof ANALYSIS_TYPES;
    includeRelatedDocs?: boolean;
    existingDocuments?: string[];
    title: string;
    category: string;
};

export type SearchResult = {
    title: string;
    url: string;
    snippet: string;
};

export type MissingDocumentPrediction = {
    documentName: string;
    documentType: string;
    reason: string;
    page: number;
    priority: 'high' | 'medium' | 'low';
    suggestedLinks?: SearchResult[];
};

export type PredictiveAnalysisResult = {
    missingDocuments: MissingDocumentPrediction[];
    recommendations: string[];
    suggestedRelatedDocuments?: SearchResult[];
};

const ANALYSIS_TYPES = {
    contract: `You are an expert in analyzing contracts to identify missing referenced documents like exhibits, schedules, and addendums.`,
    financial: `You are an expert in analyzing financial documents to identify missing reports, statements, and supporting documentation.`,
    technical: `You are an expert in analyzing technical documents to identify missing specifications, manuals, and project deliverables.`,
    compliance: `You are an expert in analyzing compliance documents to identify missing regulatory filings and policy documents.`,
    general: `You are an expert in analyzing documents to identify any missing referenced or implied documents.`
};

const ReferenceExtractionSchema = z.object({
    references: z.array(z.object({
        documentName: z.string(),
        documentType: z.string(),
        page: z.number(),
        contextSnippet: z.string()
    })).describe('Extracted references')
})

const MissingDocumentSchema = z.object({
    documentName: z.string().describe('The name of the missing document'),
    documentType: z.string().describe('The type of the missing document'),
    reason: z.string().describe('The reason the document is missing'),
    page: z.number().describe('The page number where the document is referenced'),
    priority: z.enum(['high', 'medium', 'low']).describe('The priority of the missing document')
});

const AnalysisResultSchema = z.object({
    missingDocuments: z.array(MissingDocumentSchema).describe('The missing documents found in the document'),
    recommendations: z.array(z.string()).describe('The recommendations for handling the missing documents')
});

async function getEmbeddings(text: string): Promise<number[]> {
    try {
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-ada-002",
        });
        const [embedding] = await embeddings.embedDocuments([text]);
        return embedding || [];
    } catch (error) {
        console.error("Error getting embeddings:", error);
        return [];
    }
}

function createReferenceExtractionPrompt(content: string): string {
    return `
    You are an expert in extracting references from documents.

    Extract all explicit references to external documents from the content (e.g., "Exhibit A", "Schedule 1").
    For each, provide name, type (e.g., exhibit, schedule), page, and a short context snippet (20-50 words around the reference).
    Focus on references that seem to point to attached or related documents that might be missing.
    Avoid duplicates.
    CONTENT:
    ${content}`;
}

async function extractReferences(chunks: PdfChunk[], timeoutMs: number = 30000): Promise<{documentName: string, documentType: string, page: number, contextSnippet: string}[]> {
    const content = groupContentFromChunks(chunks);
    const prompt = createReferenceExtractionPrompt(content);
    const chat = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4o",
        temperature: 0.1,
    });

    const structuredModel = chat.withStructuredOutput(ReferenceExtractionSchema, {
        name: "reference_extraction"
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`Reference extraction timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    const aiCallPromise = structuredModel.invoke([
        new SystemMessage("Extract references step-by-step"),
        new HumanMessage(prompt)
    ]);

    try {
        const response = await Promise.race([aiCallPromise, timeoutPromise]);
        const references = response.references;
        return references;
    } catch (error) {
        console.error("Reference extraction error:", error);
        return [];
    }
}

async function searchOtherDocsForReference(companyId: number, currentDocumentId: number, reference: {documentName: string, documentType: string, contextSnippet: string})
: Promise<({id: number, content: string, page: number, documentId: number, distance: unknown})[]> {
    const otherDocs = await db.select({ id: document.id }).from(document).where(and(eq(document.companyId, companyId.toString()), ne(document.id, currentDocumentId)));
    
    const otherDocIds = otherDocs.map(doc => doc.id);

    if(otherDocIds.length === 0) {
        return [];
    }

    const queryText = `Full detailed content of ${reference.documentName} (${reference.documentType}) as referenced in this context: ${reference.contextSnippet}`;
    const queryEmbedding = await getEmbeddings(queryText);

    if (!queryEmbedding.length) {
        return [];
    }

    const distanceSql = sql`embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector`;
    const results = await db.select({
        id: pdfChunks.id,
        content: pdfChunks.content,
        page: pdfChunks.page,
        documentId: pdfChunks.documentId,
        distance: distanceSql
    }).from(pdfChunks).where(and(inArray(pdfChunks.documentId, otherDocIds), sql `${distanceSql} < 0.3`)).orderBy(distanceSql).limit(5);

    return results;
}


async function confirmFulfillment(reference: {documentName: string, documentType: string, contextSnippet: string}, matchedChunks: {content: string, page: number, documentId: number, distance: unknown}[]) 
: Promise<{fulfilled: boolean, details? : {documentId: number, page: number, snippet: string}}>
{
    if (!matchedChunks.length) return {fulfilled: false};

    const chunksSummary = matchedChunks.map(c => `From document ${c.documentId}, page ${c.page} (distance ${c.distance}): ${c.content.slice(0, 500)}...`).join('\n\n');

    const prompt = `
    Given the reference "${reference.documentName}" (${reference.documentType}) from original context: "${reference.contextSnippet}",
    determine if any of these matched chunks contain the actual full content that fulfills this reference.
    Look for semantic match: Does it provide the details expected (e.g., if reference is to a schedule of payments, does the chunk contain payment terms?).
    If yes, select the best matching one (lowest distance, most complete) and respond with {fulfilled: true, details: {documentId, page, snippet: brief excerpt proving fulfillment}}.
    If none truly fulfill (e.g., just mentions without content), respond with {fulfilled: false}.
    Be strict: Only confirm if it's a clear fulfillment.`;

    const chat = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4o-mini",
        temperature: 0,
      });
    
      try {
        const response = await chat.invoke([new HumanMessage(prompt + "\n\nMATCHED CHUNKS:\n" + chunksSummary)]);
        return JSON.parse(response.content as string);
      } catch (error) {
        console.error("Fulfillment confirmation error:", error);
        return { fulfilled: false };
      }
}
/**
 * Groups content from PDF chunks into a formatted string
 */
export function groupContentFromChunks(chunks: PdfChunk[]): string {
    return chunks
        .map((chunk) => `=== Page ${chunk.page} ===\n${chunk.content}`)
        .join("\n\n");
}

/**
 * Creates analysis prompt based on content and specification
 */
function createAnalysisPrompt(
    content: string,
    specification: AnalysisSpecification
): string {
    let existingDocsStr = '';
    if (specification.existingDocuments && specification.existingDocuments.length > 0) {
        existingDocsStr = `\nExisting documents (do not suggest these as missing): ${specification.existingDocuments.join(', ')}.`;
    }

    const exampleByType = {
        contract: `Example: If content mentions "See Exhibit A for payment terms" but Exhibit A isn't included, identify as missing with details.`,
        financial: `Example: If content references "Balance Sheet as of Dec 31" without attachment, identify as missing with details.`,
        technical: `Example: If content mentions "Refer to Manual v2.0" but not included, identify as missing with details.`,
        compliance: `Example: If content references "GDPR Policy" without attachment, identify as missing with details.`,
        general: `Example: If content mentions "See attached report" but not included, identify as missing with details.`
    };

    return `
        ${ANALYSIS_TYPES[specification.type]}

        Analyze the document content step-by-step to find missing referenced documents${specification.includeRelatedDocs ? ' considering broader related document context and potential online searches for templates' : ''}.

        Chain of Thought:
        1. Scan the content for explicit references to other documents (e.g., "see Exhibit A", "as per Schedule 3").
        2. For each reference, check if it's likely missing (not included in this content or existing documents).
        3. Classify: Name, type, reason (concise), page where referenced, priority (high if critical, medium if supportive, low if optional).
        4. Generate 2-3 recommendations for handling missing items, including searching online for templates.
        5. Avoid duplicates or suggestions for existing documents.
        6. Focus on explicit references; be concise and accurate.

        ${exampleByType[specification.type] || exampleByType.general}

        Existing Documents: ${existingDocsStr}

        CONTENT:
        ${content}
`;
}


// lets default the max results to 5
async function performWebSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
    try {
        const searchTool = new DuckDuckGoSearch({ maxResults });
        const result = await searchTool.invoke(query);
        const parsed = JSON.parse(result) as SearchResult[];
        return parsed;
    } catch (error) {
        console.error("Web search error:", error);
        return [];
    }
}


/**
 * Makes AI API call with timeout and error handling
 */
export async function callAIAnalysis(
    chunks: PdfChunk[],
    specification: AnalysisSpecification,
    timeoutMs: number = 30000 // 30 seconds default timeout
): Promise<PredictiveAnalysisResult> {
    const content = groupContentFromChunks(chunks);
    const prompt = createAnalysisPrompt(content, specification);

    const chat = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4o",
        temperature: 0.1,
    });

    const structuredModel = chat.withStructuredOutput(AnalysisResultSchema, {
        name: "analysis_result"
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`AI analysis timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    const aiCallPromise = structuredModel.invoke([
        new SystemMessage(ANALYSIS_TYPES[specification.type]),
        new HumanMessage(prompt)
    ]);

    try {
        const response = await Promise.race([aiCallPromise, timeoutPromise]);
        const analysisResult: PredictiveAnalysisResult = response as PredictiveAnalysisResult;

        return analysisResult;
    } catch (error) {
        console.error("AI Analysis Error:", error);
        return {
            missingDocuments: [],
            recommendations: []
        };
    }
}

/**
 * Processes chunks in batches and combines results
 */
export async function analyzeDocumentChunks(
    allChunks: PdfChunk[],
    specification: AnalysisSpecification & {companyId: number, documentId: number},
    batchSize: number = 25,
    timeoutMs: number = 30000
): Promise<PredictiveAnalysisResult> {
    const batches: PdfChunk[][] = [];

    // Split chunks into batches
    for (let i = 0; i < allChunks.length; i += batchSize) {
        batches.push(allChunks.slice(i, i + batchSize));
    }

    // Process batches in parallel with individual timeouts
    const batchPromises = batches.map(batch =>
        callAIAnalysis(batch, specification, timeoutMs)
    );

    try {
        const batchResults = await Promise.all(batchPromises);

        const combinedResult: PredictiveAnalysisResult = {
            missingDocuments: [],
            recommendations: []
        };

        batchResults.forEach(result => {
            combinedResult.missingDocuments.push(...result.missingDocuments);
            combinedResult.recommendations.push(...result.recommendations);
        });

        combinedResult.missingDocuments = deduplicateMissingDocuments(combinedResult.missingDocuments);
        combinedResult.recommendations = [...new Set(combinedResult.recommendations)];

        // New: Reference resolution if includeRelatedDocs
        if (specification.includeRelatedDocs) {
            const { companyId, documentId } = specification;

            // Extract references (done once for the whole document)
            const references = await extractReferences(allChunks, timeoutMs);

            const missingDocuments: MissingDocumentPrediction[] = [];

            for (const ref of references) {
                // Check cache
                const cached = await db.select()
                    .from(documentReferenceResolution)
                    .where(and(
                        eq(documentReferenceResolution.companyId, companyId),
                        eq(documentReferenceResolution.referenceName, ref.documentName)
                    ))
                    .limit(1);

                if (cached.length) {
                    if (cached[0] && cached[0].resolvedInDocumentId !== null) {
                        continue;
                    } else {
                        missingDocuments.push({
                            documentName: ref.documentName,
                            documentType: ref.documentType,
                            reason: 'Previously cached as missing in company documents',
                            page: ref.page,
                            priority: 'high'
                        });
                        continue;
                    }
                }

                // Check if fulfilled in current document
                const currentMatched = await searchOtherDocsForReference(companyId, documentId, ref);

                let fulfilled = false;
                let resolutionDetails: {documentId: number, page: number, snippet: string} | null = null;

                if (currentMatched.length) {
                    const confirmation = await confirmFulfillment(ref, currentMatched);
                    fulfilled = confirmation.fulfilled;
                    if (fulfilled && confirmation.details) {
                        resolutionDetails = confirmation.details;
                    }
                }

                if (fulfilled) {
                    await db.insert(documentReferenceResolution).values({
                        companyId,
                        referenceName: ref.documentName,
                        resolvedInDocumentId: documentId,
                        resolutionDetails,
                        createdAt: new Date()
                    });
                    continue;
                }

                // If not fulfilled in current, search other docs
                const otherMatched = await searchOtherDocsForReference(companyId, documentId, ref);

                if (otherMatched.length) {
                    const confirmation = await confirmFulfillment(ref, otherMatched);
                    fulfilled = confirmation.fulfilled;
                    if (fulfilled && confirmation.details) {
                        resolutionDetails = confirmation.details;
                    }
                }

                // Cache the result
                await db.insert(documentReferenceResolution).values({
                    companyId,
                    referenceName: ref.documentName,
                    resolvedInDocumentId: fulfilled ? resolutionDetails?.documentId ?? null : null,
                    resolutionDetails: fulfilled ? resolutionDetails : null,
                    createdAt: new Date()
                });

                if (!fulfilled) {
                    missingDocuments.push({
                        documentName: ref.documentName,
                        documentType: ref.documentType,
                        reason: 'Not found or not fulfilled in any company documents',
                        page: ref.page,
                        priority: 'high' // temporarily defaulting to high priority
                    });
                }
            }

            // Merge with existing missingDocuments from batch analysis
            combinedResult.missingDocuments = deduplicateMissingDocuments([...combinedResult.missingDocuments, ...missingDocuments]);

            // Proceed with web searches for missing ones as in original code
            const relatedQuery = `standard related documents for ${specification.type} ${specification.category} titled ${specification.title}`;
            combinedResult.suggestedRelatedDocuments = await performWebSearch(relatedQuery, 5);

            const highPriorityMissing = combinedResult.missingDocuments.filter(doc => doc.priority === 'high');
            for (const missing of highPriorityMissing) {
                const missingQuery = `${missing.documentName} ${missing.documentType} template example site:gov OR site:edu OR site:org`;
                missing.suggestedLinks = await performWebSearch(missingQuery, 3); 
            }
        }
        return combinedResult;
    } catch (error) {
        console.error("Batch analysis error:", error);
        throw error;
    }
}

/**
 * Helper function to deduplicate missing documents based on name similarity
 */
function deduplicateMissingDocuments(docs: MissingDocumentPrediction[]): MissingDocumentPrediction[] {
    const seen = new Set<string>();
    return docs.filter(doc => {
        const key = doc.documentName.toLowerCase().trim();
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}