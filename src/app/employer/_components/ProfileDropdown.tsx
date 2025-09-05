"use client";
import React, { useRef, useEffect } from "react";
import styles from "~/styles/Employer/ProfileDropdown.module.css";
import {
    UserButton
} from '@clerk/nextjs'


const ProfileDropdown: React.FC = () => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                return;
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <div className={styles.dropdownContainer} ref={dropdownRef}>
            <UserButton />
        </div>
    );
};

export default ProfileDropdown;