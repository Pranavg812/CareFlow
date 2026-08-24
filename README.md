# CareFlow

Healthcare Appointment & Follow-up Manager built for the assignment brief. It provides secure patient, doctor, and admin portals; safe appointment booking; leave handling; AI-assisted visit summaries; prescriptions/reminders; email; and Google Calendar syncing.

## Features and stack

- Patient, doctor, and admin role-based portals with JWT authentication.
- Safe appointment booking with a database-enforced unique slot index, cancellation, doctor leave handling, and notification retries.
- Pre-visit and post-visit AI summaries, with a clear non-diagnostic fallback when OpenAI is unavailable.
- Prescription, medication schedule, patient follow-up summary, Gmail SMTP notifications, and Google Calendar sync.
- React/Vite client, Node.js/Express API, MongoDB Atlas/Mongoose, Nodemailer, Google Calendar API, and OpenAI API.

## Project structure

```text
client/        React application
server/        Express API, MongoDB models, integrations, and seed script
docs/          API, no-Docker setup, and system-design documentation
```

## Environment configuration

Copy `server/.env.example` to `server/.env`. `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_URL` are required. SMTP, Google Calendar, and OpenAI variables are optional integrations; their setup is documented in [docs/NO_DOCKER_SETUP.md](docs/NO_DOCKER_SETUP.md). Never commit `server/.env`.

## Quick start with Docker

1. Copy `server/.env.example` to `server/.env` and add your API keys (optional integrations use safe fallbacks when unconfigured).
2. Run `docker compose up --build`.
3. Open `http://localhost:5173`; API health is at `http://localhost:5000/api/health`.
4. Seed the demo data with `docker compose exec api npm run seed`.

## Local start

1. Start MongoDB locally or use MongoDB Atlas.
2. Copy `server/.env.example` to `server/.env` and set `MONGODB_URI`.
3. Run `npm install`, then `npm run install:all`, then `npm run dev`.

Keep that terminal open: it starts both the Express API on port 5000 and the Vite frontend on port 5173. If you start them separately, start the API first with `npm run dev --prefix server`, then the client with `npm run dev --prefix client`.

For the recommended Docker-free route, follow [docs/NO_DOCKER_SETUP.md](docs/NO_DOCKER_SETUP.md).

## Demo accounts after seeding

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@careflow.test | Admin123! |
| Doctor | maya.shah@careflow.test | Doctor123! |
| Patient | arjun.mehta@careflow.test | Patient123! |

## Core technical choices

- Booking uses a MongoDB partial unique index on `doctorId + startAt` and catches duplicate-key errors as HTTP `409`, preventing double booking even under simultaneous requests.
- External tasks are recorded in `notifications` and handled by a cron worker, so email/calendar failures do not undo confirmed appointments.
- AI returns structured JSON. If no API key is set or the provider fails, the appointment remains usable and receives a deterministic fallback summary.
- Admin leave changes find conflicting future appointments, cancel them, and queue notifications.

## API

All API endpoints use the `/api` prefix. A concise endpoint list and schema notes are in [docs/API.md](docs/API.md). Authentication is sent as `Authorization: Bearer <token>`.

## Google Calendar setup

1. Create a Google Cloud project, enable **Google Calendar API**, and configure an OAuth 2.0 Web client.
2. Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI` to `server/.env`.
3. In a production version, each user completes OAuth and we store an encrypted refresh token. This assignment implementation uses an optional shared refresh token (`GOOGLE_REFRESH_TOKEN`) for the clinic demo.

## Submission notes

Do not commit `.env` or `node_modules`. Create a public GitHub repository, use the `main` branch, deploy the client/API, and submit the public link. The living implementation plan is in [PROJECT_BLUEPRINT.md](PROJECT_BLUEPRINT.md).
