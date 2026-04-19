const { parse } = require('node-html-parser');
const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

// Eventbrite deprecated their public events/search API in late 2023 for non-partner apps.
// We scrape JSON-LD structured data from their public search result pages instead.
const SEARCH_PAGES = [
  'https://www.eventbrite.com/d/usa/technology--conference/',
  'https://www.eventbrite.com/d/online/technology--conference/',
  'https://www.eventbrite.com/d/usa/technology--summit/',
  'https://www.eventbrite.com/d/online/technology--summit/',
  'https://www.eventbrite.com/d/usa/hackathon/',
  'https://www.eventbrite.com/d/online/hackathon/',
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`Eventbrite ${url}: HTTP ${res.status}`);
  return res.text();
}

function extractJsonLd(root) {
  const events = [];
  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(s.text);
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

function normalize(ev) {
  const loc = ev.location || {};
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
    sourceId,
    title,
    description: description.slice(0, 500),
    startDate,
    endDate,
    location: locationStr,
    url,
    tags: [],
    vendor: '',
    eventType: isOnline ? 'online' : 'in-person',
    cityKey:     isOnline ? 'online' : (city?.cityKey     || null),
    cityName:    isOnline ? 'Online' : (city?.cityName    || null),
    countryCode: isOnline ? null     : (city?.countryCode || null),
    categories: inferCategories(title, description),
  };
}

async function scrapeEventbrite(_apiKey) {
  const seen = new Set();
  const out  = [];

  for (const url of SEARCH_PAGES) {
    try {
      const html   = await fetchHtml(url);
      const root   = parse(html);
      const events = extractJsonLd(root);
      console.log(`eventbrite ${url}: ${events.length} JSON-LD events found`);

      for (const ev of events) {
        const norm = normalize(ev);
        if (norm.title && norm.startDate && !seen.has(norm.sourceId)) {
          seen.add(norm.sourceId);
          out.push(norm);
        }
      }
    } catch (err) {
      console.error(`eventbrite error for ${url}: ${err.message}`);
    }
  }

  console.log(`eventbrite total: ${out.length} events`);
  return out;
}

module.exports = { scrapeEventbrite };
