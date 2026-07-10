# School Management System

A modern, multi-tenant **School Management System** built with **Next.js 15**, designed for primary and secondary schools. The platform provides administrators, teachers, students, parents, accountants, and system administrators with a unified, responsive, and offline-capable experience.

The system is designed to support multiple schools (tenants), each with its own branding, configuration, users, and data while sharing the same application codebase.

---

# Features

## Student Management

- Student registration and admission
- Student profiles
- Class and section assignment
- Student promotion between academic years
- Attendance tracking
- Student ID generation
- Academic history

## Teacher Management

- Teacher accounts and profiles
- Attendance management
- Grade entry
- Continuous assessment management
- Subject assignment
- Class assignment

## Academic Management

- Multi-year academic sessions
- Terms and semesters
- Subject management
- Class management
- Promotion engine
- Grade calculations
- Report cards
- Transcripts
- Recommendation letters

## Financial Management

- Student billing
- Outstanding balances
- Payment recording
- Receipt generation
- Financial reports

## Admissions

The platform supports two admission workflows:

### Entrance Registration

- Entrance exam registration
- Multiple entrance date selection
- Applicant information
- Optional online payment

### General Admission

- Student application
- Academic history
- Parent/Guardian information
- Document uploads
- Optional online payment

Supported payment methods include:

- Visa
- Mastercard
- Orange Money
- MTN Mobile Money

---

# User Roles

The system supports role-based dashboards for:

- System Administrator
- School Administrator
- Teacher
- Student
- Parent
- Accountant

Each role has its own dashboard, permissions, navigation, and available features.

---

# Multi-Tenant Architecture

The application is built as a true multi-tenant platform.

Each school has:

- Independent database
- Custom branding
- School logo
- School information
- Academic settings
- User accounts

The application dynamically connects to the correct tenant database during runtime.

---

# Offline Support

The application is designed as an offline-first Progressive Web App (PWA).

Features include:

- Cached dashboard pages
- Offline navigation
- Offline report viewing
- Graceful handling of unavailable network requests
- Automatic synchronization when internet connectivity returns

---

# Realtime Synchronization

The platform includes a realtime synchronization layer for keeping data consistent across devices.

Examples include:

- Attendance updates
- Grade updates
- Notifications
- Student records
- Administrative changes

---

# Technology Stack

### Frontend

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide Icons

### Backend

- Next.js API Routes
- MongoDB
- Mongoose

### Authentication

- Role-based authentication
- Session management

### Realtime

- Server-Sent Events (SSE)
- Cloudflare Workers
- Cloudflare Durable Objects
- Upstash Redis Pub/Sub

### Deployment

- Vercel
- Cloudflare Workers

---

# Project Structure

```
app/
components/
lib/
hooks/
store/
types/
cloudflare/
public/
```

---

# Getting Started

## Prerequisites

- Node.js 20+
- npm (or pnpm, yarn, bun)
- MongoDB

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd <project-folder>
```

Install dependencies:

```bash
npm install
```

Create a `.env.local` file:

```env
MONGODB_URI=

NEXTAUTH_SECRET=

NEXTAUTH_URL=

UPSTASH_REDIS_REST_URL=

UPSTASH_REDIS_REST_TOKEN=

CLOUDFLARE_ACCOUNT_ID=

CLOUDFLARE_API_TOKEN=

CLOUDFLARE_WORKER_URL=
```

Run the development server:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

# Environment Variables

Depending on your deployment, you may need:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `NEXTAUTH_SECRET` | Authentication secret |
| `NEXTAUTH_URL` | Base application URL |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash authentication token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `CLOUDFLARE_WORKER_URL` | Realtime worker URL |

---

# Realtime Streaming Architecture

The application uses split hosting to improve scalability.

## Application

- Hosted on **Vercel**
- Serves the web application
- Handles API routes
- Authentication
- Database operations

## Realtime Layer

Hosted on **Cloudflare Workers** using:

- Durable Objects
- Server-Sent Events (SSE)

This service handles:

- Live synchronization
- Connected clients
- Presence
- Event broadcasting

## Pub/Sub

The realtime layer uses **Upstash Redis** as its Pub/Sub transport.

Deployment instructions for the worker can be found in:

```
cloudflare/sync-stream-worker/README.md
```

---

# Scripts

```bash
npm run dev        # Development server

npm run build      # Production build

npm run start      # Start production server

npm run lint       # Lint project
```

---

# Future Enhancements

Some planned and ongoing features include:

- Parent mobile experience
- Push notifications
- Timetable management
- Examination management
- Homework management
- Library management
- Hostel management
- SMS integration
- Email notifications
- School analytics dashboard
- AI-assisted administrative tools

---

# License

This project is proprietary software. Unauthorized copying, modification, distribution, or commercial use without permission is prohibited.