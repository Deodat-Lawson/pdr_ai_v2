"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

import NavBar from "./NavBar";
import EmployeeTable from "./CurrentEmployeeTable";
import PendingEmployeeTable from "./PendingEmployeeTable";

import { Employee } from "./types";
import LoadingPage from "~/app/_components/loading";

import styles from "~/styles/Employer/EmployeeManagement.module.css";

const ManageEmployeesPage: React.FC = () => {
    const { isLoaded, userId } = useAuth();
    const router = useRouter();
    const [userRole, setUserRole] = useState("employer" as "owner" | "employer");
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [pendingEmployees, setPendingEmployees] = useState<Employee[]>([]);

    useEffect(() => {
        if (!isLoaded) return;

        // If no user, redirect home
        if (!userId) {
            window.alert("Authentication failed! No user found.");
            router.push("/");
            return;
        }

        // Check if the user’s role is owner or employer
        const checkRole = async () => {
            try {
                const response = await fetch("/api/employerAuth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });

                // If the user is pending, redirect them to /employee/pending-approval
                if (response.status === 300) {
                    router.push("/employee/pending-approval");
                    return;
                }

                // If not OK, the user is not owner/employer => redirect
                if (!response.ok) {
                    window.alert("Authentication failed! You are not an employer or owner.");
                    router.push("/");
                    return;
                }

                // Parse the JSON, which should contain the user's role
                const rawData:unknown = await response.json();

                const data = rawData as { role: string };
                // e.g. data might look like { role: 'employer' } or { role: 'owner' }
                const roleFromServer = data.role;
                console.log(data)
                console.log(data.role)

                // Check if we actually get "owner" or "employer"
                if (roleFromServer === "owner" || roleFromServer === "employer") {
                    setUserRole(roleFromServer);
                    // Load employees if authorized
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
    }, [isLoaded, userId, router]);

    const loadEmployees = async () => {
        try {
            const res = await fetch(`/api/getAllEmployees?userId=${userId}`, {
                method: "GET",
            });

            if (!res.ok) {
                console.error("Error loading employees:", res.statusText);
                return;
            }
            const rawData:unknown = await res.json();

            const data: Employee[] = rawData as Employee[];

            // Separate approved from pending
            const approved = data.filter((emp) => emp.status === "verified");
            const pending = data.filter((emp) => emp.status === "pending");

            setEmployees(approved);
            setPendingEmployees(pending);
        } catch (error) {
            console.error("Error loading employees:", error);
        }
    };

    const handleRemoveEmployee = async (employeeId: string) => {
        try {
            await fetch("/api/removeEmployees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employeeId }),
            });
            // Refresh the lists
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
            // Refresh the lists
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

                {/* Approved Employees */}
                <section className={styles.employeeSection}>
                    <h2 className={styles.sectionTitle}>All Employees</h2>
                    <EmployeeTable
                        employees={employees}
                        onRemove={handleRemoveEmployee}
                        currentUserRole={userRole} // pass down 'owner' or 'employer'
                    />
                </section>

                {/* Pending Employees */}
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