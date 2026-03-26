const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
    page.on('requestfailed', request =>
      console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
    );
    await page.goto('http://localhost:4173/sign/test', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
  } catch (err) {
    console.log("Error running puppeteer:", err);
  }
})();