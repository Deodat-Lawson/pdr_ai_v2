"use client"
import React, { useState } from 'react';
import { FileText, Search, Brain, ChevronRight, ChevronDown } from 'lucide-react';
import styles from '../../../styles/employerDocumentViewer.module.css';
import Link from "next/link";

// Mock data for documents
const documents = [
    {
        id: 1,
        name: 'Apple Financial Report Q1 2025',
        category: 'Financial',
        aiSummary: 'Apple Inc. reported strong financial results for Q4 2023, with total net sales of $119.58 billion, driven by growth in services revenue ($23.12 billion) and iPhone sales ($69.70 billion). Net income rose to $33.92 billion, reflecting a higher gross margin of $54.86 billion and effective cost management. The company improved its cash position to $41.97 billion while returning $23.97 billion to shareholders through dividends and stock repurchases. With steady growth across all regions and increased shareholder equity to $74.10 billion, Apple demonstrated robust performance and financial stability during the quarter.',
        url: 'https://utfs.io/f/zllPuoqtDQmMunOGjZkCWhtoxfrJp6Db5dHg8iIVBLawUOs2'
    },
    {
        id: 2,
        name: 'Employee Handbook 2025.pdf',
        category: 'HR',
        aiSummary: 'Updated employee handbook for 2025 includes new remote work policies, revised benefits package, and updated compliance requirements. Major changes focus on flexible working arrangements and mental health support.',
        url: '/documents/handbook.pdf'
    },
    {
        id: 3,
        name: 'Project Roadmap 2025.pdf',
        category: 'Planning',
        aiSummary: 'Strategic roadmap outlining key initiatives for 2025. Focuses on digital transformation, customer experience enhancement, and sustainability goals. Timeline includes quarterly milestones and resource allocation.',
        url: '/documents/roadmap.pdf'
    }
];

interface Category {
    name: string;
    isOpen: boolean;
    documents: typeof documents;
}

const DocumentViewer: React.FC = () => {
    const [selectedDoc, setSelectedDoc] = useState(documents[0]);
    const [searchTerm, setSearchTerm] = useState('');

    // Group documents by category
    const categories: Category[] = Object.values(
        documents.reduce((acc: { [key: string]: Category }, doc) => {
            if (!acc[doc.category]) {
                acc[doc.category] = {
                    name: doc.category,
                    isOpen: true,
                    documents: []
                };
            }
            acc[doc.category].documents.push(doc);
            return acc;
        }, {})
    );

    return (
        <div className={styles.container}>
            {/* Side Navigation */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <Link href='/employer/home'>
                        <button className={styles.logoContainer}>
                            <Brain className={styles.logoIcon} />
                            <span className={styles.logoText}>PDR AI</span>
                        </button>
                    </Link>



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
                                                selectedDoc.id === doc.id ? styles.selected : ''
                                            }`}
                                        >
                                            <FileText className={styles.docIcon} />
                                            <span className={styles.docName}>{doc.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                {selectedDoc && (
                    <>
                        {/* Document Title */}
                        <div className={styles.docHeader}>
                            <h1 className={styles.docTitle}>{selectedDoc.name}</h1>
                        </div>

                        {/* AI Summary */}
                        <div className={styles.summaryContainer}>
                            <div className={styles.summaryHeader}>
                                <Brain className={styles.summaryIcon} />
                                <h2 className={styles.summaryTitle}>AI Summary</h2>
                            </div>
                            <p className={styles.summaryText}>{selectedDoc.aiSummary}</p>
                        </div>

                        {/* PDF Viewer */}
                        <div className={styles.pdfContainer}>
                            <iframe
                                src={selectedDoc.url}
                                className={styles.pdfViewer}
                                title={selectedDoc.name}
                            />
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default DocumentViewer;