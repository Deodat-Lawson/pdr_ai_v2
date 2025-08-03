import Link from "next/link";
import React, {FC, ReactNode} from 'react';
import { FileText, Brain, Zap, ArrowRight, Check } from 'lucide-react';
import styles from '../styles/home.module.css';

import {
    ClerkProvider,
    SignInButton,
    SignUpButton,
    SignedIn,
    SignedOut,
    UserButton
} from '@clerk/nextjs'


interface FeatureCardProps {
    icon: ReactNode;
    title: string;
    description: string;
}

interface BenefitItemProps {
    text: string;
}


export default function HomePage() {
    return (
        <ClerkProvider>
            <div className={styles['documind-container']}>
                {/* Navigation */}
                <nav className={styles["nav-container"]}>
                    <div className={styles["nav-content"]}>
                        <div className={styles["nav-wrapper"]}>
                            <div className={styles["logo-container"]}>
                                <Brain className={styles["icon-purple"]} />
                                <span className={styles["logo-text"]}>PDR AI</span>
                            </div>
                            <div className={styles["nav-links"]}>
                                {/* Link to /features page */}
                                {/*<Link href="/unavailable">*/}
                                {/*    <button className={`${styles.btn} ${styles["btn-ghost"]}`}>*/}
                                {/*        Features*/}
                                {/*    </button>*/}
                                {/*</Link>*/}

                                {/* Link to /pricing page */}
                                <Link href="/unavailable">
                                    <button className={`${styles.btn} ${styles["btn-ghost"]}`}>
                                        Pricing
                                    </button>
                                </Link>


                                {/* Contact us */}
                                <Link href="/contact">
                                    <button className={`${styles.btn} ${styles["btn-ghost"]}`}>
                                        Contact Support
                                    </button>
                                </Link>
                                
                                {/* Link to /about page */}
                                {/*<Link href="/about">*/}
                                {/*    <button className={`${styles.btn} ${styles["btn-ghost"]}`}>*/}
                                {/*        About*/}
                                {/*    </button>*/}
                                {/*</Link>*/}

                                {/* Link to /get-started page */}
                                <SignUpButton>
                                    <button className={`${styles.btn} ${styles["btn-primary"]}`}>
                                        Get Started
                                    </button>
                                </SignUpButton>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <div className={styles['hero-section']}>
                    <div className={styles['hero-content']}>
                        <h1 className={styles['hero-title']}>
                            Professional Document Reader AI
                        </h1>
                        <p className={styles['hero-description']}>
                            Instantly analyze, interpret, and extract insights from professional documents using advanced AI technology.
                        </p>
                        <div className={styles['hero-buttons']}>
                            <SignUpButton>
                                <button className={`${styles.btn} ${styles['btn-primary']} ${styles['btn-lg']}`}>
                                    Try For Free
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </button>
                            </SignUpButton>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className={styles['features-section']}>
                    <div className={styles['features-container']}>
                        <h2 className={styles['features-title']}>
                            Powerful Features
                        </h2>
                        <div className={styles['features-grid']}>
                            <FeatureCard
                                icon={<FileText className={styles['icon-purple']} />}
                                title="Professional Document Analysis"
                                description="Advanced AI algorithms analyze your documents in seconds, extracting key information and insights automatically."
                            />
                            <FeatureCard
                                icon={<Zap className={styles['icon-purple']} />}
                                title="AI Reinforced interpretation"
                                description="Get immediate understanding of complex documents with AI-powered summaries and explanations."
                            />
                            <FeatureCard
                                icon={<Brain className={styles['icon-purple']} />}
                                title="Q&As and Search Engine"
                                description="AI powered Interpreter trained based on professional documents can answer specific questions and instructions on the document."
                            />
                        </div>
                    </div>
                </div>

                {/* Benefits Section */}
                <div className={styles['benefits-section']}>
                    <div className={styles['benefits-grid']}>
                        <div>
                            <h2 className={styles['benefits-title']}>
                                Why Choose PDR-AI?
                            </h2>
                            <div className={styles['benefits-list']}>
                                <BenefitItem text="Employees save up to 80% of time spent on reading professional documents" />
                                <BenefitItem text="Improved interpretationa with AI-powered accuracy" />
                                <BenefitItem text="Seamless integration with your existing workflow" />
                                <BenefitItem text="Enterprise-grade security and compliance" />
                                <BenefitItem text="24/7 support from our expert team" />
                            </div>
                        </div>
                        <div className={styles['demo-container']}>
                            <div className="aspect-w-16 aspect-h-9 bg-purple-200 rounded-lg"></div>
                        </div>
                    </div>
                </div>
            </div>
        </ClerkProvider>
    );
}

const FeatureCard: FC<FeatureCardProps> = ({ icon, title, description }) => (
    <div className={styles['feature-card']}>
        <div className={styles['feature-icon']}>
            {icon}
        </div>
        <h3 className={styles['feature-title']}>{title}</h3>
        <p className={styles['feature-description']}>{description}</p>
    </div>
);

const BenefitItem: FC<BenefitItemProps> = ({ text }) => (
    <div className={styles['benefit-item']}>
        <Check className={styles['icon-check']} />
        <span className={styles['benefit-text']}>{text}</span>
    </div>
);