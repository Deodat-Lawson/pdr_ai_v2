// NOTE: agent.ts does not interact with the database, so no changes for Drizzle ORM are needed.
// It remains focused on AI analysis and web search logic. Minor type consistency updates

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { z } from "zod";

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
    specification: AnalysisSpecification,
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

        if (specification.includeRelatedDocs) {
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


