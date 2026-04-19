const { withBrowser, withPage } = require('../lib/browser');
const { resolveCity }           = require('../lib/cities');
const { inferCategories }       = require('../lib/categories');

const URL = 'https://cloud.google.com/events';

function normalize(raw, i) {
  if (!raw.title) return null;
  const city = raw.online
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(raw.location || '');
  return {
    sourceId: `googlecloud-${i}-${(raw.title || '').slice(0, 50)}`,
    title:       raw.title,
    description: raw.description || '',
    startDate:   raw.startDate || '',
    endDate:     raw.endDate   || raw.startDate || '',
    location:    raw.location  || '',
    url:         raw.url       || '',
    tags:        ['google cloud'],
    vendor:      'Google Cloud',
    eventType:   raw.online ? 'online' : 'in-person',
    cityKey:     city?.cityKey     || null,
    cityName:    city?.cityName    || null,
    countryCode: city?.countryCode || null,
    categories:  inferCategories(raw.title, raw.description || '', ['cloud', 'google cloud']),
  };
}

async function scrapeGoogleCloud() {
  return withBrowser(async (browser) => {
    return withPage(browser, async (page) => {
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });

      // Give JS components time to hydrate.
      await new Promise(r => setTimeout(r, 3000));

      const raw = await page.evaluate(() => {
        const results = [];

        // Google Cloud events page uses devsite-event custom elements or card grids.
        // Try multiple selector patterns — site redesigns frequently.
        const selectors = [
          'devsite-event',
          '[class*="EventCard"]',
          '[class*="event-card"]',
          'article[class*="event"]',
          '.glue-grid__col article',
        ];

        let cards = [];
        for (const sel of selectors) {
          cards = Array.from(document.querySelectorAll(sel));
          if (cards.length) break;
        }

        // Fallback: any article with a date-like element.
        if (!cards.length) {
          cards = Array.from(document.querySelectorAll('article')).filter(
            a => a.querySelector('time, [class*="date"]')
          );
        }

        for (const card of cards) {
          const titleEl    = card.querySelector('h3, h4, [class*="title"], [class*="headline"]');
          const dateEl     = card.querySelector('time, [class*="date"], [class*="Date"]');
          const locationEl = card.querySelector('[class*="location"], [class*="venue"], [class*="city"]');
          const descEl     = card.querySelector('p, [class*="description"], [class*="body"]');
          const linkEl     = card.querySelector('a[href]');

          const title = titleEl?.innerText?.trim();
          if (!title) continue;

          const dateText = dateEl?.getAttribute('datetime') || dateEl?.innerText?.trim() || '';
          results.push({
            title,
            description: descEl?.innerText?.trim() || '',
            startDate:   dateText.slice(0, 10),
            endDate:     '',
            location:    locationEl?.innerText?.trim() || '',
            url:         linkEl?.href || '',
            online:      /online|virtual/i.test(locationEl?.innerText || ''),
          });
        }
        return results;
      });

      return raw.map(normalize).filter(Boolean);
    });
  });
}

module.exports = { scrapeGoogleCloud };
