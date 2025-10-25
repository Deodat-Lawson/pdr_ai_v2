"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import SignInForm from "~/app/signup/employer/SignInForm";
import SignUpForm from "~/app/signup/employer/SignUpForm";
import styles from "../../../styles/Employer/Signup.module.css";
import { SignupNavbar } from "~/app/_components/SignupNavbar";
import { ClerkProvider } from "@clerk/nextjs";

interface SignInFormData {
    companyName: string;
    managerPasscode: string;
}
interface SignInFormErrors {
    companyName?: string;
    managerPasscode?: string;
}

interface SignUpFormData {
    companyName: string;
    managerPasscode: string;
    managerPasscodeConfirm: string;
    employeePasscode: string;
    employeePasscodeConfirm: string;
    staffCount: string;
}
interface SignUpFormErrors {
    companyName?: string;
    managerPasscode?: string;
    managerPasscodeConfirm?: string;
    employeePasscode?: string;
    employeePasscodeConfirm?: string;
    staffCount?: string;
}

const EmployerSignup: React.FC = () => {
    const router = useRouter();
    const { userId } = useAuth();
    const { user } = useUser();
    const [isSignIn, setIsSignIn] = useState(false);
    const [signInFormData, setSignInFormData] = useState<SignInFormData>({
        companyName: "",
        managerPasscode: "",
    });
    const [signInErrors, setSignInErrors] = useState<SignInFormErrors>({});
    const [showSignInPassword, setShowSignInPassword] = useState(false);

    const handleSignInChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSignInFormData((prev) => ({ ...prev, [name]: value }));
        // Clear error on user input
        if (signInErrors[name as keyof SignInFormErrors]) {
            setSignInErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    };

    const validateSignInForm = (): boolean => {
        const errors: SignInFormErrors = {};
        if (!signInFormData.companyName.trim()) {
            errors.companyName = "Company name is required";
        }
        if (!signInFormData.managerPasscode) {
            errors.managerPasscode = "Manager passkey is required";
        }
        setSignInErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const submitSignIn = async () => {
        if (!userId) return;
        if( !user ) return;

        const response = await fetch("/api/signup/employer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                name: user?.fullName,
                email: user?.emailAddresses[0]?.emailAddress,
                companyName: signInFormData.companyName,
                employeePasskey: signInFormData.managerPasscode,
            }),
        });

        if (response.status === 400) {
            const rawData: unknown = await response.json();
            if (typeof rawData === "object" && rawData !== null && "error" in rawData) {
                const errorData = rawData as { error: string };
                setSignInErrors((prev) => ({ ...prev, managerPasscode: errorData.error }));
            } else {
                setSignInErrors((prev) => ({ ...prev, managerPasscode: "Registration failed" }));
            }
            return;
        }
        router.push("/employer/home");
    };

    const handleSignInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Sign in form data:", signInFormData);
        if (!validateSignInForm()) return;
        console.log("Sign in form ready to submit");
        await submitSignIn();
    };

    const [signUpFormData, setSignUpFormData] = useState<SignUpFormData>({
        companyName: "",
        managerPasscode: "",
        managerPasscodeConfirm: "",
        employeePasscode: "",
        employeePasscodeConfirm: "",
        staffCount: "",
    });
    const [signUpErrors, setSignUpErrors] = useState<SignUpFormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [showSignUpPasswords, setShowSignUpPasswords] = useState({
        manager: false,
        managerConfirm: false,
        employee: false,
        employeeConfirm: false,
    });

    const handleSignUpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSignUpFormData((prev) => ({ ...prev, [name]: value }));
        if (signUpErrors[name as keyof SignUpFormErrors]) {
            setSignUpErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    };

    const validateSignUpForm = (): boolean => {
        const errors: SignUpFormErrors = {};
        if (!signUpFormData.companyName.trim()) {
            errors.companyName = "Company name is required";
        }
        if (signUpFormData.managerPasscode.length < 8) {
            errors.managerPasscode = "Manager passkey must be at least 8 characters";
        }
        if (signUpFormData.managerPasscode !== signUpFormData.managerPasscodeConfirm) {
            errors.managerPasscodeConfirm = "Manager passkeys do not match";
        }
        if (signUpFormData.employeePasscode.length < 8) {
            errors.employeePasscode = "Employee passkey must be at least 8 characters";
        }
        if (
            signUpFormData.employeePasscode !== signUpFormData.employeePasscodeConfirm
        ) {
            errors.employeePasscodeConfirm = "Employee passkeys do not match";
        }
        if (!signUpFormData.staffCount) {
            errors.staffCount = "Please enter approximate staff count";
        }
        setSignUpErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const submitSignUp = async () => {
        if (!userId || !user) {
            console.error("User not authenticated. userId:", userId, "user:", user);
            setSignUpErrors((prev) => ({ 
                ...prev, 
                companyName: "Please sign in with Clerk first to create an account" 
            }));
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch("/api/signup/employerCompany", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: userId,
                    name: user?.fullName,
                    email: user?.emailAddresses[0]?.emailAddress,
                    companyName: signUpFormData.companyName,
                    employerPasskey: signUpFormData.managerPasscode,
                    employeePasskey: signUpFormData.employeePasscode,
                    numberOfEmployees: signUpFormData.staffCount,
                }),
            });

            if (response.status === 400) {
                const rawData: unknown = await response.json();
                if (typeof rawData === "object" && rawData !== null && "error" in rawData) {
                    const errorData = rawData as { error: string };
                    setSignUpErrors((prev) => ({ ...prev, companyName: errorData.error }));
                } else {
                    setSignUpErrors((prev) => ({ ...prev, companyName: "Registration failed" }));
                }
                setIsSubmitting(false);
                return;
            }
            
            if (!response.ok) {
                setSignUpErrors((prev) => ({ ...prev, companyName: "Registration failed. Please try again." }));
                setIsSubmitting(false);
                return;
            }

            router.push("/employer/home");
        } catch (error) {
            console.error("Sign up error:", error);
            setSignUpErrors((prev) => ({ ...prev, companyName: "Registration failed. Please check your connection." }));
            setIsSubmitting(false);
        }
    };

    const handleSignUpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateSignUpForm()) return;
        await submitSignUp();
    };

    // Helper to toggle each password field in SignUp
    const toggleSignUpPassword = (
        field: keyof typeof showSignUpPasswords
    ) => {
        setShowSignUpPasswords((prev) => ({
            ...prev,
            [field]: !prev[field],
        }));
    };

    return (
        <ClerkProvider>
            <div className={styles.container}>
                <SignupNavbar />

                <main className={styles.main}>
                <div className={styles.formContainer}>
                    <div className={styles.authToggle}>
                        <button
                            type="button"
                            className={`${styles.toggleButton} ${!isSignIn ? styles.active : ""}`}
                            onClick={() => setIsSignIn(false)}
                        >
                            Sign Up
                        </button>
                        <button
                            type="button"
                            className={`${styles.toggleButton} ${isSignIn ? styles.active : ""}`}
                            onClick={() => setIsSignIn(true)}
                        >
                            Sign In
                        </button>
                    </div>

                    <h1 className={styles.title}>
                        {isSignIn ? "Employer Sign In" : "Owner Registration"}
                    </h1>
                    <p className={styles.subtitle}>
                        {isSignIn
                            ? "Welcome back! Sign in to your company account"
                            : "Create your company account"}
                    </p>

                    {isSignIn ? (
                        <SignInForm
                            formData={signInFormData}
                            errors={signInErrors}
                            showPassword={showSignInPassword}
                            onChange={handleSignInChange}
                            onSubmit={handleSignInSubmit}
                            onTogglePassword={() => setShowSignInPassword(!showSignInPassword)}
                        />
                    ) : (
                        <SignUpForm
                            formData={signUpFormData}
                            errors={signUpErrors}
                            showPasswords={showSignUpPasswords}
                            onChange={handleSignUpChange}
                            onSubmit={handleSignUpSubmit}
                            onTogglePassword={toggleSignUpPassword}
                            isSubmitting={isSubmitting}
                        />
                    )}
                </div>
            </main>
            </div>
        </ClerkProvider>
    );
};

export default EmployerSignup;