import nodemailer from 'nodemailer';
import env from '../config/env';

// One shared SMTP connection pool for the life of the process — created lazily
// so a missing SMTP config only breaks password reset, not the whole service.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      // 465 is implicit TLS; 587 (Zoho's default) negotiates TLS via STARTTLS.
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      tls: { rejectUnauthorized: env.smtp.rejectUnauthorized },
    });
  }
  return transporter;
}

async function sendPasswordResetEmail(toEmail: string, resetLink: string): Promise<void> {
  await getTransporter().sendMail({
    from: env.smtp.from,
    to: toEmail,
    subject: 'Reset your XTS Opportunity Tracker password',
    text: `We received a request to reset your password.\n\nReset it here: ${resetLink}\n\nThis link expires in 30 minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${resetLink}">Click here to reset your password</a></p>
      <p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>
    `,
  });
}

export { sendPasswordResetEmail };
