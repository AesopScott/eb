const { withBrowser, withPage } = require('./browser');
const { resolveCity }           = require('./cities');
const { inferCategories }       = require('./categories');

// Generic selectors used as fallback when vendor config doesn't specify.
const GENERIC = {
  cards:       '[class*="EventCard"],[class*="event-card"],[class*="event-item"],article[class*="event"]',
  title:       'h3,h4,h2,[class*="title"],[class*="headline"],[class*="name"]',
  date:        'time,[class*="date"],[class*="Date"],[class*="when"],[class*="start"]',
  location:    '[class*="location"],[class*="venue"],[class*="city"],[class*="where"]',
  description: 'p,[class*="description"],[class*="summary"],[class*="body"]',
};

function firstMatch(el, selectorStr) {
  if (!selectorStr) return null;
  for (const sel of selectorStr.split(',').map(s => s.trim())) {
    try {
      const found = el.querySelector(sel);
      if (found) return found;
    } catch (_) {}
  }
  return null;
}

function tryCards(root, selectorStr) {
  if (!selectorStr) return [];
  for (const sel of selectorStr.split(',').map(s => s.trim())) {
    try {
      const found = Array.from(root.querySelectorAll(sel));
      if (found.length) return found;
    } catch (_) {}
  }
  return [];
}

async function scrapeVendor(config) {
  return withBrowser(async (browser) => {
    return withPage(browser, async (page) => {
      await page.goto(config.url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() =>
        page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      );

      await new Promise(r => setTimeout(r, config.waitMs ?? 2500));

      if (config.scroll !== false) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6));
        await new Promise(r => setTimeout(r, 1200));
      }

      const raw = await page.evaluate((cfg, generic) => {
        function firstMatch(el, selectorStr) {
          if (!selectorStr) return null;
          for (const sel of selectorStr.split(',').map(s => s.trim())) {
            try { const f = el.querySelector(sel); if (f) return f; } catch (_) {}
          }
          return null;
        }
        function tryCards(root, selectorStr) {
          if (!selectorStr) return [];
          for (const sel of selectorStr.split(',').map(s => s.trim())) {
            try { const f = Array.from(root.querySelectorAll(sel)); if (f.length) return f; } catch (_) {}
          }
          return [];
        }

        const s = cfg.selectors || {};
        let cards = tryCards(document, s.cards);

        if (!cards.length) cards = tryCards(document, generic.cards);

        // Last resort: any article/section with a link and enough text.
        if (!cards.length) {
          cards = Array.from(document.querySelectorAll('article,section,[class*="card"]'))
            .filter(el => el.querySelector('a') && (el.innerText || '').length > 30)
            .slice(0, 50);
        }

        const results = [];
        for (const card of cards) {
          const titleEl = firstMatch(card, s.title) || firstMatch(card, generic.title);
          const title   = titleEl?.innerText?.trim();
          if (!title || title.length < 4) continue;

          const dateEl  = firstMatch(card, s.date)     || firstMatch(card, generic.date);
          const locEl   = firstMatch(card, s.location)  || firstMatch(card, generic.location);
          const descEl  = firstMatch(card, s.description) || firstMatch(card, generic.description);
          const linkEl  = card.querySelector('a[href]');

          results.push({
            title,
            date:        dateEl?.getAttribute('datetime') || dateEl?.innerText?.trim() || '',
            location:    locEl?.innerText?.trim()  || '',
            description: descEl?.innerText?.trim()?.slice(0, 300) || '',
            url:         linkEl?.href || cfg.url,
            online:      /virtual|online/i.test(locEl?.innerText || title),
          });
        }
        return results;
      }, config, GENERIC);

      return raw.map((r, i) => normalizeEvent(r, i, config)).filter(Boolean);
    });
  });
}

function normalizeEvent(raw, i, config) {
  if (!raw.title) return null;
  const city = raw.online
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(raw.location || '');
  const cats = (config.defaultCategories?.length)
    ? config.defaultCategories
    : inferCategories(raw.title, raw.description || '', config.tags || [config.id]);

  return {
    sourceId:    `${config.id}-${i}-${raw.title.slice(0, 40).replace(/\s+/g, '-')}`,
    title:       raw.title,
    description: raw.description || '',
    startDate:   raw.date?.slice(0, 10) || '',
    endDate:     '',
    location:    raw.location || '',
    url:         raw.url || config.url,
    tags:        config.tags || [config.id],
    vendor:      config.vendor,
    eventType:   raw.online ? 'online' : 'in-person',
    cityKey:     city?.cityKey     || null,
    cityName:    city?.cityName    || null,
    countryCode: city?.countryCode || null,
    categories:  cats,
  };
}

module.exports = { scrapeVendor };
