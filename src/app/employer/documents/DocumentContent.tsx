"use client";

import React, { useState, useEffect, useRef } from "react";
import { Brain, Clock, FileSearch, AlertTriangle, CheckCircle, AlertCircle, RefreshCw, Check, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import styles from "~/styles/Employer/DocumentViewer.module.css";
import { type ViewMode } from "./types";
import MarkdownMessage from "~/app/_components/MarkdownMessage";
import clsx from "clsx";

// Import the QAHistory component AND the QAHistoryEntry interface
import QAHistory, { type QAHistoryEntry } from "./ChatHistory";
// Import agent chatbot components
import { useAgentChatbot } from "./hooks/useAgentChatbot";
import { ChatSelector } from "./components/ChatSelector";
import { AgentChatInterface } from "./components/AgentChatInterface";

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
        documentTitle?: string; // Optional, if provided by backend
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
  qaHistory: QAHistoryEntry[];
  aiStyle: string;
  setAiStyle: React.Dispatch<React.SetStateAction<string>>;
  styleOptions: Record<string, string>;
  predictiveAnalysis: PredictiveAnalysisResponse | null;
  predictiveLoading: boolean;
  predictiveError: string;
  onRefreshAnalysis: () => void;
  onSelectDocument?: (docId: number, page: number) => void;
  searchScope: "document" | "company";
  setSearchScope: React.Dispatch<React.SetStateAction<"document" | "company">>;
  companyId: number | null;
  userId: string | null;
  onCollapseMainSidebar?: () => void;
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
  onSelectDocument,
  searchScope,
  setSearchScope,
  companyId,
  userId,
  onCollapseMainSidebar
}) => {
  // States for modals
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [showRecommendationsModal, setShowRecommendationsModal] = useState(false);
  const [showResolvedModal, setShowResolvedModal] = useState(false);
  
  // State for query mode: 'simple' for one-time query, 'chat' for conversation
  const [queryMode, setQueryMode] = useState<'simple' | 'chat'>('simple');

  // Ref for chat history auto-scroll
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  // Ref for chat input auto-resize
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  // Ref to track previous query mode to detect transitions
  const prevQueryModeRef = useRef<'simple' | 'chat'>('simple');
  // Track if sidebar has been auto-collapsed for this chat session
  const hasAutoCollapsedRef = useRef(false);
  // Agent Chatbot state
  const { createChat, getMessages, getChat, updateChat } = useAgentChatbot();
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  // AI Chat persona/expertise selector
  type AiPersona = 'general' | 'learning-coach' | 'financial-expert' | 'legal-expert' | 'math-reasoning';
  const [aiPersona, setAiPersona] = useState<AiPersona>('general');
  const [showExpertiseModal, setShowExpertiseModal] = useState(false);
  const [pendingChatTitle, setPendingChatTitle] = useState('');
  
      // Load messages and chat settings when chat is selected
      useEffect(() => {
        if (currentChatId && queryMode === 'chat') {
          void getMessages(currentChatId).then((_msgs) => {
            // Messages are handled by AgentChatInterface component
          }).catch(console.error);
          
          // Load chat settings from database
          void getChat(currentChatId).then((chatData) => {
            if (chatData && typeof chatData === 'object' && 'chat' in chatData && chatData.chat) {
              const chat = chatData.chat as { aiStyle?: string; aiPersona?: string };
              if (chat.aiStyle) {
                setAiStyle(chat.aiStyle);
                console.log('🔄 Restored style from database:', chat.aiStyle);
              }
              if (chat.aiPersona) {
                setAiPersona(chat.aiPersona as AiPersona);
                console.log('🔄 Restored persona from database:', chat.aiPersona);
              }
            }
          }).catch(console.error);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [currentChatId, queryMode]);

  // States for resizable sidebars
  const [rightSidebarWidth, setRightSidebarWidth] = useState(400);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const [rightDragStartX, setRightDragStartX] = useState(0);
  const [rightDragStartWidth, setRightDragStartWidth] = useState(400);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(400);
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(false);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [leftDragStartX, setLeftDragStartX] = useState(0);
  const [leftDragStartWidth, setLeftDragStartWidth] = useState(400);

  // Auto-scroll to bottom of chat when new messages arrive
  useEffect(() => {
    if (queryMode === 'chat' && chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [qaHistory, aiLoading, queryMode]);

  // Auto-resize chat input as user types
  useEffect(() => {
    if (queryMode !== 'chat') return;
    const el = chatInputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // Cap growth to 256px (~16rem), beyond that it will scroll
    el.style.height = `${Math.min(el.scrollHeight, 256)}px`;
  }, [aiQuestion, queryMode]);

  // Auto-collapse main sidebar only once when switching from Simple Query to AI Chat
  useEffect(() => {
    // Only collapse when transitioning from 'simple' to 'chat' mode AND hasn't been collapsed yet
    if (
      viewMode === 'with-ai-qa' && 
      queryMode === 'chat' && 
      prevQueryModeRef.current === 'simple' &&
      !hasAutoCollapsedRef.current &&
      onCollapseMainSidebar
    ) {
      // Use a small timeout to ensure smooth transition
      const timeoutId = setTimeout(() => {
        onCollapseMainSidebar();
        hasAutoCollapsedRef.current = true; // Mark as collapsed
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    // Update the previous query mode ref
    prevQueryModeRef.current = queryMode;
    // Reset auto-collapse flag when switching back to simple mode
    if (queryMode === 'simple') {
      hasAutoCollapsedRef.current = false;
    }
  }, [queryMode, viewMode, onCollapseMainSidebar]);

  // Handle right sidebar resize with smooth dragging
  useEffect(() => {
    if (!isDraggingRight) return;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        // Calculate delta from initial drag position
        // Negative delta when dragging left (expanding sidebar), positive when dragging right (shrinking)
        const deltaX = rightDragStartX - e.clientX;
        const newWidth = rightDragStartWidth + deltaX;
        
        // Collapse if dragged too narrow
        if (newWidth < 150) {
          setIsRightSidebarCollapsed(true);
          setIsDraggingRight(false);
        } else {
          setIsRightSidebarCollapsed(false);
          setRightSidebarWidth(Math.max(250, Math.min(600, newWidth)));
        }
      });
    };

    const handleMouseUp = () => {
      setIsDraggingRight(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDraggingRight, rightDragStartX, rightDragStartWidth]);

  // Handle left sidebar resize (for chat mode) with smooth dragging
  useEffect(() => {
    if (!isDraggingLeft) return;

    let animationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        // Calculate delta from initial drag position
        // Positive delta when dragging right (expanding sidebar), negative when dragging left (shrinking)
        const deltaX = e.clientX - leftDragStartX;
        const newWidth = leftDragStartWidth + deltaX;
        
        // Collapse if dragged too narrow
        if (newWidth < 150) {
          setIsLeftSidebarCollapsed(true);
          setIsDraggingLeft(false);
        } else {
          setIsLeftSidebarCollapsed(false);
          setLeftSidebarWidth(Math.max(250, Math.min(600, newWidth)));
        }
      });
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDraggingLeft, leftDragStartX, leftDragStartWidth]);

  if (!selectedDoc && viewMode !== "with-ai-qa" && viewMode !== "with-ai-qa-history") {
    return (
      <div className={styles.noDocSelected}>
        <h1 className={styles.noDocTitle}>Select a document to view</h1>
      </div>
    );
  }

  const getPdfSrcWithPage = (url: string, page: number) => `${url}#page=${page}`;

  const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto shadow-xl dark:border dark:border-purple-500/30">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );

  const renderMissingItem = (doc: PredictiveAnalysisResponse['analysis']['missingDocuments'][0], index: number) => (
    <div key={index} className="border-l-4 border-orange-400 dark:border-orange-500 pl-4 py-3 bg-orange-50 dark:bg-orange-900/20 rounded-md">
      <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center justify-between">
        {doc.documentName}
        {doc.resolvedIn && (
          <button
            onClick={() => onSelectDocument?.(doc.resolvedIn!.documentId, doc.resolvedIn!.page)}
            className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-900/50 ml-2"
          >
            View in {doc.resolvedIn.documentTitle ?? `Document ${doc.resolvedIn.documentId}`}
          </button>
        )}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{doc.reason}</div>
      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
        Type: {doc.documentType} | Priority: {doc.priority}
      </div>
      <button
        onClick={() => setPdfPageNumber(doc.page)}
        className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded mt-1 hover:bg-orange-200 dark:hover:bg-orange-900/50"
      >
        Original Reference: Page {doc.page}
      </button>
      {doc.suggestedCompanyDocuments && doc.suggestedCompanyDocuments.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Possible Company Documents:</div>
          <div className="mt-1 space-y-1">
            {doc.suggestedCompanyDocuments.map((companyDoc, companyIndex) => (
              <div key={companyIndex} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded p-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onSelectDocument?.(companyDoc.documentId, companyDoc.page)}
                    className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline"
                  >
                    {companyDoc.documentTitle}
                  </button>
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {Math.round(companyDoc.similarity * 100)}% match
                  </span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Page {companyDoc.page}: {companyDoc.snippet}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {doc.suggestedLinks && doc.suggestedLinks.length > 0 && (
        <div className="mt-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">External Suggested Links:</div>
          <ul className="list-disc pl-4 mt-1 text-xs text-blue-600 dark:text-blue-400">
            {doc.suggestedLinks.map((link, linkIndex) => (
              <li key={linkIndex}>
                <a href={link.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {link.title}
                </a>
                <p className="text-gray-500 dark:text-gray-400">{link.snippet}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const renderResolvedItem = (doc: NonNullable<PredictiveAnalysisResponse['analysis']['resolvedDocuments']>[0], index: number) => (
    <div key={index} className="border-l-4 border-green-400 dark:border-green-500 pl-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-md">
      <div className="font-medium text-gray-900 dark:text-gray-100 flex items-center justify-between">
        {doc.documentName}
        <button
          onClick={() => onSelectDocument?.(doc.resolvedDocumentId, doc.resolvedPage)}
          className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded hover:bg-green-200 dark:hover:bg-green-900/50 ml-2"
        >
          View in {doc.resolvedDocumentTitle ?? `Document ${doc.resolvedDocumentId}`} (Page {doc.resolvedPage})
        </button>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{doc.reason}</div>
      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
        Type: {doc.documentType} | Priority: {doc.priority}
      </div>
      <button
        onClick={() => setPdfPageNumber(doc.originalPage)}
        className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded mt-1 hover:bg-green-200 dark:hover:bg-green-900/50"
      >
        Original Reference: Page {doc.originalPage}
      </button>
    </div>
  );

  const renderRecommendationItem = (rec: string, index: number) => (
    <div key={index} className="border-l-4 border-green-400 dark:border-green-500 pl-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-md">
      <div className="text-sm text-gray-600 dark:text-gray-300">{rec}</div>
    </div>
  );

  // Render the Simple Query layout (Document main + Query sidebar)
  const renderSimpleQueryLayout = () => (
    <div className={clsx(styles.splitLayoutContainer, "gap-6")}>
      {/* Main Document Viewer */}
      <div className={clsx(styles.splitMainPanel, "flex-1 flex flex-col")}>
        {selectedDoc ? (
          <div className="flex-1 bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-purple-500/30 transition-all duration-300">
            <iframe
              key={pdfPageNumber}
              src={getPdfSrcWithPage(selectedDoc.url, pdfPageNumber)}
              className="w-full h-full border-0 rounded-xl"
              title={selectedDoc.title}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 dark:border-purple-500/30 transition-all duration-300">
            <p className="text-gray-500 dark:text-gray-400 text-lg">Select a document to view</p>
          </div>
        )}
      </div>

      {!isRightSidebarCollapsed && (
        <>
          <div
            className={clsx(
              styles.resizeHandle,
              "flex-shrink-0",
              isDraggingRight && styles.dragging
            )}
            onMouseDown={(e) => {
              setRightDragStartX(e.clientX);
              setRightDragStartWidth(rightSidebarWidth);
              setIsDraggingRight(true);
            }}
          />

          <div
            className={clsx(
              styles.sidebar,
              styles.sidebarRight,
              styles.draggableSidebar,
              "sticky top-0",
              isDraggingRight && styles.dragging
            )}
            style={{ width: `${rightSidebarWidth}px`, maxHeight: "100vh" }}
          >
            <div className={styles.sidebarHeader}>
              <div className="flex items-center gap-3">
                <Brain className="w-9 h-9 text-purple-600 dark:text-purple-400 p-1.5 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/20 rounded-xl" />
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Simple Query</h2>
                </div>
              </div>
      </div>

            <div className={clsx(styles.sidebarBody, "space-y-5")}>
              <form onSubmit={handleAiSearch} className="space-y-4">
                <div className="flex flex-col space-y-3 bg-white/60 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200/70 dark:border-purple-500/20">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase">Search Scope</label>
                  <div className="flex flex-col space-y-2">
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        value="document"
                        checked={searchScope === "document"}
                        onChange={(e) => setSearchScope(e.target.value as "document" | "company")}
                        className="mr-3 text-purple-600 focus:ring-purple-500 w-4 h-4"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        Current Document
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer group">
                      <input
                        type="radio"
                        value="company"
                        checked={searchScope === "company"}
                        onChange={(e) => setSearchScope(e.target.value as "document" | "company")}
                        className="mr-3 text-purple-600 focus:ring-purple-500 w-4 h-4"
                        disabled={!companyId}
                      />
                      <span className={clsx(
                        "text-sm transition-colors",
                        !companyId
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400"
                      )}>
                        All Company Docs
                      </span>
                    </label>
                  </div>
          </div>

                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 tracking-wide uppercase">Response Style</label>
                  <select
                    value={aiStyle}
                    onChange={(e) => setAiStyle(e.target.value)}
                    className="border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white rounded-xl p-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 font-medium"
                  >
                    {Object.entries(styleOptions).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  placeholder={
                    searchScope === "company" 
                      ? "Ask about all company docs..." 
                      : selectedDoc 
                        ? `Ask about "${selectedDoc.title}"...`
                        : "Select a document first..."
                  }
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  rows={4}
                  className="border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white dark:placeholder-gray-400 rounded-xl p-3 w-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none transition-all duration-200 font-medium"
                />
              <button
                  type="submit"
                  disabled={aiLoading || (searchScope === "document" && !selectedDoc) || (searchScope === "company" && !companyId)}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-lg hover:shadow-xl flex items-center justify-center"
                >
                  {aiLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Asking AI...
                    </span>
                  ) : "Ask AI"}
              </button>
              </form>

              {aiError && <p className="text-red-500 text-sm font-medium">{aiError}</p>}

              {aiAnswer && (
                <div className="bg-gradient-to-r from-gray-50 to-purple-50 dark:from-slate-700 dark:to-purple-900/20 rounded-xl p-4 border border-gray-200 dark:border-purple-500/30 space-y-3">
                  <MarkdownMessage
                    content={aiAnswer}
                    className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
                  />

                  {referencePages.length > 0 && (
                    <div className="pt-3 border-t border-gray-300 dark:border-slate-600 space-y-2">
                      <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Reference Pages</p>
                      <div className="flex flex-wrap gap-2">
                        {referencePages.map((page, idx) => (
              <button
                            key={`ref-page-${page}-${idx}`}
                            onClick={() => setPdfPageNumber(page)}
                            className="inline-flex items-center bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/70 transition-all duration-200 text-xs font-medium shadow-sm hover:shadow-md"
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
          </div>
        </>
      )}

      {/* Reopen Button for Collapsed Right Sidebar */}
      {isRightSidebarCollapsed && (
              <button
          onClick={() => setIsRightSidebarCollapsed(false)}
          className={clsx(styles.reopenButton, "right-4 top-1/2 -translate-y-1/2 rounded-l-lg")}
          title="Open Query Panel"
        >
          <Brain className="w-5 h-5" />
          <span className="text-sm font-medium">Query</span>
              </button>
      )}
    </div>
  );

  // Render the AI Chat layout (Left ChatHistory sidebar + Chat main + Document right navbar)
  const renderAiChatLayout = () => (
    <div className={clsx(styles.splitLayoutContainer, "gap-0")}>
      {/* Left Chat History Sidebar */}
      {!isLeftSidebarCollapsed && (
        <>
          <div
            className={clsx(
              styles.sidebar,
              "sticky top-0",
              isDraggingLeft && styles.dragging
            )}
            style={{ width: `${leftSidebarWidth}px`, maxHeight: "100vh" }}
          >
            {/* Header with collapse button */}
            <div className={styles.sidebarHeader}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Clock className="w-9 h-9 flex-shrink-0 text-purple-600 dark:text-purple-400 p-1.5 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/20 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">Chat History</h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsLeftSidebarCollapsed(true)}
                  className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Chat History Content - Agent Chatbot Chats */}
            <div className="flex-1 overflow-y-auto p-4">
              {userId && (
                <ChatSelector
                  userId={userId}
                  currentChatId={currentChatId}
                  onSelectChat={setCurrentChatId}
                  onNewChat={async () => {
                    if (!userId) return;
                    const title = selectedDoc 
                      ? `Chat about ${selectedDoc.title}` 
                      : 'General AI Chat';
                    setPendingChatTitle(title);
                    setShowExpertiseModal(true);
                  }}
                />
              )}
            </div>
          </div>

          {/* Resize Handle for Left Sidebar */}
          <div
            className={clsx(
              styles.resizeHandle,
              "flex-shrink-0",
              isDraggingLeft && styles.dragging
            )}
            onMouseDown={(e) => {
              setLeftDragStartX(e.clientX);
              setLeftDragStartWidth(leftSidebarWidth);
              setIsDraggingLeft(true);
            }}
          />
        </>
      )}

      {/* Reopen Button for Left Sidebar */}
      {isLeftSidebarCollapsed && (
        <button
          onClick={() => setIsLeftSidebarCollapsed(false)}
          className={clsx(
            styles.reopenButton,
            "left-4 top-1/2 -translate-y-1/2 rounded-r-lg flex-col"
          )}
          title="Open Chat History"
        >
          <Clock className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">History</span>
        </button>
      )}

      {/* Main Chat Content - Agent Chatbot Interface */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 bg-white/80 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 dark:border-purple-500/30 flex flex-col min-h-0 overflow-hidden">
          {/* Settings Bar - Sticky but with proper spacing */}
          <div className="sticky top-0 z-10 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-slate-600 flex-shrink-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm mb-0">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Context Scope</label>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      value="document"
                      checked={searchScope === "document"}
                      onChange={(e) => setSearchScope(e.target.value as "document" | "company")}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">
                      Current Document
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      value="company"
                      checked={searchScope === "company"}
                      onChange={(e) => setSearchScope(e.target.value as "document" | "company")}
                      className="mr-2 text-purple-600 focus:ring-purple-500"
                      disabled={!companyId}
                    />
                    <span className={clsx(
                      "text-sm transition-colors",
                      !companyId ? "text-gray-400 cursor-not-allowed" : "text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400"
                    )}>
                      All Company Docs
                    </span>
                  </label>
                </div>
              </div>
              <div className="w-48">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">Style</label>
                <select
                  value={aiStyle}
                  onChange={async (e) => {
                    const newStyle = e.target.value as 'concise' | 'detailed' | 'academic' | 'bullet-points';
                    setAiStyle(newStyle);
                    // Update settings in database for current chat
                    if (currentChatId) {
                      await updateChat(currentChatId, { aiStyle: newStyle });
                      console.log('💾 Updated style in database for chat:', currentChatId, newStyle);
                    }
                  }}
                  className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 w-full focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  {Object.entries(styleOptions).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-60">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide block mb-2">Expertise</label>
                <select
                  value={aiPersona}
                  onChange={async (e) => {
                    const newPersona = e.target.value as AiPersona;
                    setAiPersona(newPersona);
                    // Update settings in database for current chat
                    if (currentChatId) {
                      await updateChat(currentChatId, { aiPersona: newPersona });
                      console.log('💾 Updated persona in database for chat:', currentChatId, newPersona);
                    }
                  }}
                  className="border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg p-2 w-full focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  <option value="general">General</option>
                  <option value="learning-coach">Learning Coach</option>
                  <option value="financial-expert">Financial Expert</option>
                  <option value="legal-expert">Legal Expert</option>
                  <option value="math-reasoning">Math Reasoning</option>
                </select>
              </div>
            </div>
          </div>

          {/* Chat Configuration Modal */}
          {showExpertiseModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 border border-gray-200 dark:border-slate-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Configure Your Chat</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Customize how the AI responds to your questions by selecting expertise and style preferences.
                </p>
                
                {/* Expertise Selection */}
                <div className="mb-6">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Expertise</label>
                  <div className="space-y-2">
                    {(['general', 'learning-coach', 'financial-expert', 'legal-expert', 'math-reasoning'] as AiPersona[]).map((persona) => (
                      <label
                        key={persona}
                        className={clsx(
                          "flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all",
                          aiPersona === persona
                            ? "border-purple-600 dark:border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                            : "border-transparent dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                        )}
                      >
                        <input
                          type="radio"
                          value={persona}
                          checked={aiPersona === persona}
                          onChange={(e) => setAiPersona(e.target.value as AiPersona)}
                          className="mr-3 text-purple-600 dark:text-purple-400 focus:ring-purple-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {persona.replace('-', ' ')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {persona === 'general' && 'General purpose assistance'}
                            {persona === 'learning-coach' && 'Helps you learn and understand concepts'}
                            {persona === 'financial-expert' && 'Specialized in financial analysis'}
                            {persona === 'legal-expert' && 'Expert in legal matters and compliance'}
                            {persona === 'math-reasoning' && 'Advanced mathematical problem solving'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Style Selection */}
                <div className="mb-6">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-3">Response Style</label>
                  <select
                    value={aiStyle}
                    onChange={(e) => setAiStyle(e.target.value)}
                    className="w-full border-2 border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                  >
                    {Object.entries(styleOptions).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      if (!userId) return;
                      const chat = await createChat({
                        userId,
                        title: pendingChatTitle,
                        agentMode: 'interactive',
                        visibility: 'private',
                        aiStyle: aiStyle as 'concise' | 'detailed' | 'academic' | 'bullet-points',
                        aiPersona: aiPersona,
                      });
                      if (chat) {
                        setCurrentChatId(chat.id);
                        // Settings are already saved in the database via createChat
                        console.log('💾 Created chat with settings:', { style: aiStyle, persona: aiPersona });
                      }
                      setShowExpertiseModal(false);
                    }}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors font-medium"
                  >
                    Start Chat
                  </button>
                  <button
                    onClick={() => setShowExpertiseModal(false)}
                    className="px-4 py-2.5 border-2 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agent Chatbot Interface */}
          {userId && currentChatId ? (
            <AgentChatInterface
              chatId={currentChatId}
              userId={userId}
              selectedDocTitle={selectedDoc?.title}
              searchScope={searchScope}
              selectedDocId={selectedDoc?.id}
              companyId={companyId}
              aiStyle={aiStyle}
              aiPersona={aiPersona}
              onPageClick={setPdfPageNumber}
              onAIResponse={(_response) => {
                // Handle AI response if needed
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Brain className="w-16 h-16 text-purple-300 dark:text-purple-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">Select or create a chat to get started</p>
                {userId && (
                  <button
                    onClick={() => {
                      const title = selectedDoc 
                        ? `Chat about ${selectedDoc.title}` 
                        : 'General AI Chat';
                      setPendingChatTitle(title);
                      setShowExpertiseModal(true);
                    }}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors"
                  >
                    Create New Chat
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Document Navbar */}
      {!isRightSidebarCollapsed && (
        <>
          {/* Resize Handle */}
          <div
            className={clsx(
              styles.resizeHandle,
              "flex-shrink-0",
              isDraggingRight && styles.dragging
            )}
            onMouseDown={(e) => {
              setRightDragStartX(e.clientX);
              setRightDragStartWidth(rightSidebarWidth);
              setIsDraggingRight(true);
            }}
          />

          <div
            className={clsx(
              styles.sidebar,
              styles.sidebarRight,
              styles.draggableSidebar,
              "sticky top-0",
              isDraggingRight && styles.dragging
            )}
            style={{ width: `${rightSidebarWidth}px`, maxHeight: "100vh" }}
          >
            {/* Header with collapse button */}
            <div className={styles.sidebarHeader}>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileSearch className="w-9 h-9 flex-shrink-0 text-purple-600 dark:text-purple-400 p-1.5 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/20 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">Preview Document</h2>
                  </div>
                </div>
                      <button
                  onClick={() => setIsRightSidebarCollapsed(true)}
                  className="ml-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                  aria-label="Collapse sidebar"
                >
                  <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>
              </div>
            </div>

            {/* Document Content */}
            <div className={clsx(styles.sidebarBody, "space-y-4")}>
              {selectedDoc ? (
                <>
                  {/* PDF Viewer */}
                  <div className="rounded-2xl border-2 border-gray-200 dark:border-purple-500/30 overflow-hidden shadow-xl bg-white dark:bg-slate-800">
                    <div className="bg-gradient-to-r from-gray-50 to-purple-50 dark:from-slate-800 dark:to-purple-900/20 px-4 py-2 border-b border-gray-200 dark:border-purple-500/30">
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        Page {pdfPageNumber}
                      </p>
                    </div>
                    <iframe
                      key={pdfPageNumber}
                      src={getPdfSrcWithPage(selectedDoc.url, pdfPageNumber)}
                      className="w-full h-[calc(100vh-20rem)] border-0"
                      title={selectedDoc.title}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[60vh] bg-gradient-to-br from-gray-50 to-purple-50 dark:from-slate-800 dark:to-purple-900/20 border-2 border-dashed border-gray-300 dark:border-purple-500/30 rounded-2xl text-center p-6">
                  <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">No Document Selected</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Choose a document from the main library to preview it while chatting
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Reopen Button */}
      {isRightSidebarCollapsed && (
        <button
          onClick={() => setIsRightSidebarCollapsed(false)}
          className={clsx(
            styles.reopenButton,
            "right-4 top-1/2 -translate-y-1/2 rounded-l-lg flex-col"
          )}
          title="Open Document Viewer"
        >
          <FileSearch className="w-5 h-5 mb-1" />
          <span className="text-xs font-medium">Docs</span>
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mode Toggle - Show only in AI Q&A mode */}
      {viewMode === "with-ai-qa" && (
        <div className={styles.modeToggleWrapper}>
          <div className={styles.modeToggle}>
                      <button
              type="button"
              onClick={() => setQueryMode('simple')}
              className={clsx(
                styles.modeToggleButton,
                queryMode === 'simple' && styles.modeToggleButtonActive
              )}
            >
              Simple Query
                      </button>
            <button
              type="button"
              onClick={() => setQueryMode('chat')}
              className={clsx(
                styles.modeToggleButton,
                queryMode === 'chat' && styles.modeToggleButtonActive
              )}
            >
              AI Chat
            </button>
            </div>
        </div>
      )}

      {/* AI Q&A Section - Render based on query mode */}
      {viewMode === "with-ai-qa" && (
        <>
          {queryMode === 'simple' ? renderSimpleQueryLayout() : renderAiChatLayout()}
        </>
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
            documentTitle={selectedDoc?.title ?? "All Documents"}
          />
        </div>
      )}

      {/* Document Header for document-only mode */}
      {viewMode === "document-only" && (
        <div className={styles.docHeader}>
          <h1 className={styles.docTitle}>
            {selectedDoc ? selectedDoc.title : "All Documents"}
          </h1>
        </div>
      )}

      {/* Predictive Analysis Section */}
      {viewMode === "predictive-analysis" && (
        <div className="mt-6">
          <div className={styles.docHeader}>
            <h1 className={styles.docTitle}>
              {selectedDoc ? selectedDoc.title : "All Documents"}
            </h1>
          </div>
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 dark:border-purple-400"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Analyzing document...</span>
            </div>
          )}

          {predictiveError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <span className="text-red-700 dark:text-red-300">{predictiveError}</span>
              </div>
            </div>
          )}

          {predictiveAnalysis && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 dark:border dark:border-blue-500/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {predictiveAnalysis.summary.totalMissingDocuments}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Missing Documents</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 dark:border dark:border-red-500/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {predictiveAnalysis.summary.highPriorityItems}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">High Priority</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 dark:border dark:border-yellow-500/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {predictiveAnalysis.summary.totalRecommendations}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">Recommendations</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 dark:border dark:border-green-500/30 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {predictiveAnalysis.summary.totalSuggestedRelated}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Suggested Related</div>
                </div>
              </div>

              {/* Missing Documents Section */}
              {predictiveAnalysis.analysis.missingDocuments.length > 0 && (
                <div className="bg-white dark:bg-slate-800/90 border dark:border-purple-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                    <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400 mr-2" />
                    Missing Documents
                  </h3>
                  <div className="space-y-4">
                    {/* Show first item inline */}
                    {predictiveAnalysis.analysis.missingDocuments[0] && renderMissingItem(predictiveAnalysis.analysis.missingDocuments[0], 0)}
                    {/* View All button if more */}
                    {predictiveAnalysis.analysis.missingDocuments.length > 1 && (
                      <button
                        onClick={() => setShowMissingModal(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline mt-2 text-sm font-medium"
                      >
                        View All ({predictiveAnalysis.analysis.missingDocuments.length} total)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations Section */}
              {predictiveAnalysis.analysis.recommendations.length > 0 && (
                <div className="bg-white dark:bg-slate-800/90 border dark:border-purple-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                    <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" />
                    Recommendations
                  </h3>
                  <div className="space-y-3">
                    {/* Show first item inline */}
                    {predictiveAnalysis.analysis.recommendations[0] && renderRecommendationItem(predictiveAnalysis.analysis.recommendations[0], 0)}
                    {/* View All button if more */}
                    {predictiveAnalysis.analysis.recommendations.length > 1 && (
                      <button
                        onClick={() => setShowRecommendationsModal(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline mt-2 text-sm font-medium"
                      >
                        View All ({predictiveAnalysis.analysis.recommendations.length} total)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Resolved Documents Section */}
              {predictiveAnalysis.analysis.resolvedDocuments && predictiveAnalysis.analysis.resolvedDocuments.length > 0 && (
                <div className="bg-white dark:bg-slate-800/90 border dark:border-purple-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                    <Check className="w-5 h-5 text-green-500 dark:text-green-400 mr-2" />
                    Resolved References
                  </h3>
                  <div className="space-y-3">
                    {predictiveAnalysis.analysis.resolvedDocuments[0] && renderResolvedItem(predictiveAnalysis.analysis.resolvedDocuments[0], 0)}
                    {predictiveAnalysis.analysis.resolvedDocuments.length > 1 && (
                      <button
                        onClick={() => setShowResolvedModal(true)}
                        className="text-blue-600 dark:text-blue-400 hover:underline mt-2 text-sm font-medium"
                      >
                        View All ({predictiveAnalysis.analysis.resolvedDocuments.length} total)
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Suggested Related Documents */}
              {predictiveAnalysis.analysis.suggestedRelatedDocuments && predictiveAnalysis.analysis.suggestedRelatedDocuments.length > 0 && (
                <div className="bg-white dark:bg-slate-800/90 border dark:border-purple-500/30 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-white">
                    <FileSearch className="w-5 h-5 text-blue-500 dark:text-blue-400 mr-2" />
                    Suggested Related Documents
                  </h3>
                  <div className="space-y-3">
                    {predictiveAnalysis.analysis.suggestedRelatedDocuments.map((doc, index) => (
                      <div key={index} className="border-l-4 border-blue-400 dark:border-blue-500 pl-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <a
                          href={doc.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {doc.title}
                        </a>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{doc.snippet}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* PDF Viewer - Only show when in document-only or predictive-analysis mode */}
      {selectedDoc && (viewMode === "document-only" || viewMode === "predictive-analysis") && (
        <div className={styles.pdfContainer}>
          <iframe
            key={pdfPageNumber}
            src={getPdfSrcWithPage(selectedDoc.url, pdfPageNumber)}
            className={styles.pdfViewer}
            title={selectedDoc.title}
          />
        </div>
      )}

      {/* Modals */}
      {showMissingModal && predictiveAnalysis && (
        <Modal title="All Missing Documents" onClose={() => setShowMissingModal(false)}>
          <div className="space-y-4">
            {predictiveAnalysis.analysis.missingDocuments.map(renderMissingItem)}
          </div>
        </Modal>
      )}

      {showRecommendationsModal && predictiveAnalysis && (
        <Modal title="All Recommendations" onClose={() => setShowRecommendationsModal(false)}>
          <div className="space-y-3">
            {predictiveAnalysis.analysis.recommendations.map(renderRecommendationItem)}
          </div>
        </Modal>
      )}

      {showResolvedModal && predictiveAnalysis?.analysis.resolvedDocuments && (
        <Modal title="All Resolved References" onClose={() => setShowResolvedModal(false)}>
          <div className="space-y-3">
            {predictiveAnalysis.analysis.resolvedDocuments.map(renderResolvedItem)}
          </div>
        </Modal>
      )}
    </>
  );
};