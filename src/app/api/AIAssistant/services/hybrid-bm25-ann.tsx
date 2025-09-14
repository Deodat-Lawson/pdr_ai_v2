import { db } from "~/server/db/index";
import { eq, sql } from "drizzle-orm";
import { pdfChunks } from "~/server/db/schema";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { EnsembleRetriever } from "langchain/retrievers/ensemble";
import { BaseRetriever, type BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import type { OpenAIEmbeddings } from "@langchain/openai";
import type { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";

export type Bm25Options = {
    topK?: number; 
};

export type RrfOptions = {
    k?: number; 
    limit?: number; 
};

export type ChunkRow = {
    id: number;
    content: string;
    page: number;
};

export interface EnsembleOptions {
    weights?: number[]; 
    topK?: number;
}

class ANNVectorRetriever extends BaseRetriever {
    lc_namespace = ["custom", "retrievers"];
    
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
        this.topK = fields.topK ?? 10;
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
                    id,
                    content,
                    page,
                    embedding <-> ${bracketedEmbedding}::vector(1536) AS distance
                FROM pdr_ai_v2_pdf_chunks
                WHERE document_id = ${this.documentId}
                ORDER BY embedding <-> ${bracketedEmbedding}::vector(1536)
                LIMIT ${this.topK}
            `;
            
            const result = await db.execute<{
                id: number;
                content: string;
                page: number;
                distance: number;
            }>(sqlQuery);
            
            return result.rows.map(row => new Document({
                pageContent: row.content,
                metadata: { 
                    chunkId: row.id, 
                    page: row.page, 
                    distance: row.distance,
                    source: 'ann'
                }
            }));
            
        } catch (error) {
            console.error("ANN Vector Retriever error:", error);
            return [];
        }
    }
}

async function getDocumentChunks(documentId: number): Promise<ChunkRow[]> {
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

function toDocuments(rows: ChunkRow[]): Document[] {
    return rows.map((r) =>
        new Document({
            pageContent: r.content,
            metadata: { chunkId: r.id, page: r.page, source: 'bm25' },
        })
    );
}


async function createBM25Retriever(
    documentId: number, 
    topK = 10
): Promise<BM25Retriever> {
    const rows = await getDocumentChunks(documentId);
    if (rows.length === 0) {
        throw new Error(`No chunks found for document ${documentId}`);
    }
    
    const docs = toDocuments(rows);
    return BM25Retriever.fromDocuments(docs, { k: topK });
}

export async function bm25Search(
    documentId: number,
    query: string,
    options: Bm25Options = {}
): Promise<Document[]> {
    const { topK = 10 } = options;

    const rows = await getDocumentChunks(documentId);
    if (rows.length === 0) return [];

    const docs = toDocuments(rows);
    const retriever = BM25Retriever.fromDocuments(docs, { k: topK });
    const results = await retriever.getRelevantDocuments(query);
    return results.slice(0, topK);
}

function makeDocKey(doc: Document): string {
    // Create a stable key for a document across retrievers
    const page = (doc.metadata as Record<string, unknown>)?.page;
    const chunkId = (doc.metadata as Record<string, unknown>)?.chunkId;
    return JSON.stringify({ chunkId, page, content: doc.pageContent });
}

export function reciprocalRankFusion(
    resultLists: Document[][],
    options: RrfOptions = {}
): Document[] {
    const k = options.k ?? 60;
    const limit = options.limit ?? 10;

    const scoreByKey = new Map<string, number>();
    const docByKey = new Map<string, Document>();

    for (const results of resultLists) {
        for (let rank = 0; rank < results.length; rank++) {
            const doc = results[rank];
            if (!doc) continue; // Skip if undefined
            const key = makeDocKey(doc);
            const prev = scoreByKey.get(key) ?? 0;
            scoreByKey.set(key, prev + 1 / (k + rank + 1));
            if (!docByKey.has(key)) docByKey.set(key, doc);
        }
    }

    const sortedEntries = Array.from(scoreByKey.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);

    const fused: Document[] = [];
    for (const [key] of sortedEntries) {
        const doc = docByKey.get(key);
        if (doc) fused.push(doc);
    }

    return fused;
}

export async function createEnsembleRetriever(
    documentId: number,
    embeddings: OpenAIEmbeddings,
    options: EnsembleOptions = {}
): Promise<EnsembleRetriever> {
    const { weights = [0.5, 0.5], topK = 10 } = options;
    
    const bm25Retriever = await createBM25Retriever(documentId, topK);
    
    const annRetriever = new ANNVectorRetriever({
        documentId,
        topK,
        embeddings
    });
    
    return new EnsembleRetriever({
        retrievers: [bm25Retriever, annRetriever],
        weights,
    });
}

export async function hybridRrfSearch(
    documentId: number,
    query: string,
    providers: Array<() => Promise<Document[]>>,
    rrfOptions: RrfOptions = {}
): Promise<Document[]> {
    // Always include BM25 as one provider (first), plus any additional providers (e.g., ANN/vector search)
    const searches = [
        () => bm25Search(documentId, query, { topK: rrfOptions.limit ?? 10 }),
        ...providers,
    ];

    const results = await Promise.all(
        searches.map(async (p) => {
            try {
                return await p();
            } catch (err) {
                console.warn("Provider failed in hybridRrfSearch:", err);
                return [] as Document[];
            }
        })
    );

    return reciprocalRankFusion(results, rrfOptions);
}

export async function ensembleSearch(
    documentId: number,
    query: string,
    embeddings: OpenAIEmbeddings,
    options: EnsembleOptions = {}
): Promise<Document[]> {
    try {
        const ensembleRetriever = await createEnsembleRetriever(
            documentId, 
            embeddings, 
            options
        );
        
        const results = await ensembleRetriever.getRelevantDocuments(query);
        
        return results.map(doc => ({
            ...doc,
            metadata: {
                ...doc.metadata,
                retrievalMethod: 'ensemble_rrf',
                timestamp: new Date().toISOString()
            }
        }));
        
    } catch (error) {
        console.error("Ensemble search error:", error);
        console.warn("Falling back to BM25-only search");
        return await bm25Search(documentId, query, { topK: options.topK });
    }
}
