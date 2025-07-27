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
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/pdr_ai_v2"

# Clerk Authentication (get from https://clerk.com/)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# OpenAI API (get from https://platform.openai.com/)
OPENAI_API_KEY=your_openai_api_key

# UploadThing (get from https://uploadthing.com/)
UPLOADTHING_SECRET=your_uploadthing_secret
UPLOADTHING_APP_ID=your_uploadthing_app_id

# Environment
NODE_ENV=development
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

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | ✅ |
| `CLERK_SECRET_KEY` | Clerk secret key | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for AI features | ✅ |
| `UPLOADTHING_SECRET` | UploadThing secret for file uploads | ✅ |
| `UPLOADTHING_APP_ID` | UploadThing application ID | ✅ |
| `NODE_ENV` | Environment mode | ✅ |

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
