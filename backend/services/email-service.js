// services/email-service.js
import nodemailer from 'nodemailer'

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.eu.mailgun.org',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // false для 587, true для 465
      auth: {
        user: process.env.SMTP_USER || 'margine-space@mg.margine-space.com',
        pass: process.env.SMTP_PASS || '45c21d77a43cff56e850a391cd9ede9b-45de04af-94595f87'
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      debug: false, // <-- это включает логи
      logger: false // <-- это включает debug-логи
    })
  }

  async sendEmail(to, subject, html, text = null, retries = 3) {
    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME || 'Margine Space'} <${process.env.SMTP_FROM_EMAIL || 'noreply@margine-space.com'}>`,
      to,
      subject,
      html,
      text: text || this.htmlToText(html)
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[EMAIL] Attempt ${attempt}/${retries} to send to: ${to}`)
        const result = await this.transporter.sendMail(mailOptions)
        console.log('[EMAIL] Sent successfully to:', to, 'MessageID:', result.messageId)
        return { success: true, messageId: result.messageId }
      } catch (error) {
        console.error(`[EMAIL] Attempt ${attempt} failed:`, error.message)
        if (attempt === retries) throw error
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
      }
    }
  }

   // Альтернативный метод через другой SMTP порт
   async sendEmailAlternative(to, subject, html, text = null) {
    const alternativeTransporter = nodemailer.createTransport({
      host: 'smtp.eu.mailgun.org',
      port: 465, // SSL порт
      secure: true,
      auth: {
        user: 'margine-space@mg.margine-space.com',
        pass: '45c21d77a43cff56e850a391cd9ede9b-45de04af-94595f87'
      },
      tls: {
        rejectUnauthorized: false
      }
    })

    const mailOptions = {
      from: 'Margine Space <noreply@margine-space.com>',
      to,
      subject,
      html,
      text: text || this.htmlToText(html)
    }

    try {
      const result = await alternativeTransporter.sendMail(mailOptions)
      console.log('[EMAIL] Alternative method successful:', result.messageId)
      return { success: true, messageId: result.messageId }
    } catch (error) {
      console.error('[EMAIL] Alternative method failed:', error.message)
      throw error
    }
  }


  async sendVerificationEmail(to, code, token) {
    const verifyUrl = `https://margine-space.com/verify?token=${token}`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Email Verification</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 30px; background: #f8f9fa; }
            .code { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; padding: 20px; background: white; border-radius: 5px; margin: 20px 0; border: 2px dashed #007bff; }
            .button { display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 Margine Space</h1>
                <h2>Email Verification</h2>
            </div>
            <div class="content">
                <p>Welcome to Margine Space!</p>
                <p>To complete your registration, please enter the verification code:</p>
                <div class="code">${code}</div>
                <p>Or click the button below:</p>
                <p style="text-align: center;">
                    <a href="${verifyUrl}" class="button">✅ Verify Email</a>
                </p>
                <p><small>The link is valid for 24 hours</small></p>
            </div>
            <div class="footer">
                <p>© 2025 Margine Space. All rights reserved.</p>
                <p>If you did not register, simply ignore this email.</p>
            </div>
        </div>
    </body>
    </html>`;
    console.log(`[EMAIL] Sent verification code ${code} to ${to}`);
    console.log(`[EMAIL] Message:`, html);
    return await this.sendEmail(to, process.env.EMAIL_VERIFICATION_SUBJECT || 'Email Verification', html);
  }

  async sendPasswordResetEmail(to, token) {
    const resetUrl = `https://margine-space.com/reset-password?token=${token}`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Password Reset</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { padding: 30px; background: #f8f9fa; }
            .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; padding: 20px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Margine Space</h1>
                <h2>Password Reset</h2>
            </div>
            <div class="content">
                <p>You have requested to reset your account password.</p>
                <p>Click the button below to create a new password:</p>
                <p style="text-align: center;">
                    <a href="${resetUrl}" class="button">🔑 Reset Password</a>
                </p>
                <p><small>The link is valid for 1 hour</small></p>
                <p>If you did not request a password reset, simply ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2025 Margine Space. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>`;
    console.log(`[EMAIL] Sent password reset link to ${to}: ${resetUrl}`);
    console.log(`[EMAIL] Message:`, html);
    return await this.sendEmail(to, process.env.PASSWORD_RESET_SUBJECT || 'Password Reset', html);
  }

 // Конвертация HTML в текст
 htmlToText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

// Проверка соединения с детальной диагностикой
async verifyConnection() {
  try {
    console.log('[EMAIL] Testing SMTP connection to smtp.eu.mailgun.org:587...')
    await this.transporter.verify()
    console.log('[EMAIL] ✅ SMTP connection verified successfully')
    return true
  } catch (error) {
    console.error('[EMAIL] ❌ Primary SMTP connection failed:', error.message)
    
    // Пробуем альтернативный порт
    try {
      console.log('[EMAIL] Testing alternative SMTP connection on port 465...')
      const altTransporter = nodemailer.createTransport({
        host: 'smtp.eu.mailgun.org',
        port: 465,
        secure: true,
        auth: {
          user: 'margine-space@mg.margine-space.com',
          pass: '45c21d77a43cff56e850a391cd9ede9b-45de04af-94595f87'
        }
      })
      
      await altTransporter.verify()
      console.log('[EMAIL] ✅ Alternative SMTP connection successful')
      return true
    } catch (altError) {
      console.error('[EMAIL] ❌ Alternative SMTP also failed:', altError.message)
      return false
    }
  }
}
}

export default new EmailService()