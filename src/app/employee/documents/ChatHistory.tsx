"use client";

import React from "react";
import { Clock, ChevronDown, ChevronUp } from "lucide-react";
import dayjs from "dayjs";


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
    documentTitle,
    onQuestionSelect,
    setPdfPageNumber,
}) => {

    console.log("history", history);
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
            <div className="text-gray-500 text-center py-4">
                No questions asked yet.
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-2">
            {history.map((item) => (
                <div
                    key={item.id}
                    className="bg-white rounded-lg shadow-sm p-4 border border-gray-200"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-grow">
                            <Clock className="w-5 h-5 text-gray-400 mt-1" />
                            <div className="flex-grow">
                                <button
                                    onClick={() => onQuestionSelect(item.question)}
                                    className="text-left font-medium text-purple-600 hover:text-purple-700"
                                >
                                    {item.question}
                                </button>
                                <div className="text-sm text-gray-500 mt-1">
                                    {dayjs(item.createdAt).format("M/D/YYYY, h:mm:ss A") ?? ""} • {item.documentTitle}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => toggleItem(item.id)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
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
                            <div className="text-gray-700 mb-2">{item.response}</div>
                            {item.pages.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-sm font-medium text-gray-600 mb-1">
                                        Reference Pages:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {item.pages.map((page) => (
                                            <button
                                                key={page}
                                                onClick={() => setPdfPageNumber(page)}
                                                className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded-md text-sm hover:bg-purple-200 transition-colors"
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
