"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import styles from "~/styles/Employer/DocumentViewer.module.css";

import LoadingDoc from "~/app/employer/documents/loading-doc";
import LoadingPage from "~/app/_components/loading";

import { fetchWithRetries } from "./fetchWithRetries";
import { DocumentsSidebar } from "./DocumentsSidebar";
import { DocumentContent } from "./DocumentContent";

import {ViewMode} from "~/app/employer/documents/types";

// Import the same QAHistoryEntry interface (or define it here if you like)
import { QAHistoryEntry } from "./ChatHistory";

 export const SYSTEM_PROMPTS = {
    concise: "Concise & Direct",
    detailed: "Detailed & Comprehensive", 
    academic: "Academic & Analytical",
    'bullet-points': "Organized Bullet Points"
} as const;

/** Some example or type definitions */
interface DocumentType {
    id: number;
    title: string;
    category: string;
    aiSummary?: string;
    url: string;
}

interface CategoryGroup {
    name: string;
    isOpen: boolean;
    documents: DocumentType[];
}


interface LangChainResponse {
    success: boolean;
    summarizedAnswer: string;
    recommendedPages: number[];
}

interface chatHistoryProp{
    id: string;
    question: string;
    response: string;
    createdAt: string;
    documentId: string;
    documentTitle: string;
    pages: number[];
}

interface fetchHistoryProp{
    status: string;
    chatHistory: chatHistoryProp[];
}



