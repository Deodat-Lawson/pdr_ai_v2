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

import { ViewMode } from "~/app/employer/documents/types";

// Import the same QAHistoryEntry interface (or define it here if you like)
import { QAHistoryEntry } from "./ChatHistory";

export const SYSTEM_PROMPTS = {
  concise: "Concise & Direct",
  detailed: "Detailed & Comprehensive",
  academic: "Academic & Analytical",
  "bullet-points": "Organized Bullet Points",
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

interface FetchHistoryProp {
  status: string;
  chatHistory: QAHistoryEntry[];
}

// Updated interface to match backend response structure from previous context
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

const DocumentViewer: React.FC = () => {
  const router = useRouter();
  const { isLoaded, userId } = useAuth();

  // State for documents and selection
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);

  // Searching/filtering
  const [searchTerm, setSearchTerm] = useState("");

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>("document-only");

  // AI Q&A states
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [referencePages, setReferencePages] = useState<number[]>([]);
  const [aiStyle, setAiStyle] = useState<keyof typeof SYSTEM_PROMPTS>("concise");

  // PDF page state
  const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);

  // Q&A History
  const [qaHistory, setQaHistory] = useState<QAHistoryEntry[]>([]);

  // Predictive Analysis state
  const [predictiveAnalysis, setPredictiveAnalysis] = useState<PredictiveAnalysisResponse | null>(null);
  const [isPredictiveLoading, setIsPredictiveLoading] = useState(false);
  const [predictiveError, setPredictiveError] = useState("");

  // Utility to save Q&A to database
  const saveToDatabase = async (entry: QAHistoryEntry) => {
    try {
      const response = await fetch("/api/Questions/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          documentId: entry.documentId,
          documentTitle: entry.documentTitle,
          question: entry.question,
          response: entry.response,
          pages: entry.pages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add Q&A to history");
      }
    } catch (error) {
      console.error("Error saving Q&A to database:", error);
    }
  };

  // Utility to save Q&A to local history and database
  const saveToHistory = async (question: string, response: string, pages: number[]) => {
    if (!selectedDoc) return;

    const newEntry: QAHistoryEntry = {
      id: crypto.randomUUID(),
      question,
      response,
      documentId: selectedDoc.id,
      createdAt: new Date().toLocaleString(),
      documentTitle: selectedDoc.title,
      pages,
    };

    await saveToDatabase(newEntry);
    setQaHistory((prev) => [...prev, newEntry]);
  };

  // Effect: Check authentication and role
  useEffect(() => {
    if (!isLoaded) return;

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
          router.push("/employee/pending-approval");
          return;
        }

        if (!response.ok) {
          throw new Error("Authentication failed");
        }
      } catch (error) {
        console.error("Error checking employee role:", error);
        window.alert("Authentication failed! You are not an employee.");
        router.push("/");
      } finally {
        setIsRoleLoading(false);
      }
    };

    checkEmployeeRole();
  }, [isLoaded, userId, router]);

  // Effect: Fetch documents
  useEffect(() => {
    if (!userId || isRoleLoading) return;

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

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid data format, expected an array.");
        }

        setDocuments(data);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocuments();
  }, [userId, isRoleLoading]);

  // Effect: Fetch Q&A history when document changes
  useEffect(() => {
    if (!userId || !selectedDoc?.id) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/Questions/fetch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, documentId: selectedDoc.id }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch Q&A history");
        }

        const { chatHistory } = await response.json() as FetchHistoryProp;
        setQaHistory(chatHistory);
      } catch (error) {
        console.error("Error fetching Q&A history:", error);
      }
    };

    fetchHistory();
  }, [userId, selectedDoc]);

  // Effect: Fetch predictive analysis when mode is active
  useEffect(() => {
    if (viewMode !== "predictive-analysis" || !selectedDoc?.id) return;

    fetchPredictiveAnalysis(selectedDoc.id, false);
  }, [viewMode, selectedDoc]);

  // Handler: AI search
  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !selectedDoc) return;

    setAiError("");
    setAiAnswer("");
    setReferencePages([]);
    setIsAiLoading(true);

    try {
      const data = (await fetchWithRetries(
        "/api/LangChain",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId: selectedDoc.id,
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
        await saveToHistory(aiQuestion, data.summarizedAnswer, uniquePages);
      }
    } catch (error) {
      setAiError("Timeout or fetch error: Please try again later.");
    } finally {
      setIsAiLoading(false);
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

      setPredictiveAnalysis(data);
    } catch (error) {
      console.error("Error fetching predictive analysis:", error);
      setPredictiveError("Failed to perform predictive analysis. Please try again.");
    } finally {
      setIsPredictiveLoading(false);
    }
  };

  // Build category groups with search filtering
  const categories: CategoryGroup[] = Object.values(
    documents.reduce((acc: Record<string, CategoryGroup>, doc) => {
      const lowerSearch = searchTerm.toLowerCase();
      const inTitle = doc.title.toLowerCase().includes(lowerSearch);
      const inSummary = doc.aiSummary?.toLowerCase().includes(lowerSearch) ?? false;

      if (!inTitle && !inSummary) return acc;

      if (!acc[doc.category]) {
        acc[doc.category] = {
          name: doc.category,
          isOpen: true,
          documents: [],
        };
      }
      acc[doc.category]!.documents.push(doc);
      return acc;
    }, {})
  );

  // Loading states
  if (isRoleLoading) return <LoadingPage />;
  if (isLoading) return <LoadingDoc />;

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
          aiLoading={isAiLoading}
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
        />
      </main>
    </div>
  );
};

export default DocumentViewer;