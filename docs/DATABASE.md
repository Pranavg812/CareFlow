# CareFlow Database Schema

CareFlow uses MongoDB with Mongoose.

## Users

Stores authentication and role information.

| Field | Description |
|---|---|
| `_id` | MongoDB document identifier |
| `name` | User's full name |
| `email` | Unique email address |
| `passwordHash` | Hashed password |
| `role` | `PATIENT`, `DOCTOR`, or `ADMIN` |
| `phone` | Optional phone number |

## Doctors

Stores doctor profile and availability configuration.

| Field | Description |
|---|---|
| `_id` | MongoDB document identifier |
| `userId` | Reference to the associated user |
| `speciality` | Medical speciality |
| `bio` | Doctor description |
| `workingHours` | Configured working schedule |
| `slotDurationMinutes` | Appointment slot duration |
| `leaveDates` | Dates when the doctor is unavailable |

## Appointments

Stores the complete appointment lifecycle.

| Field | Description |
|---|---|
| `_id` | MongoDB document identifier |
| `patientId` | Reference to patient |
| `doctorId` | Reference to doctor |
| `startAt` | Appointment start time |
| `endAt` | Appointment end time |
| `status` | Appointment status such as `BOOKED`, `CANCELLED`, or `COMPLETED` |
| `symptoms` | Patient-provided symptoms |
| `preVisitSummary` | AI-generated pre-visit assistance |
| `doctorNotes` | Doctor's clinical notes |
| `prescription` | Prescribed medication information |
| `postVisitSummary` | AI-generated patient summary |
| `calendarEventId` | Google Calendar event identifier |

### Double-booking protection

A partial unique index on the doctor's ID and appointment start time applies to active `BOOKED` appointments. This prevents two confirmed appointments from occupying the same doctor/time slot.

## Notifications

Stores asynchronous email and Google Calendar jobs.

| Field | Description |
|---|---|
| `_id` | MongoDB document identifier |
| `userId` | Notification recipient |
| `appointmentId` | Related appointment |
| `type` | Notification event type |
| `channel` | `EMAIL` or `CALENDAR` |
| `payload` | Notification data |
| `status` | `PENDING`, `SENT`, or `FAILED` |
| `attempts` | Number of processing attempts |
| `nextAttemptAt` | Next retry time |
| `lastError` | Last processing error, if any |