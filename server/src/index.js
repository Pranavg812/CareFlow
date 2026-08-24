import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import cron from 'node-cron';
import { User, Doctor, Appointment } from './models.js';
import { makePreVisitSummary, makePostVisitSummary, processNotifications, queueNotification } from './services.js';

const app = express();
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL?.split(',') || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET must be configured.');
const sign = user => jwt.sign({ id: user._id, role: user.role, name: user.name }, jwtSecret, { expiresIn: '7d' });
const auth = (...roles) => async (req, res, next) => { try { const token = req.headers.authorization?.split(' ')[1]; const claims = jwt.verify(token, jwtSecret); req.user = await User.findById(claims.id); if (!req.user || (roles.length && !roles.includes(req.user.role))) return res.status(403).json({ message: 'Access denied' }); next(); } catch { res.status(401).json({ message: 'Authentication required' }); } };
const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const publicUser = user => ({ id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone });
const startOfDay = value => new Date(`${value}T00:00:00.000Z`);

function buildSlots(doctor, date, bookedStarts) {
  const day = startOfDay(date); const hours = doctor.workingHours.find(item => item.day === day.getUTCDay());
  if (!hours || doctor.leaveDates.includes(date)) return [];
  const [startH, startM] = hours.start.split(':').map(Number); const [endH, endM] = hours.end.split(':').map(Number);
  let cursor = new Date(day); cursor.setUTCHours(startH, startM, 0, 0); const end = new Date(day); end.setUTCHours(endH, endM, 0, 0);
  const slots = [];
  while (cursor < end) { const key = cursor.toISOString(); const next = new Date(cursor.getTime() + doctor.slotDurationMinutes * 60000); if (next <= end) slots.push({ startAt: key, endAt: next.toISOString(), available: !bookedStarts.has(key) && cursor > new Date() }); cursor = next; }
  return slots;
}
async function appointmentView(appointment) { return appointment.populate([{ path: 'patientId', select: 'name email phone' }, { path: 'doctorId', populate: { path: 'userId', select: 'name email phone' } }]); }

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'careflow-api' }));
app.post('/api/auth/register', asyncRoute(async (req, res) => {
  const { name, email, password, phone, role = 'PATIENT' } = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ message: 'Name, email, and an 8-character password are required.' });
  if (!['PATIENT', 'DOCTOR'].includes(role)) return res.status(400).json({ message: 'Invalid self-registration role.' });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account already exists with this email.' });
  const user = await User.create({ name, email, phone, role, passwordHash: await bcrypt.hash(password, 12) });
  if (role === 'DOCTOR') await Doctor.create({ userId: user._id, speciality: 'General Medicine', bio: '', workingHours: [{ day: 1, start: '09:00', end: '17:00' }, { day: 2, start: '09:00', end: '17:00' }, { day: 3, start: '09:00', end: '17:00' }, { day: 4, start: '09:00', end: '17:00' }, { day: 5, start: '09:00', end: '17:00' }] });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const user = await User.findOne({ email: req.body.email?.toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ message: 'Incorrect email or password.' });
  res.json({ token: sign(user), user: publicUser(user) });
}));
app.get('/api/auth/me', auth(), (req, res) => res.json({ user: publicUser(req.user) }));

app.get('/api/doctors', asyncRoute(async (req, res) => {
  const filter = req.query.speciality ? { speciality: new RegExp(req.query.speciality, 'i') } : {};
  const doctors = await Doctor.find(filter).populate('userId', 'name email');
  res.json({ doctors });
}));
app.get('/api/doctors/:id/slots', asyncRoute(async (req, res) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '')) return res.status(400).json({ message: 'Use date=YYYY-MM-DD.' });
  const doctor = await Doctor.findById(req.params.id); if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });
  const day = startOfDay(req.query.date); const next = new Date(day); next.setUTCDate(next.getUTCDate() + 1);
  const appointments = await Appointment.find({ doctorId: doctor._id, status: 'BOOKED', startAt: { $gte: day, $lt: next } }).select('startAt');
  res.json({ slots: buildSlots(doctor, req.query.date, new Set(appointments.map(a => a.startAt.toISOString()))) });
}));

