import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { sql } from "drizzle-orm";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";


type PostBody = {
    documentId: number; 
    question: string;
    style?: keyof typeof SYSTEM_PROMPTS;
};

type PdfChunkRow = Record<string, unknown> & {
    id: number;
    content: string;
    page: number;
    distance: number;
};


const SYSTEM_PROMPTS = {
    concise: `You are an expert document analyst. Your role is to provide accurate, concise answers based on the provided document chunks. 

    Guidelines:
    - Answer directly and precisely
    - Use information only from the provided chunks
    - If the chunks don't contain enough information, clearly state this
    - Maintain factual accuracy above all else
    - Use clear, professional language`,

    detailed: `You are a comprehensive document analyst. Provide thorough, well-structured answers based on the document chunks.

    Guidelines:
    - Provide detailed explanations with context
    - Connect related information across chunks when relevant
    - Include relevant examples or specifics from the text
    - Structure your response logically with clear flow
    - If information is incomplete, explain what's missing`,

    academic: `You are a scholarly document analyst. Provide academic-level responses with proper analysis and critical thinking.

    Guidelines:
    - Analyze the information critically
    - Discuss implications and connections
    - Note any limitations or gaps in the provided information
    - Use formal academic tone
    - Support statements with specific references to the text`,

    'bullet-points': `You are a structured information analyst. Provide clear, organized responses in bullet-point format.

    Guidelines:
    - Organize information into clear bullet points
    - Group related information logically
    - Use sub-bullets for detailed explanations
    - Start with the most important information
    - Keep each point concise but complete`
};


export async function POST(request: Request) {
    try {

        const { documentId, question, style } = (await request.json()) as PostBody;
        

        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            openAIApiKey: process.env.OPENAI_API_KEY,
        });
        const questionEmbedding = await embeddings.embedQuery(question);

        const bracketedEmbedding = `[${questionEmbedding.join(",")}]`;

        console.log(documentId);

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
        const rows = result.rows;

        if (rows.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No chunks found for the given documentId.",
            });
        }

        const combinedContent = rows
            .map(
                (row, idx) =>
                    `=== Chunk #${idx + 1}, Page ${row.page}, Distance: ${row.distance} === ${row.content}`
            )
            .join("\n\n");

        const chat = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-4", // or gpt-3.5-turbo
            temperature: 0.5,
        });

        const selectedStyle = style || 'concise';
        
        const summarizedAnswer = await chat.call([
            new SystemMessage(
                SYSTEM_PROMPTS[selectedStyle]
            ),
            new HumanMessage(
                `User's question: "${question}"\n\n${combinedContent}\n\nAnswer concisely.`
            ),
        ]);

        return NextResponse.json({
            success: true,
            summarizedAnswer: summarizedAnswer.text,
            recommendedPages: rows.map((row) => row.page),
        });
    } catch (error: unknown) {
        console.error(error);
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
}
