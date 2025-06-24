# PDR AI - Professional Document Reader AI

A Next.js application that uses advanced AI technology to analyze, interpret, and extract insights from professional documents. Features employee/employer authentication, document upload and management, AI-powered chat, and comprehensive document analysis.

## 🚀 Features

- **Professional Document Analysis**: Advanced AI algorithms analyze documents and extract key information
- **AI-Powered Chat**: Interactive chat interface for document-specific questions and insights
- **Role-Based Authentication**: Separate interfaces for employees and employers using Clerk
- **Document Management**: Upload, organize, and manage documents with category support
- **Employee Management**: Employer dashboard for managing employee access and approvals
- **Real-time Chat History**: Persistent chat sessions for each document
- **Responsive Design**: Modern UI with Tailwind CSS

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
│   ├── employee/          # Employee dashboard pages
│   ├── employer/          # Employer dashboard pages
│   ├── signup/            # Authentication pages
│   └── _components/       # Shared components
├── server/
│   └── db/               # Database configuration and schema
├── styles/               # CSS modules and global styles
└── env.js                # Environment validation

Key directories:
- `/employee` - Employee interface for document viewing and chat
- `/employer` - Employer interface for management and uploads
- `/api` - Backend API endpoints for all functionality
- `/server/db` - Database schema and configuration
```

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
