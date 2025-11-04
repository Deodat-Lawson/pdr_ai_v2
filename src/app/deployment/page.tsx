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
                                    Create a <code>.env</code> file in the root directory with all required variables:
                                </p>
                                <div className={styles.codeBlock}>
                                    <code>
                                        # Database Configuration<br />
                                        # Format: postgresql://[user]:[password]@[host]:[port]/[database]<br />
                                        DATABASE_URL=&quot;postgresql://postgres:password@localhost:5432/pdr_ai_v2&quot;<br />
                                        <br />
                                        # Clerk Authentication (get from https://clerk.com/)<br />
                                        # Required for user authentication and authorization<br />
                                        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key<br />
                                        CLERK_SECRET_KEY=your_clerk_secret_key<br />
                                        <br />
                                        # Clerk Force Redirect URLs (Optional - for custom redirect after authentication)<br />
                                        # These URLs control where users are redirected after sign in/up/sign out<br />
                                        # If not set, Clerk will use default redirect behavior<br />
                                        NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://your-domain.com/employer/home<br />
                                        NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://your-domain.com/signup<br />
                                        NEXT_PUBLIC_CLERK_SIGN_OUT_FORCE_REDIRECT_URL=https://your-domain.com/<br />
                                        <br />
                                        # OpenAI API (get from https://platform.openai.com/)<br />
                                        # Required for AI features: document analysis, embeddings, chat<br />
                                        OPENAI_API_KEY=your_openai_api_key<br />
                                        <br />
                                        # LangChain (get from https://smith.langchain.com/)<br />
                                        # Optional: Required for LangSmith tracing and monitoring<br />
                                        # LangSmith provides observability and debugging for LangChain operations<br />
                                        LANGCHAIN_TRACING_V2=true<br />
                                        LANGCHAIN_API_KEY=your_langchain_api_key<br />
                                        <br />
                                        # Tavily Search API (get from https://tavily.com/)<br />
                                        # Optional: Required for enhanced web search capabilities<br />
                                        # Used for finding related documents and external resources<br />
                                        TAVILY_API_KEY=your_tavily_api_key<br />
                                        <br />
                                        # UploadThing (get from https://uploadthing.com/)<br />
                                        # Required for file uploads (PDF documents)<br />
                                        UPLOADTHING_SECRET=your_uploadthing_secret<br />
                                        UPLOADTHING_APP_ID=your_uploadthing_app_id<br />
                                        <br />
                                        # Environment Configuration<br />
                                        # Options: development, test, production<br />
                                        NODE_ENV=development<br />
                                        <br />
                                        # Optional: Skip environment validation (useful for Docker builds)<br />
                                        # SKIP_ENV_VALIDATION=false
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
                                    <li><strong>Optional:</strong> Set up force redirect URLs:
                                        <ul className={styles.list}>
                                            <li><code>NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL</code> - Redirect after sign in</li>
                                            <li><code>NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL</code> - Redirect after sign up</li>
                                            <li><code>NEXT_PUBLIC_CLERK_SIGN_OUT_FORCE_REDIRECT_URL</code> - Redirect after sign out</li>
                                        </ul>
                                    </li>
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
                                <h3 className={styles.apiKeyTitle}>LangChain (LangSmith) - Optional</h3>
                                <ol className={styles.orderedList}>
                                    <li>Create an account at <a href="https://smith.langchain.com/" target="_blank" rel="noopener noreferrer" className={styles.link}>LangSmith <ExternalLink className={styles.linkIcon} /></a></li>
                                    <li>Generate an API key from your account settings</li>
                                    <li>Set <code>LANGCHAIN_TRACING_V2=true</code> in your <code>.env</code> file</li>
                                    <li>Add <code>LANGCHAIN_API_KEY</code> to your <code>.env</code> file</li>
                                    <li>This enables tracing and monitoring of LangChain operations for debugging</li>
                                </ol>
                            </div>

                            <div className={styles.apiKeySection}>
                                <h3 className={styles.apiKeyTitle}>Tavily Search API - Optional</h3>
                                <ol className={styles.orderedList}>
                                    <li>Create an account at <a href="https://tavily.com/" target="_blank" rel="noopener noreferrer" className={styles.link}>Tavily <ExternalLink className={styles.linkIcon} /></a></li>
                                    <li>Generate an API key from your dashboard</li>
                                    <li>Add <code>TAVILY_API_KEY</code> to your <code>.env</code> file</li>
                                    <li>Used for enhanced web search capabilities in document analysis</li>
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
                            
                            <div className={styles.infoBox}>
                                <h3>Prerequisites for Production</h3>
                                <ul className={styles.list}>
                                    <li>✅ All environment variables configured</li>
                                    <li>✅ Production database set up (PostgreSQL with pgvector extension)</li>
                                    <li>✅ API keys for all external services</li>
                                    <li>✅ Domain name configured (if using custom domain)</li>
                                </ul>
                            </div>
                            
                            <div className={styles.deploymentOption}>
                                <h3 className={styles.deploymentTitle}>1. Vercel (Recommended for Next.js)</h3>
                                <p className={styles.stepDescription}>
                                    Vercel is the recommended platform for Next.js applications with automatic deployments and scaling.
                                </p>
                                <ol className={styles.orderedList}>
                                    <li><strong>Push your code to GitHub</strong>
                                        <div className={styles.codeBlock}>
                                            <code>git push origin main</code>
                                        </div>
                                    </li>
                                    <li><strong>Import repository on <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className={styles.link}>Vercel <ExternalLink className={styles.linkIcon} /></a></strong>
                                        <ul className={styles.list}>
                                            <li>Go to vercel.com and sign in</li>
                                            <li>Click &quot;Add New Project&quot;</li>
                                            <li>Import your GitHub repository</li>
                                        </ul>
                                    </li>
                                    <li><strong>Set up Database and Environment Variables</strong>
                                        <div className={styles.infoBox}>
                                            <h4>Database Setup:</h4>
                                            <p><strong>Option A: Using Vercel Postgres (Recommended)</strong></p>
                                            <ol className={styles.orderedList}>
                                                <li>In Vercel dashboard, go to Storage → Create Database → Postgres</li>
                                                <li>Choose a region and create the database</li>
                                                <li>Vercel will automatically create the <code>DATABASE_URL</code> environment variable</li>
                                                <li>Enable pgvector extension: Connect to your database and run <code>CREATE EXTENSION IF NOT EXISTS vector;</code></li>
                                            </ol>
                                            <p><strong>Option B: Using Neon Database (Recommended for pgvector support)</strong></p>
                                            <ol className={styles.orderedList}>
                                                <li>Create a Neon account at <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className={styles.link}>neon.tech <ExternalLink className={styles.linkIcon} /></a> if you don&apos;t have one</li>
                                                <li>Create a new project in Neon dashboard</li>
                                                <li>Choose PostgreSQL version 14 or higher</li>
                                                <li>In Vercel dashboard, go to your project → Storage tab</li>
                                                <li>Click &quot;Create Database&quot; or &quot;Browse Marketplace&quot;</li>
                                                <li>Select &quot;Neon&quot; from the integrations</li>
                                                <li>Click &quot;Connect&quot; or &quot;Add Integration&quot;</li>
                                                <li>Authenticate with your Neon account</li>
                                                <li>Select your Neon project and branch</li>
                                                <li>Vercel will automatically create the <code>DATABASE_URL</code> environment variable from Neon</li>
                                                <li>You may also see additional Neon-related variables like <code>POSTGRES_URL</code>, <code>POSTGRES_PRISMA_URL</code>, etc.</li>
                                                <li>Enable pgvector extension in Neon:
                                                    <ul className={styles.list}>
                                                        <li>Go to Neon dashboard → SQL Editor</li>
                                                        <li>Run: <code>CREATE EXTENSION IF NOT EXISTS vector;</code></li>
                                                    </ul>
                                                </li>
                                            </ol>
                                            <p><strong>Option C: Using External Database (Manual Setup)</strong></p>
                                            <ol className={styles.orderedList}>
                                                <li>In Vercel dashboard, go to Settings → Environment Variables</li>
                                                <li>Click &quot;Add New&quot;</li>
                                                <li>Key: <code>DATABASE_URL</code></li>
                                                <li>Value: Your PostgreSQL connection string</li>
                                                <li>Select environments: Production, Preview, Development (as needed)</li>
                                                <li>Click &quot;Save&quot;</li>
                                            </ol>
                                        </div>
                                        <div className={styles.infoBox}>
                                            <h4>Add Other Environment Variables:</h4>
                                            <ul className={styles.list}>
                                                <li>In Vercel dashboard, go to Settings → Environment Variables</li>
                                                <li>Add all required environment variables:
                                                    <ul className={styles.list}>
                                                        <li><code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code></li>
                                                        <li><code>CLERK_SECRET_KEY</code></li>
                                                        <li><code>OPENAI_API_KEY</code></li>
                                                        <li><code>UPLOADTHING_SECRET</code></li>
                                                        <li><code>UPLOADTHING_APP_ID</code></li>
                                                        <li><code>NODE_ENV=production</code></li>
                                                        <li><code>LANGCHAIN_TRACING_V2=true</code> (optional, for LangSmith tracing)</li>
                                                        <li><code>LANGCHAIN_API_KEY</code> (optional, required if tracing enabled)</li>
                                                        <li><code>TAVILY_API_KEY</code> (optional, for enhanced web search)</li>
                                                        <li><code>NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL</code> (optional)</li>
                                                        <li><code>NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL</code> (optional)</li>
                                                        <li><code>NEXT_PUBLIC_CLERK_SIGN_OUT_FORCE_REDIRECT_URL</code> (optional)</li>
                                                    </ul>
                                                </li>
                                            </ul>
                                        </div>
                                    </li>
                                    <li><strong>Configure build settings</strong>
                                        <ul className={styles.list}>
                                            <li>Build Command: <code>pnpm build</code></li>
                                            <li>Output Directory: <code>.next</code> (default)</li>
                                            <li>Install Command: <code>pnpm install</code></li>
                                        </ul>
                                    </li>
                                    <li><strong>Deploy</strong>
                                        <ul className={styles.list}>
                                            <li>Click &quot;Deploy&quot;</li>
                                            <li>Vercel will automatically deploy on every push to your main branch</li>
                                        </ul>
                                    </li>
                                </ol>
                                <div className={styles.infoBox}>
                                    <h4>Post-Deployment Steps:</h4>
                                    <ol className={styles.orderedList}>
                                        <li><strong>Enable pgvector Extension:</strong>
                                            <ul className={styles.list}>
                                                <li>For Vercel Postgres: Use Vercel&apos;s SQL editor in Storage dashboard</li>
                                                <li>For Neon: Go to Neon dashboard → SQL Editor</li>
                                                <li>For External Database: Connect using your PostgreSQL client</li>
                                                <li>Run: <code>CREATE EXTENSION IF NOT EXISTS vector;</code></li>
                                            </ul>
                                        </li>
                                        <li><strong>Run database migrations:</strong>
                                <div className={styles.codeBlock}>
                                    <code>
                                                    # Option 1: Using Vercel CLI locally<br />
                                                    vercel env pull .env.local<br />
                                                    pnpm db:migrate<br />
                                        <br />
                                                    # Option 2: Using direct connection<br />
                                                    DATABASE_URL=&quot;your_production_db_url&quot; pnpm db:migrate
                                    </code>
                                            </div>
                                        </li>
                                        <li>Set up Clerk webhooks (if needed): Configure webhook URL in Clerk dashboard</li>
                                        <li>Configure UploadThing: Add your production domain to allowed origins</li>
                                    </ol>
                                </div>
                            </div>

                            <div className={styles.deploymentOption}>
                                <h3 className={styles.deploymentTitle}>2. Self-Hosted VPS</h3>
                                <p className={styles.stepDescription}>
                                    Deploy on your own VPS with full control over the infrastructure.
                                </p>
                                <ol className={styles.orderedList}>
                                    <li><strong>Prerequisites</strong>
                                        <ul className={styles.list}>
                                            <li>VPS with Node.js 18+ installed</li>
                                            <li>PostgreSQL database (with pgvector extension)</li>
                                            <li>Nginx (for reverse proxy)</li>
                                            <li>PM2 or similar process manager</li>
                                        </ul>
                                    </li>
                                    <li><strong>Clone and install</strong>
                                        <div className={styles.codeBlock}>
                                            <code>
                                                git clone &lt;your-repo-url&gt;<br />
                                                cd pdr_ai_v2-2<br />
                                                pnpm install
                                            </code>
                                        </div>
                                    </li>
                                    <li><strong>Configure environment variables</strong>
                                        <div className={styles.codeBlock}>
                                            <code>nano .env  # Add all production environment variables</code>
                                        </div>
                                    </li>
                                    <li><strong>Build the application</strong>
                                        <div className={styles.codeBlock}>
                                            <code>pnpm build</code>
                                        </div>
                                    </li>
                                    <li><strong>Set up PM2</strong>
                                        <div className={styles.codeBlock}>
                                            <code>
                                                npm install -g pm2<br />
                                                pm2 start pnpm --name &quot;pdr-ai&quot; -- start<br />
                                                pm2 save<br />
                                                pm2 startup
                                            </code>
                                        </div>
                                    </li>
                                    <li><strong>Configure Nginx</strong>
                                        <div className={styles.codeBlock}>
                                            <code>
                                                server &#123;<br />
                                                &nbsp;&nbsp;listen 80;<br />
                                                &nbsp;&nbsp;server_name your-domain.com;<br />
                                                &nbsp;&nbsp;location / &#123;<br />
                                                &nbsp;&nbsp;&nbsp;&nbsp;proxy_pass http://localhost:3000;<br />
                                                &nbsp;&nbsp;&nbsp;&nbsp;proxy_set_header Host $host;<br />
                                                &nbsp;&nbsp;&nbsp;&nbsp;proxy_set_header X-Real-IP $remote_addr;<br />
                                                &nbsp;&nbsp;&nbsp;&nbsp;proxy_set_header X-Forwarded-Proto $scheme;<br />
                                                &nbsp;&nbsp;&#125;<br />
                                                &#125;
                                            </code>
                                        </div>
                                    </li>
                                    <li><strong>Set up SSL with Let&apos;s Encrypt</strong>
                                        <div className={styles.codeBlock}>
                                            <code>
                                                sudo apt-get install certbot python3-certbot-nginx<br />
                                                sudo certbot --nginx -d your-domain.com
                                            </code>
                                        </div>
                                    </li>
                                    <li><strong>Run database migrations</strong>
                                        <div className={styles.codeBlock}>
                                            <code>pnpm db:migrate</code>
                                        </div>
                                    </li>
                                </ol>
                            </div>

                            <div className={styles.infoBox}>
                                <h3>Production Database Setup</h3>
                                <p><strong>Important:</strong> Your production database must have the <code>pgvector</code> extension enabled:</p>
                                <div className={styles.codeBlock}>
                                    <code>
                                        CREATE EXTENSION IF NOT EXISTS vector;
                                    </code>
                                </div>
                                <p><strong>Recommended Database Providers:</strong></p>
                                <ul className={styles.list}>
                                    <li><strong>Neon</strong>: Fully serverless PostgreSQL with pgvector support</li>
                                    <li><strong>Supabase</strong>: PostgreSQL with pgvector extension</li>
                                    <li><strong>AWS RDS</strong>: Managed PostgreSQL (requires manual pgvector installation)</li>
                                    <li><strong>Railway</strong>: Simple PostgreSQL hosting</li>
                                </ul>
                            </div>

                            <div className={styles.infoBox}>
                                <h3>Post-Deployment Checklist</h3>
                                <ul className={styles.list}>
                                    <li>✅ Verify all environment variables are set correctly</li>
                                    <li>✅ Database migrations have been run</li>
                                    <li>✅ Clerk authentication is working</li>
                                    <li>✅ File uploads are working (UploadThing)</li>
                                    <li>✅ AI features are functioning (OpenAI API)</li>
                                    <li>✅ Database has pgvector extension enabled</li>
                                    <li>✅ SSL certificate is configured (if using custom domain)</li>
                                    <li>✅ Monitoring and logging are set up</li>
                                    <li>✅ Backup strategy is in place</li>
                                    <li>✅ Error tracking is configured (e.g., Sentry)</li>
                                </ul>
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

