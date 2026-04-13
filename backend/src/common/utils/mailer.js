const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const env = require('../../config/env');

let transporter = null;
let resendClient = null;

function getResendClient() {
  if (!env.mail.resendApiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(env.mail.resendApiKey);
  }

  return resendClient;
}

function getTransporter() {
  if (!env.mail.host || !env.mail.user || !env.mail.pass) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: {
        user: env.mail.user,
        pass: env.mail.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return transporter;
}

async function sendWithResend({ to, subject, text, html }) {
  const client = getResendClient();
  if (!client) {
    return null;
  }

  await client.emails.send({
    from: env.mail.from,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
  });

  return { deliveryMethod: 'resend' };
}

async function sendWithSmtp({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) {
    return null;
  }

  await mailer.sendMail({
    from: env.mail.from,
    to,
    subject,
    text,
    html,
  });

  return { deliveryMethod: 'smtp' };
}

async function sendMail({ to, subject, text, html }) {
  try {
    const resendResult = await sendWithResend({ to, subject, text, html });
    if (resendResult) {
      return resendResult;
    }
  } catch (error) {
    console.error('[MAIL:RESEND_ERROR]', error?.message || error);
  }

  try {
    const smtpResult = await sendWithSmtp({ to, subject, text, html });
    if (smtpResult) {
      return smtpResult;
    }
  } catch (error) {
    console.error('[MAIL:SMTP_ERROR]', error?.message || error);
  }

  console.info(`[MAIL:FALLBACK] To=${to} Subject=${subject}
${text}`);
  return { deliveryMethod: 'console' };
}

module.exports = {
  sendMail,
};
