import cors from 'cors';
import 'dotenv/config';
import express from 'express'
import bcrypt from 'bcrypt'
import multer from 'multer'
import { PrismaClient, TransactionStatus, PositionStatus } from '@prisma/client'
import scheduler from './jobs/scheduler.js'
import investmentService from './services/investment-service.js'
import referralService from './services/referral-service.js'
import rankService from './services/rank-service.js'
import rankRewardService, { MLM_RANKS } from './services/rank-reward-service.js'
import { authenticateToken, generateToken } from './middleware/auth.js'
import nodemailer from 'nodemailer'
import crypto from 'crypto'
import emailService from './services/email-service.js'

const prisma = new PrismaClient()
const app = express()
app.use(express.json());

// Simple working CORS
const allowedOrigins = [
  'https://margine-space.com',
  'https://transgresse.netlify.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, Origin');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Multer configuration
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
});

// Start scheduler once
scheduler.start().catch(console.error)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MLM Backend is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'connected',
    port: process.env.PORT || 3000,
    version: '1.0.0',
    env: process.env.NODE_ENV,
    memory: process.memoryUsage()
  })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MLM Backend API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: [
      '/api/health',
      '/api/packages',
      '/api/users',
      '/api/investments',
      '/api/transactions'
    ]
  })
})

