'use strict';

const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

const BRAVE_URL = 'https://api.search.brave.com/res/v1/web/search';

// Major US cities — 40 queries/run, well within the 2,000/month free tier.
const US_CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Diego', 'Dallas', 'San Jose', 'Austin',
  'San Francisco', 'Seattle', 'Denver', 'Nashville', 'Washington DC',
  'Las Vegas', 'Portland', 'Atlanta', 'Kansas City', 'Minneapolis',
  'Miami', 'Boston', 'Tampa', 'Raleigh', 'Baltimore',
  'Charlotte', 'Columbus', 'Indianapolis', 'Sacramento', 'New Orleans',
  'San Antonio', 'Detroit', 'Salt Lake City', 'Pittsburgh', 'Cincinnati',
  'Orlando', 'Richmond', 'Cleveland', 'Oklahoma City', 'Milwaukee',
];

const TOPIC = '(cybersecurity OR "artificial intelligence" OR "information technology") (conference OR summit OR expo OR meetup)';

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(str) {
  if (!str) return null;
  const iso = str.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const mdy = str.match(/([a-z]+)\s+(\d{1,2}),?\s*(20\d{2})/i);
  if (mdy) {
    const m = MONTHS[mdy[1].toLowerCase()];
    if (m) return `${mdy[3]}-${m}-${mdy[2].padStart(2, '0')}`;
  }
  const dmy = str.match(/(\d{1,2})\s+([a-z]+)\s+(20\d{2})/i);
  if (dmy) {
    const m = MONTHS[dmy[2].toLowerCase()];
    if (m) return `${dmy[3]}-${m}-${dmy[1].padStart(2, '0')}`;
  }
  return null;
}

async function fetchCity(apiKey, city) {
  const year = new Date().getFullYear();
  const q = `${TOPIC} "${city}" ${year} OR ${year + 1}`;
  const params = new URLSearchParams({ q, count: '10', country: 'us', search_lang: 'en' });
  const res = await fetch(`${BRAVE_URL}?${params}`, {
    headers: {
      'X-Subscription-Token': apiKey,
      'Accept': 'application/json',
    },
  });
  if (res.status === 429) throw new Error('quota exceeded');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return (data.web || {}).results || [];
}

function normalizeItem(item, city) {
  const title = (item.name || '').trim();
  if (!title) return null;

  const url = item.url;
  if (!url) return null;

  const snippet = item.snippet || '';
  const description = snippet.slice(0, 500);

  const startDate = parseDate(snippet) || null;
  const endDate = startDate;

  const today = new Date().toISOString().slice(0, 10);
  if (!startDate || startDate < today) return null;

  const resolved = resolveCity(city);

  return {
    sourceId: url,
    title,
    description,
    startDate,
    endDate,
    location: resolved?.name || city,
    url,
    tags: ['bing-search'],
    vendor: '',
    eventType: 'in-person',
    cityKey:     resolved?.cityKey     ?? null,
    cityName:    resolved?.name        ?? null,
    countryCode: resolved?.countryCode ?? 'US',
    categories: inferCategories(title, description, []),
  };
}

async function scrapeGoogleSearch(apiKey) {
  const events = [];
  const seen = new Set();

  for (const city of US_CITIES) {
    await new Promise(r => setTimeout(r, 200));
    try {
      const items = await fetchCity(apiKey, city);
      for (const item of items) {
        if (seen.has(item.url)) continue;
        seen.add(item.url);
        const ev = normalizeItem(item, city);
        if (ev) events.push(ev);
      }
    } catch (err) {
      console.error(`bingsearch: ${city} — ${err.message}`);
    }
  }

  return events;
}

module.exports = { scrapeGoogleSearch };
