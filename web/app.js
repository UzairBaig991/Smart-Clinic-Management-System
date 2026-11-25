/* ============================================================
   wellnest. â€” Smart Clinic Management System Frontend
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
// SCREEN 01 Â· ADMIN / DOCTOR / RECEPTIONIST LOGIN
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
          <input id="login-pass" class="field-input" type="password" value="admin123" placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required />
        </div>
        <div class="login-prefs">
          <label class="checkbox-label"><input type="checkbox" checked /> Remember this device</label>
          <button type="button" class="link-btn" id="forgot-pass-btn">Forgot password?</button>
        </div>
        <button type="submit" class="btn-primary btn-full" ${state.loginLocked ? 'disabled' : ''}>Sign in securely â†’</button>
        <div class="login-quick-hint">
          Admin credentials: <span>admin</span> / <span>admin123</span> (max 3 attempts)
        </div>
      </form>
    `;
  } else if (tab === 'doctor') {
    const docOptions = state.data.doctors.map(d => `ID ${d.id} (Dr. ${esc(d.name)})`).join(' Â· ');
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
        <button type="submit" class="btn-primary btn-full">Enter Doctor Portal â†’</button>
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
        <button type="submit" class="btn-primary btn-full">Open Receptionist Workspace â†’</button>
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
            subtitle: `${d.specialization} Â· ID ${d.id}`,
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
          <div class="clinic-selector-loc">Main clinic Â· SCD Project</div>
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
          <button class="sidebar-support-link" id="help-center-btn">System overview &amp; guide â†’</button>
        </div>
        <div class="sidebar-account">
          <div class="sidebar-account-name">${esc(state.session.name)}</div>
          <div class="sidebar-account-role">${esc(state.session.subtitle)}</div>
          <button class="sidebar-logout" id="logout-btn">â† Sign out / Switch role</button>
        </div>
      </aside>

      <div class="main-workspace">
        <header class="top-bar">
          <div>Workspace &nbsp;&nbsp;/&nbsp;&nbsp; ${esc(meta.crumb)}</div>
          <div class="top-bar-right">
            <span>${esc(portalLabel)} &nbsp;&nbsp;Â·&nbsp;&nbsp; ${esc(todayStr)}</span>
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
// SCREEN 02 Â· SYSTEM STATISTICS
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
      <span class="eyebrow-date">LIVE SYSTEM METRICS Â· ${stats.totalMedicalRecords} RECORDS Â· ${stats.totalPrescriptions} PRESCRIPTIONS</span>
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
        <span class="kpi-sub">${completedCount} completed Â· ${waitingCount} active</span>
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
            <p style="font-size:11px;color:var(--muted);margin-top:6px;">${stats.totalAppointments} scheduled visits Â· ${stats.totalPrescriptions} prescriptions issued</p>
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
        <button class="link-btn" data-nav="appt-cancel">View all appointments â†’</button>
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
                  <td>${esc(formatPrettyDate(a.date))} Â· ${esc(a.time)}</td>
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
// SCREEN 03 Â· DOCTOR MANAGEMENT
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
            <p style="font-size:12px;color:var(--muted);margin-top:6px;">${doctors.length} registered doctors Â· All active</p>
