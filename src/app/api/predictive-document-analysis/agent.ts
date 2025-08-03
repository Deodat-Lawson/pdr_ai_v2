import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { z } from "zod";
import { db } from "../../../server/db/index";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
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
    suggestedCompanyDocuments?: {
        documentId: number;
        documentTitle: string;
        similarity: number;
        page: number;
        snippet: string;
    }[];
    resolvedIn?: {
        documentId: number;
        page: number;
        documentTitle?: string;
    };
};

export type ResolvedReference = {
    documentName: string;
    documentType: string;
    reason: string;
    originalPage: number;
    resolvedDocumentId: number;
    resolvedPage: number;
    resolvedDocumentTitle?: string;
    priority: 'high' | 'medium' | 'low';
};

export type PredictiveAnalysisResult = {
    missingDocuments: MissingDocumentPrediction[];
    recommendations: string[];
    suggestedRelatedDocuments?: SearchResult[];
    resolvedDocuments?: ResolvedReference[];
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
});

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

const embeddingCache = new Map<string, number[]>();

async function getEmbeddings(text: string): Promise<number[]> {
    if (embeddingCache.has(text)) return embeddingCache.get(text)!;
    try {
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-ada-002",
        });
        const [embedding] = await embeddings.embedDocuments([text]);
        const result = embedding || [];
        embeddingCache.set(text, result);
        return result;
    } catch (error) {
        console.error("Error getting embeddings:", error);
        return [];
    }
}

async function batchGetEmbeddings(texts: string[]): Promise<number[][]> {
    const uniqueTexts = [...new Set(texts)];
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "text-embedding-ada-002",
    });
    const results = await embeddings.embedDocuments(uniqueTexts);
    const map = new Map(uniqueTexts.map((text, i) => [text, results[i]]));
    return texts.map(text => map.get(text) || []);
}

function createReferenceExtractionPrompt(content: string): string {
    return `
    You are an expert in extracting references from documents.

    Extract ONLY clear, explicit references to separate documents that should be attached or included (e.g., "See Exhibit A", "Schedule 1 attached", "Refer to Addendum B").
    
    IMPORTANT RULES:
    - Only extract references that use specific document identifiers (Exhibit A, Schedule 1, Attachment B, etc.)
    - Ignore general mentions like "other documents", "additional forms", "related materials"
    - Ignore references to external documents that are clearly not part of this document set
    - Only include references where the document is expected to be attached or included
    - Be very conservative - when in doubt, don't extract it
    
    For each valid reference, provide:
    - name: The specific document identifier (e.g., "Exhibit A", "Schedule 1")
    - type: The document type (exhibit, schedule, attachment, addendum)
    - page: The page number where referenced
    - contextSnippet: 15-30 words around the reference showing why it should be included
    
    CONTENT:
    ${content}`;
}

