import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { eq, sql, and, gt, desc, ne } from "drizzle-orm";
import { analyzeDocumentChunks } from "./agent";
import { predictiveDocumentAnalysisResults, document, pdfChunks } from "~/server/db/schema";

type PostBody = {
    documentId: number;
    analysisType?: 'contract' | 'financial' | 'technical' | 'compliance' | 'general';
    includeRelatedDocs?: boolean;
    timeoutMs?: number;
    forceRefresh?: boolean; // Force recompute and store fresh analysis
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

type DocumentDetails = {
    title: string;
    category: string;
    companyId: string;
};

const CACHE_TTL_HOURS = 24;

// Helper: Query for cached analysis
async function getCachedAnalysis(documentId: number, analysisType: string, includeRelatedDocs: boolean) {
    const result = await db.select({ resultJson: predictiveDocumentAnalysisResults.resultJson })
        .from(predictiveDocumentAnalysisResults)
        .where(
            and(
                eq(predictiveDocumentAnalysisResults.documentId, documentId),
                eq(predictiveDocumentAnalysisResults.analysisType, analysisType),
                eq(predictiveDocumentAnalysisResults.includeRelatedDocs, includeRelatedDocs),
                gt(
                    predictiveDocumentAnalysisResults.createdAt,
                    sql`NOW() - INTERVAL '${sql.raw(`${CACHE_TTL_HOURS} hours`)}'`
                )
            )
        )
        .orderBy(desc(predictiveDocumentAnalysisResults.createdAt))
        .limit(1);

    return result[0]?.resultJson as any | null;
}

async function storeAnalysisResult(documentId: number, analysisType: string, includeRelatedDocs: boolean, resultJson: any) {
    const result = await db.insert(predictiveDocumentAnalysisResults).values({
        documentId,
        analysisType,
        includeRelatedDocs,
        resultJson,
    });
    return result;
}

async function getDocumentDetails(documentId: number) : Promise<DocumentDetails | null> {
    const results = await db
        .select({ title: document.title, category: document.category, companyId: document.companyId })
        .from(document)
        .where(eq(document.id, documentId))
        .limit(1);

    return results[0] ?? null;
}

export async function POST(request: Request) {
    try {
        const body = await request.json() as PostBody;
        const {
            documentId,
            analysisType = 'general',
            includeRelatedDocs = false,
            timeoutMs = 30000,
            forceRefresh = false
        } = body;

        if (typeof documentId !== 'number' || documentId <= 0) {
            return NextResponse.json({ success: false, message: "Invalid documentId." }, { status: 400 });
        }

        // Check cache unless forceRefresh
        if (!forceRefresh) {
            const cachedResult = await getCachedAnalysis(documentId, analysisType, includeRelatedDocs);
            if (cachedResult) {
                console.log(`Returning cached analysis for documentId ${documentId}`);
                return NextResponse.json({
                    success: true,
                    ...cachedResult,
                    fromCache: true
                }, { status: 200 });
            }
        }

        // Fetch document details for search context
        const docDetails = await getDocumentDetails(documentId);
        if (!docDetails) {
            return NextResponse.json({ success: false, message: "Document not found." }, { status: 404 });
        }

        // Fetch chunks using Drizzle
        const chunksResults = await db
            .select({
                id: pdfChunks.id,
                content: pdfChunks.content,
                page: pdfChunks.page
            })
            .from(pdfChunks)
            .where(eq(pdfChunks.documentId, documentId))
            .orderBy(pdfChunks.id);

        if (chunksResults.length === 0) {
            return NextResponse.json({
                success: false,
                message: "No chunks found for the given documentId.",
            }, { status: 404 });
        }

        const chunks: PdfChunk[] = chunksResults;

        let existingDocuments: string[] = [];
        if (includeRelatedDocs) {
            // get the documentid from the current document
            const currentDoc = await db.select({ companyId: document.companyId })
                .from(document)
                .where(eq(document.id, documentId))
                .limit(1);

            const currentCompanyId = currentDoc[0]?.companyId;

            // getting all documents with the same companyId but not the current document
            if (currentCompanyId) {
                const existingDocs = await db
                    .selectDistinct({ title: document.title, url: document.url }) //getting title and document url
                    .from(document)
                    .where(
                        and(
                            eq(document.companyId, currentCompanyId),
                            ne(document.id, documentId)
                        )
                    );

                existingDocuments = existingDocs.map(row => `${row.title || row.url}`);
            }
        }

        // Create analysis specification
        const specification = {
            type: analysisType,
            includeRelatedDocs,
            existingDocuments,
            title: docDetails.title,
            category: docDetails.category
        };

        // Call AI analysis through engine with timeout
        const analysisResult = await analyzeDocumentChunks(
            chunks,
            {
                ...specification,
                companyId: Number(docDetails.companyId),
                documentId
            },
            20, // smaller batch size for faster processing
            timeoutMs
        );

        // Store analysis result
        const fullResult = {
            documentId,
            analysisType,
            summary: {
                totalMissingDocuments: analysisResult.missingDocuments.length,
                highPriorityItems: analysisResult.missingDocuments.filter(doc => doc.priority === 'high').length,
                totalRecommendations: analysisResult.recommendations.length,
                totalSuggestedRelated: analysisResult.suggestedRelatedDocuments?.length || 0,
                analysisTimestamp: new Date().toISOString()
            },
            analysis: analysisResult,
            metadata: {
                pagesAnalyzed: chunks.length,
                existingDocumentsChecked: existingDocuments.length
            }
        }

        await storeAnalysisResult(documentId, analysisType, includeRelatedDocs, fullResult);

        return NextResponse.json({
            success: true,
            ...fullResult,
            fromCache: false
        }, { status: 200 });
    } catch (error: unknown) {
        console.error("Predictive Document Analysis Error:", error);
        
        let status = 500;
        let message = "Failed to perform predictive document analysis";
        
        if (error instanceof Error) {
            if (error.message.includes('timed out')) {
                status = 408;
                message = "The AI analysis took too long to complete. Please try again or reduce the document size.";
            } else if (error.message.includes('database')) {
                message = "Database error occurred.";
            } else if (error.message.includes('search')) {
                message = "Web search failed; analysis completed without online suggestions.";
            }
        }
        
        return NextResponse.json({ 
            success: false, 
            error: String(error),
            message
        }, { status });
    }
}