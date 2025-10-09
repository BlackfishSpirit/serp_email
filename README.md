# 🚀 ShipsMind AI Consulting Website

## ⚡ **Quick Start for New Team Members**

**Welcome! Get up and running in 75 seconds:**

### **Windows:**

```bash
# 1. Clone the repository
git clone <repository-url>
cd shipsmind_speckit

# 2. Run the quick-start script
./quick-start.bat
```

### **macOS/Linux:**

```bash
# 1. Clone the repository
git clone <repository-url>
cd shipsmind_speckit

# 2. Run the quick-start script
./quick-start.sh
```

**The script will automatically:**

- ✅ Install all dependencies
- ✅ Start the development server
- ✅ Open your **interactive workflow checklist** at http://localhost:3000/dev/workflow

---

## 🎯 **Interactive Development Workflow**

After running the quick-start script, you'll have access to our **guided workflow dashboard**:

**📋 http://localhost:3000/dev/workflow**

This interactive checklist guides you through:

- **🚀 Environment Setup** - Dependencies, database, Docker
- **🤖 MCP Server Setup** - AI enhancement tools (Playwright, Context7, GitHub, shadcn)
- **🌐 Remote SSH Development** - Secure remote access via Cloudflare tunnel
- **🛠️ Feature Development** - Spec-driven development with Specify CLI
- **✅ Quality Assurance** - AI-powered code, design, and security reviews
- **📝 Git Workflow** - Commits, PRs, and automated reviews

**Key Features:**

- ✅ **Progress tracking** - Your progress is saved locally
- ✅ **Step-by-step guidance** - Color-coded tasks with time estimates
- ✅ **Copy-paste commands** - One-click command copying
- ✅ **Documentation links** - Quick access to detailed guides
- ✅ **Auto-detection** - Automatically detects completed tasks

---

## 📚 **Documentation**

| Document                                                   | Purpose                                   |
| ---------------------------------------------------------- | ----------------------------------------- |
| **[TEAM_SETUP.md](./TEAM_SETUP.md)**                       | Complete team setup and development guide |
| **[PROJECT_SPECIFICATION.md](./PROJECT_SPECIFICATION.md)** | Project goals and requirements            |
| **[TECHNICAL_PLAN.md](./TECHNICAL_PLAN.md)**               | Technical architecture and implementation |
| **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** | Deployment guide and troubleshooting      |

---

## 🛠️ **Tech Stack**

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: Clerk
- **AI Tools**: Claude Code with MCP servers
- **Development**: Docker, pnpm, Specify CLI

## 📁 **App Directory Structure**

The Next.js App Router is organized as follows:

### **Root Pages**
- `/` - Homepage with hero section, solutions overview, and CTA
- `/auth` - Authentication hub with login/signup and dashboard
- `/dashboard` - Main application dashboard
- `/dev` - Development tools and workflow management
- `/solutions` - Industry-specific solution pages

### **API Routes** (`/api`)
- `/api/auth/` - Authentication endpoints
  - `session` - Session management and user info
  - `verification-status` - Email verification status
  - `preferences` - User preference management
- `/api/contact` - Contact form submission
- `/api/dev/workflow/` - Development workflow APIs
  - `progress` - Workflow progress tracking

### **Authentication Pages** (`/auth`)
- `/auth` - Main auth page with login/signup forms and SERP settings
- `/auth/account-settings` - User account management (includes profile, business, and email configuration)
- `/auth/category-lookup` - Browse business categories
- `/auth/email-drafts` - Email draft management
- `/auth/leads` - Lead management dashboard
- `/auth/location-lookup` - Location code browser

### **Clerk Auth Routes** (`/(auth)`)
- `/(auth)/sign-in/[[...rest]]` - Clerk sign-in pages
- `/(auth)/sign-up/[[...rest]]` - Clerk sign-up pages

### **Dashboard Pages** (`/dashboard`)
- `/dashboard/leads` - Lead management interface

### **Development Tools** (`/dev`)
- `/dev/design` - Design workflow and tools
- `/dev/features` - Feature development tracking
- `/dev/workflow` - Interactive development checklist

### **Solution Pages** (`/solutions`)
- `/solutions/accounting` - Accounting automation solutions
- `/solutions/marketing` - Marketing automation solutions
- `/solutions/retail` - Retail automation solutions
- `/solutions/trades` - Skilled trades automation solutions

### **Layout Files**
- `app/layout.tsx` - Root layout with Clerk provider and header
- `app/auth/layout.tsx` - Authentication section layout

**Total: 29 TypeScript files across 30+ directories**

---

## 🤖 **AI-Powered Development**

This project uses cutting-edge AI tools for enhanced productivity:

- **Claude Code** - AI coding assistant with specialized agents
- **MCP Servers** - Enhanced AI capabilities:
  - **Playwright** - Browser automation and testing
  - **Context7** - Up-to-date documentation and best practices
  - **GitHub** - Repository integration and analysis
  - **shadcn/ui** - Component library integration
- **Specify CLI** - Spec-driven development workflow
- **Automated Reviews** - AI-powered code, design, and security reviews

---

## 🚀 **Getting Started (Detailed)**

If you need more control than the quick-start script:

### **1. Prerequisites**

- Node.js 18.17.0+
- pnpm 8.0.0+
- Docker (for development database)
- Git

### **2. Manual Setup**

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local

# Start Docker services
pnpm docker:dev

# Initialize database
pnpm db:generate
pnpm db:push

# Start development server
pnpm dev
```

### **3. Access the Application**

- **Website**: http://localhost:3000
- **Workflow Checklist**: http://localhost:3000/dev/workflow
- **Database Studio**: `pnpm db:studio`

---

## 🌐 **Remote Development**

Team members can develop remotely on the Ubuntu server via secure Cloudflare tunnel:

1. **Follow the workflow checklist** at http://localhost:3000/dev/workflow
2. **See detailed instructions** in [TEAM_SETUP.md](./TEAM_SETUP.md#remote-development-via-ssh-tunnel)
3. **Use VS Code Remote-SSH** for seamless remote development

---

## 🤝 **Contributing**

1. **Start with the workflow checklist** - http://localhost:3000/dev/workflow
2. **Use Specify CLI** for spec-driven development
3. **Follow AI review workflow** - Automated code, design, and security reviews
4. **See [TEAM_SETUP.md](./TEAM_SETUP.md)** for complete development guidelines

---

## 📞 **Support**

- **Development issues**: See [TEAM_SETUP.md](./TEAM_SETUP.md#troubleshooting)
- **Production issues**: See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)
- **Workflow questions**: Check the interactive checklist at http://localhost:3000/dev/workflow

---

**Happy coding! 🎉**
