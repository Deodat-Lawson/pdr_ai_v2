"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import styles from "~/styles/Employer/DocumentViewer.module.css";
import LoadingPage from "~/app/_components/loading";
import { fetchWithRetries } from "./fetchWithRetries";
import { DocumentsSidebar } from "./DocumentsSidebar";
import { DocumentContent } from "./DocumentContent";
import { type ViewMode, type errorType } from "~/app/employer/documents/types";
import { type QAHistoryEntry } from "./ChatHistory";

const SYSTEM_PROMPTS = {
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
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("document-only");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiError, setAiError] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [referencePages, setReferencePages] = useState<number[]>([]);
  const [aiStyle, setAiStyle] = useState<string>("concise");
  const [pdfPageNumber, setPdfPageNumber] = useState<number>(1);
  const [qaHistory, setQaHistory] = useState<QAHistoryEntry[]>([]);
  const [predictiveAnalysis, setPredictiveAnalysis] = useState<PredictiveAnalysisResponse | null>(null);
  const [isPredictiveLoading, setIsPredictiveLoading] = useState(false);
  const [predictiveError, setPredictiveError] = useState("");

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

  const fetchDocuments = useCallback(async () => {
    try {
      const response = await fetch("/api/fetchDocument", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      const rawData: unknown = await response.json();
      if (!Array.isArray(rawData)) {
        throw new Error("Invalid data format, expected an array.");
      }

      const data = rawData as DocumentType[];
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    const checkEmployeeRole = async () => {
      try {
        const response = await fetch("/api/fetchUserInfo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          window.alert("Authentication failed! No user found.");
          router.push("/");
          return;
        }

        const rawData: unknown = await response.json();
        const data = rawData as { role?: string };
        
        if (data?.role !== "employer") {
          window.alert("Authentication failed! You are not an employee.");
          router.push("/");
        }
      } catch (error) {
        console.error("Error checking employee role:", error);
        window.alert("Authentication failed! You are not an employee.");
        router.push("/");
      } finally {
        setIsRoleLoading(false);
      }
    };

    checkEmployeeRole().catch(console.error);
  }, [isLoaded, userId, router]);

  useEffect(() => {
    if (!userId || isRoleLoading) return;
    fetchDocuments().catch(console.error);
  }, [userId, isRoleLoading, fetchDocuments]);

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

        const rawData: unknown = await response.json();
        const { chatHistory } = rawData as FetchHistoryProp;
        setQaHistory(chatHistory);
      } catch (error) {
        console.error("Error fetching Q&A history:", error);
      }
    };

    fetchHistory().catch(console.error);
  }, [userId, selectedDoc]);

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

  const fetchPredictiveAnalysis = useCallback(async (documentId: number, forceRefresh = false) => {
    setPredictiveError("");
    setPredictiveAnalysis(null);
    setIsPredictiveLoading(true);

    try {
      const response = await fetch("/api/predictive-document-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          analysisType: "missing_documents",
          includeRelatedDocs: true,
          forceRefresh
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch predictive analysis");
      }

      const rawData: unknown = await response.json();
      const data = rawData as PredictiveAnalysisResponse;
      setPredictiveAnalysis(data);
    } catch (error) {
      console.error("Error fetching predictive analysis:", error);
      setPredictiveError("Failed to perform predictive analysis. Please try again.");
    } finally {
      setIsPredictiveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode !== "predictive-analysis" || !selectedDoc?.id) return;
    fetchPredictiveAnalysis(selectedDoc.id, false).catch(console.error);
  }, [viewMode, selectedDoc, fetchPredictiveAnalysis]);

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
    } catch (error: unknown) {
      setAiError("Timeout or fetch error: Please try again later." + (error as Error).toString());
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSelectDocument = (docId: number, page: number) => {
    const doc = documents.find(d => d.id === docId);
    if (doc) {
      setSelectedDoc(doc);
      setPdfPageNumber(page);
    }
  };

  const deleteDocument = async (docId: number) => {
    if (!window.confirm('Are you sure you want to delete this document? This will permanently remove the document and all related data including chat history, analysis results, and references. This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/deleteDocument', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId: docId.toString() }),
      });

      const result = await response.json() as errorType;

      if (!response.ok) {
        throw new Error(result.details ?? result.error ?? 'Failed to delete document');
      }

      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      
      if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc(null);
        setAiAnswer("");
        setReferencePages([]);
        setPredictiveAnalysis(null);
        setQaHistory([]);
      }

      alert(result.message ?? 'Document and all related data deleted successfully');
    } catch (error) {
      console.error('Error deleting document:', error);
      alert(`Failed to delete document: ${error instanceof Error ? error.message ?? 'Unknown error' : 'Unknown error'}`);
    }
  };


  const categories: CategoryGroup[] = Object.values(
    documents.reduce((acc: Record<string, CategoryGroup>, doc) => {
      const lowerSearch = searchTerm.toLowerCase();
      const inTitle = doc.title.toLowerCase().includes(lowerSearch);
      const inSummary = doc.aiSummary?.toLowerCase().includes(lowerSearch) ?? false;

      if (!inTitle && !inSummary) return acc;

        acc[doc.category] ??= {
          name: doc.category,
          isOpen: openCategories.has(doc.category),
          documents: [],
        };
      
      acc[doc.category]!.documents.push(doc);
      return acc;
    }, {})
  );

  if (isRoleLoading) return <LoadingPage />;

  return (
    <div className={styles.container}>
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
        toggleCategory={toggleCategory}
        deleteDocument={deleteDocument}
      />

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
          onSelectDocument={handleSelectDocument}
        />
      </main>
    </div>
  );
};

export default DocumentViewer;