// Referral invite route - redirect to frontend
app.get('/invite/:code', (req, res) => {
  const { code } = req.params;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/invite/${code}`);
})

// Email sending utility
// Email sending utility
async function sendVerificationEmail(to, code, token) {
  // Настройка транспорта
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const verifyUrl = `https://margine-space.com/verify?token=${token}`;
  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification</title>
      <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #181818 0%, #23272f 40%, #f97316 100%);
            min-height: 100vh;
            padding: 20px;
            line-height: 1.6;
            position: relative;
          }
          body::before {
            content: '';
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 0;
            background: repeating-radial-gradient(circle at 20% 30%, rgba(249,115,22,0.07) 0, rgba(249,115,22,0.07) 2px, transparent 3px, transparent 100px), repeating-radial-gradient(circle at 80% 70%, rgba(234,88,12,0.06) 0, rgba(234,88,12,0.06) 2px, transparent 3px, transparent 120px);
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            border-radius: 24px;
            box-shadow: 0 25px 60px rgba(249, 115, 34, 0.18), 0 2px 8px rgba(30, 41, 59, 0.10);
            border: 2.5px solid #f97316;
            border-bottom: 4px solid #ea580c;
            border-top: 2.5px solid #23272f;
            overflow: hidden;
            position: relative;
            z-index: 1;
          }
          .header {
            background: linear-gradient(135deg, #181818 0%, #23272f 30%, #f97316 100%);
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
            border-bottom: 2px solid #ea580c;
            box-shadow: 0 4px 24px rgba(249, 115, 34, 0.10);
          }
          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(249, 115, 34, 0.12) 2px, transparent 2px);
            background-size: 20px 20px;
            animation: float 20s linear infinite;
          }
          @keyframes float { 0% { transform: rotate(0deg) translateX(0px) translateY(0px); } 100% { transform: rotate(360deg) translateX(0px) translateY(0px); } }
          .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
            font-weight: bold;
            backdrop-filter: blur(10px);
            border: 3px solid #fff7ed;
            border-bottom: 3px solid #ea580c;
            position: relative;
            z-index: 1;
            box-shadow: 0 10px 30px rgba(249, 115, 34, 0.3);
          }
          .header h1 { color: white; font-size: 28px; font-weight: 600; margin-bottom: 10px; position: relative; z-index: 1; }
          .header p { color: rgba(255, 255, 255, 0.93); font-size: 16px; position: relative; z-index: 1; }
          .content { padding: 50px 40px; text-align: center; }
          .welcome-text { font-size: 18px; color: #374151; margin-bottom: 30px; font-weight: 400; }
          .verification-code {
            background: linear-gradient(135deg, #181818 0%, #23272f 50%, #f97316 100%);
            color: white;
            font-size: 32px;
            font-weight: bold;
            padding: 20px 40px;
            border-radius: 15px;
            margin: 30px 0;
            display: inline-block;
            letter-spacing: 8px;
            box-shadow: 0 10px 30px rgba(249, 115, 34, 0.3);
            border: 2.5px solid #f97316;
            border-bottom: 3px solid #ea580c;
            backdrop-filter: blur(10px);
            position: relative;
            overflow: hidden;
          }
          .verification-code::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(249, 115, 34, 0.3), transparent);
            animation: shine 3s infinite;
          }
          @keyframes shine { 0% { left: -100%; } 50% { left: 100%; } 100% { left: 100%; } }
          .instruction { font-size: 16px; color: #6b7280; margin: 30px 0; line-height: 1.8; }
          .cta-button {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 16px 40px;
            border: none;
            border-radius: 50px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
            box-shadow: 0 8px 25px rgba(249, 115, 34, 0.3);
            position: relative;
            overflow: hidden;
            border: 2px solid #f97316;
            border-bottom: 2.5px solid #ea580c;
          }
          .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(249, 115, 34, 0.4);
            background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
            border-bottom: 3px solid #dc2626;
          }
          .cta-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s;
          }
          .cta-button:hover::before { left: 100%; }
          .divider {
            width: 60px;
            height: 4px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            margin: 40px auto;
            border-radius: 2px;
            box-shadow: 0 2px 8px rgba(249, 115, 34, 0.15);
            border: 1.5px solid #ea580c;
          }
          .footer {
            background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
            padding: 30px 40px;
            text-align: center;
            border-top: 2px solid #f97316;
            box-shadow: 0 -2px 12px rgba(249, 115, 34, 0.07);
          }
          .footer p { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
          .footer a { color: #f97316; text-decoration: none; font-weight: 500; }
          .footer a:hover { text-decoration: underline; }
          .security-info {
            background: linear-gradient(135deg, rgba(249, 115, 34, 0.1) 0%, rgba(234, 88, 12, 0.05) 100%);
            border-left: 4px solid #f97316;
            padding: 20px;
            margin: 30px 0;
            border-radius: 0 10px 10px 0;
            box-shadow: 0 2px 8px rgba(249, 115, 34, 0.08);
            border-bottom: 1.5px solid #ea580c;
          }
          .security-info h3 { color: #ea580c; font-size: 16px; margin-bottom: 10px; font-weight: 600; }
          .security-info p { color: #4b5563; font-size: 14px; margin: 0; }
          .social-links { margin: 20px 0; }
          .social-links a {
            display: inline-block;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            text-decoration: none;
            border-radius: 50%;
            line-height: 40px;
            margin: 0 5px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(249, 115, 34, 0.2);
            border: 1.5px solid #ea580c;
          }
          .social-links a:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(249, 115, 34, 0.4);
            background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
            border-bottom: 2px solid #dc2626;
          }
          @media (max-width: 640px) {
            .email-container { margin: 10px; border-radius: 15px; }
            .header { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .content { padding: 40px 20px; }
            .verification-code { font-size: 24px; padding: 15px 25px; letter-spacing: 4px; }
            .footer { padding: 20px; }
          }
      </style>
  </head>
  <body>
      <div class="email-container">
          <div class="header">
              <div class="logo">✓</div>
              <h1>Welcome!</h1>
              <p>Just one step left to activate your account</p>
          </div>
          <div class="content">
              <p class="welcome-text">
                  Thank you for registering on our platform!
                  <br>Please use the code below to verify your email address.
              </p>
              <div class="verification-code">
                  ${code}
              </div>
              <p class="instruction">
                  Enter this code on the verification page to activate your account.
                  <br><strong>The code is valid for 1 minute.</strong>
              </p>
              <a href="${verifyUrl}" class="cta-button">Verify Account</a>
              <div class="divider"></div>
              <div class="security-info">
                  <h3>🔒 Security Questions?</h3>
                  <p>If you did not register on our website, simply ignore this email. Your email address will not be verified without entering the code.</p>
              </div>
          </div>
          <div class="footer">
              <div class="social-links">
                  <a href="#">f</a>
                  <a href="#">t</a>
                  <a href="#">i</a>
                  <a href="#">@</a>
              </div>
              <p>
                  This is an automated message, no need to reply.
              </p>
              <p>
                  If you have any questions, contact us: 
                  <a href="mailto:support@mlm.transgresse.com">support@mlm.transgresse.com</a>
              </p>
              <p>
                  <a href="#">Unsubscribe</a> | 
                  <a href="#">Privacy Policy</a> | 
                  <a href="#">Terms of Service</a>
              </p>
          </div>
      </div>
  </body>
  </html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'MLM Transgresse <no-reply@mlm.transgresse.com>',
    to,
    subject: 'Email Verification — MLM Transgresse',
    html,
    text: `Thank you for registering on MLM Transgresse!\n\nTo verify your email, use this code: ${code}\n\nIf you did not register, simply ignore this email.\n\nBest regards,\nThe MLM Transgresse Team`,
  };

  // Отправка письма
  try {
    await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Verification email sent to', email, 'token:', token)
    console.log(`[EMAIL] Verification email sent to ${to}`);
  } catch (e) {
    console.error('[EMAIL] Failed to send verification email:', e);
    // Для теста — просто выводим письмо в консоль
    console.log('[EMAIL] MOCK EMAIL TO:', to, '\nSUBJECT:', mailOptions.subject, '\nBODY:', code);
  }
}

// Authentication routes
app.post('/api/register', async (req, res) => {
  try {
    const { email, name, username, password, referralId } = req.body
    const userName = username || name || email.split('@')[0]; // Use name if provided, otherwise use email prefix

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username: userName }
        ]
      }
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email or username already exists' })
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    // Generate unique token for link
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Store verification code and token temporarily (in production, use Redis or database)
    if (!global.verificationCodes) global.verificationCodes = new Map()
    global.verificationCodes.set(email, {
      code: verificationCode,
      token: verificationToken,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      userData: { email, name: userName, password, referralId }
    })

    // Use new email service
    await emailService.sendVerificationEmail(email, verificationCode, verificationToken)

    res.json({ success: true, message: 'Verification code and link sent to your email' })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ error: 'Failed to register user' })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Generate token
    const token = generateToken(user)

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.json({
      token,
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

app.post('/api/reset-password', async (req, res) => {
  try {
    const { email } = req.body

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Generate reset token (simple implementation - in production use proper token generation)
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    // Store reset token in user record (you might want to add a resetToken field to your schema)
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        // For now, we'll use a simple approach. In production, add resetToken and resetTokenExpiry fields
        // resetToken: resetToken,
        // resetTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    })

    // Use new email service
    await emailService.sendPasswordResetEmail(email, resetToken)
    
    res.json({ 
      success: true, 
      message: 'Password reset instructions have been sent to your email' 
    })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Failed to process password reset' })
  }
})

app.post('/api/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body

    // Check if verification code exists and is valid
    if (!global.verificationCodes || !global.verificationCodes.has(email)) {
      return res.status(400).json({ error: 'Invalid or expired verification code' })
    }

    const verificationData = global.verificationCodes.get(email)
    
    // Check if code is expired
    if (Date.now() > verificationData.expires) {
      global.verificationCodes.delete(email)
      return res.status(400).json({ error: 'Verification code has expired' })
    }

    // Check if code matches
    if (verificationData.code !== code) {
      return res.status(400).json({ error: 'Invalid verification code' })
    }

    // Get user data from verification
    const { userData } = verificationData

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    

    // Generate referral code
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Create user
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        username: userData.name,
        password: hashedPassword,
        referralCode,
        referredBy: userData.referralId || null
      }
    })

    // Process referral if referralId provided
    if (userData.referralId) {
      try {
        // Find referrer by referral code or ID
        const referrer = await prisma.user.findFirst({
          where: {
            OR: [
              { referralCode: userData.referralId },
              { id: parseInt(userData.referralId) || 0 }
            ]
          }
        });
        
        if (referrer) {
          await referralService.processReferral(user.id, referrer.referralCode)
        } else {
          console.error('Referrer not found for code/ID:', userData.referralId)
        }
      } catch (error) {
        console.error('Referral processing failed:', error)
      }
    }

    // Clean up verification data
    global.verificationCodes.delete(email)

    // Generate token
    const token = generateToken(user)

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user

    res.json({
      success: true,
      token,
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Email verification error:', error)
    res.status(500).json({ error: 'Email verification failed' })
  }
})

