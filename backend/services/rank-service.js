import { PrismaClient } from '@prisma/client'
import queueManager from '../jobs/queue-manager.js'

const prisma = new PrismaClient()

// Rank configuration
const RANKS = {
  BRONZE: {
    name: 'BRONZE',
    minReferrals: 0,
    minInvestment: 0,
    bonus: 0,
    reward: 0
  },
  SILVER: {
    name: 'SILVER',
    minReferrals: 5,
    minInvestment: 1000,
    bonus: 50,
    reward: 100
  },
  GOLD: {
    name: 'GOLD',
    minReferrals: 15,
    minInvestment: 5000,
    bonus: 200,
    reward: 500
  },
  PLATINUM: {
    name: 'PLATINUM',
    minReferrals: 30,
    minInvestment: 15000,
    bonus: 500,
    reward: 1500
  },
  DIAMOND: {
    name: 'DIAMOND',
    minReferrals: 50,
    minInvestment: 30000,
    bonus: 1000,
    reward: 3000
  }
}

class RankService {
  // Calculate user rank based on referrals and investments
  async calculateUserRank(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrals: true,
        investments: {
          where: { isActive: true }
        }
      }
    })

    const totalReferrals = user.referrals.length
    const totalInvestment = user.investments.reduce((sum, inv) => sum + inv.amount, 0)

    // Find the highest rank user qualifies for
    let highestRank = 'BRONZE'
    
    for (const [rankName, rankConfig] of Object.entries(RANKS)) {
      if (totalReferrals >= rankConfig.minReferrals && totalInvestment >= rankConfig.minInvestment) {
        highestRank = rankName
      }
    }

    return highestRank
  }

  // Update user rank and process bonuses
  async updateUserRank(userId) {
    const currentRank = await this.calculateUserRank(userId)
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    // Check if rank has changed
    if (user.rank !== currentRank) {
      const oldRank = user.rank
      
      // Update user rank
      await prisma.user.update({
        where: { id: userId },
        data: { rank: currentRank }
      })

      // Process rank bonus if rank increased
      const oldRankConfig = RANKS[oldRank]
      const newRankConfig = RANKS[currentRank]
      
      if (newRankConfig.bonus > oldRankConfig.bonus) {
        const bonusAmount = newRankConfig.bonus - oldRankConfig.bonus
        await queueManager.publishRankBonus(userId, currentRank, bonusAmount)
      }

      // Process rank reward
      if (newRankConfig.reward > 0) {
        await queueManager.publishRankReward(userId, currentRank, newRankConfig.reward)
      }

      console.log(`User ${userId} rank updated from ${oldRank} to ${currentRank}`)
    }

    return currentRank
  }

  // Get rank requirements
  getRankRequirements(rankName) {
    return RANKS[rankName] || null
  }

  // Get all ranks
  getAllRanks() {
    return Object.values(RANKS)
  }

  // Get user's progress to next rank
  async getUserRankProgress(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrals: true,
        investments: {
          where: { isActive: true }
        }
      }
    })

    const currentRank = user.rank
    const currentRankConfig = RANKS[currentRank]
    
    // Find next rank
    const rankNames = Object.keys(RANKS)
    const currentIndex = rankNames.indexOf(currentRank)
    const nextRankName = rankNames[currentIndex + 1]
    
    if (!nextRankName) {
      return {
        currentRank,
        nextRank: null,
        progress: 100,
        requirements: currentRankConfig
      }
    }

    const nextRankConfig = RANKS[nextRankName]
    const totalReferrals = user.referrals.length
    const totalInvestment = user.investments.reduce((sum, inv) => sum + inv.amount, 0)

    // Calculate progress for referrals
    const referralProgress = Math.min(
      (totalReferrals / nextRankConfig.minReferrals) * 100, 
      100
    )

    // Calculate progress for investment
    const investmentProgress = Math.min(
      (totalInvestment / nextRankConfig.minInvestment) * 100, 
      100
    )

    // Overall progress (average of both)
    const overallProgress = Math.min((referralProgress + investmentProgress) / 2, 100)

    return {
      currentRank,
      nextRank: nextRankName,
      progress: Math.round(overallProgress),
      requirements: nextRankConfig,
      currentStats: {
        referrals: totalReferrals,
        investment: totalInvestment
      }
    }
  }

  // Process rank bonuses for all users (can be scheduled)
  async processAllUserRanks() {
    const users = await prisma.user.findMany()
    
    for (const user of users) {
      try {
        await this.updateUserRank(user.id)
      } catch (error) {
        console.error(`Failed to update rank for user ${user.id}:`, error)
      }
    }
  }
}

export default new RankService() 