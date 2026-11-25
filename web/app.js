/* ============================================================
   wellnest. — Smart Clinic Management System Frontend
   Implements all 12 Figma screens backed by SmartClinicManagement.java
   ============================================================ */

const TIME_SLOTS = [
  '09:00 AM', '09:30 AM',
  '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM',
  '02:00 PM', '02:30 PM'
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const state = {
  // Auth session
  session: null, // { role: 'admin'|'doctor'|'receptionist', name, subtitle, doctorId? }
  loginTab: 'admin',
  loginError: '',
  loginLocked: false,

  // Active screen: 'login' | 'stats' | 'doctors' | 'patient-search' | 'patient-register'
  //   | 'appt-book' | 'appt-cancel' | 'doctor-appts' | 'medical-record'
  //   | 'prescription' | 'bill-generate' | 'bill-view'
  screen: 'login',

  // Backend data
  data: {
    doctors: [],
    patients: [],
    appointments: [],
    cancelledAppointments: [],
    medicalRecords: [],
    prescriptions: [],
    bills: [],
    stats: {
      totalDoctors: 0, totalPatients: 0, totalAppointments: 0,
      cancelledAppointments: 0, totalMedicalRecords: 0,
      totalPrescriptions: 0, totalBills: 0, paidBills: 0,
      totalRevenue: 0, paidRevenue: 0
    }
  },

  // Per-screen UI state
  doctorSearch: '',
  doctorSpecialtyFilter: 'ALL',
  patientSearchQuery: '',
  selectedPatientId: null,
  regErrors: {},
  regDraft: { name: '', email: '', phone: '', age: '', gender: 'Male', address: '', consent: true },

  // Booking state
  calYear: 2026,
  calMonth: 10, // 0-indexed -> November
  calDay: 25,
  bookingPatientId: null,
  bookingDoctorId: null,
  bookingTime: '09:00 AM',
  bookingReason: '',
  bookingConflictSlot: null,

  // Cancellation state
  cancelTab: 'upcoming',
  selectedCancelApptId: null,

  // Doctor appointments state
  activeDoctorId: null,
  selectedDocApptId: null,

  // Medical record state
  recordPatientId: null,
  recordDoctorId: null,

  // Prescription state
  rxPatientId: null,
  rxDoctorId: null,
  rxDraft: {
    medicine: '',
    dosage: '',
    duration: '',
    instructions: '',
    followUp: '',
    reviewed: false
  },

  // Billing state
  billPatientId: null,
  billFees: { consultation: '', medicine: '', test: '', status: 'unpaid', note: '' },
  billFilter: 'all',
  selectedBillId: null,
  billRefreshError: false
};

// ============================================================
// API HELPERS
// ============================================================

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch (_) {}
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json;
}

async function refreshState() {
  try {
    state.data = await api('/api/state');
    state.billRefreshError = false;
    syncDefaultSelections();
  } catch (err) {
    state.billRefreshError = true;
    showToast(err.message || 'Unable to reach Smart Clinic backend', true);
  }
}

function syncDefaultSelections() {
  const { doctors, patients, appointments, bills } = state.data;
  if (!state.selectedPatientId && patients.length) state.selectedPatientId = patients[0].id;
  if (!state.bookingPatientId && patients.length) state.bookingPatientId = patients[0].id;
  if (!state.bookingDoctorId && doctors.length) state.bookingDoctorId = doctors[0].id;
  if (!state.activeDoctorId && doctors.length) state.activeDoctorId = doctors[0].id;
  if (!state.recordPatientId && patients.length) state.recordPatientId = patients[0].id;
  if (!state.recordDoctorId && doctors.length) state.recordDoctorId = doctors[0].id;
  if (!state.rxPatientId && patients.length) state.rxPatientId = patients[0].id;
  if (!state.rxDoctorId && doctors.length) state.rxDoctorId = doctors[0].id;
  if (!state.billPatientId && patients.length) state.billPatientId = patients[0].id;
  if (appointments.length && !appointments.some(a => a.id === state.selectedCancelApptId)) {
    state.selectedCancelApptId = appointments[0].id;
  }
  if (bills.length && !bills.some(b => b.id === state.selectedBillId)) {
    state.selectedBillId = bills[bills.length - 1].id;
  }
}

function getPatient(id) {
  return state.data.patients.find(p => p.id === Number(id)) || null;
}

function getDoctor(id) {
  return state.data.doctors.find(d => d.id === Number(id)) || null;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function selectedBookingDateStr() {
  return `${pad2(state.calDay)}-${pad2(state.calMonth + 1)}-${state.calYear}`;
}

function formatPrettyDate(ddmmyyyy) {
  if (!ddmmyyyy || !ddmmyyyy.includes('-')) return ddmmyyyy || '';
  const [d, m, y] = ddmmyyyy.split('-').map(Number);
  if (!d || !m || !y) return ddmmyyyy;
  return `${pad2(d)} ${SHORT_MONTHS[m - 1] || ''} ${y}`;
}

function formatRs(val) {
  const num = Number(val) || 0;
  return 'Rs. ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(msg, isError = false) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (isError ? ' error' : '');
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.remove(); }, 3400);
}

function navigate(screen, opts = {}) {
  state.screen = screen;
  if (opts.patientId) {
    state.selectedPatientId = opts.patientId;
    state.bookingPatientId = opts.patientId;
    state.recordPatientId = opts.patientId;
    state.rxPatientId = opts.patientId;
    state.billPatientId = opts.patientId;
  }
  if (opts.doctorId) {
    state.activeDoctorId = opts.doctorId;
    state.recordDoctorId = opts.doctorId;
    state.rxDoctorId = opts.doctorId;
  }
  render();
}

// ============================================================
// MAIN RENDERER
// ============================================================

function render() {
  const app = document.getElementById('app');
  if (state.screen === 'login' || !state.session) {
    app.innerHTML = renderLoginScreen();
    bindLoginEvents();
    return;
  }
  app.innerHTML = renderWorkspaceShell();
  bindWorkspaceEvents();
}

// ============================================================
// SCREEN 01 · ADMIN / DOCTOR / RECEPTIONIST LOGIN
// ============================================================

function renderLoginScreen() {
  const tab = state.loginTab;
  let formHtml = '';
  if (tab === 'admin') {
    formHtml = `
      <div class="login-welcome">
        <h2>Welcome back</h2>
        <p>Sign in to manage your clinic.</p>
      </div>
      ${state.loginError ? `<div class="banner-error"><strong>Sign in failed</strong><span>${esc(state.loginError)}</span></div>` : ''}
      <form id="login-form" class="login-form-fields">
        <div class="field-group">
          <label for="login-user">Username or work email</label>
          <input id="login-user" class="field-input" type="text" value="admin" placeholder="admin" required />
        </div>
        <div class="field-group">
          <label for="login-pass">Password</label>
          <input id="login-pass" class="field-input" type="password" value="admin123" placeholder="••••••••" required />
        </div>
        <div class="login-prefs">
          <label class="checkbox-label"><input type="checkbox" checked /> Remember this device</label>
          <button type="button" class="link-btn" id="forgot-pass-btn">Forgot password?</button>
        </div>
        <button type="submit" class="btn-primary btn-full" ${state.loginLocked ? 'disabled' : ''}>Sign in securely →</button>
        <div class="login-quick-hint">
          Admin credentials: <span>admin</span> / <span>admin123</span> (max 3 attempts)
        </div>
      </form>
    `;
  } else if (tab === 'doctor') {
    const docOptions = state.data.doctors.map(d => `ID ${d.id} (Dr. ${esc(d.name)})`).join(' · ');
    formHtml = `
      <div class="login-welcome">
        <h2>Doctor portal</h2>
        <p>Enter your Doctor ID to open your schedule and clinical workspace.</p>
      </div>
      ${state.loginError ? `<div class="banner-error"><strong>Doctor not found</strong><span>${esc(state.loginError)}</span></div>` : ''}
      <form id="login-form" class="login-form-fields">
        <div class="field-group">
          <label for="login-doc-id">Doctor ID</label>
          <input id="login-doc-id" class="field-input" type="number" min="1" value="${state.data.doctors[0]?.id || ''}" placeholder="Enter your Doctor ID (e.g. 101)" required />
        </div>
        <button type="submit" class="btn-primary btn-full">Enter Doctor Portal →</button>
        <div class="login-quick-hint">
          ${docOptions ? `Registered Doctors: <span>${docOptions}</span>` : 'No doctors registered yet. Sign in as <span>Administrator</span> first to add a doctor.'}
        </div>
      </form>
    `;
  } else {
    formHtml = `
      <div class="login-welcome">
        <h2>Receptionist desk</h2>
        <p>Register patients, manage appointments, and generate bills.</p>
      </div>
      <form id="login-form" class="login-form-fields">
        <div class="login-quick-hint">
          Direct access to <span>Patient Registration</span>, <span>Patient Search</span>, <span>Appointment Booking &amp; Cancellation</span>, and <span>Bill Generation</span>.
        </div>
        <button type="submit" class="btn-primary btn-full">Open Receptionist Workspace →</button>
      </form>
    `;
  }

  return `
    <div class="login-shell">
      <aside class="login-brand-panel">
        <div>
          <div class="brand-wordmark">wellnest.</div>
          <div class="brand-eyebrow">SMART CLINIC MANAGEMENT</div>
        </div>
        <div class="care-statement">
          <h1>Less admin.<br/>More human care.</h1>
          <p>One connected workspace for your patients,<br/>your team, and everything in between.</p>
        </div>
        <div class="care-pathway">
          <div class="pathway-step"><span class="pathway-num">01</span><span class="pathway-label">Welcome</span></div>
          <div class="pathway-step"><span class="pathway-num">02</span><span class="pathway-label">Care</span></div>
          <div class="pathway-step"><span class="pathway-num">03</span><span class="pathway-label">Follow through</span></div>
        </div>
        <div class="practice-promise">
          <h3>Built around your practice.</h3>
          <p>From the first appointment to the final invoice.</p>
        </div>
        <div class="brand-footer">SMART CLINIC MANAGEMENT &nbsp;&nbsp;/&nbsp;&nbsp; STAFF WORKSPACE</div>
      </aside>
      <main class="login-form-panel">
        <div class="login-form-inner">
          <div class="role-tabs">
            <button type="button" class="role-tab ${tab === 'admin' ? 'active' : ''}" data-role-tab="admin">Administrator</button>
            <button type="button" class="role-tab ${tab === 'doctor' ? 'active' : ''}" data-role-tab="doctor">Doctor</button>
            <button type="button" class="role-tab ${tab === 'receptionist' ? 'active' : ''}" data-role-tab="receptionist">Receptionist</button>
          </div>
          ${formHtml}
          <div class="security-note">
            <strong>Your clinic. Safely connected.</strong>
            <p>Access is restricted to authorized clinic staff.<br/>Never share your password or patient information.</p>
          </div>
          <p style="font-size:12px;color:var(--muted);">Having trouble signing in? &nbsp;<span style="color:var(--primary);font-weight:500;">Contact your administrator</span></p>
        </div>
      </main>
    </div>
  `;
}

function bindLoginEvents() {
  document.querySelectorAll('[data-role-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.loginTab = btn.dataset.roleTab;
      state.loginError = '';
      render();
    });
  });

  const forgotBtn = document.getElementById('forgot-pass-btn');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      showToast('Default Admin credentials: admin / admin123');
    });
  }

  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      state.loginError = '';
      if (state.loginTab === 'admin') {
        const username = document.getElementById('login-user').value.trim();
        const password = document.getElementById('login-pass').value;
        try {
          const res = await api('/api/login/admin', {
            method: 'POST',
            body: JSON.stringify({ username, password })
          });
          state.session = { role: 'admin', name: res.name, subtitle: res.subtitle };
          await refreshState();
          showToast('Login successful! Welcome, Administrator.');
          navigate('stats');
        } catch (err) {
          state.loginError = err.message;
          if (err.message.toLowerCase().includes('locked')) state.loginLocked = true;
          render();
        }
      } else if (state.loginTab === 'doctor') {
        const doctorId = document.getElementById('login-doc-id').value.trim();
        try {
          const res = await api('/api/login/doctor', {
            method: 'POST',
            body: JSON.stringify({ doctorId })
          });
          const d = res.doctor;
          state.session = {
            role: 'doctor',
            name: 'Dr. ' + d.name,
            subtitle: `${d.specialization} · ID ${d.id}`,
            doctorId: d.id
          };
          state.activeDoctorId = d.id;
          state.recordDoctorId = d.id;
          state.rxDoctorId = d.id;
          await refreshState();
          showToast(`Welcome Dr. ${d.name}!`);
          navigate('doctor-appts');
        } catch (err) {
          state.loginError = err.message;
          render();
        }
      } else {
        state.session = { role: 'receptionist', name: 'Front Desk', subtitle: 'Receptionist portal' };
        await refreshState();
        showToast('Entered Receptionist Workspace.');
        navigate('patient-search');
      }
    });
  }
}

