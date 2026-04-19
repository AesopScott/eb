import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signInWithPopup,
  GoogleAuthProvider, signOut, onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";
import { US_CITIES, WORLD_CITIES } from "./cities-data.js";

const app  = initializeApp(firebaseConfig);
const db   = getFirestore(app);
const auth = getAuth(app);

// ── Version ────────────────────────────────────────────────────────────────
const VERSION = 'v1.2';
document.getElementById('version-badge').textContent = VERSION;

// ── Auth ───────────────────────────────────────────────────────────────────
const modal      = document.getElementById('auth-modal');
const signinBtn  = document.getElementById('signin-btn');
const signoutBtn = document.getElementById('signout-btn');
const userInfo   = document.getElementById('user-info');
const userAvatar = document.getElementById('user-avatar');
const userName   = document.getElementById('user-name');
const googleBtn  = document.getElementById('google-signin');
const authForm   = document.getElementById('auth-form');
const authError  = document.getElementById('auth-error');

signinBtn.addEventListener('click', () => modal.showModal());
document.getElementById('modal-close').addEventListener('click', () => modal.close());
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
signoutBtn.addEventListener('click', () => signOut(auth));

googleBtn.addEventListener('click', async () => {
  authError.textContent = '';
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
    modal.close();
  } catch (err) { authError.textContent = friendlyError(err.code); }
});

authForm.addEventListener('submit', async e => {
  e.preventDefault();
  authError.textContent = '';
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
    modal.close();
  } catch (err) { authError.textContent = friendlyError(err.code); }
});

onAuthStateChanged(auth, user => {
  if (user) {
    signinBtn.hidden     = true;
    userInfo.hidden      = false;
    userAvatar.src       = user.photoURL || '';
    userAvatar.hidden    = !user.photoURL;
    userName.textContent = user.displayName || user.email;
  } else {
    signinBtn.hidden = false;
    userInfo.hidden  = true;
  }
});

function friendlyError(code) {
  return {
    'auth/invalid-credential':   'Incorrect email or password.',
    'auth/invalid-email':        'Invalid email address.',
    'auth/user-not-found':       'No account found.',
    'auth/wrong-password':       'Incorrect password.',
    'auth/too-many-requests':    'Too many attempts — try again later.',
    'auth/popup-closed-by-user': 'Sign-in cancelled.',
  }[code] || `Error: ${code}`;
}

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  tab:       'US',
  category:  null,
  cities:    new Set(),
  sortDir:   'asc',
  allEvents: [],
};

