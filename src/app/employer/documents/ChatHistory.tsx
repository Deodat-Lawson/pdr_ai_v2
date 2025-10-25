"use client";

import React from "react";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import dayjs from "dayjs";

/**
 * Shared interface for QA history entries.
 */
export interface QAHistoryEntry {
    id: string;
    question: string;
    response: string;
    createdAt: string;
    documentTitle: string;
    documentId: number;
    pages: number[];
}

interface QAHistoryProps {
    history: QAHistoryEntry[];
    onQuestionSelect: (question: string) => void;
    documentTitle: string;
    selectedDoc: { title: string } | null;
    setPdfPageNumber: (page: number) => void;
}

const QAHistory: React.FC<QAHistoryProps> = ({
    history,
    onQuestionSelect,
    setPdfPageNumber,
}) => {
    const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set());
    
    const toggleItem = (id: string) => {
        setExpandedItems((prev) => {
            const copy = new Set(prev);
            if (copy.has(id)) {
                copy.delete(id);
            } else {
                copy.add(id);
            }
            return copy;
        });
    };



    if (history.length === 0) {
        return (
            <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                No questions asked yet.
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-2">
            {history.map((item) => (
                <div
                    key={item.id}
                    className="bg-white dark:bg-slate-800/90 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-purple-500/30"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-grow">
                            <Clock className="w-5 h-5 text-gray-400 dark:text-purple-400 mt-1" />
                            <div className="flex-grow">
                                <button
                                    onClick={() => onQuestionSelect(item.question)}
                                    className="text-left font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                                >
                                    {item.question}
                                </button>
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {dayjs(item.createdAt).format("M/D/YYYY, h:mm:ss A") ?? ""} • {item.documentTitle}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleItem(item.id)}
                            className="ml-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            {expandedItems.has(item.id) ? (
                                <ChevronUp className="w-5 h-5" />
                            ) : (
                                <ChevronDown className="w-5 h-5" />
                            )}
                        </button>
                    </div>

                    {expandedItems.has(item.id) && (
                        <div className="mt-3 pl-8">
                            <div className="text-gray-700 dark:text-gray-300 mb-2">{item.response}</div>
                            {item.pages.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                        Reference Pages:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {item.pages.map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => setPdfPageNumber(page)}
                                                className="inline-block bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-md text-sm hover:bg-purple-200 dark:hover:bg-purple-900/70 transition-colors"
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
            ))}
        </div>
    );
};

export default QAHistory;
