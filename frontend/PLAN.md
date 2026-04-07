# Frontend Technical Specification: Next.js 14 + React Query App

## Overview
This document outlines the technical specification for building a production-ready frontend application using Next.js 14 (App Router) and React Query. The application will implement advanced AI chat features including streaming responses, context window management, multi-modal support, conversation branching, custom instructions/personas, RAG, and enhanced UI/UX.

## File Structure
```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   ├── chat/               # Chat route segment
│   │   │   ├── layout.tsx      # Chat layout (if needed)
│   │   │   └── page.tsx        # Chat page
│   │   ├── settings/           # Settings route
│   │   │   └── page.tsx
│   │   └── api/                # API routes (if needed for SSR)
│   │       └── ... 
│   ├── components/             # Reusable UI components
│   │   ├── layout/             # Layout components (header, footer, sidebar)
│   │   ├── chat/               # Chat-specific components
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageItem.tsx
│   │   │   ├── InputArea.tsx
│   │   │   ├── StreamingMessage.tsx
│   │   │   ├── ContextManager.tsx
│   │   │   ├── BranchingControl.tsx
│   │   │   └── PersonaSelector.tsx
│   │   ├── ui/                 # Generic UI components (buttons, inputs, modals, etc.)
│   │   └── widgets/            # Other widgets (RAG source display, etc.)
│   ├── lib/                    # Utility functions and helpers
│   │   ├── api/                # API client functions
│   │   ├── query/              # React Query configuration and custom hooks
│   │   ├── websocket/          # WebSocket/SSE utilities
│   │   ├── context/            # React context providers
│   │   ├── utils/              # Miscellaneous utilities
│   │   └── types/              # TypeScript type definitions
│   ├── styles/                 # Global styles and theme
│   │   ├── globals.css
│   │   └── theme.ts            # If using a design system like Tailwind or Chakra
│   └── hooks/                  # Custom React hooks
│       ├── useChat.ts
│       ├── usePersona.ts
│       └── useRAG.ts
├── public/                     # Static assets
├── next.config.js              # Next.js configuration
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS configuration (if used)
├── postcss.config.js           # PostCSS configuration
└── README.md
```

## Key Technologies
- **Next.js 14**: Using the App Router for server components, streaming, and route groups.
- **React Query**: For data fetching, caching, and state management.
- **TypeScript**: For type safety.
- **Tailwind CSS**: For styling (alternatively, CSS modules or another CSS-in-JS solution).
- **WebSocket/SSE**: For real-time streaming responses from the backend.
- **Zustand/Jotai** (optional): For client-side state management if needed beyond React Query.

## Feature Implementation Plan

### 1. Streaming Responses (SSE/WebSockets)
- **Backend Integration**: Assume the backend provides streaming via SSE or WebSocket endpoints.
- **Frontend**:
  - Create a `useStreamingChat` hook in `src/lib/hooks/useChat.ts` that manages the streaming connection.
  - Use `StreamingMessage` component to display incoming message chunks in real-time.
  - Implement retry mechanisms and error boundaries for connection stability.
  - Use React Query's `useQuery` or custom mutation to initiate the stream.

### 2. Context Window Management
- **Backend Integration**: Backend should return context window info (tokens used, etc.) with each response.
- **Frontend**:
  - Display context window usage in the UI (e.g., a progress bar or indicator).
  - Provide controls to clear context or summarize when reaching limits.
  - Store context window state in React Query cache or a dedicated context provider.

### 3. Multi-Modal Support
- **Backend Integration**: Backend accepts image/audio inputs and returns appropriate responses.
- **Frontend**:
  - Extend the `InputArea` component to accept file uploads (images, audio).
  - Show previews of attached media.
  - Send media data to the backend via the chat API (likely as base64 or multipart/form-data).
  - Handle different response types (text, image, audio) in the message renderer.

### 4. Conversation Branching
- **Backend Integration**: Backend supports branching conversations (e.g., via message IDs).
- **Frontend**:
  - Implement a branching UI (like a tree or linear with fork points) in the chat sidebar.
  - Allow users to create a new branch from any message.
  - Switch between branches and display the active branch.
  - Use React Query to fetch and cache different branches.

### 5. Custom Instructions/Personas
- **Backend Integration**: Backend supports custom instructions or persona selection.
- **Frontend**:
  - Create a `PersonaSelector` component (in settings or chat) to choose or define personas.
  - Store selected persona in React Query or context.
  - Pass persona ID/instructions with each chat request.

### 6. RAG (Retrieval-Augmented Generation)
- **Backend Integration**: Backend performs RAG and returns sources with responses.
- **Frontend**:
  - Display RAG sources in a collapsible section below each message.
  - Allow users to click sources to view the original document snippet.
  - Provide a UI to manage knowledge bases (in settings).

### 7. UI/UX Enhancements
- **Animations**: Use Framer Motion or CSS transitions for smooth UI updates.
- **Accessibility**: Follow WCAG guidelines (ARIA labels, keyboard navigation, contrast).
- **Dark Mode**: Implement using CSS variables or Tailwind's dark mode.
- **Responsive Design**: Ensure mobile-friendly layout.
- **Loading States**: Use React Query's loading states and skeleton screens.
- **Error Handling**: Display user-friendly error messages and retry options.

## Data Fetching with React Query
- **Chat Messages**: Use `useQueries` or `useInfiniteQuery` for paginated message fetching.
- **User Settings**: Use `useQuery` for fetching/updating user preferences.
- **RAG Sources**: Fetch sources per message and cache them.
- **Mutations**: Use `useMutation` for sending messages, updating personas, etc.

## State Management
- **React Query**: Primary state management for server state.
- **React Context**: For global UI state (e.g., sidebar collapse, theme).
- **Optional**: Use Zustand or Jotai for complex client-side state if needed.

## Configuration Files
### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Enable streaming for App Router
  experimental: {
    appDir: true,
    serverActions: true,
  },
  // Image domains for media uploads
  images: {
    domains: ['your-backend-domain.com'],
  },
};

module.exports = nextConfig;
```

### package.json (key dependencies)
```json
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "clsx": "^2.0.0",
    "tailwindcss-animate": "^1.0.0"
  },
  "devDependencies": {
    "typesafe": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "tailwindcss": "^3.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Development Guidelines
- **Component Architecture**: Prefer server components for initial data fetching, client components for interactivity.
- **Error Boundaries**: Implement at route level to catch errors.
- **Loading UI**: Use React Query's `isLoading` and `isError` states; consider skeleton screens.
- **Testing**: Write unit tests for hooks and components; integration tests for critical user flows.
- **Performance**: Use `next/image` for optimized images; lazy-load non-critical components.
- **Security**: Sanitize user input; implement CSRF protection for mutations; use environment variables for API endpoints.

## Open Questions / Assumptions
1. **Backend API**: We assume the backend provides REST/WebSocket endpoints for chat, streaming, personas, RAG, etc. Exact contract needs to be defined.
2. **Authentication**: Not specified; assume JWT or session-based auth handled via cookies or headers.
3. **Deployment**: The app will be deployed alongside the backend (e.g., on Vercel or similar).

## Next Steps
1. Set up the Next.js 14 project in the `frontend` directory.
2. Install dependencies and configure Tailwind CSS.
3. Implement the file structure as outlined.
4. Develop core components and hooks.
5. Integrate with backend APIs.
6. Add UI/UX enhancements and accessibility features.
7. Test thoroughly and prepare for production.