app.get('/api/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  try {
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gte: new Date() },
      },
    });
    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });
    // Редирект на красивую страницу фронта
    return res.redirect('https://transgresse.netlify.app/email-verified');
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        investments: {
          include: {
            package: true
          }
        },
        transactions: true
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    res.json(userWithoutPassword)
  } catch (error) {
    console.error('Profile error:', error)
    res.status(500).json({ error: 'Failed to get profile' })
  }
})

// Get user wallet
app.get('/api/wallet', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { wallet: true }
    })

    res.json({ wallet: user?.wallet || '' })
  } catch (error) {
    console.error('Get wallet error:', error)
    res.status(500).json({ error: 'Failed to get wallet' })
  }
})

// Update user wallet
app.post('/api/wallet', authenticateToken, async (req, res) => {
  try {
    const { wallet } = req.body

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { wallet: wallet || '' }
    })

    res.json({ 
      success: true, 
      wallet: updatedUser.wallet,
      message: 'Wallet updated successfully'
    })
  } catch (error) {
    console.error('Update wallet error:', error)
    res.status(500).json({ error: 'Failed to update wallet' })
  }
})

app.post('/api/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body
    const userId = req.user.id

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'DEPOSIT',
        amount: parseFloat(amount),
        description: 'Deposit',
        status: 'COMPLETED'
      }
    })

    // Update user balance
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: parseFloat(amount)
        }
      }
    })

    res.json({ 
      success: true, 
      balance: updatedUser.balance,
      transaction 
    })
  } catch (error) {
    console.error('Deposit error:', error)
    res.status(500).json({ error: 'Deposit failed' })
  }
})

