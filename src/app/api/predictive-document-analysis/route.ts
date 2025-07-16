import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { sql } from "drizzle-orm";
import { analyzeDocumentChunks } from "./agent";

type PostBody = {
    documentId: number;
    analysisType?: 'contract' | 'financial' | 'technical' | 'compliance' | 'general';
    includeRelatedDocs?: boolean;
    timeoutMs?: number;
};

type PdfChunkRow = Record<string, unknown> & {
    id: number;
    content: string;
    page: number;
    distance: number;
};

type PdfChunk = {
    id: number;
    content: string;
    page: number;
};

export async function POST(request: Request) {
    try {
        const { 
            documentId, 
            analysisType = 'general', 
            includeRelatedDocs = false,
            timeoutMs = 30000 
        } = (await request.json()) as PostBody;

        const query = sql`
            SELECT id, content, page
            FROM pdr_ai_v2_pdf_chunks
            WHERE document_id = ${documentId}
            ORDER BY id
        `;

        const result = await db.execute<PdfChunkRow>(query);
        const rows = result.rows;

        if (rows.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No chunks found for the given documentId.",
            }, { status: 404 });
        }

        const chunks: PdfChunk[] = rows.map(row => ({
            id: row.id,
            content: row.content,
            page: row.page
        }));

        // let existingDocuments: string[] = [];
        // if (includeRelatedDocs) {
        //     const existingDocsQuery = sql`
        //         SELECT DISTINCT title, file_name
        //         FROM pdr_ai_v2_documents
        //         WHERE user_id = (SELECT user_id FROM pdr_ai_v2_documents WHERE id = ${documentId})
        //         AND id != ${documentId}
        //     `;
            
        //     const existingDocsResult = await db.execute(existingDocsQuery);
        //     existingDocuments = existingDocsResult.rows.map(row => 
        //         `${row.title || row.file_name}`
        //     );
        // }

        // Create analysis specification
        const specification = {
            type: analysisType,
            includeRelatedDocs,
            // existingDocuments
        };

        // Call AI analysis through agent with timeout
        const analysisResult = await analyzeDocumentChunks(
            chunks, 
            specification, 
            25, // smaller batch size for faster processing
            timeoutMs
        );

        // Calculate summary statistics
        const highPriorityCount = analysisResult.missingDocuments.filter(
            doc => doc.priority === 'high'
        ).length;

        return NextResponse.json({
            success: true,
            documentId,
            analysisType,
            summary: {
                totalMissingDocuments: analysisResult.missingDocuments.length,
                highPriorityItems: highPriorityCount,
                totalRecommendations: analysisResult.recommendations.length,
                analysisTimestamp: new Date().toISOString()
            },
            analysis: analysisResult,
            metadata: {
                pagesAnalyzed: chunks.length,
                existingDocuments: 0,
                // existingDocumentsChecked: existingDocuments.length
            }
        }, { status: 200 });

    } catch (error: unknown) {
        console.error("Predictive Document Analysis Error:", error);
        
        // Check if it's a timeout error
        if (error instanceof Error && error.message.includes('timed out')) {
            return NextResponse.json({ 
                success: false, 
                error: 'Analysis timeout',
                message: "The AI analysis took too long to complete. Please try again or reduce the document size."
            }, { status: 408 }); // Request Timeout
        }
        
        return NextResponse.json({ 
            success: false, 
            error: String(error),
            message: "Failed to perform predictive document analysis"
        }, { status: 500 });
    }
}