const CAT_COLORS = {
  'AI':            '#7c3aed',
  'Cybersecurity': '#dc2626',
  'Developer':     '#2563eb',
  'IT / Ops':      '#0891b2',
  'Cloud':         '#0284c7',
  'Data':          '#d97706',
  'General':       '#6b7280',
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── DOM ────────────────────────────────────────────────────────────────────
const tabBtns           = document.querySelectorAll('[data-tab]');
const catPillBtns       = document.querySelectorAll('[data-cat]');
const cityDropdownWrap  = document.getElementById('city-dropdown-wrap');
const cityDropdownBtn   = document.getElementById('city-dropdown-btn');
const cityDropdownPanel = document.getElementById('city-dropdown-panel');
const citySearchInput   = document.getElementById('city-search');
const cityListEl        = document.getElementById('city-list');
const cityClearAllBtn   = document.getElementById('city-clear-all');
const cityCountMsg      = document.getElementById('city-count-msg');
const cityBtnLabel      = document.getElementById('city-btn-label');
const cityBadge         = document.getElementById('city-badge');
const sortBtn           = document.getElementById('sort-btn');
const sortLabel         = document.getElementById('sort-label');
const eventsList        = document.getElementById('events');
const statusEl          = document.getElementById('status');
const htmlEl            = document.documentElement;
const settingsPanel     = document.getElementById('settings-panel');
const settingsOverlay   = document.getElementById('settings-overlay');

// ── Settings ───────────────────────────────────────────────────────────────
function applyTheme(t) {
  htmlEl.dataset.theme = t;
  localStorage.setItem('eb-theme', t);
  document.querySelectorAll('[data-theme-opt]').forEach(b =>
    b.classList.toggle('active', b.dataset.themeOpt === t)
  );
}

function applyScheme(s) {
  htmlEl.dataset.scheme = s;
  localStorage.setItem('eb-scheme', s);
  document.querySelectorAll('[data-scheme-opt]').forEach(b =>
    b.classList.toggle('active', b.dataset.schemeOpt === s)
  );
}

applyTheme(localStorage.getItem('eb-theme') || 'dark');
applyScheme(localStorage.getItem('eb-scheme') || 'cyber');

function openSettings()  { settingsPanel.classList.add('open');    settingsOverlay.classList.add('visible'); }
function closeSettings() { settingsPanel.classList.remove('open'); settingsOverlay.classList.remove('visible'); }

document.getElementById('settings-btn').addEventListener('click', openSettings);
document.getElementById('settings-close').addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', closeSettings);
document.querySelectorAll('[data-theme-opt]').forEach(b =>
  b.addEventListener('click', () => applyTheme(b.dataset.themeOpt))
);
document.querySelectorAll('[data-scheme-opt]').forEach(b =>
  b.addEventListener('click', () => applyScheme(b.dataset.schemeOpt))
);

// ── City dropdown ──────────────────────────────────────────────────────────
function activeCityData() {
  return state.tab === 'US' ? US_CITIES : WORLD_CITIES;
}

function buildCityList(filter = '') {
  const term = filter.trim().toLowerCase();
  const cities = activeCityData()
    .filter(c => !term || c.name.toLowerCase().includes(term))
    .slice(0, 60);

  cityListEl.innerHTML = cities.map(c => {
    const sel     = state.cities.has(c.cityKey);
    const country = c.country ? `<span class="city-country">${c.country}</span>` : '';
    return `<li class="${sel ? 'selected' : ''}" data-key="${c.cityKey}" data-name="${c.name}" role="option" aria-selected="${sel}">
      <span class="city-check"><span class="city-check-icon">✓</span></span>
      <span>${c.name}</span>${country}
    </li>`;
  }).join('');
}

function updateCityBtn() {
  const n = state.cities.size;
  if (n === 0) {
    cityBtnLabel.textContent = 'All Cities';
    cityBadge.hidden = true;
  } else if (n === 1) {
    const key  = [...state.cities][0];
    const city = activeCityData().find(c => c.cityKey === key);
    cityBtnLabel.textContent = city ? city.name : 'City';
    cityBadge.hidden = true;
  } else {
    cityBtnLabel.textContent = 'Cities';
    cityBadge.hidden = false;
    cityBadge.textContent = n;
  }
  cityCountMsg.textContent = n > 0 ? `${n} selected` : '';
}

function openCityDropdown() {
  cityDropdownPanel.hidden = false;
  cityDropdownBtn.classList.add('open');
  cityDropdownBtn.setAttribute('aria-expanded', 'true');
  buildCityList(citySearchInput.value);
  citySearchInput.focus();
}

function closeCityDropdown() {
  cityDropdownPanel.hidden = true;
  cityDropdownBtn.classList.remove('open');
  cityDropdownBtn.setAttribute('aria-expanded', 'false');
}

cityDropdownBtn.addEventListener('click', e => {
  e.stopPropagation();
  cityDropdownPanel.hidden ? openCityDropdown() : closeCityDropdown();
});
citySearchInput.addEventListener('input', () => buildCityList(citySearchInput.value));
citySearchInput.addEventListener('keydown', e => { if (e.key === 'Escape') closeCityDropdown(); });
cityListEl.addEventListener('mousedown', e => {
  const li = e.target.closest('li[data-key]');
  if (!li) return;
  e.preventDefault();
  const key = li.dataset.key;
  if (state.cities.has(key)) state.cities.delete(key);
  else state.cities.add(key);
  buildCityList(citySearchInput.value);
  updateCityBtn();
  render();
});
cityClearAllBtn.addEventListener('click', () => {
  state.cities.clear();
  buildCityList(citySearchInput.value);
  updateCityBtn();
  render();
});
document.addEventListener('click', e => {
  if (!e.target.closest('.city-dropdown')) closeCityDropdown();
});

// ── Sort ───────────────────────────────────────────────────────────────────
sortBtn.addEventListener('click', () => {
  state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  const isDesc = state.sortDir === 'desc';
  sortBtn.classList.toggle('desc', isDesc);
  sortLabel.textContent = isDesc ? 'Latest first' : 'Soonest first';
  render();
});

// ── Tabs ───────────────────────────────────────────────────────────────────
tabBtns.forEach(btn => btn.addEventListener('click', () => {
  state.tab = btn.dataset.tab;
  state.cities.clear();
  updateCityBtn();
  tabBtns.forEach(b => b.classList.toggle('active', b === btn));
  cityDropdownWrap.hidden = state.tab === 'Online';
  closeCityDropdown();
  render();
}));

// ── Category pills ─────────────────────────────────────────────────────────
catPillBtns.forEach(btn => btn.addEventListener('click', () => {
  state.category = btn.dataset.cat || null;
  catPillBtns.forEach(b => b.classList.toggle('active', b === btn));
  render();
}));

// ── Data ───────────────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function loadEvents() {
  statusEl.textContent = 'Loading…';
  try {
    const q = query(
      collection(db, 'events'),
      where('startDate', '>=', todayISO()),
      orderBy('startDate', 'asc'),
      limit(1500)
    );
    const snap = await getDocs(q);
    state.allEvents = snap.docs.map(d => d.data());
    render();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Failed to load events.';
  }
}

