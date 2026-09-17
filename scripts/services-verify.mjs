import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const url = process.env.HERO_URL || "http://localhost:5173/";
const outDir = path.resolve("tmp-svc");
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

const progressShots = [0, 0.08, 0.18, 0.32, 0.52, 0.74, 0.92, 1];

async function skipIntro(page) {
  await page.waitForFunction(
    () => !document.documentElement.classList.contains("yo-intro-locked"),
    { timeout: 20000 },
  ).catch(() => {});
  await page.evaluate(() => {
    document.documentElement.classList.remove("yo-intro-locked", "yo-built-shared");
    const overlay = document.querySelector(".yo-cinematic-intro");
    if (overlay) overlay.style.cssText = "display:none!important;pointer-events:none;";
  });
  await page.waitForSelector("#services", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 600));
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
  await new Promise((r) => setTimeout(r, 380));
}

async function measure(page) {
  return page.evaluate(() => {
    const section = document.getElementById("services");
    const viewport = section?.querySelector(".services-viewport");
    const headline = document.getElementById("services-heading");
    const cards = [...(section?.querySelectorAll(".services-card") || [])];
    const next = document.getElementById("works");
    const rect = section?.getBoundingClientRect();
    const view = viewport?.getBoundingClientRect();
    const head = headline?.getBoundingClientRect();
    return {
      scrollY: Math.round(window.scrollY),
      sectionTop: rect ? Math.round(rect.top) : null,
      sectionH: rect ? Math.round(rect.height) : null,
      pinTop: view ? Math.round(view.top) : null,
      pinH: view ? Math.round(view.height) : null,
      headTop: head ? Math.round(head.top) : null,
      headBottom: head ? Math.round(head.bottom) : null,
      headWidth: head ? Math.round(head.width) : null,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      nextId: next && view && view.bottom < 80 ? "works" : null,
      cards: cards.map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          id: el.dataset.id,
          track: el.dataset.track,
          opacity: Number(cs.opacity),
          y: Math.round(r.top),
          bottom: Math.round(r.bottom),
          x: Math.round(r.left),
          visible: r.bottom > 0 && r.top < window.innerHeight && Number(cs.opacity) > 0.12,
        };
      }),
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
  page.on("pageerror", (err) => console.log("PAGEERROR", vp.name, err.message));
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await skipIntro(page);
  await new Promise((r) => setTimeout(r, 800));

  const range = await page.evaluate(() => {
    const section = document.getElementById("services");
    if (!section) return { top: 0, height: 0 };
    const top = section.getBoundingClientRect().top + window.scrollY;
    const height = section.offsetHeight;
    return { top, height };
  });
  if (!range.height) {
    console.log(vp.name, "NO SERVICES SECTION");
    await page.close();
    continue;
  }

  const shots = [];
  for (const p of progressShots) {
    const y = Math.round(range.top + Math.max(0, range.height - vp.height) * p);
    await scrollTo(page, y);
    const info = await measure(page);
    const label = p === 0 ? "start" : p === 1 ? "end" : `p${String(p).replace("0.", "")}`;
    const file = path.join(outDir, `${vp.name}-${label}.png`);
    await page.screenshot({ path: file });
    shots.push({ label, y, ...info });
    console.log(vp.name, label, "pin", info.pinTop, "head", info.headTop, "overflow", info.overflowX);
  }

  const mid = Math.round(range.top + (range.height - vp.height) * 0.52);
  await scrollTo(page, mid);
  const forward = await measure(page);
  const backY = Math.round(range.top + (range.height - vp.height) * 0.18);
  await scrollTo(page, backY);
  const reverse = await measure(page);
  await page.screenshot({ path: path.join(outDir, `${vp.name}-reverse.png`) });

  const after = Math.round(range.top + range.height + 40);
  await scrollTo(page, after);
  const released = await measure(page);
  if (vp.name === "1440" || vp.name === "390") {
    await page.screenshot({ path: path.join(outDir, `${vp.name}-released.png`) });
  }

  report.push({
    vp: vp.name,
    range,
    overflow: shots.some((s) => s.overflowX > 1),
    pinH: shots[3]?.pinH,
    forwardVisible: forward.cards.filter((c) => c.visible).map((c) => c.id),
    reverseVisible: reverse.cards.filter((c) => c.visible).map((c) => c.id),
    released: { scrollY: released.scrollY, pinTop: released.pinTop, nextId: released.nextId },
    clips: shots.map((s) => ({
      label: s.label,
      pinTop: s.pinTop,
      headTop: s.headTop,
      headBottom: s.headBottom,
      overflowX: s.overflowX,
      visible: s.cards.filter((c) => c.visible).map((c) => `${c.id}:${c.y}`),
    })),
  });

  await page.close();
}

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log("wrote", path.join(outDir, "report.json"));
await browser.close();
