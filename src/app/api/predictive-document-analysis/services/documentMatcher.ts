import { db } from "../../../../server/db/index";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { pdfChunks, document } from "~/server/db/schema";
import type { 
    MissingDocumentPrediction, 
    CompanyDocument, 
    DocumentMatch, 
    ValidationResult 
} from "../types";
import { getEmbeddings } from "../utils/embeddings";
import { cleanText, hasReferencePattern, truncateText } from "../utils/content";

type MatchCandidate = {
    documentId: number;
    confidence: number;
    page: number;
    snippet: string;
    reasons: string[];
    matchTypes: string[];
    finalScore: number;
};

export async function findSuggestedCompanyDocuments(
    missingDoc: MissingDocumentPrediction,
    companyId: number,
    currentDocumentId: number,
    docTitleMap: Map<number, string>
): Promise<{ documentId: number, documentTitle: string, similarity: number, page: number, snippet: string }[]> {
    try {
        console.log(`🔍 Searching for company documents matching: "${missingDoc.documentName}" (${missingDoc.documentType})`);
        
        const otherDocsQuery = await db.select({ 
            id: document.id, 
            title: document.title 
        }).from(document).where(and(
            eq(document.companyId, companyId.toString()),
            ne(document.id, currentDocumentId)
        ));
        
        const otherDocIds = otherDocsQuery.map(doc => doc.id);
        if (otherDocIds.length === 0) return [];

        const matchCandidates = new Map<number, MatchCandidate>();

        // Strategy 1: Exact reference matching (highest priority)
        const exactMatches = await findExactReferenceMatches(missingDoc, otherDocIds, docTitleMap);
        for (const match of exactMatches) {
            matchCandidates.set(match.documentId, {
                ...match,
                matchTypes: ['exact-reference'],
                finalScore: match.confidence * 1.2 // Boost exact matches
            });
        }

        // Strategy 2: Smart title analysis
        const titleMatches = await findSmartTitleMatches(missingDoc, otherDocsQuery);
        for (const match of titleMatches) {
            const existing = matchCandidates.get(match.documentId);
            if (!existing || match.confidence > existing.confidence) {
                matchCandidates.set(match.documentId, {
                    documentId: match.documentId,
                    confidence: match.confidence,
                    page: 1,
                    snippet: match.snippet,
                    reasons: match.reasons,
                    matchTypes: existing ? [...(existing.matchTypes || []), 'title'] : ['title'],
                    finalScore: match.confidence
                });
            }
        }

        // Strategy 3: Contextual content search (only if we have few high-confidence matches)
        const highConfidenceMatches = Array.from(matchCandidates.values()).filter(m => m.confidence > 0.7);
        if (highConfidenceMatches.length < 2) {
            const contextMatches = await findContextualMatches(missingDoc, otherDocIds);
            for (const match of contextMatches) {
                const existing = matchCandidates.get(match.documentId);
                                 if (!existing || (match.similarity > existing.confidence && match.similarity > 0.5)) {
                    const validatedMatch = await validateContextualMatch(missingDoc, match);
                    if (validatedMatch.isValid && validatedMatch.confidence > 0.5) {
                        matchCandidates.set(match.documentId, {
                            documentId: match.documentId,
                            confidence: validatedMatch.confidence,
                            page: match.page,
                            snippet: validatedMatch.snippet,
                            reasons: validatedMatch.reasons,
                            matchTypes: existing ? [...(existing.matchTypes || []), 'contextual'] : ['contextual'],
                            finalScore: validatedMatch.confidence * 0.9 // Slightly lower weight for contextual
                        });
                    }
                }
            }
        }

        // Convert to final format with intelligent scoring
        const finalSuggestions = Array.from(matchCandidates.values())
            .map(candidate => {
                const multiMatchBonus = candidate.matchTypes.length > 1 ? 0.1 : 0;
                const adjustedScore = Math.min(0.98, candidate.finalScore + multiMatchBonus);
                
                return {
                    documentId: candidate.documentId,
                    documentTitle: docTitleMap.get(candidate.documentId) || `Document ${candidate.documentId}`,
                    similarity: Math.round(adjustedScore * 100) / 100,
                    page: candidate.page,
                    snippet: `${candidate.snippet} (${candidate.reasons.join(', ')})`
                };
            })
            .filter(s => s.similarity >= 0.4) // Higher threshold for better accuracy
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 2); // Fewer but more accurate suggestions

        console.log(`✅ Found ${finalSuggestions.length} high-quality suggestions for ${missingDoc.documentName}`);
        finalSuggestions.forEach(s => 
            console.log(`  - ${s.documentTitle}: ${Math.round(s.similarity * 100)}% confidence`)
        );
        
        return finalSuggestions;
    } catch (error) {
        console.error("Error finding suggested company documents:", error);
        return [];
    }
}

