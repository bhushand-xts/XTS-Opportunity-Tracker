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
  subStageName?: string | null;
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

// Status shown the way the app shows it: the stage in bold blue, the
// sub-stage as a purple pill beside it. Inline styles only, so it renders in
// every mail client.
const STAGE_STYLE = 'color:#3b4fd8; font-size:14px; font-weight:bold;';
const SUB_STAGE_STYLE =
  'display:inline-block; margin-left:6px; padding:2px 10px; border-radius:999px; background-color:#ede9fe; ' +
  'color:#6d28d9; font-size:12px; font-weight:bold; line-height:18px; vertical-align:middle;';
const statusHtml = (stageName: string | null, subStageName: string | null) =>
  `<span style="${STAGE_STYLE}">${escapeHtml(stageName ?? 'Not specified')}</span>` +
  (subStageName ? `<span style="${SUB_STAGE_STYLE}">${escapeHtml(subStageName)}</span>` : '');
const statusText = (stageName: string | null, subStageName: string | null) =>
  `${stageName ?? 'Not specified'}${subStageName ? ` (${subStageName})` : ''}`;

/** A details-table row: label, plain-text value, and optional HTML for the email body. */
type DetailRow = [label: string, text: string, html?: string];

const detailsTable = (rows: DetailRow[]) => {
  const lastIndex = rows.length - 1;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
              ${rows.map(([label, value, html], index) => `
                <tr bgcolor="${index % 2 === 0 ? '#f8fafc' : '#ffffff'}" style="background-color:${index % 2 === 0 ? '#f8fafc' : '#ffffff'};">
                  <td style="padding:12px 16px; font-size:13px; color:#64748b; width:42%; vertical-align:top; ${index !== lastIndex ? 'border-bottom:1px solid #e2e8f0;' : ''}">${escapeHtml(label)}</td>
                  <td style="padding:12px 16px; font-size:13px; color:#0f172a; font-weight:bold; ${index !== lastIndex ? 'border-bottom:1px solid #e2e8f0;' : ''}">${html ?? escapeHtml(value)}</td>
                </tr>`).join('')}
            </table>`;
};

/** Highlighted "Current status" block shown under the opportunity name. */
const statusBanner = (stageName: string | null, subStageName: string | null) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px 0;">
              <tr>
                <td bgcolor="#f5f3ff" style="background-color:#f5f3ff; border:1px solid #ddd6fe; border-left:4px solid #6d28d9; border-radius:8px; padding:12px 16px;">
                  <p style="margin:0 0 6px 0; font-size:11px; font-weight:bold; letter-spacing:1px; color:#64748b; text-transform:uppercase;">Current status</p>
                  ${statusHtml(stageName, subStageName)}
                </td>
              </tr>
            </table>`;

async function sendOpportunityCreatedEmail(recipients: OpportunityCreatedRecipient[], details: OpportunityCreatedDetails): Promise<void> {
  const mailer = getTransporter();
  if (!mailer || recipients.length === 0) return;
  const subject = `New Opportunity Created: ${details.opportunityName} by ${details.createdByName}`;
  const subStageName = details.subStageName ?? null;
  const rows: DetailRow[] = [
    ['Opportunity number', details.opportunityNumber],
    ['Opportunity name', details.opportunityName],
    ['Account', details.accountName ?? 'Not specified'],
    ['RFP type', details.rfpType],
    ['Owner', details.ownerName],
    ['Amount', money(details.estimatedValue, details.currency)],
    ['Expected close date', date(details.expectedCloseDate)],
    ['Status', statusText(details.stageName, subStageName), statusHtml(details.stageName, subStageName)],
    ['Created on', dateTime(details.createdAt)],
  ];
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
            <p style="margin:0 0 16px 0; font-size:20px; font-weight:bold; color:#0f172a;">${escapeHtml(details.opportunityName)}</p>
            ${statusBanner(details.stageName, subStageName)}
            <p style="margin:0 0 4px 0; font-size:14px; color:#334155;">Hi ${escapeHtml(recipient.name)},</p>
            <p style="margin:0 0 20px 0; font-size:14px; color:#334155; line-height:1.5;">A new opportunity has been created by <strong>${escapeHtml(details.createdByName)}</strong> and is ready for your review.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;">
            ${detailsTable(rows)}
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

export interface OpportunityStatusChangedDetails {
  opportunityNumber: string;
  opportunityName: string;
  accountName: string | null;
  stageName: string | null;
  subStageName: string | null;
  estimatedValue: number | null;
  currency: string | null;
  comment: string | null;
  changedByName: string;
  changedAt: string;
}

async function sendOpportunityStatusChangedEmail(recipients: OpportunityCreatedRecipient[], details: OpportunityStatusChangedDetails): Promise<void> {
  const mailer = getTransporter();
  if (!mailer || recipients.length === 0) return;
  const subject = `Opportunity Update: ${details.opportunityName} — ${details.stageName ?? 'Status changed'}`;
  const rows: DetailRow[] = [
    ['Opportunity number', details.opportunityNumber],
    ['Opportunity name', details.opportunityName],
    ['Account', details.accountName ?? 'Not specified'],
    ['Amount', money(details.estimatedValue, details.currency)],
    ['Status', statusText(details.stageName, details.subStageName), statusHtml(details.stageName, details.subStageName)],
    ['Updated by', details.changedByName],
    ['Updated on', dateTime(details.changedAt)],
    ...(details.comment ? [['Note', details.comment] as DetailRow] : []),
  ];
  await Promise.all(recipients.map(recipient => mailer.sendMail({
    from: env.smtp!.from,
    to: recipient.email,
    subject,
    text: `Hi ${recipient.name},\n\n${details.changedByName} updated this opportunity and it is ready for your review.\n\n` +
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
            <p style="margin:0 0 4px 0; font-size:12px; font-weight:bold; letter-spacing:1px; color:#6366f1; text-transform:uppercase;">Opportunity update</p>
            <p style="margin:0 0 16px 0; font-size:20px; font-weight:bold; color:#0f172a;">${escapeHtml(details.opportunityName)}</p>
            ${statusBanner(details.stageName, details.subStageName)}
            <p style="margin:0 0 4px 0; font-size:14px; color:#334155;">Hi ${escapeHtml(recipient.name)},</p>
            <p style="margin:0 0 20px 0; font-size:14px; color:#334155; line-height:1.5;"><strong>${escapeHtml(details.changedByName)}</strong> updated this opportunity and it is ready for your review.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px;">
            ${detailsTable(rows)}
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

export { sendOpportunityCreatedEmail, sendOpportunityStatusChangedEmail };
