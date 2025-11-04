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

        const { userId, documentName, documentUrl, documentCategory } = validation.data;

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

        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const allSplits = (await textSplitter.splitDocuments(docs)) as Document<PDFMetadata>[];

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

            return {
                page: split.metadata?.loc?.pageNumber ?? 1,
                content: sanitizedContent,
                embeddingVector: `[${chunkEmbeddings[index].join(",")}]`,
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
