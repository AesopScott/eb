const { withBrowser, withPage } = require('../lib/browser');
const { resolveCity }           = require('../lib/cities');
const { inferCategories }       = require('../lib/categories');

// Filter to tech-relevant topics.
const URL = 'https://events.microsoft.com/en-us/allevents/?language=English&clienttimezoneoffset=0' +
  '&technology=Azure,Developer%20Tools,AI%20%26%20Machine%20Learning,Security,Dynamics%20365,Microsoft%20365';

function normalize(raw, i) {
  if (!raw.title) return null;
  const city = raw.online
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(raw.location || '');
  return {
    sourceId: `microsoft-${i}-${(raw.title || '').slice(0, 50)}`,
    title:       raw.title,
    description: raw.description || '',
    startDate:   raw.startDate   || '',
    endDate:     raw.endDate     || raw.startDate || '',
    location:    raw.location    || '',
    url:         raw.url         || '',
    tags:        ['microsoft'],
    vendor:      'Microsoft',
    eventType:   raw.online ? 'online' : 'in-person',
    cityKey:     city?.cityKey     || null,
    cityName:    city?.cityName    || null,
    countryCode: city?.countryCode || null,
    categories:  inferCategories(raw.title, raw.description || '', ['microsoft', 'azure']),
  };
}

async function scrapeMicrosoft() {
  return withBrowser(async (browser) => {
    return withPage(browser, async (page) => {
      await page.goto(URL, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise(r => setTimeout(r, 3000));

      // Scroll to trigger lazy-loaded cards.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
      await new Promise(r => setTimeout(r, 1500));

      const raw = await page.evaluate(() => {
        const results = [];

        const selectors = [
          '[class*="EventCard"]',
          '[class*="event-card"]',
          '[class*="eventTile"]',
          '[class*="EventTile"]',
          'article[class*="event"]',
          '.ms-DocumentCard',
        ];

        let cards = [];
        for (const sel of selectors) {
          cards = Array.from(document.querySelectorAll(sel));
          if (cards.length) break;
        }

        if (!cards.length) {
          cards = Array.from(document.querySelectorAll('article')).filter(
            a => a.querySelector('time, [class*="date"]')
          );
        }

        for (const card of cards) {
          const titleEl    = card.querySelector('h3, h4, h2, [class*="title"], [class*="name"]');
          const dateEl     = card.querySelector('time, [class*="date"], [class*="Date"]');
          const locationEl = card.querySelector('[class*="location"], [class*="venue"], [class*="city"]');
          const descEl     = card.querySelector('p, [class*="description"]');
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

module.exports = { scrapeMicrosoft };