app.post('/api/appointments', auth('PATIENT'), asyncRoute(async (req, res) => {
  const { doctorId, startAt, symptoms } = req.body;
  if (!doctorId || !startAt || !symptoms?.trim()) return res.status(400).json({ message: 'Doctor, time, and symptoms are required.' });
  const doctor = await Doctor.findById(doctorId); if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });
  const start = new Date(startAt); if (Number.isNaN(+start) || start <= new Date()) return res.status(400).json({ message: 'Choose a future slot.' });
  const date = start.toISOString().slice(0, 10); const validSlot = buildSlots(doctor, date, new Set()).find(s => s.startAt === start.toISOString());
  if (!validSlot) return res.status(400).json({ message: 'This time is outside the doctor’s availability or leave period.' });
  const preVisitSummary = await makePreVisitSummary(symptoms);
  try {
    const appointment = await Appointment.create({ patientId: req.user._id, doctorId, startAt: start, endAt: new Date(validSlot.endAt), symptoms: symptoms.trim(), preVisitSummary });
    await Promise.all([queueNotification({ userId: req.user._id, appointmentId: appointment._id, type: 'BOOKING_CONFIRMED', payload: { message: `Your appointment is confirmed for ${start.toLocaleString()}.` } }), queueNotification({ userId: req.user._id, appointmentId: appointment._id, type: 'CALENDAR_SYNC', channel: 'CALENDAR' })]);
    res.status(201).json({ appointment: await appointmentView(appointment) });
  } catch (error) { if (error?.code === 11000) return res.status(409).json({ message: 'That slot was just booked. Please choose another time.' }); throw error; }
}));
app.get('/api/appointments/me', auth(), asyncRoute(async (req, res) => {
  const filter = req.user.role === 'PATIENT' ? { patientId: req.user._id } : req.user.role === 'DOCTOR' ? { doctorId: (await Doctor.findOne({ userId: req.user._id }))?._id } : {};
  const appointments = await Appointment.find(filter).sort({ startAt: 1 });
  res.json({ appointments: await Promise.all(appointments.map(appointmentView)) });
}));
app.patch('/api/appointments/:id/cancel', auth(), asyncRoute(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id); if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
  const doctor = await Doctor.findOne({ userId: req.user._id });
  if (!appointment.patientId.equals(req.user._id) && !appointment.doctorId.equals(doctor?._id) && req.user.role !== 'ADMIN') return res.status(403).json({ message: 'Access denied.' });
  appointment.status = 'CANCELLED'; await appointment.save();
  await Promise.all([queueNotification({ userId: appointment.patientId, appointmentId: appointment._id, type: 'APPOINTMENT_CANCELLED', payload: { message: 'Your appointment has been cancelled.' } }), queueNotification({ userId: appointment.patientId, appointmentId: appointment._id, type: 'CANCELLED', channel: 'CALENDAR' })]);
  res.json({ appointment: await appointmentView(appointment) });
}));
app.patch('/api/appointments/:id/clinical-notes', auth('DOCTOR'), asyncRoute(async (req, res) => {
  const doctor = await Doctor.findOne({ userId: req.user._id }); const appointment = await Appointment.findOne({ _id: req.params.id, doctorId: doctor?._id });
  if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
  appointment.doctorNotes = req.body.doctorNotes || ''; appointment.prescription = req.body.prescription || []; appointment.postVisitSummary = await makePostVisitSummary(appointment.doctorNotes, appointment.prescription); appointment.status = 'COMPLETED'; await appointment.save();
  await queueNotification({ userId: appointment.patientId, appointmentId: appointment._id, type: 'VISIT_SUMMARY_READY', payload: { message: 'Your post-visit summary is ready in CareFlow.' } });
  res.json({ appointment: await appointmentView(appointment) });
}));

app.get('/api/admin/doctors', auth('ADMIN'), asyncRoute(async (req, res) => res.json({ doctors: await Doctor.find().populate('userId', 'name email phone') })));
app.post('/api/admin/doctors', auth('ADMIN'), asyncRoute(async (req, res) => {
  const { name, email, password, phone, speciality, bio, workingHours, slotDurationMinutes } = req.body;
  if (!name || !email || !password || !speciality) return res.status(400).json({ message: 'Name, email, password, and speciality are required.' });
  const user = await User.create({ name, email, phone, role: 'DOCTOR', passwordHash: await bcrypt.hash(password, 12) }); const doctor = await Doctor.create({ userId: user._id, speciality, bio, workingHours, slotDurationMinutes });
  res.status(201).json({ doctor: await doctor.populate('userId', 'name email phone') });
}));
app.patch('/api/admin/doctors/:id', auth('ADMIN'), asyncRoute(async (req, res) => { const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('userId', 'name email phone'); if (!doctor) return res.status(404).json({ message: 'Doctor not found.' }); res.json({ doctor }); }));
app.post('/api/admin/doctors/:id/leaves', auth('ADMIN'), asyncRoute(async (req, res) => {
  const { date } = req.body; if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return res.status(400).json({ message: 'Use date as YYYY-MM-DD.' });
  const doctor = await Doctor.findById(req.params.id); if (!doctor) return res.status(404).json({ message: 'Doctor not found.' });
  const day = startOfDay(date); const next = new Date(day); next.setUTCDate(next.getUTCDate() + 1); const conflicts = await Appointment.find({ doctorId: doctor._id, status: 'BOOKED', startAt: { $gte: day, $lt: next } });
  if (!doctor.leaveDates.includes(date)) doctor.leaveDates.push(date); await doctor.save();
  for (const appointment of conflicts) { appointment.status = 'CANCELLED'; await appointment.save(); await queueNotification({ userId: appointment.patientId, appointmentId: appointment._id, type: 'DOCTOR_LEAVE_CANCELLATION', payload: { message: 'Your appointment was cancelled because the doctor is unavailable. Please book another slot.' } }); }
  res.json({ doctor, affectedAppointments: conflicts.length });
}));

app.use((error, req, res, next) => { console.error('Request failed:', error.message); res.status(error.name === 'ValidationError' ? 400 : 500).json({ message: error.message || 'Unexpected server error.' }); });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/careflow').then(() => { app.listen(process.env.PORT || 5000, () => console.log(`CareFlow API on ${process.env.PORT || 5000}`)); cron.schedule('* * * * *', processNotifications); }).catch(error => { console.error('Database connection failed:', error.message); process.exit(1); });