app.post('/api/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount, wallet } = req.body
    const userId = req.user.id

    // Validate input
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' })
    }

    // Check if user has enough balance
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (user.balance < parseFloat(amount)) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    // Update user wallet with any value provided
    if (wallet !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { wallet: wallet || '' }
      })
    }

    // Create withdrawal transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        amount: parseFloat(amount),
        description: `Withdrawal to ${wallet}`,
        status: 'PENDING',
        wallet: wallet || '' // сохраняем кошелек в поле wallet
      }
    })

    // Update user balance
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          decrement: parseFloat(amount)
        }
      }
    })

    console.log(`[WITHDRAWAL] User ${user.username} requested withdrawal of $${amount} to wallet ${wallet}`)

    res.json({ 
      success: true, 
      balance: updatedUser.balance,
      transaction,
      message: 'Withdrawal request submitted successfully'
    })
  } catch (error) {
    console.error('Withdraw error:', error)
    res.status(500).json({ error: 'Withdrawal failed' })
  }
})

app.get('/api/transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      include: {
        investment: {
          include: {
            package: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json(transactions)
  } catch (error) {
    console.error('Transactions error:', error)
    res.status(500).json({ error: 'Failed to get transactions' })
  }
})

app.get('/api/packages', async (req, res) => {
  try {
    const packages = await prisma.investmentPackage.findMany({
      where: { isActive: true }
    })
    
    // Add percent field with monthlyYield value
    const formattedPackages = packages.map(pkg => ({
      ...pkg,
      percent: pkg.monthlyYield
    }))
    
    res.json(formattedPackages)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/referral-link', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { referralCode: true }
    })

    const link = `${req.protocol}://${req.get('host')}/invite/${user.referralCode}`
    res.json({ link })
  } catch (error) {
    console.error('Referral link error:', error)
    res.status(500).json({ error: 'Failed to get referral link' })
  }
})

app.get('/api/referrals', authenticateToken, async (req, res) => {
  try {
    const referrals = await referralService.getUserReferrals(req.user.id)
    res.json(referrals)
  } catch (error) {
    console.error('Referrals error:', error)
    res.status(500).json({ error: 'Failed to get referrals' })
  }
})

app.get('/api/referral-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await referralService.getReferralStats(req.user.id)
    res.json(stats)
  } catch (error) {
    console.error('Referral stats error:', error)
    res.status(500).json({ error: 'Failed to get referral stats' })
  }
})

