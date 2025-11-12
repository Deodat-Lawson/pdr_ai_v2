import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { OpenAIEmbeddings } from "@langchain/openai";
import { db } from "~/server/db/index";
import { eq, sql } from "drizzle-orm";
import ANNOptimizer from "../predictive-document-analysis/services/annOptimizer";
import {
    companyEnsembleSearch,
    documentEnsembleSearch,
    type CompanyEnsembleOptions,
    type DocumentEnsembleOptions,
    type SearchResult
} from "./services";
import { validateRequestBody, QuestionSchema } from "~/lib/validation";
import { auth } from "@clerk/nextjs/server";
import { users, document } from "~/server/db/schema";


type PdfChunkRow = Record<string, unknown> & {
    id: number;
    content: string;
    page: number;
    distance: number;
};

const SYSTEM_PROMPTS = {
    concise: `You are a professional document analysis assistant. Provide clear, concise answers based only on the provided document content. 

Guidelines:
- Keep responses under 150 words
- Focus on the most relevant information
- Use bullet points when listing multiple items
- If the information isn't in the provided content, say "This information is not available in the provided document sections"
- Always include page references when citing information`,

    detailed: `You are a comprehensive document analysis assistant. Provide thorough, detailed answers based on the provided document content.

Guidelines:
- Provide comprehensive explanations with context
- Include relevant details and background information
- Structure your response with clear sections when appropriate  
- Explain technical terms or concepts when relevant
- If the information isn't in the provided content, say "This information is not available in the provided document sections"
- Always include page references when citing information`,

    academic: `You are an academic research assistant specializing in document analysis. Provide scholarly, analytical responses based on the provided document content.

Guidelines:
- Use formal academic language and structure
- Provide analytical insights and interpretations
- Consider implications and broader context
- Use precise terminology and definitions
- If the information isn't in the provided content, say "The provided document sections do not contain sufficient information to address this query"
- Include detailed page references for all citations`,

    "bullet-points": `You are a structured document analysis assistant. Organize all information into clear bullet points and lists.

Guidelines:
- Structure ALL responses using bullet points
- Group related information under clear headings
- Use sub-bullets for detailed breakdown
- Keep each bullet point concise but informative
- If the information isn't in the provided content, say "• This information is not available in the provided document sections"
- Always include page references in parentheses`
};

const qaAnnOptimizer = new ANNOptimizer({ 
    strategy: 'hnsw',
    efSearch: 200
});

const COMPANY_SCOPE_ROLES = new Set(["employer", "owner"]);

