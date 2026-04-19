const { resolveCity } = require('../lib/cities');
const { inferCategories } = require('../lib/categories');

const TOKEN_URL = 'https://secure.meetup.com/oauth2/access';
const GQL_URL   = 'https://api.meetup.com/gql';

async function getAccessToken(clientId, clientSecret, refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error(`Meetup token refresh failed: HTTP ${res.status}`);
  const data = await res.json();
  if (!data.access_token) throw new Error(`Meetup token refresh: no access_token in response`);
  return data.access_token;
}

const SEARCH_QUERY = `
  query UpcomingTechEvents($cursor: String) {
    keywordSearch(
      input: { first: 50, after: $cursor }
      filter: { query: "technology software developer", source: EVENTS, status: UPCOMING }
    ) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          result {
            ... on Event {
              id
              title
              description
              dateTime
              endTime
              eventUrl
              going
              isOnline
              venue { name city country }
              group { name city country }
            }
          }
        }
      }
    }
  }
`;

async function gqlFetch(accessToken, cursor) {
  const res = await fetch(GQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { cursor: cursor || null },
    }),
  });
  if (!res.ok) throw new Error(`Meetup GQL: HTTP ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Meetup GQL errors: ${JSON.stringify(json.errors)}`);
  return json.data?.keywordSearch;
}

function normalize(raw) {
  const venue = raw.venue || raw.group || {};
  const locationStr = [venue.name, venue.city, venue.country].filter(Boolean).join(', ');
  const city = raw.isOnline
    ? { cityKey: 'online', cityName: 'Online', countryCode: null }
    : resolveCity(`${venue.city || ''}, ${venue.country || ''}`);

  const title = raw.title || '';
  const description = (raw.description || '').replace(/<[^>]+>/g, '').slice(0, 500);
  const startDate = raw.dateTime ? raw.dateTime.slice(0, 10) : '';
  const endDate   = raw.endTime  ? raw.endTime.slice(0, 10)  : startDate;

  return {
    sourceId: String(raw.id),
    title,
    description,
    startDate,
    endDate,
    location: locationStr,
    url: raw.eventUrl || '',
    tags: ['meetup'],
    vendor: raw.group?.name || '',
    eventType: raw.isOnline ? 'online' : 'in-person',
    cityKey:     city?.cityKey     || null,
    cityName:    city?.cityName    || null,
    countryCode: city?.countryCode || null,
    categories: inferCategories(title, description, ['meetup']),
  };
}

async function scrapeMeetup(clientId, clientSecret, refreshToken) {
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);
  const out = [];
  let cursor = null;
  let page = 0;
  while (true) {
    const result = await gqlFetch(accessToken, cursor);
    const edges  = result?.edges || [];
    for (const edge of edges) {
      const ev = edge?.node?.result;
      if (ev?.id) out.push(normalize(ev));
    }
    if (!result?.pageInfo?.hasNextPage || ++page >= 20) break;
    cursor = result.pageInfo.endCursor;
  }
  return out;
}

module.exports = { scrapeMeetup };
