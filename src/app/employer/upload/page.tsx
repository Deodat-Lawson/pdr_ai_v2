"use client";

import React, { useState, useCallback } from "react";
import { Brain, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import EmployerAuthCheck from "./EmployerAuthCheck";
import UploadForm from "./UploadForm";
import CategoryManagement from "./CategoryManagement";
import styles from "~/styles/Employer/Upload.module.css";

interface Category {
    id: string;
    name: string;
}

const Page: React.FC = () => {
    const router = useRouter();

    // --- Category state and logic (fetched from server) ---
    const [categories, setCategories] = useState<Category[]>([]);

    const fetchCategories = useCallback(async (userId: string) => {
        try {
            const res = await fetch("/api/Categories/GetCategories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                throw new Error("Failed to fetch categories");
            }
            const rawData: unknown = await res.json();
            if (Array.isArray(rawData)) {
                const data = rawData as Category[];
                setCategories(data);
            } else {
                console.error("Invalid categories data received");
                setCategories([]);
            }
        } catch (error) {
            console.error(error);
        }
    }, []);

    const handleAddCategory = useCallback(
        async (userId: string, newCategory: string) => {
            if (!newCategory.trim()) return;
            try {
                const res = await fetch("/api/Categories/AddCategories", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId, CategoryName: newCategory }),
                });
                if (!res.ok) {
                    throw new Error("Failed to create category");
                }
                const rawData: unknown = await res.json();
                if (typeof rawData === "object" && rawData !== null) {
                    const createdCategory = rawData as Category;
                    setCategories((prev) => [...prev, createdCategory]);
                } else {
                    console.error("Invalid category data received");
                }
            } catch (error) {
                console.error(error);
                alert("Error creating category. Check console for details.");
            }
        },
        [],
    );

    const handleRemoveCategory = useCallback(async (id: string) => {
        if (!confirm("Are you sure you want to delete this category?")) return;

        try {
            const res = await fetch("/api/Categories/DeleteCategories", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) {
                throw new Error("Failed to remove category");
            }
            setCategories((prev) => prev.filter((cat) => cat.id !== id));
        } catch (error) {
            console.error(error);
            alert("Error removing category. Check console for details.");
        }
    }, []);

    return (
        <EmployerAuthCheck onAuthSuccess={fetchCategories}>
            <nav className={styles.navbar}>
                <div className={styles.navContent}>
                    <div className={styles.logoWrapper}>
                        <Brain className={styles.logoIcon} />
                        <span className={styles.logoText}>PDR AI</span>
                    </div>
                    <button
                        onClick={() => router.push("/employer/home")}
                        className={styles.homeButton}
                    >
                        <Home className={styles.homeIcon} />
                        Home
                    </button>
                </div>
            </nav>

            <div className={styles.container}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Upload New Document</h1>
                    <p className={styles.subtitle}>Add a new document to your repository</p>
                </div>

                <UploadForm categories={categories} />

                <CategoryManagement
                    categories={categories}
                    onAddCategory={handleAddCategory}
                    onRemoveCategory={handleRemoveCategory}
                />
            </div>
        </EmployerAuthCheck>
    );
};

export default Page;