export async function POST(request: Request) {
    const startTime = Date.now();

    try {
        const validation = await validateRequestBody(request, QuestionSchema);
        if (!validation.success) {
            return validation.response;
        }

        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({
                success: false,
                message: "Unauthorized"
            }, { status: 401 });
        }

        const { documentId, companyId, question, style, searchScope } = validation.data;

        // Additional business logic validation
        if (searchScope === "company" && !companyId) {
            return NextResponse.json({
                success: false,
                message: "companyId is required for company-wide search"
            }, { status: 400 });
        }

        if (searchScope === "document" && !documentId) {
            return NextResponse.json({
                success: false,
                message: "documentId is required for document search"
            }, { status: 400 });
        }

        const [requestingUser] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        if (!requestingUser) {
            return NextResponse.json({
                success: false,
                message: "Invalid user."
            }, { status: 401 });
        }

        const userCompanyId = requestingUser.companyId;
        const numericCompanyId = Number.parseInt(userCompanyId, 10);

        if (Number.isNaN(numericCompanyId)) {
            return NextResponse.json({
                success: false,
                message: "User is not associated with a valid company."
            }, { status: 403 });
        }

        if (searchScope === "company") {
            if (!COMPANY_SCOPE_ROLES.has(requestingUser.role)) {
                return NextResponse.json({
                    success: false,
                    message: "Only employer accounts can run company-wide searches."
                }, { status: 403 });
            }

            if (companyId !== undefined && companyId !== numericCompanyId) {
                return NextResponse.json({
                    success: false,
                    message: "Company mismatch detected for the current user."
                }, { status: 403 });
            }
        }

        if (searchScope === "document" && documentId) {
            const [targetDocument] = await db
                .select({
                    id: document.id,
                    companyId: document.companyId
                })
                .from(document)
                .where(eq(document.id, documentId))
                .limit(1);

            if (!targetDocument) {
                return NextResponse.json({
                    success: false,
                    message: "Document not found."
                }, { status: 404 });
            }

            if (targetDocument.companyId !== userCompanyId) {
                return NextResponse.json({
                    success: false,
                    message: "You do not have access to this document."
                }, { status: 403 });
            }
        }

        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        let documents: SearchResult[] = [];
        let retrievalMethod = searchScope === "company" ? 'company_ensemble_rrf' : 'document_ensemble_rrf';

        try {
            if (searchScope === "company") {
                const companyOptions: CompanyEnsembleOptions = {
                    weights: [0.4, 0.6],
                    topK: 10,
                    companyId: numericCompanyId
                };
                
                documents = await companyEnsembleSearch(
                    numericCompanyId,
                    question,
                    embeddings,
                    companyOptions
                );
            } else if (searchScope === "document" && documentId) {
                const documentOptions: DocumentEnsembleOptions = {
                    weights: [0.4, 0.6],
                    topK: 5,
                    documentId
                };
                
                documents = await documentEnsembleSearch(
                    documentId,
                    question,
                    embeddings,
                    documentOptions
                );
            } else {
                throw new Error("Invalid search parameters");
            }
            
            if (documents.length === 0) {
                console.warn("Ensemble search returned no results, trying fallback methods");
                throw new Error("No ensemble results");
            }

        } catch (ensembleError) {
            console.warn(`⚠️ [Q&A-Ensemble] Ensemble search failed, falling back to simpler methods:`, ensembleError);
            
            if (searchScope === "company") {
                retrievalMethod = 'company_fallback_failed';
                documents = [];
            } else if (searchScope === "document" && documentId) {
                retrievalMethod = 'ann_fallback';
                
                try {
                    const questionEmbedding = await embeddings.embedQuery(question);
                    const annResults = await qaAnnOptimizer.searchSimilarChunks(
                        questionEmbedding,
                        [documentId],
                        5,
                        0.8
                    );

                    documents = annResults.map(result => ({
                        pageContent: result.content,
                        metadata: {
                            chunkId: result.id,
                            page: result.page,
                            documentId: result.documentId,
                            distance: 1 - result.confidence,
                            source: 'ann_fallback',
                            searchScope: 'document' as const,
                            retrievalMethod: 'ann_fallback',
                            timestamp: new Date().toISOString()
                        }
                    }));

                } catch (annError) {
                    console.warn(`⚠️ [Q&A-ANN] ANN search also failed, falling back to traditional search:`, annError);
                    retrievalMethod = 'traditional_fallback';
                    
                    const questionEmbedding = await embeddings.embedQuery(question);
                    const bracketedEmbedding = `[${questionEmbedding.join(",")}]`;

                    const query = sql`
                      SELECT
                        id,
                        content,
                        page,
                        embedding <-> ${bracketedEmbedding}::vector(1536) AS distance
                      FROM pdr_ai_v2_pdf_chunks
                      WHERE document_id = ${documentId}
                      ORDER BY embedding <-> ${bracketedEmbedding}::vector(1536)
                      LIMIT 3
                    `;

                    const result = await db.execute<PdfChunkRow>(query);
                    documents = result.rows.map(row => ({
                        pageContent: row.content,
                        metadata: {
                            chunkId: row.id,
                            page: row.page,
                            distance: row.distance,
                            source: 'traditional_fallback',
                            searchScope: 'document' as const,
                            retrievalMethod: 'traditional_fallback',
                            timestamp: new Date().toISOString()
                        }
                    }));
                }
            } else {
                retrievalMethod = 'invalid_parameters';
                documents = [];
            }
        }

        if (documents.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No relevant content found for the given question and document.",
            });
        }

        console.log(`🔍 [AI] Building context from ${documents.length} retrieved documents`);
        
        const combinedContent = documents
            .map((doc, idx) => {
                const page = doc.metadata?.page ?? 'Unknown';
                const source = doc.metadata?.source ?? retrievalMethod;
                const distance = doc.metadata?.distance ?? 0;
                const relevanceScore = Math.round((1 - Number(distance)) * 100);
                
                console.log(`📄 [AI] Document ${idx + 1}: page ${page}, source: ${source}, relevance: ${relevanceScore}%`);
                
                // Only include Chunk # and Page in the actual prompt sent to AI
                return `=== Chunk #${idx + 1}, Page ${page} ===\n${doc.pageContent}`;
            })
            .join("\n\n");
            
        console.log(`✅ [AI] Built context with pages: ${documents.map(doc => doc.metadata?.page).join(', ')}`);

        const chat = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4",
            temperature: 0.3,
        });

        const selectedStyle = style ?? 'concise';
        
        const summarizedAnswer = await chat.call([
            new SystemMessage(SYSTEM_PROMPTS[selectedStyle]),
            new HumanMessage(
                `User's question: "${question}"\n\nRelevant document content:\n${combinedContent}\n\nProvide an accurate answer based solely on the provided content.`
            ),
        ]);

        const totalTime = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            summarizedAnswer: summarizedAnswer.content,
            recommendedPages: documents.map(doc => doc.metadata?.page).filter((page): page is number => page !== undefined),
            retrievalMethod,
            processingTimeMs: totalTime,
            chunksAnalyzed: documents.length,
            fusionWeights: [0.4, 0.6],
            searchScope
        });

    } catch (error) {
        console.error("❌ [Q&A-ANN] Error in Q&A processing:", error);
        return NextResponse.json(
            { 
                success: false, 
                error: "An error occurred while processing your question.",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
