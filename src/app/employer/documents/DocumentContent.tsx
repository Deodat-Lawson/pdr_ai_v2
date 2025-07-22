"use client";

import React, { useState } from "react";
import { Brain, Clock, FileSearch, AlertTriangle, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import styles from "~/styles/Employer/DocumentViewer.module.css";
import { ViewMode } from "./types";
import { SYSTEM_PROMPTS } from "./page";

// Import the QAHistory component AND the QAHistoryEntry interface
import QAHistory, { QAHistoryEntry } from "./ChatHistory";

interface DocumentType {
  id: number;
  title: string;
  category: string;
  aiSummary?: string;
  url: string;
}

// Updated to match backend response
interface PredictiveAnalysisResponse {
  success: boolean;
  documentId: number;
  analysisType: string;
  summary: {
    totalMissingDocuments: number;
    highPriorityItems: number;
    totalRecommendations: number;
    totalSuggestedRelated: number;
    analysisTimestamp: string;
  };
  analysis: {
    missingDocuments: Array<{
      documentName: string;
      documentType: string;
      reason: string;
      page: number;
      priority: "high" | "medium" | "low";
      suggestedLinks?: Array<{
        title: string;
        link: string;
        snippet: string;
      }>;
    }>;
    recommendations: string[];
    suggestedRelatedDocuments?: Array<{
      title: string;
      link: string;
      snippet: string;
    }>;
  };
  metadata: {
    pagesAnalyzed: number;
    existingDocumentsChecked: number;
  };
  fromCache?: boolean;
}

interface DocumentContentProps {
  selectedDoc: DocumentType | null;
  viewMode: ViewMode;
  aiQuestion: string;
  setAiQuestion: React.Dispatch<React.SetStateAction<string>>;
  aiAnswer: string;
  aiError: string;
  aiLoading: boolean;
  handleAiSearch: (e: React.FormEvent) => void;
  referencePages: number[];
  pdfPageNumber: number;
  setPdfPageNumber: React.Dispatch<React.SetStateAction<number>>;
  qaHistory: QAHistoryEntry[]; // <-- Provide the Q&A history
  aiStyle: keyof typeof SYSTEM_PROMPTS;
  setAiStyle: React.Dispatch<React.SetStateAction<keyof typeof SYSTEM_PROMPTS>>;
  styleOptions: typeof SYSTEM_PROMPTS;
  predictiveAnalysis: PredictiveAnalysisResponse | null;
  predictiveLoading: boolean;
  predictiveError: string;
  onRefreshAnalysis: () => void; // New: Callback to refresh analysis
}

export const DocumentContent: React.FC<DocumentContentProps> = ({
  selectedDoc,
  viewMode,
  aiQuestion,
  setAiQuestion,
  aiAnswer,
  aiError,
  aiLoading,
  handleAiSearch,
  referencePages,
  pdfPageNumber,
  setPdfPageNumber,
  qaHistory,
  aiStyle,
  setAiStyle,
  styleOptions,
  predictiveAnalysis,
  predictiveLoading,
  predictiveError,
  onRefreshAnalysis,
}) => {
  // States for expandable sections
  const [isMissingExpanded, setIsMissingExpanded] = useState(false);
  const [isRecommendationsExpanded, setIsRecommendationsExpanded] = useState(false);

  if (!selectedDoc) {
    return (
      <div className={styles.noDocSelected}>
        <h1 className={styles.noDocTitle}>Select a document to view</h1>
      </div>
    );
  }

  // Helper to get PDF URL with page
  const getPdfSrcWithPage = (url: string, page: number) => `${url}#page=${page}`;

  return (
    <>
      <div className={styles.docHeader}>
        <h1 className={styles.docTitle}>{selectedDoc.title}</h1>
      </div>

      {/* AI Q&A Section */}
      {viewMode === "with-ai-qa" && (
        <div className={styles.summaryContainer}>
          <div className={styles.summaryHeader}>
            <Brain className={styles.summaryIcon} />
            <h2 className={styles.summaryTitle}>AI Q&A</h2>
          </div>

          <form onSubmit={handleAiSearch} className="flex flex-col space-y-3">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Response Style:</label>
              <select
                value={aiStyle}
                onChange={(e) => setAiStyle(e.target.value as keyof typeof SYSTEM_PROMPTS)}
                className="border border-gray-300 rounded p-2 w-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                {Object.entries(styleOptions).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Ask a question about your documents..."
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              className="border border-gray-300 rounded p-2 w-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50"
            >
              {aiLoading ? "Asking AI..." : "Ask AI"}
            </button>
          </form>

          {aiError && <p className="text-red-500 mt-2">{aiError}</p>}

          {aiAnswer && (
            <div className="bg-gray-100 rounded p-3 mt-2">
              <p className="text-gray-700 whitespace-pre-wrap">{aiAnswer}</p>

              {referencePages.length > 0 && (
                <div className="mt-4">
                  <p className="font-semibold text-gray-700 mb-2">Reference Pages:</p>
                  <div className="flex flex-wrap gap-2">
                    {referencePages.map((page) => (
                      <button
                        key={page}
                        onClick={() => setPdfPageNumber(page)}
                        className="inline-block bg-purple-100 text-purple-700 px-3 py-1 rounded-md hover:bg-purple-200 transition-colors"
                      >
                        Page {page}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Q&A History Section */}
      {viewMode === "with-ai-qa-history" && (
        <div className="mt-6">
          <div className={styles.summaryHeader}>
            <Clock className={styles.summaryIcon} />
            <h2 className={styles.summaryTitle}>Question History</h2>
          </div>

          <QAHistory
            history={qaHistory}
            onQuestionSelect={(question) => setAiQuestion(question)}
            selectedDoc={selectedDoc}
            setPdfPageNumber={setPdfPageNumber}
            documentTitle={selectedDoc.title}
          />
        </div>
      )}

      {/* Predictive Analysis Section */}
      {viewMode === "predictive-analysis" && (
        <div className="mt-6">
          <div className={styles.summaryHeader}>
            <FileSearch className={styles.summaryIcon} />
            <h2 className={styles.summaryTitle}>Predictive Document Analysis</h2>
            <button
              onClick={onRefreshAnalysis}
              disabled={predictiveLoading}
              className="ml-auto bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              title="Refresh Analysis"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </button>
          </div>

          {predictiveLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600">Analyzing document...</span>
            </div>
          )}

          {predictiveError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-700">{predictiveError}</span>
              </div>
            </div>
          )}

          {predictiveAnalysis && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {predictiveAnalysis.summary.totalMissingDocuments}
                  </div>
                  <div className="text-sm text-blue-700">Missing Documents</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {predictiveAnalysis.summary.highPriorityItems}
                  </div>
                  <div className="text-sm text-red-700">High Priority</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {predictiveAnalysis.summary.totalRecommendations}
                  </div>
                  <div className="text-sm text-yellow-700">Recommendations</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {predictiveAnalysis.summary.totalSuggestedRelated}
                  </div>
                  <div className="text-sm text-green-700">Suggested Related</div>
                </div>
              </div>

              {/* Missing Documents - Expandable Section */}
              {predictiveAnalysis.analysis.missingDocuments.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                    Missing Documents
                  </h3>
                  <div className="space-y-4">
                    {/* Always show first item */}
                    {predictiveAnalysis.analysis.missingDocuments.slice(0, 1).map((doc, index) => (
                      <div key={index} className="border-l-4 border-orange-400 pl-4">
                        <div className="font-medium text-gray-900">{doc.documentName}</div>
                        <div className="text-sm text-gray-600 mt-1">{doc.reason}</div>
                        <div className="text-xs text-gray-500 mt-2">
                          Type: {doc.documentType} | Priority: {doc.priority}
                        </div>
                        <button
                          onClick={() => setPdfPageNumber(doc.page)}
                          className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded mt-1 hover:bg-orange-200"
                        >
                          Page {doc.page}
                        </button>
                        {doc.suggestedLinks && doc.suggestedLinks.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-gray-700">Suggested Links:</div>
                            <ul className="list-disc pl-4 mt-1 text-xs text-blue-600">
                              {doc.suggestedLinks.map((link, linkIndex) => (
                                <li key={linkIndex}>
                                  <a href={link.link} target="_blank" rel="noopener noreferrer">
                                    {link.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* If more than 1, show expand button */}
                    {predictiveAnalysis.analysis.missingDocuments.length > 1 && !isMissingExpanded && (
                      <button
                        onClick={() => setIsMissingExpanded(true)}
                        className="text-blue-600 hover:underline mt-2"
                      >
                        Show More ({predictiveAnalysis.analysis.missingDocuments.length - 1} remaining)
                      </button>
                    )}
                    {/* Expanded items */}
                    {isMissingExpanded && (
                      <>
                        {predictiveAnalysis.analysis.missingDocuments.slice(1).map((doc, index) => (
                          <div key={index + 1} className="border-l-4 border-orange-400 pl-4">
                            <div className="font-medium text-gray-900">{doc.documentName}</div>
                            <div className="text-sm text-gray-600 mt-1">{doc.reason}</div>
                            <div className="text-xs text-gray-500 mt-2">
                              Type: {doc.documentType} | Priority: {doc.priority}
                            </div>
                            <button
                              onClick={() => setPdfPageNumber(doc.page)}
                              className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded mt-1 hover:bg-orange-200"
                            >
                              Page {doc.page}
                            </button>
                            {doc.suggestedLinks && doc.suggestedLinks.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs font-medium text-gray-700">Suggested Links:</div>
                                <ul className="list-disc pl-4 mt-1 text-xs text-blue-600">
                                  {doc.suggestedLinks.map((link, linkIndex) => (
                                    <li key={linkIndex}>
                                      <a href={link.link} target="_blank" rel="noopener noreferrer">
                                        {link.title}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => setIsMissingExpanded(false)}
                          className="text-blue-600 hover:underline mt-2"
                        >
                          Show Less
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations - Expandable Section */}
              {predictiveAnalysis.analysis.recommendations.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    Recommendations
                  </h3>
                  <div className="space-y-3">
                    {/* Always show first item */}
                    {predictiveAnalysis.analysis.recommendations.slice(0, 1).map((rec, index) => (
                      <div key={index} className="border-l-4 border-green-400 pl-4">
                        <div className="text-sm text-gray-600">{rec}</div>
                      </div>
                    ))}
                    {/* If more than 1, show expand button */}
                    {predictiveAnalysis.analysis.recommendations.length > 1 && !isRecommendationsExpanded && (
                      <button
                        onClick={() => setIsRecommendationsExpanded(true)}
                        className="text-blue-600 hover:underline mt-2"
                      >
                        Show More ({predictiveAnalysis.analysis.recommendations.length - 1} remaining)
                      </button>
                    )}
                    {/* Expanded items */}
                    {isRecommendationsExpanded && (
                      <>
                        {predictiveAnalysis.analysis.recommendations.slice(1).map((rec, index) => (
                          <div key={index + 1} className="border-l-4 border-green-400 pl-4">
                            <div className="text-sm text-gray-600">{rec}</div>
                          </div>
                        ))}
                        <button
                          onClick={() => setIsRecommendationsExpanded(false)}
                          className="text-blue-600 hover:underline mt-2"
                        >
                          Show Less
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Suggested Related Documents */}
              {predictiveAnalysis.analysis.suggestedRelatedDocuments && predictiveAnalysis.analysis.suggestedRelatedDocuments.length > 0 && (
                <div className="bg-white border rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <FileSearch className="w-5 h-5 text-blue-500 mr-2" />
                    Suggested Related Documents
                  </h3>
                  <div className="space-y-3">
                    {predictiveAnalysis.analysis.suggestedRelatedDocuments.map((doc, index) => (
                      <div key={index} className="border-l-4 border-blue-400 pl-4">
                        <a
                          href={doc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {doc.title}
                        </a>
                        <div className="text-sm text-gray-600">{doc.snippet}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF Viewer */}
      <div className={styles.pdfContainer}>
        <iframe
          key={pdfPageNumber}
          src={getPdfSrcWithPage(selectedDoc.url, pdfPageNumber)}
          className={styles.pdfViewer}
          title={selectedDoc.title}
        />
      </div>
    </>
  );
};