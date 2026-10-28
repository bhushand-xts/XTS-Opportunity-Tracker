import nodemailer from 'nodemailer';
import env from '../config/env';

// One shared SMTP connection pool for the life of the process — created lazily
// so a missing SMTP config only skips notifications, not opportunity creation.
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!env.smtp) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      // 465 is implicit TLS; 587 negotiates TLS via STARTTLS.
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
      tls: { rejectUnauthorized: env.smtp.rejectUnauthorized },
    });
  }
  return transporter;
}

export interface OpportunityCreatedDetails {
  opportunityNumber: string;
  opportunityName: string;
  accountName: string | null;
  rfpType: string;
  ownerName: string;
  estimatedValue: number | null;
  currency: string | null;
  stageName: string | null;
  expectedCloseDate: string | null;
  createdByName: string;
  createdAt: string;
}
export interface OpportunityCreatedRecipient { email: string; name: string }

const money = (value: number | null, currency: string | null) =>
  value === null ? 'Not specified' : `${currency ? currency + ' ' : ''}${value.toLocaleString('en-IN')}`;
const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const date = (value: string | null) => value
  ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)).replace(/ /g, '-')
  : 'Not specified';
const dateTime = (value: string) => {
  const d = new Date(value);
  const datePart = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d).replace(/ /g, '-');
  const timePart = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  return `${datePart}, ${timePart}`;
};

async function sendOpportunityCreatedEmail(recipients: OpportunityCreatedRecipient[], details: OpportunityCreatedDetails): Promise<void> {
  const mailer = getTransporter();
  if (!mailer || recipients.length === 0) return;
  const subject = `New Opportunity Created: ${details.opportunityName} by ${details.createdByName}`;
  const rows: [string, string][] = [
    ['Opportunity number', details.opportunityNumber],
    ['Opportunity name', details.opportunityName],
    ['Account', details.accountName ?? 'Not specified'],
    ['RFP type', details.rfpType],
    ['Owner', details.ownerName],
    ['Amount', money(details.estimatedValue, details.currency)],
    ['Expected close date', date(details.expectedCloseDate)],
    ['Stage', details.stageName ?? 'Not specified'],
    ['Created on', dateTime(details.createdAt)],
  ];
  const lastIndex = rows.length - 1;
  await Promise.all(recipients.map(recipient => mailer.sendMail({
    from: env.smtp!.from,
    to: recipient.email,
    subject,
    text: `Hi ${recipient.name},\n\nA new opportunity has been created by ${details.createdByName} and is ready for your review.\n\n` +
      `${rows.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\nPlease review the details.`,
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#eef1f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eef1f6" style="background-color:#eef1f6;">
  <tr>
    <td align="center" style="padding: 32px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff"
        style="width:600px; max-width:100%; background-color:#ffffff; border:1px solid #e2e8f0; border-radius:10px; overflow:hidden; font-family:Arial, Helvetica, sans-serif;">
        <tr>
          <td bgcolor="#312e81" style="background-color:#312e81; padding:20px 28px;">
            <span style="color:#ffffff; font-size:16px; font-weight:bold; letter-spacing:0.2px;">XTS Opportunity Tracker</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px 28px;">
            <p style="margin:0 0 4px 0; font-size:12px; font-weight:bold; letter-spacing:1px; color:#6366f1; text-transform:uppercase;">New opportunity created</p>
            <p style="margin:0 0 20px 0; font-size:20px; font-weight:bold; color:#0f172a;">${escapeHtml(details.opportunityName)}</p>
            <p style="margin:0 0 4px 0; font-size:14px; color:#334155;">Hi ${escapeHtml(recipient.name)},</p>
            <p style="margin:0 0 20px 0; font-size:14px; color:#334155; line-height:1.5;">A new opportunity has been created by <strong>${escapeHtml(details.createdByName)}</strong> and is ready for your review.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
              ${rows.map(([label, value], index) => `
                <tr bgcolor="${index % 2 === 0 ? '#f8fafc' : '#ffffff'}" style="background-color:${index % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                  <td style="padding:12px 16px; font-size:13px; color:#64748b; width:42%; ${index !== lastIndex ? 'border-bottom:1px solid #e2e8f0;' : ''}">${escapeHtml(label)}</td>
                  <td style="padding:12px 16px; font-size:13px; color:#0f172a; font-weight:bold; ${index !== lastIndex ? 'border-bottom:1px solid #e2e8f0;' : ''}">${escapeHtml(value)}</td>
                </tr>`).join('')}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 28px 28px;">
            <p style="margin:0; font-size:14px; color:#334155;">Please review the details.</p>
          </td>
        </tr>
        <tr>
          <td bgcolor="#f8fafc" style="background-color:#f8fafc; padding:16px 28px; border-top:1px solid #e2e8f0;">
            <p style="margin:0; font-size:12px; color:#94a3b8;">XTS Opportunity Tracker</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`,
  })));
}

export { sendOpportunityCreatedEmail };
