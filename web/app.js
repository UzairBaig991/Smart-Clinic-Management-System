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
                      <div style="font-size:11px;color:var(--muted);margin-top:3px;">${esc(d.specialization)} Â· ${esc(d.qualification)}</div>
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
// SCREEN 04 Â· PATIENT SEARCH
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
          ${q ? `Matching â€œ${esc(state.patientSearchQuery)}â€ Â· ` : ''}Search by name, patient ID, phone, or email
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
                  <td>${p.age} yrs Â· ${esc(p.gender)}</td>
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
            <p style="font-size:12px;color:var(--muted);margin-top:6px;">PT-${selected.id} &nbsp;Â·&nbsp; ${recCount} medical ${recCount === 1 ? 'record' : 'records'}</p>
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
              ${nextAppt ? `${esc(formatPrettyDate(nextAppt.date))}, ${esc(nextAppt.time)} Â· ${esc(nextAppt.reason)}` : 'No upcoming appointment'}
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
// SCREEN 05 Â· PATIENT REGISTRATION
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
              <label for="reg-age">Age (1â€“130) *</label>
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
              <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px;">Confirm the patientâ€™s full name, age, and gender.</p>
            </div>
          </div>
          <div style="display:flex;gap:14px;">
            <span style="font-size:12px;font-weight:600;color:var(--primary);">02</span>
            <div>
              <div style="font-size:13px;font-weight:500;">Add contact details</div>
              <p style="font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px;">Use a valid 10â€“15 digit phone number and unique email address.</p>
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

        <button class="link-btn" style="text-align:left;" data-nav="patient-search">Already registered? &nbsp;Search patients â†’</button>
      </div>
    </div>
  `;
}

// ============================================================
// SCREEN 06 Â· APPOINTMENT BOOKING
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
      <span style="color:#a4b6af;">â†’</span>
      <span class="booking-step-active">02 &nbsp;Date &amp; time</span>
      <span style="color:#a4b6af;">â†’</span>
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
                ${esc(p.name)} Â· PT-${p.id} Â· ${p.age} yrs (${esc(p.gender)})
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
                  Dr. ${esc(d.name)} Â· ${esc(d.specialization)}
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
                <button type="button" id="cal-prev">â€¹</button>
                <button type="button" id="cal-next">â€º</button>
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
            ${selPatient ? `PT-${selPatient.id} Â· ${esc(selPatient.gender)}, ${selPatient.age} years` : 'No patient registered'}
          </div>
        </div>
        <div class="divider"></div>
        <div class="summary-kv"><span class="k">Doctor</span><span class="v">${selDoctor ? 'Dr. ' + esc(selDoctor.name) : 'â€”'}</span></div>
        <div class="summary-kv"><span class="k">Specialty</span><span class="v">${esc(selDoctor?.specialization || 'â€”')}</span></div>
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
// SCREEN 07 Â· APPOINTMENT CANCELLATION
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
        <p style="font-size:12px;color:var(--muted);margin-top:-4px;">${list.length} ${list.length === 1 ? 'appointment' : 'appointments'} Â· Main clinic</p>

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
                  Dr. ${esc(d ? d.name : '#' + a.doctorId)} Â· ${esc(a.reason)}
                  ${tab === 'cancelled' && a.cancelReason ? ` Â· Reason: ${esc(a.cancelReason)}` : ''}
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
            <div style="font-size:11px;color:var(--muted);">APT-${selected.id} Â· PT-${selected.patientId}</div>
            <div style="font-size:12px;color:var(--ink);">${esc(formatPrettyDate(selected.date))} Â· ${esc(selected.time)}</div>
            <div style="font-size:12px;color:var(--muted);">Dr. ${esc(selDoctor ? selDoctor.name : '#' + selected.doctorId)} Â· ${esc(selected.reason)}</div>
          </div>

          <div class="field-group">
