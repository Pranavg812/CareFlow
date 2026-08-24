# CareFlow

A full-stack healthcare appointment and follow-up management platform with separate patient, doctor, and admin portals, safe appointment booking, doctor leave conflict handling, AI-assisted visit summaries, asynchronous notifications, and Google Calendar synchronisation.

**Live demo:** https://care-flow-ten.vercel.app/

**Backend API:** https://careflow-api-yczy.onrender.com/

> The API is hosted on Render's free tier, so the first request after a period of inactivity may take some time while the service wakes up.

---

## 1. Overview

CareFlow gives a clinic three role-based portals:

- **Patients** register, search doctors by speciality, view availability, book appointments after entering symptoms, cancel appointments, and view completed-visit summaries and medication information.
- **Doctors** view their appointments, review the pre-visit AI brief, record clinical notes and prescriptions, and generate a patient-friendly post-visit summary.
- **Administrators** manage doctor profiles, working hours, slot duration, and leave dates. Leave conflicts automatically cancel affected bookings and queue patient notifications.

The core appointment workflow is kept independent from external integrations so that temporary AI, email, or Google Calendar failures do not invalidate a successfully stored appointment.

---

## 2. Key Features

### Role-Based Portals

- **Patient:** dashboard, doctor search, availability/slot picker, guided symptom intake, appointment history, cancellation, health summaries, and medication information.
- **Doctor:** dashboard, appointment schedule, pre-visit AI brief, clinical notes, prescriptions, and post-visit summary generation.
- **Admin:** clinic dashboard, doctor management, working-hours configuration, and leave management.

### Concurrency & Data Integrity

- Available slots are calculated from doctor working hours, leave dates, and existing active bookings.
- Final booking validation happens on the server rather than trusting the frontend.
- A partial unique MongoDB index on `(doctorId, startAt)` for active `BOOKED` appointments is the final protection against double-booking.
- Duplicate-key conflicts are converted into an HTTP `409` response instead of creating a second appointment.
- Cancelled appointments no longer occupy an active booking slot.

### Doctor Leave Handling

- Leave dates are stored on the doctor record.
- New slot generation excludes leave dates.
- When leave is added, affected future `BOOKED` appointments are cancelled and notification jobs are queued.
- The API reports the number of affected appointments so the admin UI can show the impact.

### AI / LLM Integration

- **Pre-visit:** symptoms are converted into structured urgency, chief complaint, and three suggested questions.
- **Post-visit:** clinical notes are converted into a patient-friendly summary, medication schedule, and follow-up steps.
- OpenAI credentials stay server-side.
- AI failures fall back to deterministic, non-diagnostic content so the appointment workflow remains usable.

### Notifications & Google Calendar

- Email notifications are handled asynchronously through the notification collection and background worker.
- Failed notification jobs record the error, retry count, and next attempt time.
- Gmail SMTP is supported for real email delivery.
- Google Calendar can create and delete appointment events through OAuth 2.0.
- Calendar event IDs are retained on appointments so later operations can target the correct event.

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Authentication | JWT + bcrypt |
| AI / LLM | OpenAI API |
| Email | Nodemailer + Gmail SMTP |
| Calendar | Google Calendar API + OAuth 2.0 |
| Background jobs | node-cron |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## 4. Folder Structure

```text
CareFlow/
├── client/
│   ├── src/
│   │   ├── app.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── index.js
│   │   ├── models.js
│   │   ├── seed.js
│   │   └── services.js
│   ├── .env.example
│   ├── package.json
│   └── package-lock.json
│
├── docs/
│   ├── AI_PROMPTS.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── GOOGLE_CALENDAR.md
│   └── SYSTEM_DESIGN.md
│
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## 5. Setup

### Prerequisites

- Node.js 18+
- MongoDB Atlas account or local MongoDB
- Gmail account + Gmail App Password for SMTP
- Google Cloud project with Google Calendar API enabled
- OpenAI API key (optional; fallback behaviour is built in)

### Environment

Copy:

```text
server/.env.example
```

to:

```text
server/.env
```

Set the required values such as:

```env
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=
```

Optional integration variables are documented in the `.env.example` and related documentation files.

**Never commit `server/.env` or any real credentials.**

### Install and run

From the project root:

```bat
npm install
npm run install:all
npm run dev
```

The application runs locally at:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/api/health
```

