const nodemailer = require('nodemailer');
const env = require('../../config/env');

let transporter = null;

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
    });
  }

  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const mailer = getTransporter();

  if (!mailer) {
    console.info(`[MAIL:FALLBACK] To=${to} Subject=${subject}\n${text}`);
    return { deliveryMethod: 'console' };
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

module.exports = {
  sendMail,
};
