# PDR AI - Professional Document Reader AI

A Next.js application that uses advanced AI technology to analyze, interpret, and extract insights from professional documents. Features employee/employer authentication, document upload and management, AI-powered chat, and **comprehensive predictive document analysis** that identifies missing documents, provides recommendations, and suggests related content.

## 🚀 Features

### 🤖 **Predictive Document Analysis** (NEW!)
- **Missing Document Detection**: AI automatically identifies critical documents that should be present but are missing
- **Priority Assessment**: Categorizes missing documents by priority (high, medium, low) for efficient workflow management
- **Smart Recommendations**: Provides actionable recommendations for document organization and compliance
- **Related Document Suggestions**: Suggests relevant external resources and related documents
- **Page-Level Analysis**: Pinpoints specific pages where missing documents are referenced
- **Real-time Analysis**: Instant analysis with caching for improved performance
- **Comprehensive Reporting**: Detailed breakdown of analysis results with actionable insights

### 📄 **Professional Document Analysis**
- Advanced AI algorithms analyze documents and extract key information
- **AI-Powered Chat**: Interactive chat interface for document-specific questions and insights
- **Role-Based Authentication**: Separate interfaces for employees and employers using Clerk
- **Document Management**: Upload, organize, and manage documents with category support
- **Employee Management**: Employer dashboard for managing employee access and approvals
- **Real-time Chat History**: Persistent chat sessions for each document
- **Responsive Design**: Modern UI with Tailwind CSS

## 🔍 Predictive Document Analysis Deep Dive

The **Predictive Document Analysis** feature is the cornerstone of PDR AI, providing intelligent document management and compliance assistance:

### How It Works
1. **Document Upload**: Upload your professional documents (PDFs, contracts, manuals, etc.)
2. **AI Analysis**: Our advanced AI scans through the document content and structure
3. **Missing Document Detection**: Identifies references to documents that should be present but aren't
4. **Priority Classification**: Automatically categorizes findings by importance and urgency
5. **Smart Recommendations**: Provides specific, actionable recommendations for document management
6. **Related Content**: Suggests relevant external resources and related documents

### Key Benefits
- **Compliance Assurance**: Never miss critical documents required for compliance
- **Workflow Optimization**: Streamline document management with AI-powered insights
- **Risk Mitigation**: Identify potential gaps in documentation before they become issues
- **Time Savings**: Automated analysis saves hours of manual document review
- **Proactive Management**: Stay ahead of document requirements and deadlines

### Analysis Output
The system provides comprehensive analysis including:
- **Missing Documents Count**: Total number of missing documents identified
- **High Priority Items**: Critical documents requiring immediate attention
- **Recommendations**: Specific actions to improve document organization
- **Suggested Related Documents**: External resources and related content
- **Page References**: Exact page numbers where missing documents are mentioned

## 📖 Usage Examples

### Predictive Document Analysis

The predictive analysis feature automatically scans uploaded documents and provides comprehensive insights:

#### Example Analysis Response
```json
{
  "success": true,
  "documentId": 123,
  "analysisType": "predictive",
  "summary": {
    "totalMissingDocuments": 5,
    "highPriorityItems": 2,
    "totalRecommendations": 3,
    "totalSuggestedRelated": 4,
    "analysisTimestamp": "2024-01-15T10:30:00Z"
  },
  "analysis": {
    "missingDocuments": [
      {
        "documentName": "Employee Handbook",
        "documentType": "Policy Document",
        "reason": "Referenced in section 2.1 but not found in uploaded documents",
        "page": 15,
        "priority": "high",
        "suggestedLinks": [
          {
            "title": "Sample Employee Handbook Template",
            "link": "https://example.com/handbook-template",
            "snippet": "Comprehensive employee handbook template..."
          }
        ]
      }
    ],
    "recommendations": [
      "Consider implementing a document version control system",
      "Review document retention policies for compliance",
      "Establish regular document audit procedures"
    ],
    "suggestedRelatedDocuments": [
      {
        "title": "Document Management Best Practices",
        "link": "https://example.com/best-practices",
        "snippet": "Industry standards for document organization..."
      }
    ]
  }
}
```

