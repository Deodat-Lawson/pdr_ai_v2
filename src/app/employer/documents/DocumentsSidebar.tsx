"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    FileText,
    Search,
    Brain,
    ChevronRight,
    ChevronDown,
    Home,
    Eye,
    MessageCircle,
    History,
    BarChart3,
    ChevronLeft,
    Trash2,
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
    toggleCategory?: (categoryName: string) => void;
    deleteDocument?: (docId: number) => void;
}

interface ViewModeConfig {
    mode: ViewMode;
    icon: React.ElementType;
    tooltip: string;
}

const viewModeConfigs: ViewModeConfig[] = [
    {
        mode: "document-only",
        icon: Eye,
        tooltip: "Document Only"
    },
    {
        mode: "with-ai-qa",
        icon: MessageCircle,
        tooltip: "AI Q&A"
    },
    {
        mode: "with-ai-qa-history",
        icon: History,
        tooltip: "Q&A History"
    },
    {
        mode: "predictive-analysis",
        icon: BarChart3,
        tooltip: "Predictive Analysis"
    }
];

export const DocumentsSidebar: React.FC<DocumentsSidebarProps> = ({
    categories,
    searchTerm,
    setSearchTerm,
    selectedDoc,
    setSelectedDoc,
    viewMode,
    setViewMode,
    toggleCategory,
    deleteDocument,
}) => {
    const router = useRouter();
    const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const handleCategoryClick = (categoryName: string) => {
        if (toggleCategory) {
            toggleCategory(categoryName);
        }
    };

    const handleDeleteDocument = (docId: number, e: React.MouseEvent) => {
        e.stopPropagation(); 
        if (deleteDocument) {
            deleteDocument(docId);
        }
    };

    return (
        <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
            <button 
                className={styles.toggleButton}
                onClick={toggleSidebar}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <ChevronLeft 
                    className={`${styles.toggleIcon} ${isCollapsed ? "rotate-180" : ""}`}
                />
            </button>

            <div className={styles.sidebarHeader}>
                <button className={styles.logoContainer}>
                    <Brain className={styles.logoIcon} />
                    <span className={styles.logoText}>PDR AI</span>
                </button>

                {/* Search Bar */}
                <div className={styles.searchContainer}>
                    <Search className={`${styles.searchIcon} ${isSearchFocused ? 'text-purple-600 scale-110' : ''}`} />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
                    />
                </div>
            </div>

            <div className={styles.viewModeContainer}>
                <div className={styles.viewModeHeader}>
                    <span className={styles.viewModeTitle}>View Options</span>
                </div>
                <div className={styles.viewModeButtons}>
                    {viewModeConfigs.map(({ mode, icon: Icon, tooltip }) => (
                        <div
                            key={mode}
                            className={styles.tooltipContainer}
                            onMouseEnter={() => setHoveredTooltip(mode)}
                            onMouseLeave={() => setHoveredTooltip(null)}
                        >
                            <button
                                className={`${styles.viewModeButton} ${viewMode === mode ? styles.activeViewMode : ""
                                    }`}
                                onClick={() => setViewMode(mode)}
                            >
                                <Icon className={styles.viewModeIcon} />
                            </button>
                            {hoveredTooltip === mode && (
                                <div className={styles.tooltip}>
                                    <span className={styles.tooltipText}>{tooltip}</span>
                                    <div className={styles.tooltipArrow}></div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <nav className={styles.docList}>
                {categories.map((category) => (
                    <div key={category.name} className={styles.categoryGroup}>
                        <div 
                            className={styles.categoryHeader}
                            onClick={() => handleCategoryClick(category.name)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleCategoryClick(category.name);
                                }
                            }}
                        >
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
                                    <div key={doc.id} className={`${styles.docButton} group ${selectedDoc && selectedDoc.id === doc.id ? styles.selected : ""}`}>
                                        <button
                                            onClick={() => setSelectedDoc(doc)}
                                            className={styles.docItem}
                                        >
                                            <FileText className={styles.docIcon} />
                                            <span className={styles.docName}>{doc.title}</span>
                                        </button>
                                        {!isCollapsed && deleteDocument && (
                                            <button
                                                onClick={(e) => handleDeleteDocument(doc.id, e)}
                                                className={`${styles.deleteButton} group-hover:opacity-100`}
                                                title="Delete document"
                                                aria-label={`Delete document ${doc.title}`}
                                            >
                                                <Trash2 className={styles.trashIcon} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* Sidebar Footer - Home Button */}
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