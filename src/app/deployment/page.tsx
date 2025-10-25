import Link from "next/link";
import React from 'react';
import { Check, Terminal, Database, Shield, Zap, Github, ExternalLink } from 'lucide-react';
import styles from '../../styles/deployment.module.css';
import { Navbar } from '../_components/Navbar';
import { ClerkProvider } from '@clerk/nextjs'

export default function DeploymentPage() {
    return (
        <ClerkProvider>
            <div className={styles.container}>
                <Navbar />

                <div className={styles.heroSection}>
                    <div className={styles.heroContent}>
                        <h1 className={styles.heroTitle}>
                            Self-Deployment Guide
                        </h1>
                        <p className={styles.heroDescription}>
                            Deploy PDR AI on your own infrastructure with complete control and customization
                        </p>
                        <div className={styles.heroButtons}>
                            <a 
                                href="https://github.com/Deodat-Lawson/pdr_ai_v2" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
                            >
                                <Github className={styles.btnIcon} />
                                View on GitHub
                            </a>
                            <Link href="/contact">
                                <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnLg}`}>
                                    Get Support
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>

                <div className={styles.contentSection}>
                    <div className={styles.contentContainer}>
                        
                        {/* Prerequisites Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Prerequisites</h2>
                            <div className={styles.prerequisitesGrid}>
                                <div className={styles.prerequisiteCard}>
                                    <Terminal className={styles.prerequisiteIcon} />
                                    <h3>Node.js & Package Manager</h3>
                                    <ul className={styles.list}>
                                        <li>Node.js v18.0 or higher</li>
                                        <li>pnpm (recommended) or npm</li>
                                        <li>Git for version control</li>
                                    </ul>
                                </div>
                                <div className={styles.prerequisiteCard}>
                                    <Database className={styles.prerequisiteIcon} />
                                    <h3>Database</h3>
                                    <ul className={styles.list}>
                                        <li>Docker (for local PostgreSQL)</li>
                                        <li>Or existing PostgreSQL instance</li>
                                        <li>PostgreSQL 14+ recommended</li>
                                    </ul>
                                </div>
                                <div className={styles.prerequisiteCard}>
                                    <Shield className={styles.prerequisiteIcon} />
                                    <h3>API Keys Required</h3>
                                    <ul className={styles.list}>
                                        <li>OpenAI API key</li>
                                        <li>Clerk authentication</li>
                                        <li>UploadThing for file storage</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Quick Start Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Zap className={styles.sectionIcon} />
                                Quick Start
                            </h2>
                            <div className={styles.codeSection}>
                                <h3 className={styles.stepTitle}>1. Clone the Repository</h3>
                                <div className={styles.codeBlock}>
                                    <code>
                                        git clone https://github.com/Deodat-Lawson/pdr_ai_v2.git<br />
                                        cd pdr_ai_v2
                                    </code>
                                </div>
                            </div>

                            <div className={styles.codeSection}>
                                <h3 className={styles.stepTitle}>2. Install Dependencies</h3>
                                <div className={styles.codeBlock}>
                                    <code>pnpm install</code>
                                </div>
                            </div>

                            <div className={styles.codeSection}>
                                <h3 className={styles.stepTitle}>3. Configure Environment Variables</h3>
                                <p className={styles.stepDescription}>
                                    Create a <code>.env</code> file in the root directory:
                                </p>
                                <div className={styles.codeBlock}>
                                    <code>
                                        # Database<br />
                                        DATABASE_URL=&quot;postgresql://postgres:password@localhost:5432/pdr_ai_v2&quot;<br />
                                        <br />
                                        # Clerk Authentication<br />
                                        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key<br />
                                        CLERK_SECRET_KEY=your_clerk_secret_key<br />
                                        <br />
                                        # OpenAI API<br />
                                        OPENAI_API_KEY=your_openai_api_key<br />
                                        <br />
                                        # UploadThing<br />
                                        UPLOADTHING_SECRET=your_uploadthing_secret<br />
                                        UPLOADTHING_APP_ID=your_uploadthing_app_id<br />
                                        <br />
                                        # Environment<br />
                                        NODE_ENV=development
                                    </code>
                                </div>
                            </div>

                            <div className={styles.codeSection}>
                                <h3 className={styles.stepTitle}>4. Set Up Database</h3>
                                <div className={styles.codeBlock}>
                                    <code>
                                        # Start PostgreSQL with Docker<br />
                                        chmod +x start-database.sh<br />
                                        ./start-database.sh<br />
                                        <br />
                                        # Run migrations<br />
                                        pnpm db:push
                                    </code>
                                </div>
                            </div>

                            <div className={styles.codeSection}>
                                <h3 className={styles.stepTitle}>5. Start Development Server</h3>
                                <div className={styles.codeBlock}>
                                    <code>pnpm dev</code>
                                </div>
                                <p className={styles.stepDescription}>
                                    Your application will be available at <code>http://localhost:3000</code>
                                </p>
                            </div>
                        </section>

                        {/* API Keys Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Shield className={styles.sectionIcon} />
                                Setting Up API Keys
                            </h2>

                            <div className={styles.apiKeySection}>
                                <h3 className={styles.apiKeyTitle}>Clerk Authentication</h3>
                                <ol className={styles.orderedList}>
                                    <li>Create an account at <a href="https://clerk.com/" target="_blank" rel="noopener noreferrer" className={styles.link}>Clerk.com <ExternalLink className={styles.linkIcon} /></a></li>
                                    <li>Create a new application</li>
                                    <li>Copy the publishable and secret keys</li>
                                    <li>Add them to your <code>.env</code> file</li>
                                    <li>Configure sign-in/sign-up methods as needed</li>
                                </ol>
                            </div>

                            <div className={styles.apiKeySection}>
                                <h3 className={styles.apiKeyTitle}>OpenAI API</h3>
                                <ol className={styles.orderedList}>
                                    <li>Create an account at <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className={styles.link}>OpenAI Platform <ExternalLink className={styles.linkIcon} /></a></li>
                                    <li>Navigate to API keys section</li>
                                    <li>Generate a new API key</li>
                                    <li>Add the key to your <code>.env</code> file</li>
                                    <li>Set up billing for API usage</li>
                                </ol>
                            </div>

                            <div className={styles.apiKeySection}>
                                <h3 className={styles.apiKeyTitle}>UploadThing</h3>
                                <ol className={styles.orderedList}>
                                    <li>Create an account at <a href="https://uploadthing.com/" target="_blank" rel="noopener noreferrer" className={styles.link}>UploadThing.com <ExternalLink className={styles.linkIcon} /></a></li>
                                    <li>Create a new app</li>
                                    <li>Copy the secret and app ID</li>
                                    <li>Add them to your <code>.env</code> file</li>
                                </ol>
                            </div>
                        </section>

                        {/* Production Deployment Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Production Deployment</h2>
                            
                            <div className={styles.deploymentOption}>
                                <h3 className={styles.deploymentTitle}>Vercel (Recommended)</h3>
                                <ol className={styles.orderedList}>
                                    <li>Push your code to GitHub</li>
                                    <li>Import your repository on <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className={styles.link}>Vercel <ExternalLink className={styles.linkIcon} /></a></li>
                                    <li>Configure environment variables in Vercel dashboard</li>
                                    <li>Deploy automatically on every push</li>
                                </ol>
                                <div className={styles.codeBlock}>
                                    <code>
                                        # Build command<br />
                                        pnpm build<br />
                                        <br />
                                        # Start command<br />
                                        pnpm start
                                    </code>
                                </div>
                            </div>

                            <div className={styles.deploymentOption}>
                                <h3 className={styles.deploymentTitle}>Docker Deployment</h3>
                                <div className={styles.codeBlock}>
                                    <code>
                                        # Build Docker image<br />
                                        docker build -t pdr-ai .<br />
                                        <br />
                                        # Run container<br />
                                        docker run -p 3000:3000 --env-file .env pdr-ai
                                    </code>
                                </div>
                            </div>

                            <div className={styles.deploymentOption}>
                                <h3 className={styles.deploymentTitle}>Self-Hosted VPS</h3>
                                <ol className={styles.orderedList}>
                                    <li>Set up a VPS with Node.js and PostgreSQL</li>
                                    <li>Clone the repository</li>
                                    <li>Configure environment variables</li>
                                    <li>Build the application: <code>pnpm build</code></li>
                                    <li>Use PM2 or similar for process management</li>
                                    <li>Configure nginx as reverse proxy</li>
                                    <li>Set up SSL with Let&apos;s Encrypt</li>
                                </ol>
                            </div>
                        </section>

                        {/* Database Management Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Database className={styles.sectionIcon} />
                                Database Management
                            </h2>
                            
                            <div className={styles.infoBox}>
                                <h3>Useful Database Commands</h3>
                                <div className={styles.codeBlock}>
                                    <code>
                                        # Open Drizzle Studio (Database GUI)<br />
                                        pnpm db:studio<br />
                                        <br />
                                        # Generate new migrations<br />
                                        pnpm db:generate<br />
                                        <br />
                                        # Apply migrations<br />
                                        pnpm db:migrate<br />
                                        <br />
                                        # Push schema changes directly (dev)<br />
                                        pnpm db:push
                                    </code>
                                </div>
                            </div>
                        </section>

                        {/* Troubleshooting Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>Troubleshooting</h2>
                            
                            <div className={styles.troubleshootSection}>
                                <h3 className={styles.troubleshootTitle}>Database Connection Issues</h3>
                                <ul className={styles.list}>
                                    <li>Ensure Docker is running: <code>docker ps</code></li>
                                    <li>Check database container status: <code>docker restart pdr_ai_v2-postgres</code></li>
                                    <li>Verify DATABASE_URL in <code>.env</code> file</li>
                                </ul>
                            </div>

                            <div className={styles.troubleshootSection}>
                                <h3 className={styles.troubleshootTitle}>Build Errors</h3>
                                <ul className={styles.list}>
                                    <li>Clear Next.js cache: <code>rm -rf .next</code></li>
                                    <li>Reinstall dependencies: <code>rm -rf node_modules && pnpm install</code></li>
                                    <li>Check TypeScript errors: <code>pnpm typecheck</code></li>
                                </ul>
                            </div>

                            <div className={styles.troubleshootSection}>
                                <h3 className={styles.troubleshootTitle}>API Key Issues</h3>
                                <ul className={styles.list}>
                                    <li>Verify all required environment variables are set</li>
                                    <li>Check for spaces around <code>=</code> in <code>.env</code> file</li>
                                    <li>Ensure API keys are valid and have proper permissions</li>
                                    <li>Restart the development server after changing <code>.env</code></li>
                                </ul>
                            </div>
                        </section>

                        {/* Features Section */}
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>What You Get</h2>
                            <div className={styles.featuresGrid}>
                                <div className={styles.featureCard}>
                                    <Check className={styles.featureIcon} />
                                    <h3>Full Source Code</h3>
                                    <p>Complete access to all application code with no restrictions</p>
                                </div>
                                <div className={styles.featureCard}>
                                    <Check className={styles.featureIcon} />
                                    <h3>Predictive Document Analysis</h3>
                                    <p>AI-powered missing document detection and recommendations</p>
                                </div>
                                <div className={styles.featureCard}>
                                    <Check className={styles.featureIcon} />
                                    <h3>AI Chat Engine</h3>
                                    <p>Interactive Q&A system for document analysis</p>
                                </div>
                                <div className={styles.featureCard}>
                                    <Check className={styles.featureIcon} />
                                    <h3>Employee Management</h3>
                                    <p>Complete employee and employer authentication system</p>
                                </div>
                                <div className={styles.featureCard}>
                                    <Check className={styles.featureIcon} />
                                    <h3>Document Management</h3>
                                    <p>Upload, categorize, and manage documents</p>
                                </div>
                                <div className={styles.featureCard}>
                                    <Check className={styles.featureIcon} />
                                    <h3>Analytics Dashboard</h3>
                                    <p>Insights and statistics for document usage</p>
                                </div>
                            </div>
                        </section>

                        {/* Support Section */}
                        <section className={styles.section}>
                            <div className={styles.supportBox}>
                                <h2>Need Help?</h2>
                                <p>
                                    Having trouble with deployment? Our support team is here to help!
                                </p>
                                <div className={styles.supportButtons}>
                                    <a 
                                        href="https://github.com/Deodat-Lawson/pdr_ai_v2/issues" 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className={`${styles.btn} ${styles.btnOutline}`}
                                    >
                                        <Github className={styles.btnIcon} />
                                        GitHub Issues
                                    </a>
                                    <Link href="/contact">
                                        <button className={`${styles.btn} ${styles.btnPrimary}`}>
                                            Contact Support
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </ClerkProvider>
    );
}

