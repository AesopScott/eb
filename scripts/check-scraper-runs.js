'use strict';

// Run: node scripts/check-scraper-runs.js
// Requires GOOGLE_APPLICATION_CREDENTIALS or firebase-admin default creds.

const admin = require('../functions/node_modules/firebase-admin');

admin.initializeApp({ projectId: 'eventbuzz-3a58f' });
const db = admin.firestore();

async function main() {
  const snap = await db.collection('scraperRuns').get();

  if (snap.empty) {
    console.log('No scraper runs found yet — functions may not have fired yet.');
    return;
  }

  const rows = snap.docs.map(d => d.data()).sort((a, b) => {
    // errors first, then by written ascending
    if (a.status === 'error' && b.status !== 'error') return -1;
    if (b.status === 'error' && a.status !== 'error') return 1;
    return (a.written || 0) - (b.written || 0);
  });

  const errors  = rows.filter(r => r.status === 'error');
  const zeroes  = rows.filter(r => r.status === 'ok' && r.written === 0);
  const working = rows.filter(r => r.status === 'ok' && r.written > 0);

  console.log('\n=== ERRORS (' + errors.length + ') ===');
  for (const r of errors) {
    console.log(`  ✗ ${r.source.padEnd(35)} ${r.error?.slice(0, 120)}`);
  }

  console.log('\n=== 0 EVENTS WRITTEN (' + zeroes.length + ') ===');
  for (const r of zeroes) {
    console.log(`  ○ ${r.source.padEnd(35)} total=${r.total ?? '?'}`);
  }

  console.log('\n=== WORKING (' + working.length + ') ===');
  for (const r of working) {
    console.log(`  ✓ ${r.source.padEnd(35)} written=${String(r.written).padStart(4)}  total=${r.total}`);
  }

  console.log(`\nTotal sources tracked: ${rows.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
