const CITIES = [
  // ── United States ────────────────────────────────────────────────────────
  { name: 'New York',       cityKey: 'new-york-us',       countryCode: 'US', aliases: ['new york city', 'nyc', 'manhattan', 'brooklyn'] },
  { name: 'Los Angeles',    cityKey: 'los-angeles-us',    countryCode: 'US', aliases: ['la', 'l.a.', 'los angeles, ca'] },
  { name: 'Chicago',        cityKey: 'chicago-us',        countryCode: 'US', aliases: [] },
  { name: 'Houston',        cityKey: 'houston-us',        countryCode: 'US', aliases: [] },
  { name: 'Phoenix',        cityKey: 'phoenix-us',        countryCode: 'US', aliases: [] },
  { name: 'Philadelphia',   cityKey: 'philadelphia-us',   countryCode: 'US', aliases: ['philly'] },
  { name: 'San Antonio',    cityKey: 'san-antonio-us',    countryCode: 'US', aliases: [] },
  { name: 'San Diego',      cityKey: 'san-diego-us',      countryCode: 'US', aliases: [] },
  { name: 'Dallas',         cityKey: 'dallas-us',         countryCode: 'US', aliases: ['dfw', 'dallas-fort worth'] },
  { name: 'San Jose',       cityKey: 'san-jose-us',       countryCode: 'US', aliases: [] },
  { name: 'Austin',         cityKey: 'austin-us',         countryCode: 'US', aliases: [] },
  { name: 'Fort Worth',     cityKey: 'fort-worth-us',     countryCode: 'US', aliases: [] },
  { name: 'Jacksonville',   cityKey: 'jacksonville-us',   countryCode: 'US', aliases: [] },
  { name: 'Columbus',       cityKey: 'columbus-us',       countryCode: 'US', aliases: [] },
  { name: 'Charlotte',      cityKey: 'charlotte-us',      countryCode: 'US', aliases: [] },
  { name: 'Indianapolis',   cityKey: 'indianapolis-us',   countryCode: 'US', aliases: ['indy'] },
  { name: 'San Francisco',  cityKey: 'san-francisco-us',  countryCode: 'US', aliases: ['sf', 's.f.', 'bay area', 'silicon valley'] },
  { name: 'Seattle',        cityKey: 'seattle-us',        countryCode: 'US', aliases: [] },
  { name: 'Denver',         cityKey: 'denver-us',         countryCode: 'US', aliases: [] },
  { name: 'Nashville',      cityKey: 'nashville-us',      countryCode: 'US', aliases: [] },
  { name: 'Washington',     cityKey: 'washington-us',     countryCode: 'US', aliases: ['washington dc', 'washington d.c.', 'dc', 'd.c.', 'district of columbia'] },
  { name: 'Las Vegas',      cityKey: 'las-vegas-us',      countryCode: 'US', aliases: ['vegas'] },
  { name: 'Louisville',     cityKey: 'louisville-us',     countryCode: 'US', aliases: [] },
  { name: 'Memphis',        cityKey: 'memphis-us',        countryCode: 'US', aliases: [] },
  { name: 'Portland',       cityKey: 'portland-us',       countryCode: 'US', aliases: ['portland, or', 'portland, oregon'] },
  { name: 'Baltimore',      cityKey: 'baltimore-us',      countryCode: 'US', aliases: [] },
  { name: 'Milwaukee',      cityKey: 'milwaukee-us',      countryCode: 'US', aliases: [] },
  { name: 'Oklahoma City',  cityKey: 'oklahoma-city-us',  countryCode: 'US', aliases: ['okc'] },
  { name: 'Albuquerque',    cityKey: 'albuquerque-us',    countryCode: 'US', aliases: [] },
  { name: 'Tucson',         cityKey: 'tucson-us',         countryCode: 'US', aliases: [] },
  { name: 'Sacramento',     cityKey: 'sacramento-us',     countryCode: 'US', aliases: [] },
  { name: 'Atlanta',        cityKey: 'atlanta-us',        countryCode: 'US', aliases: [] },
  { name: 'Kansas City',    cityKey: 'kansas-city-us',    countryCode: 'US', aliases: [] },
  { name: 'Minneapolis',    cityKey: 'minneapolis-us',    countryCode: 'US', aliases: ['twin cities'] },
  { name: 'Miami',          cityKey: 'miami-us',          countryCode: 'US', aliases: [] },
  { name: 'Boston',         cityKey: 'boston-us',         countryCode: 'US', aliases: ['cambridge, ma'] },
  { name: 'Tampa',          cityKey: 'tampa-us',          countryCode: 'US', aliases: [] },
  { name: 'New Orleans',    cityKey: 'new-orleans-us',    countryCode: 'US', aliases: ['nola'] },
  { name: 'Raleigh',        cityKey: 'raleigh-us',        countryCode: 'US', aliases: ['research triangle'] },

  // ── World ─────────────────────────────────────────────────────────────────
  // Europe
  { name: 'London',         cityKey: 'london-gb',         countryCode: 'GB', aliases: [] },
  { name: 'Paris',          cityKey: 'paris-fr',          countryCode: 'FR', aliases: [] },
  { name: 'Berlin',         cityKey: 'berlin-de',         countryCode: 'DE', aliases: [] },
  { name: 'Amsterdam',      cityKey: 'amsterdam-nl',      countryCode: 'NL', aliases: [] },
  { name: 'Stockholm',      cityKey: 'stockholm-se',      countryCode: 'SE', aliases: [] },
  { name: 'Oslo',           cityKey: 'oslo-no',           countryCode: 'NO', aliases: [] },
  { name: 'Copenhagen',     cityKey: 'copenhagen-dk',     countryCode: 'DK', aliases: [] },
  { name: 'Helsinki',       cityKey: 'helsinki-fi',       countryCode: 'FI', aliases: [] },
  { name: 'Zurich',         cityKey: 'zurich-ch',         countryCode: 'CH', aliases: ['zürich'] },
  { name: 'Vienna',         cityKey: 'vienna-at',         countryCode: 'AT', aliases: ['wien'] },
  { name: 'Munich',         cityKey: 'munich-de',         countryCode: 'DE', aliases: ['münchen'] },
  { name: 'Frankfurt',      cityKey: 'frankfurt-de',      countryCode: 'DE', aliases: [] },
  { name: 'Hamburg',        cityKey: 'hamburg-de',        countryCode: 'DE', aliases: [] },
  { name: 'Dublin',         cityKey: 'dublin-ie',         countryCode: 'IE', aliases: [] },
  { name: 'Brussels',       cityKey: 'brussels-be',       countryCode: 'BE', aliases: ['bruxelles'] },
  { name: 'Warsaw',         cityKey: 'warsaw-pl',         countryCode: 'PL', aliases: ['warszawa'] },
  { name: 'Prague',         cityKey: 'prague-cz',         countryCode: 'CZ', aliases: ['praha'] },
  { name: 'Budapest',       cityKey: 'budapest-hu',       countryCode: 'HU', aliases: [] },
  { name: 'Bucharest',      cityKey: 'bucharest-ro',      countryCode: 'RO', aliases: [] },
  { name: 'Lisbon',         cityKey: 'lisbon-pt',         countryCode: 'PT', aliases: ['lisboa'] },
  { name: 'Madrid',         cityKey: 'madrid-es',         countryCode: 'ES', aliases: [] },
  { name: 'Barcelona',      cityKey: 'barcelona-es',      countryCode: 'ES', aliases: [] },
  { name: 'Rome',           cityKey: 'rome-it',           countryCode: 'IT', aliases: ['roma'] },
  { name: 'Milan',          cityKey: 'milan-it',          countryCode: 'IT', aliases: ['milano'] },
  { name: 'Athens',         cityKey: 'athens-gr',         countryCode: 'GR', aliases: [] },
  { name: 'Istanbul',       cityKey: 'istanbul-tr',       countryCode: 'TR', aliases: [] },
  { name: 'Kyiv',           cityKey: 'kyiv-ua',           countryCode: 'UA', aliases: ['kiev'] },
  { name: 'Moscow',         cityKey: 'moscow-ru',         countryCode: 'RU', aliases: [] },

  // Middle East / Africa
  { name: 'Tel Aviv',       cityKey: 'tel-aviv-il',       countryCode: 'IL', aliases: ['tel aviv-yafo'] },
  { name: 'Dubai',          cityKey: 'dubai-ae',          countryCode: 'AE', aliases: [] },
  { name: 'Abu Dhabi',      cityKey: 'abu-dhabi-ae',      countryCode: 'AE', aliases: [] },
  { name: 'Riyadh',         cityKey: 'riyadh-sa',         countryCode: 'SA', aliases: [] },
  { name: 'Cairo',          cityKey: 'cairo-eg',          countryCode: 'EG', aliases: [] },
  { name: 'Lagos',          cityKey: 'lagos-ng',          countryCode: 'NG', aliases: [] },
  { name: 'Nairobi',        cityKey: 'nairobi-ke',        countryCode: 'KE', aliases: [] },
  { name: 'Johannesburg',   cityKey: 'johannesburg-za',   countryCode: 'ZA', aliases: ['joburg', 'jhb'] },
  { name: 'Cape Town',      cityKey: 'cape-town-za',      countryCode: 'ZA', aliases: [] },

  // Asia / Pacific
  { name: 'Singapore',      cityKey: 'singapore-sg',      countryCode: 'SG', aliases: [] },
  { name: 'Tokyo',          cityKey: 'tokyo-jp',          countryCode: 'JP', aliases: [] },
  { name: 'Osaka',          cityKey: 'osaka-jp',          countryCode: 'JP', aliases: [] },
  { name: 'Seoul',          cityKey: 'seoul-kr',          countryCode: 'KR', aliases: [] },
  { name: 'Beijing',        cityKey: 'beijing-cn',        countryCode: 'CN', aliases: [] },
  { name: 'Shanghai',       cityKey: 'shanghai-cn',       countryCode: 'CN', aliases: [] },
  { name: 'Shenzhen',       cityKey: 'shenzhen-cn',       countryCode: 'CN', aliases: [] },
  { name: 'Hong Kong',      cityKey: 'hong-kong-hk',      countryCode: 'HK', aliases: [] },
  { name: 'Bangalore',      cityKey: 'bangalore-in',      countryCode: 'IN', aliases: ['bengaluru'] },
  { name: 'Mumbai',         cityKey: 'mumbai-in',         countryCode: 'IN', aliases: ['bombay'] },
  { name: 'Delhi',          cityKey: 'delhi-in',          countryCode: 'IN', aliases: ['new delhi'] },
  { name: 'Hyderabad',      cityKey: 'hyderabad-in',      countryCode: 'IN', aliases: [] },
  { name: 'Chennai',        cityKey: 'chennai-in',        countryCode: 'IN', aliases: ['madras'] },
  { name: 'Kuala Lumpur',   cityKey: 'kuala-lumpur-my',   countryCode: 'MY', aliases: ['kl'] },
  { name: 'Bangkok',        cityKey: 'bangkok-th',        countryCode: 'TH', aliases: [] },
  { name: 'Jakarta',        cityKey: 'jakarta-id',        countryCode: 'ID', aliases: [] },
  { name: 'Manila',         cityKey: 'manila-ph',         countryCode: 'PH', aliases: [] },
  { name: 'Ho Chi Minh City', cityKey: 'ho-chi-minh-vn', countryCode: 'VN', aliases: ['saigon', 'hcmc'] },
  { name: 'Sydney',         cityKey: 'sydney-au',         countryCode: 'AU', aliases: [] },
  { name: 'Melbourne',      cityKey: 'melbourne-au',      countryCode: 'AU', aliases: [] },
  { name: 'Brisbane',       cityKey: 'brisbane-au',       countryCode: 'AU', aliases: [] },
  { name: 'Auckland',       cityKey: 'auckland-nz',       countryCode: 'NZ', aliases: [] },

  // Americas (non-US)
  { name: 'Toronto',        cityKey: 'toronto-ca',        countryCode: 'CA', aliases: [] },
  { name: 'Montreal',       cityKey: 'montreal-ca',       countryCode: 'CA', aliases: ['montréal'] },
  { name: 'Vancouver',      cityKey: 'vancouver-ca',      countryCode: 'CA', aliases: [] },
  { name: 'Calgary',        cityKey: 'calgary-ca',        countryCode: 'CA', aliases: [] },
  { name: 'São Paulo',      cityKey: 'sao-paulo-br',      countryCode: 'BR', aliases: ['sao paulo'] },
  { name: 'Rio de Janeiro', cityKey: 'rio-de-janeiro-br', countryCode: 'BR', aliases: ['rio'] },
  { name: 'Buenos Aires',   cityKey: 'buenos-aires-ar',   countryCode: 'AR', aliases: [] },
  { name: 'Santiago',       cityKey: 'santiago-cl',       countryCode: 'CL', aliases: [] },
  { name: 'Bogotá',         cityKey: 'bogota-co',         countryCode: 'CO', aliases: ['bogota'] },
  { name: 'Lima',           cityKey: 'lima-pe',           countryCode: 'PE', aliases: [] },
  { name: 'Mexico City',    cityKey: 'mexico-city-mx',    countryCode: 'MX', aliases: ['cdmx', 'ciudad de mexico'] },
  { name: 'Guadalajara',    cityKey: 'guadalajara-mx',    countryCode: 'MX', aliases: [] },
  { name: 'Monterrey',      cityKey: 'monterrey-mx',      countryCode: 'MX', aliases: [] },
];

// Build lowercase lookup map at module load time.
const _lookup = new Map();
for (const city of CITIES) {
  _lookup.set(city.name.toLowerCase(), city);
  for (const alias of (city.aliases || [])) {
    _lookup.set(alias.toLowerCase(), city);
  }
}

function _normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function resolveCity(locationStr) {
  if (!locationStr) return null;
  const s = _normalize(locationStr);

  if (/\b(online|virtual|remote|hybrid|worldwide|global)\b/.test(s)) {
    return { cityKey: 'online', cityName: 'Online', countryCode: null };
  }

  // Exact alias match first.
  for (const [key, city] of _lookup) {
    if (s === key) return city;
  }

  // Substring match — longest alias wins to avoid "new york" vs "york".
  let best = null;
  let bestLen = 0;
  for (const [key, city] of _lookup) {
    if (key.length > bestLen && s.includes(key)) {
      best = city;
      bestLen = key.length;
    }
  }
  return best;
}

module.exports = { CITIES, resolveCity };
