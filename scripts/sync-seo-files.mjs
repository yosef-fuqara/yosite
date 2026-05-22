/**
 * Writes public/sitemap.xml and public/robots.txt from src/seo/siteConfig.js.
 * Run via: npm run seo:sync (also runs automatically before production build).
 */
import { writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_URL, SITE_HOST } from "../src/seo/siteConfig.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated from src/seo/siteConfig.js (SITE_HOST=${SITE_HOST}) — do not edit by hand -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${SITE_URL}</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE_URL}" />
    <xhtml:link rel="alternate" hreflang="he" href="${SITE_URL}" />
    <xhtml:link rel="alternate" hreflang="ar" href="${SITE_URL}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}" />
  </url>
</urlset>
`;

const robots = `# Generated from src/seo/siteConfig.js (SITE_HOST=${SITE_HOST}) — do not edit by hand
User-agent: *
Allow: /

Sitemap: ${SITE_URL.replace(/\/$/, "")}/sitemap.xml
`;

writeFileSync(join(publicDir, "sitemap.xml"), sitemap, "utf8");
writeFileSync(join(publicDir, "robots.txt"), robots, "utf8");

const ogImagePath = join(publicDir, "og-image.png");
if (!existsSync(ogImagePath)) {
  console.warn(
    "[seo:sync] WARNING: public/og-image.png is missing. Add a 1200×630 PNG before production (see public/OG-IMAGE.md).",
  );
} else {
  console.log("[seo:sync] OK: public/og-image.png present");
}

console.log(`[seo:sync] SITE_URL=${SITE_URL}`);
console.log("[seo:sync] Updated public/sitemap.xml and public/robots.txt");
