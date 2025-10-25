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
import styles from "~/styles/Employer/DocumentViewer.module.css";
import { type ViewMode } from "./types";
import { ThemeToggle } from "~/app/_components/ThemeToggle";    

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
            {/* Collapse Toggle Button */}
            <button 
                className={styles.toggleButton}
                onClick={toggleSidebar}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
                <ChevronLeft 
                    className={`${styles.toggleIcon} ${isCollapsed ? "rotate-180" : ""}`}
                />
            </button>

            {/* Sidebar Header Section */}
            <div className={styles.sidebarHeader}>
                {/* Logo and Actions Row */}
                <div className={styles.logoRow}>
                    <div className={styles.logoContainer}>
                        <Brain className={styles.logoIcon} />
                        <span className={styles.logoText}>PDR AI</span>
                    </div>
                    <div className={styles.headerActions}>
                        <ThemeToggle />
                        <Link href="/employer/home">
                            <button className={styles.iconButton} aria-label="Go to home">
                                <Home className={styles.iconButtonIcon} />
                            </button>
                        </Link>
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
                                aria-label={tooltip}
                            >
                                <Icon className={styles.viewModeIcon} />
                            </button>
                            {hoveredTooltip === mode && !isCollapsed && (
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
                {/* Show "All Documents" option when in AI Q&A mode */}
                {(viewMode === "with-ai-qa" || viewMode === "with-ai-qa-history") && !isCollapsed && (
                    <div className={styles.categoryGroup}>
                        <div 
                            // className={`${styles.docButton} ${!selectedDoc ? styles.selected : ""}`}
                            onClick={() => setSelectedDoc(null as any)}
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

                        {/* Category Documents */}
                        {category.isOpen && (
                            <div className={styles.categoryDocs}>
                                {category.documents.map((doc) => (
                                    <div 
                                        key={doc.id} 
                                        className={`${styles.docButton} group ${
                                            selectedDoc && selectedDoc.id === doc.id ? styles.selected : ""
                                        }`}
                                    >
                                        {/* Document Button */}
                                        <button
                                            onClick={() => setSelectedDoc(doc)}
                                            className={styles.docItem}
                                        >
                                            <FileText className={styles.docIcon} />
                                            <span className={styles.docName}>{doc.title}</span>
                                        </button>
                                        
                                        {/* Delete Button (appears on hover) */}
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

            {/* Sidebar Footer Section - Reserved for future actions */}
            <div className={styles.sidebarFooter}>
                {/* Add additional actions here as needed */}
            </div>
        </aside>
    );
};