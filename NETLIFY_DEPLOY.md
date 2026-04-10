# Netlify Deployment Configuration

## Environment Variables
Add these to your Netlify site settings under "Build & deploy" → "Environment":

```
NEXT_PUBLIC_API_BASE=https://your-backend-url.com
```

## Frontend Build
- **Build command**: `cd frontend && npm run build`
- **Publish directory**: `frontend/out`
- **Node version**: 18.x or higher

## Backend Deployment
The backend (Express.js server) needs to be deployed separately to:
- Heroku
- Railway.app
- Render.com
- Or any Node.js hosting platform

Set the `NEXT_PUBLIC_API_BASE` to point to your deployed backend.

## Static Files
The `frontend/out` directory contains all static HTML, CSS, JS, and media files ready for Netlify hosting.
