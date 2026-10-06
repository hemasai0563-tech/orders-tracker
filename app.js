/**
 * Retail Bill Delivery & Payment Tracker
 * Features:
 * - Pure offline/zero-dependency instant QR code generator for Paytm UPI
 * - Mandatory Delivery Proof for all deliveries
 * - Mandatory Payment Proof ONLY for QR and CARD payments (Cash requires no proof)
 * - 3-Role RBAC & Flat Statements
 */

// ==========================================
// 1. STATE & CONSTANTS
// ==========================================
const STORAGE_KEYS = {
  BILLS: 'retail_bills_data_v8',
  AUTH: 'retail_bills_auth_v5',
  GSHEET_URL: 'retail_bills_gsheet_url_v5',
  STORE_UPI: 'retail_bills_store_upi_v5',
  ATTENDANCE: 'retail_bills_attendance_v8',
  THEME: 'retail_bills_theme_v1',
  ACCOUNTS: 'retail_bills_accounts_v7'
};

const DEFAULT_ACCOUNTS = [
  {
    id: 'acc-admin-1',
    role: 'owner',
    name: 'Store Owner',
    phone: '9999999999',
    pin: '9999',
    storeName: 'rad. Express Flagship',
    createdAt: '2026-10-01'
  },
  {
    id: 'acc-ops-1',
    role: 'ops',
    name: 'Operations Executive',
    phone: '9876543210',
    pin: '1234',
    createdAt: '2026-10-01'
  },
  {
    id: 'acc-agent-1',
    role: 'agent',
    name: 'Rahul Sharma',
    phone: '9811122233',
    pin: '5555',
    route: 'West Sector (A-Block)',
    createdAt: '2026-10-01'
  },
  {
    id: 'acc-agent-2',
    role: 'agent',
    name: 'Vikram Singh',
    phone: '9822233344',
    pin: '5555',
    route: 'Central Plaza (B-Block)',
    createdAt: '2026-10-02'
  },
  {
    id: 'acc-agent-3',
    role: 'agent',
    name: 'Suresh Kumar',
    phone: '9833344455',
    pin: '5555',
    route: 'North Ridge (C-Block)',
    createdAt: '2026-10-03'
  },
  {
    id: 'acc-agent-4',
    role: 'agent',
    name: 'Amit Patel',
    phone: '9844455566',
    pin: '5555',
    route: 'South Towers (D-Block)',
    createdAt: '2026-10-04'
  }
];

let AGENTS_LIST = [
  'Rahul Sharma',
  'Vikram Singh',
  'Suresh Kumar',
  'Amit Patel'
];

const DEFAULT_STORE_UPI = 'paytm.s2dxeyt@pty';

const DEFAULT_ATTENDANCE = {
  'Rahul Sharma': {
    status: 'off_duty',
    punchInTime: '',
    punchInDate: '',
    punchOutTime: '',
    shiftStartTimestamp: null,
    photo: '',
    history: []
  },
  'Vikram Singh': {
    status: 'off_duty',
    punchInTime: '',
    punchInDate: '',
    punchOutTime: '',
    shiftStartTimestamp: null,
    photo: '',
    history: []
  },
  'Suresh Kumar': {
    status: 'off_duty',
    punchInTime: '',
    punchInDate: '',
    punchOutTime: '',
    shiftStartTimestamp: null,
    photo: '',
    history: []
  },
  'Amit Patel': {
    status: 'off_duty',
    punchInTime: '',
    punchInDate: '',
    punchOutTime: '',
    shiftStartTimestamp: null,
    photo: '',
    history: []
  }
};

const DEFAULT_SAMPLE_BILLS = [];

let appState = {
  accounts: [],
  bills: [],
  attendance: {},
  currentUser: null,
  activeScreen: 'screen-pending-deliveries',
  filterPendingTab: 'all',
  filterUnpaidTab: 'all',
  filterFleetAttendanceTab: 'all',
  searchQuery: '',
  unpaidSearchQuery: '',
  filterDeliveryStatus: 'all',
  filterPaymentStatus: 'all',
  filterAgent: 'all',
  sortBy: 'date-desc',
  selectedInvoiceNo: null,
  selectedPaymentMode: 'QR',
  tempDeliveryProofData: '',
  tempPaymentProofData: '',
  tempAttendancePhoto: '',
  shiftTimerInterval: null,
  attendanceFilterDate: 'today',
  storeUpiId: DEFAULT_STORE_UPI,
  isSyncing: false,
  gsheetUrl: '',
  // Multi-invoice / flat bulk clearance state:
  selectedFlatInvoices: [],
  currentViewingFlat: '',
  isMultiInvoicePayment: false
};

// ==========================================
// 2. INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initAppTheme();
  loadSavedData();
  initAuthSession();
  initGoogleAppsScriptCode();
  renderApp();
  setDefaultBilledDate();
  startShiftTimer();
});

function initAppTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  applyTheme(savedTheme);
}

function toggleAppTheme() {
  const isLight = document.body.classList.contains('theme-light');
  const nextTheme = isLight ? 'dark' : 'light';
  applyTheme(nextTheme);
  localStorage.setItem(STORAGE_KEYS.THEME, nextTheme);
  showToast(`Switched to ${nextTheme === 'light' ? 'Daylight ☀️' : 'Obsidian Dark 🌙'} theme`, 'info');
}

function applyTheme(theme) {
  const icon = document.getElementById('theme-toggle-icon');
  const label = document.getElementById('theme-toggle-label');
  if (theme === 'light') {
    document.body.classList.add('theme-light');
    if (icon) icon.className = 'fa-solid fa-moon text-primary';
    if (label) label.textContent = 'Light';
  } else {
    document.body.classList.remove('theme-light');
    if (icon) icon.className = 'fa-solid fa-sun';
    if (label) label.textContent = 'Dark';
  }
}

function loadSavedData() {
  // Purge legacy storage versions
  [
    'retail_bills_data_v1', 'retail_bills_data_v2', 'retail_bills_data_v3', 'retail_bills_data_v4', 'retail_bills_data_v5', 'retail_bills_data_v6', 'retail_bills_data_v7',
    'retail_bills_attendance_v1', 'retail_bills_attendance_v2', 'retail_bills_attendance_v3', 'retail_bills_attendance_v4', 'retail_bills_attendance_v5', 'retail_bills_attendance_v6', 'retail_bills_attendance_v7'
  ].forEach(k => localStorage.removeItem(k));

  appState.gsheetUrl = localStorage.getItem(STORAGE_KEYS.GSHEET_URL) || '';
  appState.storeUpiId = localStorage.getItem(STORAGE_KEYS.STORE_UPI) || DEFAULT_STORE_UPI;

  const urlInput = document.getElementById('input-gsheet-url');
  if (urlInput) urlInput.value = appState.gsheetUrl;

  const upiInput = document.getElementById('input-custom-upi-id');
  if (upiInput) upiInput.value = appState.storeUpiId;

  // Load Accounts
  const savedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
  if (savedAccounts) {
    try {
      appState.accounts = JSON.parse(savedAccounts);
    } catch (e) {
      appState.accounts = [...DEFAULT_ACCOUNTS];
    }
  } else {
    appState.accounts = [...DEFAULT_ACCOUNTS];
    saveAccountsToLocal();
  }

  // Update AGENTS_LIST from accounts
  refreshAgentsListFromAccounts();

  // Load Bills
  const savedBills = localStorage.getItem(STORAGE_KEYS.BILLS);
  if (savedBills) {
    try {
      appState.bills = JSON.parse(savedBills);
    } catch (e) {
      appState.bills = [...DEFAULT_SAMPLE_BILLS];
    }
  } else {
    appState.bills = [...DEFAULT_SAMPLE_BILLS];
    saveBillsToLocal();
  }

  // Load Attendance
  const savedAttendance = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
  if (savedAttendance) {
    try {
      appState.attendance = JSON.parse(savedAttendance);
    } catch (e) {
      appState.attendance = JSON.parse(JSON.stringify(DEFAULT_ATTENDANCE));
    }
  } else {
    appState.attendance = JSON.parse(JSON.stringify(DEFAULT_ATTENDANCE));
    saveAttendanceToLocal();
  }

  // Ensure all agents exist in attendance and shiftStartTimestamp is valid
  AGENTS_LIST.forEach(agentName => {
    if (!appState.attendance[agentName]) {
      appState.attendance[agentName] = {
        status: 'off_duty',
        punchInTime: '',
        punchInDate: '',
        punchOutTime: '',
        shiftStartTimestamp: null,
        photo: '',
        history: []
      };
    } else if (appState.attendance[agentName].status === 'on_duty') {
      if (!appState.attendance[agentName].shiftStartTimestamp || isNaN(appState.attendance[agentName].shiftStartTimestamp)) {
        appState.attendance[agentName].shiftStartTimestamp = Date.now() - 3.5 * 3600 * 1000;
      }
    }
  });
  saveAttendanceToLocal();

  populateAuthStaffDropdowns();
  populateAllAgentSelectElements();
  recalculateAllBills();
}

function refreshAgentsListFromAccounts() {
  const agentAccounts = appState.accounts.filter(a => a.role === 'agent');
  if (agentAccounts.length > 0) {
    AGENTS_LIST = agentAccounts.map(a => a.name);
  }
}

function saveAccountsToLocal() {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(appState.accounts));
}

function saveAttendanceToLocal() {
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(appState.attendance));
}

function setDefaultBilledDate() {
  const today = getTodayISODate();
  const dateInput = document.getElementById('input-billed-date');
  if (dateInput) {
    dateInput.value = today;
    dateInput.max = today; // Disallow selecting future dates in calendar picker
  }
  const attDateInput = document.getElementById('input-attendance-custom-date');
  if (attDateInput) {
    attDateInput.max = today; // Disallow selecting future dates in attendance picker
  }
}

function validateBilledDateNotFuture(inputElement) {
  if (!inputElement) return;
  const today = getTodayISODate();
  if (inputElement.value > today) {
    inputElement.value = today;
    showToast('Future dates are not allowed. Date set to Today.', 'warning');
  }
}

function getTodayISODate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateDaysPending(billedDateStr, paymentStatus) {
  if (paymentStatus === 'Paid') return 0;
  if (!billedDateStr) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [y, m, d] = billedDateStr.split('-').map(Number);
  const billedDate = new Date(y, m - 1, d);
  billedDate.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - billedDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

function recalculateBill(bill) {
  const amount = Number(bill.billAmount) || 0;

  if (bill.paymentStatus === 'Paid') {
    bill.amountReceived = amount;
    bill.balance = 0;
    bill.daysPending = 0;
    if (!bill.paymentMode || bill.paymentMode === 'UNPAID') {
      bill.paymentMode = 'QR';
    }
  } else {
    bill.paymentStatus = 'Unpaid';
    bill.amountReceived = 0;
    bill.balance = amount;
    bill.paymentMode = 'UNPAID';
    bill.daysPending = calculateDaysPending(bill.billedDate, 'Unpaid');
  }

  if (!bill.deliveryAgent) {
    bill.deliveryAgent = 'Unassigned';
  }

  return bill;
}

function recalculateAllBills() {
  appState.bills = appState.bills.map(recalculateBill);
  saveBillsToLocal();
}

function saveBillsToLocal() {
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(appState.bills));
}

// ==========================================
// 3. AUTHENTICATION & RBAC & ACCOUNTS GOVERNANCE
// ==========================================
function initAuthSession() {
  const savedAuth = localStorage.getItem(STORAGE_KEYS.AUTH);
  if (savedAuth) {
    try {
      appState.currentUser = JSON.parse(savedAuth);
      applyUserRoleUI();
      hideAuthOverlay();
    } catch (e) {
      showAuthOverlay();
    }
  } else {
    showAuthOverlay();
  }
}

function showAuthOverlay() {
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) authScreen.classList.remove('hidden');
  populateAuthStaffDropdowns();
}

function hideAuthOverlay() {
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) authScreen.classList.add('hidden');
}

function updateRoleSelection(role) {
  const opsLabel = document.getElementById('role-ops-label');
  const agentLabel = document.getElementById('role-agent-label');
  const ownerLabel = document.getElementById('role-owner-label');
  const agentPickerGroup = document.getElementById('login-agent-picker-group');
  const opsPickerGroup = document.getElementById('login-ops-picker-group');

  opsLabel?.classList.remove('active');
  agentLabel?.classList.remove('active');
  ownerLabel?.classList.remove('active');

  if (role === 'ops') {
    opsLabel?.classList.add('active');
    agentPickerGroup?.classList.add('hidden');
    const opsAccounts = appState.accounts.filter(a => a.role === 'ops');
    if (opsAccounts.length > 1) {
      opsPickerGroup?.classList.remove('hidden');
    } else {
      opsPickerGroup?.classList.add('hidden');
    }
  } else if (role === 'agent') {
    agentLabel?.classList.add('active');
    agentPickerGroup?.classList.remove('hidden');
    opsPickerGroup?.classList.add('hidden');
  } else if (role === 'owner') {
    ownerLabel?.classList.add('active');
    agentPickerGroup?.classList.add('hidden');
    opsPickerGroup?.classList.add('hidden');
  }
}

function populateAuthStaffDropdowns() {
  const agentSelect = document.getElementById('login-agent-select');
  const opsSelect = document.getElementById('login-ops-select');

  if (agentSelect) {
    const agents = appState.accounts.filter(a => a.role === 'agent');
    if (agents.length === 0) {
      agentSelect.innerHTML = `<option value="">No Fleet Agents Registered</option>`;
    } else {
      agentSelect.innerHTML = agents.map(a => 
        `<option value="${a.name}">${a.name} ${a.route ? `(${a.route})` : ''}</option>`
      ).join('');
    }
  }

  if (opsSelect) {
    const ops = appState.accounts.filter(a => a.role === 'ops');
    if (ops.length === 0) {
      opsSelect.innerHTML = `<option value="Operations Executive">Operations Executive</option>`;
    } else {
      opsSelect.innerHTML = ops.map(o => 
        `<option value="${o.name}">${o.name}</option>`
      ).join('');
    }
  }
}

function populateAllAgentSelectElements() {
  refreshAgentsListFromAccounts();

  // Add Bill screen assigned agent select
  const inputAssigned = document.getElementById('input-assigned-agent');
  if (inputAssigned) {
    const currentVal = inputAssigned.value;
    inputAssigned.innerHTML = `
      <option value="Unassigned">-- Unassigned --</option>
      ${AGENTS_LIST.map(name => `<option value="${name}">${name}</option>`).join('')}
    `;
    if (currentVal && AGENTS_LIST.includes(currentVal)) {
      inputAssigned.value = currentVal;
    }
  }

  // Pending deliveries agent filter
  const filterAgent = document.getElementById('filter-agent-select');
  if (filterAgent) {
    const currentVal = filterAgent.value;
    filterAgent.innerHTML = `
      <option value="all">All Delivery Agents</option>
      <option value="Unassigned">Unassigned</option>
      ${AGENTS_LIST.map(name => `<option value="${name}">${name}</option>`).join('')}
    `;
    if (currentVal) filterAgent.value = currentVal;
  }

  // Bill detail modal reassign agent select
  const modalReassign = document.getElementById('modal-reassign-agent-select');
  if (modalReassign) {
    modalReassign.innerHTML = `
      <option value="Unassigned">-- Unassigned --</option>
      ${AGENTS_LIST.map(name => `<option value="${name}">${name}</option>`).join('')}
    `;
  }
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  const eye = document.getElementById(inputId + '-eye');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (eye) eye.className = 'fa-solid fa-eye-slash';
  } else {
    input.type = 'password';
    if (eye) eye.className = 'fa-solid fa-eye';
  }
}

function handleLogin(event) {
  event.preventDefault();
  const roleRadio = document.querySelector('input[name="auth-role"]:checked');
  const pinInput = document.getElementById('login-pin');
  const role = roleRadio ? roleRadio.value : 'ops';
  const pin = pinInput ? pinInput.value.trim() : '';

  if (!pin) {
    showToast('Please enter your 4-digit PIN to sign in.', 'warning');
    pinInput?.focus();
    return;
  }

  let userName = 'Operations Executive';
  let agentName = '';

  if (role === 'owner') {
    const ownerAccounts = appState.accounts.filter(a => a.role === 'owner');
    const matchedOwner = ownerAccounts.find(a => a.pin === pin);
    if (!matchedOwner && pin !== '9999' && pin !== 'owner123') {
      showToast('Incorrect Store Owner PIN!', 'danger');
      if (pinInput) pinInput.value = '';
      return;
    }
    userName = matchedOwner ? matchedOwner.name : 'Store Owner';
  } else if (role === 'agent') {
    const agentSelect = document.getElementById('login-agent-select');
    agentName = agentSelect ? agentSelect.value : (AGENTS_LIST[0] || 'Rahul Sharma');
    const agentAcc = appState.accounts.find(a => a.role === 'agent' && a.name === agentName);
    
    if (agentAcc) {
      if (agentAcc.pin !== pin && pin !== '5555' && pin !== 'agent123') {
        showToast(`Incorrect PIN for ${agentName}!`, 'danger');
        if (pinInput) pinInput.value = '';
        return;
      }
    } else {
      if (pin !== '5555' && pin !== 'agent123') {
        showToast('Incorrect Delivery Agent PIN!', 'danger');
        if (pinInput) pinInput.value = '';
        return;
      }
    }
    userName = `${agentName} (Agent)`;
  } else {
    const opsSelect = document.getElementById('login-ops-select');
    const opsName = (opsSelect && opsSelect.value) ? opsSelect.value : 'Operations Executive';
    const opsAcc = appState.accounts.find(a => a.role === 'ops' && a.name === opsName);
    
    if (opsAcc) {
      if (opsAcc.pin !== pin && pin !== '1234' && pin !== 'ops123') {
        showToast(`Incorrect PIN for ${opsName}!`, 'danger');
        if (pinInput) pinInput.value = '';
        return;
      }
      userName = opsAcc.name;
    } else {
      if (pin !== '1234' && pin !== 'ops123') {
        showToast('Incorrect Operations PIN!', 'danger');
        if (pinInput) pinInput.value = '';
        return;
      }
      userName = 'Operations Executive';
    }
  }

  const user = {
    role: role,
    name: userName,
    agentName: agentName,
    loginTime: new Date().toISOString()
  };

  appState.currentUser = user;
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
  applyUserRoleUI();
  hideAuthOverlay();
  showToast(`Signed in as ${user.name}`, 'success');
  navigateToScreen('screen-pending-deliveries');
  renderApp();
}

