const puppeteer = require('puppeteer-core');
const chromium  = require('@sparticuz/chromium');

async function withBrowser(fn) {
  const browser = await puppeteer.launch({
    args:            chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath:  await chromium.executablePath(),
    headless:        true,
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function withPage(browser, fn) {
  const page = await browser.newPage();
  // Realistic user agent so sites don't block us.
  await page.setUserAgent(
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  );
  // Block images/fonts — faster loads, same content.
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image', 'font', 'media'].includes(req.resourceType())) req.abort();
    else req.continue();
  });
  try {
    return await fn(page);
  } finally {
    await page.close();
  }
}

module.exports = { withBrowser, withPage };
