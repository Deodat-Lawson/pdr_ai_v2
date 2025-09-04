import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { OpenAIEmbeddings } from "@langchain/openai";
import { db } from "~/server/db/index";
import { sql } from "drizzle-orm";
import ANNOptimizer from "../predictive-document-analysis/services/annOptimizer";

type PostBody = {
    documentId: number;
    question: string;
    style?: "concise" | "detailed" | "academic" | "bullet-points";
};

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

// Initialize ANN optimizer specifically for Q&A retrieval
const qaAnnOptimizer = new ANNOptimizer({ 
    strategy: 'hnsw', // HNSW works best for Q&A with precise relevance
    efSearch: 200
});

export async function POST(request: Request) {
    const startTime = Date.now();
    
    try {
        const { documentId, question, style } = (await request.json()) as PostBody;

        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
        const questionEmbedding = await embeddings.embedQuery(question);

        let rows: PdfChunkRow[] = [];

        try {
            const annResults = await qaAnnOptimizer.searchSimilarChunks(
                questionEmbedding,
                [documentId],
                5,
                0.8
            );

            rows = annResults.map(result => ({
                 id: result.id,
                 content: result.content,
                 page: result.page,
                 distance: 1 - result.confidence, // Convert confidence back to distance
                 documentId: result.documentId
             })) as PdfChunkRow[];

            console.log(`✅ [Q&A-ANN] Found ${rows.length} relevant chunks in ${Date.now() - startTime}ms`);

        } catch (annError) {
            console.warn(`⚠️ [Q&A-ANN] ANN search failed, falling back to traditional search:`, annError);
            
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
            rows = result.rows;
            
            console.log(`📊 [Q&A-Fallback] Retrieved ${rows.length} chunks in ${Date.now() - startTime}ms`);
        }

        if (rows.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No relevant content found for the given question and document.",
            });
        }

        const combinedContent = rows
            .map((row, idx) => {
                const relevanceScore = Math.round((1 - Number(row.distance)) * 100);
                return `=== Chunk #${idx + 1}, Page ${row.page}, Relevance: ${relevanceScore}% ===\n${row.content}`;
            })
            .join("\n\n");

        console.log(`📝 [Q&A-ANN] Combined ${rows.length} chunks, preparing AI response`);

        const chat = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4",
            temperature: 0.3,
        });

        const selectedStyle = style || 'concise';
        
        const summarizedAnswer = await chat.call([
            new SystemMessage(SYSTEM_PROMPTS[selectedStyle]),
            new HumanMessage(
                `User's question: "${question}"\n\nRelevant document content:\n${combinedContent}\n\nProvide an accurate answer based solely on the provided content.`
            ),
        ]);

        const totalTime = Date.now() - startTime;
        console.log(`✅ [Q&A-ANN] Complete response generated in ${totalTime}ms`);

        return NextResponse.json({
            success: true,
            summarizedAnswer: summarizedAnswer.content,
            recommendedPages: rows.map(r => r.page),
                         retrievalMethod: rows.length > 0 && rows[0]?.distance !== undefined ? 'ann-optimized' : 'traditional',
            processingTimeMs: totalTime,
            chunksAnalyzed: rows.length
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
