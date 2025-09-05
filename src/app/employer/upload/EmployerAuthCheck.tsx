"use client";

import React, { useState, useEffect, type PropsWithChildren } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import LoadingPage from "~/app/_components/loading";

interface EmployerAuthCheckProps {
    onAuthSuccess: (userId: string) => void;
}

const EmployerAuthCheck: React.FC<PropsWithChildren<EmployerAuthCheckProps>> = ({
                                                                                    onAuthSuccess,
                                                                                    children,
                                                                                }) => {
    const { isLoaded, userId } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded) return;

        if (!userId) {
            alert("Authentication failed! No user found.");
            router.push("/");
            return;
        }

        const checkEmployerRole = async () => {
            try {
                const response = await fetch("/api/employerAuth", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userId }),
                });
                if (!response.ok) {
                    alert("Authentication failed! You are not an employer.");
                    router.push("/");
                    return;
                }

                // If everything is okay, fetch categories or do any post-auth success logic.
                onAuthSuccess(userId);
            } catch (error) {
                console.error("Error checking employer role:", error);
                alert("Authentication failed! You are not an employer.");
                router.push("/");
            } finally {
                setLoading(false);
            }
        };

        checkEmployerRole().catch(console.error);
    }, [isLoaded, userId, router, onAuthSuccess]);

    if (loading) {
        return <LoadingPage />;
    }

    return <>{children}</>;
};

export default EmployerAuthCheck;