async function validateContentMatch(
    missingDoc: MissingDocumentPrediction,
    match: DocumentMatch
): Promise<ValidationResult> {
    const content = match.content?.toLowerCase() || match.snippet.toLowerCase();
    const docName = missingDoc.documentName.toLowerCase();
    const docType = missingDoc.documentType.toLowerCase();
    
    const reasons: string[] = [];
    let confidence = match.similarity;
    
    if (content.includes(docName)) {
        confidence += 0.3;
        reasons.push(`Direct mention of "${missingDoc.documentName}"`);
    }
    
    if (hasReferencePattern(content, docName)) {
        confidence += 0.2;
        reasons.push(`Reference pattern found`);
    }
    
    if (content.includes(docType)) {
        confidence += 0.1;
        reasons.push(`Document type match`);
    }
    
    const isValid = reasons.length > 0 && confidence > 0.3;
    
    return {
        isValid,
        confidence: Math.min(confidence, 0.95),
        reasons
    };
}

async function findExactReferenceMatches(
    missingDoc: MissingDocumentPrediction,
    docIds: number[],
    docTitleMap: Map<number, string>
): Promise<MatchCandidate[]> {
    const matches: MatchCandidate[] = [];
    const searchTerms = [
        missingDoc.documentName.toLowerCase(),
        `"${missingDoc.documentName.toLowerCase()}"`,
                 `${missingDoc.documentType.toLowerCase()} ${missingDoc.documentName.split(' ').pop()?.toLowerCase() || ''}`
    ];

    for (const term of searchTerms) {
        if (term.length < 3) continue;

        const results = await db.select({
            id: pdfChunks.id,
            content: pdfChunks.content,
            page: pdfChunks.page,
            documentId: pdfChunks.documentId,
        }).from(pdfChunks).where(and(
            inArray(pdfChunks.documentId, docIds),
            sql`LOWER(${pdfChunks.content}) LIKE ${`%${term.replace(/"/g, '')}%`}`
        )).limit(3);

        for (const result of results) {
            const content = result.content.toLowerCase();
            const exactMatch = content.includes(missingDoc.documentName.toLowerCase());
            const hasQuotes = content.includes(`"${missingDoc.documentName.toLowerCase()}"`);
            
            if (exactMatch || hasQuotes) {
                const confidence = hasQuotes ? 0.95 : exactMatch ? 0.85 : 0.7;
                const snippet = truncateText(result.content, 120);
                
                matches.push({
                    documentId: result.documentId,
                    confidence,
                    page: result.page,
                    snippet,
                    reasons: [hasQuotes ? 'Exact quoted reference' : 'Exact name match'],
                    matchTypes: ['exact'],
                    finalScore: confidence
                });
            }
        }
    }

    return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 2);
}

async function findSmartTitleMatches(
    missingDoc: MissingDocumentPrediction,
    allDocs: CompanyDocument[]
): Promise<MatchCandidate[]> {
    const matches: MatchCandidate[] = [];
    const cleanDocName = cleanText(missingDoc.documentName);
    const cleanDocType = cleanText(missingDoc.documentType);
    
    // Extract key identifiers (letters/numbers after document type)
    const identifierMatch = missingDoc.documentName.match(/\b([a-z]\d*|\d+[a-z]*)\b/i);
    const identifier = identifierMatch ? identifierMatch[1]?.toLowerCase() : null;
    
    for (const doc of allDocs) {
        const cleanTitle = cleanText(doc.title);
        let confidence = 0;
        const reasons: string[] = [];
        
        // Perfect identifier match (e.g., "Exhibit A" matches "Contract Exhibit A")
        if (identifier && cleanTitle.includes(identifier) && cleanTitle.includes(cleanDocType)) {
            confidence = 0.92;
            reasons.push(`Perfect identifier match: "${identifier}" + type`);
        }
        // Exact document name in title
        else if (cleanTitle.includes(cleanDocName)) {
            confidence = 0.88;
            reasons.push(`Document name in title`);
        }
        // Document type + partial identifier
        else if (cleanTitle.includes(cleanDocType) && identifier && cleanTitle.includes(identifier)) {
            confidence = 0.75;
            reasons.push(`Type + identifier match`);
        }
        // Just document type (lower confidence)
        else if (cleanTitle.includes(cleanDocType)) {
            confidence = 0.45;
            reasons.push(`Document type match only`);
        }
        
        if (confidence > 0.4) {
            matches.push({
                documentId: doc.id,
                confidence,
                page: 1,
                snippet: `Title: "${doc.title}"`,
                reasons,
                matchTypes: ['title'],
                finalScore: confidence
            });
        }
    }
    
    return matches.sort((a, b) => b.confidence - a.confidence);
}

async function findContextualMatches(
    missingDoc: MissingDocumentPrediction,
    docIds: number[]
): Promise<DocumentMatch[]> {
    // Use more specific search queries that consider context
    const contextQueries = [
        `${missingDoc.documentType} containing ${missingDoc.documentName.split(' ').pop()}`,
        `document attachment ${missingDoc.documentName}`,
        `referenced ${missingDoc.documentName}`
    ];

    const allMatches: DocumentMatch[] = [];
    
    for (const query of contextQueries) {
        const queryEmbedding = await getEmbeddings(query);
        if (!queryEmbedding.length) continue;

        const distanceSql = sql`embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector`;
        const results = await db.select({
            id: pdfChunks.id,
            content: pdfChunks.content,
            page: pdfChunks.page,
            documentId: pdfChunks.documentId,
            distance: distanceSql
        }).from(pdfChunks).where(and(
            inArray(pdfChunks.documentId, docIds),
            sql`${distanceSql} < 0.3` // Stricter threshold
        )).orderBy(distanceSql).limit(5);

        for (const result of results) {
            const distance = Number(result.distance) || 1;
            const similarity = Math.max(0, (1 - distance) * 0.7); // Scale down
            
            allMatches.push({
                documentId: result.documentId,
                page: result.page,
                snippet: truncateText(result.content, 150),
                similarity,
                content: result.content
            });
        }
    }
    
    // Group by document and get best match per document
    const bestMatches = new Map<number, DocumentMatch>();
    
    for (const match of allMatches) {
        const existing = bestMatches.get(match.documentId);
        if (!existing || match.similarity > existing.similarity) {
            bestMatches.set(match.documentId, match);
        }
    }
    
    return Array.from(bestMatches.values());
}

async function validateContextualMatch(
    missingDoc: MissingDocumentPrediction,
    match: DocumentMatch
): Promise<ValidationResult & { snippet: string }> {
    const content = match.content?.toLowerCase() || match.snippet.toLowerCase();
    const docName = missingDoc.documentName.toLowerCase();
    const docType = missingDoc.documentType.toLowerCase();
    
    const reasons: string[] = [];
    let confidence = match.similarity;
    
    // Must have either the document name or strong contextual indicators
    const hasDocName = content.includes(docName);
    const hasDocType = content.includes(docType);
    const hasReferenceWords = /\b(exhibit|schedule|attachment|addendum|appendix|refer|see|per)\b/.test(content);
    
    if (hasDocName) {
        confidence += 0.25;
        reasons.push(`Contains document name`);
    }
    
    if (hasDocType && hasReferenceWords) {
        confidence += 0.15;
        reasons.push(`Document type with reference context`);
    }
    
    // Penalty for generic content
    if (content.length > 500 && !hasDocName) {
        confidence -= 0.1;
    }
    
    const isValid = (hasDocName || (hasDocType && hasReferenceWords)) && confidence > 0.4;
    
    return {
        isValid,
        confidence: Math.min(confidence, 0.85), // Cap contextual matches lower
        reasons,
        snippet: truncateText(match.snippet, 100)
    };
} 