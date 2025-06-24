"use client";

import React from "react";
import { Brain, Clock } from "lucide-react";
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
