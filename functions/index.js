const { onSchedule }         = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger }             = require('firebase-functions/v2');
const admin                  = require('firebase-admin');

const { scrapeConfsTech }  = require('./scrapers/confstech');
const { scrapeDevpost }    = require('./scrapers/devpost');
const { scrapeEventbrite } = require('./scrapers/eventbrite');
const { scrapeAWS }          = require('./scrapers/aws');
const { scrapeCNCF }         = require('./scrapers/cncf');
const { scrapeGoogleCloud }  = require('./scrapers/googlecloud');
const { scrapeMicrosoft }    = require('./scrapers/microsoft');
const { scrape10Times }      = require('./scrapers/10times');
const { scrapeInfosecConfs } = require('./scrapers/infosecconfs');
const { scrapeBrave }        = require('./scrapers/brave');
const { scrapeGoogleSearch } = require('./scrapers/googlesearch');
const { scrapeVendor }       = require('./lib/vendor-scraper');
const cyberVendors           = require('./vendors/cyber');
const aiVendors              = require('./vendors/ai');
const cloudVendors           = require('./vendors/cloud');
const dataVendors            = require('./vendors/data');
const devopsVendors          = require('./vendors/devops');

admin.initializeApp();
const db = admin.firestore();

// Fetch a secret from Secret Manager at runtime using the compute SA identity.
// Avoids deploy-time IAM checks that require the CI service account to have
// secretmanager.secrets.get — only the runtime compute SA needs secretAccessor.
async function getSecret(name) {
  const tokenRes = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  const { access_token: token } = await tokenRes.json();
  const res = await fetch(
    `https://secretmanager.googleapis.com/v1/projects/eventbuzz-3a58f/secrets/${name}/versions/latest:access`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Secret ${name}: ${res.status} ${await res.text()}`);
  const { payload: { data } } = await res.json();
  return Buffer.from(data, 'base64').toString('utf8');
}

function eventId(source, sourceId) {
  return `${source}__${sourceId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Only write events with a resolved city (or online).
async function writeEvents(source, events) {
  const eligible = events.filter(ev => ev.cityKey !== null);
  if (!eligible.length) return 0;

  const now = admin.firestore.FieldValue.serverTimestamp();
  // Firestore batch limit is 500.
  const CHUNK = 400;
  for (let i = 0; i < eligible.length; i += CHUNK) {
    const batch = db.batch();
    for (const ev of eligible.slice(i, i + CHUNK)) {
      const id = eventId(source, ev.sourceId);
      const ref = db.collection('events').doc(id);
      batch.set(ref, { ...ev, source, fetchedAt: now, updatedAt: now }, { merge: true });
    }
    await batch.commit();
  }
  return eligible.length;
}

async function recordRun(source, result) {
  await db.collection('scraperRuns').doc(source).set({
    source,
    lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
    ...result,
  }, { merge: true });
}

async function runScraper(source, fn, { silent = false } = {}) {
  try {
    const events = await fn();
    const written = await writeEvents(source, events);
    await recordRun(source, { total: events.length, written, status: 'ok', error: null });
    logger.info(`${source}: ${written}/${events.length} events written`);
  } catch (err) {
    await recordRun(source, { status: 'error', error: String(err) });
    logger.error(`${source} failed: ${err}`);
    if (!silent) throw err;
  }
}

// ---------------------------------------------------------------------------
// Scheduled scrapers
// ---------------------------------------------------------------------------

exports.scrapeConfsTechDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 300, memory: '512MiB' },
  () => runScraper('confstech', scrapeConfsTech)
);

exports.scrapeDevpostDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 180, memory: '256MiB' },
  () => runScraper('devpost', scrapeDevpost)
);

exports.scrapeEventbriteDaily = onSchedule(
  { schedule: 'every 6 hours', timeoutSeconds: 300, memory: '512MiB' },
  async () => {
    const apiKey = await getSecret('EVENTBRITE_API_KEY');
    return runScraper('eventbrite', () => scrapeEventbrite(apiKey));
  }
);

exports.scrapeAWSDaily = onSchedule(
  { schedule: 'every 6 hours', timeoutSeconds: 120, memory: '256MiB' },
  () => runScraper('aws', scrapeAWS)
);

exports.scrapeCNCFDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 120, memory: '256MiB' },
  () => runScraper('cncf', scrapeCNCF)
);

exports.scrape10TimesDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 540, memory: '2GiB' },
  () => runScraper('10times', scrape10Times)
);

exports.scrapeInfosecConfsDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 180, memory: '512MiB' },
  () => runScraper('infosecconfs', scrapeInfosecConfs)
);

exports.scrapeBraveDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 120, memory: '256MiB' },
  async () => {
    const apiKey = await getSecret('BRAVE_SEARCH_API_KEY');
    return runScraper('brave', () => scrapeBrave(apiKey));
  }
);