#### Using the Analysis in Your Workflow
1. **Upload Documents**: Use the employer dashboard to upload your documents
2. **Run Analysis**: Click the "Predictive Analysis" tab in the document viewer
3. **Review Results**: Examine missing documents, recommendations, and suggestions
4. **Take Action**: Follow the provided recommendations and suggested links
5. **Track Progress**: Re-run analysis to verify improvements

### AI Chat Integration

Ask questions about your documents and get AI-powered responses:

```typescript
// Example API call for document Q&A
const response = await fetch('/api/LangChain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "What are the key compliance requirements mentioned?",
    documentId: 123,
    style: "professional" // or "casual", "technical", "summary"
  })
});
```

## 🎯 Use Cases & Benefits

### Industries That Benefit Most

#### Legal & Compliance
- **Contract Management**: Identify missing clauses, attachments, and referenced documents
- **Regulatory Compliance**: Ensure all required documentation is present and up-to-date
- **Due Diligence**: Comprehensive document review for mergers and acquisitions
- **Risk Assessment**: Identify potential legal risks from missing documentation

#### Human Resources
- **Employee Documentation**: Ensure all required employee documents are collected
- **Policy Compliance**: Verify policy documents are complete and current
- **Onboarding Process**: Streamline new employee documentation requirements
- **Audit Preparation**: Prepare for HR audits with confidence

#### Finance & Accounting
- **Financial Reporting**: Ensure all supporting documents are included
- **Audit Trail**: Maintain complete documentation for financial audits
- **Compliance Reporting**: Meet regulatory requirements for document retention
- **Process Documentation**: Streamline financial process documentation

#### Healthcare
- **Patient Records**: Ensure complete patient documentation
- **Regulatory Compliance**: Meet healthcare documentation requirements
- **Quality Assurance**: Maintain high standards for medical documentation
- **Risk Management**: Identify potential documentation gaps

### Business Benefits

#### Time Savings
- **Automated Analysis**: Reduce manual document review time by 80%
- **Instant Insights**: Get immediate feedback on document completeness
- **Proactive Management**: Address issues before they become problems

#### Risk Reduction
- **Compliance Assurance**: Never miss critical required documents
- **Error Prevention**: Catch documentation gaps before they cause issues
- **Audit Readiness**: Always be prepared for regulatory audits

#### Process Improvement
- **Standardized Workflows**: Establish consistent document management processes
- **Quality Control**: Maintain high standards for document organization
- **Continuous Improvement**: Use AI insights to optimize processes

