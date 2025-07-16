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
}) => {
    const router = useRouter();
    const [hoveredTooltip, setHoveredTooltip] = useState<string | null>(null);

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
                                        className={`${styles.docItem} ${selectedDoc && selectedDoc.id === doc.id
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
