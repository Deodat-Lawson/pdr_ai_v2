"use client";

import React from "react";
import { FileText, Brain } from "lucide-react";
import Link from "next/link";
import styles from "../../../styles/Employee/DocumentViewer.module.css";

export default function LoadingDoc() {
    return (
        <div className={styles.loadingContainer}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <button className={styles.logoContainer}>
                        <Brain className={styles.logoIcon} />
                        <span className={styles.logoText}>PDR AI</span>
                    </button>
                </div>
            </aside>

            <main className={styles.mainLoadingContent}>
                <div className={styles.loadingContent}>
                    <FileText className={styles.loadingIcon} />
                    <p className={styles.loadingText}>Loading documents...</p>
                </div>
            </main>
        </div>
    );
}