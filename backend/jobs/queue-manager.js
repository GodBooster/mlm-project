import Boss from 'pg-boss'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const boss = new Boss({
  connectionString: process.env.DATABASE_URL,
  schema: 'pgboss',
  monitorInterval: 1000,
  newJobCheckInterval: 1000,
  archiveCompletedJobsEvery: 1000
})
console.log('[QUEUE] Boss instance created, DB:', process.env.DATABASE_URL, 'Schema: pgboss')

// Job types
export const JOB_TYPES = {
  DAILY_PROFIT: 'daily-profit',
  DEPOSIT: 'deposit',
  REFERRAL_BONUS: 'referral-bonus',
  RANK_BONUS: 'rank-bonus',
  RANK_REWARD: 'rank-reward',
  BONUS: 'bonus'
}

// Queue manager class
class QueueManager {
  constructor() {
    this.boss = boss
    this.isStarted = false
  }

  async start() {
    if (this.isStarted) return
    
    console.log('[QUEUE][DIAG] DATABASE_URL at startup:', process.env.DATABASE_URL)
    try {
      await this.boss.start()
      this.isStarted = true
      // Register all job handlers
      await this.registerJobHandlers()
      console.log('[QUEUE] Queue manager started successfully')
    } catch (err) {
      console.error('[QUEUE][ERROR] Failed to start pg-boss:', err)
      throw err
    }
  }

  async stop() {
    if (!this.isStarted) return
    
    await this.boss.stop()
    this.isStarted = false
    console.log('Queue manager stopped')
  }

  async registerJobHandlers() {
    console.log('[QUEUE] Registering job handlers...')
    // Daily profit handler
    await this.boss.work(JOB_TYPES.DAILY_PROFIT, async (job) => {
      console.log('[QUEUE] DAILY_PROFIT job received:', job.id, job.data)
      try {
        console.log('[QUEUE] Starting daily profit processing...')
        await this.processDailyProfit(job.data)
        console.log('[QUEUE] Daily profit processing completed successfully')
        return { success: true }
      } catch (error) {
        console.error('[QUEUE] Daily profit job failed:', error)
        throw error
      }
    })
    console.log('[QUEUE] Handler registered for:', JOB_TYPES.DAILY_PROFIT)

    // Deposit handler
    await this.boss.work(JOB_TYPES.DEPOSIT, async (job) => {
      try {
        await this.processDeposit(job.data)
        return { success: true }
      } catch (error) {
        console.error('Deposit job failed:', error)
        throw error
      }
    })
    console.log('[QUEUE] Handler registered for:', JOB_TYPES.DEPOSIT)

    // Referral bonus handler
    await this.boss.work(JOB_TYPES.REFERRAL_BONUS, async (job) => {
      try {
        await this.processReferralBonus(job.data)
        return { success: true }
      } catch (error) {
        console.error('Referral bonus job failed:', error)
        throw error
      }
    })
    console.log('[QUEUE] Handler registered for:', JOB_TYPES.REFERRAL_BONUS)

    // Rank bonus handler
    await this.boss.work(JOB_TYPES.RANK_BONUS, async (job) => {
      try {
        await this.processRankBonus(job.data)
        return { success: true }
      } catch (error) {
        console.error('Rank bonus job failed:', error)
        throw error
      }
    })
    console.log('[QUEUE] Handler registered for:', JOB_TYPES.RANK_BONUS)

    // Rank reward handler
    await this.boss.work(JOB_TYPES.RANK_REWARD, async (job) => {
      try {
        await this.processRankReward(job.data)
        return { success: true }
      } catch (error) {
        console.error('Rank reward job failed:', error)
        throw error
      }
    })
    console.log('[QUEUE] Handler registered for:', JOB_TYPES.RANK_REWARD)

    // Bonus handler
    await this.boss.work(JOB_TYPES.BONUS, async (job) => {
      try {
        await this.processBonus(job.data)
        return { success: true }
      } catch (error) {
        console.error('Bonus job failed:', error)
        throw error
      }
    })
    console.log('[QUEUE] Handler registered for:', JOB_TYPES.BONUS)
  }

  // Publish jobs
  async publishDailyProfit() {
    try {
      console.log('[QUEUE] Attempting to publish DAILY_PROFIT job...')
      console.log('[QUEUE] Boss instance:', this.boss ? 'exists' : 'missing')
      console.log('[QUEUE] Job type:', JOB_TYPES.DAILY_PROFIT)
      
      // Try with explicit options
      const jobId = await this.boss.publish(JOB_TYPES.DAILY_PROFIT, {}, {
        priority: 0,
        startAfter: new Date(),
        expireIn: '1 hour'
      })
      
      console.log('[QUEUE] DAILY_PROFIT job published, jobId:', jobId)
      
      if (!jobId) {
        console.error('[QUEUE] WARNING: Job published but jobId is undefined!')
        // Try alternative approach
        console.log('[QUEUE] Trying alternative publishing method...')
        const altJobId = await this.boss.publish(JOB_TYPES.DAILY_PROFIT, {})
        console.log('[QUEUE] Alternative job published, jobId:', altJobId)
        return altJobId
      }
      
      return jobId
    } catch (error) {
      console.error('[QUEUE] Error publishing DAILY_PROFIT job:', error)
      throw error
    }
  }