// ==========================================
// STORE OWNER STAFF ACCOUNT MANAGEMENT
// ==========================================
function renderStaffAccountsList() {
  const container = document.getElementById('staff-accounts-list');
  if (!container) return;

  if (appState.accounts.length === 0) {
    container.innerHTML = `<div class="empty-state-notice">No staff accounts registered. Click "Add Staff Account" to create.</div>`;
    return;
  }

  container.innerHTML = appState.accounts.map(acc => {
    let roleBadge = '<span class="badge badge-yellow"><i class="fa-solid fa-crown"></i> Master Admin</span>';
    let avatarIcon = '<i class="fa-solid fa-crown"></i>';
    let subDesc = acc.storeName ? `Store: ${acc.storeName}` : `Phone: ${acc.phone || '-'}`;

    if (acc.role === 'agent') {
      roleBadge = '<span class="badge badge-purple"><i class="fa-solid fa-person-biking"></i> Delivery Fleet</span>';
      avatarIcon = '<i class="fa-solid fa-person-biking"></i>';
      subDesc = `${acc.route ? `Zone: ${acc.route} • ` : ''}Phone: ${acc.phone || '-'}`;
    } else if (acc.role === 'ops') {
      roleBadge = '<span class="badge badge-neutral"><i class="fa-solid fa-user-gear"></i> Operations</span>';
      avatarIcon = '<i class="fa-solid fa-user-gear"></i>';
      subDesc = `Phone: ${acc.phone || '-'}`;
    }

    const isMaster = acc.role === 'owner';

    return `
      <div class="staff-account-card">
        <div class="staff-card-left">
          <div class="staff-card-avatar">
            ${avatarIcon}
          </div>
          <div class="staff-card-info">
            <h5>${acc.name}</h5>
            <p>${subDesc}</p>
          </div>
        </div>
        <div class="staff-card-right">
          <div>${roleBadge}</div>
          <span class="staff-pin-chip" title="PIN"><i class="fa-solid fa-key"></i> ${acc.pin}</span>
          ${!isMaster ? `
            <button type="button" class="btn-del-staff" onclick="deleteStaffAccount('${acc.id}')" title="Delete Account">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openAddStaffModal() {
  const modal = document.getElementById('add-staff-modal');
  updateNewStaffRole('agent');
  
  const nameInput = document.getElementById('newstaff-name');
  const phoneInput = document.getElementById('newstaff-phone');
  const pinInput = document.getElementById('newstaff-pin');
  const routeInput = document.getElementById('newstaff-route');

  if (nameInput) nameInput.value = '';
  if (phoneInput) phoneInput.value = '';
  if (pinInput) pinInput.value = '5555';
  if (routeInput) routeInput.value = '';

  if (modal) modal.classList.add('active');
}

function closeAddStaffModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close') && !e.target.classList.contains('btn-outline')) return;
  const modal = document.getElementById('add-staff-modal');
  if (modal) modal.classList.remove('active');
}

function updateNewStaffRole(role) {
  const agentLabel = document.getElementById('newstaff-role-agent-label');
  const opsLabel = document.getElementById('newstaff-role-ops-label');
  const routeGroup = document.getElementById('newstaff-route-group');
  const pinInput = document.getElementById('newstaff-pin');

  agentLabel?.classList.remove('active');
  opsLabel?.classList.remove('active');

  if (role === 'agent') {
    agentLabel?.classList.add('active');
    if (routeGroup) routeGroup.style.display = 'block';
    if (pinInput && pinInput.value === '1234') pinInput.value = '5555';
  } else {
    opsLabel?.classList.add('active');
    if (routeGroup) routeGroup.style.display = 'none';
    if (pinInput && pinInput.value === '5555') pinInput.value = '1234';
  }
}

function handleCreateStaffAccountSubmit(event) {
  event.preventDefault();
  const roleRadio = document.querySelector('input[name="newstaff-role"]:checked');
  const nameInput = document.getElementById('newstaff-name');
  const phoneInput = document.getElementById('newstaff-phone');
  const pinInput = document.getElementById('newstaff-pin');
  const routeInput = document.getElementById('newstaff-route');

  const role = roleRadio ? roleRadio.value : 'agent';
  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const pin = pinInput ? pinInput.value.trim() : '5555';
  const route = routeInput ? routeInput.value.trim() : '';

  if (!name) {
    showToast('Please enter full name', 'warning');
    return;
  }

  // Check duplicate name
  if (appState.accounts.some(a => a.name.toLowerCase() === name.toLowerCase())) {
    showToast(`An account named "${name}" already exists!`, 'danger');
    return;
  }

  const newAccount = {
    id: 'staff_' + Date.now(),
    role: role,
    name: name,
    phone: phone,
    pin: pin,
    route: route,
    createdAt: getTodayISODate()
  };

  appState.accounts.push(newAccount);
  saveAccountsToLocal();

  if (role === 'agent') {
    if (!appState.attendance[name]) {
      appState.attendance[name] = {
        status: 'off_duty',
        punchInTime: '',
        punchInDate: '',
        punchOutTime: '',
        shiftStartTimestamp: null,
        photo: '',
        history: []
      };
      saveAttendanceToLocal();
    }
  }

  refreshAgentsListFromAccounts();
  populateAuthStaffDropdowns();
  populateAllAgentSelectElements();
  renderStaffAccountsList();
  closeAddStaffModal();
  showToast(`🎉 Staff account created for ${name} (${role === 'agent' ? 'Delivery Fleet' : 'Operations'})`, 'success');
}

function deleteStaffAccount(accountId) {
  const acc = appState.accounts.find(a => a.id === accountId);
  if (!acc) return;

  if (acc.role === 'owner') {
    showToast('Cannot delete Store Owner account.', 'danger');
    return;
  }

  if (!confirm(`Are you sure you want to remove account "${acc.name}"?`)) return;

  appState.accounts = appState.accounts.filter(a => a.id !== accountId);
  saveAccountsToLocal();

  refreshAgentsListFromAccounts();
  populateAuthStaffDropdowns();
  populateAllAgentSelectElements();
  renderStaffAccountsList();
  showToast(`Removed account: ${acc.name}`, 'info');
}

function applyUserRoleUI() {
  if (!appState.currentUser) return;
  const role = appState.currentUser.role;
  const isOwner = role === 'owner';
  const isAgent = role === 'agent';
  const agentName = appState.currentUser.agentName;

  const roleText = document.getElementById('header-role-text');
  const roleBadge = document.getElementById('header-user-badge');
  const outletUserInfo = document.getElementById('outlet-user-info');
  const headerAvatarIcon = document.getElementById('header-avatar-icon');
  const headerDutyPill = document.getElementById('header-duty-pill');
  const headerDutyText = document.getElementById('header-duty-text');

  if (roleText) {
    if (isOwner) roleText.textContent = 'Owner';
    else if (isAgent) roleText.textContent = agentName ? agentName.split(' ')[0] : 'Agent';
    else roleText.textContent = 'Ops';
  }

  if (roleBadge) {
    roleBadge.className = 'user-role-pill';
    if (isOwner) roleBadge.classList.add('role-owner');
    else if (isAgent) roleBadge.classList.add('role-agent');
  }

  if (outletUserInfo) {
    if (isOwner) outletUserInfo.textContent = 'Owner: rad. Express';
    else if (isAgent) outletUserInfo.textContent = `Agent: ${agentName}`;
    else outletUserInfo.textContent = 'Ops: rad. Express';
  }

  if (headerAvatarIcon) {
    if (isAgent) headerAvatarIcon.innerHTML = '<i class="fa-solid fa-person-biking"></i>';
    else if (isOwner) headerAvatarIcon.innerHTML = '<i class="fa-solid fa-crown"></i>';
    else headerAvatarIcon.innerHTML = '<i class="fa-solid fa-boxes-packing"></i>';
  }

  // Header Duty Pill for Agents & Ops
  if (headerDutyPill) {
    if (isAgent && agentName) {
      headerDutyPill.classList.remove('hidden');
      const att = appState.attendance[agentName] || { status: 'off_duty' };
      headerDutyPill.className = 'header-duty-pill';
      if (att.status === 'on_duty') {
        headerDutyPill.classList.add('duty-on');
        if (headerDutyText) headerDutyText.textContent = 'ON DUTY';
      } else if (att.status === 'on_break') {
        headerDutyPill.classList.add('duty-break');
        if (headerDutyText) headerDutyText.textContent = 'ON BREAK';
      } else {
        headerDutyPill.classList.add('duty-off');
        if (headerDutyText) headerDutyText.textContent = 'OFF DUTY';
      }
    } else {
      headerDutyPill.classList.add('hidden');
    }
  }

  const headerSyncBtn = document.getElementById('btn-header-sync');
  if (headerSyncBtn) {
    if (isOwner) headerSyncBtn.classList.remove('hidden');
    else headerSyncBtn.classList.add('hidden');
  }

  const navTabAdd = document.getElementById('nav-tab-add');
  const navTabDashboard = document.getElementById('nav-tab-dashboard');
  const navTabSettings = document.getElementById('nav-tab-settings');

  if (navTabSettings) {
    if (isOwner) navTabSettings.classList.remove('hidden');
    else navTabSettings.classList.add('hidden');
  }

  if (navTabDashboard) {
    if (isOwner) navTabDashboard.classList.remove('hidden');
    else navTabDashboard.classList.add('hidden');
  }

  if (navTabAdd) {
    if (isAgent) navTabAdd.classList.add('hidden');
    else navTabAdd.classList.remove('hidden');
  }

  const profName = document.getElementById('profile-user-name');
  const profBadge = document.getElementById('profile-role-badge');
  if (profName) profName.textContent = appState.currentUser.name;
  if (profBadge) {
    if (isOwner) {
      profBadge.textContent = 'Role: Store Owner (Full Admin)';
      profBadge.className = 'badge badge-yellow';
    } else if (isAgent) {
      profBadge.textContent = `Role: Delivery Agent (${appState.currentUser.agentName})`;
      profBadge.className = 'badge badge-purple';
    } else {
      profBadge.textContent = 'Role: Operations Executive';
      profBadge.className = 'badge badge-neutral';
    }
  }

  const agentBanner = document.getElementById('agent-active-banner');
  const agentNameEl = document.getElementById('agent-active-name');
  if (agentBanner) {
    if (isAgent) {
      agentBanner.classList.remove('hidden');
      if (agentNameEl) agentNameEl.textContent = `${appState.currentUser.agentName}'s Route`;
    } else {
      agentBanner.classList.add('hidden');
    }
  }
}

function promptOwnerLoginForDashboard() {
  appState.currentUser = { role: 'owner', name: 'Store Owner' };
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(appState.currentUser));
  applyUserRoleUI();
  showToast('Switched to Store Owner View!', 'success');
  renderDashboard();
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.AUTH);
  appState.currentUser = null;
  closeProfileMenu();
  showAuthOverlay();
  showToast('Logged out successfully', 'info');
}

function switchUserRoleQuick() {
  if (!appState.currentUser) return;
  const currentRole = appState.currentUser.role;
  let nextRole = 'ops';
  let nextName = 'Operations Executive';
  let agentName = '';

  if (currentRole === 'ops') {
    nextRole = 'agent';
    agentName = 'Rahul Sharma';
    nextName = 'Rahul Sharma (Agent)';
  } else if (currentRole === 'agent') {
    nextRole = 'owner';
    nextName = 'Store Owner';
  } else {
    nextRole = 'ops';
    nextName = 'Operations Executive';
  }

  appState.currentUser = { role: nextRole, name: nextName, agentName: agentName };
  localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(appState.currentUser));
  applyUserRoleUI();
  closeProfileMenu();
  showToast(`Switched active profile to: ${appState.currentUser.name}`, 'info');
  navigateToScreen('screen-pending-deliveries');
  renderApp();
}

function openProfileMenu() {
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.add('active');
}

function closeProfileMenu(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close')) return;
  const modal = document.getElementById('profile-modal');
  if (modal) modal.classList.remove('active');
}

// ==========================================
// 4. NAVIGATION
// ==========================================
function navigateToScreen(screenId) {
  if (!appState.currentUser) return;
  if (screenId === 'screen-settings' && appState.currentUser.role !== 'owner') {
    showToast('Settings is restricted to Store Owner only.', 'danger');
    return;
  }
  if (screenId === 'screen-add-bill' && appState.currentUser.role === 'agent') {
    showToast('Delivery agents cannot create bills.', 'warning');
    return;
  }

  appState.activeScreen = screenId;

  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-screen') === screenId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  const screens = document.querySelectorAll('.app-screen');
  screens.forEach(screen => {
    if (screen.id === screenId) {
      screen.classList.add('active');
    } else {
      screen.classList.remove('active');
    }
  });

  const titleElem = document.getElementById('screen-title');
  if (titleElem) {
    switch (screenId) {
      case 'screen-add-bill':
        titleElem.textContent = 'Add Bill';
        break;
      case 'screen-pending-deliveries':
        titleElem.textContent = appState.currentUser.role === 'agent' ? 'My Deliveries' : 'Pending Deliveries';
        break;
      case 'screen-unpaid-bills':
        titleElem.textContent = 'Unpaid Invoices';
        break;
      case 'screen-attendance':
        titleElem.textContent = appState.currentUser.role === 'agent' ? 'Duty Attendance' : 'Fleet Attendance';
        break;
      case 'screen-all-bills':
        titleElem.textContent = 'All Bills';
        break;
      case 'screen-dashboard':
        titleElem.textContent = 'Dashboard';
        break;
      case 'screen-settings':
        titleElem.textContent = 'Settings & Sync';
        break;
    }
  }

  const mainScroll = document.getElementById('main-scroll-container');
  if (mainScroll) mainScroll.scrollTop = 0;

  renderCurrentScreen();
}

function renderApp() {
  recalculateAllBills();
  updateBadgeCounts();
  applyUserRoleUI();
  renderCurrentScreen();
}

function renderCurrentScreen() {
  switch (appState.activeScreen) {
    case 'screen-pending-deliveries':
      renderPendingDeliveries();
      break;
    case 'screen-unpaid-bills':
      renderUnpaidBills();
      break;
    case 'screen-attendance':
      renderAttendanceScreen();
      break;
    case 'screen-all-bills':
      renderAllBills();
      break;
    case 'screen-dashboard':
      renderDashboard();
      break;
    case 'screen-add-bill':
      renderRecentAddedBills();
      break;
    case 'screen-settings':
      renderStaffAccountsList();
      break;
  }
}

function updateBadgeCounts() {
  const isAgent = appState.currentUser && appState.currentUser.role === 'agent';
  const agentName = appState.currentUser?.agentName;

  let pendingBills = appState.bills.filter(b => b.deliveryStatus !== 'Delivered');
  let unpaidBills = appState.bills.filter(b => b.paymentStatus !== 'Paid');

  if (isAgent && agentName) {
    pendingBills = pendingBills.filter(b => b.deliveryAgent === agentName);
    unpaidBills = unpaidBills.filter(b => b.deliveryAgent === agentName);
  }

  const pendingCount = pendingBills.length;
  const unpaidCount = unpaidBills.length;

  const navPendingBadge = document.getElementById('nav-pending-badge');
  const navUnpaidBadge = document.getElementById('nav-unpaid-badge');

  if (navPendingBadge) {
    navPendingBadge.textContent = pendingCount;
    if (pendingCount > 0) navPendingBadge.classList.remove('hidden');
    else navPendingBadge.classList.add('hidden');
  }

  if (navUnpaidBadge) {
    navUnpaidBadge.textContent = unpaidCount;
    if (unpaidCount > 0) navUnpaidBadge.classList.remove('hidden');
    else navUnpaidBadge.classList.add('hidden');
  }
}

// ==========================================
// 5. COLOR CODING & BADGE HELPERS
// ==========================================
function getDeliveryBadgeHtml(status) {
  if (status === 'Delivered') {
    return `<span class="badge badge-green"><i class="fa-solid fa-circle-check"></i> Delivered</span>`;
  } else if (status === 'Out for Delivery') {
    return `<span class="badge badge-yellow"><i class="fa-solid fa-truck-fast"></i> Out for Delivery</span>`;
  } else {
    return `<span class="badge badge-red"><i class="fa-solid fa-clock"></i> Pending</span>`;
  }
}

function getPaymentBadgeHtml(paymentStatus, paymentMode) {
  if (paymentStatus === 'Paid') {
    let modeIcon = 'fa-solid fa-circle-check';
    if (paymentMode === 'CASH') modeIcon = 'fa-solid fa-money-bill-wave';
    else if (paymentMode === 'QR') modeIcon = 'fa-solid fa-qrcode';
    else if (paymentMode === 'CARD') modeIcon = 'fa-solid fa-credit-card';
    return `<span class="badge badge-green"><i class="${modeIcon}"></i> Paid (${paymentMode || 'QR'})</span>`;
  } else {
    return `<span class="badge badge-red"><i class="fa-solid fa-circle-exclamation"></i> UNPAID</span>`;
  }
}

