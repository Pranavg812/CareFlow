import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Doctor, Appointment, Notification } from './models.js';

const hours = [{ day: 1, start: '09:00', end: '17:00' }, { day: 2, start: '09:00', end: '17:00' }, { day: 3, start: '09:00', end: '17:00' }, { day: 4, start: '09:00', end: '17:00' }, { day: 5, start: '09:00', end: '17:00' }];
await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/careflow');
await Promise.all([User.deleteMany({}), Doctor.deleteMany({}), Appointment.deleteMany({}), Notification.deleteMany({})]);
const makeUser = (name, email, password, role) => User.create({ name, email, role, passwordHash: bcrypt.hashSync(password, 12) });
const [admin, maya, arjun] = await Promise.all([makeUser('CareFlow Admin', 'admin@careflow.test', 'Admin123!', 'ADMIN'), makeUser('Dr. Maya Shah', 'maya.shah@careflow.test', 'Doctor123!', 'DOCTOR'), makeUser('Arjun Mehta', 'arjun.mehta@careflow.test', 'Patient123!', 'PATIENT')]);
const doctor = await Doctor.create({ userId: maya._id, speciality: 'General Medicine', bio: 'Experienced physician focused on preventative and family care.', workingHours: hours, slotDurationMinutes: 30 });
await Appointment.create({ patientId: arjun._id, doctorId: doctor._id, startAt: new Date(Date.now() + 86400000), endAt: new Date(Date.now() + 86400000 + 1800000), symptoms: 'Mild headache and fatigue for two days.', preVisitSummary: { status: 'READY', urgency: 'Low', chiefComplaint: 'Headache and fatigue', suggestedQuestions: ['When did this begin?', 'How is your sleep?', 'Any new medication?'] } });
console.log('Seed complete. Admin: admin@careflow.test / Admin123!'); await mongoose.disconnect();
