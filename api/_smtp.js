const REQUIRED_SMTP_KEYS = [
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "CONTACT_NOTIFY_EMAIL",
];

const PLACEHOLDER_VALUES = new Set([
  "smtp.example.com",
  "your-smtp-username",
  "your-smtp-password",
  "you@yourdomain.com",
]);

export function getSmtpConfigIssues() {
  const missing = REQUIRED_SMTP_KEYS.filter((key) => !process.env[key]?.trim());

  const placeholders = REQUIRED_SMTP_KEYS.filter((key) =>
    PLACEHOLDER_VALUES.has(process.env[key]?.trim() ?? "")
  );

  return { missing, placeholders };
}

export function smtpConfigErrorMessage({ missing, placeholders }) {
  if (missing.length) {
    return `Email is not configured. Missing environment variables: ${missing.join(", ")}. Add them to .env (local) or your hosting dashboard.`;
  }
  if (placeholders.length) {
    return `Email is not configured. Replace placeholder values in .env for: ${placeholders.join(", ")}.`;
  }
  return null;
}
