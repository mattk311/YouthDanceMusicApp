# Youth Dance Music

## Overview

Youth Dance Music is a web application designed to help youth event coordinators verify whether songs are appropriate for dances. The application integrates with Spotify's API to search for songs and uses AI-powered evaluation to assess appropriateness based on lyrics, artist background, and alignment with LDS church values.

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
- PostgreSQL database with Neon serverless driver for persistent storage
- Drizzle ORM for type-safe database operations
- Database storage implementation (DbStorage) with automatic fallback to MemStorage if DATABASE_URL not available
- Storage abstraction interface (IStorage) for user and song CRUD operations
- User schema: Google ID, email, name, and avatar fields
- Song schema: search key, song/artist/album metadata, Spotify data, AI evaluation results, and timestamps
- Database caching for song searches and AI evaluations to reduce API calls and improve performance

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

**Database (Active - PostgreSQL)**
- Drizzle ORM with PostgreSQL dialect configured via `drizzle.config.ts`
- Schema defined in `shared/schema.ts` with users and songs tables
- Neon serverless driver (`@neondatabase/serverless`) for PostgreSQL connection
- Migration directory: `./migrations`
- Environment variable: `DATABASE_URL` (required for database operations)
- Songs table stores: search key (unique), song metadata, Spotify URLs, AI evaluation results, and creation timestamps
- Database-first caching strategy: check cache before calling external APIs

**Session Management**
- express-session for server-side session storage
- PostgreSQL-backed session store using connect-pg-simple (production-ready)
- Automatic session table creation on first run
- Supports Autoscale deployments with multiple instances
- Sessions persist across server restarts and scale horizontally
- Falls back to MemoryStore in development without DATABASE_URL
- Trust proxy configured for secure cookies behind Replit's HTTPS proxy
- Environment variables: `SESSION_SECRET`, `DATABASE_URL` (required for production)

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

### Database Caching System
- All song searches and AI evaluations are cached in PostgreSQL database
- Search key format: `{lowercase_title}|{lowercase_artist}` for consistent lookups
- Cache-first strategy: database checked before calling Spotify or AI APIs
- Cached data includes: song metadata, album art, Spotify URLs, explicit flag, AI recommendations, reasoning, concerns, and positives
- Significantly reduces API calls and improves response times for repeated searches
- Console logging shows cache hits/misses for monitoring

## Recent Changes (February 6, 2026)
- **Added "Add to Playlist" feature**: Users can connect their own Spotify account and add songs to their playlists
  - Individual user Spotify OAuth flow (authorization code grant)
  - Users see "Connect Spotify" button on search results; after connecting, it becomes "Add to Playlist"
  - Playlist picker dialog shows all user playlists with images and track counts
  - Token refresh handled automatically; stored securely server-side
  - Database schema: spotifyAccessToken, spotifyRefreshToken, spotifyTokenExpiresAt fields on users table
  - Production redirect URI configurable via SPOTIFY_REDIRECT_URI env var
  - Spotify app requires redirect URI: https://youthdancemusic.com/auth/spotify/callback

## Previous Changes (February 5, 2026)
- **Added dance type classification**: AI now evaluates whether songs are fast or slow dance songs, and identifies line dance songs (like Cupid Shuffle, Cha Cha Slide, etc.)
  - New badges display dance type (Fast Dance/Slow Dance) and Line Dance indicator
  - Database schema updated with aiDanceType and aiIsLineDance fields
- **Fixed Stripe configuration**: Now uses STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY environment secrets directly instead of Replit connector API

## Previous Changes (February 3, 2026)
- **Added subscription system with Stripe**: $9.99/month subscription for unlimited song searches
  - Free users limited to 10 searches per day (resets daily)
  - Subscribers get unlimited searches
  - Stripe integration with webhook for subscription status sync
  - UsageBadge component shows remaining searches in header
  - SubscriptionCard component for upgrade flow
  - Stripe checkout and customer portal integration
  - Database tracking of subscription status, daily counts, and Stripe customer/subscription IDs
  - **Note**: Stripe API keys are stored as secrets (STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY) - not using Replit connector

## Previous Changes (November 16, 2025)
- **Fixed production deployment**: Implemented PostgreSQL-backed session store for Autoscale deployments
  - Replaced MemoryStore with connect-pg-simple for production scalability
  - Sessions now persist across server restarts and multiple instances
  - Automatic session table creation on first deployment
  - Trust proxy configured for secure cookies behind HTTPS
  - Made artist field required in song search form
- **Added Google AdSense integration**: Application is now monetization-ready with strategic ad placements
  - Implemented reusable AdSense component with TypeScript support
  - Added 3 ad units: top banner, in-content rectangle, and footer banner
  - Uses environment variables for flexible configuration (VITE_ADSENSE_CLIENT, VITE_ADSENSE_SLOT_*)
  - Responsive ad formats that adapt to all screen sizes
  - Created comprehensive setup guide (ADSENSE_SETUP.md) with step-by-step instructions
  - Safe fallback when AdSense credentials not configured (app works without ads)
- **Fixed Neon database connection issues**: Switched from WebSocket to HTTP driver for reliable serverless connections
- **Added UI enhancements**: Autocomplete suggestions now close on search submit, auto-scroll to results after search
- **Added database caching system**: PostgreSQL database now caches all song searches and AI evaluation results
- **Implemented DbStorage class**: Database storage layer with Drizzle ORM for persistent song and user data
- **Cache-first architecture**: Backend checks database before calling Spotify/AI APIs, reducing costs and improving speed
- **Fixed Google OAuth callback URL**: Now uses REPLIT_DEV_DOMAIN for proper dynamic URL configuration
- Added OpenAI integration using Replit AI Integrations (GPT-5 model)
- Implemented comprehensive AI evaluation system for song appropriateness
- Enhanced result display to show AI reasoning, concerns, and positive aspects
- Added three-tier recommendation system with visual feedback
- Updated color scheme to reflect recommendation levels (green/yellow/red)
- Added "Open in Spotify" link to results
- Improved error handling across autocomplete and evaluation flows

## Monetization

### Google AdSense Integration
The application includes Google AdSense for revenue generation with optimized ad placements:

**Ad Placement Strategy**
1. **Top Banner Ad** - Displayed above search form for maximum visibility
2. **In-Content Rectangle** - Appears after search results (high engagement area)
3. **Footer Banner** - Always visible at bottom of page

**Configuration**
- Environment variables for flexible setup (see `.env.example`)
- Responsive ad units that adapt to mobile and desktop
- Non-intrusive placement that maintains user experience
- Ads only display when properly configured (graceful degradation)

**Setup Instructions**
- See `ADSENSE_SETUP.md` for complete guide on:
  - Applying for Google AdSense
  - Creating ad units
  - Configuring environment variables
  - Adding ads.txt file
  - Testing and optimization tips

**Revenue Potential**
- Multiple ad positions increase revenue opportunities
- High engagement from users checking multiple songs
- Faith-based content typically AdSense-friendly
- Mobile-responsive design maximizes mobile ad revenue