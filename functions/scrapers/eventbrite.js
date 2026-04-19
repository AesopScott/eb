const { parse } = require('node-html-parser');
const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

// Eventbrite deprecated their public v3/events/search API in late 2023 for non-partner apps.
// Strategy 1: their internal website destination/events API (no key needed)
// Strategy 2: JSON-LD extraction from public search/category pages (pagination supported)

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const JSON_HEADERS = {
  ...HEADERS,
  'Accept': 'application/json, text/plain, */*',
  'Referer': 'https://www.eventbrite.com/',
};

// Category/keyword pages — each supports ?page=N pagination
const CATEGORY_PAGES = [
  'https://www.eventbrite.com/d/usa/technology--conference/',
  'https://www.eventbrite.com/d/online/technology--conference/',
  'https://www.eventbrite.com/d/usa/developer--conference/',
  'https://www.eventbrite.com/d/online/developer--conference/',
  'https://www.eventbrite.com/d/usa/artificial-intelligence/',
  'https://www.eventbrite.com/d/online/artificial-intelligence/',
  'https://www.eventbrite.com/d/usa/cybersecurity/',
  'https://www.eventbrite.com/d/online/cybersecurity/',
  'https://www.eventbrite.com/d/usa/cloud-computing/',
  'https://www.eventbrite.com/d/usa/data-science/',
  'https://www.eventbrite.com/d/usa/hackathon/',
  'https://www.eventbrite.com/d/online/hackathon/',
  // World
  'https://www.eventbrite.com/d/united-kingdom/technology--conference/',
  'https://www.eventbrite.com/d/germany/technology--conference/',
];

// ── Strategy 1: internal destination/events API ────────────────────────────

const DEST_QUERIES = [
  { q: 'technology conference', event_type: '' },
  { q: 'developer conference',  event_type: '' },
  { q: 'AI conference',         event_type: '' },
  { q: 'cybersecurity conference', event_type: '' },
  { q: 'hackathon',             event_type: '' },
  { q: 'tech summit',           event_type: 'online' },
];

async function fetchDestinationPage(q, event_type, page) {
  const params = new URLSearchParams({
    page,
    page_size: '50',
    q,
    sort: 'date',
    date: 'current_future',
    ...(event_type ? { event_type } : {}),
  });
  const res = await fetch(
    `https://www.eventbrite.com/api/v3/destination/events/?${params}`,
    { headers: JSON_HEADERS }
  );
  if (!res.ok) throw new Error(`destination/events HTTP ${res.status}`);
  return res.json();
}

function normalizeDestEvent(ev) {
  const venue = ev.primary_venue || ev.venue || {};
  const addr  = venue.address || {};
  const locationStr = [venue.name, addr.city, addr.region, addr.country]
    .filter(Boolean).join(', ');
  const isOnline = ev.is_online_event || ev.online_event || /virtual|online/i.test(locationStr);
  const city = isOnline
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(locationStr);
  const title       = ev.name || '';
  const description = ev.summary || ev.description?.text || '';
  const startDate   = (ev.start_date || ev.start?.utc || '').slice(0, 10);
  const endDate     = (ev.end_date   || ev.end?.utc   || startDate).slice(0, 10);
  const url         = ev.url || '';
  const sourceId    = String(ev.id || `eb-${startDate}-${title.slice(0, 40)}`);
  return {
    sourceId, title, description: description.slice(0, 500),
    startDate, endDate, location: locationStr, url,
    tags: [], vendor: '',
    eventType: isOnline ? 'online' : 'in-person',
    cityKey:     isOnline ? 'online' : (city?.cityKey     || null),
    cityName:    isOnline ? 'Online' : (city?.cityName    || null),
    countryCode: isOnline ? null     : (city?.countryCode || null),
    categories: inferCategories(title, description),
  };
}

