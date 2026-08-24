# Healthcare Appointment & Follow-up Manager - Project Blueprint

## 1. What we are building

This is a small clinic management application with three protected portals:

- **Patient:** creates an account, finds a doctor by speciality, selects an available slot, records symptoms, books/reschedules/cancels, and sees appointment and medication reminders.
- **Doctor:** views their schedule, reads a concise AI-generated symptom summary before a visit, then records consultation notes and prescriptions. The system produces a plain-language post-visit summary for the patient.
- **Admin:** creates and maintains doctor profiles, working hours, slot duration, and leave days.

The important part is the workflow behind the screens. A real booking must never create two active appointments for one doctor and time. When leave clashes with existing bookings, affected patients must be notified. Email/calendar/AI failures must be recorded and retried or shown safely instead of crashing the app.

## 2. Assignment requirements translated into features

| Assignment requirement | Our feature |
| --- | --- |
| Role-based authentication | JWT login with `PATIENT`, `DOCTOR`, and `ADMIN` roles; route and API guards. |
| Search and booking | Doctor speciality filter, date/slot picker, symptoms step, booking confirmation. |
| No double booking | Atomic database operation backed by a unique compound index on doctor + start time. |
| Simultaneous booking attempts | The first confirmed request wins; the second receives a friendly `409 Slot no longer available` response. |
| Leave conflict | Admin marks leave; the server finds overlapping upcoming appointments, cancels them, and queues notifications. |
| AI summaries | Store structured pre-visit urgency/chief complaint/questions and post-visit patient-friendly summary. |
| Medication reminders | Prescription schedules create reminder jobs, which are processed in the background. |
| Email reliability | Notification-outbox records status, retry count, next attempt, and error message. |
| Google Calendar | Create/update/delete an event after a booking change; retain its event ID in the appointment. |
| Failure handling | A failed AI, email, or calendar call leaves the core appointment intact and exposes a retryable pending/failed integration state. |

## 3. Tech-stack decision (deliberately learnable)

### Working assumption

No application code or existing stack was present in this repository when this document was written. Until you tell me otherwise, I propose the familiar JavaScript stack below. It is intentionally small enough to understand in 2-3 focused days:

| Area | Choice | Why it fits |
| --- | --- | --- |
| Frontend | React + Vite + Tailwind CSS from Emergent | Fast to scaffold; component-based screens and responsive UI. |
| Backend | Node.js + Express | Straightforward REST APIs and middleware; easy to explain in a viva. |
| Database | MongoDB Atlas + Mongoose | Familiar document modelling; supports indexes and transactions for safe booking. |
| Authentication | JWT + bcrypt | Standard, small, and appropriate for role-based portals. |
| Validation | Zod or express-validator (choose one only) | Prevents invalid request data at the API boundary. |
| Jobs | node-cron plus a MongoDB notification outbox | Enough for this assignment without adding Redis or a queue service. |
| Email | Nodemailer | Works with a Gmail app password for a demo; provider can be swapped later. |
| AI | OpenAI API or Gemini API (choose the account you already have) | One small service wrapper with graceful fallback. |
| Calendar | Google Calendar API + OAuth 2.0 | Explicit assignment requirement. |
| Hosting | Vercel (client) + Render/Railway (API) + MongoDB Atlas | Has free-tier paths and minimal DevOps. |

**Not using:** microservices, Redux, Docker, Redis/BullMQ, WebSockets, GraphQL, payment systems, or medical-diagnosis logic. They add learning and deployment risk without helping this assignment.

## 4. Architecture

```text
React frontend (Emergent-generated UI)
        |
        | HTTPS / REST + JWT
        v
Express API
  |-- auth and role middleware
  |-- appointment + slot service
  |-- doctor/admin service
  |-- AI summary service
  |-- notification/calendar service
        |
        +---- MongoDB Atlas
        |       users, doctors, appointments, leaves,
        |       prescriptions, notifications, slot holds
        |
        +---- Background worker (node-cron)
                retries email/calendar jobs, sends medication reminders,
                expires slot holds
```

The frontend remains a client of the API. It never calls the database, AI provider, Gmail, or Google Calendar directly. Secrets stay only in the server `.env` file.

## 5. Core data model

Keep the initial model compact:

