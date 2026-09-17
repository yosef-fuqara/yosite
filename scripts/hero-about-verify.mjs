// Verify Hero→About scroll transition at multiple breakpoints.
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const url = process.env.HERO_URL || "http://localhost:5173/";
const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = edgePaths.find((p) => fs.existsSync(p));

const cases = [
  { name: "desktop-1440", width: 1440, height: 900, scrolls: [0, 350, 700, 1000] },
  { name: "desktop-1920", width: 1920, height: 1080, scrolls: [0, 450, 900, 1300] },
  { name: "tablet", width: 834, height: 1112, scrolls: [0, 280, 560, 820] },
  { name: "mobile", width: 390, height: 844, scrolls: [0, 180, 360, 520] },
];

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader"],
});

for (const c of cases) {
  const page = await browser.newPage();
  await page.setViewport({ width: c.width, height: c.height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 7500));

  for (const y of c.scrolls) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await new Promise((r) => setTimeout(r, 400));
    const out = `tmp-transition-${c.name}-y${y}.png`;
    await page.screenshot({ path: out });
    console.log("saved", out);
  }

  const overflow = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
  }));
  console.log(c.name, "overflow", overflow.sw > overflow.cw + 1 ? "YES" : "no");

  await page.close();
}

await browser.close();
