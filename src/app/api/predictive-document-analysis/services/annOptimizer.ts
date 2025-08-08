import { db } from "../../../../server/db/index";
import { and, eq, inArray, sql, desc } from "drizzle-orm";
import { pdfChunks } from "~/server/db/schema";

interface ANNConfig {
    strategy: 'hnsw' | 'ivf' | 'hybrid' | 'prefiltered';
    probeCount?: number;
    efSearch?: number;
    maxCandidates?: number;
    prefilterThreshold?: number;
}

interface ANNResult {
    id: number;
    content: string;
    page: number;
    documentId: number;
    distance: number;
    confidence: number;
}

const documentClustersCache = new Map<number, DocumentCluster>();

interface DocumentCluster {
    documentId: number;
    centroid: number[];
    chunkIds: number[];
    avgDistance: number;
    lastUpdated: Date;
}

export class ANNOptimizer {
    private config: ANNConfig;
    
    constructor(config: ANNConfig = { strategy: 'hybrid' }) {
        this.config = config;
    }

    async searchSimilarChunks(
        queryEmbedding: number[],
        documentIds: number[],
        limit: number = 10,
        distanceThreshold: number = 0.7
    ): Promise<ANNResult[]> {
        
        switch (this.config.strategy) {
            case 'hnsw':
                return this.hnswSearch(queryEmbedding, documentIds, limit, distanceThreshold);
            
            case 'ivf':
                return this.ivfSearch(queryEmbedding, documentIds, limit, distanceThreshold);
            
            case 'prefiltered':
                return this.prefilteredSearch(queryEmbedding, documentIds, limit, distanceThreshold);
            
            case 'hybrid':
            default:
                return this.hybridSearch(queryEmbedding, documentIds, limit, distanceThreshold);
        }
    }

    /**
     * HNSW-inspired hierarchical search
     * Uses PostgreSQL's built-in vector operations with optimized queries
     */
    private async hnswSearch(
        queryEmbedding: number[],
        documentIds: number[],
        limit: number,
        threshold: number
    ): Promise<ANNResult[]> {
        
        const embeddingStr = `[${queryEmbedding.join(',')}]`;
        
        const approximateLimit = Math.min(limit * 5, 100);
        
        const results = await db.execute(sql`
            SELECT 
                id,
                content,
                page,
                document_id as "documentId",
                embedding <=> ${embeddingStr}::vector as distance
            FROM pdr_ai_v2_pdf_chunks 
            WHERE document_id = ANY(${documentIds})
            ORDER BY embedding <=> ${embeddingStr}::vector
            LIMIT ${approximateLimit}
        `);

        const refinedResults = results.rows
            .map(row => ({
                ...row,
                distance: Number(row.distance || 1),
                confidence: Math.max(0, 1 - Number(row.distance || 1))
            }))
            .filter(r => r.distance <= threshold)
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);