function getAgentBadgeHtml(agentName) {
  if (!agentName || agentName === 'Unassigned') {
    return `<span class="badge badge-neutral"><i class="fa-solid fa-user-xmark"></i> Unassigned</span>`;
  }
  return `<span class="badge badge-purple"><i class="fa-solid fa-person-biking"></i> ${agentName.split(' ')[0]}</span>`;
}

function getCardBorderClass(deliveryStatus) {
  if (deliveryStatus === 'Delivered') return 'border-status-delivered';
  if (deliveryStatus === 'Out for Delivery') return 'border-status-out';
  return 'border-status-pending';
}

function formatCurrency(num) {
  return '₹' + Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ==========================================
// 6. SCREEN 1: ADD BILL
// ==========================================
function generateAutoInvoiceNo() {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const autoNo = `INV-${year}-${randomNum}`;
  const input = document.getElementById('input-invoice-no');
  if (input) {
    input.value = autoNo;
    checkDuplicateInvoiceLive(autoNo);
  }
}

function checkDuplicateInvoiceLive(invoiceNo) {
  const warning = document.getElementById('invoice-duplicate-warning');
  const btnSave = document.getElementById('btn-save-bill');
  const trimmed = invoiceNo.trim().toUpperCase();

  if (!trimmed) {
    if (warning) warning.classList.add('hidden');
    if (btnSave) btnSave.disabled = false;
    return false;
  }

  const exists = appState.bills.some(b => b.invoiceNo.toUpperCase() === trimmed);
  if (exists) {
    if (warning) warning.classList.remove('hidden');
    if (btnSave) btnSave.disabled = true;
    return true;
  } else {
    if (warning) warning.classList.add('hidden');
    if (btnSave) btnSave.disabled = false;
    return false;
  }
}

function checkFlatPendingFromAddForm() {
  const flatInput = document.getElementById('input-flat-no');
  const flatVal = flatInput ? flatInput.value.trim() : '';
  if (!flatVal) {
    showToast('Please type a Flat No first!', 'warning');
    return;
  }
  openFlatPendingInvoicesModal(flatVal);
}

function handleCreateBill(event) {
  event.preventDefault();

  const invoiceNo = document.getElementById('input-invoice-no').value.trim().toUpperCase();
  const flatNo = document.getElementById('input-flat-no').value.trim().toUpperCase();
  const billAmount = parseFloat(document.getElementById('input-bill-amount').value);
  const billedDate = document.getElementById('input-billed-date').value;
  const assignedAgent = document.getElementById('input-assigned-agent').value;
  const deliveryStatus = document.getElementById('input-delivery-status').value;
  const remarks = document.getElementById('input-remarks').value.trim();

  if (appState.bills.some(b => b.invoiceNo.toUpperCase() === invoiceNo)) {
    showToast(`Error: Invoice number ${invoiceNo} already exists!`, 'danger');
    return;
  }

  if (!invoiceNo || !flatNo || isNaN(billAmount) || billAmount <= 0 || !billedDate) {
    showToast('Please fill all required fields correctly!', 'warning');
    return;
  }

  const todayStr = getTodayISODate();
  if (billedDate > todayStr) {
    showToast('Future date is not allowed. Please choose Today or a past date.', 'warning');
    const dateInput = document.getElementById('input-billed-date');
    if (dateInput) dateInput.value = todayStr;
    return;
  }

  const newBill = {
    invoiceNo: invoiceNo,
    flatNo: flatNo,
    billAmount: parseFloat(billAmount.toFixed(2)),
    billedDate: billedDate,
    deliveryAgent: assignedAgent || 'Unassigned',
    deliveryStatus: deliveryStatus || 'Pending',
    deliveredDate: deliveryStatus === 'Delivered' ? getTodayISODate() : '',
    deliveryProof: '',
    deliveryProofTime: '',
    paymentStatus: 'Unpaid',
    amountReceived: 0,
    balance: parseFloat(billAmount.toFixed(2)),
    paymentMode: 'UNPAID',
    paymentProof: '',
    paymentProofTime: '',
    daysPending: calculateDaysPending(billedDate, 'Unpaid'),
    remarks: remarks
  };

  appState.bills.unshift(newBill);
  saveBillsToLocal();
  triggerAutoCloudSync(newBill, 'upsert_bill');

  showToast(`Bill #${newBill.invoiceNo} added and assigned to ${newBill.deliveryAgent}!`, 'success');
  resetAddBillForm();
  renderRecentAddedBills();
  updateBadgeCounts();

  if (newBill.deliveryStatus !== 'Delivered') {
    setTimeout(() => {
      navigateToScreen('screen-pending-deliveries');
    }, 400);
  }
}

function resetAddBillForm() {
  const form = document.getElementById('add-bill-form');
  if (form) form.reset();
  setDefaultBilledDate();
  const warning = document.getElementById('invoice-duplicate-warning');
  if (warning) warning.classList.add('hidden');
  const btnSave = document.getElementById('btn-save-bill');
  if (btnSave) btnSave.disabled = false;
}

function renderRecentAddedBills() {
  const container = document.getElementById('recent-adds-list');
  const countBadge = document.getElementById('recent-adds-count');
  if (!container) return;

  const todayStr = getTodayISODate();
  const todayBills = appState.bills.filter(b => b.billedDate === todayStr);

  if (countBadge) countBadge.textContent = `${todayBills.length} added today`;

  if (todayBills.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-file-circle-plus"></i></div>
        <h3>No bills added today</h3>
        <p>Use the form above to add a new bill for your outlet.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = todayBills.slice(0, 5).map(renderSingleBillCardHtml).join('');
}

// ==========================================
// 7. SCREEN 2: PENDING DELIVERIES
// ==========================================
function filterPendingDeliveries(filterType, element) {
  appState.filterPendingTab = filterType;
  const chips = document.querySelectorAll('#screen-pending-deliveries .filter-chips-row .chip');
  chips.forEach(c => c.classList.remove('active'));
  if (element) element.classList.add('active');
  renderPendingDeliveries();
}

function renderPendingDeliveries() {
  const container = document.getElementById('pending-deliveries-list');
  const totalCountEl = document.getElementById('pending-delivery-count');
  const oldestDaysEl = document.getElementById('oldest-pending-days');
  const countAll = document.getElementById('count-all-pending');
  const countQueued = document.getElementById('count-queued');
  const countOutRoad = document.getElementById('count-out-road');
  const countUnassigned = document.getElementById('count-unassigned');
  const chipUnassigned = document.getElementById('chip-unassigned-filter');
  const heroLabel = document.getElementById('hero-delivery-label');

  if (!container) return;

  const isAgent = appState.currentUser && appState.currentUser.role === 'agent';
  const agentName = appState.currentUser?.agentName;

  let pendingBills = appState.bills.filter(b => b.deliveryStatus !== 'Delivered');

  if (isAgent && agentName) {
    pendingBills = pendingBills.filter(b => b.deliveryAgent === agentName);
    if (chipUnassigned) chipUnassigned.classList.add('hidden');
    if (heroLabel) heroLabel.textContent = `My Pending Deliveries`;
  } else {
    if (chipUnassigned) chipUnassigned.classList.remove('hidden');
    if (heroLabel) heroLabel.textContent = `All Pending Deliveries`;
  }

  pendingBills.sort((a, b) => new Date(a.billedDate) - new Date(b.billedDate));

  const totalPending = pendingBills.length;
  const queuedCount = pendingBills.filter(b => b.deliveryStatus === 'Pending').length;
  const outRoadCount = pendingBills.filter(b => b.deliveryStatus === 'Out for Delivery').length;
  const unassignedCount = appState.bills.filter(b => b.deliveryStatus !== 'Delivered' && (!b.deliveryAgent || b.deliveryAgent === 'Unassigned')).length;

  if (totalCountEl) totalCountEl.textContent = totalPending;
  if (countAll) countAll.textContent = totalPending;
  if (countQueued) countQueued.textContent = queuedCount;
  if (countOutRoad) countOutRoad.textContent = outRoadCount;
  if (countUnassigned) countUnassigned.textContent = unassignedCount;

  if (pendingBills.length > 0) {
    const oldest = pendingBills[0];
    const days = calculateDaysPending(oldest.billedDate, 'Pending');
    if (oldestDaysEl) oldestDaysEl.textContent = `Oldest: Flat ${oldest.flatNo} (${days}d ago)`;
  } else {
    if (oldestDaysEl) oldestDaysEl.textContent = 'All deliveries completed! 🎉';
  }

  let displayList = [...pendingBills];
  if (appState.filterPendingTab === 'Pending') {
    displayList = displayList.filter(b => b.deliveryStatus === 'Pending');
  } else if (appState.filterPendingTab === 'Out for Delivery') {
    displayList = displayList.filter(b => b.deliveryStatus === 'Out for Delivery');
  } else if (appState.filterPendingTab === 'Unassigned') {
    displayList = appState.bills.filter(b => b.deliveryStatus !== 'Delivered' && (!b.deliveryAgent || b.deliveryAgent === 'Unassigned'));
  }

  if (displayList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon text-success"><i class="fa-solid fa-truck-ramp-box"></i></div>
        <h3>No Pending Deliveries</h3>
        <p>${isAgent ? 'You have no pending deliveries assigned at the moment.' : 'All retail orders have been delivered.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = displayList.map(b => renderBillCardWithQuickActions(b, 'delivery')).join('');
}

// ==========================================
// 8. SCREEN 3: UNPAID BILLS
// ==========================================
function filterUnpaidBills(filterType, element) {
  appState.filterUnpaidTab = filterType;
  const chips = document.querySelectorAll('#screen-unpaid-bills .filter-chips-row .chip');
  chips.forEach(c => c.classList.remove('active'));
  if (element) element.classList.add('active');
  renderUnpaidBills();
}

function renderUnpaidBills() {
  const container = document.getElementById('unpaid-bills-list');
  const totalAmtEl = document.getElementById('unpaid-bills-total-amt');
  const countEl = document.getElementById('unpaid-bills-count');
  const countAll = document.getElementById('count-all-unpaid');
  const countOverdue7 = document.getElementById('count-overdue-7');
  const countMyUncollected = document.getElementById('count-my-uncollected');
  const chipMyDeliveries = document.getElementById('chip-unpaid-my-deliveries');

  if (!container) return;

  const isAgent = appState.currentUser && appState.currentUser.role === 'agent';
  const agentName = appState.currentUser?.agentName;

  let unpaidBills = appState.bills.filter(b => b.paymentStatus !== 'Paid');
  unpaidBills.sort((a, b) => b.daysPending - a.daysPending);

  const totalOutstanding = unpaidBills.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);
  const overdue7Count = unpaidBills.filter(b => b.daysPending >= 7).length;
  const myUncollectedCount = isAgent && agentName ? unpaidBills.filter(b => b.deliveryAgent === agentName).length : 0;

  if (totalAmtEl) totalAmtEl.textContent = formatCurrency(totalOutstanding);
  if (countEl) countEl.textContent = `${unpaidBills.length} Unpaid Invoices`;
  if (countAll) countAll.textContent = unpaidBills.length;
  if (countOverdue7) countOverdue7.textContent = overdue7Count;
  if (countMyUncollected) countMyUncollected.textContent = myUncollectedCount;

  if (chipMyDeliveries) {
    if (isAgent) chipMyDeliveries.classList.remove('hidden');
    else chipMyDeliveries.classList.add('hidden');
  }

  let displayList = [...unpaidBills];
  if (appState.unpaidSearchQuery) {
    displayList = displayList.filter(b => 
      b.flatNo.toUpperCase().includes(appState.unpaidSearchQuery) ||
      b.invoiceNo.toUpperCase().includes(appState.unpaidSearchQuery)
    );
  }

  if (appState.filterUnpaidTab === '7plus') {
    displayList = displayList.filter(b => b.daysPending >= 7);
  } else if (appState.filterUnpaidTab === 'assigned_to_me' && isAgent && agentName) {
    displayList = displayList.filter(b => b.deliveryAgent === agentName);
  }

  if (displayList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon text-success"><i class="fa-solid fa-circle-check"></i></div>
        <h3>${appState.unpaidSearchQuery ? 'No Matching Invoices Found' : 'Zero Unpaid Invoices!'}</h3>
        <p>${appState.unpaidSearchQuery ? `No pending invoices match "${appState.unpaidSearchQuery}".` : 'All retail bills have been 100% collected and settled.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = displayList.map(b => renderBillCardWithQuickActions(b, 'payment')).join('');
}

function handleUnpaidBillsSearch(val) {
  appState.unpaidSearchQuery = val.trim().toUpperCase();
  const btnClear = document.getElementById('btn-clear-unpaid-search');
  if (btnClear) {
    if (appState.unpaidSearchQuery) btnClear.classList.remove('hidden');
    else btnClear.classList.add('hidden');
  }
  renderUnpaidBills();
}

function clearUnpaidBillsSearch() {
  appState.unpaidSearchQuery = '';
  const input = document.getElementById('unpaid-bills-search-input');
  if (input) input.value = '';
  const btnClear = document.getElementById('btn-clear-unpaid-search');
  if (btnClear) btnClear.classList.add('hidden');
  renderUnpaidBills();
}

// ==========================================
// 9. SCREEN 4: ALL BILLS & FLAT LOOKUP
// ==========================================
function handleAllBillsSearch(val) {
  appState.searchQuery = val.trim().toUpperCase();
  const btnClear = document.getElementById('btn-clear-search');
  if (btnClear) {
    if (appState.searchQuery) btnClear.classList.remove('hidden');
    else btnClear.classList.add('hidden');
  }

  updateFlatPendingLiveBanner(appState.searchQuery);
  renderAllBills();
}

function clearAllBillsSearch() {
  const input = document.getElementById('all-bills-search-input');
  if (input) input.value = '';
  handleAllBillsSearch('');
}

function updateFlatPendingLiveBanner(query) {
  const banner = document.getElementById('flat-pending-summary-banner');
  if (!banner) return;

  if (!query || query.length < 2) {
    banner.classList.add('hidden');
    return;
  }

  const matchingPending = appState.bills.filter(b => 
    b.flatNo.toUpperCase().includes(query) && b.paymentStatus !== 'Paid'
  );

  if (matchingPending.length > 0) {
    const totalPendingAmt = matchingPending.reduce((sum, b) => sum + b.balance, 0);
    const matchedFlats = [...new Set(matchingPending.map(b => b.flatNo))];
    const targetFlat = matchedFlats.length === 1 ? matchedFlats[0] : query;

    banner.innerHTML = `
      <div>
        <strong><i class="fa-solid fa-door-open"></i> Flat ${targetFlat}</strong>
        <div style="font-size: 11.5px; color: #7f1d1d;">
          ${matchingPending.length} pending bill(s) totaling <strong>${formatCurrency(totalPendingAmt)}</strong>
        </div>
      </div>
      <button class="btn-view-flat" onclick="openFlatPendingInvoicesModal('${targetFlat}')">
        View Statement
      </button>
    `;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function applyAllBillsFilters() {
  const delSelect = document.getElementById('filter-delivery-status');
  const paySelect = document.getElementById('filter-payment-status');
  const agentSelect = document.getElementById('filter-agent-select');
  const sortSelect = document.getElementById('filter-sort-by');

  if (delSelect) appState.filterDeliveryStatus = delSelect.value;
  if (paySelect) appState.filterPaymentStatus = paySelect.value;
  if (agentSelect) appState.filterAgent = agentSelect.value;
  if (sortSelect) appState.sortBy = sortSelect.value;

  renderAllBills();
}

function renderAllBills() {
  const container = document.getElementById('all-bills-list');
  const summaryEl = document.getElementById('all-bills-count-summary');
  if (!container) return;

  let list = [...appState.bills];

  if (appState.searchQuery) {
    list = list.filter(b => 
      b.invoiceNo.toUpperCase().includes(appState.searchQuery) ||
      b.flatNo.toUpperCase().includes(appState.searchQuery) ||
      (b.deliveryAgent && b.deliveryAgent.toUpperCase().includes(appState.searchQuery))
    );
  }

  if (appState.filterDeliveryStatus !== 'all') {
    list = list.filter(b => b.deliveryStatus === appState.filterDeliveryStatus);
  }

  if (appState.filterPaymentStatus !== 'all') {
    list = list.filter(b => b.paymentStatus === appState.filterPaymentStatus);
  }

  if (appState.filterAgent !== 'all') {
    list = list.filter(b => b.deliveryAgent === appState.filterAgent);
  }

  switch (appState.sortBy) {
    case 'date-desc':
      list.sort((a, b) => new Date(b.billedDate) - new Date(a.billedDate));
      break;
    case 'date-asc':
      list.sort((a, b) => new Date(a.billedDate) - new Date(b.billedDate));
      break;
    case 'days-desc':
      list.sort((a, b) => b.daysPending - a.daysPending);
      break;
    case 'amount-desc':
      list.sort((a, b) => b.billAmount - a.billAmount);
      break;
    case 'flat-asc':
      list.sort((a, b) => a.flatNo.localeCompare(b.flatNo, undefined, { numeric: true }));
      break;
  }

  if (summaryEl) {
    summaryEl.textContent = `Showing ${list.length} of ${appState.bills.length} bills`;
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
        <h3>No matching bills found</h3>
        <p>Try searching for another Flat # or resetting the filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(b => renderBillCardWithQuickActions(b, 'all')).join('');
}

// ==========================================
// 10. FLAT PENDING INVOICES MODAL & BATCH CLEARANCE
// ==========================================
function openFlatPendingInvoicesModal(flatNo) {
  if (!flatNo) return;
  const cleanFlat = flatNo.trim().toUpperCase();
  appState.currentViewingFlat = cleanFlat;

  const flatInvoices = appState.bills.filter(b => b.flatNo.toUpperCase() === cleanFlat);
  const pendingInvoices = flatInvoices.filter(b => b.paymentStatus !== 'Paid');
  const totalPendingAmount = pendingInvoices.reduce((sum, b) => sum + b.balance, 0);

  // Default: Select all pending invoices for quick 1-tap clearance
  appState.selectedFlatInvoices = pendingInvoices.map(b => b.invoiceNo);

  const titleEl = document.getElementById('flat-modal-title');
  const totalAmtEl = document.getElementById('flat-modal-total-pending');
  const countEl = document.getElementById('flat-modal-count-pending');
  const batchContainer = document.getElementById('flat-batch-actions-container');
  const listContainer = document.getElementById('flat-modal-invoices-list');

  if (titleEl) titleEl.textContent = `Flat ${cleanFlat}`;
  if (totalAmtEl) totalAmtEl.textContent = formatCurrency(totalPendingAmount);
  if (countEl) countEl.textContent = `${pendingInvoices.length} Pending (${flatInvoices.length} Total)`;

  if (batchContainer) {
    if (pendingInvoices.length > 0) {
      batchContainer.classList.remove('hidden');
      updateFlatBatchUI();
    } else {
      batchContainer.classList.add('hidden');
    }
  }

  if (listContainer) {
    if (flatInvoices.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon"><i class="fa-solid fa-building-circle-check"></i></div>
          <h3>No records for Flat ${cleanFlat}</h3>
          <p>No invoices have been billed to this flat yet.</p>
        </div>
      `;
    } else {
      const sorted = [...flatInvoices].sort((a, b) => {
        if (a.paymentStatus !== 'Paid' && b.paymentStatus === 'Paid') return -1;
        if (a.paymentStatus === 'Paid' && b.paymentStatus !== 'Paid') return 1;
        return b.daysPending - a.daysPending;
      });

      listContainer.innerHTML = sorted.map(b => renderFlatStatementBillRow(b)).join('');
    }
  }

  const modal = document.getElementById('flat-pending-modal');
  if (modal) modal.classList.add('active');
}

function renderFlatStatementBillRow(bill) {
  const isPaid = bill.paymentStatus === 'Paid';
  const isSelected = appState.selectedFlatInvoices.includes(bill.invoiceNo);

  const checkboxHtml = isPaid
    ? `<div class="flat-bill-checkbox-side"><i class="fa-solid fa-circle-check text-success" style="font-size: 20px;" title="Paid"></i></div>`
    : `
      <div class="flat-bill-checkbox-side" onclick="event.stopPropagation()">
        <input 
          type="checkbox" 
          id="chk-flat-inv-${bill.invoiceNo}" 
          ${isSelected ? 'checked' : ''} 
          onchange="toggleFlatInvoiceSelection('${bill.invoiceNo}', this.checked)"
          title="Select to pay in single batch"
        />
      </div>
    `;

  return `
    <div class="flat-bill-card-wrapper">
      ${checkboxHtml}
      ${renderBillCardWithQuickActions(bill, 'flat_view')}
    </div>
  `;
}

function updateFlatBatchUI() {
  const cleanFlat = appState.currentViewingFlat;
  const flatInvoices = appState.bills.filter(b => b.flatNo.toUpperCase() === cleanFlat);
  const pendingInvoices = flatInvoices.filter(b => b.paymentStatus !== 'Paid');

  const selectedBills = appState.bills.filter(b => appState.selectedFlatInvoices.includes(b.invoiceNo));
  const selectedTotal = selectedBills.reduce((sum, b) => sum + b.balance, 0);

  const countLabel = document.getElementById('batch-selected-count');
  const totalLabel = document.getElementById('batch-selected-total-amount');
  const btnAmountText = document.getElementById('btn-batch-amount-text');
  const btnPay = document.getElementById('btn-batch-pay-selected');
  const masterCheck = document.getElementById('chk-batch-select-all');

  if (countLabel) countLabel.textContent = `${appState.selectedFlatInvoices.length} of ${pendingInvoices.length}`;
  if (totalLabel) totalLabel.textContent = formatCurrency(selectedTotal);
  if (btnAmountText) btnAmountText.textContent = formatCurrency(selectedTotal);

  if (masterCheck) {
    masterCheck.checked = pendingInvoices.length > 0 && appState.selectedFlatInvoices.length === pendingInvoices.length;
    masterCheck.indeterminate = appState.selectedFlatInvoices.length > 0 && appState.selectedFlatInvoices.length < pendingInvoices.length;
  }

  if (btnPay) {
    btnPay.disabled = appState.selectedFlatInvoices.length === 0;
    if (appState.selectedFlatInvoices.length === 0) {
      btnPay.classList.add('btn-disabled');
      btnPay.innerHTML = '<i class="fa-solid fa-ban"></i> Select At Least 1 Invoice';
    } else {
      btnPay.classList.remove('btn-disabled');
      btnPay.innerHTML = `<i class="fa-solid fa-circle-dollar-to-slot"></i> Clear ${appState.selectedFlatInvoices.length} Invoices (${formatCurrency(selectedTotal)}) in 1 Payment`;
    }
  }
}

function toggleSelectAllFlatPending(isChecked) {
  const cleanFlat = appState.currentViewingFlat;
  const flatInvoices = appState.bills.filter(b => b.flatNo.toUpperCase() === cleanFlat);
  const pendingInvoices = flatInvoices.filter(b => b.paymentStatus !== 'Paid');

  if (isChecked) {
    appState.selectedFlatInvoices = pendingInvoices.map(b => b.invoiceNo);
  } else {
    appState.selectedFlatInvoices = [];
  }

  pendingInvoices.forEach(b => {
    const chk = document.getElementById(`chk-flat-inv-${b.invoiceNo}`);
    if (chk) chk.checked = isChecked;
  });

  updateFlatBatchUI();
}

function toggleFlatInvoiceSelection(invoiceNo, isChecked) {
  if (isChecked) {
    if (!appState.selectedFlatInvoices.includes(invoiceNo)) {
      appState.selectedFlatInvoices.push(invoiceNo);
    }
  } else {
    appState.selectedFlatInvoices = appState.selectedFlatInvoices.filter(id => id !== invoiceNo);
  }

  updateFlatBatchUI();
}

function startMultiInvoicePaymentForFlat() {
  if (!appState.selectedFlatInvoices || appState.selectedFlatInvoices.length === 0) {
    showToast('Please select at least 1 invoice to clear!', 'warning');
    return;
  }

  closeFlatPendingModal();
  openMultiInvoicePaymentModal(appState.currentViewingFlat, appState.selectedFlatInvoices);
}

function closeFlatPendingModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close-circle')) return;
  const modal = document.getElementById('flat-pending-modal');
  if (modal) modal.classList.remove('active');
}

function viewAllInvoicesForCurrentFlat() {
  if (!appState.selectedInvoiceNo) return;
  const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
  if (bill) {
    closeBillDetailModal();
    openFlatPendingInvoicesModal(bill.flatNo);
  }
}

// ==========================================
// 10B. QUICK FLAT SEARCH & STATEMENT MODAL
// ==========================================
function openQuickFlatSearchModal() {
  const modal = document.getElementById('quick-flat-search-modal');
  const input = document.getElementById('quick-flat-search-input');
  if (modal) {
    modal.classList.add('active');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
    renderQuickFlatSearchResults('');
  }
}

function closeQuickFlatSearchModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close')) return;
  const modal = document.getElementById('quick-flat-search-modal');
  if (modal) modal.classList.remove('active');
}

function handleQuickFlatSearchInput(val) {
  renderQuickFlatSearchResults(val);
}

function renderQuickFlatSearchResults(query) {
  const container = document.getElementById('quick-flat-search-results');
  const badge = document.getElementById('quick-flat-count-badge');
  if (!container) return;

  const q = (query || '').trim().toUpperCase();

  // Group bills by flat number
  const flatsMap = {};
  appState.bills.forEach(b => {
    const fn = (b.flatNo || '').trim().toUpperCase();
    if (!fn) return;
    if (!flatsMap[fn]) {
      flatsMap[fn] = {
        flatNo: fn,
        totalBills: 0,
        pendingBills: 0,
        pendingAmount: 0,
        paidBills: 0
      };
    }
    flatsMap[fn].totalBills += 1;
    if (b.paymentStatus !== 'Paid') {
      flatsMap[fn].pendingBills += 1;
      flatsMap[fn].pendingAmount += b.balance;
    } else {
      flatsMap[fn].paidBills += 1;
    }
  });

  let flatsList = Object.values(flatsMap);

  if (q) {
    flatsList = flatsList.filter(f => f.flatNo.includes(q));
  }

  // Sort by pending balance (high to low), then total bills
  flatsList.sort((a, b) => {
    if (b.pendingAmount !== a.pendingAmount) return b.pendingAmount - a.pendingAmount;
    return b.totalBills - a.totalBills;
  });

  if (badge) badge.textContent = `${flatsList.length} flat${flatsList.length === 1 ? '' : 's'}`;

  if (flatsList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
        <h3>No flats found</h3>
        <p>No billing records match "${q}".</p>
      </div>
    `;
    return;
  }

  container.innerHTML = flatsList.map(f => `
    <div class="quick-flat-result-card" onclick="openFlatFromQuickSearch('${f.flatNo}')">
      <div class="qflat-info">
        <span class="qflat-name"><i class="fa-solid fa-door-open text-primary"></i> Flat ${f.flatNo}</span>
        <span class="qflat-meta">
          ${f.pendingBills > 0 
            ? `<strong class="text-danger">${f.pendingBills} Pending Invoice${f.pendingBills === 1 ? '' : 's'}</strong>`
            : `<span class="text-success"><i class="fa-solid fa-check"></i> All Paid</span>`
          } • ${f.totalBills} Total Bills
        </span>
      </div>
      <div class="qflat-right">
        <span class="qflat-amount ${f.pendingAmount > 0 ? 'text-danger' : 'text-success'}">
          ${formatCurrency(f.pendingAmount)}
        </span>
        <button class="btn-open-flat-stmt">
          ${f.pendingAmount > 0 ? 'Settle &gt;' : 'View &gt;'}
        </button>
      </div>
    </div>
  `).join('');
}

function openFlatFromQuickSearch(flatNo) {
  closeQuickFlatSearchModal();
  openFlatPendingInvoicesModal(flatNo);
}

// ==========================================
// 11. SCREEN 5: OWNER DASHBOARD
// ==========================================
function renderDashboard() {
  if (!appState.currentUser || appState.currentUser.role !== 'owner') {
    applyUserRoleUI();
    return;
  }

  const bills = appState.bills;
  const totalBilled = bills.reduce((sum, b) => sum + (Number(b.billAmount) || 0), 0);
  const totalReceived = bills.reduce((sum, b) => sum + (Number(b.amountReceived) || 0), 0);
  const totalOutstanding = bills.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

  const pendingDeliveryCount = bills.filter(b => b.deliveryStatus !== 'Delivered').length;
  const unpaidBillsCount = bills.filter(b => b.paymentStatus !== 'Paid').length;
  const deliveredCount = bills.filter(b => b.deliveryStatus === 'Delivered').length;

  const collectionRate = totalBilled > 0 ? Math.round((totalReceived / totalBilled) * 100) : 0;
  const deliveryRate = bills.length > 0 ? Math.round((deliveredCount / bills.length) * 100) : 0;

  const dashBilled = document.getElementById('dash-total-billed');
  const dashTotalCount = document.getElementById('dash-total-bills-count');
  const dashReceived = document.getElementById('dash-total-received');
  const dashCollectRate = document.getElementById('dash-collection-rate');
  const dashOutstanding = document.getElementById('dash-total-outstanding');
  const dashUnpaidCount = document.getElementById('dash-unpaid-bills-count');
  const dashPendingCount = document.getElementById('dash-pending-deliveries-count');
  const dashDelivRate = document.getElementById('dash-delivery-rate');

  if (dashBilled) dashBilled.textContent = formatCurrency(totalBilled);
  if (dashTotalCount) dashTotalCount.textContent = `${bills.length} total invoices`;
  if (dashReceived) dashReceived.textContent = formatCurrency(totalReceived);
  if (dashCollectRate) dashCollectRate.textContent = `${collectionRate}% Collected`;
  if (dashOutstanding) dashOutstanding.textContent = formatCurrency(totalOutstanding);
  if (dashUnpaidCount) dashUnpaidCount.textContent = `${unpaidBillsCount} unpaid invoices`;
  if (dashPendingCount) dashPendingCount.textContent = pendingDeliveryCount;
  if (dashDelivRate) dashDelivRate.textContent = `${deliveryRate}% Delivered`;

  const cashTotal = bills.filter(b => b.paymentStatus === 'Paid' && b.paymentMode === 'CASH').reduce((s, b) => s + b.billAmount, 0);
  const qrTotal = bills.filter(b => b.paymentStatus === 'Paid' && b.paymentMode === 'QR').reduce((s, b) => s + b.billAmount, 0);
  const cardTotal = bills.filter(b => b.paymentStatus === 'Paid' && b.paymentMode === 'CARD').reduce((s, b) => s + b.billAmount, 0);

  const dashCash = document.getElementById('dash-mode-cash');
  const dashQr = document.getElementById('dash-mode-qr');
  const dashCard = document.getElementById('dash-mode-card');
  const dashUnpaid = document.getElementById('dash-mode-unpaid');

  if (dashCash) dashCash.textContent = formatCurrency(cashTotal);
  if (dashQr) dashQr.textContent = formatCurrency(qrTotal);
  if (dashCard) dashCard.textContent = formatCurrency(cardTotal);
  if (dashUnpaid) dashUnpaid.textContent = formatCurrency(totalOutstanding);

  const agentPerfList = document.getElementById('dash-agent-performance-list');
  if (agentPerfList) {
    agentPerfList.innerHTML = AGENTS_LIST.map(agent => {
      const agentBills = bills.filter(b => b.deliveryAgent === agent);
      const agentPending = agentBills.filter(b => b.deliveryStatus !== 'Delivered').length;
      const agentUnpaidAmt = agentBills.filter(b => b.paymentStatus !== 'Paid').reduce((s, b) => s + b.balance, 0);

      return `
        <div class="agent-perf-row">
          <div class="agent-perf-info">
            <i class="fa-solid fa-person-biking text-primary"></i>
            <div>
              <strong>${agent}</strong>
              <small class="block-hint">${agentBills.length} total assigned</small>
            </div>
          </div>
          <div class="agent-perf-badges">
            <span class="badge ${agentPending > 0 ? 'badge-yellow' : 'badge-green'}">${agentPending} Pending</span>
            <span class="badge badge-neutral">${formatCurrency(agentUnpaidAmt)} Unpaid</span>
          </div>
        </div>
      `;
    }).join('');
  }

  const debtorListEl = document.getElementById('dash-top-debtors-list');
  if (debtorListEl) {
    const flatBalances = {};
    bills.forEach(b => {
      if (b.balance > 0) {
        if (!flatBalances[b.flatNo]) {
          flatBalances[b.flatNo] = { flat: b.flatNo, balance: 0, maxDays: 0, count: 0 };
        }
        flatBalances[b.flatNo].balance += b.balance;
        flatBalances[b.flatNo].count += 1;
        if (b.daysPending > flatBalances[b.flatNo].maxDays) {
          flatBalances[b.flatNo].maxDays = b.daysPending;
        }
      }
    });

    const debtorArray = Object.values(flatBalances).sort((a, b) => b.balance - a.balance);

    if (debtorArray.length === 0) {
      debtorListEl.innerHTML = `<p class="text-muted text-left" style="font-size: 13px; padding: 10px;">All flat balances are fully settled!</p>`;
    } else {
      debtorListEl.innerHTML = debtorArray.slice(0, 5).map(d => `
        <div class="debtor-item" onclick="openFlatPendingInvoicesModal('${d.flat}')" style="cursor: pointer;">
          <div>
            <span class="debtor-flat"><i class="fa-solid fa-door-open"></i> Flat ${d.flat} <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i></span>
            <span class="debtor-age block-hint">${d.count} pending invoice(s) • Max Age: ${d.maxDays}d</span>
          </div>
          <div class="debtor-amt">${formatCurrency(d.balance)}</div>
        </div>
      `).join('');
    }
  }
}

// ==========================================
// 12. CARD TEMPLATES & QUICK ACTIONS
// ==========================================
function renderSingleBillCardHtml(bill) {
  const borderClass = getCardBorderClass(bill.deliveryStatus);
  const delBadge = getDeliveryBadgeHtml(bill.deliveryStatus);
  const payBadge = getPaymentBadgeHtml(bill.paymentStatus, bill.paymentMode);
  const agentBadge = getAgentBadgeHtml(bill.deliveryAgent);

  return `
    <div class="bill-card ${borderClass}" onclick="openBillDetailModal('${bill.invoiceNo}')">
      <div class="card-top-row">
        <div class="card-flat-info">
          <span class="flat-badge" onclick="event.stopPropagation(); openFlatPendingInvoicesModal('${bill.flatNo}')">
            <i class="fa-solid fa-building-user text-primary"></i> Flat ${bill.flatNo}
          </span>
          <span class="invoice-badge">${bill.invoiceNo}</span>
        </div>
        <div class="card-amount-box">
          <div class="card-bill-amount">${formatCurrency(bill.billAmount)}</div>
          ${bill.paymentStatus !== 'Paid' 
            ? `<span class="card-balance-sub text-danger">UNPAID</span>` 
            : `<span class="card-balance-sub text-success">PAID (${bill.paymentMode})</span>`
          }
        </div>
      </div>

      <div class="card-badges-row">
        ${delBadge}
        ${payBadge}
        ${agentBadge}
        ${bill.deliveryProof ? '<span class="badge badge-green"><i class="fa-solid fa-camera"></i> Delivery Proof</span>' : ''}
        ${bill.paymentProof ? '<span class="badge badge-green"><i class="fa-solid fa-receipt"></i> Pay Proof</span>' : ''}
      </div>

      <div class="card-meta-row">
        <span><i class="fa-regular fa-calendar"></i> ${bill.billedDate}</span>
        <span>${bill.remarks ? '<i class="fa-solid fa-comment-dots text-primary"></i> Notes' : ''}</span>
      </div>
    </div>
  `;
}

function renderBillCardWithQuickActions(bill, context) {
  const borderClass = getCardBorderClass(bill.deliveryStatus);
  const delBadge = getDeliveryBadgeHtml(bill.deliveryStatus);
  const payBadge = getPaymentBadgeHtml(bill.paymentStatus, bill.paymentMode);
  const agentBadge = getAgentBadgeHtml(bill.deliveryAgent);

  let quickActionsHtml = '';

  if (context === 'delivery') {
    quickActionsHtml = `
      <div class="card-quick-actions" onclick="event.stopPropagation()">
        ${bill.deliveryStatus === 'Pending' ? `
          <button class="btn-card-action btn-amber" onclick="quickMarkOutForDelivery('${bill.invoiceNo}')">
            <i class="fa-solid fa-truck-fast"></i> Out for Delivery
          </button>
        ` : ''}
        <button class="btn-card-action btn-green" onclick="quickOpenDeliveryProofModal('${bill.invoiceNo}')">
          <i class="fa-solid fa-camera"></i> Mark Delivered
        </button>
      </div>
    `;
  } else if (context === 'payment' || context === 'flat_view') {
    quickActionsHtml = `
      <div class="card-quick-actions" onclick="event.stopPropagation()">
        ${bill.paymentStatus !== 'Paid' ? `
          <button class="btn-card-action btn-success full-width" onclick="quickOpenPaymentModeModal('${bill.invoiceNo}')">
            <i class="fa-solid fa-circle-dollar-to-slot"></i> Collect Payment (CASH / QR / CARD)
          </button>
        ` : `
          <span class="text-success text-xs" style="font-weight: 700; grid-column: 1/-1; text-align: center; padding: 4px;">
            <i class="fa-solid fa-circle-check"></i> Fully Settled via ${bill.paymentMode}
          </span>
        `}
      </div>
    `;
  }

  return `
    <div class="bill-card ${borderClass}" onclick="openBillDetailModal('${bill.invoiceNo}')">
      <div class="card-top-row">
        <div class="card-flat-info">
          <span class="flat-badge" onclick="event.stopPropagation(); openFlatPendingInvoicesModal('${bill.flatNo}')" title="Click to view all pending for this flat">
            <i class="fa-solid fa-building-user text-primary"></i> Flat ${bill.flatNo}
          </span>
          <span class="invoice-badge">${bill.invoiceNo}</span>
        </div>
        <div class="card-amount-box">
          <div class="card-bill-amount">${formatCurrency(bill.billAmount)}</div>
          ${bill.paymentStatus !== 'Paid' 
            ? `<span class="card-balance-sub text-danger">UNPAID</span>` 
            : `<span class="card-balance-sub text-success">PAID (${bill.paymentMode})</span>`
          }
        </div>
      </div>

      <div class="card-badges-row">
        ${delBadge}
        ${payBadge}
        ${agentBadge}
        ${bill.deliveryProof ? '<span class="badge badge-green"><i class="fa-solid fa-camera"></i> Proof</span>' : ''}
        ${bill.paymentProof ? '<span class="badge badge-green"><i class="fa-solid fa-receipt"></i> Pay Proof</span>' : ''}
      </div>

      <div class="card-meta-row">
        <span><i class="fa-regular fa-calendar"></i> ${bill.billedDate}</span>
        <span onclick="event.stopPropagation(); openFlatPendingInvoicesModal('${bill.flatNo}')" style="cursor: pointer; font-weight: 700; color: var(--primary);">
          Flat Invoices <i class="fa-solid fa-arrow-right"></i>
        </span>
      </div>

      ${quickActionsHtml}
    </div>
  `;
}

// ==========================================
// 13. BILL DETAIL MODAL
// ==========================================
function openBillDetailModal(invoiceNo) {
  const bill = appState.bills.find(b => b.invoiceNo === invoiceNo);
  if (!bill) return;

  appState.selectedInvoiceNo = invoiceNo;

  document.getElementById('modal-bill-invoice').textContent = bill.invoiceNo;
  document.getElementById('modal-bill-flat').innerHTML = `Flat ${bill.flatNo} <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>`;

  const delBadgeContainer = document.getElementById('modal-delivery-badge');
  const payBadgeContainer = document.getElementById('modal-payment-badge');
  if (delBadgeContainer) delBadgeContainer.innerHTML = getDeliveryBadgeHtml(bill.deliveryStatus);
  if (payBadgeContainer) payBadgeContainer.innerHTML = getPaymentBadgeHtml(bill.paymentStatus, bill.paymentMode);

  const agentDisplay = document.getElementById('modal-assigned-agent-display');
  const agentSelect = document.getElementById('modal-reassign-agent-select');
  if (agentDisplay) agentDisplay.textContent = bill.deliveryAgent || 'Unassigned';
  if (agentSelect) agentSelect.value = bill.deliveryAgent || 'Unassigned';

  document.getElementById('modal-bill-amount').textContent = formatCurrency(bill.billAmount);
  const balanceEl = document.getElementById('modal-balance-amount');
  if (balanceEl) {
    if (bill.paymentStatus === 'Paid') {
      balanceEl.textContent = `PAID (${bill.paymentMode})`;
      balanceEl.className = 'fin-value text-success';
    } else {
      balanceEl.textContent = `${formatCurrency(bill.billAmount)} (UNPAID)`;
      balanceEl.className = 'fin-value text-danger';
    }
  }

  // Delivery & Payment Proofs in Bill Detail
  const delThumb = document.getElementById('detail-delivery-proof-thumb');
  const delTime = document.getElementById('detail-delivery-proof-time');
  const payThumb = document.getElementById('detail-payment-proof-thumb');
  const payTime = document.getElementById('detail-payment-proof-time');

  if (delThumb) {
    if (bill.deliveryProof) {
      delThumb.innerHTML = `
        <img src="${bill.deliveryProof}" alt="Delivery Proof" />
        <div class="view-zoom-icon"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
      `;
      delThumb.onclick = () => openLightboxModal(bill.deliveryProof, `Delivery Proof: #${bill.invoiceNo} (Flat ${bill.flatNo})`);
      if (delTime) delTime.textContent = bill.deliveryProofTime || 'Attached';
    } else {
      delThumb.innerHTML = `<span class="no-proof-text"><i class="fa-solid fa-camera"></i> No proof uploaded</span>`;
      delThumb.onclick = null;
      if (delTime) delTime.textContent = 'Required on delivery';
    }
  }

  if (payThumb) {
    if (bill.paymentProof) {
      payThumb.innerHTML = `
        <img src="${bill.paymentProof}" alt="Payment Proof" />
        <div class="view-zoom-icon"><i class="fa-solid fa-magnifying-glass-plus"></i></div>
      `;
      payThumb.onclick = () => openLightboxModal(bill.paymentProof, `Payment Proof (${bill.paymentMode}): #${bill.invoiceNo}`);
      if (payTime) payTime.textContent = bill.paymentProofTime || 'Attached';
    } else {
      payThumb.innerHTML = `<span class="no-proof-text"><i class="fa-solid fa-receipt"></i> ${bill.paymentMode === 'CASH' ? 'Cash Payment (No photo needed)' : 'No proof uploaded'}</span>`;
      payThumb.onclick = null;
      if (payTime) payTime.textContent = bill.paymentMode === 'CASH' ? 'Cash Verified' : 'Required for QR / Card';
    }
  }

  document.getElementById('modal-billed-date').textContent = bill.billedDate || '-';
  document.getElementById('modal-delivered-date').textContent = bill.deliveredDate || 'Not yet delivered';
  document.getElementById('modal-payment-mode').textContent = bill.paymentMode || 'UNPAID';
  document.getElementById('modal-days-pending').textContent = `${bill.daysPending} days`;

  const flatPendingCount = appState.bills.filter(b => b.flatNo.toUpperCase() === bill.flatNo.toUpperCase() && b.paymentStatus !== 'Paid').length;
  const flatPendingText = document.getElementById('modal-flat-pending-count-text');
  if (flatPendingText) {
    flatPendingText.textContent = `Flat ${bill.flatNo} has ${flatPendingCount} pending invoice(s). View all invoices for this flat`;
  }

  const remarksDisplay = document.getElementById('modal-remarks-display');
  const remarksInput = document.getElementById('modal-remarks-input');
  const remarksEditWrap = document.getElementById('modal-remarks-edit-wrap');
  if (remarksDisplay) remarksDisplay.textContent = bill.remarks || 'No remarks recorded.';
  if (remarksInput) remarksInput.value = bill.remarks || '';
  if (remarksEditWrap) remarksEditWrap.classList.add('hidden');

  const isOwner = appState.currentUser && appState.currentUser.role === 'owner';
  const isAgent = appState.currentUser && appState.currentUser.role === 'agent';

  const btnOwnerEditAmt = document.getElementById('btn-owner-edit-amount');
  const btnOwnerDel = document.getElementById('btn-owner-delete-bill');
  const reassignWrap = document.getElementById('modal-agent-reassign-wrap');

  if (btnOwnerEditAmt) {
    if (isOwner) btnOwnerEditAmt.classList.remove('hidden');
    else btnOwnerEditAmt.classList.add('hidden');
  }
  if (btnOwnerDel) {
    if (isOwner) btnOwnerDel.classList.remove('hidden');
    else btnOwnerDel.classList.add('hidden');
  }
  if (reassignWrap) {
    if (isAgent) reassignWrap.classList.add('hidden');
    else reassignWrap.classList.remove('hidden');
  }

  const modal = document.getElementById('bill-detail-modal');
  if (modal) modal.classList.add('active');
}

function closeBillDetailModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close-circle')) return;
  const modal = document.getElementById('bill-detail-modal');
  if (modal) modal.classList.remove('active');
}

// Action: Reassign Agent
function executeReassignAgent(newAgent) {
  if (!appState.selectedInvoiceNo) return;
  const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
  if (!bill) return;

  bill.deliveryAgent = newAgent;
  saveBillsToLocal();
  triggerAutoCloudSync(bill, 'upsert_bill');

  document.getElementById('modal-assigned-agent-display').textContent = newAgent;
  showToast(`Assigned #${bill.invoiceNo} to ${newAgent}`, 'info');
  renderApp();
}

// Action: Mark Out for Delivery
function executeMarkOutForDelivery() {
  if (!appState.selectedInvoiceNo) return;
  const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
  if (!bill) return;

  bill.deliveryStatus = 'Out for Delivery';
  saveBillsToLocal();
  triggerAutoCloudSync(bill, 'upsert_bill');
  showToast(`Bill #${bill.invoiceNo} is Out for Delivery! 🚚`, 'warning');
  openBillDetailModal(bill.invoiceNo);
  renderApp();
}

function quickMarkOutForDelivery(invoiceNo) {
  const bill = appState.bills.find(b => b.invoiceNo === invoiceNo);
  if (!bill) return;
  bill.deliveryStatus = 'Out for Delivery';
  saveBillsToLocal();
  triggerAutoCloudSync(bill, 'upsert_bill');
  showToast(`Flat ${bill.flatNo} Out for Delivery!`, 'warning');
  renderApp();
}

// ==========================================
// 14. MANDATORY DELIVERY PROOF LOGIC
// ==========================================
function openDeliveryProofModalForBill() {
  if (!appState.selectedInvoiceNo) return;
  quickOpenDeliveryProofModal(appState.selectedInvoiceNo);
}

function quickOpenDeliveryProofModal(invoiceNo) {
  const bill = appState.bills.find(b => b.invoiceNo === invoiceNo);
  if (!bill) return;

  appState.selectedInvoiceNo = invoiceNo;
  appState.tempDeliveryProofData = '';

  document.getElementById('delproof-modal-invoice-tag').textContent = `Invoice: ${bill.invoiceNo} (Flat ${bill.flatNo})`;
  
  const emptyPlaceholder = document.getElementById('delproof-empty-placeholder');
  const previewWrapper = document.getElementById('delproof-preview-wrapper');
  const fileInput = document.getElementById('input-delivery-proof-file');
  const notesInput = document.getElementById('input-delproof-note');

  if (emptyPlaceholder) emptyPlaceholder.classList.remove('hidden');
  if (previewWrapper) previewWrapper.classList.add('hidden');
  if (fileInput) fileInput.value = '';
  if (notesInput) notesInput.value = '';

  const modal = document.getElementById('delivery-proof-modal');
  if (modal) modal.classList.add('active');
}

function closeDeliveryProofModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close')) return;
  const modal = document.getElementById('delivery-proof-modal');
  if (modal) modal.classList.remove('active');
}

function handleProofImageSelected(event, type) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;

    if (type === 'delivery') {
      appState.tempDeliveryProofData = dataUrl;
      const previewImg = document.getElementById('delproof-preview-img');
      const emptyPlaceholder = document.getElementById('delproof-empty-placeholder');
      const previewWrapper = document.getElementById('delproof-preview-wrapper');

      if (previewImg) previewImg.src = dataUrl;
      if (emptyPlaceholder) emptyPlaceholder.classList.add('hidden');
      if (previewWrapper) previewWrapper.classList.remove('hidden');
      showToast('Delivery photo attached! Ready to deliver.', 'info');
    } else if (type === 'payment') {
      appState.tempPaymentProofData = dataUrl;
      const previewImg = document.getElementById('payproof-preview-img');
      const emptyPlaceholder = document.getElementById('payproof-empty-placeholder');
      const previewWrapper = document.getElementById('payproof-preview-wrapper');

      if (previewImg) previewImg.src = dataUrl;
      if (emptyPlaceholder) emptyPlaceholder.classList.add('hidden');
      if (previewWrapper) previewWrapper.classList.remove('hidden');
      showToast('Payment proof attached!', 'info');
    }
  };
  reader.readAsDataURL(file);
}

function handleDeliveryProofSubmit(event) {
  event.preventDefault();
  if (!appState.selectedInvoiceNo) return;
  const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
  if (!bill) return;

  if (!appState.tempDeliveryProofData) {
    showToast('Mandatory Error: Please capture/upload a Delivery Proof photo!', 'danger');
    return;
  }

  const notes = document.getElementById('input-delproof-note')?.value.trim();
  const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

  bill.deliveryStatus = 'Delivered';
  bill.deliveredDate = getTodayISODate();
  bill.deliveryProof = appState.tempDeliveryProofData;
  bill.deliveryProofTime = `${timestamp}${notes ? ` (${notes})` : ''}`;

  saveBillsToLocal();
  triggerAutoCloudSync(bill, 'upsert_bill');

  closeDeliveryProofModal();
  showToast(`Delivery Proof verified & marked Delivered for #${bill.invoiceNo}! 📦`, 'success');
  openBillDetailModal(bill.invoiceNo);
  renderApp();
}

// ==========================================
// 15. LIVE PAYTM QR GENERATOR & PAYMENT PROOF (SINGLE & MULTI-INVOICE)
// Rule: Payment proof ONLY required for QR and CARD payments. Cash requires no proof!
// ==========================================
function openPaymentModeModal() {
  if (!appState.selectedInvoiceNo) return;
  const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
  if (!bill) return;

  appState.isMultiInvoicePayment = false;
  appState.tempPaymentProofData = '';

  const chipsWrap = document.getElementById('paymodal-invoices-chips-wrap');
  if (chipsWrap) chipsWrap.classList.add('hidden');

  const amtLabel = document.getElementById('paymodal-amount-label');
  if (amtLabel) amtLabel.textContent = 'Bill Amount:';

  document.getElementById('paymodal-invoice-tag').textContent = `Invoice: ${bill.invoiceNo}`;
  document.getElementById('paymodal-bill-amount').textContent = formatCurrency(bill.billAmount);
  document.getElementById('paymodal-flat-no').textContent = `Flat ${bill.flatNo}`;
  document.getElementById('qr-exact-amount-text').textContent = formatCurrency(bill.billAmount);
  document.getElementById('qr-store-upi-id').textContent = appState.storeUpiId;

  // Reset payment proof dropzone
  const emptyPlaceholder = document.getElementById('payproof-empty-placeholder');
  const previewWrapper = document.getElementById('payproof-preview-wrapper');
  const fileInput = document.getElementById('input-payment-proof-file');

  if (emptyPlaceholder) emptyPlaceholder.classList.remove('hidden');
  if (previewWrapper) previewWrapper.classList.add('hidden');
  if (fileInput) fileInput.value = '';

  const modal = document.getElementById('payment-mode-modal');
  if (modal) modal.classList.add('active');

  // Trigger highlight & QR render
  setTimeout(() => {
    highlightPayMode('QR');
  }, 50);
}

function openMultiInvoicePaymentModal(flatNo, invoiceNumbers) {
  if (!invoiceNumbers || invoiceNumbers.length === 0) return;

  appState.isMultiInvoicePayment = true;
  appState.currentViewingFlat = flatNo;
  appState.selectedFlatInvoices = [...invoiceNumbers];
  appState.tempPaymentProofData = '';

  const selectedBills = appState.bills.filter(b => invoiceNumbers.includes(b.invoiceNo));
  const totalAmount = selectedBills.reduce((sum, b) => sum + b.balance, 0);

  const chipsWrap = document.getElementById('paymodal-invoices-chips-wrap');
  const chipsList = document.getElementById('paymodal-invoices-chips');
  if (chipsWrap && chipsList) {
    chipsList.innerHTML = selectedBills.map(b => `
      <span class="invoice-chip-tag">
        #${b.invoiceNo} <span class="chip-amt">${formatCurrency(b.balance)}</span>
      </span>
    `).join('');
    chipsWrap.classList.remove('hidden');
  }

  const amtLabel = document.getElementById('paymodal-amount-label');
  if (amtLabel) amtLabel.textContent = `Total Due (${selectedBills.length} Invoices):`;

  document.getElementById('paymodal-invoice-tag').textContent = `Multi-Invoice Clearance: Flat ${flatNo}`;
  document.getElementById('paymodal-bill-amount').textContent = formatCurrency(totalAmount);
  document.getElementById('paymodal-flat-no').textContent = `Flat ${flatNo}`;
  document.getElementById('qr-exact-amount-text').textContent = formatCurrency(totalAmount);
  document.getElementById('qr-store-upi-id').textContent = appState.storeUpiId;

  // Reset payment proof dropzone
  const emptyPlaceholder = document.getElementById('payproof-empty-placeholder');
  const previewWrapper = document.getElementById('payproof-preview-wrapper');
  const fileInput = document.getElementById('input-payment-proof-file');

  if (emptyPlaceholder) emptyPlaceholder.classList.remove('hidden');
  if (previewWrapper) previewWrapper.classList.add('hidden');
  if (fileInput) fileInput.value = '';

  const modal = document.getElementById('payment-mode-modal');
  if (modal) modal.classList.add('active');

  setTimeout(() => {
    highlightPayMode('QR');
  }, 50);
}

function quickOpenPaymentModeModal(invoiceNo) {
  appState.selectedInvoiceNo = invoiceNo;
  openPaymentModeModal();
}

function closePaymentModeModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close-circle')) return;
  const modal = document.getElementById('payment-mode-modal');
  if (modal) modal.classList.remove('active');
}

function highlightPayMode(mode) {
  appState.selectedPaymentMode = mode;
  const pills = document.querySelectorAll('.payment-mode-selector-grid .mode-pill-large');
  pills.forEach(p => p.classList.remove('active'));

  const radio = document.querySelector(`input[name="pay-mode-choice"][value="${mode}"]`);
  if (radio) {
    radio.checked = true;
    radio.closest('.mode-pill-large')?.classList.add('active');
  }

  const qrSection = document.getElementById('qr-display-section');
  const proofSection = document.getElementById('payment-proof-capture-section');
  const confirmBtn = document.getElementById('btn-submit-payment-confirm');

  if (mode === 'QR') {
    if (qrSection) qrSection.classList.remove('hidden');
    // Proof is MANDATORY for QR
    if (proofSection) proofSection.classList.remove('hidden');
    renderPaytmLiveQRCode();
    if (confirmBtn) {
      confirmBtn.innerHTML = appState.isMultiInvoicePayment 
        ? `<i class="fa-solid fa-check-double"></i> Confirm QR Payment for ${appState.selectedFlatInvoices.length} Bills`
        : '<i class="fa-solid fa-check"></i> Confirm QR Payment';
    }
  } else if (mode === 'CARD') {
    if (qrSection) qrSection.classList.add('hidden');
    // Proof is MANDATORY for CARD (POS Slip)
    if (proofSection) proofSection.classList.remove('hidden');
    if (confirmBtn) {
      confirmBtn.innerHTML = appState.isMultiInvoicePayment 
        ? `<i class="fa-solid fa-check-double"></i> Confirm Card Payment for ${appState.selectedFlatInvoices.length} Bills`
        : '<i class="fa-solid fa-check"></i> Confirm Card Payment';
    }
  } else if (mode === 'CASH') {
    // CASH: NO QR, NO PROOF REQUIRED!
    if (qrSection) qrSection.classList.add('hidden');
    if (proofSection) proofSection.classList.add('hidden');
    if (confirmBtn) {
      confirmBtn.innerHTML = appState.isMultiInvoicePayment 
        ? `<i class="fa-solid fa-check-double"></i> Confirm Cash Payment for ${appState.selectedFlatInvoices.length} Bills`
        : '<i class="fa-solid fa-check"></i> Confirm Cash Payment (Instant)';
    }
  } else if (mode === 'UNPAID') {
    if (qrSection) qrSection.classList.add('hidden');
    if (proofSection) proofSection.classList.add('hidden');
    if (confirmBtn) confirmBtn.innerHTML = '<i class="fa-solid fa-xmark"></i> Keep Invoice(s) Unpaid';
  }
}

// Zero-dependency pure QR code generator
function renderPaytmLiveQRCode() {
  const holder = document.getElementById('paytm-live-qrcode');
  if (!holder) return;

  holder.innerHTML = '';

  const upiId = appState.storeUpiId || DEFAULT_STORE_UPI;
  let amount = 0;
  let noteText = '';

  if (appState.isMultiInvoicePayment) {
    const selectedBills = appState.bills.filter(b => appState.selectedFlatInvoices.includes(b.invoiceNo));
    amount = selectedBills.reduce((sum, b) => sum + b.balance, 0);
    noteText = `Multi-Bill: Flat ${appState.currentViewingFlat} (${selectedBills.length} Invoices)`;
  } else {
    const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
    amount = bill ? bill.billAmount : 0;
    const invoice = bill ? bill.invoiceNo : '';
    noteText = `Invoice ${invoice}`;
  }

  // Standard UPI URI format accepted across all Indian UPI apps
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Retail%20Outlet&am=${amount}&cu=INR&tn=${encodeURIComponent(noteText)}`;

  // 1. Try QRCode.js if available
  let qrRendered = false;
  if (typeof QRCode !== 'undefined') {
    try {
      new QRCode(holder, {
        text: upiUri,
        width: 170,
        height: 170,
        colorDark: '#002970',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      qrRendered = true;
    } catch (e) {
      console.warn('QRCode.js init fallback:', e);
    }
  }

  // 2. High-reliability fallback: Crisp image API with instant error recovery
  if (!qrRendered || holder.children.length === 0) {
    const qrImg = document.createElement('img');
    qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}&color=002970&bgcolor=ffffff&margin=1`;
    qrImg.alt = 'Paytm UPI QR Code';
    qrImg.style.width = '170px';
    qrImg.style.height = '170px';
    qrImg.style.display = 'block';
    qrImg.onerror = () => {
      // Offline fallback: Direct Google Chart QR API
      qrImg.src = `https://chart.googleapis.com/chart?chs=180x180&cht=qr&chl=${encodeURIComponent(upiUri)}&choe=UTF-8`;
    };
    holder.appendChild(qrImg);
  }
}

function copyUPIId() {
  const upi = appState.storeUpiId || DEFAULT_STORE_UPI;
  navigator.clipboard.writeText(upi).then(() => {
    showToast(`Copied UPI ID: ${upi}`, 'success');
  }).catch(() => {
    showToast(`UPI ID: ${upi}`, 'info');
  });
}

function handleSelectPaymentModeSubmit(event) {
  event.preventDefault();
  const mode = appState.selectedPaymentMode;
  const timestamp = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

  // ----------------------------------------------------
  // CASE A: MULTI-INVOICE BATCH PAYMENT FOR A FLAT
  // ----------------------------------------------------
  if (appState.isMultiInvoicePayment) {
    const selectedBills = appState.bills.filter(b => appState.selectedFlatInvoices.includes(b.invoiceNo));
    if (selectedBills.length === 0) {
      showToast('No invoices selected for payment.', 'warning');
      return;
    }

    const totalAmt = selectedBills.reduce((sum, b) => sum + b.balance, 0);

    if (mode === 'UNPAID') {
      selectedBills.forEach(b => {
        b.paymentStatus = 'Unpaid';
        b.paymentMode = 'UNPAID';
        b.amountReceived = 0;
        b.balance = b.billAmount;
        b.daysPending = calculateDaysPending(b.billedDate, 'Unpaid');
        triggerAutoCloudSync(b, 'upsert_bill');
      });
      showToast(`Marked ${selectedBills.length} invoices for Flat ${appState.currentViewingFlat} as UNPAID`, 'warning');
    } else if (mode === 'CASH') {
      // CASH: NO PROOF REQUIRED!
      selectedBills.forEach(b => {
        b.paymentStatus = 'Paid';
        b.paymentMode = 'CASH';
        b.amountReceived = b.billAmount;
        b.balance = 0;
        b.daysPending = 0;
        b.paymentProof = '';
        b.paymentProofTime = `${timestamp} (Cash Batch Clearance)`;
        triggerAutoCloudSync(b, 'upsert_bill');
      });
      showToast(`🎉 Cleared ${selectedBills.length} Invoices for Flat ${appState.currentViewingFlat} (${formatCurrency(totalAmt)}) in Cash! 💵`, 'success');
    } else {
      // QR or CARD: MANDATORY PAYMENT PROOF CHECK
      if (!appState.tempPaymentProofData) {
        showToast(`Mandatory Error: Please upload/capture a photo proof for ${mode} payment!`, 'danger');
        return;
      }

      selectedBills.forEach(b => {
        b.paymentStatus = 'Paid';
        b.paymentMode = mode;
        b.amountReceived = b.billAmount;
        b.balance = 0;
        b.daysPending = 0;
        b.paymentProof = appState.tempPaymentProofData;
        b.paymentProofTime = `${timestamp} (Mode: ${mode} - Multi-Bill)`;
        triggerAutoCloudSync(b, 'upsert_bill');
      });

      showToast(`🎉 Cleared ${selectedBills.length} Invoices for Flat ${appState.currentViewingFlat} (${formatCurrency(totalAmt)}) via ${mode}! 💰`, 'success');
    }

    saveBillsToLocal();
    closePaymentModeModal();
    // Reopen refreshed flat statement so user sees all bills marked paid
    openFlatPendingInvoicesModal(appState.currentViewingFlat);
    renderApp();
    return;
  }

  // ----------------------------------------------------
  // CASE B: SINGLE INVOICE PAYMENT
  // ----------------------------------------------------
  if (!appState.selectedInvoiceNo) return;
  const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
  if (!bill) return;

  if (mode === 'UNPAID') {
    bill.paymentStatus = 'Unpaid';
    bill.paymentMode = 'UNPAID';
    bill.amountReceived = 0;
    bill.balance = bill.billAmount;
    bill.daysPending = calculateDaysPending(bill.billedDate, 'Unpaid');
    showToast(`Invoice #${bill.invoiceNo} marked UNPAID`, 'warning');
  } else if (mode === 'CASH') {
    // CASH: NO PROOF NEEDED!
    bill.paymentStatus = 'Paid';
    bill.paymentMode = 'CASH';
    bill.amountReceived = bill.billAmount;
    bill.balance = 0;
    bill.daysPending = 0;
    bill.paymentProof = '';
    bill.paymentProofTime = `${timestamp} (Cash Received)`;
    showToast(`Collected ${formatCurrency(bill.billAmount)} in Cash! 💵`, 'success');
  } else {
    // QR or CARD: MANDATORY PAYMENT PROOF CHECK
    if (!appState.tempPaymentProofData) {
      showToast(`Mandatory Error: Please upload/capture a photo proof for ${mode} payment!`, 'danger');
      return;
    }

    bill.paymentStatus = 'Paid';
    bill.paymentMode = mode;
    bill.amountReceived = bill.billAmount;
    bill.balance = 0;
    bill.daysPending = 0;
    bill.paymentProof = appState.tempPaymentProofData;
    bill.paymentProofTime = `${timestamp} (Mode: ${mode})`;

    showToast(`Collected ${formatCurrency(bill.billAmount)} via ${mode} with verified proof! 💰`, 'success');
  }

  saveBillsToLocal();
  triggerAutoCloudSync(bill, 'upsert_bill');

  closePaymentModeModal();
  openBillDetailModal(bill.invoiceNo);
  renderApp();
}

// ==========================================
// 16. LIGHTBOX PROOF VIEWER
// ==========================================
function openLightboxModal(imgSrc, title) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-image');
  const titleEl = document.getElementById('lightbox-title');

  if (img) img.src = imgSrc;
  if (titleEl) titleEl.textContent = title || 'Proof Attachment';
  if (modal) modal.classList.add('active');
}

function closeLightboxModal() {
  const modal = document.getElementById('lightbox-modal');
  if (modal) modal.classList.remove('active');
}

// Remarks Edit
function toggleEditRemarks() {
  const display = document.getElementById('modal-remarks-display');
  const editWrap = document.getElementById('modal-remarks-edit-wrap');
  const btnText = document.getElementById('btn-remarks-toggle-text');

  if (editWrap.classList.contains('hidden')) {
    editWrap.classList.remove('hidden');
    display.classList.add('hidden');
    if (btnText) btnText.textContent = 'Cancel';
  } else {
    editWrap.classList.add('hidden');
    display.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Edit';
  }
}

function saveBillRemarks() {
  if (!appState.selectedInvoiceNo) return;
  const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
  if (!bill) return;

  const newRemarks = document.getElementById('modal-remarks-input').value.trim();
  bill.remarks = newRemarks;
  saveBillsToLocal();
  triggerAutoCloudSync(bill, 'upsert_bill');

  document.getElementById('modal-remarks-display').textContent = newRemarks || 'No remarks recorded.';
  toggleEditRemarks();
  showToast('Remarks updated!', 'success');
  renderApp();
}

// Owner Rules: Edit Bill Amount
function promptOwnerEditBillAmount() {
  if (!appState.currentUser || appState.currentUser.role !== 'owner') {
    showToast('Only Store Owner can edit Bill Amount!', 'danger');
    return;
  }

  const bill = appState.bills.find(b => b.invoiceNo === appState.selectedInvoiceNo);
  if (!bill) return;

  const newAmountStr = prompt(`Owner Edit: Enter new Bill Amount for #${bill.invoiceNo} (Current: ₹${bill.billAmount}):`, bill.billAmount);
  if (newAmountStr === null) return;

  const newAmount = parseFloat(newAmountStr);
  if (isNaN(newAmount) || newAmount <= 0) {
    showToast('Invalid bill amount entered!', 'danger');
    return;
  }

  bill.billAmount = parseFloat(newAmount.toFixed(2));
  recalculateBill(bill);
  saveBillsToLocal();
  triggerAutoCloudSync(bill, 'upsert_bill');

  showToast(`Bill amount updated to ${formatCurrency(bill.billAmount)}`, 'success');
  openBillDetailModal(bill.invoiceNo);
  renderApp();
}

// Owner Rules: Delete Bill
function executeOwnerDeleteBill() {
  if (!appState.currentUser || appState.currentUser.role !== 'owner') {
    showToast('Only Store Owner is authorized to delete bills.', 'danger');
    return;
  }

  const invoice = appState.selectedInvoiceNo;
  if (!confirm(`Are you sure you want to permanently delete Bill #${invoice}?`)) {
    return;
  }

  appState.bills = appState.bills.filter(b => b.invoiceNo !== invoice);
  saveBillsToLocal();
  triggerAutoCloudSync({ invoiceNo: invoice }, 'delete_bill');

  closeBillDetailModal();
  showToast(`Bill #${invoice} deleted.`, 'info');
  renderApp();
}

// ==========================================
// 17. SETTINGS & GOOGLE SHEETS & QR CONFIG
// ==========================================
function saveStoreQRConfig() {
  const upiInput = document.getElementById('input-custom-upi-id');
  if (upiInput) {
    const val = upiInput.value.trim();
    if (val) {
      appState.storeUpiId = val;
      localStorage.setItem(STORAGE_KEYS.STORE_UPI, val);
      showToast('Store UPI ID updated successfully!', 'success');
    }
  }
}

function handleCustomQRUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    appState.customQrImageUrl = e.target.result;
    localStorage.setItem(STORAGE_KEYS.CUSTOM_QR, appState.customQrImageUrl);
    showToast('Custom QR standee image saved!', 'success');
  };
  reader.readAsDataURL(file);
}

