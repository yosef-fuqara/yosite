import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';

const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader'],
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 568]]) {
    const page = await browser.newPage();
    await page.setViewport({ width, height });
    await page.evaluateOnNewDocument(() => {
      window.heroSamples = [];
      const sample = () => {
        const hero = document.querySelector('.yo-hero');
        const intro = document.querySelector('.yo-intro');
        if (hero) window.heroSamples.push({ entrance: hero.dataset.entrance, intro: intro?.dataset.state });
        if (hero?.dataset.entrance !== 'done') requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto(process.env.HERO_URL || 'http://127.0.0.1:5174/', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.yo-hero[data-entrance="done"]', { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const early = await page.evaluate(() => window.heroSamples.some(s => s.entrance === 'playing' && s.intro !== 'done'));
    assert.equal(early, false, 'Hero must wait for intro completion');
    assert.ok(await page.evaluate(() => window.heroSamples.some(s => s.entrance === 'pending')));
    assert.ok(await page.evaluate(() => window.heroSamples.some(s => s.entrance === 'playing')));
    const read = () => page.evaluate(() => ({
      exit: document.querySelector('.hero-about-zone').style.getPropertyValue('--hero-exit-t'),
      chars: [...document.querySelectorAll('[data-hero-exit]')].map(el => ({ transform: getComputedStyle(el).transform, opacity: getComputedStyle(el).opacity })),
      clipped: [...document.querySelectorAll('.yo-hero__char-clip')].some(el => getComputedStyle(el).overflow !== 'visible'),
      overflow: document.documentElement.scrollWidth > innerWidth,
      reveal: [...document.querySelectorAll('.yo-hero__line-reveal')].map(el => el.style.transform),
    }));
    const baseline = await read();
    assert.equal(baseline.clipped, false);
    assert.equal(baseline.overflow, false);
    assert.ok(baseline.reveal.every(value => !value));
    for (let cycle = 0; cycle < 4; cycle++) {
      for (const y of [height * 0.7, height * 1.4, height * 0.3, 0]) {
        await page.evaluate(y => scrollTo(0, y), y);
        await pause(cycle % 2 ? 35 : 200);
        if (cycle === 0 && y === height * 0.7) {
          assert.notDeepEqual((await read()).chars, baseline.chars, 'Scroll exit must actually animate');
        }
      }
      await pause(200);
      assert.deepEqual((await read()).chars, baseline.chars, 'Every letter must return to its original pose');
      assert.equal((await read()).exit, '0');
    }
    await page.setViewport({ width: width + 50, height: height - 100 });
    await pause(300);
    await page.evaluate(() => scrollTo(0, 1000));
    await pause(100);
    await page.evaluate(() => scrollTo(0, 0));
    await pause(300);
    assert.equal((await read()).exit, '0');
    assert.equal((await read()).overflow, false);
    await page.screenshot({ path: `tmp-hero-text-${width}.png` });
    console.log(`PASS ${width}x${height}: intro ordering, clipping, four scroll cycles, fast scroll, resize`);
    await page.close();
  }
} finally {
  await browser.close();
}
