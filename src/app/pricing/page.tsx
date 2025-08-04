import Link from "next/link";
import React from 'react';
import { Brain, Check, ArrowRight, Users, Building2, Shield, Zap, Heart, Award, GraduationCap } from 'lucide-react';
import styles from '../../styles/pricing.module.css';
import {
    ClerkProvider,
    SignUpButton,
} from '@clerk/nextjs'

export default function PricingPage() {
    return (
        <ClerkProvider>
            <div className={styles.container}>
                {/* Navigation */}
                <nav className={styles.navContainer}>
                    <div className={styles.navContent}>
                        <div className={styles.navWrapper}>
                            <Link href="/" className={styles.logoContainer}>
                                <Brain className={styles.iconPurple} />
                                <span className={styles.logoText}>PDR AI</span>
                            </Link>
                            <div className={styles.navLinks}>
                                <Link href="/">
                                    <button className={`${styles.btn} ${styles.btnGhost}`}>
                                        Home
                                    </button>
                                </Link>
                                <Link href="/contact">
                                    <button className={`${styles.btn} ${styles.btnGhost}`}>
                                        Contact Support
                                    </button>
                                </Link>
                                <SignUpButton>
                                    <button className={`${styles.btn} ${styles.btnPrimary}`}>
                                        Get Started
                                    </button>
                                </SignUpButton>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <div className={styles.heroSection}>
                    <div className={styles.heroContent}>
                        <h1 className={styles.heroTitle}>
                            Simple, Transparent Pricing
                        </h1>
                        <p className={styles.heroDescription}>
                            PDR AI is completely free to use, made possible by Johns Hopkins University
                        </p>
                    </div>
                </div>

                {/* Sponsorship Section */}
                <div className={styles.sponsorshipSection}>
                    <div className={styles.sponsorshipContainer}>
                        <div className={styles.sponsorshipContent}>
                            <div className={styles.sponsorshipBadge}>
                                <Heart className={styles.heartIcon} />
                                <span>Proudly Sponsored By</span>
                            </div>
                            <div className={styles.universityLogo}>
                                <div className={styles.logoPlaceholder}>
                                    <img 
                                        src="https://h0xotvuawi.ufs.sh/f/KSLubuOGoQY2bwMRkW2r4k1ug2cIMO7AxhWZJm08SoX5VeYq" 
                                        alt="Johns Hopkins University" 
                                        width={100} 
                                        height={100}
                                        className="rounded-lg"
                                    />
                                    <div className={styles.universityText}>
                                        <h3>Johns Hopkins University</h3>
                                    </div>
                                </div>
                            </div>
                            <p className={styles.sponsorshipDescription}>
                                This project is made possible through the generous support of Johns Hopkins University's 
                                commitment to advancing AI research and providing cutting-edge tools to professionals worldwide.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Pricing Card */}
                <div className={styles.pricingSection}>
                    <div className={styles.pricingContainer}>
                        <div className={styles.pricingCard}>
                            <div className={styles.cardHeader}>
                                <div className={styles.planBadge}>
                                    <Award className={styles.awardIcon} />
                                    <span>Free Forever</span>
                                </div>
                                <h2 className={styles.planTitle}>Complete Access</h2>
                                <div className={styles.priceContainer}>
                                    <span className={styles.price}>$0</span>
                                    <span className={styles.priceSubtext}>forever</span>
                                </div>
                                <p className={styles.planDescription}>
                                    Full access to all PDR AI features with no limitations, no trial periods, and no hidden costs.
                                </p>
                            </div>

                            <div className={styles.featuresContainer}>
                                <h3 className={styles.featuresTitle}>Everything Included:</h3>
                                <ul className={styles.featuresList}>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>Unlimited Document Analysis</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>Predictive Document Analysis</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>AI-Powered Q&A Engine</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>Company Management Tools</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>Employee Management System</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>Analytics & Insights Dashboard</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>Enterprise-Grade Security</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>24/7 Technical Support</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>No Usage Limits</span>
                                    </li>
                                    <li className={styles.featureItem}>
                                        <Check className={styles.checkIcon} />
                                        <span>Regular Feature Updates</span>
                                    </li>
                                </ul>
                            </div>

                            <div className={styles.ctaContainer}>
                                <SignUpButton>
                                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}>
                                        Get Started Now
                                    </button>
                                </SignUpButton>
                                <p className={styles.ctaSubtext}>
                                    No credit card required • Instant access • Always free
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Benefits */}
                <div className={styles.benefitsSection}>
                    <div className={styles.benefitsContainer}>
                        <h2 className={styles.benefitsTitle}>Why PDR AI is Free</h2>
                        <div className={styles.benefitsGrid}>
                            <div className={styles.benefitCard}>
                                <GraduationCap className={styles.benefitIcon} />
                                <h3 className={styles.benefitTitle}>Academic Mission</h3>
                                <p className={styles.benefitDescription}>
                                    Supported by Johns Hopkins University to advance AI research and provide valuable tools to the professional community.
                                </p>
                            </div>
                            <div className={styles.benefitCard}>
                                <Users className={styles.benefitIcon} />
                                <h3 className={styles.benefitTitle}>Community Impact</h3>
                                <p className={styles.benefitDescription}>
                                    Our goal is to democratize access to advanced AI document analysis tools for organizations of all sizes.
                                </p>
                            </div>
                            <div className={styles.benefitCard}>
                                <Brain className={styles.benefitIcon} />
                                <h3 className={styles.benefitTitle}>Research & Innovation</h3>
                                <p className={styles.benefitDescription}>
                                    User feedback helps improve our AI models and contributes to cutting-edge research in document analysis.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ClerkProvider>
    );
} 