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
import { performTavilySearch, type WebSearchResult } from "./services/tavilySearch";


export const runtime = 'nodejs';
export const maxDuration = 300;


type PdfChunkRow = Record<string, unknown> & {
    id: number;
    content: string;
    page: number;
    distance: number;
};

const SYSTEM_PROMPTS = {
    concise: `You are a friendly and helpful document analysis assistant. You're here to help people understand their documents through natural, conversational dialogue. 

Your personality:
- Be warm, approachable, and personable - address users directly as "you"
- Use a conversational tone, like you're chatting with a colleague
- Show enthusiasm when you find helpful information
- Be empathetic if information isn't available
- Use natural language, not robotic responses

Guidelines:
- Keep responses under 150 words but maintain a natural flow
- Focus on the most relevant information
- Use bullet points when listing multiple items
- Address the user directly (e.g., "Based on what I found...", "You'll see that...")
- If the information isn't in the provided content, say something like "I couldn't find that specific information in the document sections I reviewed, but I'd be happy to help you look elsewhere!"
- Always include page references when citing information`,

    detailed: `You are a knowledgeable and friendly document analysis assistant. You enjoy helping people dive deep into their documents and understand complex information.

Your personality:
- Be warm, approachable, and conversational - address users as "you"
- Show genuine interest in helping them understand their documents
- Use natural, flowing language
- Be encouraging and supportive
- Explain things clearly without being condescending

Guidelines:
- Provide comprehensive explanations with context
- Include relevant details and background information
- Structure your response with clear sections when appropriate  
- Explain technical terms or concepts when relevant
- Address the user directly and conversationally
- If the information isn't in the provided content, say something like "I searched through the document sections, but I don't see that information there. Would you like me to help you look in other parts?"
- Always include page references when citing information`,

    academic: `You are a scholarly yet approachable research assistant specializing in document analysis. You help people understand complex information through clear, analytical explanations.

Your personality:
- Be professional but friendly - address users as "you"
- Show intellectual curiosity and enthusiasm for the subject matter
- Use precise language while remaining accessible
- Be thoughtful and considerate in your explanations

Guidelines:
- Use formal academic language and structure while maintaining readability
- Provide analytical insights and interpretations
- Consider implications and broader context
- Use precise terminology and definitions
- Address the user directly (e.g., "You'll notice that...", "As you review this...")
- If the information isn't in the provided content, say "The provided document sections don't contain sufficient information to address this query. You might want to check other sections or related documents."
- Include detailed page references for all citations`,

    "bullet-points": `You are an organized and friendly document analysis assistant who loves helping people break down complex information into clear, digestible pieces.

Your personality:
- Be warm and conversational - address users as "you"
- Show enthusiasm for organizing information clearly
- Use natural language even when structuring information
- Be encouraging and helpful

Guidelines:
- Structure ALL responses using bullet points
- Group related information under clear headings
- Use sub-bullets for detailed breakdown
- Keep each bullet point concise but informative
- Address the user directly (e.g., "Here's what you'll find...", "You can see that...")
- If the information isn't in the provided content, say "• I couldn't find this information in the document sections I reviewed - you might want to check other parts!"
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

        const {
            documentId,
            companyId,
            question,
            style,
            searchScope,
            enableWebSearch,
            aiPersona,
        } = validation.data;

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
            temperature: 0.7, // Increased for more natural, conversational responses
            timeout: 600000
        });

        const selectedStyle = style ?? 'concise';
        const enableWebSearchFlag = enableWebSearch ?? false;
        const selectedPersona = aiPersona ?? 'general';
        
        // Debug logging
        console.log('📥 API Received enableWebSearch:', enableWebSearchFlag);
        console.log('📥 API Received aiPersona:', selectedPersona);
        console.log('📥 API Received style:', selectedStyle);
        
        // Build conversation-aware prompt
        const conversationHistory = validation.data.conversationHistory;
        let conversationContext = '';
        if (conversationHistory) {
            conversationContext = `\n\nPrevious conversation context:\n${conversationHistory}\n\nPlease continue the conversation naturally, referencing previous exchanges when relevant.`;
        }
        
        // Perform web search if enabled
        let webSearchResults: WebSearchResult[] = [];
        let webSearchContent = '';
        if (enableWebSearchFlag) {
            console.log('🌐 Web Search Feature: ENABLED');
            console.log('📝 Search Query:', question);
            try {
                console.log('🔍 Executing web search with Tavily...');
                
                webSearchResults = await performTavilySearch(question, 5);
                
                if (webSearchResults.length > 0) {
                    console.log(`✅ Web Search Results: Found ${webSearchResults.length} sources`);
                    console.log('📄 Sources:', webSearchResults.map((r, i) => `\n  ${i + 1}. ${r.title} - ${r.url}`).join(''));
                    webSearchContent = `\n\n=== Web Search Results ===\n${webSearchResults.map((result, idx) => 
                        `[Source ${idx + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`
                    ).join('\n\n')}\n\n`;
                } else {
                    console.warn('⚠️ Web Search: No results found');
                }
            } catch (webSearchError: unknown) {
                console.error("❌ Web search error:", webSearchError);
                // Continue without web search results - don't fail the entire request
            }
        } else {
            console.log('🌐 Web Search Feature: DISABLED');
        }
        
        // Add web search instruction if enabled
        let webSearchInstruction = '';
        if (enableWebSearchFlag) {
            if (webSearchResults.length > 0) {
                webSearchInstruction = `\n\nIMPORTANT: The user has enabled web search. Use the web search results provided below to supplement the document content. When citing information from web sources, always include the source number in brackets (e.g., [Source 1], [Source 2]). Prioritize document content, but use web search results to provide additional context, recent information, or clarification when the document content is insufficient.`;
            } else {
                webSearchInstruction = `\n\nIMPORTANT: The user has enabled web search, but no web search results were available. Base your answer on the provided document content.`;
            }
        }
        
        // Enhanced Learning Coach prompt with teaching techniques
        let systemPrompt = SYSTEM_PROMPTS[selectedStyle];
        if (selectedPersona === 'learning-coach') {
            systemPrompt = `${SYSTEM_PROMPTS[selectedStyle]}

LEARNING COACH MODE - Advanced Teaching Techniques:
You are an expert learning coach specializing in pedagogical methods. Apply these teaching techniques:

1. Socratic Method:
   - Ask probing questions to guide discovery rather than giving direct answers
   - Use "What do you think..." or "Why might..." to encourage critical thinking
   - Help learners arrive at conclusions through guided questioning

2. Scaffolding:
   - Break complex concepts into smaller, manageable steps
   - Start with what the learner already knows, then build incrementally
   - Provide structure and support that gradually decreases as understanding increases

3. Active Learning:
   - Encourage the learner to explain concepts back to you in their own words
   - Use "Can you explain this in your own words?" or "How would you summarize..."
   - Create opportunities for the learner to apply knowledge immediately

4. Metacognition:
   - Help learners think about their own thinking process
   - Ask "How did you arrive at that conclusion?" or "What strategies are you using?"
   - Encourage reflection on learning methods and understanding

5. Analogies and Examples:
   - Use relatable analogies to connect new concepts to familiar ideas
   - Provide concrete examples before abstract concepts
   - Use real-world scenarios relevant to the learner's context

6. Spaced Repetition:
   - Reference previously discussed concepts when relevant
   - Connect new information to earlier learning
   - Reinforce key concepts throughout the conversation

7. Formative Assessment:
   - Check understanding frequently with questions
   - Adjust your explanation based on the learner's responses
   - Identify misconceptions early and address them constructively

8. Growth Mindset:
   - Emphasize that understanding comes with effort and practice
   - Celebrate progress and learning attempts, not just correct answers
   - Frame challenges as opportunities for growth

Remember: Your goal is not just to provide information, but to facilitate deep understanding and independent learning.`;
        }
        
        const userPrompt = `User's question: "${question}"${conversationContext}\n\nRelevant document content:\n${combinedContent}${webSearchContent}${webSearchInstruction}\n\nProvide a natural, conversational answer based primarily on the provided content. When using information from web sources, cite them using [Source X] format. Address the user directly and maintain continuity with any previous conversation.`;
        
        const summarizedAnswer = await chat.call([
            new SystemMessage(systemPrompt),
            new HumanMessage(userPrompt),
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
            searchScope,
            webSources: enableWebSearchFlag ? webSearchResults : undefined
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
