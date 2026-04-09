# Location-Based Emergency Response System (Ghana) — MVP

This repository contains a complete full-stack app for quickly reporting emergencies and an admin dashboard to monitor them in real-time.

## Structure

- **backend/** — Node.js + Express + MongoDB + Socket.IO API
- **frontend/** — Next.js app (user & admin UI) using Leaflet for maps

## Quick Start (Local)

### 1. Backend

\\\powershell
cd backend
npm install
npm run dev
\\\

Server runs on **http://localhost:4000**

### 2. Frontend

In a new terminal:

\\\powershell
cd frontend
npm install
npm run dev
\\\

Frontend runs on **http://localhost:3000**

- User app: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin

## API Endpoints

- **POST /report** — Create emergency report (multipart/form-data)
- **GET /reports** — Fetch all reports
- **PATCH /report/:id** — Update report status

## WebSocket Events

- Server emits **new-report** on new report creation
- Server emits **update-report** on status change

## Features

- One-tap emergency reporting (Fire, Medical, Crime)
- GPS location capture
- Image upload
- Real-time admin dashboard with map view
- Status tracking (Pending, Responding, Resolved)
- Rate limiting on report creation
- Socket.IO for real-time updates

## Notes

- MongoDB uses Atlas cloud. Update MONGO_URI in backend/.env if using local MongoDB.
- Images stored in backend/uploads/
- Maps use OpenStreetMap (no API key required)
