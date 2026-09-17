import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const url = process.env.HERO_URL || "http://localhost:5173/";
const outDir = path.resolve("tmp-menu-verify");
fs.mkdirSync(outDir, { recursive: true });

const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const executablePath = edgePaths.find((p) => fs.existsSync(p));

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu-sandbox", "--use-angle=swiftshader"],
});

const report = [];

async function shot(page, name) {
  const file = path.join(outDir, name);
  await page.screenshot({ path: file });
  return file;
}

async function runViewport(width, height, label) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector("[data-yo-menu-trigger]", { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1800));

  const closed = await page.evaluate(() => {
    const trigger = document.querySelector("[data-yo-menu-trigger]");
    const oldLinks = Array.from(
      document.querySelectorAll("header nav a, [data-yo-nav-links] a"),
    ).map((el) => el.textContent.replace(/\s+/g, " ").trim());
    return {
      label: trigger?.innerText.replace(/\s+/g, " ").trim(),
      ariaExpanded: trigger?.getAttribute("aria-expanded"),
      ariaLabel: trigger?.getAttribute("aria-label"),
      overlay: Boolean(document.querySelector("[data-yo-fsmenu]")),
      locked: document.documentElement.classList.contains("yo-menu-locked"),
      oldLinks,
    };
  });
  await shot(page, `${label}-closed.png`);

  await page.click("[data-yo-menu-trigger]");
  await new Promise((r) => setTimeout(r, 280));
  await shot(page, `${label}-opening.png`);
  await new Promise((r) => setTimeout(r, 620));

  const opened = await page.evaluate(() => {
    const trigger = document.querySelector("[data-yo-menu-trigger]");
    const items = Array.from(document.querySelectorAll(".yo-fsmenu__name")).map(
      (el) => el.textContent.trim(),
    );
    const preview = document.querySelector(".yo-fsmenu__preview");
    return {
      label: trigger?.innerText.replace(/\s+/g, " ").trim(),
      ariaExpanded: trigger?.getAttribute("aria-expanded"),
      overlay: Boolean(document.querySelector("[data-yo-fsmenu]")),
      live: document.querySelector("[data-yo-fsmenu]")?.classList.contains("is-live"),
      locked: document.documentElement.classList.contains("yo-menu-locked"),
      items,
      bodyOverflow: getComputedStyle(document.documentElement).overflow,
      previewDisplay: preview ? getComputedStyle(preview).display : "absent",
      studio: document.querySelector(".yo-fsmenu__studio")?.textContent.trim(),
      langs: Array.from(document.querySelectorAll(".yo-fsmenu__lang")).map((el) =>
        el.textContent.trim(),
      ),
    };
  });
  await shot(page, `${label}-open.png`);

  if (width >= 1024) {
    const work = await page.$(".yo-fsmenu__link[href='#selected-work']");
    if (work) {
      await work.hover();
      await new Promise((r) => setTimeout(r, 500));
      opened.previewAfterHover = await page.evaluate(() =>
        Boolean(document.querySelector(".yo-fsmenu__preview")),
      );
      await shot(page, `${label}-work-hover.png`);
    }
  }

  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 900));
  const afterEsc = await page.evaluate(() => ({
    ariaExpanded: document
      .querySelector("[data-yo-menu-trigger]")
      ?.getAttribute("aria-expanded"),
    locked: document.documentElement.classList.contains("yo-menu-locked"),
    overlayLive: document
      .querySelector("[data-yo-fsmenu]")
      ?.classList.contains("is-live"),
  }));
  await shot(page, `${label}-escaped.png`);

  await page.click("[data-yo-menu-trigger]");
  await page.click("[data-yo-menu-trigger]");
  await page.click("[data-yo-menu-trigger]");
  await new Promise((r) => setTimeout(r, 1000));
  const rapid = await page.evaluate(() => ({
    ariaExpanded: document
      .querySelector("[data-yo-menu-trigger]")
      ?.getAttribute("aria-expanded"),
    locked: document.documentElement.classList.contains("yo-menu-locked"),
  }));

  const expandedNow = await page.evaluate(
    () =>
      document.querySelector("[data-yo-menu-trigger]")?.getAttribute("aria-expanded") ===
      "true",
  );
  if (!expandedNow) {
    await page.click("[data-yo-menu-trigger]");
    await new Promise((r) => setTimeout(r, 900));
  }
  const soundBtn = await page.$(".yo-fsmenu__sound");
  if (soundBtn) {
    await soundBtn.click();
    const sound = await page.evaluate(() =>
      localStorage.getItem("yosite-menu-sound"),
    );
    await soundBtn.click();
    const sound2 = await page.evaluate(() =>
      localStorage.getItem("yosite-menu-sound"),
    );
    opened.soundCycle = [sound, sound2];
  }

  await page.close();
  report.push({ label, width, height, closed, opened, afterEsc, rapid });
}

await runViewport(1440, 900, "desktop");
await runViewport(768, 1024, "tablet");
await runViewport(390, 844, "mobile");

await browser.close();
fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
