import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import os from "os";
import fs from "fs/promises";
import fetch from "node-fetch";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../server/db/index";
import { users, document, pdfChunks } from "../../../server/db/schema";
import { validateRequestBody, UploadDocumentSchema } from "~/lib/validation";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { Document } from "langchain/document";
import { processPDFWithOCR } from "../services/ocrService";

interface PDFMetadata {
    loc?: {
        pageNumber?: number;
    };
}

type DocumentRow = typeof document.$inferSelect;

class UploadError extends Error {
    constructor(message: string, public status: number) {
        super(message);
        this.name = "UploadError";
    }
}

const TEMP_FILE_PREFIX = "pdr-ai-upload-";
const DATALAB_API_KEY = process.env.DATALAB_API_KEY ?? undefined;

export async function POST(request: Request) {
    let tempFilePath: string | null = null;

    try {
        const validation = await validateRequestBody(request, UploadDocumentSchema);
        if (!validation.success) {
            return validation.response;
        }

        const { userId, documentName, documentUrl, documentCategory, enableOCR } = validation.data;

        const [userInfo] = await db
            .select()
            .from(users)
            .where(eq(users.userId, userId));

        if (!userInfo) {
            throw new UploadError("Invalid user.", 400);
        }

        if (!process.env.OPENAI_API_KEY) {
            throw new UploadError("Embedding service is not configured.", 500);
        }

        // Check if OCR is enabled and API key is available
        if (enableOCR && !DATALAB_API_KEY) {
            throw new UploadError("OCR service is not configured. Please contact administrator.", 500);
        }

        let ocrMetadata: Record<string, unknown> | null = null;
        let sourceDocuments: Document<PDFMetadata>[] = [];

        if (enableOCR && DATALAB_API_KEY) {
            // OCR PATH: Use Datalab Marker API
            console.log("Processing document with OCR...");
            
            try {
                const ocrResult = await processPDFWithOCR(
                    documentUrl,
                    DATALAB_API_KEY?.toString() || '',
                    {
                        output_format: 'markdown',
                        use_llm: true,
                        force_ocr: false,
                        paginate: true,
                    }
                );
                
                console.log(`📄 [OCR] OCR returned content length: ${ocrResult.content.length}, page_count: ${ocrResult.page_count}`);
                console.log(`🔍 [OCR] FULL OCR RESPONSE:`);
                console.log('='.repeat(80));
                console.log(ocrResult.content);
                console.log('='.repeat(80));
                console.log(`📊 [OCR] Metadata: ${JSON.stringify(ocrResult.metadata, null, 2)}`);
                
                sourceDocuments = buildOcrDocuments(ocrResult.content, ocrResult.page_count, true);
                ocrMetadata = {
                    page_count: ocrResult.page_count,
                    processed_at: new Date().toISOString(),
                    ...(ocrResult.metadata && { metadata: ocrResult.metadata }),
                };

                console.log(`OCR processing completed. Extracted ${ocrResult.content.length} characters.`);
            } catch (ocrError) {
                console.error("OCR processing failed:", ocrError);
                throw new UploadError(
                    `OCR processing failed: ${ocrError instanceof Error ? ocrError.message : 'Unknown error'}`,
                    500
                );
            }
        } else {
            // DEFAULT PATH: Use PDFLoader
            console.log("Processing document with standard PDF extraction...");
            
            const response = await fetch(documentUrl);
            if (!response.ok) {
                throw new UploadError(`Unable to fetch PDF from ${documentUrl}`, 502);
            }

            const pdfArrayBuffer = await response.arrayBuffer();
            if (pdfArrayBuffer.byteLength === 0) {
                throw new UploadError("The downloaded PDF file is empty.", 400);
            }
            const pdfBuffer = Buffer.from(pdfArrayBuffer);

            tempFilePath = path.join(os.tmpdir(), `${TEMP_FILE_PREFIX}${randomUUID()}.pdf`);
            await fs.writeFile(tempFilePath, pdfBuffer);

            const loader = new PDFLoader(tempFilePath);
            const docs = await loader.load() as Document<PDFMetadata>[];
            if (docs.length === 0) {
                throw new UploadError("No readable content found in the provided PDF.", 422);
            }

            sourceDocuments = docs;
        }

        if (sourceDocuments.length === 0) {
            throw new UploadError("Unable to extract any content from the document.", 422);
        }

        // Split text into chunks (unified for both paths)
        console.log(`🔍 [SPLITTER] Splitting ${sourceDocuments.length} source documents`);
        
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        
        const allSplits = (await textSplitter.splitDocuments(sourceDocuments)) as Document<PDFMetadata>[];
        
        console.log(`✅ [SPLITTER] Created ${allSplits.length} chunks from ${sourceDocuments.length} documents`);
        console.log(`📄 [SPLITTER] Page numbers in splits: ${allSplits.map(s => s.metadata.loc?.pageNumber).join(', ')}`);

        if (allSplits.length === 0) {
            throw new UploadError("Unable to split document into chunks.", 422);
        }

        const embeddings = new OpenAIEmbeddings({
            model: "text-embedding-ada-002",
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        const chunkTexts = allSplits.map((split) => split.pageContent);
        const chunkEmbeddings = await embeddings.embedDocuments(chunkTexts);

        if (chunkEmbeddings.length !== allSplits.length) {
            throw new UploadError("Mismatch between number of splits and embeddings.", 500);
        }

        const chunkPayload = allSplits.map((split, index) => {
            const noNullContent = split.pageContent.replace(/\0/g, "");
            const sanitizedContent = noNullContent.trim() || noNullContent || " ";

            const embedding = chunkEmbeddings[index];
            if (!embedding) {
                throw new UploadError(`Missing embedding for chunk at index ${index}.`, 500);
            }

            return {
                page: split.metadata?.loc?.pageNumber ?? 1,
                content: sanitizedContent,
                embeddingVector: `[${embedding.join(",")}]`,
            };
        });

        let createdDocument: DocumentRow | null = null;

        await db.transaction(async (tx) => {
            const [insertedDocument] = await tx
                .insert(document)
                .values({
                    url: documentUrl,
                    category: documentCategory,
                    title: documentName,
                    companyId: userInfo.companyId,
                    ocrEnabled: enableOCR ?? false,
                    ocrProcessed: enableOCR ? true : false,
                    ocrMetadata: ocrMetadata,
                })
                .returning();

            if (!insertedDocument) {
                throw new UploadError("Failed to insert document.", 500);
            }

            const rowsToInsert = chunkPayload.map((chunk) => ({
                documentId: insertedDocument.id,
                page: chunk.page,
                content: chunk.content,
                embedding: sql`${chunk.embeddingVector}::vector(1536)`,
            }));

            await tx.insert(pdfChunks).values(rowsToInsert);

            createdDocument = insertedDocument;
        });

        if (!createdDocument) {
            throw new UploadError("Failed to create document.", 500);
        }

        return NextResponse.json(
            {
                message: "Document created and embeddings stored successfully",
                document: createdDocument,
                ocrProcessed: enableOCR ?? false,
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        const status = error instanceof UploadError ? error.status : 500;
        const message =
            error instanceof UploadError
                ? error.message
                : "An unexpected error occurred while processing the document upload.";

        console.error("Upload document error:", error);
        return NextResponse.json({ error: message }, { status });
    } finally {
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch((cleanupError) => {
                console.warn(`Failed to clean up temporary file ${tempFilePath}:`, cleanupError);
            });
        }
    }
}

/**
 * Parse paginated OCR output from DataLab Marker API
 * Format: Content...\n\n{PAGE_NUMBER}\n{48 dashes}\n\nNext page content...
 * The separator marks the END of the previous page and shows its page number
 * @param content - Paginated markdown content from DataLab
 * @returns Array of documents with correct page metadata
 */
export function parseNativePaginatedOcr(content: string): Document<PDFMetadata>[] {
    console.log('🔍 [PARSER] Starting native pagination parse');
    console.log(`🔍 [PARSER] Content preview: ${content.substring(0, 200)}`);
    
    // Regex to match DataLab page separator formats:
    // Format 1: {PAGE_NUMBER}------------------------------------------------
    // Format 2: \n\n{PAGE_NUMBER}\n{46-50 dashes}\n\n
    const pageRegex = /\{(\d+)\}-{40,50}|[\r\n]{2,}(\d+)[\r\n]-{46,50}[\r\n]{2,}/g;
    
    const documents: Document<PDFMetadata>[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = pageRegex.exec(content)) !== null) {
        // match[1] is for {N} format, match[2] is for \n\nN\n format
        const pageNumber = parseInt(match[1] ?? match[2] ?? '1', 10);
        const pageContent = content.slice(lastIndex, match.index).trim();
        
        console.log(`📄 [PARSER] Found page ${pageNumber}, content length: ${pageContent.length}, match: "${match[0].substring(0, 20)}..."`);
        
        // Only add non-empty pages
        if (pageContent) {
            documents.push({
                pageContent,
                metadata: { loc: { pageNumber } }
            });
        }
        
        lastIndex = pageRegex.lastIndex;
    }
    
    // Handle content after last separator
    const finalContent = content.slice(lastIndex).trim();
    if (finalContent) {
        // Content after last separator is the next page
        const lastPageNum = documents.length > 0 
            ? (((documents[documents.length - 1]?.metadata?.loc?.pageNumber) ?? 0) + 1)
            : 1;
        
        documents.push({
            pageContent: finalContent,
            metadata: { loc: { pageNumber: lastPageNum } }
        });
    }
    
    // Fallback: if no pages found, return single document
    if (documents.length === 0) {
        return [{
            pageContent: content.trim(),
            metadata: { loc: { pageNumber: 1 } }
        }];
    }
    
    return documents;
}

function buildOcrDocuments(
    content: string, 
    pageCount?: number,
    isPaginated?: boolean
): Document<PDFMetadata>[] {
    // If content is natively paginated by DataLab, parse it
    if (isPaginated) {
        return parseNativePaginatedOcr(content);
    }
    
    // Fallback to existing logic for non-paginated content
    const sections = extractExplicitSections(content);

    const candidates = sections.length > 0
        ? sections
        : approximateSections(content, pageCount);

    if (candidates.length === 0) {
        return [{
            pageContent: content,
            metadata: { loc: { pageNumber: 1 } }
        }];
    }

    return candidates.map(({ pageNumber, text }) => ({
        pageContent: text,
        metadata: { loc: { pageNumber } }
    }));
}

function extractExplicitSections(content: string): Array<{ pageNumber: number; text: string }> {
    const regex = /(?:^|\n+)(?:={3,}\s*Page\s+(\d+)\s*={3,}|#{1,3}\s*Page\s+(\d+))/gi;
    const sections: Array<{ pageNumber: number; text: string }> = [];

    let lastIndex = 0;
    let currentPage = 1;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
        const preceding = content.slice(lastIndex, match.index).trim();
        if (preceding) {
            sections.push({ pageNumber: currentPage, text: preceding });
        }

        currentPage = Number(match[1] ?? match[2]) || currentPage + 1;
        lastIndex = regex.lastIndex;
    }

    const trailing = content.slice(lastIndex).trim();
    if (trailing) {
        sections.push({ pageNumber: currentPage, text: trailing });
    }

    return sections;
}

function approximateSections(content: string, pageCount?: number): Array<{ pageNumber: number; text: string }> {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
        return [];
    }

    const totalPages = Math.max(1, pageCount ?? 1);
    const approxLength = Math.max(100, Math.ceil(normalizedContent.length / totalPages));
    const sections: Array<{ pageNumber: number; text: string }> = [];

    for (let page = 0; page < totalPages; page++) {
        const slice = normalizedContent.slice(page * approxLength, (page + 1) * approxLength).trim();
        if (slice) {
            sections.push({
                pageNumber: page + 1,
                text: slice
            });
        }
    }

    if (sections.length === 0) {
        sections.push({ pageNumber: 1, text: normalizedContent });
    }

    return sections;
}
