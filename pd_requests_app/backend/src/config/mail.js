import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email, code) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: "Код подтверждения регистрации",
    text: `Ваш код подтверждения регистрации: ${code}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Подтверждение регистрации</h2>
        <p>Ваш код подтверждения:</p>
        <h1 style="letter-spacing:4px">${code}</h1>
        <p>Код действует 10 минут.</p>
      </div>
    `,
  });
}
