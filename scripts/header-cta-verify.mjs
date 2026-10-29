import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader'],
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const selector = '.yo-nav__contact-link';
const url = process.env.HERO_URL || 'http://127.0.0.1:5181/#hero';

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.waitForSelector('.yo-hero[data-entrance="done"]');
  await page.evaluate(() => document.fonts.ready);
  const button = await page.$(selector);
  const bounds = await button.boundingBox();
  const clip = { x: Math.floor(bounds.x - 28), y: 0, width: Math.ceil(1440 - bounds.x + 28), height: 100 };
  await page.screenshot({ path: 'tmp-header-cta-rest.png', clip });
  assert.ok(await page.$$eval('.yo-nav__contact-char', chars => chars.every(el => getComputedStyle(el).display === 'inline-block')),
    'Inline spans can expose transform matrices without actually painting movement');

  let previous = '';
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.mouse.move(400, 180);
    await page.evaluate(() => {
      const button = document.querySelector('.yo-nav__contact-link');
      const label = button.querySelector('.yo-nav__contact-label');
      const letters = [...button.querySelectorAll('[data-drop-letter]')];
      const original = letters.map(el => el.getBoundingClientRect().toJSON());
      const originalButton = button.getBoundingClientRect().toJSON();
      const originalLabel = label.getBoundingClientRect().toJSON();
      window.ctaMotionCheck = new Promise(resolve => {
        const start = performance.now();
        const chosen = new Set();
        let peakDrop = 0, peakRotation = 0, fixed = true, seen = false;
        const sample = now => {
          let active = false;
          letters.forEach((el, i) => {
            if (el.getAnimations().length) { active = true; seen = true; chosen.add(i); }
            // Geometry, not just the CSS matrix: catches non-transformable spans.
            peakDrop = Math.max(peakDrop, el.getBoundingClientRect().top - original[i].top);
            const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
            peakRotation = Math.max(peakRotation, Math.abs(Math.atan2(matrix.b, matrix.a) * 180 / Math.PI));
          });
          for (const [el, base] of [[button, originalButton], [label, originalLabel]]) {
            const rect = el.getBoundingClientRect();
            fixed &&= ['x', 'y', 'width', 'height'].every(key => Math.abs(rect[key] - base[key]) < .01);
          }
          if ((seen && !active) || now - start > 1800) {
            resolve({ chosen: [...chosen].sort((a,b) => a-b), peakDrop, peakRotation, fixed,
              restored: letters.every((el, i) => {
                const rect = el.getBoundingClientRect();
                const matrix = new DOMMatrixReadOnly(getComputedStyle(el).transform);
                return matrix.isIdentity && getComputedStyle(el).opacity === '1' &&
                  ['x','y','width','height'].every(key => rect[key] === original[i][key]);
              }) });
            return;
          }
          requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      });
    });
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    if (cycle === 0) {
      await pause(240);
      await page.screenshot({ path: 'tmp-header-cta-drop.png', clip });
      // Leaving partway through must not strand a letter.
      await page.mouse.move(400, 180);
    }
    const result = await page.evaluate(() => window.ctaMotionCheck);
    assert.ok(result.chosen.length >= 2 && result.chosen.length <= 4);
    assert.ok(result.peakDrop >= 8 && result.peakDrop <= 15, JSON.stringify(result));
    assert.ok(result.peakRotation >= 1.5 && result.peakRotation <= 5.1);
    assert.ok(result.fixed, 'CTA and sentence must stay fixed');
    assert.ok(result.restored, 'Every character must recover exact original bounds and opacity');
    const signature = result.chosen.join(',');
    assert.notEqual(signature, previous, 'The next hover selects a different set');
    previous = signature;
    console.log(`PASS hover ${cycle + 1}: ${JSON.stringify(result)}`);
  }

  await page.mouse.move(400, 180);
  await page.focus('.yo-menu-trigger');
  await page.keyboard.press('Tab');
  assert.equal(await page.$eval(selector, el => el === document.activeElement), true);
  assert.ok(await button.evaluate(el => el.querySelectorAll('[data-drop-letter]').length && el.getAnimations({ subtree: true }).length >= 2));
  await pause(1100);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  assert.equal(await button.evaluate(el => [...el.querySelectorAll('[data-drop-letter]')].flatMap(letter => letter.getAnimations()).length), 0);
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

  await button.click();
  await page.waitForFunction(() => scrollY > 1000 && Math.abs(document.querySelector('#cta .cta-contact__main').getBoundingClientRect().top) < 100,
    { timeout: 20000 });
  const contact = await page.evaluate(() => ({ scrollY, top: document.querySelector('#cta .cta-contact__main').getBoundingClientRect().top,
    blend: getComputedStyle(document.querySelector('.yo-sticky-chrome')).mixBlendMode }));
  assert.equal(contact.blend, 'normal');
  await page.screenshot({ path: 'tmp-header-cta-contact.png' });
  console.log('PASS keyboard, reduced motion, click-to-contact and constant header color', contact);

  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto(url, { waitUntil: 'networkidle2' });
  await page.reload({ waitUntil: 'networkidle2' });
  await page.waitForSelector('.yo-hero[data-entrance="done"]');
  const mobileButton = await page.$(selector);
  const mobileBounds = await mobileButton.boundingBox();
  assert.ok(mobileBounds.x >= 0 && mobileBounds.x + mobileBounds.width <= 391);
  assert.equal(await page.evaluate(() => matchMedia('(any-hover: hover) and (any-pointer: fine)').matches), false);
  await mobileButton.focus();
  assert.equal(await mobileButton.evaluate(el => [...el.querySelectorAll('[data-drop-letter]')].flatMap(letter => letter.getAnimations()).length), 0);
  assert.deepEqual(errors, []);
  console.log('PASS mobile layout, touch-only static fallback and no browser errors');
} finally {
  await browser.close();
}