const DocumentViewer: React.FC = () => {
    const router = useRouter();
    const { isLoaded, userId } = useAuth();

    // State for documents
    const [documents, setDocuments] = useState<DocumentType[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);

    // Searching/filtering
    const [searchTerm, setSearchTerm] = useState("");

    // Loading states
    const [loading, setLoading] = useState(true);
    const [roleLoading, setRoleLoading] = useState(true); // for role-check

    // View mode state
    const [viewMode, setViewMode] = useState<ViewMode>("document-only");

    // AI Q&A states
    const [aiQuestion, setAiQuestion] = useState("");
    const [aiAnswer, setAiAnswer] = useState("");
    const [aiError, setAiError] = useState("");
    const [aiLoading, setAiLoading] = useState(false);
    const [referencePages, setReferencePages] = useState<number[]>([]);
    const [aiStyle, setAiStyle] = useState<keyof typeof SYSTEM_PROMPTS>("concise");

    // PDF page state
    const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);

    // Q&A History
    const [qaHistory, setQaHistory] = useState<QAHistoryEntry[]>([]);

    /**
     * Utility to push the Q&A into our local history state
     */

    const saveToDatabase = async (Entry: QAHistoryEntry) => {
        try {
            const response = await fetch("/api/Questions/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, documentId: Entry.documentId, documentTitle: Entry.documentTitle, question: Entry.question, response: Entry.response, pages: Entry.pages}),
            });

            if (!response.ok) {
                throw new Error("Failed to add Q&A to history");
            }

        } catch (error) {
            console.error("Error checking employee role:", error);
            window.alert("Authentication failed! You are not an employee.");
            router.push("/");
        } finally {
            setRoleLoading(false);
        }
    };

    const saveToHistory = async (question: string, response: string, pages: number[]) => {
        // Example logic - you can adapt this to your real data
        const newEntry: QAHistoryEntry = {
            id: crypto.randomUUID(), // or any unique ID generator
            question: question,
            response: response,
            documentId: selectedDoc!.id,
            createdAt: new Date().toLocaleString(),
            documentTitle: selectedDoc?.title ?? "",
            pages: pages,
        };

        await saveToDatabase(newEntry);
        setQaHistory((prev) => [...prev, newEntry]);
    };

    // 1. Check Clerk Auth & Role
    useEffect(() => {
        if (!isLoaded) return; // wait until Clerk is loaded

        if (!userId) {
            window.alert("Authentication failed! No user found.");
            router.push("/");
            return;
        }

        const checkEmployeeRole = async () => {
            try {
                const response = await fetch("/api/employerAuth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });

                if (response.status === 300) {
                    // Pending approval
                    router.push("/employee/pending-approval");
                    return;
                } else if (!response.ok) {
                    window.alert("Authentication failed! You are not an employee.");
                    router.push("/");
                    return;
                }
            } catch (error) {
                console.error("Error checking employee role:", error);
                window.alert("Authentication failed! You are not an employee.");
                router.push("/");
            } finally {
                setRoleLoading(false);
            }
        };

        checkEmployeeRole().catch(console.error);
    }, [isLoaded, userId, router]);

    // 2. Fetch documents for this user
    useEffect(() => {
        if (!userId) return;

        const fetchDocuments = async () => {
            try {
                const response = await fetch("/api/fetchDocument", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch documents");
                }

                const data: unknown = await response.json();

                if (!Array.isArray(data)) {
                    throw new Error("Invalid data format, expected an array.");
                }

                setDocuments(data);
            } catch (error) {
                console.error("Error fetching documents:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments().catch(console.error);
    }, [userId]);

    // 3. Build category groups from documents
    const categories: CategoryGroup[] = Object.values(
        documents.reduce((acc: Record<string, CategoryGroup>, doc) => {
            // Filter by searchTerm in "title" or "aiSummary"
            const inTitle = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
            const inSummary =
                doc.aiSummary?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;

            // If not found in either, skip
            if (!inTitle && !inSummary) return acc;

            if (!acc[doc.category]) {
                acc[doc.category] = {
                    name: doc.category,
                    isOpen: true, // or false if you want them closed by default
                    documents: [],
                };
            }
            acc[doc.category]!.documents.push(doc);
            return acc;
        }, {})
    );

    // 4. Handle AI Q&A
    const handleAiSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setAiError("");
        setAiAnswer("");
        setReferencePages([]);

        if (!aiQuestion.trim()) return; // skip if empty

        try {
            setAiLoading(true);

            // Use our fetchWithRetries
            const data = (await fetchWithRetries(
                "/api/LangChain",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        documentId: selectedDoc?.id,
                        question: aiQuestion,
                        style: aiStyle,
                    }),
                },
                5 // up to 5 retries if it times out
            )) as LangChainResponse;

            setAiAnswer(data.summarizedAnswer);

            if (Array.isArray(data.recommendedPages)) {
                const uniquePages = Array.from(new Set(data.recommendedPages));
                setReferencePages(uniquePages);

                // Save Q&A to history
                await saveToHistory(aiQuestion, data.summarizedAnswer, uniquePages);
            }
        } catch (err: unknown) {
            setAiError("Timeout or fetch error: Please try again later.");
        } finally {
            setAiLoading(false);
        }
    };



    // 5. Fetch Q&A History
    useEffect(() => {

        const fetchHistory = async () => {
            console.log("doc id", selectedDoc?.id)
            try {

                console.log("doc", selectedDoc)
                const response = await fetch("/api/Questions/fetch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, documentId: selectedDoc?.id }),
                });

                if (!response.ok) {
                    throw new Error("Failed to fetch Q&A history");
                }

                const data: unknown = await response.json();

                const processedData = data as fetchHistoryProp;

                console.log(processedData);

                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                setQaHistory(processedData.chatHistory);
            } catch (error) {
                console.error("Error fetching Q&A history:", error);
            }
        };

        fetchHistory().catch(console.error);
    }, [userId, selectedDoc]);




    // 5. Display loading states
    if (roleLoading) {
        return <LoadingPage />;
    }
    if (loading) {
        return <LoadingDoc />;
    }

    // 6. Render
    return (
        <div className={styles.container}>
            {/* Sidebar */}
            <DocumentsSidebar
                categories={categories}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedDoc={selectedDoc}
                setSelectedDoc={(doc) => {
                    setSelectedDoc(doc);
                    setPdfPageNumber(1);
                    setAiAnswer("");
                    setReferencePages([]);
                }}
                viewMode={viewMode}
                setViewMode={setViewMode}
            />

            {/* Main Content */}
            <main className={styles.mainContent}>
                <DocumentContent
                    selectedDoc={selectedDoc}
                    viewMode={viewMode}
                    aiQuestion={aiQuestion}
                    setAiQuestion={setAiQuestion}
                    aiAnswer={aiAnswer}
                    aiError={aiError}
                    aiLoading={aiLoading}
                    handleAiSearch={handleAiSearch}
                    referencePages={referencePages}
                    pdfPageNumber={pdfPageNumber}
                    setPdfPageNumber={setPdfPageNumber}
                    qaHistory={qaHistory} // Pass the Q&A history here!
                    aiStyle={aiStyle}
                    setAiStyle={setAiStyle}
                    styleOptions={SYSTEM_PROMPTS}
                />
            </main>
        </div>
    );
};

export default DocumentViewer;
