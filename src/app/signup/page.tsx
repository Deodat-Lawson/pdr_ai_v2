"use client"

import React, { useState } from 'react';
import { Briefcase, Users, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from '~/styles/signup.module.css';
import { SignupNavbar } from '../_components/SignupNavbar';
import { ClerkProvider } from '@clerk/nextjs';

interface RoleCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    isSelected: boolean;
    onClick: () => void;
}

const RoleCard: React.FC<RoleCardProps> = ({
                                               title,
                                               description,
                                               icon,
                                               isSelected,
                                               onClick,
                                           }) => (
    <div
        className={`${styles.roleCard} ${isSelected ? styles.selected : ''}`}
        onClick={onClick}
        role="button"
        tabIndex={0}
    >
        <div className={styles.iconWrapper}>{icon}</div>
        <h2 className={styles.cardTitle}>{title}</h2>
        <p className={styles.cardDescription}>{description}</p>
    </div>
);

const RoleSelection: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<'employer' | 'employee' | null>(null);
    const router = useRouter(); // Now from 'next/navigation'

    const handleContinue = async () => {
        if (selectedRole === 'employee') {
            router.push('/signup/employee');
        } else if (selectedRole === 'employer') {
            router.push('/signup/employer');
        }
        else{
            router.push('/');
        }
    };

    return (
        <ClerkProvider>
            <div className={styles.container}>
                <SignupNavbar />

                <main className={styles.main}>
                <div className={styles.contentWrapper}>
                    <h1 className={styles.title}>Choose Your Role</h1>
                    <p className={styles.subtitle}>Select how you will be using PDR AI</p>

                    <div className={styles.cardsContainer}>
                        <RoleCard
                            title="I'm an Employer"
                            description="Upload and manage documents, track analytics, and oversee document processing"
                            icon={<Briefcase className={styles.cardIcon} />}
                            isSelected={selectedRole === 'employer'}
                            onClick={() => setSelectedRole('employer')}
                        />
                        <RoleCard
                            title="I'm an Employee"
                            description="Access and review documents and submit feedback."
                            icon={<Users className={styles.cardIcon} />}
                            isSelected={selectedRole === 'employee'}
                            onClick={() => setSelectedRole('employee')}
                        />
                    </div>
                    <button
                        className={`${styles.continueButton} ${selectedRole ? styles.active : ''}`}
                        onClick={handleContinue}
                        disabled={!selectedRole}
                    >
                        Continue
                        <ArrowRight className={styles.buttonIcon} />
                    </button>
                </div>
            </main>
            </div>
        </ClerkProvider>
    );
};

export default RoleSelection;