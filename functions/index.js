const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions/v2');
const admin = require('firebase-admin');

const { scrapeConfsTech } = require('./scrapers/confstech');

admin.initializeApp();
const db = admin.firestore();

// Deterministic event id so re-runs upsert instead of duplicating.
function eventId(source, sourceId) {
  return `${source}__${sourceId}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function writeEvents(source, events) {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = db.batch();
  for (const ev of events) {
    const id = eventId(source, ev.sourceId);
    const ref = db.collection('events').doc(id);
    batch.set(ref, { ...ev, source, fetchedAt: now, updatedAt: now }, { merge: true });
  }
  await batch.commit();
}

async function recordRun(source, result) {
  await db.collection('scraperRuns').doc(source).set({
    source,
    lastRunAt: admin.firestore.FieldValue.serverTimestamp(),
    ...result,
  }, { merge: true });
}

// ---------------------------------------------------------------------------
// Scheduled scrapers
// ---------------------------------------------------------------------------

exports.scrapeConfsTechDaily = onSchedule(
  { schedule: 'every 24 hours', timeoutSeconds: 300, memory: '512MiB' },
  async () => {
    const source = 'confstech';
    try {
      const events = await scrapeConfsTech();
      await writeEvents(source, events);
      await recordRun(source, { count: events.length, status: 'ok', error: null });
      logger.info(`confstech: wrote ${events.length} events`);
    } catch (err) {
      await recordRun(source, { status: 'error', error: String(err) });
      logger.error(`confstech failed: ${err}`);
      throw err;
    }
  }
);
