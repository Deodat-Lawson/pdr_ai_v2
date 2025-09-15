import { db } from "~/server/db/index";
import { eq, sql } from "drizzle-orm";
import { pdfChunks } from "~/server/db/schema";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { EnsembleRetriever } from "langchain/retrievers/ensemble";
import { BaseRetriever, type BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import type { OpenAIEmbeddings } from "@langchain/openai";
import type { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";

export interface DocumentEnsembleOptions {
    weights?: number[]; 
    topK?: number;
    documentId: number;
}

export interface DocumentSearchResult {
    pageContent: string;
    metadata: {
        chunkId?: number;
        page?: number;
        documentId?: number;
        documentTitle?: string;
        distance?: number;
        source?: string;
        searchScope: "document";
        retrievalMethod?: string;
        timestamp?: string;
    };
}

type DocumentChunkRow = {
    id: number;
    content: string;
    page: number;
};

class DocumentANNVectorRetriever extends BaseRetriever {
    lc_namespace = ["document", "retrievers"];
    
    private documentId: number;
    private topK: number;
    private embeddings: OpenAIEmbeddings;
    
    constructor(fields: BaseRetrieverInput & {
        documentId: number;
        topK?: number;
        embeddings: OpenAIEmbeddings;
    }) {
        super(fields);
        this.documentId = fields.documentId;
        this.topK = fields.topK ?? 5;
        this.embeddings = fields.embeddings;
    }
    
    async _getRelevantDocuments(
        query: string,
        _runManager?: CallbackManagerForRetrieverRun
    ): Promise<Document[]> {
        try {
            const queryEmbedding = await this.embeddings.embedQuery(query);
            const bracketedEmbedding = `[${queryEmbedding.join(",")}]`;
            
            const sqlQuery = sql`
                SELECT 
                    c.id,
                    c.content,
                    c.page,
                    c.document_id,
                    d.title as document_title,
                    c.embedding <-> ${bracketedEmbedding}::vector(1536) AS distance
                FROM pdr_ai_v2_pdf_chunks c
                JOIN pdr_ai_v2_document d ON c.document_id = d.id 
                WHERE c.document_id = ${this.documentId}
                ORDER BY c.embedding <-> ${bracketedEmbedding}::vector(1536)
                LIMIT ${this.topK}
            `;
            
            const result = await db.execute<{
                id: number;
                content: string;
                page: number;
                document_id: number;
                document_title: string;
                distance: number;
            }>(sqlQuery);
            
            return result.rows.map(row => new Document({
                pageContent: row.content,
                metadata: { 
                    chunkId: row.id, 
                    page: row.page, 
                    documentId: row.document_id,
                    documentTitle: row.document_title,
                    distance: row.distance,
                    source: 'document_ann',
                    searchScope: 'document'
                }
            }));
            
        } catch (error) {
            console.error("Document ANN Vector Retriever error:", error);
            return [];
        }
    }
}

async function getDocumentChunks(documentId: number): Promise<DocumentChunkRow[]> {
    const rows = await db
        .select({
            id: pdfChunks.id,
            content: pdfChunks.content,
            page: pdfChunks.page,
        })
        .from(pdfChunks)
        .where(eq(pdfChunks.documentId, documentId));

    return rows;
}

function toDocumentDocuments(rows: DocumentChunkRow[]): Document[] {
    return rows.map((r) =>
        new Document({
            pageContent: r.content,
            metadata: { 
                chunkId: r.id, 
                page: r.page, 
                source: 'document_bm25',
                searchScope: 'document'
            },
        })
    );
}

async function createDocumentBM25Retriever(
    documentId: number,
    topK = 5
): Promise<BM25Retriever> {
    const rows = await getDocumentChunks(documentId);
    if (rows.length === 0) {
        throw new Error(`No chunks found for document ${documentId}`);
    }
    
    const docs = toDocumentDocuments(rows);
    return BM25Retriever.fromDocuments(docs, { k: topK });
}

export async function createDocumentEnsembleRetriever(
    documentId: number,
    embeddings: OpenAIEmbeddings,
    options: DocumentEnsembleOptions
): Promise<EnsembleRetriever> {
    const { weights = [0.4, 0.6], topK = 5 } = options;
    
    const bm25Retriever = await createDocumentBM25Retriever(documentId, topK);
    
    const annRetriever = new DocumentANNVectorRetriever({
        documentId,
        topK,
        embeddings
    });
    
    return new EnsembleRetriever({
        retrievers: [bm25Retriever, annRetriever],
        weights,
    });
}

export async function documentEnsembleSearch(
    documentId: number,
    query: string,
    embeddings: OpenAIEmbeddings,
    options: DocumentEnsembleOptions
): Promise<DocumentSearchResult[]> {
    try {
        const ensembleRetriever = await createDocumentEnsembleRetriever(
            documentId,
            embeddings,
            options
        );
        
        const results = await ensembleRetriever.getRelevantDocuments(query);
        
        return results.map(doc => ({
            pageContent: doc.pageContent,
            metadata: {
                ...doc.metadata,
                retrievalMethod: 'document_ensemble_rrf',
                timestamp: new Date().toISOString(),
                searchScope: 'document' as const
            }
        })) as DocumentSearchResult[];
        
    } catch (error) {
        console.error("Document ensemble search error:", error);
        console.warn("Falling back to document BM25-only search");
        
        const rows = await getDocumentChunks(documentId);
        const docs = toDocumentDocuments(rows);
        const retriever = BM25Retriever.fromDocuments(docs, { k: options.topK ?? 5 });
        const fallbackResults = await retriever.getRelevantDocuments(query);
        
        return fallbackResults.map(doc => ({
            pageContent: doc.pageContent,
            metadata: {
                ...doc.metadata,
                retrievalMethod: 'document_bm25_fallback',
                timestamp: new Date().toISOString(),
                searchScope: 'document' as const
            }
        })) as DocumentSearchResult[];
    }
}