// Investment routes
app.post('/api/investments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { packageId, amount } = req.body
    
    console.log('[INVESTMENTS] userId:', userId, 'packageId:', packageId, 'amount:', amount)
    
    const investment = await investmentService.createInvestment(userId, packageId, amount)
    
    // Get updated user data
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    res.json({
      success: true,
      investment,
      balance: updatedUser.balance,
      bonus: updatedUser.bonus || 0
    })
  } catch (error) {
    console.error('[INVESTMENTS] ERROR:', error)
    res.status(400).json({ error: error.message })
  }
})

// New investment endpoint for authenticated users
app.post('/api/invest', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { packageId, amount } = req.body
    
    console.log('[INVEST] userId:', userId, 'packageId:', packageId, 'amount:', amount)
    
    const investment = await investmentService.createInvestment(userId, packageId, amount)
    
    // Get updated user data
    const updatedUser = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    res.json({
      success: true,
      investment,
      balance: updatedUser.balance,
      bonus: updatedUser.bonus || 0
    })
  } catch (error) {
    console.error('[INVEST] ERROR:', error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/investments/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const investments = await investmentService.getUserInvestments(userId)
    res.json(investments)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/investments/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const stats = await investmentService.getInvestmentStats(userId)
    res.json(stats)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Referral routes
app.post('/api/referrals/process', async (req, res) => {
  try {
    const { newUserId, referralCode } = req.body
    const referrer = await referralService.processReferral(parseInt(newUserId), referralCode)
    res.json({ success: true, referrer })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/referrals/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const referrals = await referralService.getUserReferrals(parseInt(userId))
    res.json(referrals)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/referrals/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const stats = await referralService.getReferralStats(parseInt(userId))
    res.json(stats)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/referrals/tree/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const { maxLevel = 3 } = req.query
    const tree = await referralService.getReferralTree(parseInt(userId), parseInt(maxLevel))
    res.json(tree)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Rank routes
app.get('/api/ranks', (req, res) => {
  const ranks = rankService.getAllRanks()
  res.json(ranks)
})

app.get('/api/ranks/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const rank = await rankService.calculateUserRank(parseInt(userId))
    res.json({ rank })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/ranks/update/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const rank = await rankService.updateUserRank(parseInt(userId))
    res.json({ rank })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/ranks/progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const progress = await rankService.getUserRankProgress(parseInt(userId))
    res.json(progress)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Queue management routes
app.post('/api/queue/daily-profit/trigger', async (req, res) => {
  try {
    await scheduler.triggerDailyProfit()
    res.json({ success: true, message: 'Daily profit job triggered' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Direct daily profit processing (bypasses queue)
app.post('/api/daily-profit/process', async (req, res) => {
  try {
    console.log('[API] Direct daily profit processing requested')
    
    const activeInvestments = await prisma.investment.findMany({
      where: {
        isActive: true,
        endDate: {
          gte: new Date()
        }
      },
      include: {
        user: true,
        package: true
      }
    })

    let totalProcessed = 0
    let totalProfit = 0

    for (const investment of activeInvestments) {
      const dailyYield = (investment.package.monthlyYield / 30) / 100
      const dailyProfit = investment.amount * dailyYield

      // Create transaction
      await prisma.transaction.create({
        data: {
          userId: investment.userId,
          investmentId: investment.id,
          type: 'DAILY_PROFIT',
          amount: dailyProfit,
          description: `Daily profit from ${investment.package.name}`,
          status: 'COMPLETED'
        }
      })

      // Update user balance
      await prisma.user.update({
        where: { id: investment.userId },
        data: {
          balance: {
            increment: dailyProfit
          }
        }
      })

      // Update investment
      await prisma.investment.update({
        where: { id: investment.id },
        data: {
          totalEarned: {
            increment: dailyProfit
          },
          lastProfitDate: new Date()
        }
      })

      totalProcessed++
      totalProfit += dailyProfit
    }

    res.json({ 
      success: true, 
      message: 'Daily profit processed directly',
      processed: totalProcessed,
      totalProfit: totalProfit
    })
  } catch (error) {
    console.error('[API] Daily profit processing error:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/queue/bonus', async (req, res) => {
  try {
    const { userId, amount, reason } = req.body
    await scheduler.publishBonus(parseInt(userId), parseFloat(amount), reason)
    res.json({ success: true, message: 'Bonus job published' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// User routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        investments: {
          include: {
            package: true
          }
        },
        transactions: true
      }
    })
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body
    const user = await referralService.createUser(userData)
    res.json(user)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

// Исправить /api/users/:id чтобы возвращал инвестиции с пакетами
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        investments: {
          include: { package: true }
          }
      }
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Investment packages routes
/*
app.get('/api/packages', async (req, res) => {
  try {
    const packages = await prisma.investmentPackage.findMany({
      where: { isActive: true }
    })
    res.json(packages)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/packages', async (req, res) => {
  try {
    const packageData = req.body
    const investmentPackage = await prisma.investmentPackage.create({
      data: packageData
    })
    res.json(investmentPackage)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})
*/

// Transaction routes
app.get('/api/transactions/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const transactions = await prisma.transaction.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' }
    })
    res.json(transactions)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Rank Rewards (20 уровней, claim)
app.get('/api/rank-rewards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    console.log('[RANK-REWARDS] userId:', userId)
    
    // Только вычисляем оборот по рефералам
    const turnover = await rankRewardService.getUserTurnover(userId)
    console.log('[RANK-REWARDS] turnover:', turnover)
    
    // currentRank только по обороту, не из базы
    const currentRank = rankRewardService.getUserRank(turnover)
    console.log('[RANK-REWARDS] currentRank:', currentRank)
    
    let nextRank = rankRewardService.getNextRank(turnover)
    console.log('[RANK-REWARDS] nextRank:', nextRank)
    
    const claimed = await rankRewardService.getClaimedRewards(userId)
    console.log('[RANK-REWARDS] claimed:', claimed)
    
    // Явно: если оборот = 0, nextRank всегда первый ранг
    if (turnover === 0) {
      nextRank = MLM_RANKS[0];
    }
    
    // Вычисляем общую сумму заклеймленных денежных наград
    const totalClaimedCash = claimed
      .filter(c => c.type === 'Cash')
      .reduce((sum, c) => sum + c.amount, 0);
    
    // Находим последний заклеймленный приз
    const lastClaimedPrize = claimed
      .filter(c => c.type === 'Prize')
      .sort((a, b) => b.level - a.level)[0];
    
    res.json({
      turnover,
      currentRank, // только вычисленный
      nextRank, // только вычисленный
      claimed,
      totalClaimedCash,
      lastClaimedPrize,
      ranks: MLM_RANKS,
      debug: 'NEW LOGIC WORKS', // временное поле для проверки
    })
  } catch (e) {
    console.error('[RANK-REWARDS] ERROR:', e)
    console.error('[RANK-REWARDS] ERROR message:', e?.message)
    console.error('[RANK-REWARDS] ERROR stack:', e?.stack)
    res.status(500).json({ error: 'Failed to get rank rewards', details: e.message })
  }
})

app.post('/api/rank-rewards/claim', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { level, rewardType = 'Cash' } = req.body
    console.log('[CLAIM_REWARD] Request:', { userId, level, rewardType })
    
    const result = await rankRewardService.claimReward(userId, Number(level), rewardType)
    console.log('[CLAIM_REWARD] Success:', result)
    res.json(result)
  } catch (e) {
    console.error('[CLAIM_REWARD] Error:', e.message)
    res.status(400).json({ error: e.message })
  }
})

// Profile management endpoints
app.put('/api/profile/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' })
    }
    
    // Convert image to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    
    // Update user avatar
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: base64Image }
    })
    
    res.json({ 
      success: true, 
      message: 'Avatar updated successfully',
      avatar: base64Image
    })
  } catch (error) {
    console.error('Avatar update error:', error)
    res.status(500).json({ error: 'Failed to update avatar' })
  }
})

