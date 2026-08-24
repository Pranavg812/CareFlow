# CareFlow API Documentation

## Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Register a patient or doctor account |
| POST | `/api/auth/login` | Authenticate and return JWT/user information |

## Patient and Doctor APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/doctors` | Search doctors by speciality |
| GET | `/api/doctors/:id/slots?date=YYYY-MM-DD` | Get computed appointment availability |
| POST | `/api/appointments` | Create an appointment with symptoms |
| GET | `/api/appointments/me` | Get the current user's appointments |
| PATCH | `/api/appointments/:id/cancel` | Cancel an appointment |
| PATCH | `/api/appointments/:id/clinical-notes` | Doctor updates clinical notes, prescription, and post-visit summary |

## Admin APIs

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST/PATCH | `/api/admin/doctors` | Manage doctor records |
| POST | `/api/admin/doctors/:id/leaves` | Add doctor leave and handle affected appointments |

> Authentication and role-based authorization are enforced by the API for protected operations.

## Response and Error Handling

The API uses standard HTTP status codes. Successful operations return JSON responses. Invalid requests, unauthorized access, unavailable appointment slots, and server/integration failures return appropriate error responses.

Appointment booking performs server-side availability validation and database-level duplicate protection. A concurrently claimed slot returns HTTP `409 Conflict`.