// Cybersecurity vendor event configs.
// Each entry is scraped by the generic vendor-scraper engine.
// selectors: optional overrides — engine falls back to generic selectors if omitted.

module.exports = [

  // ── EDR / XDR ─────────────────────────────────────────────────────────────
  {
    id: 'crowdstrike',
    vendor: 'CrowdStrike',
    url: 'https://www.crowdstrike.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['crowdstrike', 'edr', 'xdr'],
  },
  {
    id: 'sentinelone',
    vendor: 'SentinelOne',
    url: 'https://www.sentinelone.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['sentinelone', 'edr'],
  },
  {
    id: 'trellix',
    vendor: 'Trellix',
    url: 'https://www.trellix.com/about/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['trellix', 'mcafee', 'edr'],
  },
  {
    id: 'sophos',
    vendor: 'Sophos',
    url: 'https://www.sophos.com/en-us/events',
    defaultCategories: ['Cybersecurity'],
    tags: ['sophos'],
  },
  {
    id: 'trendmicro',
    vendor: 'Trend Micro',
    url: 'https://www.trendmicro.com/en_us/events.html',
    defaultCategories: ['Cybersecurity'],
    tags: ['trend micro'],
  },

  // ── SIEM / SOAR ────────────────────────────────────────────────────────────
  {
    id: 'exabeam',
    vendor: 'Exabeam',
    url: 'https://www.exabeam.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['exabeam', 'siem'],
  },
  {
    id: 'securonix',
    vendor: 'Securonix',
    url: 'https://www.securonix.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['securonix', 'siem'],
  },
  {
    id: 'logrhythm',
    vendor: 'LogRhythm',
    url: 'https://logrhythm.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['logrhythm', 'siem'],
  },
  {
    id: 'sumo-logic',
    vendor: 'Sumo Logic',
    url: 'https://www.sumologic.com/events/',
    defaultCategories: ['Cybersecurity', 'Cloud'],
    tags: ['sumo logic', 'siem'],
  },
  {
    id: 'rapid7',
    vendor: 'Rapid7',
    url: 'https://www.rapid7.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['rapid7'],
  },

  // ── Network Security ───────────────────────────────────────────────────────
  {
    id: 'paloalto',
    vendor: 'Palo Alto Networks',
    url: 'https://www.paloaltonetworks.com/events',
    defaultCategories: ['Cybersecurity', 'Cloud'],
    tags: ['palo alto', 'ngfw'],
  },
  {
    id: 'fortinet',
    vendor: 'Fortinet',
    url: 'https://www.fortinet.com/events',
    defaultCategories: ['Cybersecurity'],
    tags: ['fortinet', 'ngfw'],
  },
  {
    id: 'checkpoint',
    vendor: 'Check Point',
    url: 'https://www.checkpoint.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['check point', 'ngfw'],
  },
  {
    id: 'zscaler',
    vendor: 'Zscaler',
    url: 'https://www.zscaler.com/events',
    defaultCategories: ['Cybersecurity', 'Cloud'],
    tags: ['zscaler', 'sase', 'zero trust'],
  },

  // ── IAM / PAM ──────────────────────────────────────────────────────────────
  {
    id: 'okta',
    vendor: 'Okta',
    url: 'https://www.okta.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['okta', 'iam', 'identity'],
  },
  {
    id: 'cyberark',
    vendor: 'CyberArk',
    url: 'https://www.cyberark.com/impact/',
    defaultCategories: ['Cybersecurity'],
    tags: ['cyberark', 'pam', 'identity'],
  },
  {
    id: 'sailpoint',
    vendor: 'SailPoint',
    url: 'https://www.sailpoint.com/navigate/',
    defaultCategories: ['Cybersecurity'],
    tags: ['sailpoint', 'iam', 'identity governance'],
  },
  {
    id: 'beyondtrust',
    vendor: 'BeyondTrust',
    url: 'https://www.beyondtrust.com/events',
    defaultCategories: ['Cybersecurity'],
    tags: ['beyondtrust', 'pam'],
  },

  // ── Vulnerability Management ───────────────────────────────────────────────
  {
    id: 'tenable',
    vendor: 'Tenable',
    url: 'https://www.tenable.com/events',
    defaultCategories: ['Cybersecurity'],
    tags: ['tenable', 'nessus', 'vulnerability management'],
  },
  {
    id: 'qualys',
    vendor: 'Qualys',
    url: 'https://www.qualys.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['qualys', 'vulnerability management'],
  },

  // ── Email / Phishing ───────────────────────────────────────────────────────
  {
    id: 'proofpoint',
    vendor: 'Proofpoint',
    url: 'https://www.proofpoint.com/us/events',
    defaultCategories: ['Cybersecurity'],
    tags: ['proofpoint', 'email security'],
  },
  {
    id: 'mimecast',
    vendor: 'Mimecast',
    url: 'https://www.mimecast.com/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['mimecast', 'email security'],
  },
  {
    id: 'knowbe4',
    vendor: 'KnowBe4',
    url: 'https://www.knowbe4.com/events',
    defaultCategories: ['Cybersecurity'],
    tags: ['knowbe4', 'security awareness'],
  },

  // ── Threat Intelligence ────────────────────────────────────────────────────
  {
    id: 'recordedfuture',
    vendor: 'Recorded Future',
    url: 'https://www.recordedfuture.com/events',
    defaultCategories: ['Cybersecurity'],
    tags: ['recorded future', 'threat intelligence'],
  },
  {
    id: 'mandiant',
    vendor: 'Mandiant',
    url: 'https://mwise.mandiant.com/',
    defaultCategories: ['Cybersecurity'],
    tags: ['mandiant', 'threat intelligence'],
  },

  // ── Conferences ───────────────────────────────────────────────────────────
  {
    id: 'sans',
    vendor: 'SANS Institute',
    url: 'https://www.sans.org/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['sans', 'training'],
    selectors: {
      cards: '.event-listing, article, .course-event',
      title: 'h3, h4, .event-name',
      date:  'time, .event-date, [class*="date"]',
      location: '.event-location, [class*="location"]',
    },
  },
  {
    id: 'mitre-attack',
    vendor: 'MITRE',
    url: 'https://attack.mitre.org/resources/attackcon/',
    defaultCategories: ['Cybersecurity'],
    tags: ['mitre', 'att&ck', 'threat intelligence'],
  },
  {
    id: 'hackerone',
    vendor: 'HackerOne',
    url: 'https://www.hackerone.com/events',
    defaultCategories: ['Cybersecurity'],
    tags: ['hackerone', 'bug bounty'],
  },
  {
    id: 'first',
    vendor: 'FIRST',
    url: 'https://www.first.org/events/',
    defaultCategories: ['Cybersecurity'],
    tags: ['first', 'incident response'],
  },
  {
    id: 'identiverse',
    vendor: 'Identiverse',
    url: 'https://identiverse.com/',
    defaultCategories: ['Cybersecurity'],
    tags: ['identiverse', 'identity', 'iam'],
  },
];
