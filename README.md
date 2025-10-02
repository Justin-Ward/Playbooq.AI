# Playbooq.AI

An AI-powered playbook creation and sharing platform built with Next.js, featuring authentication, database integration, and rich content editing capabilities.

## 🚀 Features

- **Authentication**: Secure user authentication with Clerk
- **Database**: Supabase integration with PostgreSQL
- **Rich Text Editing**: TipTap editor for playbook content
- **File Processing**: Support for PDF, Word, CSV, and other file formats
- **AI Integration**: Claude AI for intelligent content generation
- **Payments**: Stripe integration for premium features
- **Email**: Resend for transactional emails

## 📁 Project Structure

```
playbooq/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   │   ├── sign-in/       # Sign in page
│   │   └── sign-up/       # Sign up page
│   ├── marketplace/       # Public marketplace
│   ├── playbooks/         # User playbooks dashboard
│   ├── layout.tsx         # Root layout with ClerkProvider
│   └── page.tsx           # Homepage
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   └── Navbar.tsx        # Navigation component
├── lib/                  # Libraries and utilities
│   ├── supabase.ts       # Supabase client configuration
│   └── utils.ts          # Utility functions
├── types/                # TypeScript type definitions
│   └── database.ts       # Supabase database types
├── docs/                 # Documentation
│   ├── PRD.md           # Product Requirements Document
│   ├── schema.sql       # Database schema
│   └── supabase-setup.md # Setup instructions
└── middleware.ts         # Clerk authentication middleware
```

## 🛠️ Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Clerk account

### Environment Variables
Copy `.env.example` to `.env.local` and fill in your keys:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Additional services...
```

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up the database:**
   - Create a Supabase project
   - Run the SQL from `docs/schema.sql` in your Supabase SQL Editor
   - Update your environment variables

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Tech Stack

### Core
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### Authentication & Database
- **Clerk** - User authentication and management
- **Supabase** - PostgreSQL database with real-time features

### Rich Content
- **TipTap** - Rich text editor
- **Lucide React** - Icon library

### File Processing
- **jsPDF** - PDF generation
- **pdf-parse** - PDF text extraction
- **mammoth** - Word document processing
- **papaparse** - CSV parsing

### AI & Payments
- **Anthropic Claude** - AI content generation
- **Stripe** - Payment processing
- **Resend** - Email delivery

## 📝 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔐 Authentication

The app uses Clerk for authentication with the following routes:
- `/` - Public homepage
- `/sign-in` - Sign in page
- `/sign-up` - Sign up page
- `/marketplace` - Public marketplace
- `/playbooks` - Protected user dashboard (requires authentication)

## 📊 Database

The app uses Supabase with the following main tables:
- `playbooks` - User-created playbooks
- `playbook_collaborators` - Collaboration permissions
- `playbook_executions` - Execution history
- `user_profiles` - Extended user information

## 🚀 Deployment

Ready for deployment to Vercel, Netlify, or any Next.js-compatible platform. Make sure to:
1. Set up environment variables in your deployment platform
2. Configure your Supabase production database
3. Update Clerk settings for your production domain