import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type SmtpCredentials = {
  email: string;
  appPassword: string;
  /** Overrides for non-Gmail providers. Defaults target Gmail app passwords. */
  host?: string;
  port?: number;
  secure?: boolean;
};

const DEFAULT_HOST = "smtp.gmail.com";
const DEFAULT_PORT = 465;

function transporterFor(credentials: SmtpCredentials): Transporter {
  return nodemailer.createTransport({
    host: credentials.host ?? DEFAULT_HOST,
    port: credentials.port ?? DEFAULT_PORT,
    secure: credentials.secure ?? (credentials.port ?? DEFAULT_PORT) === 465,
    auth: {
      user: credentials.email,
      pass: credentials.appPassword,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
}

export type SmtpVerificationResult = {
  ok: boolean;
  message: string;
  /** Raw SMTP response, useful for diagnosing credential or account problems. */
  detail?: string;
};

export async function verifySmtpCredentials(
  credentials: SmtpCredentials,
): Promise<SmtpVerificationResult> {
  const transporter = transporterFor(credentials);
  try {
    await transporter.verify();
    return { ok: true, message: "Connected and authenticated with the SMTP server." };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "SMTP authentication failed";
    return { ok: false, message: normalizeSmtpError(raw), detail: raw.slice(0, 500) };
  } finally {
    transporter.close();
  }
}

export type SmtpSendInput = {
  credentials: SmtpCredentials;
  fromName: string;
  to: string;
  subject: string;
  html: string;
  /** Unsubscribe URL included in the List-Unsubscribe header and email footer. */
  unsubscribeUrl?: string;
};

export type SmtpSendResult = {
  messageId: string | null;
};

export async function sendSmtpEmail(input: SmtpSendInput): Promise<SmtpSendResult> {
  const transporter = transporterFor(input.credentials);
  try {
    const info = await transporter.sendMail({
      from: { name: input.fromName, address: input.credentials.email },
      to: input.to,
      subject: input.subject,
      html: input.unsubscribeUrl ? appendUnsubscribeFooter(input.html, input.unsubscribeUrl) : input.html,
      replyTo: input.credentials.email,
      headers: input.unsubscribeUrl
        ? {
            "List-Unsubscribe": `<${input.unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : undefined,
    });
    return { messageId: info.messageId ?? null };
  } finally {
    transporter.close();
  }
}

function appendUnsubscribeFooter(html: string, unsubscribeUrl: string): string {
  const footer = `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e5e5;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif">If you no longer want to receive these emails, <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline">unsubscribe here</a>.</div>`;
  return `${html}\n${footer}`;
}

function normalizeSmtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("535") || lower.includes("authentication failed")) {
    return "SMTP authentication failed. Check the email address and Google app password, and confirm 2-Step Verification is enabled.";
  }
  if (lower.includes("etimedout") || lower.includes("econnrefused") || lower.includes("enotfound")) {
    return "Could not reach the SMTP server. Check the server's outbound network access.";
  }
  return message;
}
