"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import NavBar from "./NavBar";
import EmployeeTable from "./CurrentEmployeeTable";
import PendingEmployeeTable from "./PendingEmployeeTable";

import { type Employee } from "./types";
import LoadingPage from "~/app/_components/loading";

import styles from "~/styles/Employer/EmployeeManagement.module.css";

const ManageEmployeesPage: React.FC = () => {
    const { isLoaded, userId } = useAuth();
    const router = useRouter();
    const [userRole, setUserRole] = useState("employer" as "owner" | "employer");
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);

    const loadEmployees = useCallback(async () => {
        try {
            const res = await fetch("/api/getAllEmployees", {
                method: "GET",
            });

            const rawData: unknown = await res.json();
            if (Array.isArray(rawData)) {
                const data = rawData as Employee[];
                
                const approved = data.filter((emp) => emp.status === "verified");
                const pending = data.filter((emp) => emp.status === "pending");

                setEmployees(approved);
                setPendingEmployees(pending);
            } else {
                console.error("Invalid employee data received");
                setEmployees([]);
                setPendingEmployees([]);
            }
        } catch (error) {
            console.error("Error loading employees:", error);
        }
    }, []);

    useEffect(() => {
        if (!isLoaded || !userId) return;

        const checkRole = async () => {
            try {
                const response = await fetch("/api/fetchUserInfo", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });

                if (!response.ok) {
                    window.alert("Authentication failed! No user found.");
                    router.push("/");
                    return;
                }

                const rawData: unknown = await response.json();
                const data = rawData as { role?: string };
                const roleFromServer = data?.role;

                if (roleFromServer === "employer" || roleFromServer === "owner") {
                    setUserRole(roleFromServer);
                    await loadEmployees();
                } else {
                    window.alert("Authentication failed! You are not an employer or owner.");
                    router.push("/");
                }
            } catch (error) {
                console.error("Error checking role:", error);
                window.alert("Authentication failed! You are not an employer or owner.");
                router.push("/");
            } finally {
                setLoading(false);
            }
        };

        checkRole().catch(console.error);
    }, [isLoaded, userId, router, loadEmployees]);

    const handleRemoveEmployee = async (employeeId: string) => {
        try {
            await fetch("/api/removeEmployees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employeeId }),
            });

            await loadEmployees();
        } catch (error) {
            console.error("Error removing employee:", error);
        }
    };

    const handleApproveEmployee = async (employeeId: string) => {
        try {
            await fetch("/api/approveEmployees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employeeId }),
            });

            await loadEmployees();
        } catch (error) {
            console.error("Error approving employee:", error);
        }
    };

    if (loading) {
        return <LoadingPage />;
    }

    return (
        <div className={styles.container}>
            <NavBar />

            <main className={styles.main}>
                <h1 className={styles.welcomeTitle}>Manage Employees</h1>

                <section className={styles.employeeSection}>
                    <h2 className={styles.sectionTitle}>All Employees</h2>
                    <EmployeeTable
                        employees={employees}
                        onRemove={handleRemoveEmployee}
                        currentUserRole={userRole} 
                    />
                </section>

                <section className={styles.employeeSection}>
                    <h2 className={styles.sectionTitle}>Pending Approvals</h2>
                    <PendingEmployeeTable
                        employees={pendingEmployees}
                        onApprove={handleApproveEmployee}
                        onRemove={handleRemoveEmployee}
                    />
                </section>
            </main>
        </div>
    );
};

export default ManageEmployeesPage;