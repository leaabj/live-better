# Live Better Frontend

React-based frontend for Live Better productivity application.

> **Main documentation:** See [../README.md](../README.md) for project overview and setup.

## Quick Start

```bash
# Install dependencies
bun install

# Run dev server
bun run dev  # http://localhost:3001
```

**Note:** Backend must be running on `http://localhost:3000`

## Tech Stack

- **React** 19.0
- **TypeScript** 5.7+
- **TanStack Router** 1.132+ (file-based routing)
- **Tailwind CSS** 4.0+ (styling)
- **Three.js** 0.180+ (3D graphics)
- **Vite** 6.3+ (build tool)

## Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── ui/                    # Button, Input
│   │   ├── ProtectedRoute.tsx     # Auth guard
│   │   ├── ProtectedGoals.tsx     # Goals wrapper
│   │   ├── ProtectedTasks.tsx     # Tasks wrapper
│   │   ├── SparklingProgress.tsx  # Progress viz
│   │   └── WebGLBackground.tsx    # 3D background
│   ├── routes/
│   │   ├── __root.tsx             # Root layout
│   │   ├── index.tsx              # Landing page
│   │   ├── login.tsx              # Login
│   │   ├── signup.tsx             # Signup
│   │   ├── profile.tsx            # User profile
│   │   ├── goals.tsx              # Goals page
│   │   ├── tasks.tsx              # Tasks page
│   │   └── loading.tsx            # Loading state
│   ├── lib/
│   │   ├── auth.tsx               # Auth context
│   │   └── utils.ts               # Helpers
│   └── main.tsx                   # Entry point
└── public/
```

## Routes

TanStack Router auto-generates routes from `src/routes/`:

| File | Route | Access |
|------|-------|--------|
| `index.tsx` | `/` | Public |
| `login.tsx` | `/login` | Public |
| `signup.tsx` | `/signup` | Public |
| `profile.tsx` | `/profile` | Protected |
| `goals.tsx` | `/goals` | Protected |
| `tasks.tsx` | `/tasks` | Protected |
| `loading.tsx` | `/loading` | Protected |

### Navigation

```tsx
import { Link } from '@tanstack/react-router'

<Link to="/goals">View Goals</Link>
<Link to="/tasks">View Tasks</Link>
```

## Authentication

JWT-based auth with localStorage

### Protected Routes

```tsx
import { ProtectedRoute } from '@/components/ProtectedRoute'

export const Route = createFileRoute('/goals')({
  component: () => (
    <ProtectedRoute>
      <GoalsPage />
    </ProtectedRoute>
  )
})
```

## Common Issues

### Backend Not Running
```
Error: Failed to fetch
```
**Solution:**
```bash
cd backend && bun run dev
```

### Port in Use
```bash
lsof -ti:3001 | xargs kill -9
```

### Token Expired
Log out and log back in for fresh token.


## Resources

- [React Docs](https://react.dev/)
- [TanStack Router](https://tanstack.com/router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Three.js](https://threejs.org/)
- [Main README](../README.md)
