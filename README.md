# CareFlow

CareFlow is a healthcare appointment and follow-up management application with separate patient, doctor, and admin portals. It supports appointment booking, doctor availability and leave management, AI-assisted visit summaries, prescriptions, notifications, and Google Calendar synchronization.

## Features

- Role-based authentication for patients, doctors, and administrators
- Doctor search by speciality
- Availability-based appointment booking
- Patient symptom collection before confirmation
- Database-enforced protection against double-booking
- Appointment cancellation
- Doctor leave management and conflict handling
- AI-generated pre-visit and post-visit summaries
- Graceful AI fallback when the provider is unavailable
- Clinical notes and prescriptions
- Medication schedule and patient follow-up information
- Email notifications with retry handling
- Google Calendar appointment synchronization

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** MongoDB Atlas + Mongoose
- **Authentication:** JWT + bcrypt
- **AI:** OpenAI API with deterministic fallback
- **Email:** Nodemailer + Gmail SMTP
- **Calendar:** Google Calendar API + OAuth 2.0
- **Background jobs:** node-cron

## Project Structure

```text
client/        React/Vite frontend
server/        Express API, MongoDB models, services, and seed script
docs/          API, database, AI, Calendar, and system-design documentation

Requirements
Node.js 18+
MongoDB Atlas account or local MongoDB
Google account for Calendar integration
Gmail account with an App Password for SMTP
OpenAI API key (optional)
Environment Setup

Copy:

server/.env.example

to:

server/.env

Configure the required database and authentication variables.

Optional integrations can be configured for Gmail, Google Calendar, and OpenAI.

Never commit server/.env or any other secret credentials.

Detailed configuration instructions are available in:

Google Calendar Setup
AI Prompts and Behaviour
Local Setup Without Docker

From the project root:

npm install
npm run install:all
npm run dev

The application starts:

Frontend: http://localhost:5173
Backend:  http://localhost:5000
Health:   http://localhost:5000/api/health

Keep the development terminal running.

Seed Demo Data

To create the demo users and sample appointment:

npm run seed --prefix server

The seed script creates demo accounts for local testing.

Demo Accounts
Role	Email	Password
Admin	admin@careflow.test	Admin123!
Doctor	maya.shah@careflow.test	Doctor123!
Patient	arjun.mehta@careflow.test	Patient123!

These are local demo accounts only.

API Documentation

See docs/API.md.

All API endpoints use the /api prefix.

Protected endpoints use:

Authorization: Bearer <token>
Database Schema

See docs/DATABASE.md.

The main collections are:

users
doctors
appointments
notifications

Appointment booking uses a partial unique database index on doctor and start time for active bookings to prevent duplicate appointments.

AI Integration

CareFlow uses OpenAI for:

Pre-visit urgency, chief complaint, and suggested questions
Post-visit patient-friendly summaries
Medication schedule and follow-up information

See docs/AI_PROMPTS.md.

If OPENAI_API_KEY is unavailable or the provider fails, CareFlow uses deterministic fallback content so the core appointment workflow remains available.

AI output is informational assistance only and is not medical diagnosis or emergency guidance.

Email Notifications

CareFlow uses Nodemailer with SMTP.

Gmail can be configured using a Google App Password rather than the normal Gmail password.

Notification jobs are stored and processed through the background worker. Failed jobs are retried with increasing delays.

Google Calendar

See docs/GOOGLE_CALENDAR.md.

When configured, CareFlow can:

Create Calendar events for booked appointments
Synchronize configured appointment changes
Delete Calendar events when appointments are cancelled

Calendar integration failures do not invalidate the underlying appointment.

System Design

The required system-design write-up is available at:

docs/SYSTEM_DESIGN.md

It covers:

Double-booking prevention
Doctor leave conflict handling
Slot-hold mechanism
Notification failure handling
Hosted Application

Live URL: To be added after deployment.

Security

Do not commit:

.env
.env.*
node_modules/
dist/

Real MongoDB credentials, JWT secrets, SMTP credentials, OpenAI API keys, and Google OAuth credentials must remain in environment variables.