// ── Filtering + sorting ────────────────────────────────────────────────────
function filteredEvents() {
  let evs = state.allEvents.filter(ev => {
    if (state.tab === 'Online') {
      if (ev.cityKey !== 'online') return false;
    } else if (state.tab === 'US') {
      if (ev.cityKey === 'online' || ev.countryCode !== 'US') return false;
      if (state.cities.size > 0 && !state.cities.has(ev.cityKey)) return false;
    } else {
      if (ev.cityKey === 'online' || ev.countryCode === 'US' || !ev.countryCode) return false;
      if (state.cities.size > 0 && !state.cities.has(ev.cityKey)) return false;
    }
    if (state.category && !(ev.categories || []).includes(state.category)) return false;
    return true;
  });

  if (state.sortDir === 'desc') evs = [...evs].reverse();
  return evs;
}

// ── Render ─────────────────────────────────────────────────────────────────
function dateBadge(dateStr) {
  if (!dateStr) return '<div class="date-badge"><div class="month">?</div><div class="day">?</div></div>';
  const [, m, d] = dateStr.split('-').map(Number);
  return `<div class="date-badge">
    <div class="month">${MONTHS[m - 1]}</div>
    <div class="day">${d}</div>
  </div>`;
}

function renderEvent(ev) {
  const cats = (ev.categories || [])
    .map(c => `<span class="cat-tag" style="--c:${CAT_COLORS[c] || '#6b7280'}">${c}</span>`)
    .join('');
  const dateRange = (!ev.endDate || ev.endDate === ev.startDate)
    ? ev.startDate
    : `${ev.startDate} – ${ev.endDate}`;
  const loc = ev.cityName && ev.cityName !== 'Online'
    ? `${ev.cityName}${ev.countryCode && ev.countryCode !== 'US' ? ', ' + ev.countryCode : ''}`
    : (ev.location || '');
  const badge = ev.eventType === 'hackathon'
    ? '<span class="badge hackathon">Hackathon</span>'
    : ev.eventType === 'online'
    ? '<span class="badge online">Online</span>'
    : '';
  const desc = ev.description
    ? `<p class="desc">${ev.description.slice(0, 160)}${ev.description.length > 160 ? '…' : ''}</p>`
    : '';

  return `<li class="event">
    ${dateBadge(ev.startDate)}
    <div class="event-content">
      <div class="event-head">
        <a class="title" href="${ev.url || '#'}" target="_blank" rel="noopener">${ev.title}</a>
        ${badge}
      </div>
      <div class="meta">
        ${dateRange ? `<span>${dateRange}</span>` : ''}
        ${loc ? `<span>📍 ${loc}</span>` : ''}
      </div>
      ${desc}
      ${cats ? `<div class="cat-tags">${cats}</div>` : ''}
    </div>
  </li>`;
}

function render() {
  const events = filteredEvents();
  const cityLabel = state.cities.size > 0
    ? ` · ${state.cities.size} ${state.cities.size === 1 ? 'city' : 'cities'}`
    : '';
  const catLabel = state.category ? ` · ${state.category}` : '';
  statusEl.textContent = `${events.length} event${events.length !== 1 ? 's' : ''}${cityLabel}${catLabel}`;

  eventsList.innerHTML = events.length
    ? events.map(renderEvent).join('')
    : '<li class="empty">No events match this filter.</li>';
}

// ── Boot ───────────────────────────────────────────────────────────────────
loadEvents();
