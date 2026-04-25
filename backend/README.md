# Backend: MongoDB setup and seeding

This backend uses MongoDB (via mongoose). The code already supports an in-memory fallback when `MONGODB_URI` is not provided, but for production and persistent storage you should provide a MongoDB connection string.

Quick setup

1. Create a `.env` file in the repository root by copying `.env.example`:

   copy .env.example .env

2. Replace the `MONGODB_URI` value with your MongoDB connection string. If you don't have one, create a free cluster on MongoDB Atlas and get the connection URI.

3. Install backend dependencies (from project root):

   cd backend
   npm ci

4. Seed sample data (optional):

   npm run seed

   This requires `MONGODB_URI` to be set in your environment or `.env` file. The seed script will insert a few sample `Report` documents and exit.

5. Run the backend in dev mode:

   npm run dev

Notes
- The server will use an in-memory store if `MONGODB_URI` is not set. This is useful for quick local testing but data will not persist across restarts.
- If you plan to deploy, set the `MONGODB_URI` environment variable in your hosting provider (Render, Vercel serverless functions won't support a long-running socket server—consider Render or a separate server for the backend).
