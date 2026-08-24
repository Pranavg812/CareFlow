# API and data schema

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Register a patient or doctor account |
| POST | `/auth/login` | Authenticate and return JWT/user |
| GET | `/doctors` | Search doctors by speciality |
| GET | `/doctors/:id/slots?date=YYYY-MM-DD` | Read computed availability |
| POST | `/appointments` | Create a safe booking with symptoms |
| GET | `/appointments/me` | Current user's appointments |
| PATCH | `/appointments/:id/cancel` | Cancel an appointment |
| PATCH | `/appointments/:id/clinical-notes` | Doctor notes/prescription and post-visit summary |
| GET/POST/PATCH | `/admin/doctors` | Admin doctor management |
| POST | `/admin/doctors/:id/leaves` | Add leave and notify affected patients |

## Collections

- **users:** name, email, passwordHash, role, phone.
- **doctors:** userId, speciality, bio, workingHours, slotDurationMinutes, leaveDates.
- **appointments:** patientId, doctorId, startAt, endAt, status, symptoms, preVisitSummary, doctorNotes, prescription, postVisitSummary, calendarEventId.
- **notifications:** userId, appointmentId, type, channel, payload, status, attempts, nextAttemptAt, lastError.

## LLM prompts

Pre-visit: `Analyse these symptoms and return JSON only: urgency (Low, Medium, or High), chiefComplaint, and exactly three suggestedQuestions. Do not diagnose. Symptoms: <symptoms>`

Post-visit: `Convert these clinical notes into JSON with patientSummary, medicationSchedule, and followUpSteps. medicationSchedule must be an array of medicine objects with name, dose, frequency, and times. Use kind, non-diagnostic language. Notes: <notes>`
