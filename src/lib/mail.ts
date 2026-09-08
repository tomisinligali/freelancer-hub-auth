import nodemailer, { type Transporter } from "nodemailer";

function getAppUrl(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  );
}

function createTransporter(): Transporter {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";

  if (!host) {
    // No SMTP configured (e.g. local development): build the message locally so
    // the verification link is still available in the terminal.
    return nodemailer.createTransport({
      jsonTransport: true,
    }) as Transporter;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  });
}

const transporter: Transporter = createTransporter();

export const isMailConfigured = Boolean(process.env.SMTP_HOST);

export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<void> {
  const baseUrl = getAppUrl();
  const from = process.env.MAIL_FROM || `"Freelancer Hub" <noreply@${new URL(baseUrl).hostname}>`;
  const verifyUrl = `${baseUrl}/auth?view=verify`;

  const info = await transporter.sendMail({
    from,
    to,
    subject: "Verify your Freelancer Hub email",
    text: `Welcome to Freelancer Hub!\\n\\nUse the one-time verification code below to activate your account before signing in.\\n\\nVerification code:\\n${code}\\n\\nEnter this code in the verification form at:\\n${verifyUrl}\\n\\nThis code expires in 24 hours and can only be used once.\\n\\nIf you did not create this account, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #7e2cde;">Welcome to Freelancer Hub</h2>
        <p>Use the one-time verification code below to activate your account before signing in.</p>
        <p style="font-size: 16px; color: #222; background: #faf6fe; border: 1px solid #eee; border-radius: 8px; padding: 12px 16px; word-break: break-all;">
          <strong>${code}</strong>
        </p>
        <p>
          Enter this code in the verification form at
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <p style="font-size: 13px; color: #555;">This code expires in 24 hours and can only be used once.</p>
        <p style="font-size: 12px; color: #888;">If you did not create this account, you can safely ignore this email.</p>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("[mail] verification email prepared:", info.messageId || info);
  }
}