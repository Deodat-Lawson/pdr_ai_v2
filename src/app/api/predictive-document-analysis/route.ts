import { NextResponse } from "next/server";
import { db } from "../../../server/db/index";
import { eq, sql, and, gt, desc, ne } from "drizzle-orm";
import { analyzeDocumentChunks } from "./agent";
import type { PredictiveAnalysisResult } from "./agent";
import { predictiveDocumentAnalysisResults, document, pdfChunks } from "~/server/db/schema";
import {
    ANALYSIS_TYPES,
    TIMEOUT_LIMITS,
    CACHE_CONFIG,
    ERROR_TYPES,
    HTTP_STATUS,
    type AnalysisType
} from "~/lib/constants";

type PostBody = {
    documentId: number;
    analysisType?: AnalysisType;
    includeRelatedDocs?: boolean;
    timeoutMs?: number;
    forceRefresh?: boolean;
};
import { validateRequestBody, PredictiveAnalysisSchema } from "~/lib/validation";

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

type PredictiveAnalysisOutput = {
    documentId: number;
    analysisType: string;
    summary: {
        totalMissingDocuments: number;
        highPriorityItems: number;
        totalRecommendations: number;
        totalSuggestedRelated: number;
        analysisTimestamp: string;
    };
    analysis: PredictiveAnalysisResult;
    metadata: {
        pagesAnalyzed: number;
        existingDocumentsChecked: number;
    };
};


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
                    sql`NOW() - INTERVAL '${sql.raw(`${CACHE_CONFIG.TTL_HOURS} hours`)}'`
                )
            )
        )
        .orderBy(desc(predictiveDocumentAnalysisResults.createdAt))
        .limit(1);

    return result[0]?.resultJson ?? null;
}

async function storeAnalysisResult(documentId: number, analysisType: string, includeRelatedDocs: boolean, resultJson: PredictiveAnalysisOutput) {
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
        const validation = await validateRequestBody(request, PredictiveAnalysisSchema);
        if (!validation.success) {
            return validation.response;
        }

        const {
            documentId,
            analysisType = 'general',
            includeRelatedDocs = false,
            timeoutMs = TIMEOUT_LIMITS.DEFAULT_MS,
            forceRefresh = false
        } = body;

        // Input validation
        if (typeof documentId !== 'number' || documentId <= 0) {
            return NextResponse.json({
                success: false,
                message: "Invalid documentId. Must be a positive number.",
                errorType: ERROR_TYPES.VALIDATION
            }, { status: HTTP_STATUS.BAD_REQUEST });
        }

        if (analysisType && !ANALYSIS_TYPES.includes(analysisType)) {
            return NextResponse.json({
                success: false,
                message: `Invalid analysisType. Must be one of: ${ANALYSIS_TYPES.join(', ')}`,
                errorType: ERROR_TYPES.VALIDATION
            }, { status: HTTP_STATUS.BAD_REQUEST });
        }

        if (timeoutMs && (timeoutMs < TIMEOUT_LIMITS.MIN_MS || timeoutMs > TIMEOUT_LIMITS.MAX_MS)) {
            return NextResponse.json({
                success: false,
                message: `Invalid timeoutMs. Must be between ${TIMEOUT_LIMITS.MIN_MS} and ${TIMEOUT_LIMITS.MAX_MS}`,
                errorType: ERROR_TYPES.VALIDATION
            }, { status: HTTP_STATUS.BAD_REQUEST });
        }

        if (!forceRefresh) {
            const cachedResult = await getCachedAnalysis(documentId, analysisType!, includeRelatedDocs!);

            if (cachedResult) {
                return NextResponse.json({
                    success: true,
                    ...cachedResult,
                    fromCache: true
                }, { status: HTTP_STATUS.OK });
            }
        }

        const docDetails = await getDocumentDetails(documentId);
        if (!docDetails) {
            return NextResponse.json({
                success: false,
                message: "Document not found.",
                errorType: ERROR_TYPES.VALIDATION
            }, { status: HTTP_STATUS.NOT_FOUND });
        }

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
                errorType: ERROR_TYPES.VALIDATION
            }, { status: HTTP_STATUS.NOT_FOUND });
        }

        const chunks: PdfChunk[] = chunksResults;

        let existingDocuments: string[] = [];
        if (includeRelatedDocs) {
            const currentDoc = await db.select({ companyId: document.companyId })
                .from(document)
                .where(eq(document.id, documentId))
                .limit(1);

            const currentCompanyId = currentDoc[0]?.companyId;

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

        const specification = {
            type: analysisType!,
            includeRelatedDocs: includeRelatedDocs!,
            existingDocuments,
            title: docDetails.title,
            category: docDetails.category
        };

        const analysisResult = await analyzeDocumentChunks(
            chunks,
            {
                ...specification,
                companyId: Number(docDetails.companyId),
                documentId
            },
            timeoutMs,
            20
        );

        const fullResult = {
            documentId,
            analysisType,
            summary: {
                totalMissingDocuments: analysisResult.missingDocuments.length,
                highPriorityItems: analysisResult.missingDocuments.filter(doc => doc.priority === 'high').length,
                totalRecommendations: analysisResult.recommendations.length,
                totalSuggestedRelated: analysisResult.suggestedRelatedDocuments?.length ?? 0,
                analysisTimestamp: new Date().toISOString()
            },
            analysis: analysisResult,
            metadata: {
                pagesAnalyzed: chunks.length,
                existingDocumentsChecked: existingDocuments.length
            }
        } as PredictiveAnalysisOutput;

        await storeAnalysisResult(documentId, analysisType!, includeRelatedDocs!, fullResult);

        return NextResponse.json({
            success: true,
            ...fullResult,
            fromCache: false
        }, { status: HTTP_STATUS.OK });
    } catch (error: unknown) {
        console.error("Predictive Document Analysis Error:", error);

        let status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        let message = "Failed to perform predictive document analysis";
        let errorType = ERROR_TYPES.UNKNOWN;

        if (error instanceof Error) {
            if (error.message.includes('timed out') || error.message.includes('timeout')) {
                status = HTTP_STATUS.TIMEOUT;
                message = "The AI analysis took too long to complete. Please try again or reduce the document size.";
                errorType = ERROR_TYPES.TIMEOUT;
            } else if (error.message.includes('database') || error.message.includes('connection')) {
                status = HTTP_STATUS.SERVICE_UNAVAILABLE;
                message = "Database connection error. Please try again later.";
                errorType = ERROR_TYPES.DATABASE;
            } else if (error.message.includes('search') || error.message.includes('fetch')) {
                status = HTTP_STATUS.BAD_GATEWAY;
                message = "External service error. Analysis completed with limited functionality.";
                errorType = ERROR_TYPES.EXTERNAL_SERVICE;
            } else if (error.message.includes('openai') || error.message.includes('api')) {
                status = HTTP_STATUS.BAD_GATEWAY;
                message = "AI service temporarily unavailable. Please try again later.";
                errorType = ERROR_TYPES.AI_SERVICE;
            } else if (error.message.includes('validation') || error.message.includes('invalid')) {
                status = HTTP_STATUS.BAD_REQUEST;
                message = "Invalid request data provided.";
                errorType = ERROR_TYPES.VALIDATION;
            }
        }

        return NextResponse.json({
            success: false,
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
            message,
            errorType,
            timestamp: new Date().toISOString()
        }, { status });
    }
}