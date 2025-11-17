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
import {
    createUnauthorizedError,
    createForbiddenError,
    createNotFoundError,
    createValidationError,
    handleApiError
} from "~/lib/api-utils";
import { executeWebSearchAgent } from "./services/webSearchAgent";


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
            return createUnauthorizedError("Unauthorized");
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

        console.log("searchScope", searchScope);

        if (searchScope === "company" && !companyId) {
            return createValidationError("companyId is required for company-wide search");
        }

        if (searchScope === "document" && !documentId) {
            return createValidationError("documentId is required for document search");
        }

        const [requestingUser] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId))
            .limit(1);

        if (!requestingUser) {
            return createUnauthorizedError("Invalid user");
        }

        const userCompanyId = requestingUser.companyId;
        const numericCompanyId = Number.parseInt(userCompanyId, 10);

        if (Number.isNaN(numericCompanyId)) {
            return createForbiddenError("User is not associated with a valid company");
        }

        if (searchScope === "company") {
            if (!COMPANY_SCOPE_ROLES.has(requestingUser.role)) {
                return createForbiddenError("Only employer accounts can run company-wide searches");
            }

            if (companyId !== undefined && companyId !== numericCompanyId) {
                return createForbiddenError("Company mismatch detected for the current user");
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
                return createNotFoundError("Document not found");
            }

            if (targetDocument.companyId !== userCompanyId) {
                return createForbiddenError("You do not have access to this document");
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
            return createNotFoundError("No relevant content found for the given question and document");
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
            modelName: "gpt-5.1",
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
        
        // Perform web search if enabled using the intelligent web search agent
        let webSearchResults: WebSearchResult[] = [];
        let webSearchContent = '';
        let refinedSearchQuery = '';
        let webSearchReasoning = '';
        
        if (enableWebSearchFlag) {
            console.log('🌐 Web Search Feature: ENABLED');
            console.log('📝 Original Search Query:', question);
            try {
                console.log('🤖 Executing intelligent web search agent...');
                
                // Use the web search agent for intelligent query refinement and result synthesis
                const documentContext = documents.length > 0 
                    ? documents.map(doc => doc.pageContent).join('\n\n').substring(0, 1000)
                    : undefined;
                
                const agentResult = await executeWebSearchAgent({
                    userQuestion: question,
                    documentContext,
                    maxResults: 5,
                    searchDepth: "advanced"
                });
                
                webSearchResults = agentResult.results;
                refinedSearchQuery = agentResult.refinedQuery;
                webSearchReasoning = agentResult.reasoning ?? '';
                
                if (webSearchResults.length > 0) {
                    console.log(`✅ Web Search Agent: Found ${webSearchResults.length} high-quality sources`);
                    console.log(`🔍 Refined Query: "${refinedSearchQuery}"`);
                    if (webSearchReasoning) {
                        console.log(`💭 Agent Reasoning: ${webSearchReasoning}`);
                    }
                    console.log('📄 Sources:', webSearchResults.map((r, i) => `\n  ${i + 1}. ${r.title} - ${r.url}${r.relevanceScore ? ` (Relevance: ${r.relevanceScore}/10)` : ''}`).join(''));
                    
                    webSearchContent = `\n\n=== Web Search Results (Intelligently Curated) ===\n${webSearchResults.map((result, idx) => {
                        const relevanceNote = result.relevanceScore ? ` [Relevance Score: ${result.relevanceScore}/10]` : '';
                        return `[Source ${idx + 1}]${relevanceNote}\nTitle: ${result.title}\nURL: ${result.url}\nContent: ${result.snippet}`;
                    }).join('\n\n')}\n\n`;
                } else {
                    console.warn('⚠️ Web Search Agent: No relevant results found');
                }
            } catch (webSearchError: unknown) {
                console.error("❌ Web search agent error:", webSearchError);
                // Fallback to direct Tavily search
                try {
                    console.log('🔄 Falling back to direct Tavily search...');
                    webSearchResults = await performTavilySearch(question, 5);
                    refinedSearchQuery = question;
                    if (webSearchResults.length > 0) {
                        webSearchContent = `\n\n=== Web Search Results ===\n${webSearchResults.map((result, idx) => 
                            `[Source ${idx + 1}] ${result.title}\nURL: ${result.url}\nSnippet: ${result.snippet}`
                        ).join('\n\n')}\n\n`;
                    }
                } catch (fallbackError) {
                    console.error("❌ Fallback search also failed:", fallbackError);
                    // Continue without web search results - don't fail the entire request
                }
            }
        } else {
            console.log('🌐 Web Search Feature: DISABLED');
        }
        
        // Enhanced web search instruction prompt
        let webSearchInstruction = '';
        if (enableWebSearchFlag) {
            if (webSearchResults.length > 0) {
                webSearchInstruction = `\n\n=== WEB SEARCH INTEGRATION INSTRUCTIONS ===
The user has enabled intelligent web search. You have access to both document content and curated web search results.

Guidelines for using web search results:
1. PRIORITIZE document content - it is the primary source of truth for the user's specific documents
2. Use web search results to:
   - Provide additional context or background information not in the documents
   - Clarify technical terms, concepts, or industry standards
   - Supplement with recent information, updates, or broader perspectives
   - Fill gaps when document content is incomplete or unclear
3. Citation format: Always cite web sources using [Source X] format (e.g., "According to [Source 1], the industry standard is...")
4. Quality assessment: The web results have been intelligently filtered for relevance. Relevance scores indicate how well each source addresses the query.
5. Synthesis: Integrate information seamlessly - don't just list sources, but synthesize insights from both document and web sources
6. Transparency: If information conflicts between documents and web sources, acknowledge this and explain the difference
7. Completeness: Use web sources to provide comprehensive answers when document content alone is insufficient

The refined search query used was: "${refinedSearchQuery}"
${webSearchReasoning ? `Agent reasoning: ${webSearchReasoning}` : ''}

Remember: Your goal is to provide the most helpful, accurate, and comprehensive answer by intelligently combining document insights with relevant web information.`;
            } else {
                webSearchInstruction = `\n\n=== WEB SEARCH STATUS ===
The user enabled web search, but no relevant results were found for this query. Base your answer entirely on the provided document content. If the document content is insufficient to fully answer the question, acknowledge this limitation and provide the best answer possible based on available document information.`;
            }
        }
        

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
            webSources: enableWebSearchFlag ? webSearchResults : undefined,
            webSearch: enableWebSearchFlag ? {
                refinedQuery: refinedSearchQuery || question,
                reasoning: webSearchReasoning,
                resultsCount: webSearchResults.length
            } : undefined
        });

    } catch (error) {
        console.error("❌ [Q&A-ANN] Error in Q&A processing:", error);
        return handleApiError(error);
    }
}
