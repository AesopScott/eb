const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');

const { scrapeConfsTech }  = require('./scrapers/confstech');
const { scrapeDevpost }    = require('./scrapers/devpost');
const { scrapeEventbrite } = require('./scrapers/eventbrite');
const { scrapeAWS }          = require('./scrapers/aws');
const { scrapeCNCF }         = require('./scrapers/cncf');
const { scrapeGoogleCloud }  = require('./scrapers/googlecloud');
const { scrapeMicrosoft }    = require('./scrapers/microsoft');
const { scrapeVendor }       = require('./lib/vendor-scraper');
const cyberVendors           = require('./vendors/cyber');

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

// Vendor batch scrapers — silent:true so one failure doesn't abort the batch.
exports.scrapeCyberVendorsDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 540, memory: '2GiB' },
  async () => {
    for (const config of cyberVendors) {
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
