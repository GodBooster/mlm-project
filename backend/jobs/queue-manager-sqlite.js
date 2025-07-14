import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Job types
export const JOB_TYPES = {
  DAILY_PROFIT: 'daily-profit',
  DEPOSIT: 'deposit',
  REFERRAL_BONUS: 'referral-bonus',
  RANK_BONUS: 'rank-bonus',
  RANK_REWARD: 'rank-reward',
  BONUS: 'bonus'
}

// Simple in-memory queue for SQLite
class SimpleQueue {
  constructor() {
    this.jobs = []
    this.isProcessing = false
    this.processors = new Map()
  }

  async publish(type, data) {
    const job = {
      id: Date.now() + Math.random(),
      type,
      data,
      createdAt: new Date(),
      status: 'pending'
    }
    
    this.jobs.push(job)
    console.log(`Job published: ${type}`, job.id)
    
    // Process immediately if not already processing
    if (!this.isProcessing) {
      this.processJobs()
    }
    
    return job.id
  }

  async work(type, handler) {
    this.processors.set(type, handler)
    console.log(`Handler registered for: ${type}`)
  }

  async processJobs() {
    if (this.isProcessing || this.jobs.length === 0) return
    
    this.isProcessing = true
    
    while (this.jobs.length > 0) {
      const job = this.jobs.shift()
      const handler = this.processors.get(job.type)
      
      if (handler) {
        try {
          console.log(`Processing job: ${job.type}`, job.id)
          job.status = 'processing'
          
          const result = await handler(job)
          job.status = 'completed'
          job.result = result
          
          console.log(`Job completed: ${job.type}`, job.id)
        } catch (error) {
          console.error(`Job failed: ${job.type}`, job.id, error)
          job.status = 'failed'
          job.error = error.message
        }
      } else {
        console.warn(`No handler for job type: ${job.type}`)
        job.status = 'failed'
        job.error = 'No handler found'
      }
    }
    
    this.isProcessing = false
  }

  async stop() {
    console.log('Queue stopped')
  }
}

// Queue manager class
class QueueManager {
  constructor() {
    this.queue = new SimpleQueue()
    this.isStarted = false
  }

  async start() {
    if (this.isStarted) return
    
    // Register all job handlers
    await this.registerJobHandlers()
    
    this.isStarted = true
    console.log('Queue manager started successfully')
  }

  async stop() {
    if (!this.isStarted) return
    
    await this.queue.stop()
    this.isStarted = false
    console.log('Queue manager stopped')
  }

  async registerJobHandlers() {
    // Daily profit handler
    await this.queue.work(JOB_TYPES.DAILY_PROFIT, async (job) => {
      try {
        await this.processDailyProfit(job.data)
        return { success: true }
      } catch (error) {
        console.error('Daily profit job failed:', error)
        throw error
      }
    })

    // Deposit handler
    await this.queue.work(JOB_TYPES.DEPOSIT, async (job) => {
      try {
        await this.processDeposit(job.data)
        return { success: true }
      } catch (error) {
        console.error('Deposit job failed:', error)
        throw error
      }
    })

    // Referral bonus handler
    await this.queue.work(JOB_TYPES.REFERRAL_BONUS, async (job) => {
      try {
        await this.processReferralBonus(job.data)
        return { success: true }
      } catch (error) {
        console.error('Referral bonus job failed:', error)
        throw error
      }
    })

    // Rank bonus handler
    await this.queue.work(JOB_TYPES.RANK_BONUS, async (job) => {
      try {
        await this.processRankBonus(job.data)
        return { success: true }
      } catch (error) {
        console.error('Rank bonus job failed:', error)
        throw error
      }
    })

    // Rank reward handler
    await this.queue.work(JOB_TYPES.RANK_REWARD, async (job) => {
      try {
        await this.processRankReward(job.data)
        return { success: true }
      } catch (error) {
        console.error('Rank reward job failed:', error)
        throw error
      }
    })

    // Bonus handler
    await this.queue.work(JOB_TYPES.BONUS, async (job) => {
      try {
        await this.processBonus(job.data)
        return { success: true }
      } catch (error) {
        console.error('Bonus job failed:', error)
        throw error
      }
    })
  }

  // Publish jobs
  async publishDailyProfit() {
    return await this.queue.publish(JOB_TYPES.DAILY_PROFIT, {})
  }

  async publishDeposit(userId, amount, investmentId = null) {
    return await this.queue.publish(JOB_TYPES.DEPOSIT, {
      userId,
      amount,
      investmentId
    })
  }

  async publishReferralBonus(userId, referrerId, amount) {
    return await this.queue.publish(JOB_TYPES.REFERRAL_BONUS, {
      userId,
      referrerId,
      amount
    })
  }

  async publishRankBonus(userId, rank, amount) {
    return await this.queue.publish(JOB_TYPES.RANK_BONUS, {
      userId,
      rank,
      amount
    })
  }

  async publishRankReward(userId, rank, amount) {
    return await this.queue.publish(JOB_TYPES.RANK_REWARD, {
      userId,
      rank,
      amount
    })
  }

  async publishBonus(userId, amount, reason) {
    return await this.queue.publish(JOB_TYPES.BONUS, {
      userId,
      amount,
      reason
    })
  }

  // Job processors
  async processDailyProfit(data) {
    console.log('Processing daily profit for all active investments...')
    
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

      console.log(`Daily profit ${dailyProfit} processed for user ${investment.userId}`)
    }
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