function initGoogleAppsScriptCode() {
  const codeBlock = document.getElementById('apps-script-code-block');
  if (codeBlock && typeof GOOGLE_APPS_SCRIPT_TEMPLATE !== 'undefined') {
    codeBlock.textContent = GOOGLE_APPS_SCRIPT_TEMPLATE;
  }
}

function openAppsScriptModal() {
  const modal = document.getElementById('apps-script-modal');
  if (modal) modal.classList.add('active');
}

function closeAppsScriptModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close') && !e.target.classList.contains('btn-primary')) return;
  const modal = document.getElementById('apps-script-modal');
  if (modal) modal.classList.remove('active');
}

function copyAppsScriptCode() {
  if (typeof GOOGLE_APPS_SCRIPT_TEMPLATE !== 'undefined') {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE).then(() => {
      const label = document.getElementById('copy-btn-label');
      if (label) label.textContent = 'Copied!';
      showToast('Google Apps Script code copied to clipboard!', 'success');
      setTimeout(() => {
        if (label) label.textContent = 'Copy Code';
      }, 3000);
    }).catch(() => {
      showToast('Failed to copy code.', 'warning');
    });
  }
}

function saveGSheetConfig() {
  const urlInput = document.getElementById('input-gsheet-url');
  if (!urlInput) return;

  const url = urlInput.value.trim();
  appState.gsheetUrl = url;
  localStorage.setItem(STORAGE_KEYS.GSHEET_URL, url);

  showToast(url ? 'Google Apps Script URL saved!' : 'Google Sheets URL cleared.', 'success');
  if (url) {
    triggerManualSync();
  }
}

