import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const url = process.env.HERO_URL || "http://localhost:5173/";
const outDir = path.resolve("tmp-about-editorial");
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

const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1366", width: 1366, height: 768 },
  { name: "1024", width: 1024, height: 768 },
  { name: "390", width: 390, height: 844 },
  { name: "360", width: 360, height: 800 },
];

const progressShots = [0, 0.08, 0.2, 0.36, 0.52, 0.66, 0.78, 0.9, 1];

async function skipIntro(page) {
  await page
    .waitForFunction(
      () => !document.documentElement.classList.contains("yo-intro-locked"),
      { timeout: 20000 },
    )
    .catch(() => {});
  await page.evaluate(() => {
    document.documentElement.classList.remove("yo-intro-locked", "yo-built-shared");
    const overlay = document.querySelector(".yo-cinematic-intro");
    if (overlay) overlay.style.cssText = "display:none!important;pointer-events:none;";
  });
  await page.waitForSelector("#about", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 500));
}

async function scrollTo(page, y) {
  await page.evaluate((top) => {
    const lenis = window.lenis;
    if (lenis?.scrollTo) {
      lenis.scrollTo(top, { immediate: true });
    } else {
      window.scrollTo(0, top);
      document.documentElement.scrollTop = top;
    }
  }, y);
  await new Promise((r) => setTimeout(r, 420));
}

async function measure(page) {
  return page.evaluate(() => {
    const section = document.getElementById("about");
    const viewport = section?.querySelector(".about-viewport");
    const frames = [...(section?.querySelectorAll(".about-frame") || [])];
    const aside = document.querySelector(".yo-hero__aside");
    const asideLabel = document.querySelector(".yo-hero__aside-label");
    const nav = document.querySelector(".yo-sticky-chrome");
    const copy = section?.querySelector(".about-copy");
    const left = section?.querySelector(".about-headline__left");
    const right = section?.querySelector(".about-headline__right");
    const rect = section?.getBoundingClientRect();
    const view = viewport?.getBoundingClientRect();
    const asideRect = aside?.getBoundingClientRect();
    const asideCs = aside ? getComputedStyle(aside) : null;
    const frameHits = frames.map((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        opacity: Number(cs.opacity),
        y: Math.round(r.top),
        bottom: Math.round(r.bottom),
        x: Math.round(r.left),
        w: Math.round(r.width),
        h: Math.round(r.height),
        visible:
          r.bottom > 0 &&
          r.top < window.innerHeight &&
          Number(cs.opacity) > 0.12,
        overlapsAside: asideRect
          ? r.right > asideRect.left &&
            r.left < asideRect.right &&
            r.bottom > asideRect.top &&
            r.top < asideRect.bottom &&
            Number(cs.opacity) > 0.2
          : false,
      };
    });
    return {
      scrollY: Math.round(window.scrollY),
      sectionTop: rect ? Math.round(rect.top) : null,
      sectionH: rect ? Math.round(rect.height) : null,
      pinTop: view ? Math.round(view.top) : null,
      pinH: view ? Math.round(view.height) : null,
      overflowX:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      aside: asideLabel?.textContent?.trim() || null,
      asideOpacity: asideCs ? Number(asideCs.opacity) : null,
      asideRight: asideRect ? Math.round(asideRect.right) : null,
      asideZ: asideCs ? asideCs.zIndex : null,
      navZ: nav ? getComputedStyle(nav).zIndex : null,
      copyOpacity: copy ? Number(getComputedStyle(copy).opacity) : null,
      leftText: left?.textContent?.trim() || null,
      rightText: right?.textContent?.replace(/\s+/g, " ").trim() || null,
      frames: frameHits,
    };
  });
}

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader"],
});

const report = [];

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({
    width: vp.width,
    height: vp.height,
    deviceScaleFactor: 1,
  });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await skipIntro(page);

  const range = await page.evaluate(() => {
    const section = document.getElementById("about");
    const top = section.offsetTop;
    const height = section.offsetHeight;
    return { top, height, end: top + height - window.innerHeight };
  });

  const shots = [];
  for (const p of progressShots) {
    const y = Math.round(range.top + Math.max(0, range.end - range.top) * p);
    await scrollTo(page, y);
    const data = await measure(page);
    const file = path.join(outDir, `${vp.name}-p${String(p).replace(".", "")}.png`);
    await page.screenshot({ path: file });
    shots.push({ p, y, file: path.basename(file), ...data });
  }

  // Reverse check from end back through mid to start.
  const reversePoints = [0.78, 0.48, 0.18, 0];
  const reverse = [];
  for (const p of reversePoints) {
    const y = Math.round(range.top + Math.max(0, range.end - range.top) * p);
    await scrollTo(page, y);
    reverse.push({ p, ...(await measure(page)) });
  }

  const forwardAt = (p) => shots.find((s) => s.p === p);
  report.push({
    viewport: vp,
    range,
    overflowMax: Math.max(...shots.map((s) => s.overflowX)),
    asideAlwaysVisible: shots.every(
      (s) => s.aside === "Web experiences" && s.asideOpacity > 0.9,
    ),
    imageCoveredAside: shots.some((s) => s.frames.some((f) => f.overlapsAside)),
    reverseMatches: reverse.map((r) => {
      const f = forwardAt(r.p);
      return {
        p: r.p,
        pinTopDelta: f ? r.pinTop - f.pinTop : null,
        copyDelta: f ? Number((r.copyOpacity - f.copyOpacity).toFixed(3)) : null,
      };
    }),
    shots,
  });

  await page.close();
  console.log("done", vp.name, "overflow", report.at(-1).overflowMax);
}

fs.writeFileSync(
  path.join(outDir, "report.json"),
  JSON.stringify(report, null, 2),
);
console.log("wrote", path.join(outDir, "report.json"));
await browser.close();
