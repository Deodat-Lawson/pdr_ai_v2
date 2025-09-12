"use client";
import React, { useState, useEffect } from "react";
import { Upload, FileText, BarChart, Brain, Settings, Users } from "lucide-react";
import styles from "~/styles/Employer/Home.module.css";
import { useRouter } from "next/navigation";
import ProfileDropdown from "~/app/employer/_components/ProfileDropdown";
import { useAuth } from "@clerk/nextjs";
import LoadingPage from "~/app/_components/loading";

const HomeScreen = () => {
    const router = useRouter();

    // check if authorized. If not authorized as employer, return home
    const { isLoaded, userId } = useAuth();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded) return;
        // If there is no user at all, send them home
        if (!userId) {
            window.alert("Authentication failed! No user found.");
            router.push("/");
            return;
        }

        // Check if the user’s role is employer
        const checkEmployerRole = async () => {
            try {
                const response = await fetch("/api/employerAuth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });
                if(response.status === 300){
                    router.push("/employee/pending-approval");
                    return;
                }
                else if (!response.ok) {
                    // If the endpoint returns an error, also redirect
                    window.alert("Authentication failed! You are not an employer.");
                    router.push("/");
                    return;
                }
            } catch (error) {
                console.error("Error checking employer role:", error);
                // If there is any error, also redirect or handle appropriately
                window.alert("Authentication failed! You are not an employer.");
                router.push("/");
            } finally {
                setLoading(false);
            }
        };

        checkEmployerRole().catch(console.error);
    }, [userId, router, isLoaded]);

    // Updated menu options with Manage Employees
    const menuOptions = [
        {
            icon: <Upload className={styles.menuIcon} />,
            title: "Upload Documents",
            description: "Add new documents to the database for AI analysis",
            path: "/employer/upload",
        },
        {
            icon: <FileText className={styles.menuIcon} />,
            title: "View Documents",
            description: "Browse and manage your uploaded documents",
            path: "/employer/documents",
        },
        {
            icon: <BarChart className={styles.menuIcon} />,
            title: "Document Statistics",
            description: "View analytics and insights about document usage",
            path: "/unavailable",
        },
        {
            icon: <Users className={styles.menuIcon} />,
            title: "Manage Employees",
            description: "View and manage employees in your organization",
            path: "/employer/employees", 
        },
        {
            icon: <Settings className={styles.menuIcon} />,
            title: "User Settings",
            description: "Manage your profile, preferences, and account details",
            path: "/employer/settings",
        },
    ];

    const handleNavigation = (path: string) => {
        router.push(path);
    };

    if (loading) {
        return <LoadingPage />;
    }

    return (
        <div className={styles.container}>
            <nav className={styles.navbar}>
                <div className={styles.navContent}>
                    <div className={styles.logoContainer}>
                        <Brain className={styles.logoIcon} />
                        <span className={styles.logoText}>PDR AI</span>
                    </div>
                    <ProfileDropdown />
                </div>
            </nav>
            <main className={styles.main}>
                <div className={styles.welcomeSection}>
                    <h1 className={styles.welcomeTitle}>Welcome to PDR AI</h1>
                    <p className={styles.welcomeText}>
                        Your AI integrated document management assistant and interpreter. Choose an option below
                        to get started.
                    </p>
                </div>

                <div className={styles.menuGrid}>
                    {menuOptions.map((option, index) => (
                        <div
                            key={index}
                            className={styles.menuCard}
                            onClick={() => handleNavigation(option.path)}
                            role="button"
                            tabIndex={0}
                        >
                            <div className={styles.iconContainer}>{option.icon}</div>
                            <h2 className={styles.menuTitle}>{option.title}</h2>
                            <p className={styles.menuDescription}>{option.description}</p>
                            <div className={styles.cardFooter}>
                                <span className={styles.getStarted}>Get Started</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default HomeScreen;
