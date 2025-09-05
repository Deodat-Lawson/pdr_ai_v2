import Link from "next/link";
import React, {type FC, type ReactNode} from 'react';
import { Brain, Zap, ArrowRight, Shield, Clock, Users, TrendingUp, Star, Search, BarChart3, Building2, FileSearch } from 'lucide-react';
import styles from '../styles/home.module.css';

import {
    ClerkProvider,
    SignUpButton,
} from '@clerk/nextjs'


interface FeatureCardProps {
    icon: ReactNode;
    title: string;
    description: string;
}

interface BenefitItemProps {
    icon: ReactNode;
    title: string;
    description: string;
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
                                {/* Link to /pricing page */}
                                <Link href="/pricing">
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
                            Transform how your team analyzes and interprets professional documents with cutting-edge AI technology. Features predictive document analysis, intelligent company management tools, and enterprise-grade security.
                        </p>
                        <div className={styles['hero-buttons']}>
                            <SignUpButton>
                                <button className={`${styles.btn} ${styles['btn-primary']} ${styles['btn-lg']}`}>
                                    Start Free Trial
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </button>
                            </SignUpButton>
                            <Link href="/contact">
                                <button className={`${styles.btn} ${styles['btn-outline']} ${styles['btn-lg']}`}>
                                    Schedule Demo
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Features Section */}    
                <div className={styles['features-section']}>
                    <div className={styles['features-container']}>
                        <h2 className={styles['features-title']}>
                            Powerful AI-Driven Features
                        </h2>
                        <p className={styles['features-subtitle']}>
                            Comprehensive document analysis and management platform designed for modern enterprises
                        </p>
                        <div className={styles['features-grid']}>
                            <FeatureCard
                                icon={<FileSearch className={styles['icon-purple']} />}
                                title="Predictive Document Analysis"
                                description="Advanced AI identifies missing documents, suggests related files, and predicts document requirements based on your existing content. Smart analysis reduces compliance risks and ensures completeness."
                            />
                            <FeatureCard
                                icon={<Building2 className={styles['icon-purple']} />}
                                title="Company Management Tools"
                                description="Comprehensive employee management system with role-based access control, document approval workflows, and team collaboration features designed for enterprise environments."
                            />
                            <FeatureCard
                                icon={<Brain className={styles['icon-purple']} />}
                                title="AI Q&A Engine"
                                description="Intelligent question-answering system trained on professional documents. Get instant answers with page references, context-aware responses, and detailed explanations."
                            />
                            <FeatureCard
                                icon={<BarChart3 className={styles['icon-purple']} />}
                                title="Analytics & Insights"
                                description="Real-time analytics dashboard tracking document usage, team productivity, AI accuracy metrics, and compliance status with detailed reporting capabilities."
                            />
                            <FeatureCard
                                icon={<Search className={styles['icon-purple']} />}
                                title="Smart Document Search"
                                description="Semantic search across all company documents with AI-powered content understanding. Find relevant information instantly with natural language queries."
                            />
                            <FeatureCard
                                icon={<Zap className={styles['icon-purple']} />}
                                title="Automated Processing"
                                description="Automated document categorization, content extraction, and workflow routing. Streamline document management with intelligent automation and bulk processing."
                            />
                        </div>
                    </div>
                </div>

                {/* Enhanced Benefits Section */}
                <div className={styles['benefits-section']}>
                    <div className={styles['benefits-grid']}>
                        <div className={styles['benefits-content']}>
                            <h2 className={styles['benefits-title']}>
                                Why Choose PDR-AI?
                            </h2>
                            <p className={styles['benefits-subtitle']}>
                                Join thousands of professionals who have transformed their document workflow with our comprehensive AI platform featuring predictive analysis and advanced company management.
                            </p>
                            <div className={styles['benefits-list']}>
                                <BenefitItem 
                                    icon={<Clock className={styles['benefit-icon']} />}
                                    title="Save 80% of Reading Time"
                                    description="Predictive document analysis automatically identifies missing documents and suggests relevant content, dramatically reducing manual review time"
                                />
                                <BenefitItem 
                                    icon={<TrendingUp className={styles['benefit-icon']} />}
                                    title="Predictive Compliance"
                                    description="AI-powered document analysis predicts potential compliance gaps and missing requirements before they become issues"
                                />
                                <BenefitItem 
                                    icon={<Users className={styles['benefit-icon']} />}
                                    title="Advanced Team Management"
                                    description="Comprehensive company management tools with role-based access, approval workflows, and team collaboration features"
                                />
                                <BenefitItem 
                                    icon={<Shield className={styles['benefit-icon']} />}
                                    title="Enterprise Security"
                                    description="Bank-level security with advanced user management, audit trails, and compliance reporting for regulated industries"
                                />
                                <BenefitItem 
                                    icon={<Star className={styles['benefit-icon']} />}
                                    title="24/7 Expert Support"
                                    description="Dedicated support team with expertise in document analysis, predictive AI, and enterprise document management"
                                />
                            </div>
                        </div>
                        
                        <div className={styles['demo-container']}>
                            <div className={styles['demo-card']}>
                                <div className={styles['demo-header']}>
                                    <h3 className={styles['demo-title']}>
                                        See PDR-AI in Action
                                    </h3>
                                    <p className={styles['demo-description']}>
                                        Watch how our predictive document analysis and company management tools transform complex workflows into streamlined operations.
                                    </p>
                                </div>
                                
                                <div className={styles['demo-visual']}>
                                    <span className={styles['demo-placeholder']}>
                                        Interactive Demo Coming Soon
                                    </span>
                                </div>
                                
                                <div className={styles['stats-grid']}>
                                    <div className={styles['stat-item']}>
                                        <div className={styles['stat-number']}>5k+</div>
                                        <div className={styles['stat-label']}>Documents Analyzed</div>
                                    </div>
                                    <div className={styles['stat-item']}>
                                        <div className={styles['stat-number']}>99%</div>
                                        <div className={styles['stat-label']}>Prediction Accuracy</div>
                                    </div>
                                    <div className={styles['stat-item']}>
                                        <div className={styles['stat-number']}>50+</div>
                                        <div className={styles['stat-label']}>Companies Managed</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Call to Action Section */}
                <div className={styles['cta-section']}>
                    <div className={styles['cta-container']}>
                        <h2 className={styles['cta-title']}>
                            Ready to Transform Your Document Workflow?
                        </h2>
                        <p className={styles['cta-description']}>
                            Experience the power of predictive document analysis and advanced company management tools. Join thousands of professionals who have revolutionized their document processes with PDR-AI.
                        </p>
                        <div className={styles['cta-buttons']}>
                            <SignUpButton>
                                <button className={`${styles.btn} ${styles['btn-lg']}`} style={{backgroundColor: 'white', color: '#7c3aed'}}>
                                    Start Your Free Trial
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </button>
                            </SignUpButton>
                            <Link href="/contact">
                                <button className={`${styles.btn} ${styles['btn-outline']} ${styles['btn-lg']}`} style={{borderColor: 'white', color: 'white'}}>
                                    Contact Sales
                                </button>
                            </Link>
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

const BenefitItem: FC<BenefitItemProps> = ({ icon, title, description }) => (
    <div className={styles['benefit-item']}>
        {icon}
        <div className={styles['benefit-content']}>
            <h4 className={styles['benefit-title']}>{title}</h4>
            <p className={styles['benefit-text']}>{description}</p>
        </div>
    </div>
);