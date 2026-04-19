import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { US_CITIES, WORLD_CITIES } from "./cities-data.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  tab: 'US',        // 'US' | 'World' | 'Online'
  category: null,   // null = All
  cityKey: null,
  cityName: '',
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

// ── DOM ────────────────────────────────────────────────────────────────────
const tabBtns         = document.querySelectorAll('[data-tab]');
const pillBtns        = document.querySelectorAll('[data-cat]');
const cityWrap        = document.getElementById('city-wrap');
const cityInput       = document.getElementById('city-input');
const citySuggestions = document.getElementById('city-suggestions');
const cityChip        = document.getElementById('city-chip');
const cityChipName    = document.getElementById('city-chip-name');
const cityClear       = document.getElementById('city-clear');
const eventsList      = document.getElementById('events');
const statusEl        = document.getElementById('status');

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

// ── Filtering ──────────────────────────────────────────────────────────────
function filteredEvents() {
  return state.allEvents.filter(ev => {
    if (state.tab === 'Online') {
      if (ev.cityKey !== 'online') return false;
    } else if (state.tab === 'US') {
      if (ev.cityKey === 'online' || ev.countryCode !== 'US') return false;
      if (state.cityKey && ev.cityKey !== state.cityKey) return false;
    } else {
      if (ev.cityKey === 'online' || ev.countryCode === 'US' || !ev.countryCode) return false;
      if (state.cityKey && ev.cityKey !== state.cityKey) return false;
    }
    if (state.category && !(ev.categories || []).includes(state.category)) return false;
    return true;
  });
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderEvent(ev) {
  const cats = (ev.categories || [])
    .map(c => `<span class="cat-tag" style="--c:${CAT_COLORS[c] || '#6b7280'}">${c}</span>`)
    .join('');
  const dateStr = (!ev.endDate || ev.endDate === ev.startDate)
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
    <div class="event-head">
      <a class="title" href="${ev.url || '#'}" target="_blank" rel="noopener">${ev.title}</a>
      ${badge}
    </div>
    <div class="meta">
      ${dateStr ? `<span class="date">${dateStr}</span>` : ''}
      ${loc ? `<span class="loc">${loc}</span>` : ''}
    </div>
    ${desc}
    ${cats ? `<div class="cat-tags">${cats}</div>` : ''}
  </li>`;
}

function render() {
  const events = filteredEvents();
  const cityLabel = state.cityName ? ` · ${state.cityName}` : '';
  const catLabel  = state.category ? ` · ${state.category}` : '';
  statusEl.textContent = `${events.length} event${events.length !== 1 ? 's' : ''}${cityLabel}${catLabel}`;

  eventsList.innerHTML = events.length
    ? events.map(renderEvent).join('')
    : '<li class="empty">No events match this filter.</li>';
}

// ── City typeahead ──────────────────────────────────────────────────────────
function cityList() {
  return state.tab === 'US' ? US_CITIES : WORLD_CITIES;
}

function showSuggestions(q) {
  const term = q.trim().toLowerCase();
  if (!term) { hideSuggestions(); return; }
  const matches = cityList().filter(c => c.name.toLowerCase().includes(term)).slice(0, 8);
  if (!matches.length) { hideSuggestions(); return; }
  citySuggestions.innerHTML = matches.map(c => {
    const sub = c.country ? `<span class="sug-country">${c.country}</span>` : '';
    return `<li data-key="${c.cityKey}" data-name="${c.name}">${c.name}${sub}</li>`;
  }).join('');
  citySuggestions.hidden = false;
}

function hideSuggestions() {
  citySuggestions.innerHTML = '';
  citySuggestions.hidden = true;
}

function selectCity(key, name) {
  state.cityKey = key;
  state.cityName = name;
  cityInput.value = '';
  hideSuggestions();
  cityChipName.textContent = name;
  cityChip.hidden = false;
  render();
}

function clearCity() {
  state.cityKey = null;
  state.cityName = '';
  cityChip.hidden = true;
  cityInput.value = '';
  render();
}

cityInput.addEventListener('input', e => showSuggestions(e.target.value));
cityInput.addEventListener('keydown', e => { if (e.key === 'Escape') hideSuggestions(); });
citySuggestions.addEventListener('mousedown', e => {
  // mousedown fires before blur, so we can read the target before input loses focus.
  const li = e.target.closest('li[data-key]');
  if (li) { e.preventDefault(); selectCity(li.dataset.key, li.dataset.name); }
});
cityInput.addEventListener('blur', hideSuggestions);
cityClear.addEventListener('click', clearCity);

// ── Tabs ───────────────────────────────────────────────────────────────────
tabBtns.forEach(btn => btn.addEventListener('click', () => {
  state.tab = btn.dataset.tab;
  state.cityKey = null;
  state.cityName = '';
  cityChip.hidden = true;
  cityInput.value = '';
  hideSuggestions();
  tabBtns.forEach(b => b.classList.toggle('active', b === btn));
  cityWrap.hidden = state.tab === 'Online';
  render();
}));

// ── Category pills ──────────────────────────────────────────────────────────
pillBtns.forEach(btn => btn.addEventListener('click', () => {
  state.category = btn.dataset.cat || null;
  pillBtns.forEach(b => b.classList.toggle('active', b === btn));
  render();
}));

// ── Boot ───────────────────────────────────────────────────────────────────
loadEvents();