// ============================================================
// WORKSPACE SHELL & NAVIGATION
// ============================================================

const NAV_ITEMS = [
  { num: '01', label: 'Overview', screen: 'stats', match: ['stats'] },
  { num: '02', label: 'Patients', screen: 'patient-search', match: ['patient-search', 'patient-register'] },
  { num: '03', label: 'Appointments', screen: 'appt-book', match: ['appt-book', 'appt-cancel', 'doctor-appts'] },
  { num: '04', label: 'Doctors', screen: 'doctors', match: ['doctors'] },
  { num: '05', label: 'Medical records', screen: 'medical-record', match: ['medical-record'] },
  { num: '06', label: 'Prescriptions', screen: 'prescription', match: ['prescription'] },
  { num: '07', label: 'Billing', screen: 'bill-view', match: ['bill-generate', 'bill-view'] }
];

const SCREEN_META = {
  'stats':            { crumb: 'System statistics', title: 'System statistics', sub: 'A clear view of your clinic, today.' },
  'doctors':          { crumb: 'Doctor management', title: 'Doctor management', sub: 'Manage your care team and their availability.' },
  'patient-search':   { crumb: 'Patient search', title: 'Patient search', sub: 'Find a patient and pick up where you left off.' },
  'patient-register': { crumb: 'Patient registration', title: 'Patient registration', sub: 'Create a complete, accurate patient profile.' },
  'appt-book':        { crumb: 'Appointment booking', title: 'Appointment booking', sub: 'Find the right care at the right time.' },
  'appt-cancel':      { crumb: 'Appointment cancellation', title: 'Appointment cancellation', sub: 'Review upcoming visits and manage changes.' },
  'doctor-appts':     { crumb: 'Doctor appointments', title: 'Doctor appointments', sub: 'Your schedule, patients, and next steps.' },
  'medical-record':   { crumb: 'Medical record creation', title: 'Medical record creation', sub: 'Document the visit with confidence.' },
  'prescription':     { crumb: 'Prescription creation', title: 'Prescription creation', sub: 'Build a clear medication plan for your patient.' },
  'bill-generate':    { crumb: 'Bill generation', title: 'Bill generation', sub: 'Review services, calculate charges, and issue a bill.' },
  'bill-view':        { crumb: 'Bill viewing', title: 'Bill viewing', sub: 'Track payments and view patient invoices.' }
};

function renderSubTabs() {
  const s = state.screen;
  if (s === 'patient-search' || s === 'patient-register') {
    return `
      <div class="sub-tabs">
        <button class="sub-tab ${s === 'patient-search' ? 'active' : ''}" data-nav="patient-search">Search patients</button>
        <button class="sub-tab ${s === 'patient-register' ? 'active' : ''}" data-nav="patient-register">Register patient</button>
      </div>
    `;
  }
  if (s === 'appt-book' || s === 'appt-cancel' || s === 'doctor-appts') {
    return `
      <div class="sub-tabs">
        <button class="sub-tab ${s === 'appt-book' ? 'active' : ''}" data-nav="appt-book">Book appointment</button>
        <button class="sub-tab ${s === 'appt-cancel' ? 'active' : ''}" data-nav="appt-cancel">Manage &amp; cancel</button>
        <button class="sub-tab ${s === 'doctor-appts' ? 'active' : ''}" data-nav="doctor-appts">Doctor schedule</button>
      </div>
    `;
  }
  if (s === 'bill-generate' || s === 'bill-view') {
    return `
      <div class="sub-tabs">
        <button class="sub-tab ${s === 'bill-view' ? 'active' : ''}" data-nav="bill-view">View bills</button>
        <button class="sub-tab ${s === 'bill-generate' ? 'active' : ''}" data-nav="bill-generate">Generate bill</button>
      </div>
    `;
  }
  return '';
}

