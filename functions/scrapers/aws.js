const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

const BASE = 'https://aws.amazon.com/api/dirs/items/search';

async function fetchPage(page) {
  const params = new URLSearchParams({
    'item.directoryId': 'aws-events-directory',
    'sort_by':          'item.additionalFields.startDateTime',
    'sort_order':       'asc',
    'size':             '50',
    'item.locale':      'en_US',
    'page':             page,
  });
  const res = await fetch(`${BASE}?${params}`, {
    headers: { 'User-Agent': 'EventBuzz/1.0' },
  });
  if (!res.ok) throw new Error(`AWS events page ${page}: HTTP ${res.status}`);
  return res.json();
}

function normalize(raw) {
  const f   = raw.item?.additionalFields || {};
  const id  = raw.item?.id || '';
  const title       = f.eventName || f.title || raw.item?.name || '';
  const description = f.eventDescription || f.description || '';
  const startDate   = (f.startDateTime || f.startDate || '').slice(0, 10);
  const endDate     = (f.endDateTime   || f.endDate   || startDate).slice(0, 10);
  const locationStr = [f.locationCity, f.locationState, f.locationCountry]
    .filter(Boolean).join(', ');
  const href = raw.item?.directoryHref || '';
  const url  = f.registrationUrl || f.eventUrl ||
    (href ? `https://aws.amazon.com${href}` : '');
  const isOnline = /virtual|online/i.test(f.eventType || '');
  const city = isOnline
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(locationStr);

  return {
    sourceId: id || `aws-${startDate}-${title.slice(0, 40)}`,
    title,
    description,
    startDate,
    endDate,
    location: locationStr,
    url,
    tags: ['aws', f.eventType || ''].filter(Boolean),
    vendor: 'AWS',
    eventType: isOnline ? 'online' : 'in-person',
    cityKey:     city?.cityKey     || null,
    cityName:    city?.cityName    || null,
    countryCode: city?.countryCode || null,
    categories: inferCategories(title, description, ['cloud', 'aws']),
  };
}

async function scrapeAWS() {
  const out = [];
  let page = 1;
  while (true) {
    const data  = await fetchPage(page);
    const items = data.items || [];
    if (!items.length) break;
    for (const item of items) {
      const ev = normalize(item);
      if (ev.title) out.push(ev);
    }
    const total = data.metadata?.totalHits ?? 0;
    if (out.length >= total || page >= 10) break;
    page++;
  }
  return out;
}

module.exports = { scrapeAWS };
