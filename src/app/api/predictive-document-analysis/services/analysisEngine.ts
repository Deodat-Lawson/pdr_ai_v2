import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import type { 
    PdfChunk, 
    AnalysisSpecification, 
    PredictiveAnalysisResult, 
    MissingDocumentPrediction,
    SearchResult
} from "../types";
import { ANALYSIS_TYPES } from "../types";
import { groupContentFromChunks } from "../utils/content";
import { extractReferences, deduplicateReferences } from "./referenceExtractor";
import { findSuggestedCompanyDocuments } from "./documentMatcher";

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

function createAnalysisPrompt(
    content: string,
    specification: AnalysisSpecification
): string {
    let existingDocsStr = '';
    if (specification.existingDocuments && specification.existingDocuments.length > 0) {
        existingDocsStr = `\nExisting documents (do not suggest these as missing): ${specification.existingDocuments.join(', ')}.`;
    }

    const guidanceByType = {
        contract: `Focus on contractual references like exhibits, schedules, addendums, and supporting agreements that are mentioned but not present.`,
        financial: `Focus on financial references like balance sheets, income statements, audit reports, and supporting financial documentation that are mentioned but not present.`,
        technical: `Focus on technical references like specifications, manuals, diagrams, and project deliverables that are mentioned but not present.`,
        compliance: `Focus on compliance references like regulatory filings, policy documents, certifications, and legal requirements that are mentioned but not present.`,
        general: `Focus on any document references, attachments, or supporting materials that are mentioned but not present in the current document.`
    };
 
    // Prevent hallucinations
    const analysisInstructions = `
        IMPORTANT: Base your analysis ONLY on what is explicitly mentioned in the document content. 
        Do not assume or infer missing documents that aren't clearly referenced.
        
        Reference indicators to look for:
        • Direct mentions of specific documents by name
        • References to attachments, exhibits, schedules, or appendices
        • Cross-references to other sections or documents
        • Mentions of supporting documentation
        • References to external files or resources
        
        For each potential missing document, verify:
        ✓ Is it explicitly mentioned in the text?
        ✓ Is the reference clear and specific?
        ✓ Is it actually missing (not just referenced)?
        ✓ What is its importance to understanding this document?
    `;

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

        ${guidanceByType[specification.type] || guidanceByType.general}

        ${analysisInstructions}

        Existing Documents: ${existingDocsStr}

        CONTENT:
        ${content}
`;
}

async function performWebSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
    try {
        const searchTool = new DuckDuckGoSearch({ maxResults });
        const result = await searchTool.invoke(query) as string;
        const parsed = JSON.parse(result) as SearchResult[];
        return parsed;
    } catch (error) {
        console.error("Web search error:", error);
        return [];
    }
}

export async function callAIAnalysis(
    chunks: PdfChunk[],
    specification: AnalysisSpecification,
    timeoutMs = 30000
): Promise<PredictiveAnalysisResult> {
    const content = groupContentFromChunks(chunks);
    const prompt = createAnalysisPrompt(content, specification);

    const chat = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: "gpt-4.1",
        temperature: 0.3,
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

export async function analyzeDocumentChunks(
    allChunks: PdfChunk[],
    specification: AnalysisSpecification,
    batchSize = 25,
    timeoutMs = 30000
): Promise<PredictiveAnalysisResult> {
    console.log(`🚀 Starting document analysis for ${allChunks.length} chunks`);
    
    // Split chunks into batches
    const batches: PdfChunk[][] = [];
    for (let i = 0; i < allChunks.length; i += batchSize) {
        batches.push(allChunks.slice(i, i + batchSize));
    }

    // Process batches in parallel
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

        // Combine results from all batches
        batchResults.forEach(result => {
            combinedResult.missingDocuments.push(...result.missingDocuments);
            combinedResult.recommendations.push(...result.recommendations);
        });

        // Deduplicate results
        combinedResult.missingDocuments = deduplicateMissingDocuments(combinedResult.missingDocuments);
        combinedResult.recommendations = [...new Set(combinedResult.recommendations)];

        console.log(`📊 Initial analysis found ${combinedResult.missingDocuments.length} potential missing documents`);

        // Enhanced processing if includeRelatedDocs is enabled
        if (specification.includeRelatedDocs && combinedResult.missingDocuments.length > 0) {
            await enhanceWithCompanyDocuments(combinedResult, allChunks, specification, timeoutMs);
            await enhanceWithWebSearch(combinedResult, specification);
        }

        return combinedResult;
    } catch (error) {
        console.error("Batch analysis error:", error);
        throw error;
    }
}

async function enhanceWithCompanyDocuments(
    result: PredictiveAnalysisResult,
    allChunks: PdfChunk[],
    specification: AnalysisSpecification,
    timeoutMs: number
): Promise<void> {
    console.log(`🔗 Enhancing analysis with company document matching`);
    
    // Extract references from the document
    const references = await extractReferences(allChunks, timeoutMs);
    const filteredReferences = deduplicateReferences(references);
    
    console.log(`📋 Processing ${filteredReferences.length} document references`);

    // Get document title mapping
    const { db } = await import("../../../../server/db/index");
    const { document } = await import("~/server/db/schema");
    const { and, eq, ne } = await import("drizzle-orm");
    
    const otherDocsQuery = await db.select({ 
        id: document.id, 
        title: document.title 
    }).from(document).where(and(
        eq(document.companyId, specification.companyId.toString()),
        ne(document.id, specification.documentId)
    ));
    
    const docTitleMap = new Map(otherDocsQuery.map(doc => [doc.id, doc.title]));

    // Find suggested company documents for each missing document
    for (const missing of result.missingDocuments) {
        try {
            const suggestions = await findSuggestedCompanyDocuments(
                missing,
                specification.companyId,
                specification.documentId,
                docTitleMap
            );
            
            if (suggestions.length > 0) {
                missing.suggestedCompanyDocuments = suggestions;
                console.log(`✅ Found ${suggestions.length} company document suggestions for "${missing.documentName}"`);
            }
        } catch (error) {
            console.error(`Error finding suggestions for ${missing.documentName}:`, error);
        }
    }
}

async function enhanceWithWebSearch(
    result: PredictiveAnalysisResult,
    specification: AnalysisSpecification
): Promise<void> {
    console.log(`🌐 Enhancing analysis with web search`);
    
    // General related documents search
    const relatedQuery = `standard related documents for ${specification.type} ${specification.category} titled ${specification.title}`;
    result.suggestedRelatedDocuments = await performWebSearch(relatedQuery, 5);

    // Specific searches for high-priority missing documents
    const highPriorityMissing = result.missingDocuments.filter(doc => doc.priority === 'high');
    
    for (const missing of highPriorityMissing) {
        const missingQuery = `${missing.documentName} ${missing.documentType} template example site:gov OR site:edu OR site:org`;
        missing.suggestedLinks = await performWebSearch(missingQuery, 3);
    }
    
    console.log(`🔗 Added web search suggestions for ${highPriorityMissing.length} high-priority missing documents`);
}

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