"use client";

import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Brain, Home } from "lucide-react";

// Child Components
import SettingsForm from "~/app/employer/settings/SettingsForm";
import PopupModal from "~/app/employer/settings/PopupModal";
import { ThemeToggle } from "~/app/_components/ThemeToggle";

// Loading component
import LoadingPage from "~/app/_components/loading";

// Styles
import styles from "~/styles/Employer/Settings.module.css";

interface Company {
    id: number;
    name: string;
    employerpasskey: string;
    employeepasskey: string;
    numberOfEmployees: string;
    createdAt: string;
    updatedAt: string;
}


const SettingsPage = () => {
    const router = useRouter();

    // Clerk Auth
    const { isLoaded, userId } = useAuth();
    const { user } = useUser();

    // --------------------------------------------------------------------------
    // Page & Form States
    // --------------------------------------------------------------------------
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Existing fields (from Clerk user)
    const [displayName, setDisplayName] = useState(user?.fullName ?? "");
    const [email, setEmail] = useState(user?.emailAddresses[0]?.emailAddress ?? "");

    // New fields
    const [companyName, setCompanyName] = useState("");
    const [employerPasskey, setEmployerPasskey] = useState("");
    const [employeePasskey, setEmployeePasskey] = useState("");
    const [staffCount, setStaffCount] = useState("");

    // --------------------------------------------------------------------------
    // Popup (Modal) Management
    // --------------------------------------------------------------------------
    const [popupVisible, setPopupVisible] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");
    const [redirectPath, setRedirectPath] = useState("");

    // A helper to show a popup without redirect
    const showPopup = (message: string) => {
        setPopupMessage(message);
        setRedirectPath("");
        setPopupVisible(true);
    };

    // A helper to show a popup *and* redirect after closing
    const showPopupAndRedirect = (message: string, path: string) => {
        setPopupMessage(message);
        setRedirectPath(path);
        setPopupVisible(true);
    };

    // Called when user clicks "OK" on the popup
    const handlePopupClose = () => {
        setPopupVisible(false);
        if (redirectPath) {
            router.push(redirectPath);
        }
    };

    // --------------------------------------------------------------------------
    // Fetch & Validate on Mount
    // --------------------------------------------------------------------------
    useEffect(() => {
        if (!isLoaded) return;

        if (!userId) {
            // Show popup and redirect home
            showPopupAndRedirect("Authentication failed! No user found.", "/");
            return;
        }

        const checkEmployerAndFetchCompany = async () => {
            try {
                // 1) Verify the user is an employer
                const response = await fetch("/api/employerAuth", {
                    method: "GET",
                });

                if (response.status === 300) {
                    router.push("/employee/pending-approval");
                    return;
                } else if (!response.ok) {
                    window.alert("Authentication failed! You are not an employer.");
                    router.push("/");
                    return;
                }

                // 2) Fetch company info
                const companyResponse = await fetch("/api/fetchCompany", {
                    method: "GET",
                });

                if (!companyResponse.ok) {
                    throw new Error("Failed to fetch company info");
                }

                const rawData: unknown = await companyResponse.json();
                if (typeof rawData !== "object") {
                    throw new Error("Invalid response from server");
                }

                const data = rawData as Company;

                setCompanyName(data.name ?? "");
                setEmployerPasskey(data.employerpasskey ?? "");
                setEmployeePasskey(data.employeepasskey ?? "");
                setStaffCount(data.numberOfEmployees ?? "");

                setDisplayName(user?.fullName ?? "");
                setEmail(user?.emailAddresses[0]?.emailAddress ?? "");
            } catch (error) {
                console.error("Error:", error);
                showPopupAndRedirect("Something went wrong. Redirecting you home.", "/");
            } finally {
                setLoading(false);
            }
        };

        void checkEmployerAndFetchCompany();
    }, [isLoaded, userId, user, router]);

    // --------------------------------------------------------------------------
    // Save Handler
    // --------------------------------------------------------------------------
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch("/api/updateCompany", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: companyName,
                    employerPasskey,
                    employeePasskey,
                    numberOfEmployees: staffCount,
                }),
            });

            const result: { success?: boolean; message?: string } | null = await response
                .json()
                .catch(() => null) as { success?: boolean; message?: string } | null;

            if (!response.ok || result?.success !== true) {
                throw new Error(result?.message ?? "Error updating settings");
            }

            showPopup(result?.message ?? "Company settings saved!");
        } catch (error) {
            console.error(error);
            showPopup(error instanceof Error ? error.message : "Failed to update settings. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // --------------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------------
    if (loading) {
        return <LoadingPage />;
    }

    return (
        <div className={styles.container}>
            {/* Navbar */}
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

            {/* Child Form Component */}
            <SettingsForm
                displayName={displayName}
                email={email}
                companyName={companyName}
                employerPasskey={employerPasskey}
                employeePasskey={employeePasskey}
                staffCount={staffCount}
                isSaving={isSaving}
                onCompanyNameChange={setCompanyName}
                onEmployerPasskeyChange={setEmployerPasskey}
                onEmployeePasskeyChange={setEmployeePasskey}
                onStaffCountChange={setStaffCount}
                onSave={handleSave}
            />

            {/* Child Popup Component */}
            <PopupModal
                visible={popupVisible}
                message={popupMessage}
                onClose={handlePopupClose}
            />
        </div>
    );
};

export default SettingsPage;
