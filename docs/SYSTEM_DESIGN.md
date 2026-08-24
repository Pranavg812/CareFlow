# System design write-up

CareFlow is a role-based healthcare appointment application with patient, doctor, and admin portals. It uses one React client, one Express REST API, and MongoDB. Keeping the design as a small monolith makes it easy to deploy and explain while still separating responsibilities internally: authentication, scheduling, clinical summaries, and notifications have their own API/service boundaries.

## Booking and double-booking prevention

The frontend never decides whether a slot is truly available. It asks the API for a doctor’s computed slots, but that result is only a convenience for the user interface. When a patient confirms, the API validates the chosen time again: it must be in the doctor’s working hours, outside leave dates, and in the future. It then creates the appointment in MongoDB.

The final concurrency guarantee is a partial unique index on `doctorId` and `startAt` for appointments whose status is `BOOKED`. Two requests can therefore reach the API at nearly the same time, but MongoDB accepts only one. The API catches its duplicate-key error and responds to the losing request with HTTP 409 and a clear message that the slot was just taken. Cancelled and completed appointments no longer consume the unique index, so future booking availability is correct. This protects the clinic even if a client has stale availability data or bypasses the interface.

The blueprint allows a short slot hold as a future enhancement. The current safe baseline is database uniqueness because it cannot expire incorrectly or block a valid booking. A hold collection with an expiry index can be added when the multi-step booking flow needs reservation behavior; appointment creation would still retain the unique index as the final guard.

## Doctor leave conflicts

Admin leave management records leave dates on the doctor document. Before adding a date, the API queries future `BOOKED` appointments that overlap that calendar day. When the leave date is saved, those appointments are changed to `CANCELLED` and a cancellation notification is queued for each affected patient. The admin receives the count in the response, so the UI can display the impact immediately. Slot generation excludes leave dates, meaning no new appointment can be made for the unavailable period.

For a larger production system, leave update and appointment cancellation would run in a MongoDB transaction so both are committed together. The assignment version keeps the operations simple but preserves the crucial behavior: patients are never silently left with a booking on a doctor’s leave day.

## Notification reliability and medication reminders

The application does not send email or call Google Calendar directly in the request that books an appointment. Instead it writes a notification job containing its type, target user, payload, status, retry count, and next attempt time. A cron worker processes pending jobs every minute. Successful work is marked `SENT`; a failure is marked `FAILED`, records its error, and retries with exponential backoff up to five attempts. This means a temporary mail/calendar outage cannot roll back a valid appointment.

The same outbox pattern supports booking confirmations, cancellations, post-visit summary notices, and medication reminders. When a doctor completes a prescription, reminder jobs can be created from medicine frequency/times. In local development without SMTP credentials, the worker logs email content instead of failing, which keeps demonstrations usable.

## AI and integration resilience

The pre-visit prompt requests urgency, chief complaint, and three questions; the post-visit prompt requests a patient-friendly summary, medication schedule, and follow-up steps. Both expect JSON and are called only from the API, so the browser never sees an API key. A timeout/error/invalid response falls back to deterministic, non-diagnostic data and records the fallback status. The appointment and doctor workflow continue normally. AI is explicitly presented as assistance, not diagnosis or emergency guidance.

Google Calendar is also optional at runtime. When configured with OAuth credentials and refresh token, a background job creates, updates, or deletes a calendar event and stores its event ID on the appointment. If it is absent or fails, the job is retried while the appointment remains confirmed in CareFlow.
