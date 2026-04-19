const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

// Eventbrite category IDs for tech events.
// 102 = Science & Technology
const CATEGORY_ID = '102';
const BASE = 'https://www.eventbriteapi.com/v3/events/search/';

async function fetchPage(apiKey, page) {
  const params = new URLSearchParams({
    'categories': CATEGORY_ID,
    'expand': 'venue',
    'page': page,
    'page_size': '50',
    'sort_by': 'date',
    'start_date.range_start': new Date().toISOString().slice(0, 19) + 'Z',
  });
  const res = await fetch(`${BASE}?${params}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (res.status === 401) throw new Error('Eventbrite: invalid API key');
  if (!res.ok) throw new Error(`Eventbrite page ${page}: HTTP ${res.status}`);
  return res.json();
}

function normalize(raw) {
  const venue = raw.venue || {};
  const addr = venue.address || {};
  const location = [venue.name, addr.city, addr.region, addr.country].filter(Boolean).join(', ');
  const city = resolveCity(addr.city ? `${addr.city}, ${addr.country_code || ''}` : location);
  const title = raw.name?.text || '';
  const description = raw.description?.text?.slice(0, 500) || '';

  return {
    sourceId: String(raw.id),
    title,
    description,
    startDate: raw.start?.utc?.slice(0, 10) || '',
    endDate: raw.end?.utc?.slice(0, 10) || '',
    location,
    url: raw.url || '',
    tags: [],
    vendor: '',
    eventType: raw.online_event ? 'online' : 'in-person',
    cityKey: raw.online_event ? 'online' : (city?.cityKey || null),
    cityName: raw.online_event ? 'Online' : (city?.cityName || null),
    countryCode: city?.countryCode || null,
    categories: inferCategories(title, description),
  };
}

async function scrapeEventbrite(apiKey) {
  const out = [];
  let page = 1;
  while (true) {
    const data = await fetchPage(apiKey, page);
    const events = data.events || [];
    if (!events.length) break;
    for (const ev of events) out.push(normalize(ev));
    const pagination = data.pagination || {};
    if (!pagination.has_more_items) break;
    page++;
    if (page > 20) break; // safety cap
  }
  return out;
}

module.exports = { scrapeEventbrite };
