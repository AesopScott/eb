// Confs.tech publishes one JSON file per topic per year on GitHub Pages.
// Full topic list: https://github.com/tech-conferences/conference-data
// We pull the topics most relevant to EventBuzz.
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
  return {
    sourceId: `${topic}-${raw.startDate}-${(raw.url || raw.name || '').slice(0, 64)}`,
    title: raw.name,
    description: raw.description || '',
    startDate: raw.startDate || '',
    endDate: raw.endDate || raw.startDate || '',
    location: [raw.city, raw.country].filter(Boolean).join(', '),
    url: raw.url || '',
    tags: [topic, ...(raw.topics || [])],
    vendor: '',
    eventType: raw.online ? 'online' : 'in-person',
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