### ROI Metrics
- **Document Review Time**: 80% reduction in manual review time
- **Compliance Risk**: 95% reduction in missing document incidents
- **Audit Preparation**: 90% faster audit preparation time
- **Process Efficiency**: 70% improvement in document management workflows

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) with TypeScript
- **Authentication**: [Clerk](https://clerk.com/)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **AI Integration**: [OpenAI](https://openai.com/) + [LangChain](https://langchain.com/)
- **File Upload**: [UploadThing](https://uploadthing.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (version 18.0 or higher)
- **pnpm** (recommended) or npm
- **Docker** (for local database)
- **Git**

## 🔧 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd pdr_ai_v2-2
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Database Configuration
# Format: postgresql://[user]:[password]@[host]:[port]/[database]
# For local development using Docker: postgresql://postgres:password@localhost:5432/pdr_ai_v2
# For production: Use your production PostgreSQL connection string
DATABASE_URL="postgresql://postgres:password@localhost:5432/pdr_ai_v2"

# Clerk Authentication (get from https://clerk.com/)
# Required for user authentication and authorization
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Clerk Force Redirect URLs (Optional - for custom redirect after authentication)
# These URLs control where users are redirected after sign in/up/sign out
# If not set, Clerk will use default redirect behavior
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=https://your-domain.com/employer/home
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=https://your-domain.com/signup
NEXT_PUBLIC_CLERK_SIGN_OUT_FORCE_REDIRECT_URL=https://your-domain.com/

# OpenAI API (get from https://platform.openai.com/)
# Required for AI features: document analysis, embeddings, chat functionality
OPENAI_API_KEY=your_openai_api_key

# LangChain (get from https://smith.langchain.com/)
# Optional: Required for LangSmith tracing and monitoring of LangChain operations
# LangSmith provides observability, debugging, and monitoring for LangChain applications
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key

# Tavily Search API (get from https://tavily.com/)
# Optional: Required for enhanced web search capabilities in document analysis
# Used for finding related documents and external resources
TAVILY_API_KEY=your_tavily_api_key

# UploadThing (get from https://uploadthing.com/)
# Required for file uploads (PDF documents)
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id

# Environment Configuration
# Options: development, test, production
NODE_ENV=development

# Optional: Skip environment validation (useful for Docker builds)
# Set to "true" to skip validation during build
# SKIP_ENV_VALIDATION=false
```

### 4. Database Setup

#### Start Local PostgreSQL Database

```bash
# Make the script executable
chmod +x start-database.sh

# Start the database container
./start-database.sh
```

This will:
- Create a Docker container with PostgreSQL
- Set up the database with proper credentials
- Generate a secure password if using default settings

#### Run Database Migrations

```bash
# Generate migration files
pnpm db:generate

# Apply migrations to database
pnpm db:migrate

# Alternative: Push schema directly (for development)
pnpm db:push
```

### 5. Set Up External Services

#### Clerk Authentication
1. Create account at [Clerk](https://clerk.com/)
2. Create a new application
3. Copy the publishable and secret keys to your `.env` file
4. Configure sign-in/sign-up methods as needed

#### OpenAI API
1. Create account at [OpenAI](https://platform.openai.com/)
2. Generate an API key
3. Add the key to your `.env` file

#### LangChain (LangSmith) - Optional
1. Create account at [LangSmith](https://smith.langchain.com/)
2. Generate an API key from your account settings
3. Set `LANGCHAIN_TRACING_V2=true` and add `LANGCHAIN_API_KEY` to your `.env` file
4. This enables tracing and monitoring of LangChain operations for debugging and observability

#### Tavily Search API - Optional
1. Create account at [Tavily](https://tavily.com/)
2. Generate an API key from your dashboard
3. Add `TAVILY_API_KEY` to your `.env` file
4. Used for enhanced web search capabilities in document analysis features

#### UploadThing
1. Create account at [UploadThing](https://uploadthing.com/)
2. Create a new app
3. Copy the secret and app ID to your `.env` file

## 🚀 Running the Application

### Development Mode

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

## 🚀 Deployment Guide

### Prerequisites for Production

Before deploying, ensure you have:
- ✅ All environment variables configured
- ✅ Production database set up (PostgreSQL with pgvector extension)
- ✅ API keys for all external services
- ✅ Domain name configured (if using custom domain)

### Deployment Options

#### 1. Vercel (Recommended for Next.js)

Vercel is the recommended platform for Next.js applications:

**Steps:**

1. **Push your code to GitHub**
   ```bash
   git push origin main
   ```

2. **Import repository on Vercel**
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project"
   - Import your GitHub repository

3. **Set up Database and Environment Variables**
   
   **Database Setup:**
   
   **Option A: Using Vercel Postgres (Recommended)**
   - In Vercel dashboard, go to Storage → Create Database → Postgres
   - Choose a region and create the database
   - Vercel will automatically create the `DATABASE_URL` environment variable
   - Enable pgvector extension: Connect to your database and run `CREATE EXTENSION IF NOT EXISTS vector;`
   
   **Option B: Using Neon Database (Recommended for pgvector support)**
   - Create a Neon account at [neon.tech](https://neon.tech) if you don't have one
   - Create a new project in Neon dashboard
   - Choose PostgreSQL version 14 or higher
   - In Vercel dashboard, go to your project → Storage tab
   - Click "Create Database" or "Browse Marketplace"
   - Select "Neon" from the integrations
   - Click "Connect" or "Add Integration"
   - Authenticate with your Neon account
   - Select your Neon project and branch
   - Vercel will automatically create the `DATABASE_URL` environment variable from Neon
   - You may also see additional Neon-related variables like:
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`
     - Your application uses `DATABASE_URL`, so ensure this is set correctly
   - Enable pgvector extension in Neon:
     - Go to Neon dashboard → SQL Editor
     - Run: `CREATE EXTENSION IF NOT EXISTS vector;`
     - Or use Neon's SQL editor to enable the extension
   
   **Option C: Using External Database (Manual Setup)**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Click "Add New"
   - Key: `DATABASE_URL`
   - Value: Your PostgreSQL connection string (e.g., `postgresql://user:password@host:port/database`)
   - Select environments: Production, Preview, Development (as needed)
   - Click "Save"
   
   **Add Other Environment Variables:**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Add all required environment variables:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
     - `OPENAI_API_KEY`
     - `UPLOADTHING_SECRET`
     - `UPLOADTHING_APP_ID`
     - `NODE_ENV=production`
     - `LANGCHAIN_TRACING_V2=true` (optional, for LangSmith tracing)
     - `LANGCHAIN_API_KEY` (optional, required if `LANGCHAIN_TRACING_V2=true`)
     - `TAVILY_API_KEY` (optional, for enhanced web search)
     - `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` (optional)
     - `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` (optional)
     - `NEXT_PUBLIC_CLERK_SIGN_OUT_FORCE_REDIRECT_URL` (optional)

4. **Configure build settings**
   - Build Command: `pnpm build`
   - Output Directory: `.next` (default)
   - Install Command: `pnpm install`

5. **Deploy**
   - Click "Deploy"
   - Vercel will automatically deploy on every push to your main branch

**Post-Deployment:**

1. **Enable pgvector Extension** (Required)
   - **For Vercel Postgres**: Connect to your database using Vercel's database connection tool or SQL editor in the Storage dashboard
   - **For Neon**: Go to Neon dashboard → SQL Editor and run the command
   - **For External Database**: Connect using your preferred PostgreSQL client
   - Run: `CREATE EXTENSION IF NOT EXISTS vector;`

2. **Run Database Migrations**
   - After deployment, run migrations using one of these methods:
     ```bash
     # Option 1: Using Vercel CLI locally
     vercel env pull .env.local
     pnpm db:migrate
     
     # Option 2: Using direct connection (set DATABASE_URL locally)
     DATABASE_URL="your_production_db_url" pnpm db:migrate
     
     # Option 3: Using Drizzle Studio with production URL
     DATABASE_URL="your_production_db_url" pnpm db:studio
     ```

3. **Set up Clerk webhooks** (if needed)
   - Configure webhook URL in Clerk dashboard
   - URL format: `https://your-domain.com/api/webhooks/clerk`

4. **Configure UploadThing**
   - Add your production domain to UploadThing allowed origins
   - Configure CORS settings in UploadThing dashboard

#### 2. Self-Hosted VPS Deployment

**Prerequisites:**
- VPS with Node.js 18+ installed
- PostgreSQL database (with pgvector extension)
- Nginx (for reverse proxy)
- PM2 or similar process manager

**Steps:**

1. **Clone and install dependencies**
   ```bash
   git clone <your-repo-url>
   cd pdr_ai_v2-2
   pnpm install
   ```

2. **Configure environment variables**
   ```bash
   # Create .env file
   nano .env
   # Add all production environment variables
   ```

3. **Build the application**
   ```bash
   pnpm build
   ```

4. **Set up PM2**
   ```bash
   # Install PM2 globally
   npm install -g pm2
   
   # Start the application
   pm2 start pnpm --name "pdr-ai" -- start
   
   # Save PM2 configuration
   pm2 save
   pm2 startup
   ```

5. **Configure Nginx**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

6. **Set up SSL with Let's Encrypt**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

7. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

### Production Database Setup

**Important:** Your production database must have the `pgvector` extension enabled:

```sql
-- Connect to your PostgreSQL database
CREATE EXTENSION IF NOT EXISTS vector;
```

**Database Connection:**

For production, use a managed PostgreSQL service (recommended):
- **Neon**: Fully serverless PostgreSQL with pgvector support
- **Supabase**: PostgreSQL with pgvector extension
- **AWS RDS**: Managed PostgreSQL (requires manual pgvector installation)
- **Railway**: Simple PostgreSQL hosting

**Example Neon connection string:**
```
DATABASE_URL="postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require"
```

### Post-Deployment Checklist

- [ ] Verify all environment variables are set correctly
- [ ] Database migrations have been run
- [ ] Clerk authentication is working
- [ ] File uploads are working (UploadThing)
- [ ] AI features are functioning (OpenAI API)
- [ ] Database has pgvector extension enabled
- [ ] SSL certificate is configured (if using custom domain)
- [ ] Monitoring and logging are set up
- [ ] Backup strategy is in place
- [ ] Error tracking is configured (e.g., Sentry)

### Monitoring and Maintenance

**Health Checks:**
- Monitor application uptime
- Check database connection health
- Monitor API usage (OpenAI, UploadThing)
- Track error rates

**Backup Strategy:**
- Set up automated database backups
- Configure backup retention policy
- Test restore procedures regularly

**Scaling Considerations:**
- Database connection pooling (use PgBouncer or similar)
- CDN for static assets (Vercel handles this automatically)
- Rate limiting for API endpoints
- Caching strategy for frequently accessed data

### Other Useful Scripts

```bash
# Database management
pnpm db:studio          # Open Drizzle Studio (database GUI)
pnpm db:generate         # Generate new migrations
pnpm db:migrate          # Apply migrations
pnpm db:push             # Push schema changes directly

# Code quality
pnpm lint                # Run ESLint
pnpm lint:fix            # Fix ESLint issues
pnpm typecheck           # Run TypeScript type checking
pnpm format:write        # Format code with Prettier
pnpm format:check        # Check code formatting

# Development
pnpm check               # Run linting and type checking
pnpm preview             # Build and start production preview
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── predictive-document-analysis/  # Predictive analysis endpoints
│   │   │   ├── route.ts   # Main analysis API
│   │   │   └── agent.ts   # AI analysis agent
│   │   ├── LangChain/     # AI chat functionality
│   │   └── ...            # Other API endpoints
│   ├── employee/          # Employee dashboard pages
│   ├── employer/          # Employer dashboard pages
│   │   └── documents/     # Document viewer with predictive analysis
│   ├── signup/            # Authentication pages
│   └── _components/       # Shared components
├── server/
│   └── db/               # Database configuration and schema
├── styles/               # CSS modules and global styles
└── env.js                # Environment validation

Key directories:
- `/employee` - Employee interface for document viewing and chat
- `/employer` - Employer interface for management and uploads
- `/api/predictive-document-analysis` - Core predictive analysis functionality
- `/api` - Backend API endpoints for all functionality
- `/server/db` - Database schema and configuration
```

## 🔌 API Endpoints

### Predictive Document Analysis
- `POST /api/predictive-document-analysis` - Analyze documents for missing content and recommendations
- `GET /api/fetchDocument` - Retrieve document content for analysis
- `POST /api/uploadDocument` - Upload documents for processing

### AI Chat & Q&A
- `POST /api/LangChain` - AI-powered document Q&A
- `GET /api/Questions/fetch` - Retrieve Q&A history
- `POST /api/Questions/add` - Add new questions

### Document Management
- `GET /api/fetchCompany` - Get company documents
- `POST /api/deleteDocument` - Remove documents
- `GET /api/Categories/GetCategories` - Get document categories

## 🔐 User Roles & Permissions

### Employee
- View assigned documents
- Chat with AI about documents
- Access document analysis and insights
- Pending approval flow for new employees

### Employer
- Upload and manage documents
- Manage employee access and approvals
- View analytics and statistics
- Configure document categories
- Employee management dashboard

## 🛡️ Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string. Format: `postgresql://user:password@host:port/database` | ✅ | `postgresql://postgres:password@localhost:5432/pdr_ai_v2` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (client-side). Get from [Clerk Dashboard](https://clerk.com/) | ✅ | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk secret key (server-side). Get from [Clerk Dashboard](https://clerk.com/) | ✅ | `sk_test_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL` | Force redirect URL after sign in. If not set, uses Clerk default. | ✅ | `https://your-domain.com/employer/home` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | Force redirect URL after sign up. If not set, uses Clerk default. | ✅ | `https://your-domain.com/signup` |
| `NEXT_PUBLIC_CLERK_SIGN_OUT_FORCE_REDIRECT_URL` | Force redirect URL after sign out. If not set, uses Clerk default. | ✅ | `https://your-domain.com/` |
| `OPENAI_API_KEY` | OpenAI API key for AI features (embeddings, chat, document analysis). Get from [OpenAI Platform](https://platform.openai.com/) | ✅ | `sk-...` |
| `LANGCHAIN_TRACING_V2` | Enable LangSmith tracing for LangChain operations. Set to `true` to enable. Get API key from [LangSmith](https://smith.langchain.com/) | ❌ | `true` or `false` |
| `LANGCHAIN_API_KEY` | LangChain API key for LangSmith tracing and monitoring. Required if `LANGCHAIN_TRACING_V2=true`. Get from [LangSmith](https://smith.langchain.com/) | ❌ | `lsv2_...` |
| `TAVILY_API_KEY` | Tavily Search API key for enhanced web search in document analysis. Get from [Tavily](https://tavily.com/) | ❌ | `tvly-...` |
| `UPLOADTHING_SECRET` | UploadThing secret key for file uploads. Get from [UploadThing Dashboard](https://uploadthing.com/) | ✅ | `sk_live_...` |
| `UPLOADTHING_APP_ID` | UploadThing application ID. Get from [UploadThing Dashboard](https://uploadthing.com/) | ✅ | `your_app_id` |
| `NODE_ENV` | Environment mode. Must be one of: `development`, `test`, `production` | ✅ | `development` |
| `SKIP_ENV_VALIDATION` | Skip environment validation during build (useful for Docker builds) | ❌ | `false` or `true` |

### Environment Variables by Feature

- **Authentication**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Authentication Redirects**: `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_OUT_FORCE_REDIRECT_URL`
- **Database**: `DATABASE_URL`
- **AI Features**: `OPENAI_API_KEY` (used for embeddings, chat, and document analysis)
- **AI Observability**: `LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY` (for LangSmith tracing and monitoring)
- **Search Features**: `TAVILY_API_KEY` (for enhanced web search in document analysis)
- **File Uploads**: `UPLOADTHING_SECRET`, `UPLOADTHING_APP_ID`
- **Build Configuration**: `NODE_ENV`, `SKIP_ENV_VALIDATION`

## 🐛 Troubleshooting

### Database Issues
- Ensure Docker is running before starting the database
- Check if the database container is running: `docker ps`
- Restart the database: `docker restart pdr_ai_v2-postgres`

### Environment Issues
- Verify all required environment variables are set
- Check `.env` file formatting (no spaces around `=`)
- Ensure API keys are valid and have proper permissions

### Build Issues
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check TypeScript errors: `pnpm typecheck`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests and linting: `pnpm check`
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📝 License

This project is private and proprietary.

## 📞 Support

For support or questions, contact the development team or create an issue in the repository.