exports.scrapeGoogleSearchDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 300, memory: '256MiB' },
  async () => {
    const apiKey = await getSecret('BRAVE_SEARCH_API_KEY');
    return runScraper('googlesearch', () => scrapeGoogleSearch(apiKey));
  }
);

// Vendor batch scrapers — silent:true so one failure doesn't abort the batch.
exports.scrapeCyberVendorsDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 540, memory: '2GiB' },
  async () => {
    for (const config of cyberVendors) {
      await runScraper(config.id, () => scrapeVendor(config), { silent: true });
    }
  }
);

exports.scrapeAIVendorsDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 540, memory: '2GiB' },
  async () => {
    for (const config of aiVendors) {
      await runScraper(config.id, () => scrapeVendor(config), { silent: true });
    }
  }
);

exports.scrapeCloudVendorsDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 540, memory: '2GiB' },
  async () => {
    for (const config of cloudVendors) {
      await runScraper(config.id, () => scrapeVendor(config), { silent: true });
    }
  }
);

exports.scrapeDataVendorsDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 540, memory: '2GiB' },
  async () => {
    for (const config of dataVendors) {
      await runScraper(config.id, () => scrapeVendor(config), { silent: true });
    }
  }
);

exports.scrapeDevOpsVendorsDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 540, memory: '2GiB' },
  async () => {
    for (const config of devopsVendors) {
      await runScraper(config.id, () => scrapeVendor(config), { silent: true });
    }
  }
);

exports.scrapeGoogleCloudDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 300, memory: '2GiB' },
  () => runScraper('googlecloud', scrapeGoogleCloud)
);

exports.scrapeMicrosoftDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 300, memory: '2GiB' },
  () => runScraper('microsoft', scrapeMicrosoft)
);

// ---------------------------------------------------------------------------
// Admin — manually trigger any scraper from the admin panel
// ---------------------------------------------------------------------------

const NAMED_SCRAPERS = {
  confstech:    () => scrapeConfsTech(),
  devpost:      () => scrapeDevpost(),
  aws:          () => scrapeAWS(),
  cncf:         () => scrapeCNCF(),
  googlecloud:  () => scrapeGoogleCloud(),
  microsoft:    () => scrapeMicrosoft(),
  '10times':    () => scrape10Times(),
  infosecconfs: () => scrapeInfosecConfs(),
  eventbrite:   async () => scrapeEventbrite(await getSecret('EVENTBRITE_API_KEY')),
  brave:        async () => scrapeBrave(await getSecret('BRAVE_SEARCH_API_KEY')),
  googlesearch: async () => scrapeGoogleSearch(await getSecret('BRAVE_SEARCH_API_KEY')),
};

const VENDOR_BATCHES = {
  'cyber-vendors':  cyberVendors,
  'ai-vendors':     aiVendors,
  'cloud-vendors':  cloudVendors,
  'data-vendors':   dataVendors,
  'devops-vendors': devopsVendors,
};

const ALL_VENDORS = [
  ...cyberVendors, ...aiVendors, ...cloudVendors, ...dataVendors, ...devopsVendors,
];
const VENDOR_MAP = Object.fromEntries(ALL_VENDORS.map(v => [v.id, v]));

exports.triggerScraper = onCall(
  { timeoutSeconds: 540, memory: '2GiB' },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in required');

    const { scraper } = request.data;
    if (!scraper) throw new HttpsError('invalid-argument', 'scraper name required');

    let fn;
    if (NAMED_SCRAPERS[scraper]) {
      fn = NAMED_SCRAPERS[scraper];
    } else if (VENDOR_BATCHES[scraper]) {
      const batch = VENDOR_BATCHES[scraper];
      fn = async () => {
        const all = [];
        for (const config of batch) {
          try { all.push(...await scrapeVendor(config)); } catch (_) {}
        }
        return all;
      };
    } else if (VENDOR_MAP[scraper]) {
      fn = () => scrapeVendor(VENDOR_MAP[scraper]);
    } else {
      throw new HttpsError('not-found', `Unknown scraper: ${scraper}`);
    }

    // Capture console output so it appears in admin panel results
    const logs = [];
    const origLog   = console.log;
    const origError = console.error;
    const origWarn  = console.warn;
    const capture   = (...args) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    console.log   = capture;
    console.error = capture;
    console.warn  = capture;

    try {
      const events  = await fn();
      const written = await writeEvents(scraper, events);
      await recordRun(scraper, { total: events.length, written, status: 'ok', error: null });
      return { ok: true, total: events.length, written, logs };
    } catch (err) {
      const errorMsg = String(err);
      await recordRun(scraper, { status: 'error', error: errorMsg }).catch(() => {});
      logger.error(`${scraper} failed: ${err.stack || err}`);
      return { ok: false, error: errorMsg, stack: err.stack || '', logs };
    } finally {
      console.log   = origLog;
      console.error = origError;
      console.warn  = origWarn;
    }
  }
);
