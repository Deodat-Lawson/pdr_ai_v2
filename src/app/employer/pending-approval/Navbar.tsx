"use client";

import React from "react";
import { Brain } from "lucide-react";
import styles from "~/styles/Employer/PendingApproval.module.css";
import ProfileDropdown from "~/app/employer/_components/ProfileDropdown";

const NavBar = () => {
    return (
        <nav className={styles.navbar}>
            <div className={styles.navContent}>
                <div className={styles.logoContainer}>
                    <Brain className={styles.logoIcon} />
                    <span className={styles.logoText}>PDR AI</span>
                </div>
                <ProfileDropdown />
            </div>
        </nav>
    );
};

export default NavBar;