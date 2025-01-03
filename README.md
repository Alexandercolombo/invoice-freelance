# Freelance Invoice Manager

A professional invoice management system for freelancers, built with Next.js, Convex, and Clerk.

## Features

- 📊 Dashboard with unbilled tasks overview
- 📝 Easy invoice creation from tasks
- 💼 Client management
- 📄 Professional PDF invoice generation
- 🔒 Secure authentication with Clerk

## Deployment Guide

### Prerequisites

1. Create accounts on:
   - [Vercel](https://vercel.com) (for hosting)
   - [Convex](https://convex.dev) (for backend)
   - [Clerk](https://clerk.dev) (for authentication)

### Deploy Backend (Convex)

1. Install Convex CLI globally:
   ```bash
   npm install -g convex
   ```

2. Login to Convex:
   ```bash
   npx convex login
   ```

3. Initialize your Convex deployment:
   ```bash
   npx convex deploy
   ```

4. Save the deployment URL shown after initialization.

### Deploy Frontend (Vercel)

1. Push your code to a GitHub repository

2. Go to [Vercel](https://vercel.com) and:
   - Click "New Project"
   - Import your GitHub repository
   - Configure environment variables:
     - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
     - `CLERK_SECRET_KEY`
     - `NEXT_PUBLIC_CONVEX_URL`

3. Click "Deploy"

### Post-Deployment

1. Set up your Clerk application:
   - Configure OAuth providers if needed
   - Add your Vercel deployment URL to allowed origins

2. Test the deployment by:
   - Creating an account
   - Adding a client
   - Creating tasks
   - Generating an invoice

## Development Workflow

### Local Development

1. Clone the repository
2. Copy `.env.example` to `.env.local` and fill in your keys
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Applying Updates

1. Make changes to your local codebase
2. Test thoroughly in development
3. Push changes to GitHub
4. Vercel will automatically deploy updates
5. For backend changes, run:
   ```bash
   npx convex deploy
   ```

## Troubleshooting

- If the app shows a loading spinner, check Convex connection
- If authentication fails, verify Clerk environment variables
- For PDF generation issues, check browser console for errors

## Support

For issues or questions, please open a GitHub issue. 