        return refinedResults as ANNResult[];
    }

    private async ivfSearch(
        queryEmbedding: number[],
        documentIds: number[],
        limit: number,
        threshold: number
    ): Promise<ANNResult[]> {
        

        const relevantClusters = await this.findRelevantDocumentClusters(
            queryEmbedding, 
            documentIds, 
            this.config.probeCount || 3
        );

        if (relevantClusters.length === 0) {
            return this.hnswSearch(queryEmbedding, documentIds, limit, threshold);
        }

        const clusterChunkIds = relevantClusters.flatMap(c => c.chunkIds);
        
        const embeddingStr = `[${queryEmbedding.join(',')}]`;
        
        const results = await db.execute(sql`
            SELECT 
                id,
                content,
                page,
                document_id as "documentId",
                embedding <=> ${embeddingStr}::vector as distance
            FROM pdr_ai_v2_pdf_chunks 
            WHERE id = ANY(${clusterChunkIds})
            AND embedding <=> ${embeddingStr}::vector <= ${threshold}
            ORDER BY embedding <=> ${embeddingStr}::vector
            LIMIT ${limit}
        `);

        return results.rows.map(row => ({
            ...row,
            distance: Number(row.distance || 1),
            confidence: Math.max(0, 1 - Number(row.distance || 1))
        })) as ANNResult[];
    }


    private async prefilteredSearch(
        queryEmbedding: number[],
        documentIds: number[],
        limit: number,
        threshold: number
    ): Promise<ANNResult[]> {
        
        const docScores = await this.calculateDocumentRelevanceScores(queryEmbedding, documentIds);
        
        const sortedDocIds = docScores
            .filter(d => d.score > (this.config.prefilterThreshold || 0.3))
            .sort((a, b) => b.score - a.score)
            .map(d => d.documentId);

        if (sortedDocIds.length === 0) {
            return this.hnswSearch(queryEmbedding, documentIds, limit, threshold);
        }

        const results: ANNResult[] = [];
        const embeddingStr = `[${queryEmbedding.join(',')}]`;

        for (const docId of sortedDocIds) {
            if (results.length >= limit) break;

            const remaining = limit - results.length;
            const docResults = await db.execute(sql`
                SELECT 
                    id,
                    content,
                    page,
                    document_id as "documentId",
                    embedding <=> ${embeddingStr}::vector as distance
                FROM pdr_ai_v2_pdf_chunks 
                WHERE document_id = ${docId}
                AND embedding <=> ${embeddingStr}::vector <= ${threshold}
                ORDER BY embedding <=> ${embeddingStr}::vector
                LIMIT ${remaining * 2}
            `);

            const mappedResults = docResults.rows.map(row => ({
                ...row,                distance: Number(row.distance || 1),
                confidence: Math.max(0, 1 - Number(row.distance || 1))
            })) as ANNResult[];

            results.push(...mappedResults.slice(0, remaining));
        }

        return results.sort((a, b) => a.distance - b.distance);
    }


    private async hybridSearch(
        queryEmbedding: number[],
        documentIds: number[],
        limit: number,
        threshold: number
    ): Promise<ANNResult[]> {
        
        if (documentIds.length <= 5) {
            return this.hnswSearch(queryEmbedding, documentIds, limit, threshold);
        }

        if (documentIds.length <= 20) {
            return this.prefilteredSearch(queryEmbedding, documentIds, limit, threshold);
        }

        return this.ivfSearch(queryEmbedding, documentIds, limit, threshold);
    }

    private async calculateDocumentRelevanceScores(
        queryEmbedding: number[],
        documentIds: number[]
    ): Promise<{ documentId: number; score: number }[]> {
        
        const scores: { documentId: number; score: number }[] = [];
        
        for (const docId of documentIds) {
            let cluster = documentClustersCache.get(docId);
            
            if (!cluster || Date.now() - cluster.lastUpdated.getTime() > 3600000) {
                cluster = await this.buildDocumentCluster(docId);
                documentClustersCache.set(docId, cluster);
            }

            const similarity = this.cosineSimilarity(queryEmbedding, cluster.centroid);
            scores.push({ documentId: docId, score: similarity });
        }

        return scores;
    }

    private async buildDocumentCluster(documentId: number): Promise<DocumentCluster> {
        const chunks = await db.select({
            id: pdfChunks.id,
            embedding: pdfChunks.embedding
        }).from(pdfChunks).where(eq(pdfChunks.documentId, documentId));

        if (chunks.length === 0) {
            return {
                documentId,
                centroid: [],
                chunkIds: [],
                avgDistance: 1,
                lastUpdated: new Date()
            };
        }

        const dimension = chunks[0].embedding?.length || 1536;
        const centroid = new Array(dimension).fill(0);
        
        for (const chunk of chunks) {
            if (chunk.embedding) {
                for (let i = 0; i < dimension; i++) {
                    centroid[i] += chunk.embedding[i];
                }
            }
        }
        
        for (let i = 0; i < dimension; i++) {
            centroid[i] /= chunks.length;
        }

        let totalDistance = 0;
        let comparisons = 0;
        
        for (let i = 0; i < chunks.length && comparisons < 100; i++) {
            for (let j = i + 1; j < chunks.length && comparisons < 100; j++) {
                if (chunks[i]?.embedding && chunks[j]?.embedding) {
                    totalDistance += this.euclideanDistance(chunks[i].embedding, chunks[j].embedding);
                    comparisons++;
                }
            }
        }

        const avgDistance = comparisons > 0 ? totalDistance / comparisons : 1;

        return {
            documentId,
            centroid,
            chunkIds: chunks.map(c => c.id),
            avgDistance,
            lastUpdated: new Date()
        };
    }

    private async findRelevantDocumentClusters(
        queryEmbedding: number[],
        documentIds: number[],
        topK: number = 3
    ): Promise<DocumentCluster[]> {
        
        const clusters: Array<{ cluster: DocumentCluster; similarity: number }> = [];

        for (const docId of documentIds) {
            let cluster = documentClustersCache.get(docId);
            
            if (!cluster) {
                cluster = await this.buildDocumentCluster(docId);
                documentClustersCache.set(docId, cluster);
            }

            if (cluster.centroid.length > 0) {
                const similarity = this.cosineSimilarity(queryEmbedding, cluster.centroid);
                clusters.push({ cluster, similarity });
            }
        }

        return clusters
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
            .map(c => c.cluster);
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    private euclideanDistance(a: number[], b: number[]): number {
        if (a.length !== b.length) return Infinity;

        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            const diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    }

    static clearCache(): void {
        documentClustersCache.clear();
    }

    static getCacheStats(): { size: number; oldestEntry: Date | null } {
        const entries = Array.from(documentClustersCache.values());
        return {
            size: entries.length,
            oldestEntry: entries.length > 0 
                ? new Date(Math.min(...entries.map(e => e.lastUpdated.getTime())))
                : null
        };
    }
}

export default ANNOptimizer; 