"use client";
import React, { useState, useRef, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import styles from "~/styles/Employer/ProfileDropdown.module.css";
import {
    UserButton
} from '@clerk/nextjs'


const ProfileDropdown: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { signOut } = useClerk();
    const router = useRouter();

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
        router.push("/employer/settings");
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