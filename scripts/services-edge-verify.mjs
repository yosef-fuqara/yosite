import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const urls = ["http://localhost:5174/", "http://localhost:5173/"];
const outDir = path.resolve("tmp-svc-edge");
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
  await page.waitForSelector("#services", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 500));
}

async function scrollTo(page, y) {
  await page.evaluate((top) => {
    const lenis = window.lenis;
    if (lenis?.scrollTo) {
      lenis.scrollTo(top, { immediate: true });
    } else {
      window.scrollTo(0, top);
    }
  }, y);
  await new Promise((r) => setTimeout(r, 420));
}

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader"],
});

let url = urls[0];
{
  const probe = await browser.newPage();
  let ok = false;
  for (const candidate of urls) {
    try {
      const res = await probe.goto(candidate, { waitUntil: "domcontentloaded", timeout: 8000 });
      if (res && res.ok()) {
        url = candidate;
        ok = true;
        break;
      }
    } catch {
      /* try next */
    }
  }
  await probe.close();
  if (!ok) {
    console.error("No dev server");
    await browser.close();
    process.exit(1);
  }
}
console.log("using", url);

const viewports = [
  { name: "1440", width: 1440, height: 900 },
  { name: "390", width: 390, height: 844 },
];
const progresses = [0.5, 0.68, 0.78, 0.88, 0.96, 1];
const report = [];

for (const vp of viewports) {
  const page = await browser.newPage();
  await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await skipIntro(page);

  const range = await page.evaluate(() => {
    const section = document.getElementById("services");
    const st = window.ScrollTrigger?.getAll?.()?.find((t) => t.trigger?.id === "services");
    return {
      top: section.getBoundingClientRect().top + window.scrollY,
      height: section.offsetHeight,
      tiles: document.querySelectorAll(".services-edge__tile").length,
      edgeH: document.querySelector(".services-edge")?.getBoundingClientRect().height ?? 0,
      viewH: document.querySelector(".services-viewport")?.getBoundingClientRect().height ?? 0,
    };
  });

  const shots = [];
  for (const p of progresses) {
    const y = Math.round(range.top + Math.max(0, range.height - vp.height) * p);
    await scrollTo(page, y);
    const info = await page.evaluate(() => {
      const view = document.querySelector(".services-viewport");
      const sheet = document.querySelector(".services-sheet");
      const head = document.querySelector(".services-headline");
      const last = view?.querySelector(".services-headline__line:last-child");
      const vr = view.getBoundingClientRect();
      const hr = head.getBoundingClientRect();
      const lr = last?.getBoundingClientRect();
      const cs = sheet ? getComputedStyle(sheet) : null;
      return {
        viewBg: getComputedStyle(view).backgroundColor,
        sheetY: sheet ? Math.round(sheet.getBoundingClientRect().top) : null,
        viewBottom: Math.round(vr.bottom),
        headTop: Math.round(hr.top),
        headBottom: Math.round(hr.bottom),
        lastBottom: lr ? Math.round(lr.bottom) : null,
        crop: lr ? Math.round(lr.bottom - vr.bottom) : null,
        clip: cs?.clipPath && cs.clipPath !== "none" ? "on" : "off",
        ty: cs?.transform || null,
      };
    });

    const label = `p${String(p).replace("0.", "")}`;
    const file = path.join(outDir, `${vp.name}-${label}.png`);
    await page.screenshot({ path: file });

    const row = { label, y, file, ...info };
    shots.push(row);
    console.log(vp.name, label, {
      clip: info.clip,
      crop: info.crop,
      headTop: info.headTop,
      sheetY: info.sheetY,
    });
  }

  const exitY = Math.round(range.top + range.height + 8);
  await scrollTo(page, exitY);
  await page.screenshot({ path: path.join(outDir, `${vp.name}-exit.png`) });

  report.push({ vp: vp.name, range, shots });
  await page.close();
}

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log("wrote", path.join(outDir, "report.json"));
await browser.close();
