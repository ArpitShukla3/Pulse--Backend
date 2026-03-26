import { configDotenv } from "dotenv";
import nodemailer from "nodemailer";

configDotenv();

const sendEmail = async (to: string, subject: string, message: string): Promise<void> => {
  console.log(`Sending email to ${to} with subject "${subject}" and message: ${message}`);

  const senderEmail = process.env.EMAIL_USER || "";
  const appPassword = process.env.EMAIL_PASS || "";

  if (!senderEmail) {
    throw new Error("EMAIL_USER is required");
  }

  if (!appPassword) {
    throw new Error("EMAIL_PASS is required");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: senderEmail,
      pass: appPassword
    }
  });

  // const response = await transporter.sendMail({
  //   from: senderEmail,
  //   to,
  //   subject,
  //   text: message
  // });

  // console.log("Nodemailer response:", response.response);
};

export default sendEmail;
