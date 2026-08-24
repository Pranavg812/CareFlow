import React, { createContext, useContext, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowRight, Bell, CalendarDays, CheckCircle2, Clock3, HeartPulse, LayoutDashboard, LogOut, Menu, Plus, Search, ShieldCheck, Stethoscope } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || '/api';
async function api(path, options = {}) { const token = localStorage.getItem('careflow_token'); let r; try { r = await fetch(`${API}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }), ...options.headers } }); } catch { throw new Error('Cannot reach the CareFlow API. Start the backend with `npm run dev --prefix server`.'); } const raw = await r.text(); let data; try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`The API returned an invalid response (HTTP ${r.status}). Make sure the backend is running on port 5000, then restart npm run dev.`); } if (!r.ok) throw new Error(data.message || `Request failed (HTTP ${r.status}).`); return data; }
const Auth = createContext(null); const useAuth = () => useContext(Auth); const home = r => r === 'ADMIN' ? '/admin' : r === 'DOCTOR' ? '/doctor' : '/patient'; const when = d => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
function Provider({ children }) { const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('careflow_user') || 'null')); const login = d => { localStorage.setItem('careflow_token', d.token); localStorage.setItem('careflow_user', JSON.stringify(d.user)); setUser(d.user); }; const logout = () => { localStorage.removeItem('careflow_token'); localStorage.removeItem('careflow_user'); setUser(null); }; return <Auth.Provider value={{ user, login, logout }}>{children}</Auth.Provider>; }
function Guard({ roles, children }) { const { user } = useAuth(); return !user ? <Navigate to="/login"/> : !roles.includes(user.role) ? <Navigate to={home(user.role)}/> : children; }
function Button({ children, className = 'btn btn-primary', ...props }) { return <button className={className} {...props}>{children}</button>; }
function Landing() { return <><nav className="landing-nav"><Link className="brand" to="/"><HeartPulse/>CareFlow</Link><div><Link className="text-link" to="/login">Sign in</Link><Link className="btn btn-primary" to="/register">Get started</Link></div></nav><main className="hero"><div className="hero-copy"><span className="eyebrow"><ShieldCheck size={16}/>Care designed around you</span><h1>Care that stays <em>in step</em> with you.</h1><p>Book trusted doctors, arrive prepared, and keep every follow-up in one thoughtful place.</p><div className="hero-actions"><Link className="btn btn-primary btn-large" to="/register">Find a doctor <ArrowRight size={18}/></Link><Link className="btn btn-ghost btn-large" to="/login">I have an account</Link></div><div className="trust-row"><span><CheckCircle2/>Secure booking</span><span><CheckCircle2/>Clear follow-ups</span><span><CheckCircle2/>Human-first care</span></div></div><div className="hero-card"><div className="mini-head"><div className="avatar">MS</div><div><b>Dr. Maya Shah</b><small>General Medicine</small></div><span className="online">Available</span></div><div className="appointment-preview"><span>Tomorrow, 10:00 AM</span><b>Follow-up appointment</b><small>30 minute consultation</small></div><div className="ai-note"><Activity size={18}/><div><b>Visit prepared</b><small>Your symptom overview is ready for your doctor.</small></div></div></div></main><section className="feature-grid"><Feature icon={<CalendarDays/>} title="Book with confidence" text="See real availability and receive immediate confirmation."/><Feature icon={<Activity/>} title="Arrive prepared" text="Share symptoms before your visit and get organized care."/><Feature icon={<Bell/>} title="Never miss a step" text="Appointments, prescriptions, and reminders stay together."/></section></> }
function Feature({ icon, title, text }) { return <article className="feature">{icon}<h3>{title}</h3><p>{text}</p></article>; }
function Login({ register = false }) { const [form, setForm] = useState({ name: '', email: '', password: '', role: 'PATIENT' }); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const { login } = useAuth(); const nav = useNavigate(); async function submit(e) { e.preventDefault(); setBusy(true); try { const d = await api(register ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(form) }); login(d); nav(home(d.user.role)); } catch (x) { setError(x.message); } finally { setBusy(false); } } return <main className="auth-page"><Link className="brand auth-brand" to="/"><HeartPulse/>CareFlow</Link><form className="auth-card" onSubmit={submit}><span className="eyebrow">{register ? 'Create your space' : 'Welcome back'}</span><h1>{register ? 'Start your care journey.' : 'Good to see you.'}</h1><p>{register ? 'Your healthcare, easier to manage.' : 'Sign in to continue to CareFlow.'}</p>{error && <div className="alert">{error}</div>}{register && <Field label="Full name" value={form.name} onChange={v => setForm({ ...form, name: v })}/>}<Field label="Email address" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })}/><Field label="Password" type="password" value={form.password} onChange={v => setForm({ ...form, password: v })}/>{register && <label>I am joining as<select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="PATIENT">Patient</option><option value="DOCTOR">Doctor</option></select></label>}<Button disabled={busy} className="btn btn-primary full">{busy ? 'Please wait...' : register ? 'Create account' : 'Sign in'}<ArrowRight size={18}/></Button><p className="form-footer">{register ? 'Already have an account?' : 'New to CareFlow?'} <Link to={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p></form></main>; }
function Field({ label, type = 'text', value, onChange }) { return <label>{label}<input required minLength={type === 'password' ? 8 : undefined} type={type} value={value} onChange={e => onChange(e.target.value)}/></label>; }
const links = { PATIENT: [['Overview', '/patient', LayoutDashboard], ['Find doctors', '/patient/doctors', Search], ['My appointments', '/patient/appointments', CalendarDays]], DOCTOR: [['Overview', '/doctor', LayoutDashboard], ['Schedule', '/doctor/appointments', CalendarDays]], ADMIN: [['Overview', '/admin', LayoutDashboard], ['Doctors', '/admin/doctors', Stethoscope], ['Leave manager', '/admin/leaves', CalendarDays]] };
function Shell({ children }) { const { user, logout } = useAuth(); const nav = useNavigate(); const [open, setOpen] = useState(false); return <div className="app"><aside className={open ? 'sidebar open' : 'sidebar'}><Link className="brand" to={home(user.role)}><HeartPulse/>CareFlow</Link><span className="role-chip">{user.role.toLowerCase()} portal</span><nav>{links[user.role].map(([t, p, I]) => <Link key={p} onClick={() => setOpen(false)} to={p}><I size={19}/>{t}</Link>)}</nav><Button className="logout" onClick={() => { logout(); nav('/'); }}><LogOut size={18}/>Sign out</Button></aside><div className="content"><header className="topbar"><Button className="menu-button" onClick={() => setOpen(!open)}><Menu/></Button><div className="welcome"><small>{new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</small><b>Hello, {user.name.split(' ')[0]}.</b></div><div className="avatar avatar-top">{user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div></header>{children}</div></div>; }
function Page({ title, subtitle, action }) { return <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div>{action}</div>; } function Head({ title, link, to }) { return <div className="section-head"><h2>{title}</h2>{link && <Link className="text-link" to={to}>{link}<ArrowRight size={14}/></Link>}</div>; } function Empty({ text }) { return <div className="empty"><CalendarDays/><p>{text}</p></div>; } function Stat({ label, value, icon, tone = '' }) { return <div className={`stat ${tone}`}><div><small>{label}</small><b>{value}</b></div>{icon}</div>; }
function Card({ a, action }) { const doc = a.doctorId?.userId?.name || 'CareFlow'; const patient = a.patientId?.name || 'Patient'; return <article className="appointment-card"><div className="card-icon"><CalendarDays size={19}/></div><div className="appointment-main"><span className={`status ${a.status.toLowerCase()}`}>{a.status}</span><h3>{a.doctorId?.userId ? doc : patient}</h3><p>{when(a.startAt)} · {a.doctorId?.speciality || 'Consultation'}</p></div>{action}</article>; }
function Patient() {
  const [items, setItems] = useState([]);
  const [selectedSummary, setSelectedSummary] = useState(null);

  useEffect(() => {
    api('/appointments/me')
      .then(d => setItems(d.appointments))
      .catch(() => {});
  }, []);

  const active = items.filter(a => a.status === 'BOOKED');

  const summaries = items.filter(
    a => a.postVisitSummary?.patientSummary
  );

  return (
    <Shell>
      <Page
        title="Your care, in one place."
        subtitle="Appointments, care plans, and the little things that matter."
        action={
          <Link className="btn btn-primary" to="/patient/doctors">
            <Plus size={18} />
            Book appointment
          </Link>
        }
      />

      <div className="stat-grid">
        <Stat
          label="Upcoming visits"
          value={active.length}
          icon={<CalendarDays />}
        />

        <Stat
          label="Care reminders"
          value="2"
          icon={<Bell />}
          tone="blue"
        />

        <Stat
          label="Health summaries"
          value={summaries.length}
          icon={<Activity />}
          tone="sand"
        />
      </div>

      <section className="two-col">
        <div className="panel">
          <Head
            title="Upcoming appointments"
            link="View all"
            to="/patient/appointments"
          />

          {active.length ? (
            active.slice(0, 3).map(a => (
              <Card key={a._id} a={a} />
            ))
          ) : (
            <Empty text="No upcoming appointments. Find a doctor when you’re ready." />
          )}
        </div>

        <div className="panel soft-panel">
          <span className="eyebrow">
            <HeartPulse size={16} />
            Care tip
          </span>

          <h2>Small symptoms deserve attention.</h2>

          <p>
            Before your appointment, note when symptoms started,
            what changes them, and any medicines you take.
          </p>

          <Link to="/patient/doctors" className="text-link">
            Find a doctor
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {summaries.length > 0 && (
        <section className="panel" style={{ marginTop: '24px' }}>
          <Head title="Health summaries" />

          {summaries.map(a => (
            <article
              key={a._id}
              className="appointment-card"
              style={{ cursor: 'pointer' }}
              onClick={() => setSelectedSummary(a)}
            >
              <div className="card-icon">
                <Activity size={19} />
              </div>

              <div className="appointment-main">
                <span className="status completed">
                  COMPLETED
                </span>

                <h3>
                  {a.doctorId?.userId?.name || 'CareFlow clinician'}
                </h3>

                <p>
                  {when(a.startAt)} · {a.doctorId?.speciality || 'Consultation'}
                </p>
              </div>

              <button
                className="btn btn-outline"
                onClick={e => {
                  e.stopPropagation();
                  setSelectedSummary(a);
                }}
              >
                View summary
                <ArrowRight size={16} />
              </button>
            </article>
          ))}
        </section>
      )}

      {selectedSummary && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 35, 35, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000
          }}
          onClick={() => setSelectedSummary(null)}
        >
          <div
            className="panel"
            style={{
              width: 'min(700px, 100%)',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="btn btn-ghost"
              style={{
                position: 'absolute',
                right: '16px',
                top: '16px'
              }}
              onClick={() => setSelectedSummary(null)}
            >
              Close
            </button>

            <span className="eyebrow">
              <Activity size={16} />
              Visit summary
            </span>

            <h2>
              Your visit with{' '}
              {selectedSummary.doctorId?.userId?.name || 'your clinician'}
            </h2>

            <p>
              {when(selectedSummary.startAt)}
            </p>

            <div style={{ marginTop: '24px' }}>
              <h3>Summary</h3>

              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {typeof selectedSummary.postVisitSummary.patientSummary === 'string'
                  ? selectedSummary.postVisitSummary.patientSummary
                  : JSON.stringify(
                      selectedSummary.postVisitSummary.patientSummary,
                      null,
                      2
                    )}
              </p>
            </div>

            {selectedSummary.prescription?.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3>Prescription</h3>

                {selectedSummary.prescription.map((medicine, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #e5eeee'
                    }}
                  >
                    <strong>
                      {medicine.name}
                    </strong>

                    {medicine.dose && (
                      <span> · {medicine.dose}</span>
                    )}

                    {medicine.frequency && (
                      <p style={{ margin: '4px 0 0' }}>
                        {medicine.frequency}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedSummary.postVisitSummary?.followUpSteps && (
              <div style={{ marginTop: '24px' }}>
                <h3>Follow-up</h3>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                  {selectedSummary.postVisitSummary.followUpSteps}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Shell>
  );
}
function Doctors() { const [doctors, setDoctors] = useState([]); const [query, setQuery] = useState(''); useEffect(() => { api(`/doctors?speciality=${encodeURIComponent(query)}`).then(d => setDoctors(d.doctors)).catch(() => {}); }, [query]); return <Shell><Page title="Find the right care." subtitle="Browse clinicians by speciality and availability."/><div className="search-box"><Search size={20}/><input placeholder="Search by speciality, e.g. cardiology" value={query} onChange={e => setQuery(e.target.value)}/></div><div className="doctor-grid">{doctors.map(d => <article className="doctor-card" key={d._id}><div className="doctor-avatar">{d.userId?.name?.split(' ').map(n => n[0]).slice(-2).join('')}</div><span className="status booked">{d.speciality}</span><h2>{d.userId?.name}</h2><p>{d.bio || 'A CareFlow clinician.'}</p><div className="doctor-meta"><Clock3 size={16}/>{d.slotDurationMinutes} minute visits</div><Link className="btn btn-outline full" to={`/patient/book/${d._id}`}>See availability<ArrowRight size={16}/></Link></article>)}</div></Shell>; }
function Booking() { const { id } = useParams(); const [doctor, setDoctor] = useState(null); const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10)); const [slots, setSlots] = useState([]); const [slot, setSlot] = useState(null); const [symptoms, setSymptoms] = useState(''); const [step, setStep] = useState(1); const [error, setError] = useState(''); const nav = useNavigate(); useEffect(() => { api('/doctors').then(d => setDoctor(d.doctors.find(x => x._id === id))); }, [id]); useEffect(() => { api(`/doctors/${id}/slots?date=${date}`).then(d => setSlots(d.slots)).catch(() => setSlots([])); }, [id, date]); async function book() { try { await api('/appointments', { method: 'POST', body: JSON.stringify({ doctorId: id, startAt: slot.startAt, symptoms }) }); nav('/patient/appointments'); } catch (e) { setError(e.message); } } return <Shell><Page title="Book an appointment" subtitle={doctor ? `With ${doctor.userId?.name} · ${doctor.speciality}` : 'Preparing booking'}/><div className="booking-wrap"><div className="stepper"><span className={step >= 1 ? 'active' : ''}>1. Time</span><span className={step >= 2 ? 'active' : ''}>2. Symptoms</span><span className={step >= 3 ? 'active' : ''}>3. Confirm</span></div>{error && <div className="alert">{error}</div>}{step === 1 && <section className="panel"><label className="date-label">Choose a date<input type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={e => { setDate(e.target.value); setSlot(null); }}/></label><h2>Available times</h2><div className="slot-grid">{slots.map(s => <Button key={s.startAt} disabled={!s.available} className={slot?.startAt === s.startAt ? 'slot selected' : 'slot'} onClick={() => setSlot(s)}>{new Date(s.startAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Button>)}</div><Button disabled={!slot} onClick={() => setStep(2)}>Continue<ArrowRight size={17}/></Button></section>}{step === 2 && <section className="panel form-panel"><span className="eyebrow"><Activity size={16}/>Help your doctor prepare</span><h2>What brings you in today?</h2><p>Share what you’re experiencing. This supports your visit, not a diagnosis.</p><textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="For example: I’ve had a persistent headache for two days..."/><div className="button-row"><Button className="btn btn-ghost" onClick={() => setStep(1)}>Back</Button><Button disabled={symptoms.trim().length < 8} onClick={() => setStep(3)}>Review booking<ArrowRight size={17}/></Button></div></section>}{step === 3 && <section className="panel confirmation"><CheckCircle2/><span className="eyebrow">Almost there</span><h2>Your appointment request is ready.</h2><div className="review-line"><span>When</span><b>{slot && when(slot.startAt)}</b></div><div className="review-line"><span>With</span><b>{doctor?.userId?.name}</b></div><div className="review-line"><span>Your symptoms</span><b>{symptoms}</b></div><p className="disclaimer">CareFlow AI helps your doctor prepare. It is not medical diagnosis or emergency care.</p><div className="button-row"><Button className="btn btn-ghost" onClick={() => setStep(2)}>Back</Button><Button onClick={book}>Confirm appointment<CheckCircle2 size={17}/></Button></div></section>}</div></Shell>; }
function Appointments({ doctor = false }) { const [items, setItems] = useState([]); const load = () => api('/appointments/me').then(d => setItems(d.appointments)); useEffect(() => { load(); }, []); async function cancel(id) { if (confirm('Cancel this appointment?')) { await api(`/appointments/${id}/cancel`, { method: 'PATCH' }); load(); } } return <Shell><Page title={doctor ? 'Your schedule.' : 'Your appointments.'} subtitle={doctor ? 'Review patients and visit details.' : 'Everything scheduled, completed, and ready to revisit.'}/><section className="panel list-panel"><Head title={doctor ? 'Patient appointments' : 'Appointment history'}/>{items.length ? items.map(a => <Card key={a._id} a={a} action={<div className="card-actions">{doctor && a.status === 'BOOKED' && <Link className="btn btn-outline" to={`/doctor/visit/${a._id}`}>Open visit</Link>}{!doctor && a.status === 'BOOKED' && <Button className="btn btn-danger" onClick={() => cancel(a._id)}>Cancel</Button>}</div>}/>) : <Empty text="Nothing to show here yet."/>}</section></Shell>; }
function Doctor() { const [items, setItems] = useState([]); useEffect(() => { api('/appointments/me').then(d => setItems(d.appointments)); }, []); return <Shell><Page title="A calm day starts here." subtitle="Your schedule and patient context, organized for you." action={<Link className="btn btn-outline" to="/doctor/appointments">View schedule<ArrowRight size={16}/></Link>}/><div className="stat-grid"><Stat label="Scheduled visits" value={items.filter(a => a.status === 'BOOKED').length} icon={<CalendarDays/>}/><Stat label="AI summaries ready" value={items.filter(a => a.preVisitSummary?.status).length} icon={<Activity/>} tone="blue"/><Stat label="Completed visits" value={items.filter(a => a.status === 'COMPLETED').length} icon={<CheckCircle2/>} tone="sand"/></div><section className="panel"><Head title="Next patients"/>{items.filter(a => a.status === 'BOOKED').slice(0, 4).map(a => <Card key={a._id} a={a} action={<Link className="btn btn-outline" to={`/doctor/visit/${a._id}`}>Prepare</Link>}/>)}</section></Shell>; }
function Visit() { const { id } = useParams(); const [a, setA] = useState(null); const [notes, setNotes] = useState(''); const [rx, setRx] = useState({ name: '', dose: '', frequency: 'Once daily', times: ['09:00'] }); const [message, setMessage] = useState(''); useEffect(() => { api('/appointments/me').then(d => { const x = d.appointments.find(i => i._id === id); setA(x); setNotes(x?.doctorNotes || ''); }); }, [id]); async function save() { try { await api(`/appointments/${id}/clinical-notes`, { method: 'PATCH', body: JSON.stringify({ doctorNotes: notes, prescription: rx.name ? [rx] : [] }) }); setMessage('Visit completed and patient summary generated.'); } catch (e) { setMessage(e.message); } } if (!a) return <Shell><div className="loading">Loading visit...</div></Shell>; const s = a.preVisitSummary || {}; return <Shell><Page title={`Visit with ${a.patientId?.name || 'patient'}`} subtitle={`${when(a.startAt)} · ${a.patientId?.email || ''}`}/><div className="visit-grid"><section className="panel"><span className="eyebrow"><Activity size={16}/>Pre-visit AI brief</span><span className={`status ${s.urgency?.toLowerCase()}`}>{s.urgency || 'Pending'} urgency</span><h2>{s.chiefComplaint || 'Symptoms overview'}</h2><p>{a.symptoms}</p><h3>Suggested questions</h3><ul>{(s.suggestedQuestions || []).map(q => <li key={q}>{q}</li>)}</ul></section><section className="panel form-panel"><span className="eyebrow"><Stethoscope size={16}/>Clinical note</span><label>Visit notes<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Clinical notes for this visit..."/></label><h3>Prescription</h3><div className="rx-grid"><input placeholder="Medicine name" value={rx.name} onChange={e => setRx({ ...rx, name: e.target.value })}/><input placeholder="Dose, e.g. 500mg" value={rx.dose} onChange={e => setRx({ ...rx, dose: e.target.value })}/><select value={rx.frequency} onChange={e => setRx({ ...rx, frequency: e.target.value })}><option>Once daily</option><option>Twice daily</option><option>Three times daily</option><option>As needed</option></select></div>{message && <div className="alert success">{message}</div>}<Button onClick={save}>Complete visit & generate summary<CheckCircle2 size={17}/></Button></section></div></Shell>; }
function Admin() { const [doctors, setDoctors] = useState([]); useEffect(() => { api('/admin/doctors').then(d => setDoctors(d.doctors)); }, []); return <Shell><Page title="Clinic operations, clearly seen." subtitle="Manage your care team and keep availability dependable."/><div className="stat-grid"><Stat label="Active doctors" value={doctors.length} icon={<Stethoscope/>}/><Stat label="Specialities" value={new Set(doctors.map(d => d.speciality)).size} icon={<HeartPulse/>} tone="blue"/><Stat label="Leave dates" value={doctors.reduce((n, d) => n + d.leaveDates.length, 0)} icon={<CalendarDays/>} tone="sand"/></div><section className="panel"><Head title="Care team" link="Manage doctors" to="/admin/doctors"/>{doctors.slice(0, 4).map(d => <Team key={d._id} d={d}/>)}</section></Shell>; } function Team({ d }) { return <article className="team-row"><div className="avatar">{d.userId?.name?.split(' ').map(n => n[0]).slice(-2).join('')}</div><div><h3>{d.userId?.name}</h3><p>{d.speciality} · {d.slotDurationMinutes} minute slots</p></div><span className="status booked">Active</span></article>; }
function AdminDoctors() { const [doctors, setDoctors] = useState([]); const [show, setShow] = useState(false); const [form, setForm] = useState({ name: '', email: '', password: '', speciality: '', bio: '', slotDurationMinutes: 30 }); const [message, setMessage] = useState(''); const load = () => api('/admin/doctors').then(d => setDoctors(d.doctors)); useEffect(() => { load(); }, []); async function add(e) { e.preventDefault(); try { await api('/admin/doctors', { method: 'POST', body: JSON.stringify({ ...form, workingHours: [1,2,3,4,5].map(day => ({ day, start: '09:00', end: '17:00' })) }) }); setShow(false); load(); } catch (x) { setMessage(x.message); } } return <Shell><Page title="Your care team." subtitle="Add clinicians and set availability patients can trust." action={<Button onClick={() => setShow(!show)}><Plus size={18}/>Add doctor</Button>}/>{show && <form className="panel add-doctor" onSubmit={add}><h2>Add a clinician</h2>{message && <div className="alert">{message}</div>}<div className="form-grid">{[['name','Full name'],['email','Email'],['password','Temporary password'],['speciality','Speciality'],['bio','Short bio']].map(([key,label]) => <Field key={key} label={label} type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'} value={form[key]} onChange={v => setForm({ ...form, [key]: v })}/>)}</div><Button>Save clinician</Button></form>}<section className="panel list-panel">{doctors.map(d => <Team key={d._id} d={d}/>)}</section></Shell>; }
function Leaves() { const [doctors, setDoctors] = useState([]); const [doctorId, setDoctorId] = useState(''); const [date, setDate] = useState(''); const [message, setMessage] = useState(''); useEffect(() => { api('/admin/doctors').then(d => { setDoctors(d.doctors); setDoctorId(d.doctors[0]?._id || ''); }); }, []); async function submit(e) { e.preventDefault(); try { const d = await api(`/admin/doctors/${doctorId}/leaves`, { method: 'POST', body: JSON.stringify({ date }) }); setMessage(`Leave saved. ${d.affectedAppointments} affected appointment(s) were cancelled and queued for notification.`); } catch (x) { setMessage(x.message); } } return <Shell><Page title="Plan doctor leave." subtitle="We’ll automatically protect patients from scheduling conflicts."/><form className="panel leave-form" onSubmit={submit}><span className="eyebrow"><CalendarDays size={16}/>Conflict-aware leave</span><h2>Mark a doctor unavailable</h2><p>Existing appointments on this date will be cancelled and patients notified.</p><label>Doctor<select value={doctorId} onChange={e => setDoctorId(e.target.value)}>{doctors.map(d => <option key={d._id} value={d._id}>{d.userId?.name} · {d.speciality}</option>)}</select></label><label>Date<input required type="date" value={date} onChange={e => setDate(e.target.value)}/></label>{message && <div className="alert success">{message}</div>}<Button>Confirm leave date</Button></form></Shell>; }
function App() { return <Provider><Routes><Route path="/" element={<Landing/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Login register/>}/><Route path="/patient" element={<Guard roles={['PATIENT']}><Patient/></Guard>}/><Route path="/patient/doctors" element={<Guard roles={['PATIENT']}><Doctors/></Guard>}/><Route path="/patient/book/:id" element={<Guard roles={['PATIENT']}><Booking/></Guard>}/><Route path="/patient/appointments" element={<Guard roles={['PATIENT']}><Appointments/></Guard>}/><Route path="/doctor" element={<Guard roles={['DOCTOR']}><Doctor/></Guard>}/><Route path="/doctor/appointments" element={<Guard roles={['DOCTOR']}><Appointments doctor/></Guard>}/><Route path="/doctor/visit/:id" element={<Guard roles={['DOCTOR']}><Visit/></Guard>}/><Route path="/admin" element={<Guard roles={['ADMIN']}><Admin/></Guard>}/><Route path="/admin/doctors" element={<Guard roles={['ADMIN']}><AdminDoctors/></Guard>}/><Route path="/admin/leaves" element={<Guard roles={['ADMIN']}><Leaves/></Guard>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></Provider>; }
createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);
