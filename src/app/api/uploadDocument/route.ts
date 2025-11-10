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
import { env } from "~/env";

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
        if (enableOCR && !env.DATALAB_API_KEY) {
            throw new UploadError("OCR service is not configured. Please contact administrator.", 500);
        }

        let textContent: string;
        let ocrMetadata: any = null;

        if (enableOCR && env.DATALAB_API_KEY) {
            // OCR PATH: Use Datalab Marker API
            console.log("Processing document with OCR...");
            
            try {
                const ocrResult = await processPDFWithOCR(
                    documentUrl,
                    env.DATALAB_API_KEY,
                    {
                        output_format: 'markdown',
                        use_llm: true,
                        force_ocr: false,
                    }
                );
                
                textContent = ocrResult.content;
                ocrMetadata = {
                    page_count: ocrResult.page_count,
                    processed_at: new Date().toISOString(),
                    metadata: ocrResult.metadata,
                };

                console.log(`OCR processing completed. Extracted ${textContent.length} characters.`);
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
            const docs = await loader.load();
            if (docs.length === 0) {
                throw new UploadError("No readable content found in the provided PDF.", 422);
            }

            textContent = docs.map(doc => doc.pageContent).join('\n\n');
        }

        // Split text into chunks (unified for both paths)
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        
        // Create documents from text content
        const documents = [{ pageContent: textContent, metadata: {} }];
        const allSplits = (await textSplitter.splitDocuments(documents)) as Document<PDFMetadata>[];

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
