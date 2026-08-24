import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import { Appointment, Notification, User } from './models.js';

const fallbackPreVisit = symptoms => ({ status: 'FALLBACK', urgency: /chest|breath|faint|severe/i.test(symptoms) ? 'High' : 'Medium', chiefComplaint: symptoms.slice(0, 140), suggestedQuestions: ['When did these symptoms begin?', 'What makes the symptoms better or worse?', 'Are there any relevant medicines or allergies?'] });
const fallbackPostVisit = (notes, prescription) => ({ status: 'FALLBACK', patientSummary: notes || 'Your doctor has completed your visit notes.', medicationSchedule: prescription?.length ? prescription : [], followUpSteps: 'Follow your doctor’s advice and contact the clinic if symptoms worsen.' });

async function aiJson(instruction, fallback) {
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', response_format: { type: 'json_object' }, messages: [{ role: 'system', content: 'Return valid JSON only. This is informational assistance, never diagnosis.' }, { role: 'user', content: instruction }] })
    });
    if (!response.ok) throw new Error(`AI HTTP ${response.status}`);
    return { status: 'READY', ...JSON.parse((await response.json()).choices[0].message.content) };
  } catch (error) {
    console.error('AI summary generation failed:', error.message);
    return { ...fallback, status: 'FALLBACK', error: error.message };
  }
}

export const makePreVisitSummary = symptoms => aiJson(`Analyse these symptoms and return urgency (Low, Medium, or High), chiefComplaint, and exactly three suggestedQuestions. Do not diagnose. Symptoms: ${symptoms}`, fallbackPreVisit(symptoms));
export async function makePostVisitSummary(notes, prescription) {
  const fallback = fallbackPostVisit(notes, prescription);
  const summary = await aiJson(`Convert these clinical notes into JSON with patientSummary, medicationSchedule, and followUpSteps. medicationSchedule must be an array of medicine objects with name, dose, frequency, and times. Use kind, non-diagnostic language. Notes: ${notes}. Prescription: ${JSON.stringify(prescription)}`, fallback);

  // The schema stores medication schedules as medicine objects, never prose or a string.
  return {
    ...summary,
    medicationSchedule: Array.isArray(summary.medicationSchedule)
      ? summary.medicationSchedule
      : fallback.medicationSchedule
  };
}

export async function queueNotification({ userId, appointmentId, type, channel = 'EMAIL', payload = {} }) {
  return Notification.create({ userId, appointmentId, type, channel, payload });
}

function transporter() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}

async function syncCalendar(appointment, mode) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_REFRESH_TOKEN) return;
  const oauth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
  oauth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  const calendar = google.calendar({ version: 'v3', auth: oauth });
  if (mode === 'DELETE' && appointment.calendarEventId) return calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary', eventId: appointment.calendarEventId });
  const patient = await User.findById(appointment.patientId);
  const event = { summary: 'CareFlow appointment', description: `Appointment for ${patient?.name || 'patient'}`, start: { dateTime: appointment.startAt.toISOString() }, end: { dateTime: appointment.endAt.toISOString() }, attendees: patient ? [{ email: patient.email }] : [] };
  const result = appointment.calendarEventId ? await calendar.events.update({ calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary', eventId: appointment.calendarEventId, requestBody: event }) : await calendar.events.insert({ calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary', requestBody: event });
  if (!appointment.calendarEventId) { appointment.calendarEventId = result.data.id; await appointment.save(); }
}

export async function processNotifications() {
  const jobs = await Notification.find({ status: { $in: ['PENDING', 'FAILED'] }, nextAttemptAt: { $lte: new Date() }, attempts: { $lt: 5 } }).limit(20);
  const mailer = transporter();
  for (const job of jobs) {
    try {
      const user = await User.findById(job.userId);
      const appointment = job.appointmentId && await Appointment.findById(job.appointmentId);
      if (job.channel === 'CALENDAR' && appointment) await syncCalendar(appointment, job.type === 'CANCELLED' ? 'DELETE' : 'UPSERT');
      else if (mailer && user) await mailer.sendMail({ from: process.env.MAIL_FROM || 'CareFlow <no-reply@careflow.local>', to: user.email, subject: `CareFlow: ${job.type.replaceAll('_', ' ')}`, text: job.payload.message || 'Your CareFlow appointment has been updated.' });
      else console.log(`[notification:${job.type}]`, user?.email, job.payload.message || 'Email provider not configured');
      job.status = 'SENT'; job.lastError = undefined;
    } catch (error) {
      job.status = 'FAILED'; job.lastError = error.message; job.nextAttemptAt = new Date(Date.now() + 2 ** (job.attempts + 1) * 60000);
    }
    job.attempts += 1; await job.save();
  }
}
