"use client"

import React, { useEffect, useState } from 'react';
import { Brain, Clock, Building, Mail } from 'lucide-react';
import { useRouter } from "next/navigation"
import { useAuth } from "@clerk/nextjs";
import styles from '~/styles/Employee/PendingApproval.module.css';
import NavBar from "~/app/employer/employees/NavBar";

interface PendingApprovalProps {
    name?: string;
    email?: string;
    company?: string;
    submissionDate?: string;
}

const PendingApproval: React.FC<PendingApprovalProps> = () => {
    const router = useRouter();
    const { userId } = useAuth();

    const [currentEmployeeData, setCurrentEmployeeData] = useState<PendingApprovalProps>();

    // Fetch user data and populate state
    const checkEmployerRole = async () => {
        try {
            const response = await fetch("/api/fetchUserInfo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            // Parse the returned data and set it to state
            const rawData: unknown = await response.json();
            console.log("Raw data:", rawData);
            const data = rawData as PendingApprovalProps
            console.log("Employee data:", data);


            setCurrentEmployeeData({
                name: data?.name,
                email: data?.email,
                company: data?.company,
                submissionDate: data?.submissionDate,
            });
        } catch (error) {
            console.error("Error checking employee role:", error);
            window.alert("Authentication failed! You are not an employee.");
            router.push("/");
        }
    };

    // Run the check on mount
    useEffect(() => {
        if (userId) {
            checkEmployerRole().catch(console.error);
        }
    }, [userId]);


    return (
        <div className={styles.container}>
            {/* Navigation */}
            <NavBar />

            <main className={styles.main}>
                <div className={styles.statusCard}>
                    {/* Status Icon */}
                    <div className={styles.statusIconContainer}>
                        <Clock className={styles.statusIcon} />
                    </div>

                    {/* Status Message */}
                    <h1 className={styles.title}>Pending Approval</h1>
                    <p className={styles.subtitle}>
                        Your account is currently awaiting approval from your employer
                    </p>

                    {/* Application Details */}
                    <div className={styles.detailsContainer}>
                        <h2 className={styles.detailsTitle}>Application Details</h2>

                        <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <Building className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>Company</span>
                                    <span className={styles.detailValue}>{currentEmployeeData?.company ?? ""}</span>
                                </div>
                            </div>

                            <div className={styles.detailItem}>
                                <Mail className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>Email</span>
                                    <span className={styles.detailValue}>{currentEmployeeData?.email ?? ""}</span>
                                </div>
                            </div>

                            <div className={styles.detailItem}>
                                <Clock className={styles.detailIcon} />
                                <div className={styles.detailContent}>
                                    <span className={styles.detailLabel}>Submission Date</span>
                                    <span className={styles.detailValue}>{currentEmployeeData?.submissionDate ?? ""}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notice */}
                    {/*<div className={styles.notice}>*/}
                    {/*    <AlertCircle className={styles.noticeIcon} />*/}
                    {/*    <p className={styles.noticeText}>*/}
                    {/*        You will receive an email notification once your account has been approved.*/}
                    {/*        This process typically takes 1-2 business days.*/}
                    {/*    </p>*/}
                    {/*</div>*/}

                    {/* Support Section */}
                    <div className={styles.supportSection}>
                        <p className={styles.supportText}>
                            Need assistance? Contact support at{' '}
                            <a href="mailto:pdraionline@gmail.com" className={styles.supportLink}>
                                pdraionline@gmail.com
                            </a>
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default PendingApproval;
