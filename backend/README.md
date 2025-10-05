# Live Better Backend

REST API for Live Better productivity application.

> **Main documentation:** See [../README.md](../README.md) for project overview and setup.

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment
touch .env  # Then edit with your credentials (DATABASE_URL, JWT_SECRET, OPENAI_API_KEY)

# Create PostgreSQL database
podman run --name livebetter-postgres \
-e POSTGRES_USER=livebetter \
-e POSTGRES_PASSWORD=livebetter \
-e POSTGRES_DB=livebetter \
-p 5432:5432 \
-d postgres:17

# Setup database schema
bunx drizzle-kit generate  # Generate migrations
bunx drizzle-kit migrate   # Apply migrations

# Run server
bun run dev  # http://localhost:3000
```

**⚠️ Before starting:** Make sure to:
1. Create the PostgreSQL database (`live_better`)
2. Update `.env` with your actual database credentials
3. Set a secure `JWT_SECRET` (min 32 characters)
4. Get your OpenAI API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)


## Testing

```bash
# Run all tests
bun test

# Coverage report
bun test --coverage

# Watch mode
bun test --watch

# Specific tests
bun test src/services/ai.test.ts
```

**Coverage:** 375 tests, 91.85% line coverage

## API Reference

Base URL: `http://localhost:3000/api`

### Authentication

#### Register
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123","name":"John"}'
```

#### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"pass123"}'
```

#### Get Profile (Protected)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Update Profile (Protected)
```bash
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","userContext":"I prefer mornings","preferredTimeSlots":["morning","night"]}'
```

### Goals

#### Create Goal
```bash
curl -X POST http://localhost:3000/api/goals \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn TypeScript","description":"Master TS","targetDate":"2025-12-31"}'
```

#### Get All Goals
```bash
curl -X GET http://localhost:3000/api/goals \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get Single Goal
```bash
curl -X GET http://localhost:3000/api/goals/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Update Goal
```bash
curl -X PUT http://localhost:3000/api/goals/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Master TypeScript","completed":false}'
```

#### Delete Goal
```bash
curl -X DELETE http://localhost:3000/api/goals/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Tasks

#### Create Task
```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Study","timeSlot":"morning","duration":60,"goalId":1}'
```

#### Get Today's Tasks
```bash
curl -X GET http://localhost:3000/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Get All Tasks
```bash
curl -X GET http://localhost:3000/api/tasks/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Update Task
```bash
curl -X PUT http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'
```

#### Delete Task
```bash
curl -X DELETE http://localhost:3000/api/tasks/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Validate with Photo
```bash
curl -X POST http://localhost:3000/api/tasks/1/validate-photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"photoUrl":"https://example.com/photo.jpg"}'
```

### AI

#### Generate Daily Schedule
```bash
curl -X POST http://localhost:3000/api/goals/tasks/ai-create-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Morning study session",
      "timeSlot": "morning",
      "duration": 60,
      "goalId": 1,
      "aiGenerated": true
    }
  ],
  "reasoning": "Scheduled based on your morning preference"
}
```

#### Check AI Daily Limit
```bash
curl -X GET http://localhost:3000/api/goals/tasks/daily-limit-check \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Database Schema

### Users Table
```typescript
{
  id: serial
  email: varchar(255) unique
  password: varchar(255)
  name: varchar(255)
  userContext: text
  preferredTimeSlots: varchar
  createdAt: timestamp
  aiGenerationsToday: integer
  lastAiGenerationDate: date
}
```

### Goals Table
```typescript
{
  id: serial
  userId: integer → users.id
  title: varchar(255)
  description: text
  targetDate: date
  completed: boolean
  createdAt: timestamp
}
```

### Tasks Table
```typescript
{
  id: serial
  userId: integer → users.id
  goalId: integer → goals.id
  title: varchar(255)
  description: text
  timeSlot: varchar(50)
  specificTime: timestamp
  duration: integer
  completed: boolean
  aiGenerated: boolean
  photoUrl: varchar(500)
  createdAt: timestamp
}
```

## Tech Stack

- **Runtime:** Bun 1.2.21
- **Framework:** Hono 4.9.6
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** JWT + bcryptjs
- **Validation:** Zod
- **AI:** OpenAI GPT-4
- **Testing:** Bun Test

## Project Structure

```
backend/
├── src/
│   ├── db/
│   │   ├── index.ts           # DB connection
│   │   ├── schema.ts          # Drizzle schema
│   │   └── test-db.ts         # Test utilities
│   ├── middleware/
│   │   └── auth.ts            # JWT middleware
│   ├── routes/
│   │   ├── auth.ts            # Auth endpoints
│   │   ├── goals.ts           # Goals endpoints
│   │   └── tasks.ts           # Tasks endpoints
│   ├── services/
│   │   ├── ai.ts              # OpenAI integration
│   │   └── photoValidation.ts # Photo validation
│   ├── utils/
│   │   ├── auth.ts            # Auth helpers
│   │   └── time.ts            # Time helpers
│   └── index.ts               # Entry point
├── drizzle/                   # Migrations
├── .env                       # Environment vars
└── package.json
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/live_better

# Authentication (min 32 chars)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# AI Service
OPENAI_API_KEY=sk-your-openai-api-key
```

## Test Coverage

| File | Coverage | Tests |
|------|----------|-------|
| `utils/time.ts` | 100% | 45 |
| `utils/auth.ts` | 95.24% | 38 |
| `middleware/auth.ts` | 100% | 25 |
| `services/ai.ts` | 100% | 18 |
| `services/photoValidation.ts` | 85.25% | 6 |
| `routes/auth.ts` | 89.02% | 52 |
| `routes/goals.ts` | 62.00% | 79 |
| `routes/tasks.ts` | 78.89% | 69 |
| **Overall** | **91.85%** | **375** |

## Common Issues

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
```

### JWT Token Invalid
- Ensure `JWT_SECRET` is at least 32 characters
- Check token hasn't expired (7-day limit)
- Verify `Authorization: Bearer TOKEN` format

### OpenAI API Error
- Verify `OPENAI_API_KEY` is valid
- Check quota at platform.openai.com
- Ensure internet connection

## Additional Resources

- [Main README](../README.md) - Project overview
- [Frontend README](../frontend/README.md) - Frontend docs
