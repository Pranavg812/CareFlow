import mongoose from 'mongoose';

const { Schema, model } = mongoose;
const workingHourSchema = new Schema({ day: Number, start: String, end: String }, { _id: false });
const medicationSchema = new Schema({ name: String, dose: String, frequency: String, times: [String] }, { _id: false });

export const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN'], default: 'PATIENT' },
  phone: String
}, { timestamps: true }));

export const Doctor = model('Doctor', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  speciality: { type: String, required: true, index: true },
  bio: { type: String, default: '' },
  workingHours: { type: [workingHourSchema], default: [] },
  slotDurationMinutes: { type: Number, default: 30, min: 15, max: 120 },
  leaveDates: { type: [String], default: [] }
}, { timestamps: true }));

const summarySchema = new Schema({
  status: { type: String, default: 'PENDING' },
  urgency: String,
  chiefComplaint: String,
  suggestedQuestions: [String],
  patientSummary: String,
  medicationSchedule: { type: [medicationSchema], default: [] },
  followUpSteps: String,
  error: String
}, { _id: false });

const appointmentSchema = new Schema({
  patientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  status: { type: String, enum: ['BOOKED', 'COMPLETED', 'CANCELLED'], default: 'BOOKED' },
  symptoms: { type: String, required: true, maxlength: 5000 },
  preVisitSummary: { type: summarySchema, default: () => ({}) },
  doctorNotes: { type: String, default: '' },
  prescription: { type: [medicationSchema], default: [] },
  postVisitSummary: { type: summarySchema, default: () => ({}) },
  calendarEventId: String
}, { timestamps: true });
appointmentSchema.index({ doctorId: 1, startAt: 1 }, { unique: true, partialFilterExpression: { status: 'BOOKED' } });
export const Appointment = model('Appointment', appointmentSchema);

export const Notification = model('Notification', new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  type: { type: String, required: true },
  channel: { type: String, enum: ['EMAIL', 'CALENDAR', 'REMINDER'], default: 'EMAIL' },
  payload: { type: Schema.Types.Mixed, default: {} },
  status: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING' },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now },
  lastError: String
}, { timestamps: true }));
