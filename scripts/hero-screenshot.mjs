// Dev helper: capture the hero section for visual comparison against the
// reference image. Usage: node scripts/hero-screenshot.mjs [width height out]
import puppeteer from "puppeteer-core";
import fs from "node:fs";

const width = Number(process.argv[2] || 1440);
const height = Number(process.argv[3] || 810);
const out = process.argv[4] || `hero-${width}x${height}.png`;
const url = process.env.HERO_URL || "http://localhost:5173/";

const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = edgePaths.find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader"],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
// Let the splash exit and the entrance + thread reveal complete.
await new Promise((resolve) => setTimeout(resolve, 7000));
await page.screenshot({ path: out });
await browser.close();
console.log("saved", out);
