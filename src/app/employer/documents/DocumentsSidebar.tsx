"use client";

import React from "react";
import Link from "next/link";
import {
    FileText,
    Search,
    Brain,
    ChevronRight,
    ChevronDown,
    Home,
} from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "~/styles/Employer/DocumentViewer.module.css";
import { ViewMode } from "./types";

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

interface DocumentsSidebarProps {
    categories: CategoryGroup[];
    searchTerm: string;
    setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
    selectedDoc: DocumentType | null;
    setSelectedDoc: (doc: DocumentType) => void;
    viewMode: ViewMode;
    setViewMode: React.Dispatch<React.SetStateAction<ViewMode>>;
}

export const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
                                                                      categories,
                                                                      searchTerm,
                                                                      setSearchTerm,
                                                                      selectedDoc,
                                                                      setSelectedDoc,
                                                                      viewMode,
                                                                      setViewMode,
                                                                  }) => {
    const router = useRouter();
    return (
        <aside className={styles.sidebar}>
            {/* Header */}
            <div className={styles.sidebarHeader}>

                {/* Logo */}
                <button className={styles.logoContainer}>
                    <Brain className={styles.logoIcon} />
                    <span className={styles.logoText}>PDR AI</span>
                </button>


                {/* Search Bar */}
                <div className={styles.searchContainer}>
                    <Search className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>


            </div>

            {/* View-Mode Buttons */}
            <div className={styles.viewModeButtons}>
                <button
                    className={`${styles.viewModeButton} ${
                        viewMode === "document-only" ? styles.activeViewMode : ""
                    }`}
                    onClick={() => setViewMode("document-only")}
                >
                    Document Only
                </button>

                {/* If you want a second button for an AI summary, you can add it here */}
                <button
                    className={`${styles.viewModeButton} ${
                        viewMode === "with-ai-qa" ? styles.activeViewMode : ""
                    }`}
                    onClick={() => setViewMode("with-ai-qa")}
                >
                    AI Q&A + Doc
                </button>

                {/* AI Summary History*/}
                <button
                    className={`${styles.viewModeButton} ${
                        viewMode === "with-ai-qa-history" ? styles.activeViewMode : ""
                    }`}
                    onClick={() => setViewMode("with-ai-qa-history")}
                >
                    AI Q&A History + Doc
                </button>

                {/* Predictive Analysis */}
                <button
                    className={`${styles.viewModeButton} ${
                        viewMode === "predictive-analysis" ? styles.activeViewMode : ""
                    }`}
                    onClick={() => setViewMode("predictive-analysis")}
                >
                    Predictive Analysis
                </button>

            </div>

            {/* Document List */}
            <nav className={styles.docList}>
                {categories.map((category) => (
                    <div key={category.name} className={styles.categoryGroup}>
                        <div className={styles.categoryHeader}>
                            {category.isOpen ? (
                                <ChevronDown className={styles.chevronIcon} />
                            ) : (
                                <ChevronRight className={styles.chevronIcon} />
                            )}
                            <span className={styles.categoryName}>{category.name}</span>
                        </div>

                        {category.isOpen && (
                            <div className={styles.categoryDocs}>
                                {category.documents.map((doc) => (
                                    <button
                                        key={doc.id}
                                        onClick={() => setSelectedDoc(doc)}
                                        className={`${styles.docItem} ${
                                            selectedDoc && selectedDoc.id === doc.id
                                                ? styles.selected
                                                : ""
                                        }`}
                                    >
                                        <FileText className={styles.docIcon} />
                                        <span className={styles.docName}>{doc.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* Profile Section (go back home, etc.) */}
            <div className={styles.sidebarFooter}>
                <Link href="/employer/home">
                    <button className={styles.homeButton}>
                        <Home className={styles.homeIcon} />
                        <span>Home</span>
                    </button>
                </Link>
            </div>
        </aside>
    );
};
