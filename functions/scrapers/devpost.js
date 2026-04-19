const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

const BASE = 'https://devpost.com/api/hackathons';

async function fetchPage(page) {
  const url = `${BASE}?page=${page}&status[]=upcoming&order_by=deadline&page_size=50`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`devpost page ${page}: HTTP ${res.status}`);
  return res.json();
}

function normalize(raw) {
  const location = raw.displayed_location?.location || '';
  const city = resolveCity(location);
  const themes = (raw.themes || []).map(t => t.name);
  const title = raw.title || '';
  const description = raw.tagline || '';

  return {
    sourceId: String(raw.id),
    title,
    description,
    startDate: raw.submission_period_dates?.split(' - ')[0]?.trim() || '',
    endDate: raw.submission_period_dates?.split(' - ')[1]?.trim() || '',
    location,
    url: raw.url || '',
    tags: themes,
    vendor: raw.organization_name || '',
    eventType: city?.cityKey === 'online' ? 'online' : (location.toLowerCase().includes('online') ? 'online' : 'hackathon'),
    cityKey: city?.cityKey || null,
    cityName: city?.cityName || null,
    countryCode: city?.countryCode || null,
    categories: inferCategories(title, description, themes),
  };
}

async function scrapeDevpost() {
  const out = [];
  let page = 1;
  while (true) {
    const data = await fetchPage(page);
    const hackathons = data.hackathons || [];
    if (!hackathons.length) break;
    for (const h of hackathons) out.push(normalize(h));
    if (!data.meta?.next_page) break;
    page++;
    if (page > 10) break; // safety cap
  }
  return out;
}

module.exports = { scrapeDevpost };
