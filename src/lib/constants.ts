/**
 * Common constants used across the PDR AI application
 */

// Analysis Types
export const ANALYSIS_TYPES = [
  'contract',
  'financial',
  'technical',
  'compliance',
  'general'
] as const;

export type AnalysisType = typeof ANALYSIS_TYPES[number];

// Timeout Limits
export const TIMEOUT_LIMITS = {
  MIN_MS: 5000,  // 5 seconds
  MAX_MS: 120000, // 2 minutes
  DEFAULT_MS: 30000 // 30 seconds
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  TTL_HOURS: 24,
  MAX_ENTRIES: 1000
} as const;

// Document Processing
export const DOCUMENT_LIMITS = {
  MAX_FILE_SIZE_MB: 50,
  MAX_PAGES: 1000,
  SUPPORTED_FORMATS: ['pdf', 'docx', 'doc', 'txt'] as const
} as const;

// Priority Levels
export const PRIORITY_LEVELS = [
  'immediate',
  'high',
  'medium',
  'low'
] as const;

export type PriorityLevel = typeof PRIORITY_LEVELS[number];

// Urgency Levels
export const URGENCY_LEVELS = [
  'critical',
  'high',
  'medium',
  'low'
] as const;

export type UrgencyLevel = typeof URGENCY_LEVELS[number];

// Error Types
export const ERROR_TYPES = {
  VALIDATION: 'validation',
  TIMEOUT: 'timeout',
  DATABASE: 'database',
  EXTERNAL_SERVICE: 'external_service',
  AI_SERVICE: 'ai_service',
  UNKNOWN: 'unknown'
} as const;

export type ErrorType = typeof ERROR_TYPES[keyof typeof ERROR_TYPES];

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  TIMEOUT: 408,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503
} as const;

// Default Messages
export const DEFAULT_MESSAGES = {
  LOADING: "Please wait while we set up your workspace",
  ERROR_GENERIC: "An unexpected error occurred. Please try again.",
  SUCCESS_ANALYSIS: "Document analysis completed successfully",
  NO_DOCUMENTS: "No documents found",
  INVALID_REQUEST: "Invalid request data provided"
} as const;