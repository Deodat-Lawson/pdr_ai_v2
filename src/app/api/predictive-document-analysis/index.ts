// Main exports for predictive document analysis
export { analyzeDocumentChunks } from "./services/analysisEngine";
export { extractReferences } from "./services/referenceExtractor";
export { findSuggestedCompanyDocuments } from "./services/documentMatcher";
export { getEmbeddings, batchGetEmbeddings } from "./utils/embeddings";
export { groupContentFromChunks, cleanText, hasSpecificIdentifier } from "./utils/content";

// Type exports
export type {
    PdfChunk,
    AnalysisSpecification,
    PredictiveAnalysisResult,
    MissingDocumentPrediction,
    ResolvedReference,
    SearchResult,
    DocumentReference,
    CompanyDocument,
    DocumentMatch,
    ValidationResult
} from "./types";

export { ANALYSIS_TYPES } from "./types"; 