# YoSite Studio — React + Vite

## Development

| Command | What it runs |
|---------|----------------|
| `npm run dev` | Vite frontend only |
| `npm run dev:api` | Contact API on port 3000 (`vercel dev`) |
| `npm run dev:full` | **Both** frontend + API (use this for the contact form) |
| `npm run dev:setup` | Create `.env` from `.env.example` if missing |

### Contact form (local)

1. Run `npm run dev:setup` once (or `npm run dev:full` — it runs setup automatically).
2. Open `.env` and set real SMTP credentials (see `.env.example`). Set `CONTACT_NOTIFY_EMAIL=yosefokra2050@gmail.com` so submissions go to that inbox (already in `.env.example`).
3. Run `npm run dev:full` and open the URL Vite prints (e.g. `http://localhost:5173`).
4. Submit the contact form — you should see **Message Sent** when email sends successfully.

Vite proxies `/api/contact` to `http://127.0.0.1:3000`. If you only run `npm run dev`, the API is not running and the form will error.

Production deploy and SEO: see **`DEPLOY.md`**.

## Build

```bash
npm run build
npm run preview
```