async function scrapeViaDestinationApi(seen) {
  const out = [];
  for (const { q, event_type } of DEST_QUERIES) {
    for (let page = 1; page <= 5; page++) {
      try {
        const data = await fetchDestinationPage(q, event_type, page);
        const events = data.events || [];
        console.log(`eventbrite dest api q="${q}" page=${page}: ${events.length} events`);
        if (!events.length) break;
        for (const ev of events) {
          const norm = normalizeDestEvent(ev);
          if (norm.title && norm.startDate && !seen.has(norm.sourceId)) {
            seen.add(norm.sourceId);
            out.push(norm);
          }
        }
        const pg = data.pagination || {};
        if (!pg.has_more_items && page >= (pg.page_count || 1)) break;
      } catch (err) {
        console.error(`eventbrite dest api q="${q}" page=${page}: ${err.message}`);
        break;
      }
    }
  }
  return out;
}

// ── Strategy 2: JSON-LD from public category pages ─────────────────────────

function extractJsonLd(root) {
  const events = [];
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data  = JSON.parse(s.text);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'Event') {
          events.push(item);
        } else if (item['@type'] === 'ItemList') {
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

function normalizeJsonLdEvent(ev) {
  const loc  = ev.location || {};
  const addr = loc.address || {};
  const locationStr = [loc.name, addr.addressLocality, addr.addressRegion, addr.addressCountry]
    .filter(Boolean).join(', ');
  const isOnline = loc['@type'] === 'VirtualLocation' || /virtual|online/i.test(locationStr);
  const city = isOnline
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(locationStr);
  const title       = typeof ev.name === 'string' ? ev.name : (ev.name?.text || '');
  const description = typeof ev.description === 'string' ? ev.description : '';
  const startDate   = (ev.startDate || '').slice(0, 10);
  const endDate     = (ev.endDate   || startDate).slice(0, 10);
  const url         = ev.url || '';
  const sourceId    = url.replace(/[?#].*/, '').split('/').filter(Boolean).pop()
                      || `eb-${startDate}-${title.slice(0, 40)}`;
  return {
    sourceId, title, description: description.slice(0, 500),
    startDate, endDate, location: locationStr, url,
    tags: [], vendor: '',
    eventType: isOnline ? 'online' : 'in-person',
    cityKey:     isOnline ? 'online' : (city?.cityKey     || null),
    cityName:    isOnline ? 'Online' : (city?.cityName    || null),
    countryCode: isOnline ? null     : (city?.countryCode || null),
    categories: inferCategories(title, description),
  };
}

// Parse the total page count from Eventbrite search result pages
function parsePageCount(root) {
  const el = root.querySelector('[data-spec="paginator"] li:last-child, .pagination li:last-child, [aria-label*="page"]');
  if (!el) return 1;
  const n = parseInt(el.text, 10);
  return isNaN(n) ? 5 : Math.min(n, 8);
}

async function scrapeViaJsonLd(seen) {
  const out = [];
  for (const baseUrl of CATEGORY_PAGES) {
    const maxPages = 3; // each page ~20 events; 3 pages = ~60 per category URL
    for (let page = 1; page <= maxPages; page++) {
      const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
      try {
        const res = await fetch(url, { headers: HEADERS });
        if (!res.ok) { console.error(`eventbrite ${url}: HTTP ${res.status}`); break; }
        const root   = parse(await res.text());
        const events = extractJsonLd(root);
        console.log(`eventbrite json-ld ${url}: ${events.length} events`);
        if (!events.length) break;
        for (const ev of events) {
          const norm = normalizeJsonLdEvent(ev);
          if (norm.title && norm.startDate && !seen.has(norm.sourceId)) {
            seen.add(norm.sourceId);
            out.push(norm);
          }
        }
      } catch (err) {
        console.error(`eventbrite json-ld ${url}: ${err.message}`);
        break;
      }
    }
  }
  return out;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function scrapeEventbrite(_apiKey) {
  const seen = new Set();
  let out    = [];

  // Try internal API first (richer data, pagination)
  try {
    const destEvents = await scrapeViaDestinationApi(seen);
    out = out.concat(destEvents);
    console.log(`eventbrite destination api total: ${destEvents.length}`);
  } catch (err) {
    console.error(`eventbrite destination api failed: ${err.message}`);
  }

  // Always also scrape category pages for additional coverage
  const jsonLdEvents = await scrapeViaJsonLd(seen);
  out = out.concat(jsonLdEvents);

  console.log(`eventbrite grand total: ${out.length} unique events`);
  return out;
}

module.exports = { scrapeEventbrite };
