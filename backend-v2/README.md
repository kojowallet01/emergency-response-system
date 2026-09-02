# EBRs Backend v2

Modern, typed backend for the Ghana Emergency Response System built with **Fastify**, **TypeScript**, and **Supabase**.

## Stack

- **Fastify** ^5 — high-performance HTTP framework
- **TypeScript** — strict, type-safe codebase
- **Supabase** (`@supabase/supabase-js`) — Postgres database + realtime
- **Socket.IO** — realtime report/status updates
- **Twilio** — SMS alerts
- **Zod** — runtime env validation
- **Pino** — structured logging

## Structure

```
src/
├── app.ts                # Fastify bootstrap (plugins, routes, error handler)
├── index.ts              # Entry point (graceful shutdown)
├── config/env.ts         # Zod-validated environment
├── lib/
│   ├── supabase.ts       # Supabase client singleton
│   └── logger.ts         # Pino logger
├── plugins/realtime.ts   # Socket.IO setup
├── routes/
│   ├── reports.ts        # Report CRUD + multipart uploads
│   ├── geocode.ts        # Address autocomplete
│   └── sms.ts            # Twilio SMS endpoints
├── schemas/index.ts      # JSON schemas for route validation
└── services/
    ├── reportService.ts  # Supabase report queries
    ├── geocodeService.ts # Google + Nominatim geocoding
    └── smsService.ts     # Twilio helpers
```

## Local development

```bash
cp .env.example .env        # fill in your values
npm install
npm run dev                 # tsx watch on :4000
```

## Production build

```bash
npm run build               # tsc -> dist/
npm start                   # node dist/index.js
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `PORT` | No | Default `4000` |
| `CORS_ORIGIN` | No | Default `*` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | No | SMS (disabled if not set) |
| `GOOGLE_API_KEY` | No | Google geocoding (falls back to Nominatim) |

## Deploy to Render

The root `render.yaml` auto-deploys this service via Render Blueprint.

1. Push this repo to GitHub.
2. In Render, create a **New Blueprint** from the repo.
3. Fill in the `sync: false` env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Twilio / Google keys (optional)
4. Deploy. Render runs `npm install && npm run build`, then `npm start`.
5. Your backend URL will be `https://emergency-response-backend.onrender.com`.

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/report` | Create report (multipart) |
| GET | `/reports` | List reports |
| GET | `/report/:id` | Get report |
| PATCH | `/report/:id` | Update report status |
| GET | `/geocode/suggest?q=` | Address suggestions |
| GET | `/geocode/resolve?address=` | Resolve address |
| POST | `/sms/test` | Send test SMS |
| POST | `/sms/emergency-alert` | Emergency alert SMS |
| POST | `/sms/status-change` | Status change SMS |
| POST | `/sms/bulk` | Bulk SMS |
| POST | `/sms/validate` | Validate phone number |
