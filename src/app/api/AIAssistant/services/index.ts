import type { CompanySearchResult } from './company-ensemble-search';
import type { DocumentSearchResult } from './document-ensemble-search';

export {
    companyEnsembleSearch,
    createCompanyEnsembleRetriever,
    type CompanyEnsembleOptions,
    type CompanySearchResult
} from './company-ensemble-search';

export {
    documentEnsembleSearch,
    createDocumentEnsembleRetriever,
    type DocumentEnsembleOptions,
    type DocumentSearchResult
} from './document-ensemble-search';

export {
    ensembleSearch,
    createEnsembleRetriever,
    type EnsembleOptions
} from './DEPRECATED_hybrid-bm25-ann';

export type SearchResult = CompanySearchResult | DocumentSearchResult;
