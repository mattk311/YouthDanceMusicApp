# Church Dance Music Safety Checker

## Overview

The Church Dance Music Safety Checker is a web application designed to help LDS (Latter-day Saint) church youth event coordinators verify whether songs are appropriate for church dances. The application integrates with Spotify's API to search for songs and uses AI-powered evaluation to assess appropriateness based on lyrics, artist background, and alignment with LDS church values.

The system features Google OAuth authentication, real-time song search with autocomplete suggestions, AI-powered content evaluation using OpenAI GPT-5, and a clean, youth-friendly interface built with Material Design 3 principles.

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
- Color-coded feedback system: 
  - Green for approved songs
  - Red for not recommended songs
  - Yellow/amber for songs requiring leader review
  - Gray for songs not found
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
- Song search endpoint with AI evaluation integration
- Autocomplete endpoint for song and artist suggestions (3-second debounce on frontend)
- Consistent error handling and JSON response formatting
- All endpoints require authentication

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

**AI Evaluation (OpenAI via Replit AI Integrations)**
- OpenAI GPT-5 model for intelligent song content analysis
- Uses Replit AI Integrations (no personal API key required, charges billed to Replit credits)
- Evaluates songs based on:
  - Song lyrics content (profanity, sexual content, violence, drug/alcohol references)
  - Artist's public stance on LDS church topics (LGBTQ issues, abortion, traditional marriage, etc.)
  - Overall message and alignment with church values
  - Consideration of mainstream acceptability and context
- Returns structured evaluation with:
  - Recommendation: "approved", "not-recommended", or "review-needed"
  - Reasoning: Clear explanation of the decision
  - Concerns: List of specific issues found
  - Positives: List of positive aspects
- Environment variables: `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` (auto-configured by Replit)

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

## Key Features

### AI-Powered Song Evaluation
After finding a song on Spotify, the application automatically evaluates it using GPT-5 AI to determine appropriateness for LDS church dances. The evaluation considers:

1. **Lyrical Content Analysis**
   - Profanity and inappropriate language
   - Sexual content, innuendo, and double entendre
   - Violence and aggression
   - Drug and alcohol references
   - Themes contradicting LDS teachings

2. **Artist Background Review**
   - Public positions on LGBTQ+ issues
   - Stance on transgender topics
   - Views on abortion
   - Support for traditional marriage and family values
   - General lifestyle and public behavior

3. **Balanced Assessment**
   - Primary focus on song content rather than artist's personal views
   - Context-aware evaluation (mainstream acceptability)
   - Three-tier recommendation system

### Autocomplete with Debounce
- 3-second debounce timer prevents excessive API calls
- Minimum 2 characters required before suggestions appear
- Up to 8 relevant suggestions from Spotify
- Keyboard navigation support (arrow keys, Enter, Escape)
- Auto-fills both song and artist when selecting track suggestions
- Error handling with user-friendly toast notifications

### Three-Tier Recommendation System
1. **Approved** (Green) - Song is appropriate for church youth dances
2. **Not Recommended** (Red) - Song contains concerning content or explicit material
3. **Review Needed** (Yellow) - Minor concerns that church leaders should be aware of before making final decision

## Recent Changes (November 16, 2025)
- Added OpenAI integration using Replit AI Integrations (GPT-5 model)
- Implemented comprehensive AI evaluation system for song appropriateness
- Enhanced result display to show AI reasoning, concerns, and positive aspects
- Added three-tier recommendation system with visual feedback
- Updated color scheme to reflect recommendation levels (green/yellow/red)
- Added "Open in Spotify" link to results
- Improved error handling across autocomplete and evaluation flows