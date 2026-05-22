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

## 4. Contact form (email API)

The contact form POSTs to `/api/contact` (Vercel serverless). Secrets stay in `.env` locally and in your host’s environment variables in production (see `.env.example`).

| Variable | Purpose |
|----------|---------|
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Outbound mail server |
| `SMTP_USER`, `SMTP_PASS` | SMTP credentials (never in frontend) |
| `SMTP_FROM` | Optional “From” header |
| `CONTACT_NOTIFY_EMAIL` | Inbox for new submissions (`yosefokra2050@gmail.com` in `.env.example`) |

### Local development

1. **First time:** `npm run dev:setup` (creates `.env` from `.env.example` if missing).
2. Edit **`.env`** with real SMTP values (Gmail: use an [App Password](https://myaccount.google.com/apppasswords), `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`).
3. **Recommended — one command (frontend + API):**
   ```bash
   npm run dev:full
   ```
   - Vite: frontend (proxies `/api` → port 3000)
   - Vercel dev: `/api/contact` on `http://127.0.0.1:3000`
4. **Other scripts:**
   - `npm run dev` — frontend only (contact form will fail until API is running)
   - `npm run dev:api` — API only on port 3000

If SMTP variables are missing or still placeholders, the API returns a clear error and the form shows that message (no WhatsApp opens on submit; WhatsApp is only the footer icon link).

## 5. After hosting

- Submit `https://YOUR_DOMAIN/sitemap.xml` in Google Search Console
- Test share previews: [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/), [Twitter Card Validator](https://cards-dev.twitter.com/validator) (or X equivalent)
- Confirm HTTPS and that `/robots.txt` is reachable
- Submit a test message on the contact form and confirm email delivery

## Files driven by `siteConfig.js`

| File | How it updates |
|------|----------------|
| `index.html` | Vite plugin at dev/build (`%SITE_URL%`, etc.) |
| `public/sitemap.xml` | `npm run seo:sync` / `prebuild` |
| `public/robots.txt` | `npm run seo:sync` / `prebuild` |
