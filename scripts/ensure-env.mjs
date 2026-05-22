import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");
const examplePath = join(root, ".env.example");

const PLACEHOLDER_VALUES = new Set([
  "smtp.example.com",
  "your-smtp-username",
  "your-smtp-password",
  "you@yourdomain.com",
  "noreply@yourdomain.com",
]);

function parseEnv(content) {
  const vars = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

if (!existsSync(examplePath)) {
  console.error("[env] Missing .env.example — cannot create .env");
  process.exit(1);
}

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log("[env] Created .env from .env.example");
  console.log("[env] Edit .env with your SMTP credentials before testing the contact form.");
}

const vars = parseEnv(readFileSync(envPath, "utf8"));
const requiredKeys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "CONTACT_NOTIFY_EMAIL"];
const missing = requiredKeys.filter((key) => !vars[key]?.trim());
const placeholders = requiredKeys.filter((key) =>
  PLACEHOLDER_VALUES.has(vars[key]?.trim() ?? "")
);

if (missing.length) {
  console.warn(`[env] Missing in .env: ${missing.join(", ")}`);
}

if (placeholders.length) {
  console.warn(
    `[env] Placeholder values in .env: ${placeholders.join(", ")} — replace them with real SMTP settings.`
  );
}

if (!missing.length && !placeholders.length) {
  console.log("[env] SMTP variables look configured.");
}
