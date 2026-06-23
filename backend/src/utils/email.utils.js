import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
});

const SendEmail = async (to, subject, message) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to,
        subject,
        text: message
    }

    const mailSend = await transporter.sendMail(mailOptions);

    return mailSend;
}

const sendWelcomeEmail = async (to, username) => {
    const subject = "Welcome aboard! 🎉";
    const message = `Hi ${username},\n\nWelcome! Your account has been created successfully.\n\nWe're glad to have you with us.\n\nCheers,\nThe Team`;

    return await SendEmail(to, subject, message);
}

export { SendEmail, sendWelcomeEmail };
