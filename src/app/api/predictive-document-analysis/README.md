# Predictive Document Analysis

A modular system for analyzing documents to identify missing references and suggest related company documents.

## Architecture

The module is structured into logical components for better maintainability:

```
predictive-document-analysis/
├── types.ts                    # TypeScript type definitions
├── utils/
│   ├── embeddings.ts          # Vector embedding operations
│   └── content.ts             # Text processing utilities
├── services/
│   ├── referenceExtractor.ts  # Extract document references
│   ├── documentMatcher.ts     # Find matching company documents
│   └── analysisEngine.ts      # Main analysis orchestration
├── agent.ts                   # Backward compatibility exports
├── route.ts                   # API endpoint
└── index.ts                   # Clean re-exports
```

## Core Components

### 1. Types (`types.ts`)
Centralized TypeScript definitions for all data structures used across the system.

### 2. Utilities (`utils/`)

#### Embeddings (`embeddings.ts`)
- **`getEmbeddings(text)`**: Get vector embeddings for text with caching
- **`batchGetEmbeddings(texts)`**: Batch process multiple texts efficiently
- **`clearEmbeddingCache()`**: Memory management

#### Content Processing (`content.ts`)
- **`groupContentFromChunks(chunks)`**: Format PDF chunks for analysis
- **`cleanText(text)`**: Normalize text for comparison
- **`hasReferencePattern(content, documentName)`**: Detect reference patterns
- **`hasSpecificIdentifier(documentName)`**: Validate document identifiers

### 3. Services (`services/`)

#### Reference Extractor (`referenceExtractor.ts`)
- **`extractReferences(chunks)`**: AI-powered extraction of document references
- **`deduplicateReferences(references)`**: Remove duplicate references

#### Document Matcher (`documentMatcher.ts`)
- **`findSuggestedCompanyDocuments()`**: Multi-strategy document matching:
  - Title-based matching (90% confidence for exact matches)
  - Content-based semantic search with validation
  - Keyword and pattern matching
- **Validation**: Ensures suggestions are relevant before returning

#### Analysis Engine (`analysisEngine.ts`)
- **`analyzeDocumentChunks()`**: Main orchestration function
- **`callAIAnalysis()`**: AI-powered missing document detection
- **`enhanceWithCompanyDocuments()`**: Add company document suggestions
- **`enhanceWithWebSearch()`**: Add external web search results

## Usage

### Basic Analysis
```typescript
import { analyzeDocumentChunks } from "./agent";

const result = await analyzeDocumentChunks(chunks, {
    type: "contract",
    includeRelatedDocs: true,
    companyId: 123,
    documentId: 456,
    title: "Service Agreement",
    category: "Contracts"
});
```

### Individual Components
```typescript
import { 
    extractReferences,
    findSuggestedCompanyDocuments,
    getEmbeddings 
} from "./index";

// Extract references
const references = await extractReferences(chunks);

// Find company document suggestions
const suggestions = await findSuggestedCompanyDocuments(
    missingDoc, companyId, currentDocId, titleMap
);

// Get embeddings
const embedding = await getEmbeddings("sample text");
```

## API Response Structure

```typescript
{
    success: boolean,
    documentId: number,
    analysisType: string,
    summary: {
        totalMissingDocuments: number,
        highPriorityItems: number,
        totalRecommendations: number,
        totalSuggestedRelated: number,
        analysisTimestamp: string
    },
    analysis: {
        missingDocuments: [{
            documentName: string,
            documentType: string,
            reason: string,
            page: number,
            priority: "high" | "medium" | "low",
            suggestedCompanyDocuments?: [{
                documentId: number,
                documentTitle: string,
                similarity: number,
                page: number,
                snippet: string
            }],
            suggestedLinks?: SearchResult[]
        }],
        recommendations: string[],
        suggestedRelatedDocuments?: SearchResult[],
        resolvedDocuments?: ResolvedReference[]
    }
}
```

## Features

### Smart Document Matching
- **Multi-Strategy Approach**: Combines title matching, content search, and keyword analysis
- **Validation Layer**: Ensures suggestions are actually relevant
- **Confidence Scoring**: Meaningful similarity percentages based on match quality
- **Detailed Explanations**: Each suggestion includes reasons why it was matched

### Performance Optimizations
- **Embedding Caching**: Avoids recomputing vectors for same text
- **Batch Processing**: Efficient parallel processing of document chunks
- **Database Optimization**: Targeted queries with appropriate thresholds

### Error Handling
- **Timeouts**: Configurable timeouts for AI operations
- **Graceful Degradation**: Continues processing even if some components fail
- **Comprehensive Logging**: Detailed console output for debugging

## Configuration

### Environment Variables
- `OPENAI_API_KEY`: Required for AI analysis and embeddings

### Adjustable Parameters
- **Batch Size**: Default 25 chunks per batch
- **Timeout**: Default 30 seconds for AI operations
- **Similarity Thresholds**: Configurable in each service
- **Search Limits**: Configurable result limits for searches

## Development

### Adding New Analysis Types
1. Add type to `ANALYSIS_TYPES` in `types.ts`
2. Add corresponding example in `analysisEngine.ts`
3. Update type definitions

### Extending Document Matching
1. Add new strategy function in `documentMatcher.ts`
2. Integrate into `findSuggestedCompanyDocuments()`
3. Update validation logic if needed

### Performance Monitoring
- Check embedding cache statistics: `getEmbeddingCacheStats()`
- Monitor console logs for timing information
- Database query performance through SQL logging 