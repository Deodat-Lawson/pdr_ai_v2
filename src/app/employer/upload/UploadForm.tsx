"use client";

import React, { useState } from "react";
import { Calendar, FileText, FolderPlus, Plus } from "lucide-react";
import { UploadDropzone } from "~/app/utils/uploadthing";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import styles from "~/styles/Employer/Upload.module.css";

interface UploadFormData {
    title: string;
    category: string;
    uploadDate: string;
    fileUrl: string | null;
    fileName: string;
}

interface UploadFormProps {
    categories: { id: string; name: string }[];
}

const UploadForm: React.FC<UploadFormProps> = ({ categories }) => {
    const { userId } = useAuth();
    const router = useRouter();

    // --- Form State ---
    const [formData, setFormData] = useState<UploadFormData>({
        title: "",
        category: "",
        uploadDate: new Date().toISOString().split("T")[0]!,
        fileUrl: null,
        fileName: "",
    });

    const [errors, setErrors] = useState<Partial<UploadFormData>>({});
    const [isSubmitting, setIsSubmitting] = useState(false); // For "Uploading..." state

    // --- Handlers ---
    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<UploadFormData> = {};

        if (!formData.title.trim()) {
            newErrors.title = "Title is required";
        }
        if (!formData.category) {
            newErrors.category = "Category is required";
        }
        if (!formData.fileUrl) {
            newErrors.fileUrl = "Please upload a PDF file";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setIsSubmitting(true);

            const response = await fetch("/api/uploadDocument", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId,
                    documentName: formData.title,
                    documentCategory: formData.category,
                    documentUrl: formData.fileUrl,
                }),
            });

            if (!response.ok) {
                console.error("Error uploading document");
                // You could surface an error message or toast here
            } else {
                // On success, redirect or reset
                router.push("/employer/documents");
            }
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- Render ---
    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {/* File Upload Area */}
            {!formData.fileUrl ? (
                <UploadDropzone
                    endpoint="pdfUploader"
                    onClientUploadComplete={(res) => {
                        if (!res?.length) return;
                        const fileUrl = res[0]!.url;
                        const fileName = res[0]!.name;
                        setFormData((prev) => ({
                            ...prev,
                            fileUrl: fileUrl,
                            fileName: fileName,
                        }));
                    }}
                    onUploadError={(error) => {
                        console.error("Upload Error:", error);
                    }}
                    className={styles.uploadArea}
                />
            ) : (
                <div className={styles.fileInfo}>
                    <FileText className={styles.fileIcon} />
                    <span className={styles.fileName}>{formData.fileName}</span>
                    <button
                        type="button"
                        onClick={() =>
                            setFormData((prev) => ({ ...prev, fileUrl: null, fileName: "" }))
                        }
                        className={styles.removeFile}
                    >
                        Remove
                    </button>
                </div>
            )}
            {errors.fileUrl && <span className={styles.error}>{errors.fileUrl}</span>}

            {/* Document Details */}
            <div className={styles.formFields}>
                {/* Title */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Document Title</label>
                    <div className={styles.inputWrapper}>
                        <FileText className={styles.inputIcon} />
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            className={styles.input}
                            placeholder="Enter document title"
                        />
                    </div>
                    {errors.title && <span className={styles.error}>{errors.title}</span>}
                </div>

                {/* Category */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Category</label>
                    <div className={styles.inputWrapper}>
                        <FolderPlus className={styles.inputIcon} />
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleInputChange}
                            className={styles.select}
                        >
                            <option value="">Select a category</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.name}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    {errors.category && (
                        <span className={styles.error}>{errors.category}</span>
                    )}
                </div>

                {/* Upload Date */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>Upload Date</label>
                    <div className={styles.inputWrapper}>
                        <Calendar className={styles.inputIcon} />
                        <input
                            type="date"
                            name="uploadDate"
                            value={formData.uploadDate}
                            onChange={handleInputChange}
                            className={styles.input}
                        />
                    </div>
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                className={styles.submitButton}
                disabled={isSubmitting}
            >
                <Plus className={styles.buttonIcon} />
                {isSubmitting ? "Uploading..." : "Upload Document"}
            </button>
        </form>
    );
};

export default UploadForm;