### Seed demo data

```bat
npm run seed --prefix server
```

The seed script creates local demo accounts and sample appointment data.

---

## 6. Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@careflow.test` | `Admin123!` |
| Doctor | `maya.shah@careflow.test` | `Doctor123!` |
| Patient | `arjun.mehta@careflow.test` | `Patient123!` |

These credentials are for local/demo data only.

---

## 7. API Documentation

The API uses the `/api` prefix.

See [`docs/API.md`](docs/API.md).

Protected requests use:

```text
Authorization: Bearer <token>
```

Main API areas include:

- authentication
- doctor search and availability
- appointment booking and cancellation
- doctor clinical notes and post-visit summary generation
- admin doctor management
- doctor leave management

---

## 8. Database Schema

See [`docs/DATABASE.md`](docs/DATABASE.md).

The main MongoDB collections are:

- `users`
- `doctors`
- `appointments`
- `notifications`

The appointment model also stores symptoms, AI summaries, prescriptions, and Google Calendar event IDs.

---

## 9. LLM Prompts

See [`docs/AI_PROMPTS.md`](docs/AI_PROMPTS.md).

CareFlow uses OpenAI for two workflows:

1. **Pre-visit summary:** urgency, chief complaint, and exactly three suggested questions.
2. **Post-visit summary:** patient-friendly summary, medication schedule, and follow-up steps.

AI is informational assistance only and is not used as a diagnostic system.

If the OpenAI API is unavailable or returns unusable output, CareFlow uses a deterministic fallback so the booking and visit-completion workflows continue to function.

---

## 10. Google Calendar Setup

See [`docs/GOOGLE_CALENDAR.md`](docs/GOOGLE_CALENDAR.md).

The setup requires:

1. Google Cloud project
2. Google Calendar API
3. OAuth 2.0 Web Client
4. Authorized redirect URI
5. Refresh token
6. Server environment variables

For the production deployment, the callback URL is:

```text
https://careflow-api-yczy.onrender.com/api/calendar/callback
```

The local callback remains:

```text
http://localhost:5000/api/calendar/callback
```

Never commit OAuth client secrets or refresh tokens.

---

## 11. Notifications

CareFlow stores outbound notification jobs in MongoDB and processes them through a scheduled worker.

Each notification records:

- recipient
- appointment
- type
- channel
- payload
- status
- attempt count
- next attempt time
- last error

Failed jobs are retried with increasing delays up to the configured attempt limit.

When SMTP is not configured locally, email content is logged to the server terminal so core functionality can still be tested.

---

## 12. Deployment

| Component | Hosting |
|---|---|
| Frontend | Vercel |
| Backend API | Render |
| Database | MongoDB Atlas |

### Frontend

Production URL:

https://care-flow-ten.vercel.app/

The Vite production build outputs to `dist/` during deployment. Generated build artifacts are not committed to GitHub.

### Backend

Production URL:

https://careflow-api-yczy.onrender.com/

Health check:

https://careflow-api-yczy.onrender.com/api/health

The backend uses the Render-provided `PORT` environment variable.

---

## 13. System Design

See [`docs/SYSTEM_DESIGN.md`](docs/SYSTEM_DESIGN.md).

The write-up covers:

- double-booking prevention
- doctor leave conflict handling
- slot-hold mechanism and its current scope
- notification failure handling
- AI and integration resilience

---

## 14. Security

Do not commit:

```text
.env
.env.*
node_modules/
dist/
```

Secrets such as MongoDB credentials, JWT secrets, Gmail App Passwords, OpenAI API keys, and Google OAuth credentials must remain in environment variables.

---

## 15. Submission

The project deliverables are:

1. Complete source code
2. README and required technical documentation
3. Hosted application URL
4. System-design write-up (800 words maximum)

GitHub repository:

https://github.com/Pranavg812/CareFlow
