# Youth Dance Music

## Overview

Youth Dance Music is a web application designed to assist youth event coordinators in verifying the appropriateness of songs for dances. It integrates with Spotify for song search and utilizes AI-powered evaluation (GPT-5) to assess songs based on lyrics, artist background, and alignment with specific values. The platform supports Google OAuth, provides real-time song search with autocomplete, and features a clean, youth-friendly interface adhering to Material Design 3 principles. The project aims to provide a reliable tool for ensuring music selections are suitable for youth events, supporting organizers in creating uplifting environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with React and TypeScript, using Vite for fast development and Wouter for client-side routing. UI components leverage Shadcn/ui (built on Radix UI) and Tailwind CSS for styling, following Material Design 3 principles with a youth-friendly aesthetic. TanStack Query manages server state and API interactions, while custom CSS variables support theming (light/dark mode). The design system emphasizes reusability, consistent spacing, and a color-coded feedback system for song recommendations (green for approved, red for not recommended, yellow for review needed, gray for not found), with a mobile-first, responsive layout.

### Backend Architecture

The backend uses Express.js with TypeScript, implementing session-based authentication via Passport.js and Google OAuth 2.0. RESTful APIs are organized by feature, handling authentication, song search, and AI evaluation. The data layer utilizes a PostgreSQL database (Neon serverless driver) and Drizzle ORM for type-safe operations. A `DbStorage` implementation handles user and song data, with an `IStorage` abstraction. Database caching for song searches and AI evaluations is implemented to optimize performance and reduce API calls.

### Key Features

- **AI-Powered Song Evaluation**: Utilizes GPT-5 to analyze lyrical content (profanity, sexual content, violence, drug/alcohol references) and artist's public stance on sensitive topics. Provides a structured evaluation including a recommendation, reasoning, concerns, and positives.
- **Three-Tier Recommendation System**: Songs are categorized as "Approved" (green), "Not Recommended" (red), or "Review Needed" (yellow), with clear visual cues.
- **Autocomplete with Debounce**: Offers real-time song and artist suggestions from Spotify with a 3-second debounce to minimize API calls, supporting keyboard navigation.
- **Database Caching System**: All song searches and AI evaluations are cached in PostgreSQL to reduce API calls to Spotify and OpenAI, improving response times.
- **Subscription System**: Users have a free tier with daily search limits, with a paid subscription (Stripe integration) for unlimited searches and access to advanced features.
- **Dance Management System**: For subscribed users, allows creation and management of dances with unique codes and QR codes, and handling of song requests.
- **Song Request System**: A public page where attendees can request songs for a specific dance, with AI pre-screening to ensure only appropriate songs are requested.
- **In-App Notification System**: DJs receive real-time notifications for new song requests.
- **Spotify "Add to Playlist"**: Users can connect their Spotify accounts to add approved songs directly to their playlists.
- **Dance Type Classification**: AI identifies songs as fast/slow dance or line dance.

## External Dependencies

- **Spotify Web API**: Used for song and artist search, track metadata retrieval, and "Add to Playlist" functionality.
- **OpenAI (via Replit AI Integrations)**: Powers the GPT-5 model for AI-driven song content and artist background evaluation.
- **Google OAuth 2.0**: Handles user authentication and authorization.
- **PostgreSQL (Neon Database)**: Primary database for persistent storage of user data, song metadata, AI evaluation results, dance information, and session data.
- **Stripe**: Manages user subscriptions, payments, and webhooks for status synchronization.
- **Google AdSense**: Integrated for monetization through display advertising.