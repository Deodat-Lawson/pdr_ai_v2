"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    FileText,
    Search,
    Brain,
    ChevronRight,
    ChevronDown,
    Home,
    MessageCircle,
    BarChart3,
    ChevronLeft,
    Trash2,
} from "lucide-react";
import styles from "~/styles/Employer/DocumentViewer.module.css";
import { type ViewMode } from "./types";
import { ThemeToggle } from "~/app/_components/ThemeToggle";    
import clsx from "clsx";

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
    collapsed?: boolean;
    onCollapseChange?: (collapsed: boolean) => void;
    isDragging?: boolean;
}

interface ViewModeConfig {
    mode: ViewMode;
    icon: React.ElementType;
    tooltip: string;
}

const viewModeConfigs: ViewModeConfig[] = [
    // {
    //     mode: "document-only",
    //     icon: Eye,
    //     tooltip: "Document Only"
    // },
    {
        mode: "with-ai-qa",
        icon: MessageCircle,
        tooltip: "AI Q&A"
    },
    // {
    //     mode: "with-ai-qa-history",
    //     icon: History,
    //     tooltip: "Q&A History"
    // },
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
    collapsed,
    onCollapseChange,
    isDragging = false,
}) => {
    const [internalCollapsed, setInternalCollapsed] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        if (collapsed !== undefined) {
            setInternalCollapsed(collapsed);
        }
    }, [collapsed]);

    const isCollapsed = collapsed ?? internalCollapsed;

    const toggleSidebar = () => {
        const nextCollapsed = !isCollapsed;
        if (collapsed === undefined) {
            setInternalCollapsed(nextCollapsed);
        }
        onCollapseChange?.(nextCollapsed);
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
        <aside
            className={clsx(
                styles.sidebar,
                styles.draggableSidebar,
                isCollapsed && styles.collapsed,
                isDragging && styles.dragging,
            )}
        >
            {/* Sidebar Header Section */}
            <div className={styles.sidebarHeader}>
                {/* Logo and Actions Row */}
                <div className={styles.logoRow}>
                    {/* Logo */}
                    <div className={styles.logoContainer}>
                        <Brain className={styles.logoIcon} />
                        <span className={styles.logoText}>PDR AI</span>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className={styles.headerActions}>
                        <ThemeToggle />
                        <Link href="/employer/home">
                            <button className={styles.iconButton} aria-label="Go to home">
                                <Home className={styles.iconButtonIcon} />
                            </button>
                        </Link>
                        <button 
                            className={styles.iconButton}
                            onClick={toggleSidebar}
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            <ChevronLeft 
                                className={`${styles.iconButtonIcon} transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`}
                            />
                        </button>
                    </div>
                </div>

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

            {/* View Mode Selection Section */}
            <div className={clsx(
                "border-b border-gray-200 dark:border-slate-700 transition-all duration-200",
                isCollapsed ? "px-2 py-3" : "px-4 py-4"
            )}>
                {!isCollapsed && (
                    <div className="mb-3">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">View Options</span>
                    </div>
                )}
                <div className={clsx(
                    "transition-all duration-200",
                    isCollapsed ? "flex flex-col gap-2" : "grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                )}>
                    {viewModeConfigs.map(({ mode, icon: Icon, tooltip }) => (
                        <button
                            key={mode}
                            className={clsx(
                                "rounded-xl flex items-center transition-all duration-300 transform",
                                isCollapsed 
                                    ? "w-full justify-center p-2.5" 
                                    : "relative w-full justify-start px-4 py-3 gap-3 overflow-hidden",
                                viewMode === mode
                                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 scale-105"
                                    : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:scale-[1.02]"
                            )}
                            onClick={() => setViewMode(mode)}
                            aria-label={tooltip}
                        >
                            <Icon className={clsx(
                                "transition-all duration-300",
                                isCollapsed ? "w-5 h-5" : "w-4 h-4",
                                viewMode === mode ? "scale-110" : ""
                            )} />
                            {!isCollapsed && (
                                <span className={clsx(
                                    "text-xs font-semibold transition-colors",
                                    viewMode === mode ? "text-white" : "text-gray-700 dark:text-gray-300"
                                )}>
                                    {tooltip}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <nav className={styles.docList}>
                {(viewMode === "with-ai-qa" || viewMode === "with-ai-qa-history") && !isCollapsed && (
                    <div className={styles.categoryGroup}>
                        <div 
                            className={`${styles.docButton} ${!selectedDoc ? styles.selected : ""}`}
                            onClick={() => setSelectedDoc(null as unknown as DocumentType)}
                        >
                            <button className={styles.docItem}>
                                <FileText className={styles.docIcon} />
                                <span className={styles.docName}>All Documents</span>
                            </button>
                        </div>
                    </div>
                )}

                {categories.map((category) => (
                    <div key={category.name} className={styles.categoryGroup}>
                        {/* Category Header */}
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
                                    <div 
                                        key={doc.id} 
                                        className={`${styles.docButton} ${
                                            selectedDoc && selectedDoc.id === doc.id ? styles.selected : ""
                                        }`}
                                    >
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
                                                className={styles.deleteButton}
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

            {/* Sidebar Footer Section - Reserved for future actions */}
            <div className={styles.sidebarFooter}>
                {/* Add additional actions here as needed */}
            </div>
        </aside>
    );
};