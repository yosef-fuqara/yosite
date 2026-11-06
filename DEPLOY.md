# Deployment checklist (SEO)

## 1. Set your production domain (one place)

Edit **`src/seo/siteConfig.js`**:

```js
// TODO(deploy): replace with your live hostname
export const SITE_HOST = "www.example.com";
```

Do **not** search/replace across the repo — `npm run seo:sync` and the Vite SEO plugin propagate `SITE_URL` everywhere.

## 2. Replace the Open Graph image

- Swap **`public/og-image.png`** with a branded **1200×630** image (see `public/OG-IMAGE.md`).
- The committed file is a temporary placeholder for local/preview builds only.

## 3. Build and verify

```bash
npm run build
npm run preview
```

Check in the built `dist/index.html`:

- `canonical`, `og:url`, and `og:image` use your real domain
- `dist/og-image.png` exists
- `dist/sitemap.xml` and `dist/robots.txt` point to your domain

## 4. Contact form

There is no email API. Do not add SMTP environment variables. The contact form opens WhatsApp in the visitor’s browser and does not send form data to YoSite servers. `/api/contact` is not deployed.

## 5. After hosting

- Submit `https://YOUR_DOMAIN/sitemap.xml` in Google Search Console
- Test share previews: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/), [Twitter Card Validator](https://cards-dev.twitter.com/validator) (or X equivalent)
- Confirm HTTPS and that `/robots.txt` is reachable

## Files driven by `siteConfig.js`

| File | How it updates |
|------|----------------|
| `index.html` | Vite plugin at dev/build (`%SITE_URL%`, etc.) |
| `public/sitemap.xml` | `npm run seo:sync` / `prebuild` |
| `public/robots.txt` | `npm run seo:sync` / `prebuild` |
