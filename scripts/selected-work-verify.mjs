import fs from "node:fs";
import puppeteer from "puppeteer-core";

const browserPaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = browserPaths.find((candidate) => fs.existsSync(candidate));

if (!executablePath) throw new Error("Chrome or Microsoft Edge was not found");

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader"],
});

async function verify(viewport) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto("http://localhost:5173/#selected-work", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });
  await page.waitForSelector("#selected-work-heading");
  await page.evaluate(() => {
    document.querySelector("#selected-work")?.scrollIntoView({ block: "start" });
  });
  await new Promise((resolve) => setTimeout(resolve, 260));

  const entering = await page.evaluate(() => {
    const letters = [...document.querySelectorAll(".selected-work__char:not(.is-space)")];
    const opacity = letters.map((letter) =>
      Number.parseFloat(getComputedStyle(letter.firstElementChild).opacity),
    );
    return {
      hidden: opacity.filter((value) => value < 0.05).length,
      visible: opacity.filter((value) => value > 0.95).length,
      partial: opacity.filter((value) => value >= 0.05 && value <= 0.95).length,
    };
  });

  await new Promise((resolve) => setTimeout(resolve, 1900));
  const settled = await page.evaluate(() => {
    const heading = document.querySelector("#selected-work-heading");
    const panel = heading.closest(".selected-work__panel--intro");
    const panelRect = panel.getBoundingClientRect();
    const lines = [...heading.querySelectorAll(".selected-work__heading-line")];
    const letters = [...heading.querySelectorAll(".selected-work__char:not(.is-space)")];
    const colors = new Set(letters.map((letter) => getComputedStyle(letter).color));
    const clipped = letters.filter((letter) => {
      const glyph = letter.querySelector(".selected-work__glyph");
      const rect = glyph.getBoundingClientRect();
      return rect.width <= 0 || rect.height <= 0 || getComputedStyle(letter).overflow !== "visible";
    });
    return {
      settled: document.querySelector("#selected-work").classList.contains("is-settled"),
      visible: letters.every(
        (letter) => Number.parseFloat(getComputedStyle(letter.firstElementChild).opacity) > 0.99,
      ),
      colors: [...colors],
      clipped: clipped.length,
      linesInsidePanel: lines.every((line) => {
        const rect = line.getBoundingClientRect();
        return rect.left >= panelRect.left - 1 && rect.right <= panelRect.right + 1;
      }),
      gradientApplied: letters.every((letter) =>
        getComputedStyle(letter.querySelector(".selected-work__glyph"))
          .backgroundImage.startsWith("linear-gradient"),
      ),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      lines: lines.map((line) => line.textContent),
    };
  });

  const screenshot = `${process.env.TEMP}\\selected-work-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: screenshot });

  await page.setViewport(
    viewport.width > 800
      ? { width: 1024, height: 720, deviceScaleFactor: 1 }
      : { width: 844, height: 390, deviceScaleFactor: 1 },
  );
  await new Promise((resolve) => setTimeout(resolve, 180));
  const resized = await page.evaluate(() => ({
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    allVisible: [...document.querySelectorAll(".selected-work__char-motion")].every(
      (letter) => Number.parseFloat(getComputedStyle(letter).opacity) > 0.99,
    ),
  }));

  await page.evaluate(() => window.scrollBy(0, window.innerHeight * 2));
  await new Promise((resolve) => setTimeout(resolve, 120));
  await page.evaluate(() => document.querySelector("#selected-work")?.scrollIntoView());
  await new Promise((resolve) => setTimeout(resolve, 120));
  const returnState = await page.evaluate(() => ({
    settled: document.querySelector("#selected-work").classList.contains("is-settled"),
    allVisible: [...document.querySelectorAll(".selected-work__char-motion")].every(
      (letter) => Number.parseFloat(getComputedStyle(letter).opacity) > 0.99,
    ),
  }));

  await page.close();
  return { viewport, entering, settled, resized, returnState, screenshot };
}

async function verifyInitialLoad() {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto("http://localhost:5173/", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector("#selected-work-heading");
  const state = await page.evaluate(() => ({
    settled: document.querySelector("#selected-work").classList.contains("is-settled"),
    allHidden: [...document.querySelectorAll(".selected-work__char:not(.is-space)")].every(
      (letter) =>
        Number.parseFloat(getComputedStyle(letter.firstElementChild).opacity) < 0.01,
    ),
  }));
  await page.close();
  return state;
}

const initialLoad = await verifyInitialLoad();
const results = [];
results.push(await verify({ width: 1440, height: 900, deviceScaleFactor: 1 }));
results.push(await verify({ width: 820, height: 1180, deviceScaleFactor: 1 }));
results.push(await verify({ width: 390, height: 844, deviceScaleFactor: 1 }));
await browser.close();

console.log(JSON.stringify({ initialLoad, results }, null, 2));

if (initialLoad.settled || !initialLoad.allHidden) process.exitCode = 1;

for (const result of results) {
  if (
    result.entering.hidden === 0 ||
    result.entering.partial === 0 ||
    !result.settled.settled ||
    !result.settled.visible ||
    result.settled.colors.length !== 1 ||
    result.settled.clipped !== 0 ||
    !result.settled.linesInsidePanel ||
    !result.settled.gradientApplied ||
    result.settled.horizontalOverflow ||
    result.resized.horizontalOverflow ||
    !result.resized.allVisible ||
    !result.returnState.settled ||
    !result.returnState.allVisible
  ) {
    process.exitCode = 1;
  }
}
