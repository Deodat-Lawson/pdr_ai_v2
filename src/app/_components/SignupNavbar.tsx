'use client';

import Link from "next/link";
import React from 'react';
import { Brain } from 'lucide-react';
import styles from '../../styles/navbar.module.css';
import { ThemeToggle } from './ThemeToggle';

export function SignupNavbar() {
    return (
        <nav className={styles.navContainer}>
            <div className={styles.navContent}>
                <div className={styles.navWrapper}>
                    <Link href="/" className={styles.logoContainer}>
                        <Brain className={styles.iconPurple} />
                        <span className={styles.logoText}>PDR AI</span>
                    </Link>
                    <div className={styles.navLinks}>
                        <ThemeToggle />
                    </div>
                </div>
            </div>
        </nav>
    );
}

