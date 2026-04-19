const { parse } = require('node-html-parser');
const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

// Linux Foundation calendar powers all CNCF events (KubeCon, CloudNativeCon, etc.)
const URL = 'https://events.linuxfoundation.org/about/calendar/';

async function fetchHtml() {
  const res = await fetch(URL, { headers: { 'User-Agent': 'EventBuzz/1.0' } });
  if (!res.ok) throw new Error(`CNCF calendar: HTTP ${res.status}`);
  return res.text();
}

// Parse date strings like "November 18 – 21, 2025" or "November 18, 2025"
function parseDateRange(str) {
  if (!str) return { startDate: '', endDate: '' };
  const s = str.trim().replace(/\u2013|\u2014/g, '-');

  const range = s.match(/([A-Za-z]+)\s+(\d+)\s*[-–]\s*(\d+),?\s*(\d{4})/);
  if (range) {
    const [, mon, d1, d2, yr] = range;
    const start = new Date(`${mon} ${d1}, ${yr}`);
    const end   = new Date(`${mon} ${d2}, ${yr}`);
    return {
      startDate: isNaN(start) ? '' : start.toISOString().slice(0, 10),
      endDate:   isNaN(end)   ? '' : end.toISOString().slice(0, 10),
    };
  }
  const single = s.match(/([A-Za-z]+)\s+(\d+),?\s*(\d{4})/);
  if (single) {
    const [, mon, day, yr] = single;
    const d = new Date(`${mon} ${day}, ${yr}`);
    const iso = isNaN(d) ? '' : d.toISOString().slice(0, 10);
    return { startDate: iso, endDate: iso };
  }
  return { startDate: '', endDate: '' };
}

function extractEvents(root) {
  const out = [];

  // Tribe Events (WordPress plugin used by Linux Foundation)
  const articles = root.querySelectorAll('article[class*="tribe"], article[class*="event"], .tribe-events-loop article');

  for (const art of articles) {
    const titleEl    = art.querySelector('h2 a, h3 a, .tribe-events-list-event-title a, .tribe-event-url');
    const dateEl     = art.querySelector('time, .tribe-events-schedule, .tribe-event-date-start');
    const locationEl = art.querySelector('.tribe-venue-location, .tribe-city, address');

    const title = titleEl?.text?.trim() || '';
    if (!title) continue;

    const dateStr = dateEl?.getAttribute('datetime') || dateEl?.text?.trim() || '';
    const { startDate, endDate } = parseDateRange(dateStr);

    const locationStr = locationEl?.text?.trim().replace(/\s+/g, ' ') || '';
    const url = titleEl?.getAttribute('href') || art.querySelector('a')?.getAttribute('href') || '';
    const city = resolveCity(locationStr);

    out.push({
      sourceId: `cncf-${title.slice(0, 50)}-${startDate}`,
      title,
      description: '',
      startDate,
      endDate,
      location: locationStr,
      url,
      tags: ['cncf', 'linux foundation', 'cloud native'],
      vendor: 'CNCF / Linux Foundation',
      eventType: /virtual|online/i.test(locationStr) ? 'online' : 'in-person',
      cityKey:     city?.cityKey     || null,
      cityName:    city?.cityName    || null,
      countryCode: city?.countryCode || null,
      categories: inferCategories(title, '', ['cloud', 'kubernetes', 'devops', 'cloud native']),
    });
  }
  return out;
}

async function scrapeCNCF() {
  const html = await fetchHtml();
  const root = parse(html);
  return extractEvents(root);
}

module.exports = { scrapeCNCF };
