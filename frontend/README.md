# Minimal Frontend App

A clean, minimal starting point for your React application using TanStack Router and Tailwind CSS.

## What's Included

- **React 19** with TypeScript
- **TanStack Router** for file-based routing
- **Tailwind CSS** for styling
- **Vite** for development and building

## Quick Start

### 1. Install dependencies
```bash
bun install
```

### 2. Run the development server
```bash
bun run dev
```

Your app will be available at `http://localhost:3000`

### 3. Build for production
```bash
bun run build
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   └── ui/         # Basic UI components (button, input, etc.)
├── routes/         # File-based routing
│   ├── __root.tsx  # Root layout (appears on all pages)
│   └── index.tsx   # Home page
├── lib/            # Utility functions
└── styles.css      # Global styles
```

## Key Files

### `src/routes/index.tsx` - Your Home Page
This is where your main application content lives. Edit this file to change what users see on the home page.

### `src/routes/__root.tsx` - Root Layout
This layout wraps all your pages. Add headers, footers, or navigation here.

### `src/components/ui/` - UI Components
Pre-built basic components you can use throughout your app.

## Adding New Pages

1. Create a new file in `src/routes/` (e.g., `about.tsx`)
2. TanStack Router automatically generates the route
3. Use the `Link` component to navigate:

```tsx
import { Link } from '@tanstack/react-router'

<Link to="/about">About</Link>
```

## Styling

This project uses Tailwind CSS. Add styles directly in your components using className:

```tsx
<div className="bg-blue-500 text-white p-4 rounded">
  Hello World
</div>
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run serve` - Preview production build
- `bun run test` - Run tests

## Next Steps

1. Edit `src/routes/index.tsx` to customize your home page
2. Add new pages in the `src/routes/` directory
3. Create reusable components in `src/components/`
4. Add navigation in `src/routes/__root.tsx`
5. Start building your app!