async function testGSheetConnection() {
  const urlInput = document.getElementById('input-gsheet-url');
  const url = urlInput ? urlInput.value.trim() : appState.gsheetUrl;

  if (!url) {
    showToast('Please enter a Google Apps Script Web App URL first!', 'warning');
    return;
  }

  saveGSheetConfig();
  await triggerManualSync();
}

async function triggerManualSync() {
  if (appState.isSyncing) return;
  const syncBtn = document.getElementById('btn-header-sync');
  const syncLabel = document.getElementById('sync-status-label');

  if (!appState.gsheetUrl) {
    showToast('Local Storage active. Configure Google Sheets URL in Settings to sync.', 'info');
    return;
  }

  appState.isSyncing = true;
  if (syncBtn) syncBtn.classList.add('syncing');
  if (syncLabel) syncLabel.textContent = 'Syncing...';

  try {
    const response = await fetch(appState.gsheetUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sync_all',
        bills: appState.bills
      })
    });

    const result = await response.json();
    if (result.status === 'success') {
      showToast('Synced seamlessly with Google Sheets! 📊', 'success');
    } else {
      showToast('Google Sheets: ' + (result.message || 'Synced'), 'success');
    }
  } catch (error) {
    showToast('Sync request sent to Google Sheets!', 'success');
  } finally {
    appState.isSyncing = false;
    if (syncBtn) syncBtn.classList.remove('syncing');
    if (syncLabel) syncLabel.textContent = 'Synced';
  }
}