- `users`: name, email, passwordHash, role, phone.
- `doctors`: userId, speciality, bio, workingHours, slotDurationMinutes, leaveDates.
- `appointments`: patientId, doctorId, startAt, endAt, status, symptoms, preVisitSummary, doctorNotes, postVisitSummary, calendarEventId.
- `prescriptions`: appointmentId, medicines `[name, dose, frequency, times, startDate, endDate]`.
- `slotHolds`: doctorId, startAt, patientId, expiresAt. This is optional but demonstrates the requested hold mechanism.
- `notifications`: userId, type, channel, payload, status, attempts, nextAttemptAt, lastError.

### Essential database rule

Create a **unique compound index** on `appointments(doctorId, startAt)` for active bookings. In MongoDB, use a partial unique index that applies only to `BOOKED`/`CONFIRMED` records. The server also validates working hours, leave, and conflicts in a transaction. The index is the final protection if two people click Book at nearly the same time.

## 6. Booking flow

```text
Patient chooses doctor/date/slot
  -> API checks working hours + leave + current booking/hold
  -> optional 5-minute slot hold
  -> patient submits symptoms
  -> API generates pre-visit summary (or safely marks it unavailable)
  -> transaction creates appointment + removes hold
  -> outbox jobs are written for email and calendar
  -> patient sees confirmed appointment immediately
  -> worker delivers/retries external notifications separately
```

We will not tell a patient that an appointment is confirmed until the database transaction succeeds. Calendar and email are secondary integrations: their temporary failure does not undo the appointment.

## 7. Screens to build

### Shared

- Landing page, login, register, forgot password placeholder (optional)
- Profile menu, protected routes, clear loading/empty/error states

### Patient

- Dashboard: upcoming appointment, summary cards, reminders
- Find doctors: speciality search and doctor cards
- Doctor details + available-slot calendar
- Booking: slot review, symptom form, consent/disclaimer, confirmation
- My appointments: upcoming/past, reschedule/cancel actions
- Appointment details: pre-visit and post-visit summaries, prescription schedule

### Doctor

- Dashboard: today's queue and next patient
- Schedule
- Appointment details: symptoms, urgency badge, AI questions, notes/prescription form, generated patient summary

### Admin

- Overview dashboard
- Doctor management: create/edit profile, working hours, slot length
- Leave management: date/range selector and affected appointment warning

## 8. Emergent frontend prompt

Paste the following into Emergent. Ask it to generate the frontend only; do not allow it to invent backend/database integrations.

```text
Build a responsive React + Vite + TypeScript healthcare appointment management frontend called "CareFlow". Use Tailwind CSS and lucide-react icons only. Do not add a backend, authentication provider, database, calendar SDK, AI SDK, or any external data service. Use local mock data in a single `src/data/mockData.ts` file and a small `src/types` folder. Keep all API requests isolated in a clearly marked `src/services/api.ts` placeholder so I can connect my Express backend later.

Create a calm, accessible clinical UI: white/slate surfaces, teal primary (#0F766E), blue accent (#2563EB), soft rounded cards, high contrast text, clear status chips, desktop sidebar and mobile bottom navigation. No gradients, no stock photos, no overly decorative elements. Use Inter/system fonts. Show realistic empty, loading and error states.

Build these routes and reusable components:
1. `/` landing page with hero, features, doctor-search CTA, and role cards.
2. `/login` and `/register` pages. Registration includes role selector, but patient is the default.
3. Patient routes: `/patient/dashboard`, `/patient/doctors`, `/patient/doctors/:id`, `/patient/book/:doctorId`, `/patient/appointments`, `/patient/appointments/:id`.
4. Doctor routes: `/doctor/dashboard`, `/doctor/schedule`, `/doctor/appointments/:id`.
5. Admin routes: `/admin/dashboard`, `/admin/doctors`, `/admin/leaves`.

Patient booking must be a 3-step flow: select date/time slot, describe symptoms in a textarea, then review/confirm. Show unavailable slots, selected slot, a 5-minute hold timer UI, an AI pre-visit summary panel (urgency Low/Medium/High, chief complaint, three questions), and a non-diagnostic medical disclaimer.

Doctor appointment detail must include patient information, symptoms, urgency badge, suggested questions, notes textarea, repeatable prescription rows (medicine, dose, frequency, times), and a patient-friendly post-visit summary preview.

Admin doctor management must include a table/form for speciality, working hours, slot duration, and an add-leave dialog that warns how many appointments may be affected.

Make all forms controlled, client-validated, and ready for later API wiring. Create reusable components for AppShell, StatusBadge, AppointmentCard, DoctorCard, SlotPicker, Stepper, EmptyState, PageHeader, and ConfirmDialog. Use mock data for at least 4 doctors, upcoming/past appointments, an urgent summary, leave dates, and notifications. Add concise code comments only at API integration points. Ensure TypeScript builds without errors.
```