app.put('/api/profile/password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' })
    }
    
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' })
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    
    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    })
    
    res.json({ 
      success: true, 
      message: 'Password updated successfully' 
    })
  } catch (error) {
    console.error('Password update error:', error)
    res.status(500).json({ error: 'Failed to update password' })
  }
})

// Middleware для проверки прав администратора
function requireAdmin(req, res, next) {
  console.log('[REQUIRE_ADMIN] User:', req.user);
  console.log('[REQUIRE_ADMIN] isAdmin:', req.user?.isAdmin);
  
  if (!req.user || !req.user.isAdmin) {
    console.log('[REQUIRE_ADMIN] Access denied - not admin');
    return res.status(403).json({ error: 'Admin access required' });
  }
  console.log('[REQUIRE_ADMIN] Access granted');
  next();
}

// Admin routes
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // TODO: Add admin role check
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        balance: true,
        rank: true,
        referralCode: true,
        createdAt: true,
        wallet: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(users)
  } catch (error) {
    console.error('ADMIN USERS ERROR:', error);
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            wallet: true // добавлено!
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(transactions) // теперь каждое tx содержит поле wallet
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Admin: добавить транзакцию пользователю
app.post('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, amount, type, description, investmentId } = req.body;
    // Проверяем, существует ли пользователь
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    // Если указан investmentId, проверяем его
    let investment = null;
    if (investmentId) {
      investment = await prisma.investment.findUnique({ where: { id: parseInt(investmentId) } });
      if (!investment) {
        return res.status(404).json({ error: 'Investment not found' });
      }
    }
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        investmentId: investment ? investment.id : null,
        type,
        amount: parseFloat(amount),
        description: description || '',
        status: 'COMPLETED'
      }
    });
    // Если это DAILY_PROFIT и есть investmentId, увеличиваем totalEarned
    if (type === 'DAILY_PROFIT' && investment) {
      await prisma.investment.update({
        where: { id: investment.id },
        data: { totalEarned: { increment: parseFloat(amount) } }
      });
    }
    res.json({ success: true, transaction });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/admin/packages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const packages = await prisma.investmentPackage.findMany({
      orderBy: { id: 'asc' }
    })
    res.json(packages)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/admin/packages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, minAmount, monthlyYield, duration, isActive } = req.body
    
    const investmentPackage = await prisma.investmentPackage.create({
      data: {
        name,
        minAmount: parseFloat(minAmount),
        monthlyYield: parseFloat(monthlyYield),
        duration: parseInt(duration),
        isActive: isActive !== undefined ? isActive : true
      }
    })
    
    res.json(investmentPackage)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/admin/packages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const { name, minAmount, monthlyYield, duration, isActive } = req.body
    
    const investmentPackage = await prisma.investmentPackage.update({
      where: { id: parseInt(id) },
      data: {
        name,
        minAmount: parseFloat(minAmount),
        monthlyYield: parseFloat(monthlyYield),
        duration: parseInt(duration),
        isActive: isActive !== undefined ? isActive : true
      }
    })
    
    res.json(investmentPackage)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/admin/packages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    
    // Проверяем, есть ли активные инвестиции в этом пакете
    const activeInvestments = await prisma.investment.count({
      where: {
        packageId: parseInt(id),
        isActive: true
      }
    })
    
    if (activeInvestments > 0) {
      return res.status(400).json({ 
        error: `Cannot delete package with ${activeInvestments} active investments` 
      })
    }
    
    await prisma.investmentPackage.delete({
      where: { id: parseInt(id) }
    })
    
    res.json({ success: true, message: 'Package deleted successfully' })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/admin/withdrawals/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // TODO: Add admin role check
    const { id } = req.params
    const transaction = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: { status: 'COMPLETED' }
    })
    res.json({ success: true, transaction })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/admin/withdrawals/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) }
    })
    
    if (transaction && (transaction.status === 'PENDING')) {
      // Refund the user's balance
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { balance: { increment: transaction.amount } }
      })
      
      await prisma.transaction.update({
        where: { id: parseInt(id) },
        data: { status: TransactionStatus.FAILED }
      })
    }
    
    res.json({ success: true })
  } catch (error) {
    console.error('[REJECT ENDPOINT ERROR]', error);
    res.status(500).json({ error: error.message })
  }
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  await scheduler.stop()
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  await scheduler.stop()
  await prisma.$disconnect()
  process.exit(0)
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log('Queue system and scheduler started')
}); 

