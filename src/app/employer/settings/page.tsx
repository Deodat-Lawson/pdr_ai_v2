"use client";

import React, { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Brain, Home } from "lucide-react";

// Child Components
import SettingsForm from "~/app/employer/settings/SettingsForm";
import PopupModal from "~/app/employer/settings/PopupModal";

// Loading component
import LoadingPage from "~/app/_components/loading";

// Styles
import styles from "../../../styles/employersettings.module.css";

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
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
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
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });

                if (!companyResponse.ok) {
                    throw new Error("Failed to fetch company info");
                }

                const rawData: unknown = await companyResponse.json();
                if (typeof rawData !== "object") {
                    throw new Error("Invalid response from server");
                }

                // Our expected response shape is:
                // {
                //   data: [
                //     {
                //       name: string;
                //       employerpasskey: string;
                //       employeepasskey: string;
                //       numberOfEmployees: string;
                //     }
                //   ];
                // }
                const data = rawData as {
                    data: {
                        name: string;
                        employerpasskey: string;
                        employeepasskey: string;
                        numberOfEmployees: string;
                    }[];
                };

                if (!data.data || data.data.length === 0) {
                    throw new Error("No company data found");
                }

                const company = data.data[0];
                setCompanyName(company.name ?? "");
                setEmployerPasskey(company.employerpasskey ?? "");
                setEmployeePasskey(company.employeepasskey ?? "");
                setStaffCount(company.numberOfEmployees ?? "");

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
                    userId,
                    name: companyName,
                    employerPasskey,
                    employeePasskey,
                    numberOfEmployees: staffCount,
                }),
            });

            if (!response.ok) {
                throw new Error("Error updating settings");
            }

            showPopup("Company settings saved!");
        } catch (error) {
            console.error(error);
            showPopup("Failed to update settings. Please try again.");
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
                    <button
                        onClick={() => router.push("/employer/home")}
                        className={styles.homeButton}
                    >
                        <Home className={styles.homeIcon} />
                        Home
                    </button>
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