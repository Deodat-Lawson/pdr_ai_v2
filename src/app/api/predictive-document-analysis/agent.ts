import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

type PdfChunk = {
    id: number;
    content: string;
    page: number;
};

type AnalysisSpecification = {
    type: keyof typeof ANALYSIS_TYPES;
    includeRelatedDocs?: boolean;
    existingDocuments?: string[];
};

export type MissingDocumentPrediction = {
    documentName: string;
    documentType: string;
    reason: string;
    page: number;
    priority: 'high' | 'medium' | 'low';
};

export type PredictiveAnalysisResult = {
    missingDocuments: MissingDocumentPrediction[];
    recommendations: string[];
};

const ANALYSIS_TYPES = {
    contract: `You analyze contracts to find missing referenced documents like exhibits, schedules, and addendums.`,
    financial: `You analyze financial documents to find missing reports, statements, and supporting documentation.`,
    technical: `You analyze technical documents to find missing specifications, manuals, and project deliverables.`,
    compliance: `You analyze compliance documents to find missing regulatory filings and policy documents.`,
    general: `You analyze documents to find any missing referenced or implied documents.`
};

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
    return `
Analyze this document content and find missing referenced documents.

CONTENT:
${content}

Return JSON with this structure:
{
  "missingDocuments": [
    {
      "documentName": "name of missing document",
      "documentType": "type (exhibit, schedule, report, etc.)",
      "reason": "why it's missing",
      "page": page_number_where_referenced,
      "priority": "high|medium|low"
    }
  ],
  "recommendations": ["suggestion1", "suggestion2"]
}

Focus on explicit document references. Be concise.
`;
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

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new Error(`AI analysis timed out after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    // Create AI call promise
    const aiCallPromise = chat.call([
        new SystemMessage(ANALYSIS_TYPES[specification.type]),
        new HumanMessage(prompt)
    ]);

    try {
        // Race between AI call and timeout
        const response = await Promise.race([aiCallPromise, timeoutPromise]);

        console.log("Response:", response);
        let analysisResult: PredictiveAnalysisResult;
        try {
            analysisResult = JSON.parse(response.content.toString());
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            // Return fallback structure if parsing fails
            analysisResult = {
                missingDocuments: [],
                recommendations: []
            };
        }

        return analysisResult;
    } catch (error) {
        console.error("AI Analysis Error:", error);
        throw error;
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
        
        // Combine results from all batches
        const combinedResult: PredictiveAnalysisResult = {
            missingDocuments: [],
            recommendations: []
        };

        batchResults.forEach(result => {
            combinedResult.missingDocuments.push(...result.missingDocuments);
            combinedResult.recommendations.push(...result.recommendations);
        });

        // Deduplicate results
        combinedResult.missingDocuments = deduplicateMissingDocuments(combinedResult.missingDocuments);
        combinedResult.recommendations = [...new Set(combinedResult.recommendations)]; // Deduplicate strings

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


