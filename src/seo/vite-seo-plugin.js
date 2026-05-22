import {
  SITE_URL,
  OG_IMAGE_URL,
  PAGE_TITLE,
  META_DESCRIPTION,
  META_KEYWORDS,
  SITE_NAME,
  OG_IMAGE_ALT,
  STRUCTURED_DATA,
} from "./siteConfig.js";

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Injects SEO placeholders in index.html from siteConfig.js (dev + production). */
export function yoSiteSeoPlugin() {
  const jsonLd = JSON.stringify(STRUCTURED_DATA, null, 2).replace(/</g, "\\u003c");

  return {
    name: "yosite-seo",
    transformIndexHtml(html) {
      return html
        .replaceAll("%SITE_URL%", SITE_URL)
        .replaceAll("%OG_IMAGE_URL%", OG_IMAGE_URL)
        .replaceAll("%PAGE_TITLE%", escapeHtml(PAGE_TITLE))
        .replaceAll("%META_DESCRIPTION%", escapeHtml(META_DESCRIPTION))
        .replaceAll("%META_KEYWORDS%", escapeHtml(META_KEYWORDS))
        .replaceAll("%SITE_NAME%", escapeHtml(SITE_NAME))
        .replaceAll("%OG_IMAGE_ALT%", escapeHtml(OG_IMAGE_ALT))
        .replaceAll("%JSON_LD%", jsonLd);
    },
  };
}