  async publishDeposit(userId, amount, investmentId = null) {
    return await this.boss.publish(JOB_TYPES.DEPOSIT, {
      userId,
      amount,
      investmentId
    })
  }

  async publishReferralBonus(userId, referrerId, amount) {
    return await this.boss.publish(JOB_TYPES.REFERRAL_BONUS, {
      userId,
      referrerId,
      amount
    })
  }

  async publishRankBonus(userId, rank, amount) {
    return await this.boss.publish(JOB_TYPES.RANK_BONUS, {
      userId,
      rank,
      amount
    })
  }

  async publishRankReward(userId, rank, amount) {
    return await this.boss.publish(JOB_TYPES.RANK_REWARD, {
      userId,
      rank,
      amount
    })
  }

  async publishBonus(userId, amount, reason) {
    return await this.boss.publish(JOB_TYPES.BONUS, {
      userId,
      amount,
      reason
    })
  }

  // Job processors
  async processDailyProfit(data) {
    console.log('[QUEUE] Processing daily profit for all active investments...')
    
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

    console.log(`[QUEUE] Found ${activeInvestments.length} active investments to process`)

    for (const investment of activeInvestments) {
      console.log(`[QUEUE] Processing investment ID: ${investment.id}, User: ${investment.user.username}, Amount: ${investment.amount}, Package: ${investment.package.name}`)
      
      const dailyYield = (investment.package.monthlyYield / 30) / 100
      const dailyProfit = investment.amount * dailyYield

      console.log(`[QUEUE] Daily yield: ${dailyYield}, Daily profit: ${dailyProfit}`)

      try {
        // Create transaction
        const transaction = await prisma.transaction.create({
          data: {
            userId: investment.userId,
            investmentId: investment.id,
            type: 'DAILY_PROFIT',
            amount: dailyProfit,
            description: `Daily profit from ${investment.package.name}`,
            status: 'COMPLETED'
          }
        })

        console.log(`[QUEUE] Transaction created: ${transaction.id}`)

        // Update user balance
        const updatedUser = await prisma.user.update({
          where: { id: investment.userId },
          data: {
            balance: {
              increment: dailyProfit
            }
          }
        })

        console.log(`[QUEUE] User balance updated: ${updatedUser.balance}`)

        // Update investment
        const updatedInvestment = await prisma.investment.update({
          where: { id: investment.id },
          data: {
            totalEarned: {
              increment: dailyProfit
            },
            lastProfitDate: new Date()
          }
        })

        console.log(`[QUEUE] Investment updated, total earned: ${updatedInvestment.totalEarned}`)
        console.log(`[QUEUE] Daily profit ${dailyProfit} added for user ${investment.user.username} (ID: ${investment.userId})`)
      } catch (error) {
        console.error(`[QUEUE] Error processing investment ${investment.id}:`, error)
        throw error
      }
    }

    console.log(`[QUEUE] Daily profit processing completed for ${activeInvestments.length} investments`)
  }

  async processDeposit(data) {
    const { userId, amount, investmentId } = data
    
    // Create transaction
    await prisma.transaction.create({
      data: {
        userId,
        investmentId,
        type: 'DEPOSIT',
        amount,
        description: 'Investment deposit',
        status: 'COMPLETED'
      }
    })

    // Update user balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount
        }
      }
    })

    console.log(`Deposit ${amount} processed for user ${userId}`)
  }

  async processReferralBonus(data) {
    const { userId, referrerId, amount } = data
    
    // Create transaction for referrer
    await prisma.transaction.create({
      data: {
        userId: referrerId,
        type: 'REFERRAL_BONUS',
        amount,
        description: `Referral bonus for user ${userId}`,
        status: 'COMPLETED'
      }
    })

    // Update referrer balance
    await prisma.user.update({
      where: { id: referrerId },
      data: {
        balance: {
          increment: amount
        }
      }
    })

    console.log(`Referral bonus ${amount} processed for referrer ${referrerId}`)
  }

  async processRankBonus(data) {
    const { userId, rank, amount } = data
    
    // Create transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'RANK_BONUS',
        amount,
        description: `Rank bonus for ${rank} rank`,
        status: 'COMPLETED'
      }
    })

    // Update user balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount
        }
      }
    })

    console.log(`Rank bonus ${amount} processed for user ${userId}`)
  }

  async processRankReward(data) {
    const { userId, rank, amount } = data
    
    // Create transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'RANK_REWARD',
        amount,
        description: `Rank reward for ${rank} rank`,
        status: 'COMPLETED'
      }
    })

    // Update user balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount
        }
      }
    })

    console.log(`Rank reward ${amount} processed for user ${userId}`)
  }

  async processBonus(data) {
    const { userId, amount, reason } = data
    
    // Create transaction
    await prisma.transaction.create({
      data: {
        userId,
        type: 'BONUS',
        amount,
        description: reason || 'Bonus payment',
        status: 'COMPLETED'
      }
    })

    // Update user balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount
        }
      }
    })

    console.log(`Bonus ${amount} processed for user ${userId}: ${reason}`)
  }
}

// Create singleton instance
const queueManager = new QueueManager()

export default queueManager 