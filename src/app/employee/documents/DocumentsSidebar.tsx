// DocumentViewer/DocumentsSidebar.tsx
"use client";

import React from "react";
import {
  FileText,
  Search,
  Brain,
  ChevronRight,
  ChevronDown,
  LogOut,
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

// Define our "view mode" type if you need typed usage

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
  return (
    <aside className={styles.sidebar}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
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
          className={`${styles.viewModeButton} ${viewMode === "document-only" ? styles.activeViewMode : ""
            }`}
          onClick={() => setViewMode("document-only")}
        >
          Document Only
        </button>

        <button
          className={`${styles.viewModeButton} ${viewMode === "with-ai-qa" ? styles.activeViewMode : ""
            }`}
          onClick={() => setViewMode("with-ai-qa")}
        >
          AI Q&A + Doc
        </button>

        <button
          className={`${styles.viewModeButton} ${viewMode === "with-ai-qa-history" ? styles.activeViewMode : ""
            }`}
          onClick={() => setViewMode("with-ai-qa-history")}
        >
          AI Q&A History + Doc
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
