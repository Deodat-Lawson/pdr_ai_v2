// DocumentViewer/index.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import styles from "../../../styles/Employee/DocumentViewer.module.css";

import LoadingDoc from "~/app/employee/documents/loading-doc";
import LoadingPage from "~/app/_components/loading";

import { fetchWithRetries } from "./fetchWithRetries";
import { DocumentsSidebar } from "./DocumentsSidebar";
import { DocumentContent } from "./DocumentContent";
import { QAHistoryEntry } from "~/app/employer/documents/ChatHistory";
import { ViewMode } from "~/app/employee/documents/types";

const SYSTEM_PROMPTS = {
    concise: "Concise & Direct",
    detailed: "Detailed & Comprehensive",
    academic: "Academic & Analytical",
    'bullet-points': "Organized Bullet Points"
} as const;

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

interface chatHistoryProp {
    id: string;
    question: string;
    response: string;
    createdAt: string;
    documentId: string;
    documentTitle: string;
    pages: number[];
}

interface fetchHistoryProp {
    status: string;
    chatHistory: chatHistoryProp[];
}

// Updated interface to match backend response structure
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
      suggestedCompanyDocuments?: Array<{
        documentId: number;
        documentTitle: string;
        similarity: number;
        page: number;
        snippet: string;
      }>;
      resolvedIn?: {
        documentId: number;
        page: number;
        documentTitle?: string;
      };
    }>;
    recommendations: string[];
    suggestedRelatedDocuments?: Array<{
      title: string;
      link: string;
      snippet: string;
    }>;
    resolvedDocuments?: Array<{
      documentName: string;
      documentType: string;
      reason: string;
      originalPage: number;
      resolvedDocumentId: number;
      resolvedPage: number;
      resolvedDocumentTitle?: string;
      priority: "high" | "medium" | "low";
    }>;
  };
  metadata: {
    pagesAnalyzed: number;
    existingDocumentsChecked: number;
  };
  fromCache?: boolean;
}


const DocumentViewer: React.FC = () => {
    const router = useRouter();
    const { isLoaded, userId } = useAuth();

    // State for documents
    const [documents, setDocuments] = useState<DocumentType[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);

    // Searching/filtering
    const [searchTerm, setSearchTerm] = useState("");

    // Category open/closed state
    const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

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

    // PDF page states
    const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);

    // Q&A History
    const [qaHistory, setQaHistory] = useState<QAHistoryEntry[]>([]);

    // Predictive Analysis state
    const [predictiveAnalysis, setPredictiveAnalysis] = useState<PredictiveAnalysisResponse | null>(null);
    const [isPredictiveLoading, setIsPredictiveLoading] = useState(false);
    const [predictiveError, setPredictiveError] = useState("");


    const saveToDatabase = async (Entry: QAHistoryEntry) => {
        try {
            const response = await fetch("/api/Questions/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, documentId: Entry.documentId, documentTitle: Entry.documentTitle, question: Entry.question, response: Entry.response, pages: Entry.pages }),
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
                const response = await fetch("/api/employeeAuth", {
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

    // 2. Fetch documents for this employee
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

    // Toggle category open/closed state
    const toggleCategory = (categoryName: string) => {
        setOpenCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryName)) {
                newSet.delete(categoryName);
            } else {
                newSet.add(categoryName);
            }
            return newSet;
        });
    };

    // 3. Build category groups
    const categories: CategoryGroup[] = Object.values(
        documents.reduce((acc: Record<string, CategoryGroup>, doc) => {
            // Filter by searchTerm in either "title" or "aiSummary"
            const inTitle = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
            const inSummary =
                doc.aiSummary?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false;

            if (!inTitle && !inSummary) return acc;

            if (!acc[doc.category]) {
                acc[doc.category] = {
                    name: doc.category,
                    isOpen: openCategories.has(doc.category),
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

        if (!aiQuestion.trim()) return; // skip if empty question

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
                5
            )) as LangChainResponse;

            setAiAnswer(data.summarizedAnswer);

            if (Array.isArray(data.recommendedPages)) {
                const uniquePages = Array.from(new Set(data.recommendedPages));
                setReferencePages(uniquePages);

                // Save Q&A to history
                await saveToHistory(aiQuestion, data.summarizedAnswer, uniquePages);
            }

        } catch (err: unknown) {
            // If all retries fail or a non-timeout error:
            setAiError("Timeout error: Please try again later.");
        } finally {
            setAiLoading(false);
        }
    };

    // Handler: Fetch predictive analysis (with optional forceRefresh)
    const fetchPredictiveAnalysis = async (documentId: number, forceRefresh: boolean = false) => {
        setPredictiveError("");
        setPredictiveAnalysis(null);
        setIsPredictiveLoading(true);

        try {
            const response = await fetch("/api/predictive-document-analysis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    documentId,
                    analysisType: "general",
                    includeRelatedDocs: true,
                    forceRefresh,
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as PredictiveAnalysisResponse;
            if (!data.success) {
                throw new Error("Analysis failed on server side");
            }

            // Enrich with document titles if not provided (lookup from documents)
            if (data.analysis.resolvedDocuments) {
                data.analysis.resolvedDocuments = data.analysis.resolvedDocuments.map(res => ({
                    ...res,
                    resolvedDocumentTitle: res.resolvedDocumentTitle || documents.find(d => d.id === res.resolvedDocumentId)?.title || `Document ${res.resolvedDocumentId}`
                }));
            }
            if (data.analysis.missingDocuments.some(md => md.resolvedIn)) {
                data.analysis.missingDocuments = data.analysis.missingDocuments.map(md => {
                    if (md.resolvedIn) {
                        md.resolvedIn.documentTitle = md.resolvedIn.documentTitle || documents.find(d => d.id === md.resolvedIn!.documentId)?.title || `Document ${md.resolvedIn.documentId}`;
                    }
                    return md;
                });
            }

            setPredictiveAnalysis(data);
        } catch (error) {
            console.error("Error fetching predictive analysis:", error);
            setPredictiveError("Failed to perform predictive analysis. Please try again.");
        } finally {
            setIsPredictiveLoading(false);
        }
    };

    // Handler: Select document and set page
    const handleSelectDocument = (docId: number, page: number) => {
        const targetDoc = documents.find(d => d.id === docId);
        if (targetDoc) {
            setSelectedDoc(targetDoc);
            setPdfPageNumber(page);
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

    // Effect: Fetch predictive analysis when mode is active
    useEffect(() => {
        if (viewMode !== "predictive-analysis" || !selectedDoc?.id) return;

        fetchPredictiveAnalysis(selectedDoc.id, false);
    }, [viewMode, selectedDoc]);

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
                    // Whenever we pick a doc, reset some states
                    setSelectedDoc(doc);
                    setPdfPageNumber(1);
                    setAiAnswer("");
                    setReferencePages([]);
                }}
                viewMode={viewMode}
                setViewMode={setViewMode}
                toggleCategory={toggleCategory}
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
                    qaHistory={qaHistory}
                    aiStyle={aiStyle}
                    setAiStyle={setAiStyle}
                    styleOptions={SYSTEM_PROMPTS}
                    predictiveAnalysis={predictiveAnalysis}
                    predictiveLoading={isPredictiveLoading}
                    predictiveError={predictiveError}
                    onRefreshAnalysis={() => selectedDoc && fetchPredictiveAnalysis(selectedDoc.id, true)}
                    onSelectDocument={handleSelectDocument}
                />
            </main>
        </div>
    );
};

export default DocumentViewer;
