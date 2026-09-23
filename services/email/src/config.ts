import nodemailer from "nodemailer";

// Add values here as the service grows.
export const DEFAULT_SENDER = process.env.DEFAULT_SENDER || "dev@noyonrahman.com";
export const SMTP_HOST = process.env.SMTP_HOST || "localhost";
export const SMTP_PORT = process.env.SMTP_PORT || "1025";
export const SMTP_USER = process.env.SMTP_USER || "dev@noyonrahman.com";
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "password";


// smtp transporter
export const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  // secure: false,
  // auth: {
  //   user: process.env.SMTP_USER,
  //   pass: process.env.SMTP_PASSWORD,
  // },
})