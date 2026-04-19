const { parse } = require('node-html-parser');
const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

// Try the LF calendar page plus the CNCF events page as fallback
const URLS = [
  'https://events.linuxfoundation.org/about/calendar/',
  'https://www.cncf.io/events/',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
};

function parseDateRange(str) {
  if (!str) return { startDate: '', endDate: '' };
  const s = str.trim().replace(/[\u2013\u2014]/g, '-');
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
    const d   = new Date(`${mon} ${day}, ${yr}`);
    const iso = isNaN(d) ? '' : d.toISOString().slice(0, 10);
    return { startDate: iso, endDate: iso };
  }
  return { startDate: '', endDate: '' };
}

// Extract structured JSON-LD events (most reliable if present)
function extractJsonLd(root) {
  const events = [];
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.text);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Event') events.push(item);
        if (item['@type'] === 'ItemList') {
          for (const el of item.itemListElement || []) {
            const ev = el['@type'] === 'Event' ? el : el.item;
            if (ev?.['@type'] === 'Event') events.push(ev);
          }
        }
      }
    } catch (_) {}
  }
  return events;
}

function normalizeJsonLd(ev) {
  const loc = ev.location || {};
  const addr = loc.address || {};
  const locationStr = [loc.name, addr.addressLocality, addr.addressRegion, addr.addressCountry]
    .filter(Boolean).join(', ');
  const isOnline = loc['@type'] === 'VirtualLocation' || /virtual|online/i.test(locationStr);
  const city = isOnline
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(locationStr);
  const title     = typeof ev.name === 'string' ? ev.name : '';
  const startDate = (ev.startDate || '').slice(0, 10);
  const endDate   = (ev.endDate   || startDate).slice(0, 10);
  const url       = ev.url || '';
  return {
    sourceId: `cncf-${title.slice(0, 50)}-${startDate}`,
    title,
    description: '',
    startDate,
    endDate,
    location: locationStr,
    url,
    tags: ['cncf', 'linux foundation', 'cloud native'],
    vendor: 'CNCF / Linux Foundation',
    eventType: isOnline ? 'online' : 'in-person',
    cityKey:     isOnline ? 'online' : (city?.cityKey     || null),
    cityName:    isOnline ? 'Online' : (city?.cityName    || null),
    countryCode: isOnline ? null     : (city?.countryCode || null),
    categories: inferCategories(title, '', ['cloud', 'kubernetes', 'devops', 'cloud native']),
  };
}

// HTML fallback — try broad selectors covering both old Tribe Events and modern card layouts
function extractHtml(root, pageUrl) {
  const out = [];
  const ARTICLE_SEL = [
    'article[class*="tribe"]',
    'article[class*="event"]',
    '.tribe-events-loop article',
    '.lf-event-card',
    '.event-card',
    '[class*="event-card"]',
    '[class*="EventCard"]',
    '.wp-block-group article',
  ].join(', ');

  const articles = root.querySelectorAll(ARTICLE_SEL);
  console.log(`cncf html fallback (${pageUrl}): ${articles.length} article elements`);

  for (const art of articles) {
    const titleEl    = art.querySelector('h2 a, h3 a, h4 a, .tribe-events-list-event-title a, .event-title a, a[class*="title"]');
    const dateEl     = art.querySelector('time, .tribe-events-schedule, .tribe-event-date-start, [class*="date"]');
    const locationEl = art.querySelector('.tribe-venue-location, .tribe-city, address, [class*="location"], [class*="venue"]');

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
  const seen = new Set();
  const out  = [];

  for (const url of URLS) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) { console.error(`cncf ${url}: HTTP ${res.status}`); continue; }
      const html = await res.text();
      const root = parse(html);

      const ldEvents = extractJsonLd(root);
      console.log(`cncf ${url}: ${ldEvents.length} JSON-LD events`);

      if (ldEvents.length) {
        for (const ev of ldEvents) {
          const norm = normalizeJsonLd(ev);
          if (norm.title && !seen.has(norm.sourceId)) {
            seen.add(norm.sourceId);
            out.push(norm);
          }
        }
      } else {
        for (const ev of extractHtml(root, url)) {
          if (ev.title && !seen.has(ev.sourceId)) {
            seen.add(ev.sourceId);
            out.push(ev);
          }
        }
      }
    } catch (err) {
      console.error(`cncf error for ${url}: ${err.message}`);
    }
  }

  console.log(`cncf total: ${out.length} events`);
  return out;
}

module.exports = { scrapeCNCF };
