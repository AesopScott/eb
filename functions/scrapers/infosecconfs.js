const { parse }        = require('node-html-parser');
const { withBrowser, withPage } = require('../lib/browser');
const { resolveCity }  = require('../lib/cities');

// Aggregator sites focused on security conferences
const SOURCES = [
  {
    url:     'https://www.infosec-conferences.com/',
    vendor:  'Infosec-Conferences.com',
    id:      'infosecconfs',
  },
  {
    url:     'https://www.infosec-conferences.com/events-in-united-states/',
    vendor:  'Infosec-Conferences.com',
    id:      'infosecconfs-us',
  },
];

function parseDate(str) {
  if (!str) return '';
  const d = new Date(str.trim());
  return isNaN(d) ? '' : d.toISOString().slice(0, 10);
}

function extractFromHtml(html, source) {
  const root = parse(html);
  const events = [];

  // Try multiple card patterns the site might use
  const SELECTORS = [
    '.conference-item', '.event-item', '.vevent',
    'article', 'tr[class*="event"]', '[class*="conf-row"]',
    'li[class*="event"]', '[class*="listing-item"]',
  ];

  let cards = [];
  for (const sel of SELECTORS) {
    cards = root.querySelectorAll(sel);
    if (cards.length >= 3) break;
  }

  // Fallback: any element with a recognisable structure
  if (cards.length < 3) {
    cards = root.querySelectorAll('tr, li').filter(el => {
      const t = el.text.trim();
      return t.length > 20 && /\d{4}/.test(t);
    }).slice(0, 100);
  }

  for (const card of cards) {
    const titleEl = card.querySelector('h2, h3, h4, a, .title, .summary, [class*="title"]');
    const title   = titleEl?.text?.trim();
    if (!title || title.length < 5) continue;

    const dateEl  = card.querySelector('time, .dtstart, [class*="date"], [class*="when"]');
    const locEl   = card.querySelector('.location, .venue, [class*="location"], [class*="city"]');
    const linkEl  = card.querySelector('a[href]');

    const dateStr    = dateEl?.getAttribute('datetime') || dateEl?.text?.trim() || '';
    const locationStr = locEl?.text?.trim() || '';
    let   href        = linkEl?.getAttribute('href') || '';
    if (href && !href.startsWith('http')) {
      href = 'https://www.infosec-conferences.com' + href;
    }

    const isOnline = /virtual|online/i.test(locationStr + title);
    const city     = isOnline
      ? { cityKey: 'online', cityName: 'Online', countryCode: null }
      : resolveCity(locationStr);

    events.push({
      sourceId:    `${source.id}-${title.slice(0, 60).replace(/\s+/g, '-')}`,
      title,
      description: '',
      startDate:   parseDate(dateStr),
      endDate:     '',
      location:    locationStr,
      url:         href || source.url,
      tags:        ['cybersecurity', 'information security', 'conference'],
      vendor:      source.vendor,
      eventType:   isOnline ? 'online' : 'in-person',
      cityKey:     city?.cityKey     || null,
      cityName:    city?.cityName    || null,
      countryCode: city?.countryCode || null,
      categories:  ['Cybersecurity'],
    });
  }
  return events;
}

async function fetchWithFallback(source) {
  // Try plain fetch first (fast), fall back to Puppeteer for JS-heavy pages
  try {
    const res = await fetch(source.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EventBuzz/1.0)' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const events = extractFromHtml(html, source);
    if (events.length > 0) return events;
    throw new Error('No events from static fetch, trying Puppeteer');
  } catch (_) {}

  // Puppeteer fallback
  return withBrowser(async (browser) => {
    let html = '';
    await withPage(browser, async (page) => {
      await page.goto(source.url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() =>
        page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      );
      await new Promise(r => setTimeout(r, 2500));
      html = await page.content();
    });
    return extractFromHtml(html, source);
  });
}

async function scrapeInfosecConfs() {
  const all = [];
  for (const source of SOURCES) {
    try {
      const events = await fetchWithFallback(source);
      all.push(...events);
    } catch (err) {
      console.error(`infosecconfs ${source.url} failed: ${err.message}`);
    }
  }
  return all;
}

module.exports = { scrapeInfosecConfs };
