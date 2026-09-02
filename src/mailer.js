import nodemailer from 'nodemailer';

export async function sendAlert(settings, subject, text) {
  const { smtp, alertEmail } = settings;
  if (!alertEmail) throw new Error('E-mail de alerta não configurado');
  if (!smtp.host || !smtp.from) throw new Error('Servidor SMTP não configurado');
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: Number(smtp.port || 587),
    secure: Boolean(smtp.secure),
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000
  });
  await transporter.sendMail({ from: smtp.from, to: alertEmail, subject, text });
}
