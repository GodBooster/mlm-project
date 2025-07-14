import cron from 'node-cron'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

class Scheduler {
  constructor() {
    this.isStarted = false
  }

  async start() {
    if (this.isStarted) return
    
    console.log('[SCHEDULER] Starting scheduler with direct processing...')
    
    // Schedule daily profit job to run every day at 00:01
    cron.schedule('1 0 * * *', async () => {
      console.log('[SCHEDULER] Scheduled daily profit job started at 00:01')
      try {
        await this.processDailyProfit()
        console.log('[SCHEDULER] Daily profit processing completed successfully')
      } catch (error) {
        console.error('[SCHEDULER] Failed to process daily profit:', error)
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    })

    // Schedule daily profit job to run every day at 12:01 (backup)
    cron.schedule('1 12 * * *', async () => {
      console.log('[SCHEDULER] Scheduled daily profit job started at 12:01')
      try {
        await this.processDailyProfit()
        console.log('[SCHEDULER] Daily profit processing completed successfully')
      } catch (error) {
        console.error('[SCHEDULER] Failed to process daily profit:', error)
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    })

    this.isStarted = true
    console.log('[SCHEDULER] Scheduler started successfully')
  }

  async stop() {
    if (!this.isStarted) return
    
    this.isStarted = false
    console.log('[SCHEDULER] Scheduler stopped')
  }

  // Direct daily profit processing
  async processDailyProfit() {
    console.log('[SCHEDULER] Processing daily profit for all active investments...')
    
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

    console.log(`[SCHEDULER] Found ${activeInvestments.length} active investments to process`)

    let totalProcessed = 0
    let totalProfit = 0

    for (const investment of activeInvestments) {
      console.log(`[SCHEDULER] Processing investment ID: ${investment.id}, User: ${investment.user.username}`)
      
      const dailyYield = (investment.package.monthlyYield / 30) / 100
      const dailyProfit = investment.amount * dailyYield

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

        // Update user balance
        const updatedUser = await prisma.user.update({
          where: { id: investment.userId },
          data: {
            balance: {
              increment: dailyProfit
            }
          }
        })

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

        console.log(`[SCHEDULER] Daily profit $${dailyProfit.toFixed(2)} added for user ${investment.user.username}`)
        
        totalProcessed++
        totalProfit += dailyProfit
      } catch (error) {
        console.error(`[SCHEDULER] Error processing investment ${investment.id}:`, error)
      }
    }

    console.log(`[SCHEDULER] Daily profit processing completed: ${totalProcessed} investments, $${totalProfit.toFixed(2)} total`)
  }

  // Manual trigger for testing
  async triggerDailyProfit() {
    console.log('[SCHEDULER] Manually triggering daily profit processing...')
    try {
      await this.processDailyProfit()
      console.log('[SCHEDULER] Daily profit processing triggered successfully')
    } catch (error) {
      console.error('[SCHEDULER] Failed to trigger daily profit processing:', error)
      throw error
    }
  }
}

// Create singleton instance
const scheduler = new Scheduler()

export default scheduler 