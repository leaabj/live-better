# Live Better

An AI-powered productivity application that helps users achieve their goals through intelligent task scheduling and progress tracking.

## Overview

Live Better combines goal management, AI-driven task generation, and photo validation to help users stay productive and accountable. Set your goals, let AI create your daily schedule, and track your progress with visual feedback.

## Features

- **Goal Management** - Create, track, and manage personal goals
- **AI Task Generation** - Automatically generate daily schedules using OpenAI GPT-4
- **Task Tracking** - Organize tasks by time slots (morning/afternoon/night)
- **Photo Validation** - Verify task completion with photos
- **Secure Authentication** - JWT-based auth with bcrypt password hashing
- **3D Visualizations** - Interactive WebGL backgrounds with Three.js
- **Progress Tracking** - Monitor goal completion and productivity

## Quick Start

### Prerequisites

- **Bun** v1.2.21+ ([Install Bun](https://bun.sh))
- **PostgreSQL** 14+
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))

### Installation

```bash
# Clone the repository
git clone https://github.com/leaabj/live-better.git
cd lb

# Install backend dependencies
cd backend
bun install

# Install frontend dependencies
cd ../frontend
bun install
```

### Environment Setup

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/live_better
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
OPENAI_API_KEY=sk-your-openai-api-key
```

### Database Setup

```bash
cd backend
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
bun run dev  # http://localhost:3000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
bun run dev  # http://localhost:3001
```

Visit **http://localhost:3001** to use the app!

## Project Structure

```
lb/
├── backend/              # REST API (Hono + Bun)
│   ├── src/
│   │   ├── db/          # Database schema & connection
│   │   ├── middleware/  # Authentication
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # AI & photo validation
│   │   └── utils/       # Helper functions
│   └── drizzle/         # Database migrations
│
├── frontend/            # React SPA (React 19 + Vite)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── routes/      # Pages (TanStack Router)
│   │   └── lib/         # Auth & utilities
│   └── public/          # Static assets
│
└── README.md            # This file
```

## Tech Stack

### Backend
- **Runtime:** Bun 1.2.21
- **Framework:** Hono 4.9.6
- **Database:** PostgreSQL + Drizzle ORM
- **Authentication:** JWT + bcryptjs
- **AI:** OpenAI GPT-4
- **Validation:** Zod
- **Testing:** Bun Test (375 tests, 91.85% coverage)

### Frontend
- **Framework:** React 19
- **Router:** TanStack Router 1.132
- **Styling:** Tailwind CSS 4.0
- **3D Graphics:** Three.js 0.180
- **Build Tool:** Vite 6.3

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile (protected)
- `PUT /api/auth/profile` - Update profile (protected)

### Goals
- `GET /api/goals` - Get all goals (protected)
- `POST /api/goals` - Create goal (protected)
- `GET /api/goals/:id` - Get specific goal (protected)
- `PUT /api/goals/:id` - Update goal (protected)
- `DELETE /api/goals/:id` - Delete goal (protected)

### Tasks
- `GET /api/tasks` - Get today's tasks (protected)
- `GET /api/tasks/all` - Get all tasks (protected)
- `POST /api/tasks` - Create task (protected)
- `PUT /api/tasks/:id` - Update task (protected)
- `DELETE /api/tasks/:id` - Delete task (protected)
- `POST /api/tasks/:id/validate-photo` - Validate with photo (protected)

### AI
- `POST /api/goals/tasks/ai-create-all` - Generate daily schedule (protected)
- `GET /api/goals/tasks/daily-limit-check` - Check AI usage limit (protected)

**Full API documentation:** See [backend/README.md](./backend/README.md)

## Testing

```bash
cd backend

# Run all tests
bun test

# Run with coverage
bun test --coverage

# Watch mode
bun test --watch
```

**Test Coverage:**
- **375 tests** across 11 files
- **91.85%** line coverage
- **87.68%** function coverage
- **100%** AI service coverage

## Database Schema

### Users
- Email, password (hashed), name
- User context for AI personalization
- Preferred time slots
- AI generation tracking

### Goals
- Title, description, target date
- Completion status
- User association

### Tasks
- Title, description, time slot
- Specific time, duration
- Completion status, photo URL
- AI-generated flag
- Goal association

**Full schema:** See [backend/README.md](./backend/README.md)

## Features in Detail

### AI Task Generation
The AI service analyzes your goals and user context to create a personalized daily schedule:
- Respects preferred time slots
- Considers task duration (5-480 minutes)
- Balances workload across the day
- Provides reasoning for scheduling decisions

### Photo Validation
Verify task completion by uploading photos:
- Stores photo URLs
- Links photos to specific tasks
- Visual progress tracking

### Time Slots
Tasks are organized into three time periods:
- **Morning:** 4:30 AM - 12:00 PM
- **Afternoon:** 12:01 PM - 6:00 PM
- **Night:** 6:01 PM - 12:00 AM

## Documentation

- [Backend README](./backend/README.md) - API reference, testing, deployment
- [Frontend README](./frontend/README.md) - Component docs, routing, styling
- [Quick Start Guide](./QUICK_START.md) - One-page setup reference

## Development Workflow

```bash
# Start backend (Terminal 1)
cd backend && bun run dev

# Start frontend (Terminal 2)
cd frontend && bun run dev

# Run tests (Terminal 3)
cd backend && bun test --watch
```