function renderWorkspaceShell() {
  const meta = SCREEN_META[state.screen] || SCREEN_META.stats;
  const portalLabel = state.session.role === 'doctor'
    ? 'Doctor portal'
    : state.session.role === 'receptionist'
      ? 'Receptionist portal'
      : 'Admin portal';

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  let screenBody = '';
  switch (state.screen) {
    case 'stats': screenBody = renderStatsScreen(); break;
    case 'doctors': screenBody = renderDoctorsScreen(); break;
    case 'patient-search': screenBody = renderPatientSearchScreen(); break;
    case 'patient-register': screenBody = renderPatientRegisterScreen(); break;
    case 'appt-book': screenBody = renderAppointmentBookingScreen(); break;
    case 'appt-cancel': screenBody = renderAppointmentCancelScreen(); break;
    case 'doctor-appts': screenBody = renderDoctorAppointmentsScreen(); break;
    case 'medical-record': screenBody = renderMedicalRecordScreen(); break;
    case 'prescription': screenBody = renderPrescriptionScreen(); break;
    case 'bill-generate': screenBody = renderBillGenerateScreen(); break;
    case 'bill-view': screenBody = renderBillViewScreen(); break;
    default: screenBody = renderStatsScreen();
  }

  return `
    <div class="workspace-shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-brand-title">wellnest.</div>
          <div class="sidebar-brand-sub">CLINIC WORKSPACE</div>
        </div>
        <div class="clinic-selector">
          <div class="clinic-selector-name">Smart Clinic</div>
          <div class="clinic-selector-loc">Main clinic · SCD Project</div>
        </div>
        <nav class="sidebar-nav">
          ${NAV_ITEMS.map(item => `
            <button class="nav-item ${item.match.includes(state.screen) ? 'active' : ''}" data-nav="${item.screen}">
              <span class="nav-num">${item.num}</span>
              <span class="nav-label">${item.label}</span>
            </button>
          `).join('')}
        </nav>
        <div class="sidebar-spacer"></div>
        <div class="sidebar-support">
          <div class="sidebar-support-title">A little help, anytime.</div>
          <button class="sidebar-support-link" id="help-center-btn">System overview &amp; guide →</button>
        </div>
        <div class="sidebar-account">
          <div class="sidebar-account-name">${esc(state.session.name)}</div>
          <div class="sidebar-account-role">${esc(state.session.subtitle)}</div>
          <button class="sidebar-logout" id="logout-btn">← Sign out / Switch role</button>
        </div>
      </aside>

      <div class="main-workspace">
        <header class="top-bar">
          <div>Workspace &nbsp;&nbsp;/&nbsp;&nbsp; ${esc(meta.crumb)}</div>
          <div class="top-bar-right">
            <span>${esc(portalLabel)} &nbsp;&nbsp;·&nbsp;&nbsp; ${esc(todayStr)}</span>
          </div>
        </header>

        <main class="page-content">
          <div class="page-heading-row">
            <div class="page-heading">
              <h1>${esc(meta.title)}</h1>
              <p>${esc(meta.sub)}</p>
            </div>
            ${renderSubTabs()}
          </div>
          ${screenBody}
        </main>
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 02 · SYSTEM STATISTICS
// ============================================================

function renderStatsScreen() {
  const { stats, doctors, appointments } = state.data;
  const specialties = new Set(doctors.map(d => d.specialization)).size;
  const completedCount = appointments.filter(a => a.status === 'Completed').length;
  const waitingCount = appointments.filter(a => a.status !== 'Completed').length;
  const cancelledCount = stats.cancelledAppointments;
  const totalVol = Math.max(1, completedCount + waitingCount + cancelledCount);

  const dayCounts = [0, 0, appointments.length, 0, 0, 0, 0];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const maxBar = Math.max(...dayCounts, 1);

  return `
    <div class="controls-row">
      <span class="eyebrow-date">LIVE SYSTEM METRICS · ${stats.totalMedicalRecords} RECORDS · ${stats.totalPrescriptions} PRESCRIPTIONS</span>
      <div style="display:flex;gap:12px;">
        <button class="btn-secondary" data-nav="doctors">+ Add doctor</button>
        <button class="btn-secondary" data-nav="patient-register">+ Register patient</button>
        <button class="btn-primary" data-nav="appt-book">Book appointment</button>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">Total appointments</span>
        <span class="kpi-value">${stats.totalAppointments}</span>
        <span class="kpi-sub">${completedCount} completed · ${waitingCount} active</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Registered patients</span>
        <span class="kpi-value">${stats.totalPatients}</span>
        <span class="kpi-sub">${stats.totalMedicalRecords} medical records on file</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Doctors available</span>
        <span class="kpi-value">${stats.totalDoctors}</span>
        <span class="kpi-sub">Across ${specialties} ${specialties === 1 ? 'specialty' : 'specialties'}</span>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">Total revenue</span>
        <span class="kpi-value" style="font-size:26px;">${formatRs(stats.totalRevenue)}</span>
        <span class="kpi-sub">${stats.totalBills} generated bills (${stats.paidBills} paid)</span>
      </div>
    </div>

    <div class="charts-row">
      <div class="card chart-weekly">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <h3 style="font-size:16px;font-weight:600;color:var(--ink);">Appointments this week</h3>
            <p style="font-size:11px;color:var(--muted);margin-top:6px;">${stats.totalAppointments} scheduled visits · ${stats.totalPrescriptions} prescriptions issued</p>
          </div>
          <span style="font-size:11px;font-weight:500;color:var(--primary);">This week</span>
        </div>
        <div class="bar-chart">
          ${dayCounts.map((val, idx) => `
            <div class="bar-col">
              <span class="bar-val">${val}</span>
              <div class="bar-fill ${idx === 2 ? 'active' : ''}" style="height:${Math.round((val / maxBar) * 140)}px;"></div>
              <span class="bar-day">${dayNames[idx]}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="card chart-glance">
        <div>
          <h3 style="font-size:16px;font-weight:600;color:var(--ink);">Today at a glance</h3>
          <p style="font-size:11px;color:var(--muted);margin-top:6px;">${completedCount + waitingCount + cancelledCount} total appointment events</p>
        </div>
        <div class="progress-item">
          <div class="progress-head"><span>Completed</span><span style="color:var(--muted);">${completedCount}</span></div>
          <div class="progress-track"><div class="progress-bar" style="width:${Math.round((completedCount / totalVol) * 100)}%;"></div></div>
        </div>
        <div class="progress-item">
          <div class="progress-head"><span>Active / Waiting</span><span style="color:var(--muted);">${waitingCount}</span></div>
          <div class="progress-track"><div class="progress-bar warn" style="width:${Math.round((waitingCount / totalVol) * 100)}%;"></div></div>
        </div>
        <div class="progress-item">
          <div class="progress-head"><span>Cancelled</span><span style="color:var(--muted);">${cancelledCount}</span></div>
          <div class="progress-track"><div class="progress-bar muted" style="width:${Math.round((cancelledCount / totalVol) * 100)}%;"></div></div>
        </div>
      </div>
    </div>

    <div class="card" style="padding:18px 24px 12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <h3 style="font-size:16px;font-weight:600;color:var(--ink);">Upcoming appointments</h3>
        <button class="link-btn" data-nav="appt-cancel">View all appointments →</button>
      </div>
      ${appointments.length === 0 ? `<div class="empty-state">No appointments scheduled yet. Click "Book appointment" to schedule one.</div>` : `
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>DATE &amp; TIME</th>
              <th>PATIENT</th>
              <th>DOCTOR</th>
              <th>REASON</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${appointments.slice(0, 6).map(a => {
              const p = getPatient(a.patientId);
              const d = getDoctor(a.doctorId);
              return `
                <tr>
                  <td style="color:var(--muted);">#${a.id}</td>
                  <td>${esc(formatPrettyDate(a.date))} · ${esc(a.time)}</td>
                  <td style="font-weight:500;">${esc(p ? p.name : 'Patient #' + a.patientId)}</td>
                  <td>Dr. ${esc(d ? d.name : '#' + a.doctorId)}</td>
                  <td>${esc(a.reason)}</td>
                  <td style="color:var(--primary);font-weight:500;">${esc(a.status)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;
}

// ============================================================
// SCREEN 03 · DOCTOR MANAGEMENT
// ============================================================

function renderDoctorsScreen() {
  const { doctors, appointments } = state.data;
  const specialties = [...new Set(doctors.map(d => d.specialization))];
  const q = state.doctorSearch.trim().toLowerCase();

  const filtered = doctors.filter(d => {
    const matchSpec = state.doctorSpecialtyFilter === 'ALL' || d.specialization === state.doctorSpecialtyFilter;
    const matchQ = !q
      || String(d.id).includes(q)
      || d.name.toLowerCase().includes(q)
      || d.specialization.toLowerCase().includes(q)
      || d.qualification.toLowerCase().includes(q)
      || d.email.toLowerCase().includes(q);
    return matchSpec && matchQ;
  });

  return `
    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <h3 style="font-size:17px;font-weight:600;color:var(--ink);">Your care team</h3>
            <p style="font-size:12px;color:var(--muted);margin-top:6px;">${doctors.length} registered doctors · All active</p>
          </div>
          <button class="btn-secondary" id="export-doctors-btn">Export list</button>
        </div>

        <div style="display:flex;gap:12px;">
          <input id="doctor-search-input" class="field-input" style="height:42px;flex:1;" type="text"
                 value="${esc(state.doctorSearch)}" placeholder="Search by ID, name, or specialty" />
          <select id="doctor-spec-filter" class="field-select" style="height:42px;width:190px;">
            <option value="ALL">All specialties</option>
            ${specialties.map(sp => `<option value="${esc(sp)}" ${state.doctorSpecialtyFilter === sp ? 'selected' : ''}>${esc(sp)}</option>`).join('')}
          </select>
        </div>

        ${filtered.length === 0 ? `<div class="empty-state">No doctors match your search criteria.</div>` : `
          <table class="data-table">
            <thead>
              <tr>
                <th>DOCTOR</th>
                <th>CONTACT</th>
                <th>STATUS</th>
                <th>VISITS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(d => {
                const count = appointments.filter(a => a.doctorId === d.id).length;
                return `
                  <tr>
                    <td>
                      <div style="font-weight:500;font-size:13px;">Dr. ${esc(d.name)} <span style="color:var(--muted);font-size:11px;">#${d.id}</span></div>
                      <div style="font-size:11px;color:var(--muted);margin-top:3px;">${esc(d.specialization)} · ${esc(d.qualification)}</div>
                    </td>
                    <td>
                      <div style="font-size:12px;">${esc(d.email)}</div>
                      <div style="font-size:11px;color:var(--muted);margin-top:2px;">${esc(d.phone)}</div>
                    </td>
                    <td><span class="pill pill-green">Available</span></td>
                    <td style="color:var(--muted);">${count} ${count === 1 ? 'visit' : 'visits'}</td>
                    <td>
                      <div style="display:flex;gap:12px;">
                        <button class="link-btn" data-doc-schedule="${d.id}">Schedule</button>
                        <button class="link-btn" style="color:var(--danger);" data-delete-doctor="${d.id}">Delete</button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}

        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;">
          <span style="font-size:11px;color:var(--muted);">Showing ${filtered.length} of ${doctors.length} doctors</span>
        </div>
      </div>

      <div class="card split-right" style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:19px;font-weight:600;color:var(--ink);">Add doctor</h3>
          <span style="font-size:10px;font-weight:600;color:var(--primary);letter-spacing:0.6px;">NEW</span>
        </div>
        <p style="font-size:12px;color:var(--muted);margin-top:-8px;">Add a new doctor to your clinic care team.</p>

        <form id="add-doctor-form" style="display:flex;flex-direction:column;gap:14px;">
          <div class="field-group">
            <label for="doc-name">Full name *</label>
            <input id="doc-name" class="field-input" type="text" placeholder="e.g. Dr. Bilal Hassan" required />
          </div>
          <div class="field-group">
            <label for="doc-email">Work email *</label>
            <input id="doc-email" class="field-input" type="email" placeholder="doctor@clinic.com" required />
          </div>
          <div class="field-group">
            <label for="doc-phone">Phone number *</label>
            <input id="doc-phone" class="field-input" type="text" placeholder="03001234567" required />
          </div>
          <div class="form-row-2">
            <div class="field-group">
              <label for="doc-spec">Specialization *</label>
              <input id="doc-spec" class="field-input" type="text" placeholder="e.g. Neurologist" required />
            </div>
            <div class="field-group">
              <label for="doc-qual">Qualification *</label>
              <input id="doc-qual" class="field-input" type="text" placeholder="e.g. MBBS, FCPS" required />
            </div>
          </div>
          <p style="font-size:11px;color:var(--muted);">A unique Doctor ID will be automatically assigned upon creation.</p>
          <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:4px;">
            <button type="reset" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary">Add doctor</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 04 · PATIENT SEARCH
// ============================================================

function renderPatientSearchScreen() {
  const { patients, appointments, medicalRecords } = state.data;
  const q = state.patientSearchQuery.trim().toLowerCase();

  const filtered = patients.filter(p => {
    if (!q) return true;
    return String(p.id).includes(q)
      || p.name.toLowerCase().includes(q)
      || p.phone.toLowerCase().includes(q)
      || p.email.toLowerCase().includes(q)
      || p.address.toLowerCase().includes(q);
  });

  let selected = filtered.find(p => p.id === state.selectedPatientId) || filtered[0] || null;
  if (selected) state.selectedPatientId = selected.id;

  const nextAppt = selected
    ? appointments.find(a => a.patientId === selected.id)
    : null;
  const recCount = selected
    ? medicalRecords.filter(r => r.patientId === selected.id).length
    : 0;

  return `
    <div style="display:flex;gap:14px;align-items:center;width:100%;">
      <div style="flex:1;position:relative;display:flex;align-items:center;">
        <input id="patient-search-input" class="field-input" style="height:48px;border-color:var(--border-focus);padding-right:70px;font-size:14px;"
               type="text" value="${esc(state.patientSearchQuery)}" placeholder="Search by patient name, ID (e.g. 1001), phone, or city..." />
        ${state.patientSearchQuery ? `<button id="clear-patient-search" class="link-btn" style="position:absolute;right:16px;">Clear</button>` : ''}
      </div>
      <button class="btn-secondary" id="show-all-patients-btn">All patients (${patients.length})</button>
      <button class="btn-primary" data-nav="patient-register">+ Register patient</button>
    </div>

    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:17px;font-weight:600;color:var(--ink);">Search results</h3>
          <span style="font-size:12px;color:var(--muted);">${filtered.length} ${filtered.length === 1 ? 'patient' : 'patients'} found</span>
        </div>
        <p style="font-size:12px;color:var(--muted);margin-top:-6px;">
          ${q ? `Matching “${esc(state.patientSearchQuery)}” · ` : ''}Search by name, patient ID, phone, or email
        </p>

        ${filtered.length === 0 ? `<div class="empty-state">No patients found matching "${esc(state.patientSearchQuery)}".</div>` : `
          <table class="data-table">
            <thead>
              <tr>
                <th>PATIENT ID</th>
                <th>PATIENT</th>
                <th>AGE / GENDER</th>
                <th>PHONE</th>
                <th>ADDRESS</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(p => `
                <tr class="selectable ${selected && selected.id === p.id ? 'selected' : ''}" data-select-patient="${p.id}">
                  <td style="color:var(--muted);">PT-${p.id}</td>
                  <td style="font-weight:500;">${esc(p.name)}</td>
                  <td>${p.age} yrs · ${esc(p.gender)}</td>
                  <td>${esc(p.phone)}</td>
                  <td>${esc(p.address)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
        <span style="font-size:11px;color:var(--muted);">Showing ${filtered.length} of ${patients.length} patients</span>
      </div>

      <div class="card split-right" style="display:flex;flex-direction:column;gap:20px;">
        ${!selected ? `<div class="empty-state">Select a patient to view their profile summary.</div>` : `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;font-weight:500;color:var(--muted);letter-spacing:0.6px;">PATIENT SUMMARY</span>
            <span style="font-size:11px;font-weight:500;color:var(--primary);">Active</span>
          </div>
          <div>
            <h2 style="font-size:24px;font-weight:600;color:var(--ink);">${esc(selected.name)}</h2>
            <p style="font-size:12px;color:var(--muted);margin-top:6px;">PT-${selected.id} &nbsp;·&nbsp; ${recCount} medical ${recCount === 1 ? 'record' : 'records'}</p>
          </div>
          <div class="form-row-2">
            <div>
              <div style="font-size:10px;color:var(--muted);font-weight:500;">AGE</div>
              <div style="font-size:13px;font-weight:500;margin-top:6px;">${selected.age} years</div>
            </div>
            <div>
              <div style="font-size:10px;color:var(--muted);font-weight:500;">GENDER</div>
              <div style="font-size:13px;font-weight:500;margin-top:6px;">${esc(selected.gender)}</div>
            </div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);font-weight:500;">PHONE</div>
            <div style="font-size:13px;font-weight:500;margin-top:6px;">${esc(selected.phone)}</div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);font-weight:500;">EMAIL</div>
            <div style="font-size:13px;font-weight:500;margin-top:6px;">${esc(selected.email)}</div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);font-weight:500;">HOME ADDRESS</div>
            <div style="font-size:13px;font-weight:500;margin-top:6px;">${esc(selected.address)}</div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);font-weight:500;">NEXT APPOINTMENT</div>
            <div style="font-size:13px;font-weight:500;margin-top:6px;">
              ${nextAppt ? `${esc(formatPrettyDate(nextAppt.date))}, ${esc(nextAppt.time)} · ${esc(nextAppt.reason)}` : 'No upcoming appointment'}
            </div>
          </div>
          <div style="display:flex;gap:12px;margin-top:4px;">
            <button class="btn-secondary" style="flex:1;" id="view-patient-records-btn" data-pid="${selected.id}">View records</button>
            <button class="btn-primary" style="flex:1;" id="book-for-patient-btn" data-pid="${selected.id}">Book visit</button>
          </div>
        `}
      </div>
    </div>

    <div class="banner-info">
      <strong>Find the right patient, every time.</strong>
      <span>Confirm the Patient ID and contact details before opening a medical record or booking a visit.</span>
    </div>
  `;
}

// ============================================================
// SCREEN 05 · PATIENT REGISTRATION
// ============================================================

function renderPatientRegisterScreen() {
  const errKeys = Object.keys(state.regErrors);
  const d = state.regDraft;
  const e = state.regErrors;

  return `
    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:18px;font-weight:600;color:var(--ink);">Patient information</h3>
          <span style="font-size:11px;color:var(--muted);">* Required fields</span>
        </div>

        ${errKeys.length > 0 ? `
          <div class="banner-error">
            <strong>Please check ${errKeys.length} ${errKeys.length === 1 ? 'field' : 'fields'} before continuing.</strong>
            <span>Your entries are saved here. Correct the highlighted details below.</span>
          </div>
        ` : ''}

        <form id="register-patient-form" style="display:flex;flex-direction:column;gap:16px;" novalidate>
          <div class="field-group">
            <label for="reg-name">Full name *</label>
            <input id="reg-name" class="field-input ${e.name ? 'error' : ''}" type="text" value="${esc(d.name)}" placeholder="e.g. Bilal Ahmed" />
            ${e.name ? `<span class="field-error-text">${esc(e.name)}</span>` : ''}
          </div>

          <div class="form-row-2">
            <div class="field-group">
              <label for="reg-age">Age (1–130) *</label>
              <input id="reg-age" class="field-input ${e.age ? 'error' : ''}" type="number" min="1" max="130" value="${esc(d.age)}" placeholder="e.g. 28" />
              ${e.age ? `<span class="field-error-text">${esc(e.age)}</span>` : ''}
            </div>
            <div class="field-group">
              <label for="reg-gender">Gender *</label>
              <select id="reg-gender" class="field-select ${e.gender ? 'error' : ''}">
                <option value="Male" ${d.gender === 'Male' ? 'selected' : ''}>Male</option>
                <option value="Female" ${d.gender === 'Female' ? 'selected' : ''}>Female</option>
                <option value="Other" ${d.gender === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
          </div>

          <div class="form-row-2">
            <div class="field-group">
              <label for="reg-phone">Phone number *</label>
              <input id="reg-phone" class="field-input ${e.phone ? 'error' : ''}" type="text" value="${esc(d.phone)}" placeholder="e.g. 03001234567" />
              ${e.phone ? `<span class="field-error-text">${esc(e.phone)}</span>` : ''}
            </div>
            <div class="field-group">
              <label for="reg-email">Email address *</label>
              <input id="reg-email" class="field-input ${e.email ? 'error' : ''}" type="email" value="${esc(d.email)}" placeholder="patient@example.com" />
              ${e.email ? `<span class="field-error-text">${esc(e.email)}</span>` : ''}
            </div>
          </div>

          <div class="field-group">
            <label for="reg-address">Home address *</label>
            <input id="reg-address" class="field-input ${e.address ? 'error' : ''}" type="text" value="${esc(d.address)}" placeholder="Street, City" />
            ${e.address ? `<span class="field-error-text">${esc(e.address)}</span>` : ''}
          </div>

          <label class="checkbox-label" style="padding-top:4px;">
            <input id="reg-consent" type="checkbox" ${d.consent ? 'checked' : ''} />
            <span>Patient consent for registration and care has been recorded.</span>
          </label>

          <div style="display:flex;justify-content:flex-end;gap:14px;padding-top:6px;">
            <button type="button" class="btn-secondary" data-nav="patient-search">Cancel</button>
            <button type="submit" class="btn-primary">Register patient</button>
          </div>
        </form>
      </div>

      <div class="split-right" style="display:flex;flex-direction:column;gap:20px;">
        <div class="card" style="display:flex;flex-direction:column;gap:22px;">
          <h3 style="font-size:17px;font-weight:600;color:var(--ink);">A smooth first visit</h3>
          <div style="display:flex;gap:14px;">
            <span style="font-size:12px;font-weight:600;color:var(--primary);">01</span>
            <div>
              <div style="font-size:13px;font-weight:500;">Verify identity</div>
              <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px;">Confirm the patient’s full name, age, and gender.</p>
            </div>
          </div>
          <div style="display:flex;gap:14px;">
            <span style="font-size:12px;font-weight:600;color:var(--primary);">02</span>
            <div>
              <div style="font-size:13px;font-weight:500;">Add contact details</div>
              <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px;">Use a valid 10–15 digit phone number and unique email address.</p>
            </div>
          </div>
          <div style="display:flex;gap:14px;">
            <span style="font-size:12px;font-weight:600;color:var(--primary);">03</span>
            <div>
              <div style="font-size:13px;font-weight:500;">Create patient profile</div>
              <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px;">A unique Patient ID is automatically generated after registration.</p>
            </div>
          </div>
        </div>

        <div class="banner-info" style="padding:24px;">
          <strong>Patient privacy comes first</strong>
          <span style="line-height:1.6;">Only collect information needed for care. Access to patient details is restricted by staff role.</span>
        </div>

        <button class="link-btn" style="text-align:left;" data-nav="patient-search">Already registered? &nbsp;Search patients →</button>
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 06 · APPOINTMENT BOOKING
// ============================================================

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  // Monday=0 .. Sunday=6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, outside: false });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: nextDay++, outside: true });
  }
  return cells;
}

function renderAppointmentBookingScreen() {
  const { patients, doctors, appointments } = state.data;
  const selPatient = getPatient(state.bookingPatientId);
  const selDoctor = getDoctor(state.bookingDoctorId);
  const dateStr = selectedBookingDateStr();

  const bookedSlots = new Set(
    appointments
      .filter(a => a.doctorId === Number(state.bookingDoctorId) && a.date === dateStr)
      .map(a => a.time)
  );

  // If currently selected time is booked, auto-select next available
  if (bookedSlots.has(state.bookingTime)) {
    state.bookingConflictSlot = state.bookingTime;
    const alt = TIME_SLOTS.find(t => !bookedSlots.has(t));
    if (alt) state.bookingTime = alt;
  }

  const calCells = buildCalendarDays(state.calYear, state.calMonth);

  return `
    <div class="booking-steps">
      <span class="booking-step-active">01 &nbsp;Patient &amp; doctor</span>
      <span style="color:#a4b6af;">→</span>
      <span class="booking-step-active">02 &nbsp;Date &amp; time</span>
      <span style="color:#a4b6af;">→</span>
      <span class="booking-step-muted">03 &nbsp;Confirm booking</span>
    </div>

    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:20px;">
        <h3 style="font-size:18px;font-weight:600;color:var(--ink);">Appointment details</h3>

        <div class="field-group">
          <label for="book-patient">Patient *</label>
          <select id="book-patient" class="field-select">
            ${patients.length === 0 ? `<option value="">No patients registered yet</option>` : patients.map(p => `
              <option value="${p.id}" ${p.id === Number(state.bookingPatientId) ? 'selected' : ''}>
                ${esc(p.name)} · PT-${p.id} · ${p.age} yrs (${esc(p.gender)})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="form-row-2">
          <div class="field-group">
            <label for="book-doctor">Doctor *</label>
            <select id="book-doctor" class="field-select">
              ${doctors.length === 0 ? `<option value="">No doctors added yet</option>` : doctors.map(d => `
                <option value="${d.id}" ${d.id === Number(state.bookingDoctorId) ? 'selected' : ''}>
                  Dr. ${esc(d.name)} · ${esc(d.specialization)}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="field-group">
            <label for="book-reason">Reason for visit *</label>
            <input id="book-reason" class="field-input" type="text" value="${esc(state.bookingReason)}" placeholder="e.g. Follow-up, Consultation" />
          </div>
        </div>

        ${(patients.length === 0 || doctors.length === 0) ? `
          <div class="banner-warn">
            <div class="banner-warn-col">
              <strong>Add at least one patient and one doctor before booking.</strong>
              <span>Use the quick buttons to register a patient or add a doctor first.</span>
            </div>
            <div style="display:flex;gap:8px;">
              ${patients.length === 0 ? `<button type="button" class="btn-secondary" data-nav="patient-register">+ Register patient</button>` : ''}
              ${doctors.length === 0 ? `<button type="button" class="btn-secondary" data-nav="doctors">+ Add doctor</button>` : ''}
            </div>
          </div>
        ` : ''}

        <div class="calendar-time-grid">
          <div class="calendar-box">
            <div class="calendar-header">
              <h4>${MONTHS[state.calMonth]} ${state.calYear}</h4>
              <div class="cal-nav">
                <button type="button" id="cal-prev">‹</button>
                <button type="button" id="cal-next">›</button>
              </div>
            </div>
            <div class="cal-grid">
              ${WEEKDAYS.map(w => `<div class="cal-weekday">${w}</div>`).join('')}
              ${calCells.map(c => `
                <button type="button" class="cal-day ${c.outside ? 'outside' : ''} ${!c.outside && c.day === state.calDay ? 'selected' : ''}"
                        ${c.outside ? 'disabled' : `data-cal-day="${c.day}"`}>${c.day}</button>
              `).join('')}
            </div>
          </div>

          <div class="slots-box">
            <div style="font-size:14px;font-weight:600;color:var(--ink);">${formatPrettyDate(dateStr)}</div>
            <div style="font-size:11px;color:var(--muted);">Available 30-minute slots</div>
            <div class="slots-grid">
              ${TIME_SLOTS.map(slot => {
                const isBooked = bookedSlots.has(slot);
                const isSel = !isBooked && state.bookingTime === slot;
                return `
                  <button type="button" class="slot-btn ${isBooked ? 'booked' : ''} ${isSel ? 'selected' : ''}"
                          ${isBooked ? 'disabled' : `data-time-slot="${slot}"`}>${slot}</button>
                `;
              }).join('')}
            </div>
            <span style="font-size:10px;color:var(--muted);">Strikethrough slots are already booked for this doctor.</span>
          </div>
        </div>

        ${bookedSlots.size > 0 ? `
          <div class="banner-warn">
            <div class="banner-warn-col">
              <strong>${[...bookedSlots].join(', ')} already booked for Dr. ${esc(selDoctor?.name || '')} on ${formatPrettyDate(dateStr)}.</strong>
              <span>${esc(state.bookingTime)} is selected instead. Confirm to reserve this time.</span>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="card split-right" style="display:flex;flex-direction:column;gap:18px;">
        <h3 style="font-size:19px;font-weight:600;color:var(--ink);">Visit summary</h3>
        <div>
          <div style="font-size:21px;font-weight:600;color:var(--ink);">${esc(selPatient?.name || 'Select a patient')}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;">
            ${selPatient ? `PT-${selPatient.id} · ${esc(selPatient.gender)}, ${selPatient.age} years` : 'No patient registered'}
          </div>
        </div>
        <div class="divider"></div>
        <div class="summary-kv"><span class="k">Doctor</span><span class="v">${selDoctor ? 'Dr. ' + esc(selDoctor.name) : '—'}</span></div>
        <div class="summary-kv"><span class="k">Specialty</span><span class="v">${esc(selDoctor?.specialization || '—')}</span></div>
        <div class="summary-kv"><span class="k">Date</span><span class="v">${formatPrettyDate(dateStr)}</span></div>
        <div class="summary-kv"><span class="k">Time</span><span class="v">${esc(state.bookingTime)}</span></div>
        <div class="summary-kv"><span class="k">Reason</span><span class="v" id="summary-reason">${esc(state.bookingReason)}</span></div>
        <div class="divider"></div>
        <p style="font-size:12px;color:var(--muted);line-height:1.6;">
          Double-booking protection is active. The slot is reserved immediately once confirmed.
        </p>
        <button type="button" class="btn-primary btn-full" id="confirm-booking-btn" ${(!selPatient || !selDoctor) ? 'disabled' : ''}>
          Confirm appointment
        </button>
        <span style="font-size:10px;color:var(--muted);">The time is not reserved until confirmed.</span>
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 07 · APPOINTMENT CANCELLATION
// ============================================================

function renderAppointmentCancelScreen() {
  const { appointments, cancelledAppointments } = state.data;
  const tab = state.cancelTab;

  let list = [];
  if (tab === 'upcoming') {
    list = appointments.filter(a => a.status !== 'Completed');
  } else if (tab === 'completed') {
    list = appointments.filter(a => a.status === 'Completed');
  } else {
    list = cancelledAppointments;
  }

  let selected = tab !== 'cancelled'
    ? (list.find(a => a.id === state.selectedCancelApptId) || list[0] || null)
    : null;
  if (selected) state.selectedCancelApptId = selected.id;

  const selPatient = selected ? getPatient(selected.patientId) : null;
  const selDoctor = selected ? getDoctor(selected.doctorId) : null;

  return `
    <div class="controls-row">
      <div class="role-tabs" style="border:none;">
        <button class="role-tab ${tab === 'upcoming' ? 'active' : ''}" data-cancel-tab="upcoming">Upcoming (${appointments.filter(a => a.status !== 'Completed').length})</button>
        <button class="role-tab ${tab === 'completed' ? 'active' : ''}" data-cancel-tab="completed">Completed (${appointments.filter(a => a.status === 'Completed').length})</button>
        <button class="role-tab ${tab === 'cancelled' ? 'active' : ''}" data-cancel-tab="cancelled">Cancelled (${cancelledAppointments.length})</button>
      </div>
      <div style="display:flex;gap:12px;">
        <button class="btn-primary" data-nav="appt-book">+ Book appointment</button>
      </div>
    </div>

    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:12px;">
        <h3 style="font-size:18px;font-weight:600;color:var(--ink);">
          ${tab === 'upcoming' ? 'Upcoming appointments' : tab === 'completed' ? 'Completed visits' : 'Cancelled appointments'}
        </h3>
        <p style="font-size:12px;color:var(--muted);margin-top:-4px;">${list.length} ${list.length === 1 ? 'appointment' : 'appointments'} · Main clinic</p>

        ${list.length === 0 ? `<div class="empty-state">No appointments in this category.</div>` : list.map(a => {
          const p = getPatient(a.patientId);
          const d = getDoctor(a.doctorId);
          const isSel = selected && selected.id === a.id;
          return `
            <div class="visit-row ${isSel ? 'selected' : ''}" ${tab !== 'cancelled' ? `data-select-cancel="${a.id}"` : ''}>
              <div style="width:105px;">
                <div style="font-size:12px;font-weight:500;">${esc(a.time)}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:4px;">${esc(formatPrettyDate(a.date))}</div>
              </div>
              <div style="flex:1;">
                <div style="font-size:14px;font-weight:500;">${esc(p ? p.name : 'Patient #' + a.patientId)}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px;">
                  Dr. ${esc(d ? d.name : '#' + a.doctorId)} · ${esc(a.reason)}
                  ${tab === 'cancelled' && a.cancelReason ? ` · Reason: ${esc(a.cancelReason)}` : ''}
                </div>
              </div>
              <span style="font-size:11px;font-weight:500;color:${tab === 'cancelled' ? 'var(--cancel-ink)' : 'var(--primary)'};">
                ${isSel ? 'Selected' : (tab === 'cancelled' ? 'Cancelled' : esc(a.status))}
              </span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card split-right" style="display:flex;flex-direction:column;gap:16px;">
        <span style="font-size:10px;font-weight:600;color:var(--danger);letter-spacing:1px;">CANCELLATION REVIEW</span>
        <h3 style="font-size:22px;font-weight:600;color:var(--ink);">Cancel this appointment?</h3>
        <p style="font-size:12px;color:var(--muted);line-height:1.6;">
          The time slot will become available to other patients immediately after cancellation.
        </p>

        ${!selected ? `<div class="empty-state">Select an upcoming appointment from the list to review cancellation.</div>` : `
          <div style="background:var(--bg-canvas);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:8px;">
            <div style="font-size:18px;font-weight:600;color:var(--ink);">${esc(selPatient ? selPatient.name : 'Patient #' + selected.patientId)}</div>
            <div style="font-size:11px;color:var(--muted);">APT-${selected.id} · PT-${selected.patientId}</div>
            <div style="font-size:12px;color:var(--ink);">${esc(formatPrettyDate(selected.date))} · ${esc(selected.time)}</div>
            <div style="font-size:12px;color:var(--muted);">Dr. ${esc(selDoctor ? selDoctor.name : '#' + selected.doctorId)} · ${esc(selected.reason)}</div>
          </div>

          <div class="field-group">
            <label for="cancel-reason">Cancellation reason *</label>
            <input id="cancel-reason" class="field-input" type="text" value="Patient unavailable" />
          </div>
          <div class="field-group">
            <label for="cancel-note">Additional note</label>
            <input id="cancel-note" class="field-input" type="text" placeholder="Optional note..." />
          </div>
          <p style="font-size:11px;color:var(--muted);">No cancellation fee will be charged.</p>

          <button type="button" class="btn-danger btn-full" id="confirm-cancel-appt-btn" data-aid="${selected.id}">
            Cancel appointment
          </button>
          <button type="button" class="btn-secondary btn-full" id="keep-appt-btn">Keep appointment</button>
          <span style="font-size:10px;color:var(--muted);">Nothing changes until you confirm.</span>
        `}
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 08 · DOCTOR APPOINTMENTS
// ============================================================

function renderDoctorAppointmentsScreen() {
  const { doctors, appointments, medicalRecords } = state.data;
  const doc = getDoctor(state.activeDoctorId) || doctors[0] || null;
  if (doc) state.activeDoctorId = doc.id;

  const docAppts = doc ? appointments.filter(a => a.doctorId === doc.id) : [];
  const completed = docAppts.filter(a => a.status === 'Completed').length;
  const remaining = docAppts.length - completed;
  const cancelledForDoc = doc
    ? state.data.cancelledAppointments.filter(a => a.doctorId === doc.id).length
    : 0;

  let selected = docAppts.find(a => a.id === state.selectedDocApptId) || docAppts[0] || null;
  if (selected) state.selectedDocApptId = selected.id;

  const selPatient = selected ? getPatient(selected.patientId) : null;
  const lastRec = selPatient
    ? [...medicalRecords].reverse().find(r => r.patientId === selPatient.id)
    : null;

  return `
    <div class="doctor-summary-strip">
      <div class="doctor-greeting-card">
        <div>
          <h3 style="font-size:18px;font-weight:600;color:var(--ink);">Good day, Dr. ${esc(doc ? doc.name : 'Doctor')}</h3>
          <p style="font-size:12px;color:var(--muted);margin-top:6px;">
            ${doc ? `${esc(doc.specialization)} · ${esc(doc.qualification)} · ID #${doc.id}` : 'No doctor selected'}
          </p>
        </div>
        ${doctors.length > 1 ? `
          <select id="active-doctor-select" class="field-select" style="width:220px;height:40px;">
            ${doctors.map(d => `<option value="${d.id}" ${doc && d.id === doc.id ? 'selected' : ''}>Dr. ${esc(d.name)} (#${d.id})</option>`).join('')}
          </select>
        ` : ''}
      </div>
      <div class="doctor-metric-card"><strong>${docAppts.length}</strong><span>scheduled</span></div>
      <div class="doctor-metric-card"><strong>${completed}</strong><span>completed</span></div>
      <div class="doctor-metric-card"><strong>${remaining}</strong><span>remaining</span></div>
      <div class="doctor-metric-card"><strong>${cancelledForDoc}</strong><span>cancelled</span></div>
    </div>

    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:17px;font-weight:600;color:var(--ink);">Doctor’s appointments</h3>
          <button class="btn-secondary" id="view-doc-profile-btn" style="height:38px;">View my profile</button>
        </div>

        ${docAppts.length === 0 ? `<div class="empty-state">No appointments found for Dr. ${esc(doc?.name || '')}.</div>` : docAppts.map(a => {
          const p = getPatient(a.patientId);
          const isSel = selected && selected.id === a.id;
          const pillClass = a.status === 'Completed' ? 'pill-green' : a.status === 'Checked in' ? 'pill-amber' : 'pill-green';
          return `
            <div class="visit-row ${isSel ? 'selected' : ''}" data-select-doc-appt="${a.id}">
              <div style="width:95px;">
                <div style="font-size:12px;font-weight:500;color:var(--muted);">${esc(a.time)}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:3px;">${esc(formatPrettyDate(a.date))}</div>
              </div>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:500;">${esc(p ? p.name : 'Patient #' + a.patientId)}</div>
                <div style="font-size:11px;color:var(--muted);margin-top:4px;">${esc(a.reason)}</div>
              </div>
              <span class="pill ${pillClass}">${esc(a.status)}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="card split-right" style="display:flex;flex-direction:column;gap:18px;">
        ${!selected || !selPatient ? `<div class="empty-state">Select an appointment to review patient details and start a consultation.</div>` : `
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:10px;font-weight:600;color:var(--primary);letter-spacing:0.6px;">READY FOR CONSULTATION</span>
            <span style="font-size:11px;color:var(--muted);">${esc(selected.time)}</span>
          </div>
          <div>
            <h2 style="font-size:24px;font-weight:600;color:var(--ink);">${esc(selPatient.name)}</h2>
            <p style="font-size:12px;color:var(--muted);margin-top:6px;">PT-${selPatient.id} · ${esc(selPatient.gender)}, ${selPatient.age} years · ${esc(selPatient.phone)}</p>
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);font-weight:500;">REASON FOR VISIT</div>
            <div style="font-size:15px;font-weight:500;margin-top:6px;">${esc(selected.reason)}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Scheduled on ${esc(formatPrettyDate(selected.date))}</div>
          </div>
          <div>
            <div style="font-size:10px;color:var(--muted);font-weight:500;">LATEST MEDICAL RECORD</div>
            <div style="font-size:13px;font-weight:500;margin-top:6px;">${lastRec ? esc(lastRec.diagnosis) : 'No previous records yet'}</div>
            ${lastRec ? `<div style="font-size:12px;color:var(--muted);margin-top:3px;">${esc(lastRec.symptoms)}</div>` : ''}
          </div>
          <div style="display:flex;gap:10px;">
            <button type="button" class="btn-secondary" style="flex:1;height:38px;" data-set-status="Checked in" data-aid="${selected.id}">Check in</button>
            <button type="button" class="btn-secondary" style="flex:1;height:38px;" data-set-status="Completed" data-aid="${selected.id}">Mark complete</button>
          </div>
          <button type="button" class="btn-primary btn-full" id="start-consult-btn" data-pid="${selPatient.id}" data-did="${doc.id}">
            Start consultation →
          </button>
          <button type="button" class="btn-secondary btn-full" id="doc-view-history-btn" data-pid="${selPatient.id}">
            View medical history
          </button>
          <span style="font-size:10px;color:var(--muted);">Patient records open in your clinical workspace.</span>
        `}
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 09 · MEDICAL RECORD CREATION
// ============================================================

function renderMedicalRecordScreen() {
  const { patients, doctors, medicalRecords } = state.data;
  const p = getPatient(state.recordPatientId) || patients[0] || null;
  const d = getDoctor(state.recordDoctorId) || doctors[0] || null;
  if (p) state.recordPatientId = p.id;
  if (d) state.recordDoctorId = d.id;

  const history = p ? medicalRecords.filter(r => r.patientId === p.id).reverse() : [];

  return `
    <div class="card" style="padding:16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <h3 style="font-size:20px;font-weight:600;color:var(--ink);">${esc(p ? p.name : 'Select patient')}</h3>
          <p style="font-size:12px;color:var(--muted);margin-top:5px;">
            ${p ? `PT-${p.id} · ${esc(p.gender)}, ${p.age} years · ${esc(p.address)}` : ''}
          </p>
        </div>
        <div style="display:flex;gap:12px;align-items:center;">
          <select id="rec-patient-select" class="field-select" style="width:220px;height:40px;">
            ${patients.map(pt => `<option value="${pt.id}" ${p && pt.id === p.id ? 'selected' : ''}>${esc(pt.name)} (PT-${pt.id})</option>`).join('')}
          </select>
          <select id="rec-doctor-select" class="field-select" style="width:210px;height:40px;">
            ${doctors.map(dr => `<option value="${dr.id}" ${d && dr.id === d.id ? 'selected' : ''}>Dr. ${esc(dr.name)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:18px;font-weight:600;color:var(--ink);">Clinical notes</h3>
          <span style="font-size:11px;color:var(--muted);">Attending: Dr. ${esc(d ? d.name : '—')}</span>
        </div>

        <form id="medical-record-form" style="display:flex;flex-direction:column;gap:16px;">
          <div class="field-group">
            <label for="rec-diagnosis">Diagnosis *</label>
            <input id="rec-diagnosis" class="field-input" type="text" placeholder="e.g. Seasonal allergic rhinitis" required />
          </div>
          <div class="field-group">
            <label for="rec-symptoms">Symptoms &amp; chief complaint *</label>
            <textarea id="rec-symptoms" class="field-textarea" placeholder="Describe symptoms, onset, and examination findings..." required></textarea>
          </div>
          <div class="field-group">
            <label for="rec-notes">Doctor notes &amp; care plan *</label>
            <textarea id="rec-notes" class="field-textarea" placeholder="Assessment, treatment guidance, and follow-up plan..." required></textarea>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:14px;padding-top:4px;">
            <button type="submit" class="btn-secondary" data-after="stay" ${(!p || !d) ? 'disabled' : ''}>Save record</button>
            <button type="submit" class="btn-primary" data-after="rx" ${(!p || !d) ? 'disabled' : ''}>Save &amp; create prescription →</button>
          </div>
          <span style="font-size:10px;color:var(--muted);">Saving creates a permanent MedicalRecord linked to this patient and doctor.</span>
        </form>
      </div>

      <div class="split-right" style="display:flex;flex-direction:column;gap:20px;">
        <div class="card" style="display:flex;flex-direction:column;gap:14px;">
          <h3 style="font-size:17px;font-weight:600;color:var(--ink);">Vitals reference</h3>
          <div class="form-row-2">
            <div class="field-group"><label>Blood pressure</label><input class="field-input" value="120/80 mmHg" /></div>
            <div class="field-group"><label>Heart rate</label><input class="field-input" value="72 bpm" /></div>
          </div>
          <div class="form-row-2">
            <div class="field-group"><label>Temperature</label><input class="field-input" value="36.8 °C" /></div>
            <div class="field-group"><label>Weight</label><input class="field-input" value="68 kg" /></div>
          </div>
        </div>

        <div class="card" style="display:flex;flex-direction:column;gap:16px;">
          <h3 style="font-size:17px;font-weight:600;color:var(--ink);">Recent history (${history.length})</h3>
          ${history.length === 0 ? `<p style="font-size:12px;color:var(--muted);">No medical records recorded for this patient yet.</p>` : history.slice(0, 4).map(r => {
            const doc = getDoctor(r.doctorId);
            return `
              <div style="display:flex;flex-direction:column;gap:5px;padding-bottom:12px;border-bottom:1px solid var(--border-card);">
                <span style="font-size:11px;font-weight:500;color:var(--primary);">Record #${r.id}</span>
                <span style="font-size:13px;font-weight:500;color:var(--ink);">${esc(r.diagnosis)}</span>
                <span style="font-size:11px;color:var(--muted);">${esc(r.symptoms)}</span>
                <span style="font-size:11px;color:var(--muted);">Dr. ${esc(doc ? doc.name : '#' + r.doctorId)}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 10 · PRESCRIPTION CREATION
// ============================================================

function renderPrescriptionScreen() {
  const { patients, doctors, prescriptions } = state.data;
  const p = getPatient(state.rxPatientId) || patients[0] || null;
  const d = getDoctor(state.rxDoctorId) || doctors[0] || null;
  if (p) state.rxPatientId = p.id;
  if (d) state.rxDoctorId = d.id;

  const rx = state.rxDraft;
  const patientRx = p ? prescriptions.filter(item => item.patientId === p.id).reverse() : [];

  return `
    <div class="card" style="padding:16px 24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;">
        <div>
          <h3 style="font-size:20px;font-weight:600;color:var(--ink);">${esc(p ? p.name : 'Select patient')}</h3>
          <p style="font-size:12px;color:var(--muted);margin-top:5px;">
            ${p ? `PT-${p.id} · ${esc(p.gender)}, ${p.age} years · ${patientRx.length} issued ${patientRx.length === 1 ? 'prescription' : 'prescriptions'}` : ''}
          </p>
        </div>
        <div style="display:flex;gap:12px;">
          <select id="rx-patient-select" class="field-select" style="width:220px;height:40px;">
            ${patients.map(pt => `<option value="${pt.id}" ${p && pt.id === p.id ? 'selected' : ''}>${esc(pt.name)} (PT-${pt.id})</option>`).join('')}
          </select>
          <select id="rx-doctor-select" class="field-select" style="width:210px;height:40px;">
            ${doctors.map(dr => `<option value="${dr.id}" ${d && dr.id === d.id ? 'selected' : ''}>Dr. ${esc(dr.name)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:16px;">
        <h3 style="font-size:18px;font-weight:600;color:var(--ink);">Medication builder</h3>

        <form id="prescription-form" style="display:flex;flex-direction:column;gap:15px;">
          <div class="field-group">
            <label for="rx-medicine">Medicine name *</label>
            <input id="rx-medicine" class="field-input" type="text" value="${esc(rx.medicine)}" placeholder="e.g. Cetirizine 10 mg" required />
          </div>
          <div class="form-row-2">
            <div class="field-group">
              <label for="rx-dosage">Dosage *</label>
              <input id="rx-dosage" class="field-input" type="text" value="${esc(rx.dosage)}" placeholder="e.g. 1 tablet once daily" required />
            </div>
            <div class="field-group">
              <label for="rx-duration">Duration *</label>
              <input id="rx-duration" class="field-input" type="text" value="${esc(rx.duration)}" placeholder="e.g. 14 days" required />
            </div>
          </div>
          <div class="field-group">
            <label for="rx-instructions">Patient instructions *</label>
            <textarea id="rx-instructions" class="field-textarea" placeholder="Take 1 tablet by mouth each evening." required>${esc(rx.instructions)}</textarea>
          </div>
          <div class="field-group">
            <label for="rx-followup">Follow-up date</label>
            <input id="rx-followup" class="field-input" type="text" value="${esc(rx.followUp)}" />
          </div>
          <label class="checkbox-label">
            <input id="rx-reviewed" type="checkbox" ${rx.reviewed ? 'checked' : ''} />
            <span>I have reviewed the patient’s allergies and medication plan.</span>
          </label>
          <div style="display:flex;justify-content:flex-end;gap:12px;">
            <button type="button" class="btn-secondary" onclick="window.print()">Print Rx</button>
            <button type="submit" class="btn-primary" ${(!p || !d) ? 'disabled' : ''}>Sign prescription</button>
          </div>
        </form>

        ${patientRx.length > 0 ? `
          <div class="divider"></div>
          <h4 style="font-size:14px;font-weight:600;color:var(--ink);">Issued prescriptions for ${esc(p.name)}</h4>
          ${patientRx.map(item => `
            <div style="background:var(--bg-canvas);border-radius:8px;padding:12px 14px;font-size:12px;display:flex;justify-content:space-between;gap:12px;">
              <div>
                <strong>#${item.id} · ${esc(item.medicine)}</strong>
                <div style="color:var(--muted);margin-top:3px;">${esc(item.dosage)} · ${esc(item.duration)} — ${esc(item.instructions)}</div>
              </div>
              <span class="pill pill-green">Signed</span>
            </div>
          `).join('')}
        ` : ''}
      </div>

      <div class="card split-right" style="display:flex;flex-direction:column;gap:18px;padding:28px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:24px;font-weight:600;color:var(--primary);">wellnest.</div>
            <div style="font-size:10px;font-weight:500;color:var(--muted);letter-spacing:1.3px;margin-top:4px;">SMART CLINIC</div>
          </div>
          <div style="font-size:38px;font-weight:500;color:#a5bdb1;line-height:1;">Rx</div>
        </div>
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--ink);">Dr. ${esc(d ? d.name : '—')}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${esc(d ? `${d.specialization} · ${d.qualification}` : '')}</div>
        </div>
        <div class="divider"></div>
        <div>
          <div style="font-size:10px;color:var(--muted);font-weight:500;">PRESCRIBED FOR</div>
          <div style="font-size:18px;font-weight:600;margin-top:6px;">${esc(p ? p.name : '—')}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${p ? `${p.age} years · ${esc(p.gender)} · PT-${p.id}` : ''}</div>
        </div>
        <div style="padding:12px 0;">
          <div style="font-size:16px;font-weight:600;color:var(--ink);" id="rx-prev-med">01 &nbsp;&nbsp;${esc(rx.medicine || 'Medicine')}</div>
          <div style="font-size:12px;color:var(--ink);margin-top:8px;" id="rx-prev-dose">${esc(rx.dosage || '—')} · ${esc(rx.duration || '—')}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;line-height:1.5;" id="rx-prev-inst">${esc(rx.instructions || '—')}</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--muted);font-weight:500;">FOLLOW-UP</div>
          <div style="font-size:13px;font-weight:500;margin-top:5px;" id="rx-prev-fu">${esc(rx.followUp || '—')}</div>
        </div>
        <div style="padding-top:10px;">
          <div style="font-size:14px;font-weight:500;color:var(--warn-ink);">Live preview</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">Click “Sign prescription” to issue and save to records.</div>
        </div>
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 11 · BILL GENERATION
// ============================================================

function renderBillGenerateScreen() {
  const { patients } = state.data;
  const p = getPatient(state.billPatientId) || patients[0] || null;
  if (p) state.billPatientId = p.id;

  const cFee = parseFloat(state.billFees.consultation) || 0;
  const mFee = parseFloat(state.billFees.medicine) || 0;
  const tFee = parseFloat(state.billFees.test) || 0;
  const total = cFee + mFee + tFee;

  return `
    <div class="split-layout">
      <div class="card split-left" style="display:flex;flex-direction:column;gap:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:18px;font-weight:600;color:var(--ink);">Bill details</h3>
          <span style="font-size:10px;font-weight:600;color:var(--warn-ink);letter-spacing:0.6px;">DRAFT</span>
        </div>

        <div class="field-group">
          <label for="bill-patient">Patient *</label>
          <select id="bill-patient" class="field-select">
            ${patients.length === 0 ? `<option value="">No patients registered yet</option>` : patients.map(pt => `
              <option value="${pt.id}" ${p && pt.id === p.id ? 'selected' : ''}>
                ${esc(pt.name)} · PT-${pt.id} · ${esc(pt.phone)}
              </option>
            `).join('')}
          </select>
        </div>

        <h4 style="font-size:15px;font-weight:600;color:var(--ink);">Services &amp; charges</h4>

        <table class="data-table">
          <thead>
            <tr>
              <th>SERVICE</th>
              <th style="text-align:right;width:180px;">AMOUNT (RS.)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:500;">Consultation fee</td>
              <td><input id="fee-consult" class="field-input" style="height:38px;text-align:right;" type="number" min="0" max="1000000" step="0.01" value="${esc(state.billFees.consultation)}" placeholder="0.00" /></td>
            </tr>
            <tr>
              <td style="font-weight:500;">Medicine fee</td>
              <td><input id="fee-medicine" class="field-input" style="height:38px;text-align:right;" type="number" min="0" max="1000000" step="0.01" value="${esc(state.billFees.medicine)}" placeholder="0.00" /></td>
            </tr>
            <tr>
              <td style="font-weight:500;">Lab / Test fee</td>
              <td><input id="fee-test" class="field-input" style="height:38px;text-align:right;" type="number" min="0" max="1000000" step="0.01" value="${esc(state.billFees.test)}" placeholder="0.00" /></td>
            </tr>
          </tbody>
        </table>

        <div class="field-group">
          <label for="bill-note">Invoice note</label>
          <input id="bill-note" class="field-input" type="text" value="${esc(state.billFees.note)}" placeholder="Optional note for invoice" />
        </div>
        <p style="font-size:11px;color:var(--muted);">All charges are shown in Pakistani Rupees (Rs.). Medical services are tax exempt.</p>
      </div>

      <div class="card split-right" style="display:flex;flex-direction:column;gap:18px;">
        <div>
          <h3 style="font-size:19px;font-weight:600;color:var(--ink);">Payment summary</h3>
          <p style="font-size:12px;color:var(--muted);margin-top:6px;">New invoice · ${esc(p ? p.name : 'Select patient')}</p>
        </div>
        <div class="summary-kv"><span class="k">Consultation</span><span class="v" id="sum-consult">${formatRs(cFee)}</span></div>
        <div class="summary-kv"><span class="k">Medicines</span><span class="v" id="sum-medicine">${formatRs(mFee)}</span></div>
        <div class="summary-kv"><span class="k">Tests</span><span class="v" id="sum-test">${formatRs(tFee)}</span></div>
        <div class="divider"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:16px;font-weight:600;">Total due</span>
          <span style="font-size:26px;font-weight:600;color:var(--ink);" id="sum-total">${formatRs(total)}</span>
        </div>

        <div class="field-group">
          <label for="bill-status">Payment status *</label>
          <select id="bill-status" class="field-select">
            <option value="unpaid" ${state.billFees.status === 'unpaid' ? 'selected' : ''}>Unpaid · Collect at reception</option>
            <option value="paid" ${state.billFees.status === 'paid' ? 'selected' : ''}>Paid · Settled immediately</option>
          </select>
        </div>

        <button type="button" class="btn-primary btn-full" id="generate-bill-btn" ${!p ? 'disabled' : ''}>Generate bill →</button>
        <button type="button" class="btn-secondary btn-full" data-nav="bill-view">View all bills</button>
        <p style="font-size:11px;color:var(--muted);line-height:1.6;">
          Generating creates a numbered Bill record in the system and updates total clinic revenue.
        </p>
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 12 · BILL VIEWING
// ============================================================

function renderBillViewScreen() {
  const { bills, stats } = state.data;
  const f = state.billFilter;
  const filtered = bills.filter(b => {
    if (f === 'paid') return b.paid;
    if (f === 'unpaid') return !b.paid;
    return true;
  }).slice().reverse();

  let selected = filtered.find(b => b.id === state.selectedBillId) || filtered[0] || null;
  if (selected) state.selectedBillId = selected.id;
  const selPatient = selected ? getPatient(selected.patientId) : null;

  return `
    ${state.billRefreshError ? `
      <div class="banner-warn">
        <div class="banner-warn-col">
          <strong>We couldn’t refresh the invoice list.</strong>
          <span>Showing saved data. Your invoices are safe.</span>
        </div>
        <button class="btn-secondary" id="retry-bills-btn">Try again</button>
      </div>
    ` : ''}

    <div class="split-layout">
      <div class="card split-left-narrow" style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:17px;font-weight:600;color:var(--ink);">Recent invoices</h3>
          <span style="font-size:11px;font-weight:600;color:var(--primary);">Grand total: ${formatRs(stats.totalRevenue)}</span>
        </div>

        <div style="display:flex;gap:22px;padding-bottom:6px;border-bottom:1px solid var(--border-card);">
          <button class="role-tab ${f === 'all' ? 'active' : ''}" style="padding-bottom:8px;" data-bill-filter="all">All (${bills.length})</button>
          <button class="role-tab ${f === 'unpaid' ? 'active' : ''}" style="padding-bottom:8px;" data-bill-filter="unpaid">Unpaid (${bills.filter(b => !b.paid).length})</button>
          <button class="role-tab ${f === 'paid' ? 'active' : ''}" style="padding-bottom:8px;" data-bill-filter="paid">Paid (${bills.filter(b => b.paid).length})</button>
        </div>

        ${filtered.length === 0 ? `<div class="empty-state">No invoices found.</div>` : filtered.map(b => {
          const pt = getPatient(b.patientId);
          const isSel = selected && selected.id === b.id;
          return `
            <div class="visit-row ${isSel ? 'selected' : ''}" style="padding:14px 12px;" data-select-bill="${b.id}">
              <div>
                <div style="font-size:13px;font-weight:500;">${esc(pt ? pt.name : 'Patient #' + b.patientId)}</div>
                <div style="font-size:10px;color:var(--muted);margin-top:4px;">BILL-${b.id}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:13px;font-weight:500;">${formatRs(b.total)}</div>
                <div style="font-size:10px;font-weight:500;margin-top:4px;color:${b.paid ? 'var(--primary)' : 'var(--warn-ink)'};">
                  ${b.paid ? 'Paid' : 'Unpaid'}
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;">
          <span style="font-size:11px;color:var(--muted);">Showing ${filtered.length} of ${bills.length} bills</span>
          <button class="link-btn" data-nav="bill-generate">+ New bill</button>
        </div>
      </div>

      <div class="card split-right-wide" style="display:flex;flex-direction:column;gap:22px;padding:28px;">
        ${!selected ? `<div class="empty-state">Select a bill to preview the invoice document.</div>` : `
          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:24px;font-weight:600;color:var(--primary);">wellnest.</div>
              <div style="font-size:12px;font-weight:500;margin-top:4px;">Smart Clinic Management</div>
              <div style="font-size:10px;color:var(--muted);margin-top:3px;">Main clinic · Healthcare Billing Desk</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:20px;font-weight:600;color:var(--ink);">INVOICE</div>
              <div style="font-size:12px;color:var(--muted);margin-top:5px;">BILL-${selected.id}</div>
              <div style="font-size:10px;font-weight:600;margin-top:5px;color:${selected.paid ? 'var(--primary)' : 'var(--warn-ink)'};">
                ${selected.paid ? 'PAID' : 'UNPAID'}
              </div>
            </div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:10px;color:var(--muted);font-weight:500;">BILL TO</div>
              <div style="font-size:16px;font-weight:600;margin-top:6px;">${esc(selPatient ? selPatient.name : 'Patient #' + selected.patientId)}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:4px;">PT-${selected.patientId}${selPatient ? ` · ${esc(selPatient.phone)}` : ''}</div>
            </div>
            <div style="text-align:right;font-size:12px;color:var(--muted);">
              <div>Currency: PKR (Rs.)</div>
              <div style="margin-top:4px;">Tax exempt medical services</div>
            </div>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>SERVICE</th>
                <th style="text-align:center;">QTY</th>
                <th style="text-align:right;">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Consultation fee</td>
                <td style="text-align:center;color:var(--muted);">1</td>
                <td style="text-align:right;font-weight:500;">${formatRs(selected.consultationFee)}</td>
              </tr>
              <tr>
                <td>Medicine fee</td>
                <td style="text-align:center;color:var(--muted);">1</td>
                <td style="text-align:right;font-weight:500;">${formatRs(selected.medicineFee)}</td>
              </tr>
              <tr>
                <td>Lab / Test fee</td>
                <td style="text-align:center;color:var(--muted);">1</td>
                <td style="text-align:right;font-weight:500;">${formatRs(selected.testFee)}</td>
              </tr>
            </tbody>
          </table>

          <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;">
            <div style="font-size:12px;color:var(--muted);line-height:1.6;">
              Thank you for choosing Smart Clinic.<br/>
              <span style="font-size:10px;">Generated by SmartClinicManagement</span>
            </div>
            <div style="width:240px;display:flex;flex-direction:column;gap:10px;">
              <div class="summary-kv"><span class="k">Subtotal</span><span class="v">${formatRs(selected.total)}</span></div>
              <div class="summary-kv"><span class="k">Tax</span><span class="v">Rs. 0.00</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px solid var(--border-card);">
                <span style="font-size:14px;font-weight:600;">Total</span>
                <span style="font-size:24px;font-weight:600;color:var(--ink);">${formatRs(selected.total)}</span>
              </div>
            </div>
          </div>

          <div class="no-print" style="display:flex;justify-content:flex-end;gap:12px;padding-top:4px;">
            <button class="btn-secondary" onclick="window.print()">Print</button>
            <button class="btn-secondary" id="download-bill-btn" data-bid="${selected.id}">Download receipt</button>
            ${!selected.paid ? `<button class="btn-primary" id="record-payment-btn" data-bid="${selected.id}">Record payment</button>` : `<span class="pill pill-green" style="height:42px;padding:0 18px;font-size:12px;">✓ Paid</span>`}
          </div>
        `}
      </div>
    </div>
  `;
}

// ============================================================
// MODALS (PATIENT RECORDS & DOCTOR PROFILE & HELP)
// ============================================================

function openModal(title, bodyHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-box">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-size:19px;font-weight:600;color:var(--ink);">${esc(title)}</h3>
          <button class="btn-secondary" id="close-modal-btn" style="height:34px;padding:0 12px;">Close</button>
        </div>
        <div class="divider"></div>
        ${bodyHtml}
      </div>
    </div>
  `;
  document.getElementById('close-modal-btn').addEventListener('click', closeModal);
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
}

function showPatientRecordsModal(patientId) {
  const p = getPatient(patientId);
  if (!p) return;
  const recs = state.data.medicalRecords.filter(r => r.patientId === p.id);
  const rxs = state.data.prescriptions.filter(r => r.patientId === p.id);

  const html = `
    <div style="font-size:13px;color:var(--muted);">
      <strong style="color:var(--ink);">${esc(p.name)}</strong> · PT-${p.id} · ${p.age} yrs, ${esc(p.gender)} · ${esc(p.phone)}
    </div>
    <h4 style="font-size:14px;font-weight:600;">Medical Records (${recs.length})</h4>
    ${recs.length === 0 ? `<p style="font-size:12px;color:var(--muted);">No medical records found for this patient.</p>` : recs.map(r => {
      const doc = getDoctor(r.doctorId);
      return `
        <div style="background:var(--bg-canvas);border-radius:8px;padding:12px 14px;font-size:12px;display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;justify-content:space-between;"><strong>#${r.id} · ${esc(r.diagnosis)}</strong><span style="color:var(--muted);">Dr. ${esc(doc ? doc.name : '#' + r.doctorId)}</span></div>
          <div><span style="color:var(--muted);">Symptoms:</span> ${esc(r.symptoms)}</div>
          <div><span style="color:var(--muted);">Notes:</span> ${esc(r.notes)}</div>
        </div>
      `;
    }).join('')}
    <h4 style="font-size:14px;font-weight:600;margin-top:6px;">Prescriptions (${rxs.length})</h4>
    ${rxs.length === 0 ? `<p style="font-size:12px;color:var(--muted);">No prescriptions found for this patient.</p>` : rxs.map(rx => {
      const doc = getDoctor(rx.doctorId);
      return `
        <div style="background:var(--bg-soft-mint);border-radius:8px;padding:12px 14px;font-size:12px;display:flex;flex-direction:column;gap:4px;">
          <div style="display:flex;justify-content:space-between;"><strong>Rx #${rx.id} · ${esc(rx.medicine)}</strong><span style="color:var(--muted);">Dr. ${esc(doc ? doc.name : '#' + rx.doctorId)}</span></div>
          <div>${esc(rx.dosage)} · ${esc(rx.duration)}</div>
          <div style="color:var(--muted);">${esc(rx.instructions)}</div>
        </div>
      `;
    }).join('')}
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
      <button class="btn-secondary" id="modal-add-rec-btn">Add medical record</button>
      <button class="btn-primary" id="modal-add-rx-btn">Create prescription</button>
    </div>
  `;
  openModal('Patient Medical History', html);
  document.getElementById('modal-add-rec-btn').addEventListener('click', () => {
    closeModal();
    navigate('medical-record', { patientId: p.id });
  });
  document.getElementById('modal-add-rx-btn').addEventListener('click', () => {
    closeModal();
    navigate('prescription', { patientId: p.id });
  });
}

// ============================================================
// EVENT BINDING FOR ALL WORKSPACE SCREENS
// ============================================================

function bindWorkspaceEvents() {
  // Navigation
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.nav));
  });

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      state.session = null;
      state.screen = 'login';
      state.loginError = '';
      showToast('Signed out successfully.');
      render();
    });
  }

  const helpBtn = document.getElementById('help-center-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      openModal('Smart Clinic Management System Guide', `
        <p style="font-size:13px;color:var(--muted);line-height:1.6;">
          This web interface runs directly on your existing <code>SmartClinicManagement.java</code> classes
          (<code>User</code>, <code>Doctor</code>, <code>Patient</code>, <code>Appointment</code>,
          <code>MedicalRecord</code>, <code>Prescription</code>, <code>Bill</code>) with zero class modifications.
        </p>
        <div style="font-size:12px;line-height:1.8;color:var(--ink);">
          <div>• <strong>Admin Login:</strong> <code>admin</code> / <code>admin123</code></div>
          <div>• <strong>Doctor Login:</strong> Enter Doctor ID (e.g. <code>101</code> or <code>102</code>)</div>
          <div>• <strong>Receptionist:</strong> Register patients, search, book/cancel appointments, generate bills</div>
          <div>• <strong>CLI Mode:</strong> Run <code>java SmartClinicManagement --cli</code> anytime</div>
        </div>
      `);
    });
  }

  // Screen 02: Stats
  const refreshStatsBtn = document.getElementById('refresh-stats-btn');
  if (refreshStatsBtn) {
    refreshStatsBtn.addEventListener('click', async () => {
      await refreshState();
      showToast('Statistics refreshed.');
      render();
    });
  }

  // Screen 03: Doctors
  const docSearch = document.getElementById('doctor-search-input');
  if (docSearch) {
    docSearch.addEventListener('input', (e) => {
      state.doctorSearch = e.target.value;
      render();
      const inp = document.getElementById('doctor-search-input');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    });
  }
  const docSpecFilter = document.getElementById('doctor-spec-filter');
  if (docSpecFilter) {
    docSpecFilter.addEventListener('change', (e) => {
      state.doctorSpecialtyFilter = e.target.value;
      render();
    });
  }
  const exportDocBtn = document.getElementById('export-doctors-btn');
  if (exportDocBtn) {
    exportDocBtn.addEventListener('click', () => {
      const rows = [['ID', 'Name', 'Email', 'Phone', 'Specialization', 'Qualification']];
      state.data.doctors.forEach(d => rows.push([d.id, d.name, d.email, d.phone, d.specialization, d.qualification]));
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      downloadText('doctors.csv', csv, 'text/csv');
      showToast('Exported doctors.csv');
    });
  }
  document.querySelectorAll('[data-doc-schedule]').forEach(btn => {
    btn.addEventListener('click', () => navigate('doctor-appts', { doctorId: Number(btn.dataset.docSchedule) }));
  });
  document.querySelectorAll('[data-delete-doctor]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.deleteDoctor);
      const doc = getDoctor(id);
      if (!doc) return;
      if (!confirm(`Delete Dr. ${doc.name} (ID #${doc.id})?`)) return;
      try {
        await api(`/api/doctors/${id}`, { method: 'DELETE' });
        await refreshState();
        showToast(`Dr. ${doc.name} deleted successfully.`);
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
  const addDocForm = document.getElementById('add-doctor-form');
  if (addDocForm) {
    addDocForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        name: document.getElementById('doc-name').value.trim(),
        email: document.getElementById('doc-email').value.trim(),
        phone: document.getElementById('doc-phone').value.trim(),
        specialization: document.getElementById('doc-spec').value.trim(),
        qualification: document.getElementById('doc-qual').value.trim()
      };
      try {
        const res = await api('/api/doctors', { method: 'POST', body: JSON.stringify(payload) });
        await refreshState();
        showToast(`Doctor added! Assigned ID: ${res.doctor.id}`);
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Screen 04: Patient search
  const patSearch = document.getElementById('patient-search-input');
  if (patSearch) {
    patSearch.addEventListener('input', (e) => {
      state.patientSearchQuery = e.target.value;
      render();
      const inp = document.getElementById('patient-search-input');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    });
  }
  const clearPatBtn = document.getElementById('clear-patient-search');
  if (clearPatBtn) {
    clearPatBtn.addEventListener('click', () => { state.patientSearchQuery = ''; render(); });
  }
  const showAllPatBtn = document.getElementById('show-all-patients-btn');
  if (showAllPatBtn) {
    showAllPatBtn.addEventListener('click', () => { state.patientSearchQuery = ''; render(); });
  }
  document.querySelectorAll('[data-select-patient]').forEach(row => {
    row.addEventListener('click', () => {
      state.selectedPatientId = Number(row.dataset.selectPatient);
      render();
    });
  });
  const viewRecsBtn = document.getElementById('view-patient-records-btn');
  if (viewRecsBtn) {
    viewRecsBtn.addEventListener('click', () => showPatientRecordsModal(Number(viewRecsBtn.dataset.pid)));
  }
  const bookForPatBtn = document.getElementById('book-for-patient-btn');
  if (bookForPatBtn) {
    bookForPatBtn.addEventListener('click', () => navigate('appt-book', { patientId: Number(bookForPatBtn.dataset.pid) }));
  }

  // Screen 05: Patient registration
  const regForm = document.getElementById('register-patient-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const draft = {
        name: document.getElementById('reg-name').value.trim(),
        age: document.getElementById('reg-age').value.trim(),
        gender: document.getElementById('reg-gender').value,
        phone: document.getElementById('reg-phone').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        address: document.getElementById('reg-address').value.trim(),
        consent: document.getElementById('reg-consent').checked
      };
      state.regDraft = draft;
      const errs = {};
      if (!draft.name) errs.name = 'Patient full name is required.';
      const ageNum = Number(draft.age);
      if (!draft.age || isNaN(ageNum) || ageNum < 1 || ageNum > 130) errs.age = 'Age must be between 1 and 130.';
      const digits = draft.phone.replace(/[\s\-+()]/g, '');
      if (!/^\d{10,15}$/.test(digits)) errs.phone = 'Enter a valid 10 to 15 digit phone number.';
      if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(draft.email)) errs.email = 'Enter a valid email address.';
      if (!draft.address) errs.address = 'Home address is required.';
      state.regErrors = errs;
      if (Object.keys(errs).length > 0) {
        render();
        return;
      }
      try {
        const res = await api('/api/patients', { method: 'POST', body: JSON.stringify(draft) });
        state.regErrors = {};
        state.regDraft = { name: '', email: '', phone: '', age: '', gender: 'Male', address: '', consent: true };
        await refreshState();
        showToast(`Patient registered! Assigned ID: PT-${res.patient.id}`);
        navigate('patient-search', { patientId: res.patient.id });
      } catch (err) {
        state.regErrors = { email: err.message };
        showToast(err.message, true);
        render();
      }
    });
  }

  // Screen 06: Appointment booking
  const bookPat = document.getElementById('book-patient');
  if (bookPat) bookPat.addEventListener('change', (e) => { state.bookingPatientId = Number(e.target.value); render(); });
  const bookDoc = document.getElementById('book-doctor');
  if (bookDoc) bookDoc.addEventListener('change', (e) => { state.bookingDoctorId = Number(e.target.value); render(); });
  const bookReason = document.getElementById('book-reason');
  if (bookReason) {
    bookReason.addEventListener('input', (e) => {
      state.bookingReason = e.target.value;
      const sr = document.getElementById('summary-reason');
      if (sr) sr.textContent = state.bookingReason || '—';
    });
  }
  const calPrev = document.getElementById('cal-prev');
  if (calPrev) calPrev.addEventListener('click', () => {
    state.calMonth--;
    if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
    state.calDay = 1;
    render();
  });
  const calNext = document.getElementById('cal-next');
  if (calNext) calNext.addEventListener('click', () => {
    state.calMonth++;
    if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
    state.calDay = 1;
    render();
  });
  document.querySelectorAll('[data-cal-day]').forEach(btn => {
    btn.addEventListener('click', () => { state.calDay = Number(btn.dataset.calDay); render(); });
  });
  document.querySelectorAll('[data-time-slot]').forEach(btn => {
    btn.addEventListener('click', () => { state.bookingTime = btn.dataset.timeSlot; render(); });
  });
  const confirmBookBtn = document.getElementById('confirm-booking-btn');
  if (confirmBookBtn) {
    confirmBookBtn.addEventListener('click', async () => {
      try {
        const res = await api('/api/appointments', {
          method: 'POST',
          body: JSON.stringify({
            patientId: state.bookingPatientId,
            doctorId: state.bookingDoctorId,
            date: selectedBookingDateStr(),
            time: state.bookingTime,
            reason: state.bookingReason.trim() || 'Consultation'
          })
        });
        await refreshState();
        showToast(`Appointment #${res.appointment.id} booked successfully!`);
        navigate('appt-cancel');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Screen 07: Appointment cancellation
  document.querySelectorAll('[data-cancel-tab]').forEach(btn => {
    btn.addEventListener('click', () => { state.cancelTab = btn.dataset.cancelTab; render(); });
  });
  document.querySelectorAll('[data-select-cancel]').forEach(row => {
    row.addEventListener('click', () => { state.selectedCancelApptId = Number(row.dataset.selectCancel); render(); });
  });
  const confirmCancelBtn = document.getElementById('confirm-cancel-appt-btn');
  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener('click', async () => {
      const id = Number(confirmCancelBtn.dataset.aid);
      const cancelReason = document.getElementById('cancel-reason')?.value.trim() || 'Cancelled by staff';
      const note = document.getElementById('cancel-note')?.value.trim() || '';
      try {
        await api(`/api/appointments/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ cancelReason, note })
        });
        await refreshState();
        showToast(`Appointment #${id} cancelled successfully.`);
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }
  const keepBtn = document.getElementById('keep-appt-btn');
  if (keepBtn) keepBtn.addEventListener('click', () => showToast('Appointment kept as scheduled.'));

  // Screen 08: Doctor appointments
  const activeDocSel = document.getElementById('active-doctor-select');
  if (activeDocSel) {
    activeDocSel.addEventListener('change', (e) => {
      state.activeDoctorId = Number(e.target.value);
      state.selectedDocApptId = null;
      render();
    });
  }
  document.querySelectorAll('[data-select-doc-appt]').forEach(row => {
    row.addEventListener('click', () => { state.selectedDocApptId = Number(row.dataset.selectDocAppt); render(); });
  });
  document.querySelectorAll('[data-set-status]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api('/api/appointments/status', {
          method: 'POST',
          body: JSON.stringify({ id: Number(btn.dataset.aid), status: btn.dataset.setStatus })
        });
        await refreshState();
        showToast(`Appointment marked as ${btn.dataset.setStatus}.`);
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
  const startConsultBtn = document.getElementById('start-consult-btn');
  if (startConsultBtn) {
    startConsultBtn.addEventListener('click', () => {
      navigate('medical-record', {
        patientId: Number(startConsultBtn.dataset.pid),
        doctorId: Number(startConsultBtn.dataset.did)
      });
    });
  }
  const docHistBtn = document.getElementById('doc-view-history-btn');
  if (docHistBtn) {
    docHistBtn.addEventListener('click', () => showPatientRecordsModal(Number(docHistBtn.dataset.pid)));
  }
  const docProfileBtn = document.getElementById('view-doc-profile-btn');
  if (docProfileBtn) {
    docProfileBtn.addEventListener('click', () => {
      const doc = getDoctor(state.activeDoctorId);
      if (!doc) return;
      openModal('Doctor Profile', `
        <div class="summary-kv"><span class="k">Doctor ID</span><span class="v">#${doc.id}</span></div>
        <div class="summary-kv"><span class="k">Name</span><span class="v">Dr. ${esc(doc.name)}</span></div>
        <div class="summary-kv"><span class="k">Email</span><span class="v">${esc(doc.email)}</span></div>
        <div class="summary-kv"><span class="k">Phone</span><span class="v">${esc(doc.phone)}</span></div>
        <div class="summary-kv"><span class="k">Specialization</span><span class="v">${esc(doc.specialization)}</span></div>
        <div class="summary-kv"><span class="k">Qualification</span><span class="v">${esc(doc.qualification)}</span></div>
      `);
    });
  }

  // Screen 09: Medical record
  const recPat = document.getElementById('rec-patient-select');
  if (recPat) recPat.addEventListener('change', (e) => { state.recordPatientId = Number(e.target.value); render(); });
  const recDoc = document.getElementById('rec-doctor-select');
  if (recDoc) recDoc.addEventListener('change', (e) => { state.recordDoctorId = Number(e.target.value); render(); });
  const recForm = document.getElementById('medical-record-form');
  if (recForm) {
    recForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const after = e.submitter?.dataset?.after || 'stay';
      try {
        const res = await api('/api/records', {
          method: 'POST',
          body: JSON.stringify({
            patientId: state.recordPatientId,
            doctorId: state.recordDoctorId,
            diagnosis: document.getElementById('rec-diagnosis').value.trim(),
            symptoms: document.getElementById('rec-symptoms').value.trim(),
            notes: document.getElementById('rec-notes').value.trim()
          })
        });
        await refreshState();
        showToast(`Medical record #${res.record.id} saved.`);
        if (after === 'rx') {
          navigate('prescription', { patientId: state.recordPatientId, doctorId: state.recordDoctorId });
        } else {
          render();
        }
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Screen 10: Prescription
  const rxPat = document.getElementById('rx-patient-select');
  if (rxPat) rxPat.addEventListener('change', (e) => { state.rxPatientId = Number(e.target.value); render(); });
  const rxDoc = document.getElementById('rx-doctor-select');
  if (rxDoc) rxDoc.addEventListener('change', (e) => { state.rxDoctorId = Number(e.target.value); render(); });

  const syncRxPreview = () => {
    const med = document.getElementById('rx-medicine')?.value || '';
    const dose = document.getElementById('rx-dosage')?.value || '';
    const dur = document.getElementById('rx-duration')?.value || '';
    const inst = document.getElementById('rx-instructions')?.value || '';
    const fu = document.getElementById('rx-followup')?.value || '';
    state.rxDraft = { ...state.rxDraft, medicine: med, dosage: dose, duration: dur, instructions: inst, followUp: fu };
    const pMed = document.getElementById('rx-prev-med');
    const pDose = document.getElementById('rx-prev-dose');
    const pInst = document.getElementById('rx-prev-inst');
    const pFu = document.getElementById('rx-prev-fu');
    if (pMed) pMed.innerHTML = `01 &nbsp;&nbsp;${esc(med || 'Medicine')}`;
    if (pDose) pDose.textContent = `${dose || '—'} · ${dur || '—'}`;
    if (pInst) pInst.textContent = inst || '—';
    if (pFu) pFu.textContent = fu || '—';
  };
  ['rx-medicine', 'rx-dosage', 'rx-duration', 'rx-instructions', 'rx-followup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', syncRxPreview);
  });
  const rxForm = document.getElementById('prescription-form');
  if (rxForm) {
    rxForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!document.getElementById('rx-reviewed').checked) {
        showToast('Please confirm allergy & plan review before signing.', true);
        return;
      }
      try {
        const res = await api('/api/prescriptions', {
          method: 'POST',
          body: JSON.stringify({
            patientId: state.rxPatientId,
            doctorId: state.rxDoctorId,
            medicine: state.rxDraft.medicine.trim(),
            dosage: state.rxDraft.dosage.trim(),
            duration: state.rxDraft.duration.trim(),
            instructions: state.rxDraft.instructions.trim()
          })
        });
        await refreshState();
        showToast(`Prescription #${res.prescription.id} signed and saved!`);
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Screen 11: Bill generation
  const billPat = document.getElementById('bill-patient');
  if (billPat) billPat.addEventListener('change', (e) => { state.billPatientId = Number(e.target.value); render(); });
  const syncBillSummary = () => {
    state.billFees.consultation = document.getElementById('fee-consult')?.value || '0';
    state.billFees.medicine = document.getElementById('fee-medicine')?.value || '0';
    state.billFees.test = document.getElementById('fee-test')?.value || '0';
    state.billFees.note = document.getElementById('bill-note')?.value || '';
    const c = parseFloat(state.billFees.consultation) || 0;
    const m = parseFloat(state.billFees.medicine) || 0;
    const t = parseFloat(state.billFees.test) || 0;
    document.getElementById('sum-consult').textContent = formatRs(c);
    document.getElementById('sum-medicine').textContent = formatRs(m);
    document.getElementById('sum-test').textContent = formatRs(t);
    document.getElementById('sum-total').textContent = formatRs(c + m + t);
  };
  ['fee-consult', 'fee-medicine', 'fee-test', 'bill-note'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', syncBillSummary);
  });
  const billStatus = document.getElementById('bill-status');
  if (billStatus) billStatus.addEventListener('change', (e) => { state.billFees.status = e.target.value; });
  const genBillBtn = document.getElementById('generate-bill-btn');
  if (genBillBtn) {
    genBillBtn.addEventListener('click', async () => {
      try {
        const res = await api('/api/bills', {
          method: 'POST',
          body: JSON.stringify({
            patientId: state.billPatientId,
            consultationFee: state.billFees.consultation || '0',
            medicineFee: state.billFees.medicine || '0',
            testFee: state.billFees.test || '0',
            status: state.billFees.status
          })
        });
        await refreshState();
        state.selectedBillId = res.bill.id;
        showToast(`Bill #${res.bill.id} generated (${formatRs(res.bill.total)}).`);
        navigate('bill-view');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Screen 12: Bill viewing
  document.querySelectorAll('[data-bill-filter]').forEach(btn => {
    btn.addEventListener('click', () => { state.billFilter = btn.dataset.billFilter; render(); });
  });
  document.querySelectorAll('[data-select-bill]').forEach(row => {
    row.addEventListener('click', () => { state.selectedBillId = Number(row.dataset.selectBill); render(); });
  });
  const retryBillsBtn = document.getElementById('retry-bills-btn');
  if (retryBillsBtn) retryBillsBtn.addEventListener('click', async () => { await refreshState(); render(); });
  const payBtn = document.getElementById('record-payment-btn');
  if (payBtn) {
    payBtn.addEventListener('click', async () => {
      const id = Number(payBtn.dataset.bid);
      try {
        await api('/api/bills/pay', { method: 'POST', body: JSON.stringify({ id }) });
        await refreshState();
        showToast(`Payment recorded for BILL-${id}.`);
        render();
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }
  const dlBillBtn = document.getElementById('download-bill-btn');
  if (dlBillBtn) {
    dlBillBtn.addEventListener('click', () => {
      const b = state.data.bills.find(x => x.id === Number(dlBillBtn.dataset.bid));
      if (!b) return;
      const pt = getPatient(b.patientId);
      const txt = [
        'WELLNEST — SMART CLINIC MANAGEMENT SYSTEM',
        `INVOICE: BILL-${b.id} (${b.paid ? 'PAID' : 'UNPAID'})`,
        `Patient: ${pt ? pt.name : 'ID ' + b.patientId} (PT-${b.patientId})`,
        '----------------------------------------',
        `Consultation Fee : ${formatRs(b.consultationFee)}`,
        `Medicine Fee     : ${formatRs(b.medicineFee)}`,
        `Test Fee         : ${formatRs(b.testFee)}`,
        '----------------------------------------',
        `TOTAL            : ${formatRs(b.total)}`
      ].join('\n');
      downloadText(`BILL-${b.id}.txt`, txt, 'text/plain');
      showToast(`Downloaded BILL-${b.id}.txt`);
    });
  }
}

function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ============================================================
// BOOTSTRAP
// ============================================================
(async function init() {
  await refreshState();
  render();
})();
