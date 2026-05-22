/**
 * YoSite SEO — single source of truth for URLs and meta copy.
 *
 * TODO(deploy): Set SITE_HOST to your live hostname (no https://, no trailing slash).
 *   Example: "yosite.com" or "www.yosite.com"
 *
 * After changing SITE_HOST, run `npm run build` (or `npm run seo:sync`) so
 * sitemap.xml and robots.txt stay in sync. index.html is injected at build/dev via vite-seo-plugin.
 */
export const SITE_HOST = "YOUR_DOMAIN_HERE";

/** Canonical site URL — derived from SITE_HOST; do not edit manually. */
export const SITE_URL = `https://${SITE_HOST}/`;

export const SITE_NAME = "YoSite";

export const PAGE_TITLE =
  "YoSite | בניית אתרים לעסקים | بناء مواقع للشركات";

export const META_DESCRIPTION =
  "YoSite builds modern websites, landing pages, and digital experiences for businesses. בניית אתרים מודרניים לעסקים, דפי נחיתה ואתרי תדמית. بناء مواقع حديثة للشركات وصفحات هبوط وتجارب رقمية.";

export const META_KEYWORDS =
  "בניית אתרים, בניית אתר לעסק, עיצוב אתרים, דפי נחיתה, אתר תדמית, מפתח אתרים, אתרים לעסקים, קידום אתרים, SEO, בניית אתר בעברית, בניית אתר בערבית, بناء مواقع, تصميم مواقع, موقع تجاري, مواقع للشركات, صفحة هبوط, مطور مواقع, برمجة مواقع, تحسين محركات البحث, SEO, موقع بالعربية, موقع عبري, website development, web design, business websites, landing pages, portfolio website, frontend developer, React developer, SEO, modern websites, responsive websites";

/**
 * Open Graph / Twitter share image path (served from /public).
 * TODO(deploy): Replace public/og-image.png with your branded 1200×630 asset before launch.
 * A temporary placeholder is committed; see public/OG-IMAGE.md.
 */
export const OG_IMAGE_PATH = "/og-image.png";

export const OG_IMAGE_URL = `${SITE_URL.replace(/\/$/, "")}${OG_IMAGE_PATH}`;

export const OG_IMAGE_ALT =
  "YoSite — website development for businesses in Hebrew, Arabic, and English";

export const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: SITE_NAME,
  url: SITE_URL,
  description: META_DESCRIPTION,
  image: OG_IMAGE_URL,
  areaServed: ["IL", "PS", "World"],
  knowsLanguage: ["Hebrew", "Arabic", "English"],
  serviceType: [
    "Website development",
    "Web design",
    "Landing pages",
    "Business websites",
    "SEO-friendly websites",
  ],
};
