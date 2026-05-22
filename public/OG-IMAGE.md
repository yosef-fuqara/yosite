# Open Graph image (`og-image.png`)

Social previews (Facebook, LinkedIn, WhatsApp, Twitter/X) use **`/og-image.png`**.

## Before production

1. Replace `public/og-image.png` with a **1200×630 px** PNG or JPG (safe zone: keep text/logo inside the center).
2. Match your real brand (the committed file is a **temporary placeholder** only).
3. Run `npm run build` and confirm `https://YOUR_PRODUCTION_DOMAIN/og-image.png` loads after deploy.

URL and path are defined in `src/seo/siteConfig.js` (`OG_IMAGE_PATH`, `OG_IMAGE_URL`).
