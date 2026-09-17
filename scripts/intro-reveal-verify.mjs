import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const url = process.env.HERO_URL || "http://localhost:5173/";
const outDir = path.resolve("tmp-intro-reveal");
fs.mkdirSync(outDir, { recursive: true });

const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = edgePaths.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("Edge not found");
  process.exit(1);
}

function measure(page) {
  return page.evaluate(() => {
    const intro = document.querySelector(".yo-intro");
    const sentence = document.querySelector(".yo-intro__sentence");
    const logoY = document.querySelector("[data-yo-logo-y]");
    const logoDot = document.querySelector("[data-yo-logo-dot]");
    const chars = [...(sentence?.querySelectorAll(".char") || [])];
    const visibleChars = chars.filter((el) => {
      const cs = getComputedStyle(el);
      return cs.opacity !== "0" && cs.visibility !== "hidden";
    });
    const logo = logoY?.getBoundingClientRect();
    const introY = chars[0]?.getBoundingClientRect();
    const menu = document.querySelector("[data-yo-menu-trigger]");
    const hero = document.querySelector(".yo-hero__title");
    return {
      hasIntro: Boolean(intro) && intro.dataset.state !== "done",
      introDisplay: intro ? getComputedStyle(intro).display : "none",
      introOpacity: intro ? getComputedStyle(intro).opacity : "0",
      sentence: sentence?.textContent ?? "",
      charCount: chars.length,
      visibleCharCount: visibleChars.length,
      visibleText: visibleChars.map((el) => el.textContent).join(""),
      locked: document.documentElement.classList.contains("yo-intro-locked"),
      active: document.documentElement.classList.contains("yo-intro-active"),
      logoLive: document.documentElement.classList.contains("yo-intro-logo-live"),
      logoOpacity: logoY ? getComputedStyle(logoY).opacity : "0",
      logoVisible: logoY ? getComputedStyle(logoY.closest(".yo-logo-mark")).visibility : "hidden",
      logo: logo
        ? { x: Math.round(logo.left), y: Math.round(logo.top), w: Math.round(logo.width), h: Math.round(logo.height) }
        : null,
      introY: introY
        ? { x: Math.round(introY.left), y: Math.round(introY.top), w: Math.round(introY.width), h: Math.round(introY.height) }
        : null,
      menuOpacity: menu ? getComputedStyle(menu).opacity : "0",
      heroTitle: hero?.getAttribute("aria-label") ?? "",
      images: document.querySelectorAll(".yo-intro__img img").length,
    };
  });
}

async function runViewport(browser, { name, width, height, reduced = false }) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  if (reduced) {
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
  }
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  const times = reduced ? [80, 400, 1200] : [80, 600, 1400, 2400, 3600, 5000, 5800, 7200, 8600, 10000];
  const frames = [];
  for (const ms of times) {
    await new Promise((r) => setTimeout(r, ms - (frames.at(-1)?.ms || 0)));
    const shot = path.join(outDir, `${name}-t${ms}.png`);
    await page.screenshot({ path: shot });
    const data = await measure(page);
    frames.push({ ms, file: shot, ...data });
  }

  await page.close();
  return { name, width, height, reduced, errors, frames };
}

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader"],
});

const reports = [];
try {
  reports.push(await runViewport(browser, { name: "1440", width: 1440, height: 900 }));
  reports.push(await runViewport(browser, { name: "390", width: 390, height: 844 }));
  reports.push(
    await runViewport(browser, {
      name: "reduced",
      width: 1440,
      height: 900,
      reduced: true,
    }),
  );
} finally {
  await browser.close();
}

const out = path.join(outDir, "report.json");
fs.writeFileSync(out, JSON.stringify(reports, null, 2));
console.log(JSON.stringify(reports, null, 2));
console.log("saved", out);
