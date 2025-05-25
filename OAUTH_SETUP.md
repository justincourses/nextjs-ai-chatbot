# OAuth Setup Guide

This guide explains how to set up Google and GitHub OAuth authentication for the Next.js AI Chatbot.

## Prerequisites

1. Make sure you have the required environment variables in your `.env.local` file
2. Run the database migration to add OAuth support tables

## Database Migration

The OAuth support requires additional database tables. Run the migration:

```bash
pnpm db:migrate
```

If the migration fails due to Node.js version issues, you can manually run the SQL from `lib/db/migrations/0005_oauth_support.sql`.

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create a new OAuth 2.0 Client ID
5. Set the authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env.local`:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## GitHub OAuth Setup

1. Go to [GitHub Settings > Developer settings > OAuth Apps](https://github.com/settings/applications/new)
2. Create a new OAuth App with:
   - Application name: Your app name
   - Homepage URL: `http://localhost:3000` (for development)
   - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
3. Copy the Client ID and Client Secret to your `.env.local`:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

## Environment Variables

Your `.env.local` should include:

```env
# Auth
AUTH_SECRET=your_auth_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Database
POSTGRES_URL=your_postgres_url
```

## Testing

1. Start the development server: `pnpm dev`
2. Navigate to `/login` or `/register`
3. You should see Google and GitHub login buttons
4. Click on either button to test the OAuth flow

## Features Added

- **OAuth Providers**: Google and GitHub authentication
- **Database Schema**: Added Account, Session, and VerificationToken tables
- **UI Components**: OAuth login buttons on login and register pages
- **User Management**: Support for both email/password and OAuth users
- **Session Management**: Proper session handling for OAuth users

## Notes

- OAuth users don't need passwords in the database
- The system supports mixed authentication (both OAuth and email/password)
- User profiles are automatically populated from OAuth provider data
- The Drizzle adapter handles OAuth account linking automatically
