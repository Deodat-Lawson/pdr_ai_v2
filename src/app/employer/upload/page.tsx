"use client";

import React, { useState, useCallback } from "react";
import { Brain, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import EmployerAuthCheck from "./EmployerAuthCheck";
import UploadForm from "./UploadForm";
import CategoryManagement from "./CategoryManagement";
import styles from "~/styles/Employer/Upload.module.css";
import { ThemeToggle } from "~/app/_components/ThemeToggle";

interface Category {
    id: string;
    name: string;
}

type CategoryResponse = {
    id: number;
    success: boolean;
    name: string;
}

const Page: React.FC = () => {
    const router = useRouter();

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
                const rawData = await res.json() as CategoryResponse;
                
                if (rawData.success) {
                    const createdCategory = { id: rawData.id, name: rawData.name };
                    setCategories((prev) => {
                        const newCategories = [...prev, { id: createdCategory.id.toString(), name: createdCategory.name }];
                        return newCategories;
                    });
                } else {
                    console.error("Invalid category data received:", rawData);
                    alert("Error: Invalid category data format");
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
            <div className={styles.mainContainer}>
                <nav className={styles.navbar}>
                    <div className={styles.navContent}>
                        <div className={styles.logoWrapper}>
                            <Brain className={styles.logoIcon} />
                            <span className={styles.logoText}>PDR AI</span>
                        </div>
                        <div className={styles.navActions}>
                            <ThemeToggle />
                            <button
                                onClick={() => router.push("/employer/home")}
                                className={styles.iconButton}
                                aria-label="Go to home"
                            >
                                <Home className={styles.iconButtonIcon} />
                            </button>
                        </div>
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
            </div>
        </EmployerAuthCheck>
    );
};

export default Page;
