import React from 'react';
import { Brain, Loader } from 'lucide-react';
import styles from '../../styles/authenticating.module.css';

const LoadingPage: React.FC = () => {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                {/* Logo */}
                <div className={styles.logoWrapper}>
                    <Brain className={styles.logoIcon} />
                    <span className={styles.logoText}>PDR AI</span>
                </div>

                {/* Spinner Animation */}
                <div className={styles.spinnerContainer}>
                    <div className={styles.spinner}></div>
                    <div className={styles.spinnerInner}>
                        <Loader className={styles.spinnerIcon} />
                    </div>
                </div>

                {/* Progress Bar */}
                <div className={styles.progressContainer}>
                    <div className={styles.progressBar}></div>
                </div>

                {/* Loading Animation */}
                <div className={styles.loadingContainer}>
                    <div className={styles.dots}>
                        <div className={styles.dot}></div>
                        <div className={styles.dot}></div>
                        <div className={styles.dot}></div>
                    </div>
                    <h1 className={styles.loadingText}>Loading</h1>
                </div>

                {/* Message */}
                <p className={styles.message}>
                    Please wait while we set up your workspace
                </p>
            </div>
        </div>
    );
};

export default LoadingPage;