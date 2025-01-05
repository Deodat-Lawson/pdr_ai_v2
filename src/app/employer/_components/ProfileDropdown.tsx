"use client";
import React, { useState, useRef, useEffect } from "react";
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs";
import { User } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "../../../styles/employerprofiledropdown.module.css";
import {
    UserButton
} from '@clerk/nextjs'


const ProfileDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user } = useUser();          // Clerk user object
    const { signOut } = useClerk();      // Clerk sign-out method
    const router = useRouter();

    // Close the dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleToggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleSettings = () => {
        router.push("/fetchDocument/settings");
        setIsOpen(false);
    };

    const handleLogout = async () => {
        await signOut();
        router.push("/");
    };

    return (
        <div className={styles.dropdownContainer} ref={dropdownRef}>
           <UserButton />
        </div>
    );
};

export default ProfileDropdown;