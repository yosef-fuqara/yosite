import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const url = process.env.HERO_URL || "http://localhost:5173/";
const outDir = path.resolve("tmp-process");
fs.mkdirSync(outDir, { recursive: true });

const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = edgePaths.find((p) => fs.existsSync(p));
if (!executablePath) {
  console.error("Edge not found");
  process.exit(1);
}

async function skipIntro(page) {
  await page
    .waitForFunction(() => !document.documentElement.classList.contains("yo-intro-locked"), {
      timeout: 20000,
    })
    .catch(() => {});
  await page.evaluate(() => {
    document.documentElement.classList.remove("yo-intro-locked", "yo-built-shared");
    const overlay = document.querySelector(".yo-cinematic-intro");
    if (overlay) overlay.style.cssText = "display:none!important;pointer-events:none;";
  });
  await page.waitForSelector("#services", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 400));
}

async function scrollTo(page, y) {
  await page.evaluate((top) => {
    const lenis = window.lenis;
    if (lenis?.scrollTo) lenis.scrollTo(top, { immediate: true });
    else window.scrollTo(0, top);
  }, y);
  await new Promise((r) => setTimeout(r, 280));
}

async function measure(page) {
  return page.evaluate(() => {
    const section = document.getElementById("services");
    const viewport = section?.querySelector(".services-viewport");
    const how = viewport?.querySelector("[data-process='how']");
    const exit = viewport?.querySelector("[data-process='exit']");
    const frame = viewport?.querySelector("[data-process='frame']");
    const imgs = [...(viewport?.querySelectorAll("[data-process-img]") || [])];
    const copies = [...(viewport?.querySelectorAll("[data-process-copy]") || [])];
    const view = viewport?.getBoundingClientRect();
    const howR = how?.getBoundingClientRect();
    const exitR = exit?.getBoundingClientRect();
    const frameR = frame?.getBoundingClientRect();
    const howCs = how ? getComputedStyle(how) : null;
    const frameCs = frame ? getComputedStyle(frame) : null;
    const visibleImg = imgs.findIndex((img) => Number(getComputedStyle(img).opacity) > 0.5);
    const visibleCopy = copies.findIndex((el) => Number(getComputedStyle(el).opacity) > 0.5);
    return {
      scrollY: Math.round(window.scrollY),
      sectionH: section ? Math.round(section.getBoundingClientRect().height) : null,
      viewH: view ? Math.round(view.height) : null,
      howTop: howR ? Math.round(howR.top) : null,
      howH: howR ? Math.round(howR.height) : null,
      howScale: howCs ? howCs.transform : null,
      howX: howR ? Math.round(howR.left + howR.width / 2) : null,
      exitTop: exitR ? Math.round(exitR.top) : null,
      exitBottom: exitR ? Math.round(exitR.bottom) : null,
      frameTop: frameR ? Math.round(frameR.top) : null,
      frameW: frameR ? Math.round(frameR.width) : null,
      frameH: frameR ? Math.round(frameR.height) : null,
      frameOpacity: frameCs ? Number(frameCs.opacity) : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      visibleImg,
      visibleCopy,
      copyText: visibleCopy >= 0 ? copies[visibleCopy].innerText.replace(/\s+/g, " ").trim() : "",
    };
  });
}

const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--no-sandbox"],
});

const report = {};

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0", timeout: 60000 });
  await skipIntro(page);
  const range = await page.evaluate(() => {
    const section = document.getElementById("services");
    const top = section.offsetTop;
    const h = section.offsetHeight;
    return { top, h, max: top + h - window.innerHeight };
  });
  const samples = [0.52, 0.62, 0.7, 0.78, 0.86, 0.94, 1].map((p) => ({
    p,
    y: Math.round(range.top + (range.max - range.top) * p),
  }));
  report[vp.name] = [];
  for (const sample of samples) {
    await scrollTo(page, sample.y);
    const shot = path.join(outDir, `${vp.name}-p${String(sample.p).replace(".", "")}.png`);
    await page.screenshot({ path: shot, fullPage: false });
    const data = await measure(page);
    report[vp.name].push({ p: sample.p, y: sample.y, ...data });
  }
  await page.close();
}

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
