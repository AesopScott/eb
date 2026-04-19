import { initializeApp }           from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signInWithPopup,
         GoogleAuthProvider, signOut, onAuthStateChanged }
                                   from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, onSnapshot }
                                   from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getFunctions, httpsCallable }
                                   from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js';
import { firebaseConfig }          from '/firebase-config.js';

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = getFirestore(app);
const functions = getFunctions(app);

const triggerScraper = httpsCallable(functions, 'triggerScraper', { timeout: 570000 });

// ---------------------------------------------------------------------------
// Named scrapers and vendor batches shown in the dashboard
// ---------------------------------------------------------------------------

const SCRAPERS = [
  'confstech', 'devpost', 'eventbrite', 'aws', 'cncf',
  'googlecloud', 'microsoft', '10times', 'infosecconfs', 'brave', 'googlesearch',
];

const BATCHES = [
  { id: 'cyber-vendors',  label: 'Cyber Vendors (243)' },
  { id: 'ai-vendors',     label: 'AI Vendors (200)' },
  { id: 'cloud-vendors',  label: 'Cloud Vendors (173)' },
  { id: 'data-vendors',   label: 'Data Vendors (156)' },
  { id: 'devops-vendors', label: 'DevOps Vendors (175)' },
];

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const loginSection = document.getElementById('login-section');
const dashboard    = document.getElementById('dashboard');
const loginError   = document.getElementById('login-error');

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    loginError.textContent = friendlyAuthError(err.code);
  }
});

document.getElementById('google-btn').addEventListener('click', async () => {
  loginError.textContent = '';
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    loginError.textContent = friendlyAuthError(err.code);
  }
});

document.getElementById('signout-btn').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, user => {
  if (user) {
    loginSection.style.display = 'none';
    dashboard.style.display    = 'block';
    startDashboard();
  } else {
    loginSection.style.display = '';
    dashboard.style.display    = 'none';
    stopDashboard();
  }
});

function friendlyAuthError(code) {
  const MAP = {
    'auth/invalid-email':        'Invalid email address.',
    'auth/user-not-found':       'No account with that email.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/invalid-credential':   'Incorrect email or password.',
    'auth/too-many-requests':    'Too many attempts. Try again later.',
    'auth/popup-closed-by-user': 'Google sign-in cancelled.',
  };
  return MAP[code] || `Sign-in error (${code})`;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

let unsubRuns = null;

function stopDashboard() {
  if (unsubRuns) { unsubRuns(); unsubRuns = null; }
}

// Live map of scraperRuns data keyed by source
const runsData = {};

function startDashboard() {
  buildTable('scrapers-body', SCRAPERS, s => ({ id: s, label: s }));
  buildTable('batches-body',  BATCHES,  b => b);

  // Real-time listener on scraperRuns
  unsubRuns = onSnapshot(collection(db, 'scraperRuns'), snap => {
    snap.forEach(doc => { runsData[doc.id] = doc.data(); });
    refreshAllRows();
  });

  // Individual vendor run
  document.getElementById('vendor-run-btn').addEventListener('click', async () => {
    const id     = document.getElementById('vendor-id-input').value.trim();
    const result = document.getElementById('vendor-run-result');
    if (!id) return;
    result.textContent = `Running ${id}…`;
    try {
      const res = await triggerScraper({ scraper: id });
      result.textContent = `✓ ${id}: ${res.data.written} written / ${res.data.total} found`;
    } catch (err) {
      result.textContent = `✗ ${err.message}`;
    }
  });
}

function buildTable(tbodyId, items, toRow) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = '';
  for (const item of items) {
    const { id, label } = toRow(item);
    const tr = document.createElement('tr');
    tr.dataset.source = id;
    tr.innerHTML = `
      <td>${label}</td>
      <td class="cell-status">—</td>
      <td class="cell-time">—</td>
      <td class="cell-written">—</td>
      <td><button class="btn btn-run btn-sm" data-id="${id}">Run</button>
          <div class="run-result cell-result"></div></td>
    `;
    tr.querySelector('.btn-run').addEventListener('click', () => runScraper(id, tr));
    tbody.appendChild(tr);
  }
}

function refreshAllRows() {
  document.querySelectorAll('tr[data-source]').forEach(tr => {
    const run = runsData[tr.dataset.source];
    if (!run) return;
    const statusEl  = tr.querySelector('.cell-status');
    const timeEl    = tr.querySelector('.cell-time');
    const writtenEl = tr.querySelector('.cell-written');

    if (run.status === 'error') {
      statusEl.className = 'cell-status status-error';
      statusEl.textContent = '✗ error';
    } else if (run.written === 0) {
      statusEl.className = 'cell-status status-none';
      statusEl.textContent = '○ 0 events';
    } else {
      statusEl.className = 'cell-status status-ok';
      statusEl.textContent = '✓ ok';
    }

    writtenEl.textContent = run.written ?? '—';

    if (run.lastRunAt?.toDate) {
      const d = run.lastRunAt.toDate();
      timeEl.textContent = d.toLocaleString();
    }
  });
}

async function runScraper(id, tr) {
  const btn    = tr.querySelector('.btn-run');
  const result = tr.querySelector('.cell-result');
  btn.disabled = true;
  btn.textContent = '…';
  result.textContent = '';
  try {
    const res = await triggerScraper({ scraper: id });
    result.textContent = `${res.data.written} written / ${res.data.total} found`;
    // Firestore listener will update the status row automatically
  } catch (err) {
    result.textContent = `✗ ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run';
  }
}
