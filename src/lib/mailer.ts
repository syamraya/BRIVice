import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  // 👇 Tambah opsi ini untuk meningkatkan reputasi
  headers: {
    'X-Mailer': 'BRIVice Office Reminder',
    'X-Priority': '3', // Normal priority
  }
});