/**
 * One-time script to get Meetup OAuth tokens.
 * Run: node scripts/meetup-auth.js
 *
 * Prerequisites:
 *   1. Create OAuth app at https://www.meetup.com/api/oauth/list/
 *   2. Set redirect URI to: http://localhost:3000/callback
 *   3. Copy Client ID and Client Secret below (or set env vars)
 */
const http = require('http');

const CLIENT_ID     = process.env.MEETUP_CLIENT_ID     || 'PASTE_CLIENT_ID_HERE';
const CLIENT_SECRET = process.env.MEETUP_CLIENT_SECRET || 'PASTE_CLIENT_SECRET_HERE';
const REDIRECT_URI  = 'http://localhost:3000/callback';
const PORT          = 3000;

const authUrl = `https://secure.meetup.com/oauth2/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log('\n── Meetup OAuth Setup ──────────────────────────────────────');
console.log('Open this URL in your browser:\n');
console.log(authUrl);
console.log('\nWaiting for callback on http://localhost:3000/callback ...\n');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname !== '/callback') { res.end(); return; }

  const code = url.searchParams.get('code');
  if (!code) {
    res.end('No code in callback.');
    console.error('No code received.');
    process.exit(1);
  }

  res.end('<html><body><h2>Success — check your terminal.</h2></body></html>');

  try {
    const tokenRes = await fetch('https://secure.meetup.com/oauth2/access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        redirect_uri:  REDIRECT_URI,
        code,
      }),
    });
    const tokens = await tokenRes.json();

    console.log('── Tokens received ─────────────────────────────────────────');
    console.log('Add these three secrets to GCP Secret Manager:\n');
    console.log(`MEETUP_CLIENT_ID     = ${CLIENT_ID}`);
    console.log(`MEETUP_CLIENT_SECRET = ${CLIENT_SECRET}`);
    console.log(`MEETUP_REFRESH_TOKEN = ${tokens.refresh_token}`);
    console.log('\n(access_token expires in 1h — only the refresh_token is needed)');
  } catch (err) {
    console.error('Token exchange failed:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT);
