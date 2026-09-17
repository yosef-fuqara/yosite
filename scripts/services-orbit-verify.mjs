import puppeteer from "puppeteer-core";
import fs from "node:fs";

const url = process.env.HERO_URL || "http://localhost:5173/";
const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = edgePaths.find((p) => fs.existsSync(p));

const cases = [
  { name: "desktop", width: 1440, height: 900, lang: "en" },
  { name: "desktop-he", width: 1440, height: 900, lang: "he" },
  { name: "mobile", width: 390, height: 844, lang: "en" },
];

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader"],
});

async function goToServices(page) {
  await page.evaluate(() => {
    const el = document.getElementById("services");
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + 8;
    window.scrollTo(0, y);
  });
  await new Promise((r) => setTimeout(r, 1600));
}

for (const c of cases) {
  const page = await browser.newPage();
  await page.setViewport({
    width: c.width,
    height: c.height,
    deviceScaleFactor: 1,
  });
  await page.evaluateOnNewDocument((lang) => {
    localStorage.setItem("yosite-lang", lang);
  }, c.lang);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 7500));
  await goToServices(page);

  const out = `tmp-services-orbit-${c.name}.png`;
  await page.screenshot({ path: out });
  console.log("saved", out);

  const metrics = await page.evaluate(() => {
    const el = document.getElementById("services");
    const r = el?.getBoundingClientRect();
    return {
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
      servicesTop: r ? Math.round(r.top) : null,
      servicesHeight: r ? Math.round(r.height) : null,
      cardCount: document.querySelectorAll(".services-card").length,
      leftStream: !!document.querySelector(".services-stream--left"),
      rightStream: !!document.querySelector(".services-stream--right"),
    };
  });
  console.log(c.name, metrics);

  await page.close();
}

await browser.close();
