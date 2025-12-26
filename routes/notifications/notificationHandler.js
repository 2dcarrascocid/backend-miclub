import { sendEmail } from './emailService.js';
import { getTemplate } from './templates/index.js';

export const sendNotification = async (event) => {
  try {
    // Soporta invocación directa (payload objeto) o vía HTTP (event.body string)
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || event);
    const { type, recipient, data } = body;

    if (!type || !recipient) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Type and recipient are required' })
      };
    }

    console.log(`[NotificationHandler] Processing ${type} for ${recipient}`);

    const template = getTemplate(type, data || {});
    const result = await sendEmail({
      to: recipient,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Notification sent successfully', id: result.messageId })
    };

  } catch (error) {
    console.error("Notification Handler Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message })
    };
  }
};