async function extractReferences(chunks: PdfChunk[], timeoutMs: number = 30000): Promise<{ documentName: string, documentType: string, page: number, contextSnippet: string }[]> {
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

async function searchDocsForReference(
    companyId: number,
    reference: { documentName: string, documentType: string, contextSnippet: string },
    targetDocumentIds: number[]
): Promise<{ id: number, content: string, page: number, documentId: number, distance: unknown }[]> {
    if (targetDocumentIds.length === 0) return [];

    const queryText = `Full detailed content of ${reference.documentName} (${reference.documentType}) as referenced in this context: ${reference.contextSnippet}`;
    const queryEmbedding = await getEmbeddings(queryText);
    if (!queryEmbedding.length) return [];

    const distanceSql = sql`embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector`;
    const results = await db.select({
        id: pdfChunks.id,
        content: pdfChunks.content,
        page: pdfChunks.page,
        documentId: pdfChunks.documentId,
        distance: distanceSql
    }).from(pdfChunks).where(and(
        inArray(pdfChunks.documentId, targetDocumentIds),
        sql`${distanceSql} < 0.3`
    )).orderBy(distanceSql).limit(5);

    return results;
}

async function confirmFulfillment(reference: { documentName: string, documentType: string, contextSnippet: string }, matchedChunks: { content: string, page: number, documentId: number, distance: unknown }[])
    : Promise<{ fulfilled: boolean, details?: { documentId: number, page: number, snippet: string } }> {
    if (!matchedChunks.length) return { fulfilled: false };

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
        modelName: "gpt-4o",
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

async function findSuggestedCompanyDocuments(
    missingDoc: { documentName: string, documentType: string, reason: string },
    companyId: number,
    currentDocumentId: number,
    docTitleMap: Map<number, string>
): Promise<{ documentId: number, documentTitle: string, similarity: number, page: number, snippet: string }[]> {
    try {
        console.log(`🔍 Searching for company documents matching: "${missingDoc.documentName}" (${missingDoc.documentType})`);
        
        // Get all other documents in the company
        const otherDocsQuery = await db.select({ 
            id: document.id, 
            title: document.title 
        }).from(document).where(and(
            eq(document.companyId, companyId.toString()),
            ne(document.id, currentDocumentId)
        ));
        
        const otherDocIds = otherDocsQuery.map(doc => doc.id);
        if (otherDocIds.length === 0) return [];

        const suggestions = new Map<number, { similarity: number, page: number, snippet: string, score: number, reasons: string[] }>();

        // Strategy 1: Title-based matching (most reliable)
        const titleMatches = await findTitleMatches(missingDoc, otherDocsQuery);
        for (const match of titleMatches) {
            suggestions.set(match.documentId, {
                similarity: match.similarity,
                page: 1,
                snippet: `Title match: "${match.title}"`,
                score: match.similarity * 100,
                reasons: [`Document title contains "${match.matchedTerm}"`]
            });
        }

        // Strategy 2: Content-based semantic search (with validation)
        const contentMatches = await findContentMatches(missingDoc, otherDocIds);
        for (const match of contentMatches) {
            const existing = suggestions.get(match.documentId);
            if (!existing || match.similarity > existing.similarity) {
                const validatedMatch = await validateContentMatch(missingDoc, match);
                if (validatedMatch.isValid) {
                    suggestions.set(match.documentId, {
                        similarity: validatedMatch.confidence,
                        page: match.page,
                        snippet: match.snippet,
                        score: validatedMatch.confidence * 100,
                        reasons: validatedMatch.reasons
                    });
                }
            }
        }

        // Strategy 3: Keyword and pattern matching
        const keywordMatches = await findKeywordMatches(missingDoc, otherDocIds);
        for (const match of keywordMatches) {
            const existing = suggestions.get(match.documentId);
            if (!existing || (match.similarity > existing.similarity && match.similarity > 0.6)) {
                suggestions.set(match.documentId, {
                    similarity: match.similarity,
                    page: match.page,
                    snippet: match.snippet,
                    score: match.similarity * 100,
                    reasons: [`Keyword match: "${match.keyword}"`]
                });
            }
        }

        // Convert to final format with meaningful similarity scores
        const finalSuggestions = Array.from(suggestions.entries())
            .map(([docId, match]) => ({
                documentId: docId,
                documentTitle: docTitleMap.get(docId) || `Document ${docId}`,
                similarity: Math.round(match.score) / 100, // Convert back to 0-1 range but with meaningful values
                page: match.page,
                snippet: `${match.snippet} (${match.reasons.join(', ')})`
            }))
            .filter(s => s.similarity >= 0.3) // More reasonable threshold
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3); // Show up to 3 suggestions

        console.log(`✅ Found ${finalSuggestions.length} validated suggestions for ${missingDoc.documentName}`);
        finalSuggestions.forEach(s => console.log(`  - ${s.documentTitle}: ${Math.round(s.similarity * 100)}% confidence`));
        
        return finalSuggestions;
    } catch (error) {
        console.error("Error finding suggested company documents:", error);
        return [];
    }
}

// Helper function: Find matches based on document titles
async function findTitleMatches(
    missingDoc: { documentName: string, documentType: string },
    allDocs: { id: number, title: string }[]
): Promise<{ documentId: number, title: string, similarity: number, matchedTerm: string }[]> {
    const matches: { documentId: number, title: string, similarity: number, matchedTerm: string }[] = [];
    
    const cleanDocName = missingDoc.documentName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const cleanDocType = missingDoc.documentType.toLowerCase();
    
    for (const doc of allDocs) {
        const cleanTitle = doc.title.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        let similarity = 0;
        let matchedTerm = '';
        
        // Exact name match in title
        if (cleanTitle.includes(cleanDocName)) {
            similarity = 0.9;
            matchedTerm = missingDoc.documentName;
        }
        // Type match in title
        else if (cleanTitle.includes(cleanDocType)) {
            similarity = 0.7;
            matchedTerm = missingDoc.documentType;
        }
        // Partial name match (for multi-word names)
        else {
            const nameWords = cleanDocName.split(/\s+/).filter(w => w.length > 2);
            const matchedWords = nameWords.filter(word => cleanTitle.includes(word));
            if (matchedWords.length > 0) {
                similarity = (matchedWords.length / nameWords.length) * 0.6;
                matchedTerm = matchedWords.join(', ');
            }
        }
        
        if (similarity > 0.3) {
            matches.push({ documentId: doc.id, title: doc.title, similarity, matchedTerm });
        }
    }
    
    return matches.sort((a, b) => b.similarity - a.similarity);
}

// Helper function: Find content-based matches using embeddings
async function findContentMatches(
    missingDoc: { documentName: string, documentType: string },
    docIds: number[]
): Promise<{ documentId: number, page: number, snippet: string, similarity: number, content: string }[]> {
    // Create more targeted search queries
    const searchQueries = [
        // Direct reference pattern
        `"${missingDoc.documentName}"`,
        // Common reference patterns
        `see ${missingDoc.documentName}`,
        `refer to ${missingDoc.documentName}`,
        `as per ${missingDoc.documentName}`,
        // Type-based patterns
        `${missingDoc.documentType} ${missingDoc.documentName.split(' ').pop()}` // e.g., "exhibit A"
    ];

    const allMatches: { documentId: number, page: number, snippet: string, similarity: number, content: string }[] = [];
    
    for (const query of searchQueries) {
        const queryEmbedding = await getEmbeddings(query);
        if (!queryEmbedding.length) continue;

        const distanceSql = sql`embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector`;
        const results = await db.select({
            id: pdfChunks.id,
            content: pdfChunks.content,
            page: pdfChunks.page,
            documentId: pdfChunks.documentId,
            distance: distanceSql
        }).from(pdfChunks).where(and(
            inArray(pdfChunks.documentId, docIds),
            sql`${distanceSql} < 0.4` // More lenient for content search
        )).orderBy(distanceSql).limit(10);

        for (const result of results) {
            const distance = Number(result.distance) || 1;
            // More realistic similarity calculation
            const similarity = Math.max(0, (1 - distance) * 0.8); // Scale down to be more realistic
            
            allMatches.push({
                documentId: result.documentId,
                page: result.page,
                snippet: result.content.slice(0, 200),
                similarity,
                content: result.content
            });
        }
    }
    
    // Group by document and get best match per document
    const bestMatches = new Map<number, { documentId: number, page: number, snippet: string, similarity: number, content: string }>();
    
    for (const match of allMatches) {
        const existing = bestMatches.get(match.documentId);
        if (!existing || match.similarity > existing.similarity) {
            bestMatches.set(match.documentId, match);
        }
    }
    
    return Array.from(bestMatches.values());
}

// Helper function: Find keyword-based matches
async function findKeywordMatches(
    missingDoc: { documentName: string, documentType: string },
    docIds: number[]
): Promise<{ documentId: number, page: number, snippet: string, similarity: number, keyword: string }[]> {
    // Extract key terms from the missing document name
    const keywords = [
        missingDoc.documentName.toLowerCase(),
        ...missingDoc.documentName.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    ];
    
    const matches: { documentId: number, page: number, snippet: string, similarity: number, keyword: string }[] = [];
    
    for (const keyword of keywords) {
        // Use SQL LIKE for exact keyword matching
        const results = await db.select({
            id: pdfChunks.id,
            content: pdfChunks.content,
            page: pdfChunks.page,
            documentId: pdfChunks.documentId,
        }).from(pdfChunks).where(and(
            inArray(pdfChunks.documentId, docIds),
            sql`LOWER(${pdfChunks.content}) LIKE ${`%${keyword}%`}`
        )).limit(5);
        
        for (const result of results) {
            // Calculate similarity based on keyword frequency and context
            const content = result.content.toLowerCase();
            const keywordCount = (content.match(new RegExp(keyword, 'g')) || []).length;
            const contextRelevance = content.includes(missingDoc.documentType.toLowerCase()) ? 1.2 : 1.0;
            const similarity = Math.min(0.8, (keywordCount * 0.2 * contextRelevance));
            
            if (similarity > 0.2) {
                matches.push({
                    documentId: result.documentId,
                    page: result.page,
                    snippet: result.content.slice(0, 150),
                    similarity,
                    keyword
                });
            }
        }
    }
    
    return matches;
}

// Helper function: Validate that a content match is actually relevant
async function validateContentMatch(
    missingDoc: { documentName: string, documentType: string },
    match: { content: string, similarity: number }
): Promise<{ isValid: boolean, confidence: number, reasons: string[] }> {
    const content = match.content.toLowerCase();
    const docName = missingDoc.documentName.toLowerCase();
    const docType = missingDoc.documentType.toLowerCase();
    
    const reasons: string[] = [];
    let confidence = match.similarity;
    
    // Check for direct mentions
    if (content.includes(docName)) {
        confidence += 0.3;
        reasons.push(`Direct mention of "${missingDoc.documentName}"`);
    }
    
    // Check for reference patterns
    const referencePatterns = [
        `see ${docName}`,
        `refer to ${docName}`,
        `as per ${docName}`,
        `according to ${docName}`,
        `${docName} attached`,
        `${docName} shows`
    ];
    
    for (const pattern of referencePatterns) {
        if (content.includes(pattern)) {
            confidence += 0.2;
            reasons.push(`Reference pattern found`);
            break;
        }
    }
    
    // Check for type relevance
    if (content.includes(docType)) {
        confidence += 0.1;
        reasons.push(`Document type match`);
    }
    
    // Validation: must have at least one concrete reason
    const isValid = reasons.length > 0 && confidence > 0.3;
    
    return {
        isValid,
        confidence: Math.min(confidence, 0.95), // Cap at 95%
        reasons
    };
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
 * Processes chunks in batches and combines results with advanced reference resolution
 */
export async function analyzeDocumentChunks(
    allChunks: PdfChunk[],
    specification: AnalysisSpecification & { companyId: number, documentId: number },
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
            recommendations: [],
            resolvedDocuments: []
        };

        batchResults.forEach(result => {
            combinedResult.missingDocuments.push(...result.missingDocuments);
            combinedResult.recommendations.push(...result.recommendations);
        });

        combinedResult.missingDocuments = deduplicateMissingDocuments(combinedResult.missingDocuments);
        combinedResult.recommendations = [...new Set(combinedResult.recommendations)];

        // Enhanced: Reference resolution if includeRelatedDocs and we have some missing documents to investigate
        if (specification.includeRelatedDocs && combinedResult.missingDocuments.length > 0) {
            const { companyId, documentId } = specification;

            // Extract references (done once for the whole document)
            const references = await extractReferences(allChunks, timeoutMs);
            console.log(`Extracted ${references.length} references for resolution`);
            
            // Filter references to only those that might be truly missing
            const filteredReferences = references.filter(ref => {
                // Only process references that have specific identifiers
                const hasSpecificIdentifier = /^(exhibit|schedule|attachment|addendum|appendix)\s+[a-z0-9]+$/i.test(ref.documentName) ||
                                            /^[a-z]+\s+(exhibit|schedule|attachment|addendum|appendix)$/i.test(ref.documentName);
                return hasSpecificIdentifier;
            });
            
            console.log(`Filtered to ${filteredReferences.length} high-quality references`);

            // Get all other doc IDs and their titles
            const otherDocsQuery = await db.select({ 
                id: document.id, 
                title: document.title 
            }).from(document).where(and(
                eq(document.companyId, companyId.toString()),
                ne(document.id, documentId)
            ));
            
            const otherDocIds = otherDocsQuery.map(doc => doc.id);
            const docTitleMap = new Map(otherDocsQuery.map(doc => [doc.id, doc.title]));

            const resolvedDocuments: ResolvedReference[] = [];
            const missingDocuments: MissingDocumentPrediction[] = [];

            for (const ref of filteredReferences) {
                // Check cache first
                const cached = await db.select()
                    .from(documentReferenceResolution)
                    .where(and(
                        eq(documentReferenceResolution.companyId, companyId),
                        eq(documentReferenceResolution.referenceName, ref.documentName)
                    ))
                    .limit(1);

                if (cached.length && cached[0]) {
                    if (cached[0].resolvedInDocumentId !== null) {
                        // Found in cache as resolved
                        const details = cached[0].resolutionDetails as any;
                        resolvedDocuments.push({
                            documentName: ref.documentName,
                            documentType: ref.documentType,
                            reason: 'Found in company document (cached)',
                            originalPage: ref.page,
                            resolvedDocumentId: cached[0].resolvedInDocumentId,
                            resolvedPage: details?.page || 1,
                            resolvedDocumentTitle: docTitleMap.get(cached[0].resolvedInDocumentId) || `Document ${cached[0].resolvedInDocumentId}`,
                            priority: 'medium'
                        });
                        continue;
                    } else {
                        // Found in cache as missing
                        missingDocuments.push({
                            documentName: ref.documentName,
                            documentType: ref.documentType,
                            reason: 'Previously verified as missing in company documents',
                            page: ref.page,
                            priority: 'high'
                        });
                        continue;
                    }
                }

                // Search in other company documents
                let fulfilled = false;
                let resolutionDetails: { documentId: number, page: number, snippet: string } | null = null;

                const matchedChunks = await searchDocsForReference(companyId, ref, otherDocIds);
                
                if (matchedChunks.length > 0) {
                    console.log(`Found ${matchedChunks.length} potential matches for ${ref.documentName}`);
                    const confirmation = await confirmFulfillment(ref, matchedChunks);
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

                if (fulfilled && resolutionDetails) {
                    resolvedDocuments.push({
                        documentName: ref.documentName,
                        documentType: ref.documentType,
                        reason: 'Found matching content in company document',
                        originalPage: ref.page,
                        resolvedDocumentId: resolutionDetails.documentId,
                        resolvedPage: resolutionDetails.page,
                        resolvedDocumentTitle: docTitleMap.get(resolutionDetails.documentId) || `Document ${resolutionDetails.documentId}`,
                        priority: 'medium'
                    });
                } else {
                    missingDocuments.push({
                        documentName: ref.documentName,
                        documentType: ref.documentType,
                        reason: 'Not found in any company documents',
                        page: ref.page,
                        priority: 'high'
                    });
                }
            }

            // Merge with existing missingDocuments from batch analysis
            combinedResult.missingDocuments = deduplicateMissingDocuments([...combinedResult.missingDocuments, ...missingDocuments]);
            combinedResult.resolvedDocuments = resolvedDocuments;

            console.log(`Final result: ${combinedResult.missingDocuments.length} missing, ${resolvedDocuments.length} resolved`);

            // Find suggested company documents for missing ones
            console.log(`Finding suggested company documents for ${combinedResult.missingDocuments.length} missing documents`);
            for (const missing of combinedResult.missingDocuments) {
                const suggestions = await findSuggestedCompanyDocuments(
                    missing,
                    companyId,
                    documentId,
                    docTitleMap
                );
                if (suggestions.length > 0) {
                    missing.suggestedCompanyDocuments = suggestions;
                    console.log(`Found ${suggestions.length} company document suggestions for ${missing.documentName}`);
                }
            }

            // Web searches for missing ones
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