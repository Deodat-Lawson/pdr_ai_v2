// DocumentViewer/DocumentsSidebar.tsx
"use client";

import React, { useState } from "react";
import {
  FileText,
  Search,
  Brain,
  ChevronRight,
  ChevronDown,
  LogOut,
  Eye,
  MessageCircle,
  History,
  BarChart3,
  ChevronLeft,
} from "lucide-react";
import { SignOutButton, UserButton } from "@clerk/nextjs";
import styles from "~/styles/Employee/DocumentViewer.module.css";
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
}

interface ViewModeConfig {
  mode: ViewMode;
  icon: React.ComponentType<any>;
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

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ""}`}>
      {/* Toggle Button */}
      <button 
        className={styles.toggleButton}
        onClick={toggleSidebar}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <ChevronLeft 
          className={`${styles.toggleIcon} ${isCollapsed ? "rotate-180" : ""}`}
        />
      </button>

      {/* Header */}
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
                className={`${styles.viewModeButton} ${viewMode === mode ? styles.activeViewMode : ""}`}
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

      {/* Profile Section */}
      <div className={styles.profileSection}>
        <UserButton
          afterSignOutUrl="/sign-in"
          appearance={{
            variables: {
              colorPrimary: "#8B5CF6",
              colorText: "#4F46E5",
              borderRadius: "0.5rem",
              fontFamily: "Inter, sans-serif",
            },
            elements: {
              userButtonAvatarBox: "border-2 border-purple-300",
              userButtonTrigger:
                "hover:bg-purple-50 transition-colors p-1 flex items-center rounded-lg",
              userButtonPopoverCard: "shadow-md border border-gray-100",
              userButtonPopoverFooter:
                "bg-gray-50 border-t border-gray-100 p-2",
            },
          }}
        />
        <SignOutButton>
          <button className={styles.logoutButton}>
            <LogOut className={styles.logoutIcon} />
            <span>Logout</span>
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
};
