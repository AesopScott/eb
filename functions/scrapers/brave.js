const { resolveCity }     = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

// Search queries run each cycle. Year in query gets fresh results.
// At $5/1000 requests with $5/month free credit = 1,000 free/month.
// 16 queries/day × 30 days = 480 requests/month — well within free tier.
const QUERIES = [
  { q: 'cybersecurity conference summit 2025',         cats: ['Cybersecurity'], tags: ['cybersecurity', 'conference'] },
  { q: 'cybersecurity conference summit 2026',         cats: ['Cybersecurity'], tags: ['cybersecurity', 'conference'] },
  { q: 'information security conference expo 2025',    cats: ['Cybersecurity'], tags: ['infosec', 'security', 'expo'] },
  { q: 'cyber threat intelligence summit 2025',        cats: ['Cybersecurity'], tags: ['cybersecurity', 'threat intelligence'] },
  { q: 'AI artificial intelligence conference 2025',   cats: ['AI'],            tags: ['ai', 'artificial intelligence'] },
  { q: 'AI machine learning summit conference 2026',   cats: ['AI'],            tags: ['ai', 'machine learning'] },
  { q: 'generative AI LLM conference summit 2025',     cats: ['AI'],            tags: ['generative ai', 'llm', 'conference'] },
  { q: 'cloud computing conference summit 2025',       cats: ['Cloud'],         tags: ['cloud', 'cloud computing'] },
  { q: 'data engineering analytics conference 2025',   cats: ['Data'],          tags: ['data', 'analytics', 'data engineering'] },
  { q: 'data science machine learning conference 2025',cats: ['Data', 'AI'],    tags: ['data science', 'machine learning'] },
  { q: 'devops developer conference 2025',             cats: ['Developer'],     tags: ['devops', 'developer'] },
  { q: 'kubernetes platform engineering conference 2025', cats: ['Developer', 'Cloud'], tags: ['kubernetes', 'platform engineering'] },
  { q: 'IT operations ITSM technology conference 2025',cats: ['IT / Ops'],      tags: ['it ops', 'itsm'] },
  { q: 'zero trust identity security summit 2025',     cats: ['Cybersecurity'], tags: ['zero trust', 'identity', 'security'] },
  { q: 'cloud security CSPM CNAPP conference 2025',    cats: ['Cybersecurity', 'Cloud'], tags: ['cloud security', 'cspm'] },
  { q: 'MLOps generative AI developer conference 2025',cats: ['AI', 'Developer'],        tags: ['mlops', 'generative ai'] },
];

function extractDate(text) {
  if (!text) return '';
  const PATS = [
    /(\d{4}-\d{2}-\d{2})/,
    /([A-Za-z]+ \d{1,2}[-–]\d{1,2},?\s*\d{4})/,
    /([A-Za-z]+ \d{1,2},?\s*\d{4})/,
    /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
  ];
  const now = new Date();
  for (const p of PATS) {
    const m = text.match(p);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d) && d >= now) return d.toISOString().slice(0, 10);
    }
  }
  return '';
}

function extractLocation(text) {
  if (!text) return '';
  const m = text.match(
    /\b(?:in|at)\s+([A-Z][a-zA-Z\s]{2,25},\s*(?:[A-Z]{2}|[A-Za-z\s]{3,20}))/
  );
  return m ? m[1].trim() : '';
}

async function braveSearch(query, apiKey) {
  const url = 'https://api.search.brave.com/res/v1/web/search?' +
    new URLSearchParams({ q: query, count: '10', search_lang: 'en', country: 'us' });

  const res = await fetch(url, {
    headers: {
      'Accept':               'application/json',
      'X-Subscription-Token': apiKey.trim(),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brave HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json?.web?.results || [];
}

// Domains we already scrape elsewhere — skip their results to avoid dupes
const SKIP_DOMAINS = /eventbrite\.com|10times\.com|meetup\.com|ticketmaster|lu\.ma/;

async function scrapeBrave(apiKey) {
  const all  = [];
  const seen = new Set();

  for (const { q, cats, tags } of QUERIES) {
    let results;
    try {
      results = await braveSearch(q, apiKey);
    } catch (err) {
      console.error(`Brave "${q}" failed: ${err.message}`);
      continue;
    }

    for (const { title, url, description } of results) {
      if (!title || !url || seen.has(url)) continue;
      if (SKIP_DOMAINS.test(url)) continue;
      seen.add(url);

      const combined    = `${title} ${description}`;
      const startDate   = extractDate(combined);
      const locationStr = extractLocation(description || '');
      const isOnline    = /virtual|online|webinar/i.test(combined);

      const city = isOnline
        ? { cityKey: 'online', cityName: 'Online', countryCode: null }
        : resolveCity(locationStr);

      all.push({
        sourceId:    `brave-${Buffer.from(url).toString('base64').slice(0, 48)}`,
        title:       title.replace(/\s*[-|–]\s*.{0,50}$/, '').trim(),
        description: description || '',
        startDate,
        endDate:     '',
        location:    locationStr,
        url,
        tags,
        vendor:      '',
        eventType:   isOnline ? 'online' : 'in-person',
        cityKey:     city?.cityKey     || null,
        cityName:    city?.cityName    || null,
        countryCode: city?.countryCode || null,
        categories:  cats,
      });
    }
  }

  return all;
}

module.exports = { scrapeBrave };