// Добавить эндпоинт для получения инвестиций пользователя (только для админа)
app.get('/api/admin/user/:id/investments', authenticateToken, async (req, res) => {
  try {
    // Проверка, что пользователь — админ
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    // Получить инвестиции пользователя с пакетами
    const investments = await prisma.investment.findMany({
      where: { userId },
      include: { package: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(investments);
  } catch (error) {
    console.error('Admin get user investments error:', error);
    res.status(500).json({ error: 'Failed to get user investments' });
  }
}); 

// GET /api/admin/user/:id/transactions
app.get('/api/admin/user/:id/transactions', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error('Admin get user transactions error:', error);
    res.status(500).json({ error: 'Failed to get user transactions' });
  }
});

// PUT /api/admin/user/:id — редактирование пользователя (только для админа)
app.put('/api/admin/user/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const allowedFields = ['email', 'username', 'wallet', 'isAdmin'];
    const updateData = {};
    for (const field of allowedFields) {
      if (field in req.body) updateData[field] = req.body[field];
    }
    if (req.body.password) {
      const bcrypt = await import('bcrypt');
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
    res.json(updatedUser);
  } catch (error) {
    console.error('Admin update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
}); 

// DELETE /api/admin/user/:id — удаление пользователя (только для админа)
app.delete('/api/admin/user/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    await prisma.user.delete({ where: { id: userId } });
    res.json({ success: true });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// PUT /api/admin/user/:id/block — блокировка пользователя (isBlocked=true)
app.put('/api/admin/user/:id/block', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true }
    });
    res.json(updatedUser);
  } catch (error) {
    console.error('Admin block user error:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// PUT /api/admin/user/:id/unblock — разблокировка пользователя (isBlocked=false)
app.put('/api/admin/user/:id/unblock', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const userId = parseInt(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false }
    });
    res.json(updatedUser);
  } catch (error) {
    console.error('Admin unblock user error:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
}); 

