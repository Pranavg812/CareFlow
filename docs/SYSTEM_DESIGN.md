# System Design Write-up

CareFlow is a role-based healthcare appointment application with patient, doctor, and admin portals. It uses one React client, one Express REST API, and MongoDB. Keeping the system as a small monolith makes it easy to deploy and explain while separating responsibilities internally across authentication, scheduling, clinical summaries, and notifications.

## Booking and Double-Booking Prevention

The frontend never decides whether a slot is truly available. It requests computed availability from the API, but that result is only for the user interface. When a patient confirms an appointment, the API validates the selected time again: it must be within the doctor's working hours, outside leave dates, and in the future.

The final concurrency guarantee is a partial unique MongoDB index on `doctorId` and `startAt` for appointments with `BOOKED` status. Two requests can therefore reach the API at nearly the same time, but MongoDB accepts only one. The API catches a duplicate-key error and returns HTTP 409 with a clear slot-unavailable response to the losing request. Cancelled appointments no longer consume the active-booking constraint, so their slots become available again.

This protects the clinic even when a client has stale availability data or bypasses the interface.

## Doctor Leave Conflict Handling

Admin leave management records leave dates on the doctor document. Before saving leave, the API identifies future `BOOKED` appointments affected by the unavailable date. Those appointments are changed to `CANCELLED` and cancellation notification jobs are created for the affected patients.

Slot generation also excludes leave dates, so new appointments cannot be booked during the doctor's leave. This ensures that an existing patient is not silently left with an appointment on a day when the doctor is unavailable.

In a larger production system, the leave update and appointment cancellations could be wrapped in a MongoDB transaction to guarantee atomicity across all affected records.

## Slot Hold Mechanism

The current implementation uses backend availability validation and the database uniqueness constraint as the authoritative protection for appointment slots. It does not persist a separate temporary slot-hold record.

A natural production extension would introduce a short-lived `slotHolds` collection containing `doctorId`, `startAt`, `patientId`, and `expiresAt`. A hold could temporarily reserve a slot while a patient completes the multi-step booking process, after which it would expire automatically if the appointment is not confirmed.

The database uniqueness constraint would remain the final protection against concurrent confirmed bookings; a temporary hold should never replace database-level concurrency control.

## Notification Failure Handling

Email and Google Calendar operations are decoupled from the core appointment operation through a MongoDB notification/outbox collection. Each job records its user, appointment, type, channel, payload, status, attempt count, next attempt time, and last error.

A background worker processes pending jobs. Successful operations are marked `SENT`. Failures are marked `FAILED`, the error is recorded, and the job receives a later retry time using exponential backoff, with a maximum of five attempts.

This means a temporary email or Calendar outage does not invalidate an appointment that was successfully stored in the database. Calendar event IDs are retained on appointments so subsequent updates or cancellations can target the corresponding Google Calendar event.

## AI and Integration Resilience

CareFlow uses AI to generate structured pre-visit and post-visit assistance. The API requests urgency, chief complaint, suggested questions, patient-friendly summaries, medication schedules, and follow-up steps as appropriate. AI credentials remain server-side and are never exposed to the browser.

If the AI service fails or returns unusable data, deterministic fallback content is used so the appointment workflow remains functional. AI output is explicitly treated as informational assistance rather than diagnosis or emergency guidance.

Google Calendar is similarly treated as a secondary integration. When configured, background jobs create or update Calendar events and store their event IDs. If an external integration fails, the appointment remains intact and the notification job can be retried independently.