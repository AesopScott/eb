import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const listEl = document.getElementById('events');
const statusEl = document.getElementById('status');

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function render(events) {
  if (!events.length) {
    listEl.innerHTML = '<li class="empty">No events yet. Scrapers run daily.</li>';
    return;
  }
  listEl.innerHTML = events.map(ev => `
    <li class="event">
      <a class="title" href="${ev.url}" target="_blank" rel="noopener">${ev.title}</a>
      <div class="meta">
        <span class="date">${ev.startDate}${ev.endDate && ev.endDate !== ev.startDate ? ' – ' + ev.endDate : ''}</span>
        ${ev.location ? `<span class="loc">${ev.location}</span>` : ''}
        ${ev.eventType ? `<span class="type">${ev.eventType}</span>` : ''}
      </div>
      ${(ev.tags || []).length ? `<div class="tags">${ev.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
    </li>
  `).join('');
}

async function load() {
  statusEl.textContent = 'Loading…';
  const q = query(
    collection(db, 'events'),
    where('startDate', '>=', todayISO()),
    orderBy('startDate', 'asc'),
    limit(100)
  );
  const snap = await getDocs(q);
  const events = snap.docs.map(d => d.data());
  render(events);
  statusEl.textContent = `${events.length} upcoming`;
}

load().catch(err => {
  console.error(err);
  statusEl.textContent = 'Failed to load events.';
});
