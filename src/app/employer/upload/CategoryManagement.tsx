"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import styles from "~/styles/Employer/Upload.module.css";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface Category {
    id: string;
    name: string;
}

interface CategoryManagementProps {
    categories: Category[];
    onAddCategory: (userId: string, newCategory: string) => Promise<void>;
    onRemoveCategory: (id: string) => Promise<void>;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({
                                                                   categories,
                                                                   onAddCategory,
                                                                   onRemoveCategory,
                                                               }) => {
    const { userId } = useAuth();
    const [newCategory, setNewCategory] = useState("");
    const router = useRouter();

    // Make the function async, and await the category creation
    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;

        try {
            // Wait for onAddCategory to finish
            await onAddCategory(userId, newCategory);
            setNewCategory("");
            // Parent component handles state update, no need to refresh
        } catch (error) {
            console.error("Error adding category:", error);
        }
    };

    // If you want to refresh after removal as well, make this async:
    const handleRemoveCategory = async (id: string) => {
        try {
            await onRemoveCategory(id);
            // Parent component handles state update
        } catch (error) {
            console.error("Error removing category:", error);
        }
    };

    return (
        <div className={styles.categoryManagement}>
            <h2>Manage Categories</h2>

            <form onSubmit={handleAddCategory} className={styles.addCategoryForm}>
                <input
                    type="text"
                    placeholder="New category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                />
                <button type="submit">Add Category</button>
            </form>

            <ul className={styles.categoryList}>
                {categories.map((cat) => (
                    <li key={cat.id} className={styles.categoryListItem}>
                        <span>{cat.name}</span>
                        <button
                            type="button"
                            onClick={() => handleRemoveCategory(cat.id)}
                            className={styles.removeCategoryBtn}
                        >
                            <Trash2 size={16} />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CategoryManagement;