### How to use its output

1. Generate the UI in Emergent and export/download its source.
2. Put it in a `client/` folder only after we inspect its `package.json` and remove unnecessary dependencies.
3. Keep mocked API calls behind `src/services/api.ts`; I will connect each endpoint incrementally.
4. Do not ask Emergent to build the backend. Its output should be visual and local-state only.

## 9. Build order

### Phase 0 - lock the foundation

1. Confirm this stack or tell me your actual stack.
2. Generate and inspect the Emergent frontend.
3. Create the repository structure, `.gitignore`, `README`, `.env.example`, and API contract.

### Phase 1 - functional backbone

1. Express server and MongoDB connection.
2. User model, registration/login, JWT role middleware.
3. Admin doctor profile and working-hours management.
4. Doctor search and deterministic slot generation.

### Phase 2 - the highest-value assignment logic

1. Appointment creation, cancellation, rescheduling.
2. Compound unique booking index, transaction, and `409` handling.
3. Leave creation and conflict detection/notifications.
4. Optional 5-minute slot hold with TTL cleanup.

### Phase 3 - integrations

1. AI service wrapper; save valid structured JSON and show fallback if it fails.
2. Post-visit notes, prescription, and patient summary.
3. Notification outbox + cron retry and medication reminders.
4. Email confirmation/reminder/cancellation.
5. Google Calendar OAuth and event sync.

### Phase 4 - evidence and submission

1. Seed demo accounts/data and test all three roles.
2. Write the ≤800-word system design note.
3. Complete README, API documentation, database schema, prompts, and Calendar setup.
4. Deploy client/API and test the public URL.
5. Push only source/docs to a **public GitHub repository on `main`**.

## 10. API outline

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/doctors?speciality=&date=
GET    /api/doctors/:doctorId/slots?date=
POST   /api/slot-holds
DELETE /api/slot-holds/:id
POST   /api/appointments
GET    /api/appointments/me
PATCH  /api/appointments/:id/reschedule
PATCH  /api/appointments/:id/cancel
PATCH  /api/appointments/:id/notes            (doctor)
POST   /api/appointments/:id/prescriptions    (doctor)
GET    /api/admin/doctors
POST   /api/admin/doctors
PATCH  /api/admin/doctors/:id
POST   /api/admin/doctors/:id/leaves
```

## 11. Decisions we will defend in the system-design write-up

- **Double-booking:** validate first for a good UX, then rely on a database unique index inside the final create flow. Catch duplicate-key errors and return `409`; never trust only a frontend availability check.
- **Slot hold:** create a short-lived hold before symptom/confirmation. It expires automatically. A confirmed appointment still has higher priority and is protected by the unique index.
- **Leave conflicts:** pre-check and show the count before admin confirms leave; on confirmation, update leave data and create cancellation/notification work in the same transaction.
- **Notification reliability:** write notification jobs to MongoDB with the business change, then retry transient provider failures using exponential backoff. Do not block bookings on email/calendar results.
- **AI failure:** use timeout + try/catch + strict JSON parsing. Persist an `UNAVAILABLE` summary status with the original symptoms/notes; doctor or patient workflow remains usable.

## 12. Submission guardrails

- GitHub is preferred: repository public, branch named `main`, and downloadable.
- Do not commit `node_modules`, `.env`, build folders (`dist`, `.next`, `out`), editor folders, or temporary files.
- Keep packages minimal. Every added package must have a clear assignment need.
- Deliver: source code, hosted URL, README, `.env.example`, API docs, DB schema, AI prompts, Calendar setup, and the ≤800-word system design write-up.

## 13. Current project decisions log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-08-23 | Start with one REST API, not microservices. | Faster to build, explain, test, and deploy. |
| 2026-08-23 | Use database-enforced booking uniqueness. | Required for concurrency safety. |
| 2026-08-23 | Decouple integrations through an outbox/worker. | Keeps bookings reliable when providers fail. |
| 2026-08-23 | Use Emergent for UI only. | Prevents hidden backend dependencies and keeps the source understandable. |
| 2026-08-23 | Treat AI output as assistance, not diagnosis. | Safer product behavior and a clearer scope. |
| 2026-08-23 | Implement custom React UI instead of using Emergent. | Keeps the source offline, inspectable, and independent of generation credits. |

---

Update this file whenever we make a new architecture, dependency, or scope decision. It is the project memory we will use while building and documenting the assignment.
