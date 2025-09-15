import { db } from "~/server/db/index";
import { eq, sql } from "drizzle-orm";
import { pdfChunks, document } from "~/server/db/schema";
import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { EnsembleRetriever } from "langchain/retrievers/ensemble";
import { BaseRetriever, type BaseRetrieverInput } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import type { OpenAIEmbeddings } from "@langchain/openai";
import type { CallbackManagerForRetrieverRun } from "@langchain/core/callbacks/manager";

export interface CompanyEnsembleOptions {
    weights?: number[]; 
    topK?: number;
    companyId: number;
}

export interface CompanySearchResult {
    pageContent: string;
    metadata: {
        chunkId?: number;
        page?: number;
        documentId?: number;
        documentTitle?: string;
        distance?: number;
        source?: string;
        searchScope: "company";
        retrievalMethod?: string;
        timestamp?: string;
    };
}

type CompanyChunkRow = {
    id: number;
    content: string;
    page: number;
    documentId: number;
    documentTitle: string;
};

class CompanyANNVectorRetriever extends BaseRetriever {
    lc_namespace = ["company", "retrievers"];
    
    private companyId: number;
    private topK: number;
    private embeddings: OpenAIEmbeddings;
    
    constructor(fields: BaseRetrieverInput & {
        companyId: number;
        topK?: number;
        embeddings: OpenAIEmbeddings;
    }) {
        super(fields);
        this.companyId = fields.companyId;
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
                    c.id,
                    c.content,
                    c.page,
                    c.document_id,
                    d.title as document_title,
                    c.embedding <-> ${bracketedEmbedding}::vector(1536) AS distance
                FROM pdr_ai_v2_pdf_chunks c
                JOIN pdr_ai_v2_document d ON c.document_id = d.id 
                WHERE d.company_id = ${this.companyId.toString()}
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
                    source: 'company_ann',
                    searchScope: 'company'
                }
            }));
            
        } catch (error) {
            console.error("Company ANN Vector Retriever error:", error);
            return [];
        }
    }
}

async function getCompanyChunks(companyId: number): Promise<CompanyChunkRow[]> {
    const rows = await db
        .select({
            id: pdfChunks.id,
            content: pdfChunks.content,
            page: pdfChunks.page,
            documentId: pdfChunks.documentId,
            documentTitle: document.title,
        })
        .from(pdfChunks)
        .innerJoin(document, eq(pdfChunks.documentId, document.id))
        .where(eq(document.companyId, companyId.toString()));

    return rows;
}

function toCompanyDocuments(rows: CompanyChunkRow[]): Document[] {
    return rows.map((r) =>
        new Document({
            pageContent: r.content,
            metadata: { 
                chunkId: r.id, 
                page: r.page, 
                documentId: r.documentId,
                documentTitle: r.documentTitle,
                source: 'company_bm25',
                searchScope: 'company'
            },
        })
    );
}


async function createCompanyBM25Retriever(
    companyId: number,
    topK = 10
): Promise<BM25Retriever> {
    const rows = await getCompanyChunks(companyId);
    if (rows.length === 0) {
        throw new Error(`No chunks found for company ${companyId}`);
    }
    
    const docs = toCompanyDocuments(rows);
    return BM25Retriever.fromDocuments(docs, { k: topK });
}

export async function createCompanyEnsembleRetriever(
    companyId: number,
    embeddings: OpenAIEmbeddings,
    options: CompanyEnsembleOptions
): Promise<EnsembleRetriever> {
    const { weights = [0.4, 0.6], topK = 10 } = options;
    
    const bm25Retriever = await createCompanyBM25Retriever(companyId, topK);
    
    const annRetriever = new CompanyANNVectorRetriever({
        companyId,
        topK,
        embeddings
    });
    
    return new EnsembleRetriever({
        retrievers: [bm25Retriever, annRetriever],
        weights,
    });
}

export async function companyEnsembleSearch(
    companyId: number,
    query: string,
    embeddings: OpenAIEmbeddings,
    options: CompanyEnsembleOptions
): Promise<CompanySearchResult[]> {
    try {
        const ensembleRetriever = await createCompanyEnsembleRetriever(
            companyId,
            embeddings,
            options
        );
        
        const results = await ensembleRetriever.getRelevantDocuments(query);
        
        return results.map(doc => ({
            pageContent: doc.pageContent,
            metadata: {
                ...doc.metadata,
                retrievalMethod: 'company_ensemble_rrf',
                timestamp: new Date().toISOString(),
                searchScope: 'company' as const
            }
        })) as CompanySearchResult[];
        
    } catch (error) {
        console.error("Company ensemble search error:", error);
        console.warn("Falling back to company BM25-only search");
        
        const rows = await getCompanyChunks(companyId);
        const docs = toCompanyDocuments(rows);
        const retriever = BM25Retriever.fromDocuments(docs, { k: options.topK ?? 10 });
        const fallbackResults = await retriever.getRelevantDocuments(query);
        
        return fallbackResults.map(doc => ({
            pageContent: doc.pageContent,
            metadata: {
                ...doc.metadata,
                retrievalMethod: 'company_bm25_fallback',
                timestamp: new Date().toISOString(),
                searchScope: 'company' as const
            }
        })) as CompanySearchResult[];
    }
}
