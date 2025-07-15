import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import multer from 'multer'
import { PrismaClient } from '@prisma/client'
import scheduler from './jobs/scheduler.js'
import investmentService from './services/investment-service.js'
import referralService from './services/referral-service.js'
import rankService from './services/rank-service.js'
import rankRewardService, { MLM_RANKS } from './services/rank-reward-service.js'
import { authenticateToken, generateToken } from './middleware/auth.js'
import nodemailer from 'nodemailer';

const prisma = new PrismaClient()
const app = express()

// Multer configuration for file uploads
const storage = multer.memoryStorage()
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'), false)
    }
  }
})

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://invarifi.netlify.app',
    'https://transgresse.netlify.app',
    'https://invarifi.tech',
    'https://www.invarifi.tech',
    // Добавьте сюда ваш Netlify домен, если он отличается
    process.env.FRONTEND_URL
  ].filter(Boolean), // Убираем undefined значения
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use(express.json())

// Start scheduler (no queue manager needed)
scheduler.start().catch(console.error)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Referral invite route - redirect to frontend
app.get('/invite/:code', (req, res) => {
  const { code } = req.params;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(`${frontendUrl}/invite/${code}`);
})

// Email sending utility
async function sendVerificationEmail(to, code) {
  // Настройка транспорта (пример для Gmail, заменить на свой SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'your@email.com',
      pass: process.env.SMTP_PASS || 'yourpassword',
    },
  });

  const html = `
  <!DOCTYPE html>
  <html>
    <body style="background: #18181b; margin: 0; padding: 0;">
      <div style="max-width: 420px; margin: 40px auto; background: rgba(30,41,59,0.95); border-radius: 18px; box-shadow: 0 4px 32px #0005; padding: 36px 32px; font-family: 'Segoe UI', Arial, sans-serif;">
        <div style="text-align: center; margin-bottom: 24px;">
          <!-- Логотип проекта (замени src на ссылку на свой логотип, если есть) -->
          <div style="width: 56px; height: 56px; margin: 0 auto 12px; background: linear-gradient(135deg, #f97316 60%, #ef4444 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center;">
            <img src='https://invarifi.tech/favicon.ico' alt='Logo' style='width: 36px; height: 36px; border-radius: 8px; background: #fff;' onerror="this.style.display='none';this.parentNode.innerHTML='<span style=\'font-size:2.2em;color:#fff;font-weight:bold;\'>M</span>'">
          </div>
          <h2 style="color: #f97316; margin: 0 0 8px; font-size: 1.6em; font-weight: 700; letter-spacing: 1px;">Welcome to MLM Project Transgresse!</h2>
        </div>
        <p style="color: #fff; font-size: 1.1em; margin-bottom: 18px;">Thank you for registering on our platform.</p>
        <p style="color: #fff; margin-bottom: 18px;">To confirm your email, please enter this code:</p>
        <div style="background: rgba(249,115,22,0.12); border-radius: 12px; padding: 18px 0; text-align: center; margin: 24px 0;">
          <span style="font-size: 2.2em; font-weight: bold; letter-spacing: 8px; color: #f97316;">${code}</span>
        </div>
        <p style="color: #aaa; font-size: 1em; margin-bottom: 0;">If you did not register on our site, simply ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #333; margin: 32px 0 16px;">
        <p style="color: #888; font-size: 0.95em; text-align: center; margin: 0;">Best regards,<br>MLM Project Transgresse Team</p>
      </div>
    </body>
  </html>
  `;

  const mailOptions = {
    from: process.env.SMTP_FROM || 'MLM <no-reply@mlm.com>',
    to,
    subject: 'Email Verification - MLM Platform',
    html,
    text: `Welcome to MLM!\n\nThank you for registering on our platform.\n\nTo confirm your email, please enter this code: ${code}\n\nIf you did not register on our site, simply ignore this email.\n\nBest regards,\nMLM Team`,
  };

  // Отправка письма
  try {
    await transporter.sendMail(mailOptions);
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
    
    // Store verification code temporarily (in production, use Redis or database)
    if (!global.verificationCodes) global.verificationCodes = new Map()
    global.verificationCodes.set(email, {
      code: verificationCode,
      expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      userData: { email, name: userName, password, referralId }
    })

    // Отправляем письмо с кодом
    await sendVerificationEmail(email, verificationCode)

    res.json({ success: true, message: 'Verification code sent to your email' })
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

    // In production, send email with reset link
    // For now, just return success message
    console.log(`Password reset requested for ${email}. Reset token: ${resetToken}`)
    
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
        status: 'PENDING'
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

app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        investments: {
          include: {
            package: true
          }
        },
        transactions: true,
        referrals: true
      }
    })
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Investment packages routes
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
        wallet: true
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/admin/transactions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // TODO: Add admin role check
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    res.json(transactions)
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
    // TODO: Add admin role check
    const { id } = req.params
    const transaction = await prisma.transaction.findUnique({
      where: { id: parseInt(id) }
    })
    
    if (transaction && transaction.status === 'PENDING') {
      // Refund the user's balance
      await prisma.user.update({
        where: { id: transaction.userId },
        data: { balance: { increment: transaction.amount } }
      })
      
      await prisma.transaction.update({
        where: { id: parseInt(id) },
        data: { status: 'FAILED' }
      })
    }
    
    res.json({ success: true })
  } catch (error) {
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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log('Queue system and scheduler started')
}) 