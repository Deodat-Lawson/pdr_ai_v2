"use client";

import React from "react";
import { Brain, Clock, FileSearch, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
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

interface PredictiveAnalysisResponse {
    success: boolean;
    documentId: number;
    analysisType: string;
    summary: {
        totalMissingDocuments: number;
        totalReferences: number;
        highUrgencyItems: number;
        criticalIssues: number;
        completenessScore: number;
        analysisTimestamp: string;
    };
    analysis: {
        missingDocuments: Array<{
            documentName: string;
            documentType: string;
            reason: string;
            references: Array<{
                type: string;
                reference: string;
                context: string;
                page: number;
                confidence: number;
                urgency: string;
            }>;
            likelyLocation: string;
            alternatives: string[];
            businessImpact: string;
            confidence: number;
        }>;
        brokenReferences: Array<{
            reference: string;
            expectedDocument: string;
            context: string;
            page: number;
            severity: string;
        }>;
        documentGaps: Array<{
            category: string;
            description: string;
            suggestedDocuments: string[];
            businessJustification: string;
        }>;
        completenessScore: number;
        recommendations: Array<{
            priority: string;
            action: string;
            description: string;
            expectedDocuments: string[];
        }>;
    };
    metadata: {
        pagesAnalyzed: number;
        existingDocumentsChecked: number;
        existingDocuments: string[];
    };
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
    aiStyle: string;
    setAiStyle: React.Dispatch<React.SetStateAction<keyof typeof SYSTEM_PROMPTS>>;
    styleOptions: Record<string, string>;
    predictiveAnalysis: PredictiveAnalysisResponse | null;
    predictiveLoading: boolean;
    predictiveError: string;
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
}) => {
    // Helper to display PDF at a certain page
    const pdfSrcWithPage = (baseUrl: string, pageNumber: number) => {
        return `${baseUrl}#page=${pageNumber}`;
    };

    if (!selectedDoc) {
        return (
            <div className={styles.noDocSelected}>
                <h1 className={styles.noDocTitle}>Select a document to view</h1>
            </div>
        );
    }

    return (
        <>
            <div className={styles.docHeader}>
                <h1 className={styles.docTitle}>{selectedDoc.title}</h1>
            </div>

            {/* If "with-summary" mode is desired, you could handle it similarly to your old code */}

            {/* AI Q&A Mode */}
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
                            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                        >
                            {aiLoading ? "Asking AI..." : "Ask AI"}
                        </button>
                    </form>

                    {aiError && <p className="text-red-500 mt-2">{aiError}</p>}

                    {aiAnswer && (
                        <div className="bg-gray-100 rounded p-3 mt-2">
                            <p className="text-gray-700">{aiAnswer}</p>

                            {/* Reference Pages */}
                            {referencePages.length > 0 && (
                                <div className="mt-4">
                                    <p className="font-semibold text-gray-700 mb-2">
                                        Reference Pages:
                                    </p>
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

            {/* AI Q&A History Mode */}
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

            {/* Predictive Analysis Mode */}
            {viewMode === "predictive-analysis" && (
                <div className="mt-6">
                    <div className={styles.summaryHeader}>
                        <FileSearch className={styles.summaryIcon} />
                        <h2 className={styles.summaryTitle}>Predictive Document Analysis</h2>
                    </div>

                    {predictiveLoading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <span className="ml-3 text-gray-600">Analyzing document for missing references...</span>
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
                                        {predictiveAnalysis.summary.criticalIssues}
                                    </div>
                                    <div className="text-sm text-red-700">Critical Issues</div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-yellow-600">
                                        {predictiveAnalysis.summary.highUrgencyItems}
                                    </div>
                                    <div className="text-sm text-yellow-700">High Urgency</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">
                                        {Math.round(predictiveAnalysis.summary.completenessScore * 100)}%
                                    </div>
                                    <div className="text-sm text-green-700">Completeness</div>
                                </div>
                            </div>

                            {/* Missing Documents */}
                            {predictiveAnalysis.analysis.missingDocuments.length > 0 && (
                                <div className="bg-white border rounded-lg p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                                        <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                                        Missing Documents
                                    </h3>
                                    <div className="space-y-4">
                                        {predictiveAnalysis.analysis.missingDocuments.map((doc, index) => (
                                            <div key={index} className="border-l-4 border-orange-400 pl-4">
                                                <div className="font-medium text-gray-900">{doc.documentName}</div>
                                                <div className="text-sm text-gray-600 mt-1">{doc.reason}</div>
                                                <div className="text-xs text-gray-500 mt-2">
                                                    Confidence: {Math.round(doc.confidence * 100)}% |
                                                    Type: {doc.documentType}
                                                </div>
                                                {doc.references.length > 0 && (
                                                    <div className="mt-2">
                                                        <div className="text-xs font-medium text-gray-700">Referenced on pages:</div>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {doc.references.map((ref, refIndex) => (
                                                                <button
                                                                    key={refIndex}
                                                                    onClick={() => setPdfPageNumber(ref.page)}
                                                                    className={`px-2 py-1 rounded text-xs ${ref.urgency === 'high'
                                                                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                        }`}
                                                                >
                                                                    Page {ref.page}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Broken References */}
                            {predictiveAnalysis.analysis.brokenReferences.length > 0 && (
                                <div className="bg-white border rounded-lg p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                                        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                                        Broken References
                                    </h3>
                                    <div className="space-y-3">
                                        {predictiveAnalysis.analysis.brokenReferences.map((ref, index) => (
                                            <div key={index} className="border-l-4 border-red-400 pl-4">
                                                <div className="font-medium text-gray-900">{ref.reference}</div>
                                                <div className="text-sm text-gray-600">{ref.context}</div>
                                                <button
                                                    onClick={() => setPdfPageNumber(ref.page)}
                                                    className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded mt-1 hover:bg-red-200"
                                                >
                                                    Page {ref.page} - {ref.severity.toUpperCase()}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            {predictiveAnalysis.analysis.recommendations.length > 0 && (
                                <div className="bg-white border rounded-lg p-6">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                                        Recommendations
                                    </h3>
                                    <div className="space-y-3">
                                        {predictiveAnalysis.analysis.recommendations.map((rec, index) => (
                                            <div key={index} className="border-l-4 border-green-400 pl-4">
                                                <div className="font-medium text-gray-900">{rec.action}</div>
                                                <div className="text-sm text-gray-600">{rec.description}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Priority: {rec.priority.toUpperCase()}
                                                </div>
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
                    src={pdfSrcWithPage(selectedDoc.url, pdfPageNumber)}
                    className={styles.pdfViewer}
                    title={selectedDoc.title}
                />
            </div>
        </>
    );
};
