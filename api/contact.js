import nodemailer from "nodemailer";
import { getSmtpConfigIssues, smtpConfigErrorMessage } from "./_smtp.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function trimField(value) {
  return typeof value === "string" ? value.trim() : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const name = trimField(req.body?.name);
  const email = trimField(req.body?.email);
  const phone = trimField(req.body?.phone);
  const message = trimField(req.body?.message);

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const smtpIssues = getSmtpConfigIssues();
  const configError = smtpConfigErrorMessage(smtpIssues);
  if (configError) {
    console.error("Contact API:", configError);
    return res.status(503).json({ error: configError });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const notifyEmail = process.env.CONTACT_NOTIFY_EMAIL;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || smtpUser,
      to: notifyEmail,
      replyTo: email,
      subject: `New contact form: ${name}`,
      text: [
        "New message from your website contact form",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Contact API: failed to send email", err);
    return res.status(500).json({
      error: "We could not send your message. Please try again in a few minutes.",
    });
  }
}
