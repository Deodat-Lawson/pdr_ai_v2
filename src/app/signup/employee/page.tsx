"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { Eye, EyeOff, Lock, Building, Brain } from "lucide-react";
import styles from "~/styles/Employee/SignIn.module.css";

interface EmployeeSignInFormData {
    companyName: string;
    employeePasscode: string;
}

interface EmployeeSignInFormErrors {
    companyName?: string;
    employeePasscode?: string;
}

const EmployeeSignIn: React.FC = () => {
    const router = useRouter();
    const { userId } = useAuth();
    const { user } = useUser();

    // Form data state
    const [employeeSignInFormData, setEmployeeSignInFormData] =
        useState<EmployeeSignInFormData>({
            companyName: "",
            employeePasscode: "",
        });

    // Error state
    const [employeeSignInFormErrors, setEmployeeSignInFormErrors] =
        useState<EmployeeSignInFormErrors>({});

    // Toggle for password visibility
    const [showPassword, setShowPassword] = useState(false);

    // -------------------------------
    // Handle changes in form inputs
    // -------------------------------
    const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEmployeeSignInFormData((prev) => ({ ...prev, [name]: value }));

        // Clear the error on user input
        if (employeeSignInFormErrors[name as keyof EmployeeSignInFormErrors]) {
            setEmployeeSignInFormErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    };

    // -------------------------------
    // Validate the form
    // -------------------------------
    const validateSignInForm = (): boolean => {
        const newErrors: EmployeeSignInFormErrors = {};

        if (!employeeSignInFormData.companyName.trim()) {
            newErrors.companyName = "Company name is required";
        }

        if (!employeeSignInFormData.employeePasscode.trim()) {
            newErrors.employeePasscode = "Employee passcode is required";
        }

        setEmployeeSignInFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // -------------------------------
    // Submit the sign-in to the backend
    // -------------------------------
    const submitSignIn = async () => {
        if (!userId) return;
        if( !user ) return;


        const response = await fetch("/api/signup/employee", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                name: user?.fullName,
                email: user?.emailAddresses[0]?.emailAddress,
                companyName: employeeSignInFormData.companyName,
                employeePasskey: employeeSignInFormData.employeePasscode,
            }),
        });

        if (response.status === 400) {
            const rawData: unknown = await response.json();
            if (typeof rawData === "object" && rawData !== null && "error" in rawData) {
                const errorData = rawData as { error: string };
                setEmployeeSignInFormErrors((prev) => ({ ...prev, employeePasscode: errorData.error }));
            } else {
                setEmployeeSignInFormErrors((prev) => ({ ...prev, employeePasscode: "Registration failed" }));
            }
            return;
        }
        router.push("/employee/documents");
    };

    const handleSignInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateSignInForm()) return;
        await submitSignIn();
    };

    return (
        <div className={styles.container}>
            <nav className={styles.navbar}>
                <div className={styles.navContent}>
                    <div className={styles.logoContainer}>
                        <Brain className={styles.logoIcon} />
                        <span className={styles.logoText}>PDR AI</span>
                    </div>
                </div>
            </nav>

            <main className={styles.main}>
                <div className={styles.formContainer}>
                    <h1 className={styles.title}>Employee Sign In</h1>
                    <p className={styles.subtitle}>
                        Access your employee account below
                    </p>

                    <form onSubmit={handleSignInSubmit} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Company Name</label>
                            <div className={styles.inputWrapper}>
                                <Building className={styles.inputIcon} />
                                <input
                                    type="text"
                                    name="companyName"
                                    value={employeeSignInFormData.companyName}
                                    onChange={handleSignInChange}
                                    className={styles.input}
                                    placeholder="Enter company name"
                                />
                            </div>
                            {employeeSignInFormErrors.companyName && (
                                <span className={styles.error}>
                  {employeeSignInFormErrors.companyName}
                </span>
                            )}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Employee Passcode</label>
                            <div className={styles.inputWrapper}>
                                <Lock className={styles.inputIcon} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="employeePasscode"
                                    value={employeeSignInFormData.employeePasscode}
                                    onChange={handleSignInChange}
                                    className={styles.input}
                                    placeholder="Enter employee passcode"
                                />
                                <button
                                    type="button"
                                    className={styles.eyeButton}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className={styles.eyeIcon} />
                                    ) : (
                                        <Eye className={styles.eyeIcon} />
                                    )}
                                </button>
                            </div>
                            {employeeSignInFormErrors.employeePasscode && (
                                <span className={styles.error}>
                  {employeeSignInFormErrors.employeePasscode}
                </span>
                            )}
                        </div>

                        <button type="submit" className={styles.submitButton}>
                            Sign In
                        </button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EmployeeSignIn;