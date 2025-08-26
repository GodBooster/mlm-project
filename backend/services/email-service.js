// services/email-service.js
import nodemailer from 'nodemailer'

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.eu.mailgun.org',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // false для 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER || 'resend',
        pass: process.env.SMTP_PASS || 're_iN7pDkP8_54RfiVzgh8nk4aJoAsmZ14vC'
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
      debug: false,
      logger: false
    })
  }

  async sendEmail(to, subject, html, text = null, retries = 3) {
    // Send via Resend SMTP
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'MargineSpace'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@margine-space.com'}>`,
      to,
      subject,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'MargineSpace Mailer v2.0',
        'X-Report-Abuse': 'Please report abuse here: abuse@margine-space.com',
        'List-Unsubscribe': '<mailto:unsubscribe@margine-space.com>',
        'Precedence': 'bulk',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'X-Campaign': 'user-notification',
        'X-Entity-Ref-ID': 'notification-' + Date.now()
      },
      priority: 'normal',
      messageId: `<notification-${Date.now()}@margine-space.com>`,
      references: ['<notifications@margine-space.com>'],
      inReplyTo: '<notifications@margine-space.com>',
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




  async sendVerificationEmail(to, code, token) {
    // Use localhost for development, production URL for production
    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://margine-space.com' : 'http://localhost:5173';
    const verifyUrl = `${baseUrl}/verify?token=${token}`;
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Margine Space - Email Verification</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f5f5;
                color: #333333;
                line-height: 1.6;
                padding: 20px;
                margin: 0;
            }
            
            .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                border: 1px solid #e0e0e0;
            }
            
            .header {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #f97316 100%);
                padding: 40px 30px;
                text-align: center;
                color: #ffffff;
                position: relative;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #f97316, #ea580c, #dc2626);
            }
            
            .logo {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                border-radius: 16px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(255,255,255,0.3);
                box-shadow: 0 4px 15px rgba(249,115,22,0.4);
            }
            
            .logo::before {
                content: '';
                width: 32px;
                height: 32px;
                background: #000000;
                border-radius: 4px;
            }
            
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
                color: #ffffff;
            }
            
            .header p {
                color: rgba(255,255,255,0.9);
                font-size: 16px;
            }
            
            .content {
                padding: 40px 30px;
                background-color: #ffffff;
                color: #333333;
            }
            
            .welcome-text {
                font-size: 18px;
                color: #333333;
                text-align: center;
                margin-bottom: 30px;
                font-weight: 500;
            }
            
            .verification-section {
                background-color: #f8f9fa;
                border: 2px solid #f97316;
                border-radius: 12px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
            }
            
            .verification-section h2 {
                color: #f97316;
                margin-bottom: 16px;
                font-size: 20px;
                font-weight: 600;
            }
            
            .verification-section p {
                color: #666666;
                margin-bottom: 20px;
                font-size: 16px;
            }
            
            .verification-code {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                color: #f97316;
                font-size: 36px;
                font-weight: 900;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                letter-spacing: 6px;
                border: 2px solid #f97316;
                font-family: 'Courier New', monospace;
                display: inline-block;
            }
            
            .code-help {
                color: #888888;
                font-size: 14px;
                margin-top: 16px;
            }
            
            .divider {
                text-align: center;
                margin: 30px 0;
                position: relative;
            }
            
            .divider::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 0;
                right: 0;
                height: 1px;
                background-color: #e0e0e0;
            }
            
            .divider span {
                background-color: #ffffff;
                padding: 8px 20px;
                color: #888888;
                font-size: 14px;
                position: relative;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                color: #ffffff !important;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(249,115,22,0.3);
                transition: all 0.3s ease;
                border: none;
            }
            
            .cta-button:hover {
                background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(249,115,22,0.4);
                color: #ffffff !important;
                text-decoration: none;
            }
            
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            
            .security-note {
                background-color: #fff3cd;
                border: 1px solid #f97316;
                border-left: 4px solid #f97316;
                padding: 20px;
                margin: 30px 0;
                border-radius: 4px;
            }
            
            .security-note h3 {
                color: #f97316;
                font-size: 16px;
                margin-bottom: 8px;
                font-weight: 600;
            }
            
            .security-note p {
                color: #333333;
                font-size: 14px;
                margin: 0;
            }
            
            .footer {
                padding: 30px;
                text-align: center;
                background-color: #f8f9fa;
                border-top: 1px solid #e0e0e0;
                color: #666666;
            }
            
            .footer p {
                margin: 8px 0;
                font-size: 14px;
            }
            
            .footer a {
                color: #f97316;
                text-decoration: none;
                font-weight: 500;
            }
            
            .footer a:hover {
                text-decoration: underline;
            }
            
            .footer strong {
                color: #333333;
            }
            
            @media (max-width: 640px) {
                body { padding: 10px; }
                .header { padding: 30px 20px; }
                .content { padding: 30px 20px; }
                .verification-code { font-size: 28px; padding: 16px; letter-spacing: 4px; }
                .footer { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="header">
                <div class="logo"></div>
                <h1>Margine Space</h1>
                <p>Investment Platform</p>
            </div>
            
            <div class="content">
                <p class="welcome-text">
                    Welcome to Margine Space! 🚀<br>
                    You're just one step away from accessing your investment dashboard.
                </p>
                
                <div class="verification-section">
                    <h2>Email Verification Required</h2>
                    <p>Please use the verification code below to complete your registration:</p>
                    <div class="verification-code">${code}</div>
                    <p class="code-help">Enter this code in the verification window</p>
                </div>
                
                <div class="divider">
                    <span>Or click the button below</span>
                </div>
                
                <div class="button-container">
                    <a href="${verifyUrl}" class="cta-button">
                        ✨ Verify Email Instantly
                    </a>
                </div>
                
                <div class="security-note">
                    <h3>🔒 Security Information</h3>
                    <p>This verification link expires in <strong>3 minutes</strong> for your security. If you didn't create an account with Margine Space, please ignore this email.</p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>© 2025 Margine Space</strong></p>
                <p>Professional Investment Platform</p>
                <p>If you have any questions, contact our support team.</p>
                <p><a href="mailto:support@margine-space.com">support@margine-space.com</a></p>
            </div>
        </div>
    </body>
    </html>`;
    try {
        console.log(`[EMAIL] Attempting to send verification email to: ${to}`);
        const result = await this.transporter.sendMail({
            from: `${process.env.SMTP_FROM_NAME || 'Margine Space'} <${process.env.SMTP_FROM_EMAIL || 'noreply@margine-space.com'}>`,
            to,
            subject: process.env.EMAIL_VERIFICATION_SUBJECT || 'Email Verification',
            html,
            // text: this.htmlToText(html) // убираем text, чтобы не было ReferenceError
        });
        console.log(`[EMAIL] ✅ Verification email sent successfully to: ${to} | MessageID: ${result.messageId}`);
        return result;
    } catch (e) {
        console.error(`[EMAIL] ❌ Failed to send verification email to: ${to}:`, e.message);
        console.error(`[EMAIL] ❌ Full error:`, e);
        // Выводим MOCK лог для совместимости
        console.log(`[EMAIL] MOCK EMAIL TO: ${to} | CODE: ${code}`);
        throw e; // Пробрасываем ошибку дальше
    }
  }

  async sendPasswordResetEmail(to, token) {
    // Use localhost for development, production URL for production  
    const baseUrl = process.env.NODE_ENV === 'production' ? 'https://margine-space.com' : 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    // Улучшенные заголовки для избежания спама
    const mailOptions = {
      from: `"Margine Space Security" <${process.env.SMTP_FROM_EMAIL || 'noreply@margine-space.com'}>`,
      to,
      subject: '🔐 Password Reset Request - Margine Space',
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        'X-Mailer': 'Margine Space Security Mailer',
        'X-Report-Abuse': 'Please report abuse here: abuse@margine-space.com',
        'List-Unsubscribe': '<mailto:unsubscribe@margine-space.com>',
        'Precedence': 'bulk',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
        'X-Campaign': 'password-reset',
        'X-Entity-Ref-ID': 'password-reset-' + Date.now()
      },
      priority: 'normal',
      messageId: `<password-reset-${Date.now()}@margine-space.com>`,
      references: ['<security@margine-space.com>'],
      inReplyTo: '<security@margine-space.com>'
    };
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Margine Space - Password Reset</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
                background-color: #f5f5f5;
                color: #333333;
                line-height: 1.6;
                padding: 20px;
                margin: 0;
            }
            
            .email-wrapper {
                max-width: 600px;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                border: 1px solid #e0e0e0;
            }
            
            .header {
                background: linear-gradient(135deg, #dc2626 0%, #2d2d2d 50%, #f97316 100%);
                padding: 40px 30px;
                text-align: center;
                color: #ffffff;
                position: relative;
            }
            
            .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: linear-gradient(90deg, #dc2626, #f97316, #ea580c);
            }
            
            .logo {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);
                border-radius: 16px;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid rgba(255,255,255,0.3);
                box-shadow: 0 4px 15px rgba(220,38,38,0.4);
                font-size: 32px;
            }
            
            .logo::before {
                content: '🔐';
            }
            
            .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 8px;
                color: #ffffff;
            }
            
            .header p {
                color: rgba(255,255,255,0.9);
                font-size: 16px;
            }
            
            .content {
                padding: 40px 30px;
                background-color: #ffffff;
                color: #333333;
            }
            
            .alert-section {
                background-color: #fef2f2;
                border: 2px solid #dc2626;
                border-left: 4px solid #dc2626;
                border-radius: 12px;
                padding: 24px;
                margin: 30px 0;
                text-align: center;
            }
            
            .alert-section h2 {
                color: #dc2626;
                font-size: 22px;
                margin-bottom: 12px;
                font-weight: 600;
            }
            
            .alert-section p {
                color: #333333;
                font-size: 16px;
                margin-bottom: 20px;
            }
            
            .reset-info {
                background-color: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 12px;
                padding: 30px;
                margin: 30px 0;
                text-align: center;
            }
            
            .reset-info h3 {
                color: #f97316;
                font-size: 18px;
                margin-bottom: 16px;
                font-weight: 600;
            }
            
            .reset-info p {
                color: #666666;
                font-size: 16px;
                margin-bottom: 24px;
            }
            
            .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #dc2626 0%, #f97316 100%);
                color: #ffffff !important;
                text-decoration: none;
                padding: 18px 36px;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(220,38,38,0.3);
                transition: all 0.3s ease;
                border: none;
            }
            
            .cta-button:hover {
                background: linear-gradient(135deg, #b91c1c 0%, #ea580c 100%);
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(220,38,38,0.4);
                color: #ffffff !important;
                text-decoration: none;
            }
            
            .button-container {
                text-align: center;
                margin: 30px 0;
            }
            
            .timer-section {
                background-color: #fff7ed;
                border: 1px solid #f97316;
                border-radius: 12px;
                padding: 20px;
                margin: 30px 0;
                text-align: center;
            }
            
            .timer-section .timer {
                color: #f97316;
                font-size: 24px;
                font-weight: 700;
                margin: 10px 0;
                font-family: 'Courier New', monospace;
            }
            
            .timer-section p {
                color: #333333;
                font-size: 14px;
                font-weight: 500;
            }
            
            .security-warning {
                background-color: #fef2f2;
                border: 1px solid #dc2626;
                border-left: 4px solid #dc2626;
                padding: 20px;
                margin: 30px 0;
                border-radius: 4px;
            }
            
            .security-warning h3 {
                color: #dc2626;
                font-size: 16px;
                margin-bottom: 8px;
                font-weight: 600;
            }
            
            .security-warning p {
                color: #333333;
                font-size: 14px;
                margin: 8px 0;
            }
            
            .security-warning strong {
                color: #dc2626;
            }
            
            .footer {
                padding: 30px;
                text-align: center;
                background-color: #f8f9fa;
                border-top: 1px solid #e0e0e0;
                color: #666666;
            }
            
            .footer p {
                margin: 8px 0;
                font-size: 14px;
            }
            
            .footer a {
                color: #f97316;
                text-decoration: none;
                font-weight: 500;
            }
            
            .footer a:hover {
                text-decoration: underline;
            }
            
            .footer strong {
                color: #333333;
            }
            
            @media (max-width: 640px) {
                body { padding: 10px; }
                .header { padding: 30px 20px; }
                .content { padding: 30px 20px; }
                .cta-button { padding: 16px 28px; font-size: 15px; }
                .footer { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="header">
                <div class="logo"></div>
                <h1>Margine Space</h1>
                <p>Password Recovery</p>
            </div>
            
            <div class="content">
                <div class="alert-section">
                    <h2>🔐 Password Reset Request</h2>
                    <p>We received a request to reset the password for your Margine Space account.</p>
                </div>
                
                <div class="reset-info">
                    <h3>Reset Your Password</h3>
                    <p>Click the button below to set a new password for your account. You'll be redirected to a secure page where you can enter your new password.</p>
                    
                    <div class="button-container">
                        <a href="${resetUrl}" class="cta-button">
                            🔑 Reset Password Now
                        </a>
                    </div>
                </div>
                
                <div class="timer-section">
                    <p><strong>⏰ Time Remaining</strong></p>
                    <div class="timer">3 Minutes</div>
                    <p>This reset link will expire for your security</p>
                </div>
                
                <div class="security-warning">
                    <h3>🛡️ Security Notice</h3>
                    <p><strong>Important:</strong> If you didn't request this password reset, please ignore this email. Your account remains secure.</p>
                    <p><strong>For your protection:</strong> No withdrawals will be permitted for 24 hours after password change.</p>
                    <p><strong>Need help?</strong> Contact our support team if you have any concerns about your account security.</p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>© 2025 Margine Space</strong></p>
                <p>Professional Investment Platform</p>
                <p>If you have questions about account security:</p>
                <p><a href="mailto:security@margine-space.com">security@margine-space.com</a></p>
            </div>
        </div>
    </body>
    </html>`;
    try {
        console.log(`[EMAIL] Attempting to send password reset email to: ${to}`);
        const result = await this.transporter.sendMail({
            from: `${process.env.SMTP_FROM_NAME || 'Margine Space'} <${process.env.SMTP_FROM_EMAIL || 'noreply@margine-space.com'}>`,
            to,
            subject: process.env.PASSWORD_RESET_SUBJECT || 'Password Reset',
            html,
            // text: this.htmlToText(html)
        });
        console.log(`[EMAIL] ✅ Password reset email sent successfully to: ${to} | MessageID: ${result.messageId}`);
        // Логируем успешную отправку согласно паттерну
        console.log(`|mlm-backend  | [EMAIL] MOCK EMAIL TO: ${to} | CODE: ${token}`);
        return result;
    } catch (e) {
        console.error(`[EMAIL] ❌ Failed to send password reset email to: ${to}:`, e.message);
        console.error(`[EMAIL] ❌ Full error:`, e);
        // При ошибке также логируем согласно паттерну
        console.log(`|mlm-backend  | [EMAIL] MOCK EMAIL TO: ${to} | CODE: ${token}`);
        throw e; // Пробрасываем ошибку дальше
    }
  }

 // Конвертация HTML в текст
 htmlToText(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

// Проверка соединения с детальной диагностикой
async verifyConnection() {
  try {
    console.log('[EMAIL] Testing SMTP connection to mail.margine-space.com:587...')
    await this.transporter.verify()
    console.log('[EMAIL] ✅ SMTP connection verified successfully')
    return true
  } catch (error) {
    console.error('[EMAIL] ❌ Primary SMTP connection failed:', error.message)
    
    // Пробуем альтернативный порт
    try {
      console.log('[EMAIL] Testing alternative SMTP connection on port 465...')
      const altTransporter = nodemailer.createTransport({
        host: 'mail.margine-space.com',
        port: 465,
        secure: true,
        auth: {
          user: 'mlmuser',
          pass: 'CoRK4gsQaUm6'
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

// Экспортируем функции для использования в очередях
export const sendEmail = async (to, subject, text, html) => {
  const emailService = new EmailService();
  return await emailService.sendEmail(to, subject, html, text);
};

export const sendVerificationEmail = async (to, code, token) => {
  const emailService = new EmailService();
  return await emailService.sendVerificationEmail(to, code, token);
};

export const sendPasswordResetEmail = async (to, token) => {
  const emailService = new EmailService();
  return await emailService.sendPasswordResetEmail(to, token);
};

export default new EmailService()