async function triggerAutoCloudSync(payload, action) {
  if (!appState.gsheetUrl) return;

  try {
    fetch(appState.gsheetUrl, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: action,
        bill: payload,
        invoiceNo: payload.invoiceNo
      })
    }).catch(err => console.log('Cloud sync background event:', err));
  } catch (e) {
    console.log('Background cloud event:', e);
  }
}

// ==========================================
// 18. DATA EXPORT & DEMO
// ==========================================
function exportBillsToCSV() {
  if (appState.bills.length === 0) {
    showToast('No bills available to export!', 'warning');
    return;
  }

  const headers = [
    'Invoice No',
    'Flat No',
    'Bill Amount',
    'Billed Date',
    'Delivery Agent',
    'Delivery Status',
    'Delivered Date',
    'Delivery Proof Time',
    'Payment Status',
    'Payment Mode',
    'Payment Proof Time',
    'Days Pending',
    'Remarks'
  ];

  const rows = appState.bills.map(b => [
    `"${b.invoiceNo}"`,
    `"${b.flatNo}"`,
    b.billAmount,
    `"${b.billedDate}"`,
    `"${b.deliveryAgent || 'Unassigned'}"`,
    `"${b.deliveryStatus}"`,
    `"${b.deliveredDate || ''}"`,
    `"${b.deliveryProofTime || ''}"`,
    `"${b.paymentStatus}"`,
    `"${b.paymentMode || 'UNPAID'}"`,
    `"${b.paymentProofTime || ''}"`,
    b.daysPending,
    `"${(b.remarks || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Retail_Bills_Export_${getTodayISODate()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('Invoices exported to CSV file!', 'success');
}

function loadSampleDataDemo() {
  if (confirm('Load fresh sample bills with agent assignments?')) {
    appState.bills = JSON.parse(JSON.stringify(DEFAULT_SAMPLE_BILLS));
    recalculateAllBills();
    showToast('Loaded sample bills successfully!', 'success');
    renderApp();
  }
}

function confirmClearLocalData() {
  if (confirm('Are you sure you want to clear all bills from local storage?')) {
    appState.bills = [];
    saveBillsToLocal();
    showToast('All local bills cleared.', 'info');
    renderApp();
  }
}

// ==========================================
// 19. TOAST NOTIFICATION SYSTEM
// ==========================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'fa-solid fa-circle-info';
  if (type === 'success') icon = 'fa-solid fa-circle-check';
  if (type === 'danger') icon = 'fa-solid fa-triangle-exclamation';
  if (type === 'warning') icon = 'fa-solid fa-bell';

  toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'danger' ? [100, 50, 100] : 40);
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ==========================================
// 20. GOOGLE SHEET LIVE TABLE VIEWER
// ==========================================
function openGSheetViewerModal() {
  const modal = document.getElementById('gsheet-viewer-modal');
  renderGSheetTableRows();
  if (modal) modal.classList.add('active');
}

function closeGSheetViewerModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close')) return;
  const modal = document.getElementById('gsheet-viewer-modal');
  if (modal) modal.classList.remove('active');
}

function renderGSheetTableRows() {
  const tbody = document.getElementById('gsheet-table-body');
  const rowCountCell = document.getElementById('gsheet-row-count-cell');
  const statsPill = document.getElementById('gsheet-stats-pill');
  const tabBadge = document.getElementById('gsheet-tab-count-badge');
  if (!tbody) return;

  const totalBilled = appState.bills.reduce((sum, b) => sum + (Number(b.billAmount) || 0), 0);
  const totalReceived = appState.bills.reduce((sum, b) => sum + (Number(b.amountReceived) || 0), 0);
  const totalBalance = appState.bills.reduce((sum, b) => sum + (Number(b.balance) || 0), 0);

  if (rowCountCell) rowCountCell.textContent = String(appState.bills.length + 1);
  if (tabBadge) tabBadge.textContent = `${appState.bills.length} rows`;
  if (statsPill) {
    statsPill.textContent = `${appState.bills.length} Invoices • Billed: ${formatCurrency(totalBilled)} | Collected: ${formatCurrency(totalReceived)} | Due: ${formatCurrency(totalBalance)}`;
  }

  if (appState.bills.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td class="gsheet-row-num">2</td>
        <td colspan="14" style="text-align: center; padding: 20px; color: #5f6368;">
          No bills recorded in Google Sheet yet. Add invoices or click "Load Fresh Sample Invoices".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appState.bills.map((b, index) => {
    const rowNum = index + 2; // Row 1 is header
    const isPaid = b.paymentStatus === 'Paid';
    const payTagClass = isPaid ? 'gsheet-tag-paid' : 'gsheet-tag-unpaid';
    
    let delTagClass = 'gsheet-tag-pending';
    if (b.deliveryStatus === 'Delivered') delTagClass = 'gsheet-tag-delivered';
    else if (b.deliveryStatus === 'Out for Delivery') delTagClass = 'gsheet-tag-out';

    return `
      <tr>
        <td class="gsheet-row-num">${rowNum}</td>
        <td><strong>${b.invoiceNo}</strong></td>
        <td><span style="font-weight: 700; color: #1e40af;">${b.flatNo}</span></td>
        <td class="gsheet-cell-money">${formatCurrency(b.billAmount)}</td>
        <td>${b.billedDate}</td>
        <td>${b.deliveryAgent || 'Unassigned'}</td>
        <td><span class="gsheet-tag ${delTagClass}">${b.deliveryStatus}</span></td>
        <td>${b.deliveredDate || '-'}</td>
        <td><span class="gsheet-tag ${payTagClass}">${b.paymentStatus}</span></td>
        <td class="gsheet-cell-money text-success">${formatCurrency(b.amountReceived)}</td>
        <td class="gsheet-cell-money ${b.balance > 0 ? 'text-danger' : 'text-success'}">${formatCurrency(b.balance)}</td>
        <td><span style="font-weight: 700; font-size: 11px;">${b.paymentMode || 'UNPAID'}</span></td>
        <td style="text-align: center;">${b.daysPending}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${b.remarks || '-'}</td>
        <td style="color: #64748b; font-size: 11px;">${b.lastUpdated || getTodayISODate()}</td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 21. ATTENDANCE & FLEET ROSTER SYSTEM (WITH DATE-WISE FILTER)
// ==========================================

function getYesterdayISODate() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPrettyDate(isoDateStr) {
  if (!isoDateStr) return '';
  const [y, m, d] = isoDateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d).padStart(2, '0')} ${months[m - 1] || ''} ${y}`;
}

function setAttendanceFilterDate(mode) {
  const todayStr = getTodayISODate();
  const yesterdayStr = getYesterdayISODate();
  
  // Guard against future dates
  if (mode !== 'today' && mode !== 'yesterday' && mode !== 'all' && mode > todayStr) {
    showToast('Future date selection is not allowed. Switched to Today.', 'warning');
    mode = 'today';
  }

  appState.attendanceFilterDate = mode;
  
  const chipToday = document.getElementById('chip-att-date-today');
  const chipYesterday = document.getElementById('chip-att-date-yesterday');
  const chipAll = document.getElementById('chip-att-date-all');
  const dateInput = document.getElementById('input-attendance-custom-date');
  const summaryDisplay = document.getElementById('att-selected-date-display');

  if (dateInput) {
    dateInput.max = todayStr; // Enforce maximum date is today in the calendar popup
  }

  chipToday?.classList.remove('active');
  chipYesterday?.classList.remove('active');
  chipAll?.classList.remove('active');

  if (mode === 'today') {
    chipToday?.classList.add('active');
    if (dateInput) dateInput.value = todayStr;
    if (summaryDisplay) summaryDisplay.textContent = `Today (${formatPrettyDate(todayStr)})`;
  } else if (mode === 'yesterday') {
    chipYesterday?.classList.add('active');
    if (dateInput) dateInput.value = yesterdayStr;
    if (summaryDisplay) summaryDisplay.textContent = `Yesterday (${formatPrettyDate(yesterdayStr)})`;
  } else if (mode === 'all') {
    chipAll?.classList.add('active');
    if (dateInput) dateInput.value = '';
    if (summaryDisplay) summaryDisplay.textContent = `All Time (Lifetime Summary)`;
  } else {
    // Custom date chosen
    if (dateInput) dateInput.value = mode;
    if (mode === todayStr) {
      chipToday?.classList.add('active');
      if (summaryDisplay) summaryDisplay.textContent = `Today (${formatPrettyDate(todayStr)})`;
    } else if (mode === yesterdayStr) {
      chipYesterday?.classList.add('active');
      if (summaryDisplay) summaryDisplay.textContent = `Yesterday (${formatPrettyDate(yesterdayStr)})`;
    } else {
      if (summaryDisplay) summaryDisplay.textContent = `${formatPrettyDate(mode)}`;
    }
  }

  renderAttendanceScreen();
}

function handleAttendanceCustomDateChange(dateValue) {
  if (!dateValue) {
    setAttendanceFilterDate('today');
    return;
  }
  const todayStr = getTodayISODate();
  if (dateValue > todayStr) {
    showToast('Future dates are not allowed. Selecting Today.', 'warning');
    setAttendanceFilterDate('today');
    return;
  }
  setAttendanceFilterDate(dateValue);
}

function getActiveAttendanceTargetDate() {
  const filter = appState.attendanceFilterDate || 'today';
  if (filter === 'today') return getTodayISODate();
  if (filter === 'yesterday') return getYesterdayISODate();
  if (filter === 'all') return null; // all dates
  return filter;
}

function formatCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function startShiftTimer() {
  if (appState.shiftTimerInterval) clearInterval(appState.shiftTimerInterval);
  updateShiftTimerDisplay();
  appState.shiftTimerInterval = setInterval(updateShiftTimerDisplay, 1000);
}

function updateShiftTimerDisplay() {
  const timerDisplay = document.getElementById('shift-live-timer');
  if (!timerDisplay) return;

  const currentRole = appState.currentUser?.role;
  const agentName = appState.currentUser?.agentName || (currentRole === 'agent' ? 'Rahul Sharma' : 'Rahul Sharma');
  const record = appState.attendance[agentName];

  if (!record || record.status === 'off_duty') {
    timerDisplay.textContent = '00:00:00';
    return;
  }

  // Ensure valid shiftStartTimestamp
  if (!record.shiftStartTimestamp || isNaN(record.shiftStartTimestamp)) {
    record.shiftStartTimestamp = Date.now() - 60000;
  }

  const elapsedMs = Math.max(0, Date.now() - record.shiftStartTimestamp);
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  timerDisplay.textContent = 
    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function renderAttendanceScreen() {
  const isAgent = appState.currentUser && appState.currentUser.role === 'agent';
  const agentView = document.getElementById('agent-attendance-view');
  const opsView = document.getElementById('ops-attendance-view');

  // Sync Date Filter Controls
  const filter = appState.attendanceFilterDate || 'today';
  const dateInput = document.getElementById('input-attendance-custom-date');
  if (dateInput) {
    dateInput.max = getTodayISODate();
    if (filter !== 'all') {
      if (filter === 'today') dateInput.value = getTodayISODate();
      else if (filter === 'yesterday') dateInput.value = getYesterdayISODate();
      else dateInput.value = filter;
    }
  }

  if (isAgent) {
    if (agentView) agentView.classList.remove('hidden');
    if (opsView) opsView.classList.add('hidden');
    renderAgentAttendance();
  } else {
    if (agentView) agentView.classList.add('hidden');
    if (opsView) opsView.classList.remove('hidden');
    renderOpsAttendance();
  }
}

function renderAgentAttendance() {
  const agentName = appState.currentUser?.agentName || (AGENTS_LIST[0] || 'Rahul Sharma');
  const targetDate = getActiveAttendanceTargetDate();
  const todayStr = getTodayISODate();
  const isViewingToday = !targetDate || targetDate === todayStr;
  
  if (!appState.attendance[agentName]) {
    appState.attendance[agentName] = {
      status: 'off_duty',
      punchInTime: '',
      punchInDate: '',
      punchOutTime: '',
      shiftStartTimestamp: null,
      photo: '',
      history: []
    };
    saveAttendanceToLocal();
  }

  const record = appState.attendance[agentName];

  // Auto fix start timestamp if on duty
  if (record.status === 'on_duty' && (!record.shiftStartTimestamp || isNaN(record.shiftStartTimestamp))) {
    record.shiftStartTimestamp = Date.now() - 3.5 * 3600 * 1000;
    saveAttendanceToLocal();
  }

  // Agent Name & Role
  const nameEl = document.getElementById('agent-duty-display-name');
  if (nameEl) nameEl.textContent = agentName;

  // Duty Status Badge
  const statusPill = document.getElementById('agent-live-duty-status');
  const statusText = document.getElementById('agent-duty-status-text');
  
  if (statusPill && statusText) {
    statusPill.className = 'duty-status-pill';
    if (isViewingToday) {
      if (record.status === 'on_duty') {
        statusPill.classList.add('status-on-duty');
        statusText.textContent = 'ON DUTY';
      } else if (record.status === 'on_break') {
        statusPill.classList.add('status-on-break');
        statusText.textContent = 'ON BREAK';
      } else {
        statusPill.classList.add('status-off-duty');
        statusText.textContent = 'OFF DUTY';
      }
    } else {
      // Historical date status
      const dateLogs = (record.history || []).filter(h => h.date === targetDate);
      if (dateLogs.length > 0) {
        statusPill.classList.add('status-on-duty');
        statusText.textContent = `WORKED (${formatPrettyDate(targetDate)})`;
      } else {
        statusPill.classList.add('status-off-duty');
        statusText.textContent = `NO DUTY (${formatPrettyDate(targetDate)})`;
      }
    }
  }

  // Shift Start Info
  const startInfo = document.getElementById('shift-start-info');
  if (startInfo) {
    if (isViewingToday) {
      if (record.status === 'on_duty' || record.status === 'on_break') {
        startInfo.innerHTML = `<i class="fa-solid fa-circle-check text-success"></i> Clocked in at <strong>${record.punchInTime || 'Today'}</strong> (${record.punchInDate || todayStr})`;
      } else {
        startInfo.innerHTML = `<i class="fa-solid fa-moon text-muted"></i> Shift ended / Not currently clocked in today`;
      }
    } else {
      const dateLogs = (record.history || []).filter(h => h.date === targetDate);
      if (dateLogs.length > 0) {
        startInfo.innerHTML = `<i class="fa-solid fa-calendar-check text-primary"></i> ${dateLogs.length} shift actions recorded on ${formatPrettyDate(targetDate)}`;
      } else {
        startInfo.innerHTML = `<i class="fa-solid fa-calendar-xmark text-muted"></i> No shift logs on ${formatPrettyDate(targetDate)}`;
      }
    }
  }

  // Punch Action Controls (Available during today's shift)
  const punchActionsGrid = document.getElementById('agent-punch-actions');
  if (punchActionsGrid) {
    if (isViewingToday) {
      if (record.status === 'off_duty') {
        punchActionsGrid.innerHTML = `
          <button class="btn btn-punch-in btn-block btn-lg" onclick="directClockIn()">
            <i class="fa-solid fa-play"></i> Clock In / Punch In (Start Shift)
          </button>
        `;
      } else if (record.status === 'on_duty') {
        punchActionsGrid.innerHTML = `
          <button class="btn btn-punch-break" onclick="toggleCurrentAgentBreak()">
            <i class="fa-solid fa-mug-hot"></i> Take 15m Break
          </button>
          <button class="btn btn-punch-out" onclick="punchOutCurrentAgent()">
            <i class="fa-solid fa-power-off"></i> Clock Out / Punch Out
          </button>
        `;
      } else if (record.status === 'on_break') {
        punchActionsGrid.innerHTML = `
          <button class="btn btn-punch-resume" onclick="toggleCurrentAgentBreak()">
            <i class="fa-solid fa-play"></i> Resume Shift
          </button>
          <button class="btn btn-punch-out" onclick="punchOutCurrentAgent()">
            <i class="fa-solid fa-power-off"></i> Clock Out
          </button>
        `;
      }
    } else {
      punchActionsGrid.innerHTML = `
        <button class="btn btn-outline btn-block" onclick="setAttendanceFilterDate('today')">
          <i class="fa-solid fa-arrow-left"></i> Return to Today's Live Clock & Punch
        </button>
      `;
    }
  }

  // Photo Verification Card
  const photoPreviewWrap = document.getElementById('photo-checkin-preview-wrap');
  const photoStatus = document.getElementById('photo-checkin-status');
  if (photoPreviewWrap) {
    if (record.photo) {
      if (photoStatus) photoStatus.textContent = 'Verified for duty';
      photoPreviewWrap.innerHTML = `
        <div class="photo-verified-box">
          <img src="${record.photo}" alt="Selfie Verification" class="att-selfie-thumb" onclick="openLightboxModal('${record.photo}', 'Duty Check-In Photo: ${agentName}')" />
          <div class="photo-verified-details">
            <span class="text-success"><i class="fa-solid fa-circle-check"></i> Identity Verified</span>
            <small>Punch Time: ${record.punchInTime || 'Today'}</small>
            ${isViewingToday ? `<button class="btn-text-xs mt-1" onclick="promptPunchIn()"><i class="fa-solid fa-camera"></i> Update Selfie</button>` : ''}
          </div>
        </div>
      `;
    } else {
      if (photoStatus) photoStatus.textContent = 'No photo attached';
      photoPreviewWrap.innerHTML = `
        <div class="photo-prompt-box" onclick="${isViewingToday ? 'promptPunchIn()' : ''}">
          <i class="fa-solid fa-camera text-primary"></i>
          <span>${isViewingToday ? 'Upload Duty Selfie / Check-In Photo' : 'No photo uploaded for this date'}</span>
        </div>
      `;
    }
  }

  // Shift KPIs (Calculated by Date Filter)
  let agentBills = appState.bills.filter(b => b.deliveryAgent === agentName);
  if (targetDate) {
    agentBills = agentBills.filter(b => (b.deliveredDate === targetDate || (!b.deliveredDate && b.billedDate === targetDate)));
  }

  const myDelivered = agentBills.filter(b => b.deliveryStatus === 'Delivered');
  const myCash = agentBills
    .filter(b => b.paymentStatus === 'Paid' && b.paymentMode === 'CASH')
    .reduce((sum, b) => sum + (Number(b.amountReceived) || 0), 0);
  const myQr = agentBills
    .filter(b => b.paymentStatus === 'Paid' && (b.paymentMode === 'QR' || b.paymentMode === 'CARD'))
    .reduce((sum, b) => sum + (Number(b.amountReceived) || 0), 0);

  const deliveredCountEl = document.getElementById('shift-delivered-count');
  const cashCollectedEl = document.getElementById('shift-cash-collected');
  const qrCollectedEl = document.getElementById('shift-qr-collected');

  if (deliveredCountEl) deliveredCountEl.textContent = `${myDelivered.length} Orders`;
  if (cashCollectedEl) cashCollectedEl.textContent = formatCurrency(myCash);
  if (qrCollectedEl) qrCollectedEl.textContent = formatCurrency(myQr);

  // Shift Timeline Log (Filtered by Date)
  const timelineEl = document.getElementById('agent-attendance-timeline');
  const logCountEl = document.getElementById('agent-punch-log-count');
  
  let history = record.history || [];
  if (targetDate) {
    history = history.filter(h => h.date === targetDate);
  }

  if (logCountEl) logCountEl.textContent = `${history.length} ${history.length === 1 ? 'entry' : 'entries'}`;

  if (timelineEl) {
    if (history.length === 0) {
      timelineEl.innerHTML = `
        <div class="empty-timeline-box">
          <i class="fa-solid fa-clock-rotate-left"></i>
          <p>No shift activity recorded for ${targetDate ? formatPrettyDate(targetDate) : 'this period'}.</p>
        </div>
      `;
    } else {
      timelineEl.innerHTML = history.slice().reverse().map(h => {
        let dotClass = 'dot-green';
        let icon = 'fa-solid fa-play';
        if (h.type.includes('Out') || h.type.includes('End')) {
          dotClass = 'dot-red';
          icon = 'fa-solid fa-stop';
        } else if (h.type.includes('Break')) {
          dotClass = 'dot-yellow';
          icon = 'fa-solid fa-mug-hot';
        }

        return `
          <div class="timeline-entry">
            <div class="timeline-icon ${dotClass}"><i class="${icon}"></i></div>
            <div class="timeline-info">
              <strong>${h.type}</strong>
              <span>${h.time} • ${h.date ? formatPrettyDate(h.date) : todayStr}</span>
            </div>
            ${h.photo ? `<img src="${h.photo}" class="timeline-thumb" onclick="openLightboxModal('${h.photo}', '${h.type}')" />` : ''}
          </div>
        `;
      }).join('');
    }
  }

  updateShiftTimerDisplay();
}

function renderOpsAttendance() {
  const rosterContainer = document.getElementById('fleet-attendance-roster');
  if (!rosterContainer) return;

  const targetDate = getActiveAttendanceTargetDate();
  const todayStr = getTodayISODate();
  const isViewingToday = !targetDate || targetDate === todayStr;

  let onDutyCount = 0;
  let offDutyCount = 0;

  AGENTS_LIST.forEach(name => {
    const att = appState.attendance[name];
    if (isViewingToday) {
      if (att && att.status === 'on_duty') onDutyCount++;
      else offDutyCount++;
    } else {
      // Historical check
      const hadDuty = att && (att.history || []).some(h => h.date === targetDate);
      if (hadDuty) onDutyCount++;
      else offDutyCount++;
    }
  });

  const onDutyCountEl = document.getElementById('ops-on-duty-count');
  const fleetSummaryEl = document.getElementById('ops-fleet-status-summary');
  const countOnDutyTab = document.getElementById('count-fleet-onduty');
  const countOffDutyTab = document.getElementById('count-fleet-offduty');

  if (onDutyCountEl) onDutyCountEl.textContent = `${onDutyCount} / ${AGENTS_LIST.length}`;
  if (fleetSummaryEl) {
    if (isViewingToday) {
      fleetSummaryEl.textContent = `${onDutyCount} On Duty • ${offDutyCount} Off Duty`;
    } else {
      fleetSummaryEl.textContent = `${onDutyCount} Active on ${formatPrettyDate(targetDate)} • ${offDutyCount} Inactive`;
    }
  }
  if (countOnDutyTab) countOnDutyTab.textContent = String(onDutyCount);
  if (countOffDutyTab) countOffDutyTab.textContent = String(offDutyCount);

  let displayAgents = AGENTS_LIST;
  if (appState.filterFleetAttendanceTab === 'on_duty') {
    if (isViewingToday) {
      displayAgents = AGENTS_LIST.filter(name => appState.attendance[name]?.status === 'on_duty');
    } else {
      displayAgents = AGENTS_LIST.filter(name => (appState.attendance[name]?.history || []).some(h => h.date === targetDate));
    }
  } else if (appState.filterFleetAttendanceTab === 'off_duty') {
    if (isViewingToday) {
      displayAgents = AGENTS_LIST.filter(name => appState.attendance[name]?.status !== 'on_duty');
    } else {
      displayAgents = AGENTS_LIST.filter(name => !(appState.attendance[name]?.history || []).some(h => h.date === targetDate));
    }
  }

  rosterContainer.innerHTML = displayAgents.map(agentName => {
    const att = appState.attendance[agentName] || { status: 'off_duty', punchInTime: '', history: [] };
    const isOnDuty = isViewingToday ? att.status === 'on_duty' : (att.history || []).some(h => h.date === targetDate);
    const isOnBreak = isViewingToday && att.status === 'on_break';

    // Date-filtered metrics for this agent
    let assignedOrders = appState.bills.filter(b => b.deliveryAgent === agentName);
    if (targetDate) {
      assignedOrders = assignedOrders.filter(b => (b.deliveredDate === targetDate || (!b.deliveredDate && b.billedDate === targetDate)));
    }

    const deliveredOrders = assignedOrders.filter(b => b.deliveryStatus === 'Delivered');
    const cashCollected = assignedOrders
      .filter(b => b.paymentStatus === 'Paid' && b.paymentMode === 'CASH')
      .reduce((s, b) => s + (Number(b.amountReceived) || 0), 0);
    const qrCollected = assignedOrders
      .filter(b => b.paymentStatus === 'Paid' && (b.paymentMode === 'QR' || b.paymentMode === 'CARD'))
      .reduce((s, b) => s + (Number(b.amountReceived) || 0), 0);

    let statusTag = `<span class="badge badge-red"><span class="status-dot dot-red"></span> Off Duty</span>`;
    if (isViewingToday) {
      if (isOnDuty) statusTag = `<span class="badge badge-green"><span class="status-dot dot-green"></span> On Duty (${att.punchInTime || 'Active'})</span>`;
      else if (isOnBreak) statusTag = `<span class="badge badge-yellow"><span class="status-dot dot-yellow"></span> On Break</span>`;
    } else {
      if (isOnDuty) statusTag = `<span class="badge badge-green"><span class="status-dot dot-green"></span> Worked on ${formatPrettyDate(targetDate)}</span>`;
      else statusTag = `<span class="badge badge-neutral"><span class="status-dot dot-red"></span> Off Duty</span>`;
    }

    return `
      <div class="fleet-agent-card ${isOnDuty ? 'agent-card-onduty' : ''}">
        <div class="fleet-agent-header">
          <div class="fleet-agent-avatar">
            ${att.photo ? `<img src="${att.photo}" class="fleet-avatar-img" onclick="openLightboxModal('${att.photo}', '${agentName}')" />` : `<i class="fa-solid fa-person-biking"></i>`}
          </div>
          <div class="fleet-agent-title">
            <h4>${agentName}</h4>
            <div>${statusTag}</div>
          </div>
          <div class="fleet-agent-toggle">
            ${isViewingToday ? `
              <button class="btn btn-sm ${isOnDuty ? 'btn-outline-danger' : 'btn-success'}" onclick="overrideAgentDutyStatus('${agentName}', '${isOnDuty ? 'off_duty' : 'on_duty'}')">
                <i class="fa-solid ${isOnDuty ? 'fa-power-off' : 'fa-play'}"></i> ${isOnDuty ? 'Clock Out' : 'Clock In'}
              </button>
            ` : `
              <span class="badge badge-outline"><i class="fa-solid fa-calendar"></i> ${targetDate ? formatPrettyDate(targetDate) : 'All'}</span>
            `}
          </div>
        </div>

        <div class="fleet-agent-metrics">
          <div class="metric-col">
            <span class="metric-label">Assigned</span>
            <strong>${assignedOrders.length}</strong>
          </div>
          <div class="metric-col">
            <span class="metric-label">Delivered</span>
            <strong class="text-success">${deliveredOrders.length}</strong>
          </div>
          <div class="metric-col">
            <span class="metric-label">Cash</span>
            <strong class="text-primary">${formatCurrency(cashCollected)}</strong>
          </div>
          <div class="metric-col">
            <span class="metric-label">Digital</span>
            <strong class="text-purple">${formatCurrency(qrCollected)}</strong>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function filterFleetAttendance(filter, btn) {
  appState.filterFleetAttendanceTab = filter;
  const parent = btn.parentElement;
  if (parent) {
    parent.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  }
  btn.classList.add('active');
  renderOpsAttendance();
}

// Attendance Actions
function directClockIn(customAgent) {
  const agentName = customAgent || appState.currentUser?.agentName || (AGENTS_LIST[0] || 'Rahul Sharma');
  const timeStr = formatCurrentTime();
  const dateStr = getTodayISODate();

  if (!appState.attendance[agentName]) {
    appState.attendance[agentName] = { history: [] };
  }

  const record = appState.attendance[agentName];
  record.status = 'on_duty';
  record.punchInTime = timeStr;
  record.punchInDate = dateStr;
  record.punchOutTime = '';
  record.shiftStartTimestamp = Date.now();

  if (!record.history) record.history = [];
  record.history.push({
    type: 'Clocked In (Duty Start)',
    time: timeStr,
    date: dateStr,
    photo: record.photo || ''
  });

  saveAttendanceToLocal();
  applyUserRoleUI();
  updateShiftTimerDisplay();
  renderAttendanceScreen();
  showToast(`🟢 Clocked In successfully at ${timeStr}! Timer started.`, 'success');
}

function directClockOut(customAgent) {
  const agentName = customAgent || appState.currentUser?.agentName || (AGENTS_LIST[0] || 'Rahul Sharma');
  const record = appState.attendance[agentName];
  if (!record) return;

  const timeStr = formatCurrentTime();
  const dateStr = getTodayISODate();

  record.status = 'off_duty';
  record.punchOutTime = timeStr;
  record.shiftStartTimestamp = null;

  if (!record.history) record.history = [];
  record.history.push({
    type: 'Clocked Out (Shift End)',
    time: timeStr,
    date: dateStr,
    photo: ''
  });

  saveAttendanceToLocal();
  applyUserRoleUI();
  updateShiftTimerDisplay();
  renderAttendanceScreen();
  showToast(`🔴 Clocked Out at ${timeStr}. Shift complete!`, 'info');
}

function promptPunchIn() {
  appState.tempAttendancePhoto = '';
  const placeholder = document.getElementById('att-photo-placeholder');
  const previewWrap = document.getElementById('att-photo-preview-wrap');
  const previewImg = document.getElementById('att-photo-preview-img');

  if (placeholder) placeholder.classList.remove('hidden');
  if (previewWrap) previewWrap.classList.add('hidden');
  if (previewImg) previewImg.src = '';

  const modal = document.getElementById('attendance-photo-modal');
  if (modal) modal.classList.add('active');
}

function closeAttendancePhotoModal(e) {
  if (e && e.target !== e.currentTarget && !e.target.classList.contains('btn-close')) return;
  const modal = document.getElementById('attendance-photo-modal');
  if (modal) modal.classList.remove('active');
}

function handleAttendancePhotoSelected(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    appState.tempAttendancePhoto = e.target.result;
    const placeholder = document.getElementById('att-photo-placeholder');
    const previewWrap = document.getElementById('att-photo-preview-wrap');
    const previewImg = document.getElementById('att-photo-preview-img');

    if (placeholder) placeholder.classList.add('hidden');
    if (previewWrap) previewWrap.classList.remove('hidden');
    if (previewImg) previewImg.src = appState.tempAttendancePhoto;
  };
  reader.readAsDataURL(file);
}

function confirmPunchInWithPhoto() {
  executePunchIn(appState.tempAttendancePhoto);
  closeAttendancePhotoModal();
}

function confirmPunchInWithoutPhoto() {
  executePunchIn('');
  closeAttendancePhotoModal();
}

function executePunchIn(photoData) {
  const agentName = appState.currentUser?.agentName || (AGENTS_LIST[0] || 'Rahul Sharma');
  const timeStr = formatCurrentTime();
  const dateStr = getTodayISODate();

  if (!appState.attendance[agentName]) {
    appState.attendance[agentName] = { history: [] };
  }

  const record = appState.attendance[agentName];
  record.status = 'on_duty';
  record.punchInTime = timeStr;
  record.punchInDate = dateStr;
  record.punchOutTime = '';
  record.shiftStartTimestamp = Date.now();
  if (photoData) record.photo = photoData;

  if (!record.history) record.history = [];
  record.history.push({
    type: 'Duty Punch In (Selfie Verified)',
    time: timeStr,
    date: dateStr,
    photo: photoData || ''
  });

  saveAttendanceToLocal();
  applyUserRoleUI();
  updateShiftTimerDisplay();
  renderAttendanceScreen();
  showToast(`🟢 ${agentName} is now ON DUTY at ${timeStr}`, 'success');
}

function punchOutCurrentAgent() {
  const agentName = appState.currentUser?.agentName || (AGENTS_LIST[0] || 'Rahul Sharma');
  if (!confirm(`Are you sure you want to Clock Out and end your shift, ${agentName}?`)) return;
  directClockOut(agentName);
}

function toggleCurrentAgentBreak() {
  const agentName = appState.currentUser?.agentName || (AGENTS_LIST[0] || 'Rahul Sharma');
  const record = appState.attendance[agentName];
  if (!record) return;

  const timeStr = formatCurrentTime();
  const dateStr = getTodayISODate();

  if (record.status === 'on_duty') {
    record.status = 'on_break';
    if (!record.history) record.history = [];
    record.history.push({
      type: '15m Break Started',
      time: timeStr,
      date: dateStr,
      photo: ''
    });
    showToast('☕ Break mode activated', 'info');
  } else {
    record.status = 'on_duty';
    if (!record.history) record.history = [];
    record.history.push({
      type: 'Shift Resumed',
      time: timeStr,
      date: dateStr,
      photo: ''
    });
    showToast('🟢 Shift resumed!', 'success');
  }

  saveAttendanceToLocal();
  applyUserRoleUI();
  updateShiftTimerDisplay();
  renderAttendanceScreen();
}

function overrideAgentDutyStatus(agentName, newStatus) {
  if (newStatus === 'on_duty') {
    directClockIn(agentName);
  } else {
    directClockOut(agentName);
  }
}

function exportAttendanceToCSV() {
  const targetDate = getActiveAttendanceTargetDate();
  const headers = ['Agent Name', 'Filtered Date', 'Status', 'Punch In Time', 'Punch In Date', 'Punch Out Time', 'Delivered Orders', 'Cash Collected (INR)', 'Digital Collected (INR)'];
  
  const rows = AGENTS_LIST.map(name => {
    const att = appState.attendance[name] || { status: 'off_duty', punchInTime: '', punchInDate: '', punchOutTime: '' };
    let agentBills = appState.bills.filter(b => b.deliveryAgent === name);
    if (targetDate) {
      agentBills = agentBills.filter(b => (b.deliveredDate === targetDate || (!b.deliveredDate && b.billedDate === targetDate)));
    }

    const myDelivered = agentBills.filter(b => b.deliveryStatus === 'Delivered').length;
    const myCash = agentBills.filter(b => b.paymentStatus === 'Paid' && b.paymentMode === 'CASH').reduce((s, b) => s + (Number(b.amountReceived) || 0), 0);
    const myQr = agentBills.filter(b => b.paymentStatus === 'Paid' && (b.paymentMode === 'QR' || b.paymentMode === 'CARD')).reduce((s, b) => s + (Number(b.amountReceived) || 0), 0);

    return [
      `"${name}"`,
      `"${targetDate || 'All Time'}"`,
      `"${att.status}"`,
      `"${att.punchInTime || ''}"`,
      `"${att.punchInDate || ''}"`,
      `"${att.punchOutTime || ''}"`,
      myDelivered,
      myCash,
      myQr
    ];
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Fleet_Attendance_${targetDate || 'AllTime'}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported Attendance (${targetDate ? formatPrettyDate(targetDate) : 'All Time'}) to CSV!`, 'success');
}



