# Church Dance Music Safety Checker

## Overview

The Church Dance Music Safety Checker is a web application designed to help church youth event coordinators verify whether songs are appropriate for church dances. The application integrates with Spotify's API to search for songs and check their explicit content flags, providing clear visual feedback on whether a track is safe for youth events.

The system features Google OAuth authentication, real-time song search with autocomplete suggestions, and a clean, youth-friendly interface built with Material Design 3 principles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript for type-safe component development
- Vite as the build tool and development server, providing fast hot module replacement
- Wouter for lightweight client-side routing (single-page application focused)

**UI Component System**
- Shadcn/ui component library built on Radix UI primitives for accessible, composable components
- Tailwind CSS for utility-first styling with custom design tokens
- Material Design 3 principles with youth-friendly adaptations
- Custom CSS variables for theming (light/dark mode support)
- Inter font from Google Fonts for consistent typography

**State Management**
- TanStack Query (React Query) for server state management, caching, and API interactions
- React hooks for local component state
- Query client configured with custom fetch wrapper for consistent API error handling

**Design System**
- Component-based architecture with reusable UI primitives
- Consistent spacing using Tailwind units (4, 6, 8, 12, 16)
- Color-coded feedback system: green for safe songs, red for unsafe/explicit content, amber for not found
- Responsive layout with mobile-first approach (max-w-4xl containers, single column on mobile)

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- TypeScript for type safety across the stack
- Session-based authentication using express-session
- Passport.js with Google OAuth 2.0 strategy

**Authentication Flow**
- Google OAuth for user authentication (profile and email scopes)
- Server-side session management with secure cookie configuration
- Session serialization/deserialization for user persistence
- Protected API routes requiring authentication middleware

**API Design**
- RESTful endpoints organized by feature (`/api/auth/*`, `/api/songs/*`)
- Authentication routes: Google OAuth callback, logout, current user status
- Song search endpoint with autocomplete support
- Consistent error handling and JSON response formatting

**Data Layer**
- In-memory storage implementation (MemStorage) for user data during development
- Drizzle ORM configured for PostgreSQL migration path
- User schema with Google ID, email, name, and avatar fields
- Storage abstraction interface (IStorage) for future database integration

### External Dependencies

**Spotify Integration**
- Spotify Web API TypeScript SDK (`@spotify/web-api-ts-sdk`)
- Client credentials authentication flow
- Search API for track and artist queries (up to 8 results for autocomplete)
- Track metadata retrieval: name, artists, album, album art, explicit flag, Spotify URL
- Environment variables: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`

**Google OAuth**
- Passport Google OAuth 2.0 strategy (`passport-google-oauth20`)
- Authentication scopes: profile and email
- Environment variables: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- Callback URL: `/auth/google/callback`

**Database (Configured but Not Active)**
- Drizzle ORM with PostgreSQL dialect configured via `drizzle.config.ts`
- Schema defined in `shared/schema.ts` with users table
- Neon serverless driver (`@neondatabase/serverless`) for PostgreSQL connection
- Migration directory: `./migrations`
- Environment variable: `DATABASE_URL` (currently throws error if missing, indicating preparation for future use)

**Session Management**
- express-session for server-side session storage
- connect-pg-simple available for PostgreSQL session store (when database is added)
- Environment variable: `SESSION_SECRET` (defaults to hardcoded value)

**Development Tools**
- Replit-specific plugins for development experience (cartographer, dev banner, runtime error overlay)
- TSX for TypeScript execution in development mode
- esbuild for production bundling