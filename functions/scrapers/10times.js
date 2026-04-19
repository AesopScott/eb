const { withBrowser, withPage } = require('../lib/browser');
const { resolveCity }           = require('../lib/cities');

const CATEGORIES = [
  {
    slug: 'cybersecurity',
    cats: ['Cybersecurity'],
    tags: ['cybersecurity', 'information security', 'conference'],
  },
  {
    slug: 'artificial-intelligence',
    cats: ['AI'],
    tags: ['ai', 'artificial intelligence', 'machine learning'],
  },
  {
    slug: 'cloud-computing',
    cats: ['Cloud'],
    tags: ['cloud', 'cloud computing'],
  },
  {
    slug: 'data-science',
    cats: ['Data'],
    tags: ['data science', 'analytics', 'data'],
  },
  {
    slug: 'devops',
    cats: ['Developer', 'Cloud'],
    tags: ['devops', 'developer', 'ci/cd'],
  },
];

async function scrapeCategory(browser, cat) {
  const url = `https://10times.com/${cat.slug}`;
  const events = [];

  await withPage(browser, async (page) => {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 }).catch(() =>
      page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 })
    );
    await new Promise(r => setTimeout(r, 3500));

    // Scroll to trigger lazy loads
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.4);
    });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight * 0.8);
    });
    await new Promise(r => setTimeout(r, 1000));

    const raw = await page.evaluate(() => {
      const results = [];

      // 10times renders event rows/cards — try several known selectors
      const CARD_SELECTORS = [
        '[class*="event-card"]',
        '[class*="eventCard"]',
        '[class*="event-row"]',
        '[class*="eventRow"]',
        '[data-event-id]',
        'li[class*="event"]',
        '.evnt-row',
        'article',
      ];

      let cards = [];
      for (const sel of CARD_SELECTORS) {
        cards = Array.from(document.querySelectorAll(sel));
        if (cards.length >= 3) break;
      }

      // Last resort: any block with a date-like string and a link
      if (cards.length < 3) {
        cards = Array.from(document.querySelectorAll('a[href]'))
          .map(a => a.closest('li, article, div[class]'))
          .filter((el, i, arr) => el && arr.indexOf(el) === i)
          .filter(el => /\d{4}/.test(el.innerText || ''))
          .slice(0, 80);
      }

      for (const card of cards.slice(0, 80)) {
        const titleEl = card.querySelector(
          'h2, h3, h4, [class*="title"], [class*="name"], [class*="heading"]'
        ) || card.querySelector('a[href]');
        const title = titleEl?.innerText?.trim();
        if (!title || title.length < 5) continue;

        const dateEl = card.querySelector(
          'time, [class*="date"], [class*="Date"], [class*="when"], [class*="start"]'
        );
        const locEl = card.querySelector(
          '[class*="location"], [class*="venue"], [class*="city"], [class*="place"], [class*="where"]'
        );
        const linkEl = card.querySelector('a[href]');

        results.push({
          title,
          date:     dateEl?.getAttribute('datetime') || dateEl?.innerText?.trim() || '',
          location: locEl?.innerText?.trim() || '',
          url:      linkEl?.href || '',
        });
      }
      return results;
    });

    for (const r of raw) {
      if (!r.title) continue;
      const isOnline = /virtual|online/i.test(r.location + r.title);
      const city = isOnline
        ? { cityKey: 'online', cityName: 'Online', countryCode: null }
        : resolveCity(r.location);

      events.push({
        sourceId:    `10times-${cat.slug}-${r.title.slice(0, 60).replace(/\s+/g, '-')}`,
        title:       r.title,
        description: '',
        startDate:   r.date?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '',
        endDate:     '',
        location:    r.location,
        url:         r.url || url,
        tags:        cat.tags,
        vendor:      '10times',
        eventType:   isOnline ? 'online' : 'in-person',
        cityKey:     city?.cityKey     || null,
        cityName:    city?.cityName    || null,
        countryCode: city?.countryCode || null,
        categories:  cat.cats,
      });
    }
  });

  return events;
}

async function scrape10Times() {
  return withBrowser(async (browser) => {
    const all = [];
    for (const cat of CATEGORIES) {
      try {
        const events = await scrapeCategory(browser, cat);
        all.push(...events);
      } catch (err) {
        // Non-fatal — skip failing category
        console.error(`10times ${cat.slug} failed: ${err.message}`);
      }
    }
    return all;
  });
}

module.exports = { scrape10Times };
