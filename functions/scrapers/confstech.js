const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

const TOPICS = [
  'javascript', 'python', 'ruby', 'golang', 'rust',
  'devops', 'security', 'cloud', 'ai', 'data',
  'ux', 'general', 'dotnet', 'php', 'scala', 'elixir',
];

function yearsToFetch() {
  const y = new Date().getUTCFullYear();
  return [y, y + 1];
}

async function fetchTopicYear(topic, year) {
  const url = `https://raw.githubusercontent.com/tech-conferences/conference-data/main/conferences/${year}/${topic}.json`;
  const res = await fetch(url);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`confstech ${topic} ${year}: HTTP ${res.status}`);
  return res.json();
}

function normalize(raw, topic) {
  const locationStr = [raw.city, raw.country].filter(Boolean).join(', ');
  const isOnline = !!(raw.online || /online|virtual/i.test(locationStr));
  const city = isOnline
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(locationStr);

  const title = raw.name || '';
  const description = raw.description || '';
  const tags = [topic, ...(raw.topics || [])];

  return {
    sourceId: `${topic}-${raw.startDate}-${(raw.url || raw.name || '').slice(0, 64)}`,
    title,
    description,
    startDate: raw.startDate || '',
    endDate: raw.endDate || raw.startDate || '',
    location: locationStr,
    url: raw.url || '',
    tags,
    vendor: '',
    eventType: isOnline ? 'online' : 'in-person',
    cityKey: city?.cityKey || null,
    cityName: city?.cityName || null,
    countryCode: city?.countryCode || null,
    categories: inferCategories(title, description, tags),
  };
}

async function scrapeConfsTech() {
  const out = [];
  const years = yearsToFetch();
  for (const topic of TOPICS) {
    for (const year of years) {
      const raws = await fetchTopicYear(topic, year);
      for (const r of raws) out.push(normalize(r, topic));
    }
  }
  return out;
}

module.exports = { scrapeConfsTech };
