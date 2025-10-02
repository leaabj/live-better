# Live Better Backend

A Hono-based REST API for the Live Better productivity application with AI-powered task scheduling and photo validation.

## 📋 Requirements

- **Bun** v1.2.21 or higher ([Install Bun](https://bun.sh))
- **PostgreSQL** 14+ (running locally or remote)
- **OpenAI API Key** (for AI task generation)

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Setup

Create a `.env` file in the backend root:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/live_better
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
OPENAI_API_KEY=sk-your-openai-api-key
```

**Important:**
- Replace `username`, `password`, and database name with your PostgreSQL credentials
- Generate a secure JWT secret (at least 32 characters)
- Get your OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)

### 3. Database Setup

```bash
# Generate and run migrations
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

### 4. Run the Server

```bash
# Development mode (with hot reload)
bun run dev

```

Server runs at **http://localhost:3000**

---

## Testing

```bash
# Run all tests
bun test

# Run with coverage report
bun test --coverage

# Run in watch mode
bun test --watch

# Run specific test files
bun test src/services/ai.test.ts
bun test src/routes/
```

**Current Test Stats:**
- **375 tests** across 11 files
- **91.85% line coverage**
- **87.68% function coverage**

---

## API Reference

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "name": "John Doe"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

#### Get Profile (Protected)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Profile (Protected)
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "userContext": "I work 9-5 and prefer morning workouts",
    "preferredTimeSlots": ["morning", "night"]
  }'
```

---

### Goals Endpoints

#### Create Goal
```bash
curl -X POST http://localhost:3000/api/goals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learn TypeScript",
    "description": "Master TypeScript fundamentals",
    "targetDate": "2025-12-31"
  }'
```

#### Get All Goals
```bash
curl -X GET http://localhost:3000/api/goals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Single Goal
```bash
curl -X GET http://localhost:3000/api/goals/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Goal
```bash
curl -X PUT http://localhost:3000/api/goals/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Master TypeScript",
    "description": "Become a TypeScript expert",
    "completed": false
  }'
```

#### Delete Goal
```bash
curl -X DELETE http://localhost:3000/api/goals/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### Tasks Endpoints

#### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Read TypeScript docs",
    "description": "Read chapters 1-3",
    "timeSlot": "morning",
    "specificTime": "2025-10-02T09:00:00Z",
    "duration": 60,
    "goalId": 1
  }'
```

#### Get Today's Tasks
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get All Tasks
```bash
curl -X GET http://localhost:3000/api/tasks/all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Task
```bash
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "completed": true,
    "duration": 90
  }'
```

#### Delete Task
```bash
curl -X DELETE http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Validate Task with Photo
```bash
curl -X POST http://localhost:3000/api/tasks/1/validate-photo \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrl": "https://example.com/photo.jpg"
  }'
```

---

### AI Task Generation

#### Generate Daily Schedule
```bash
curl -X POST http://localhost:3000/api/goals/tasks/ai-create-all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Morning TypeScript study",
      "description": "Review basic types",
      "timeSlot": "morning",
      "specificTime": "2025-10-02T08:00:00Z",
      "duration": 60,
      "goalId": 1,
      "aiGenerated": true
    }
  ],
  "reasoning": "Scheduled learning tasks in the morning based on your preference for morning productivity"
}
```

#### Check Daily AI Limit
```bash
curl -X GET http://localhost:3000/api/goals/tasks/daily-limit-check \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Project Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── index.ts              # Database connection
│   │   ├── schema.ts             # Drizzle ORM schema
│   │   └── test-db.ts            # Test database utilities
│   ├── middleware/
│   │   └── auth.ts               # JWT authentication (100% coverage)
│   ├── routes/
│   │   ├── auth.ts               # Auth endpoints (89% coverage)
│   │   ├── goals.ts              # Goals endpoints (62% coverage)
│   │   └── tasks.ts              # Tasks endpoints (79% coverage)
│   ├── services/
│   │   ├── ai.ts                 # OpenAI integration (100% coverage)
│   │   └── photoValidation.ts   # Photo validation (85% coverage)
│   ├── utils/
│   │   ├── auth.ts               # Auth utilities (95% coverage)
│   │   └── time.ts               # Time utilities (100% coverage)
│   └── index.ts                  # App entry point
├── drizzle/                      # Database migrations
├── .env                          # Environment variables (create this)
├── bun.test.config.json          # Test configuration
├── drizzle.config.ts             # Drizzle config
├── package.json
└── README.md
```

---

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Bun v1.2.21 |
| **Framework** | Hono v4.9.6 |
| **Database** | PostgreSQL + Drizzle ORM |
| **Auth** | JWT + bcryptjs |
| **Validation** | Zod |
| **AI** | OpenAI GPT-4 |
| **Testing** | Bun Test |

---

## Security Features

- ✅ Password hashing with bcrypt (12 salt rounds)
- ✅ JWT tokens with 7-day expiration
- ✅ Protected routes with authentication middleware
- ✅ Input validation with Zod schemas
- ✅ CORS configuration
- ✅ SQL injection protection (Drizzle ORM)

---


### JWT Token Invalid
- Ensure `JWT_SECRET` is at least 32 characters
- Check token hasn't expired (7-day limit)
- Verify `Authorization: Bearer TOKEN` header format

### OpenAI API Error
- Verify `OPENAI_API_KEY` is valid
- Check API quota/billing at platform.openai.com
- Ensure internet connection for API calls

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

---

## Testing Coverage

| File | Coverage | Tests |
|------|----------|-------|
| `src/utils/time.ts` | 100% | 45 |
| `src/utils/auth.ts` | 95.24% | 38 |
| `src/middleware/auth.ts` | 100% | 25 |
| `src/services/ai.ts` | 100% | 18 |
| `src/services/photoValidation.ts` | 85.25% | 6 |
| `src/routes/auth.ts` | 89.02% | 52 |
| `src/routes/goals.ts` | 62.00% | 79 |
| `src/routes/tasks.ts` | 78.89% | 69 |
| **Overall** | **91.85%** | **375** |

---
