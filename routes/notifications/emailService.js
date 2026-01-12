import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async ({ to, subject, html, text }) => {
  // console.log(`[EmailService] Attempting to send email to ${to}`);
  // console.log(`[EmailService] Config: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}, User=${process.env.SMTP_USER}`);
  
  try {
    // If mocking is enabled or credentials are missing, just log
    if (process.env.MOCK_EMAIL === 'true' || !process.env.SMTP_HOST) {
      console.log(`[EmailService] MOCK SEND:
        To: ${to}
        Subject: ${subject}
        Content: ${text || html}
      `);
      return { success: true, messageId: 'mock-id-' + Date.now() };
    }

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"MiClub" <noreply@miclub.com>',
      to,
      subject,
      text,
      html,
    });
    // console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email: ", error);
    return { success: false, error: error.message };
  }
};
