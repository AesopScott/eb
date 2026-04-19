const KEYWORD_MAP = {
  AI: [
    'artificial intelligence', 'machine learning', 'deep learning',
    'large language model', 'llm', 'generative ai', 'genai',
    'neural network', 'natural language processing', 'nlp',
    'pytorch', 'tensorflow', 'hugging face', 'langchain', 'rag',
    'computer vision', 'mlops', 'ai ops', 'data science',
  ],
  Cybersecurity: [
    'cybersecurity', 'cyber security', 'information security', 'infosec',
    'appsec', 'application security', 'devsecops', 'zero trust',
    'penetration testing', 'pentest', 'red team', 'blue team',
    'threat intelligence', 'malware', 'ransomware', 'soc analyst',
    'owasp', 'ctf', 'capture the flag', 'bug bounty',
    'def con', 'defcon', 'black hat', 'rsa conference',
  ],
  Developer: [
    'software engineering', 'software development', 'open source',
    'javascript', 'typescript', 'python', 'ruby', 'golang', 'go lang',
    'rust', 'php', 'scala', 'elixir', 'java ', 'kotlin', 'swift',
    'react', 'vue', 'angular', 'node.js', 'nodejs',
    'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full stack',
    'web development', 'mobile development', 'ios dev', 'android dev',
    'api design', 'graphql', 'rest api', 'microservices',
    'github', 'git', 'agile', 'scrum',
  ],
  'IT / Ops': [
    'information technology', 'it infrastructure', 'it service',
    'sysadmin', 'system administration', 'networking', 'network engineering',
    'itsm', 'itil', 'help desk', 'service desk', 'end user',
    'active directory', 'windows server', 'virtualization', 'vmware',
    'storage', 'backup', 'disaster recovery',
  ],
  Cloud: [
    'cloud computing', 'cloud native', 'cloud infrastructure',
    'amazon web services', 'aws', 'microsoft azure', 'google cloud', 'gcp',
    'kubernetes', 'k8s', 'docker', 'containers', 'helm',
    'devops', 'dev ops', 'platform engineering', 'site reliability',
    'sre', 'terraform', 'infrastructure as code', 'iac',
    'serverless', 'service mesh', 'observability',
  ],
  Data: [
    'data engineering', 'data analytics', 'data warehouse',
    'business intelligence', 'big data', 'real-time data',
    'apache spark', 'apache kafka', 'kafka', 'flink',
    'snowflake', 'databricks', 'dbt', 'airflow',
    'sql', 'nosql', 'postgresql', 'mongodb', 'redis',
    'etl', 'elt', 'data pipeline', 'data lakehouse',
    'tableau', 'power bi', 'looker',
  ],
};

const ORDERED_CATS = Object.keys(KEYWORD_MAP);

function inferCategories(title = '', description = '', tags = []) {
  const text = [title, description, ...tags].join(' ').toLowerCase();
  const matched = [];
  for (const cat of ORDERED_CATS) {
    for (const kw of KEYWORD_MAP[cat]) {
      if (text.includes(kw)) {
        matched.push(cat);
        break;
      }
    }
  }
  // Fallback: single-word "ai" only when no other category matched to avoid noise.
  if (!matched.includes('AI') && /\bai\b/.test(text)) matched.push('AI');
  return matched.length > 0 ? matched : ['General'];
}

module.exports = { inferCategories, ORDERED_CATS };
