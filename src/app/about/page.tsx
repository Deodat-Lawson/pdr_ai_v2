"use client"

import Link from 'next/link';
import React from 'react';
import { Home, Github, Linkedin, Mail, Brain } from 'lucide-react';
import styles from '../../styles/about.module.css';

//I don't think we should have this page it doesn't benefit the product at all.  
const teamMembers = [
    {
        id: 1,
        name: 'Richard Zhou',
        role: 'Founder and CEO',
        description: 'Director overseeing full-stack development with a focus on AI integration and document processing systems. Leads the strategic and technical development of PDR AI.',
        image: '/api/placeholder/400/400',
        email: 'richardzhou1688@gmail.com',
        github: 'https://github.com/DuckyCodes',
        linkedin: 'https://www.linkedin.com/in/richard-zhou-22ab60249/'
    },
    {
        id: 2,
        name: 'Timothy Lin',
        role: 'Software Engineer',
        description: 'Specializes in natural language processing and machine learning. Develops the AI algorithms that power PDR\'s document analysis capabilities.',
        image: '/api/placeholder/400/400',
        email: 'tlin56@jh.edu',
        github: 'https://github.com/Deodat-Lawson',
        linkedin: 'https://www.linkedin.com/in/tlin2004/'
    }
];

const AboutPage: React.FC = () => {
    return (
        <div className={styles.container}>
            {/* Navigation */}
            <nav className={styles.navbar}>
                <div className={styles.navContent}>
                    <div className={styles.logoWrapper}>
                        <Brain className={styles.logoIcon} />
                        <span className={styles.logoText}>PDR AI</span>
                    </div>
                    <button
                        onClick={() => window.location.href = '/'}
                        className={styles.homeButton}
                    >
                        <Home className={styles.homeIcon} />
                        Home
                    </button>
                </div>
            </nav>

            <main className={styles.main}>
                {/* Header Section */}
                <div className={styles.header}>
                    <h1 className={styles.title}>Meet Our Team</h1>
                    <p className={styles.subtitle}>
                        The minds behind PDR AI, working to make professional documents easier to read and interpret.
                    </p>
                </div>

                {/* Team Section */}
                <div className={styles.teamGrid}>
                    {teamMembers.map(member => (
                        <div key={member.id} className={styles.memberCard}>
                            <div className={styles.memberImageContainer}>
                                <img
                                    src={member.image}
                                    alt={member.name}
                                    className={styles.memberImage}
                                />
                            </div>
                            <div className={styles.memberInfo}>
                                <h2 className={styles.memberName}>{member.name}</h2>
                                <p className={styles.memberRole}>{member.role}</p>
                                <p className={styles.memberDescription}>
                                    {member.description}
                                </p>
                                <div className={styles.socialLinks}>
                                    <a
                                        href={`mailto:${member.email}`}
                                        className={styles.socialLink}
                                        aria-label="Email"
                                    >
                                        <Mail className={styles.socialIcon} />
                                    </a>
                                    <a
                                        href={`${member.github}`}
                                        className={styles.socialLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="GitHub"
                                    >
                                        <Github className={styles.socialIcon} />
                                    </a>
                                    <a
                                        href={`${member.linkedin}`}
                                        className={styles.socialLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label="LinkedIn"
                                    >
                                        <Linkedin className={styles.socialIcon} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Mission Statement */}
                <div className={styles.missionSection}>
                    <h2 className={styles.missionTitle}>Our Mission</h2>
                    <p className={styles.missionText}>
                        Example Mission Statement
                    </p>
                </div>
            </main>
        </div>
    );
};

export default AboutPage;