// Добавить эндпоинт для редактирования кошелька заявки:
app.put('/api/admin/withdrawals/:id/wallet', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { wallet } = req.body;
    const tx = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: { wallet }
    });
    res.json({ success: true, transaction: tx });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); 

// Добавить эндпоинт для смены статуса на CHECK (ручная проверка):
app.put('/api/admin/withdrawals/:id/hold', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await prisma.transaction.update({
      where: { id: parseInt(id) },
      data: { status: TransactionStatus.FAILED }
    });
    res.json({ success: true, transaction: tx });
  } catch (error) {
    console.error('[HOLD ENDPOINT ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

// DeFi Pool Position endpoints
app.get('/api/defi-positions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Проверяем права доступа
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const positions = await prisma.defiPosition.findMany({
      where: { userId: parseInt(userId) },
      orderBy: { createdAt: 'desc' }
    });

    res.json(positions);
  } catch (error) {
    console.error('[DEFI POSITIONS GET ERROR]', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/defi-positions/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { positions } = req.body;
    
    // Проверяем права доступа
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Удаляем старые позиции пользователя
    await prisma.defiPosition.deleteMany({
      where: { userId: parseInt(userId) }
    });

    // Создаем новые позиции
    const createdPositions = await Promise.all(
      positions.map(position => 
        prisma.defiPosition.create({
          data: {
            userId: parseInt(userId),
            poolId: position.poolId,
            symbol: position.symbol,
            project: position.project,
            chain: position.chain,
            entryApy: position.entryApy,
            currentApy: position.currentApy,
            entryTvl: position.entryTvl,
            currentTvl: position.currentTvl,
            status: position.status === 'farming' ? PositionStatus.FARMING : PositionStatus.UNSTAKED,
            entryDate: new Date(position.entryDate),
            exitDate: position.exitDate ? new Date(position.exitDate) : null,
            exitReason: position.exitReason
          }
        })
      )
    );

    res.json(createdPositions);
  } catch (error) {
    console.error('[DEFI POSITIONS SAVE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
}); 

// Update only active positions (for data updates without changing history)
app.put('/api/defi-positions/:userId/update', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { positions } = req.body;
    
    // Проверяем права доступа
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update only active positions (farming status)
    const updatedPositions = await Promise.all(
      positions.map(position => 
        prisma.defiPosition.updateMany({
          where: { 
            userId: parseInt(userId),
            poolId: position.poolId,
            status: PositionStatus.FARMING
          },
          data: {
            currentApy: position.currentApy,
            currentTvl: position.currentTvl,
            updatedAt: new Date()
          }
        })
      )
    );

    res.json({ success: true, updated: updatedPositions.length });
  } catch (error) {
    console.error('[DEFI POSITIONS UPDATE ERROR]', error);
    res.status(500).json({ error: error.message });
  }
}); 