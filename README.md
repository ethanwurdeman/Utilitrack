# Utilitrack

Minimal web app using Vite, TypeScript, Firebase, Leaflet and related utilities.

## Setup

1. Copy `.env.example` to `.env` and set Firebase config values.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start development server:
   ```sh
   npm run dev
   ```

## Test checklist

- `npm run lint`
- `npm run build`

## Deployment

Pushing to `main` triggers the GitHub Action that builds and deploys to Firebase Hosting. Ensure the `FIREBASE_TOKEN` secret is set in repository settings.
