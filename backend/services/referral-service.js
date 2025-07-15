import { PrismaClient } from '@prisma/client'
import queueManager from '../jobs/queue-manager.js'

const prisma = new PrismaClient()

class ReferralService {
  // Generate unique referral code
  generateReferralCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  // Create user with referral code
  async createUser(userData) {
    const referralCode = this.generateReferralCode()
    
    const user = await prisma.user.create({
      data: {
        ...userData,
        referralCode
      }
    })

    return user
  }

  // Process referral when new user registers
  async processReferral(newUserId, referralCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    })

    if (!referrer) {
      throw new Error('Invalid referral code')
    }

    if (referrer.id === newUserId) {
      throw new Error('Cannot refer yourself')
    }

    // Update new user with referrer
    await prisma.user.update({
      where: { id: newUserId },
      data: { referredBy: referrer.referralCode } // исправлено: теперь строка
    })

    // Calculate and publish referral bonus
    const bonusAmount = 10 // $10 bonus for each referral
    await queueManager.publishReferralBonus(newUserId, referrer.id, bonusAmount)

    return referrer
  }

  // Get user referrals
  async getUserReferrals(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referrals: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            investments: {
              where: {
                isActive: true
              },
              select: {
                id: true,
                amount: true,
                isActive: true,
                endDate: true,
                package: {
                  select: {
                    id: true,
                    name: true,
                    monthlyYield: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return user?.referrals || []
  }

  // Get sponsor information
  async getSponsor(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredBy: true }
    });

    if (!user || !user.referredBy) {
      return null;
    }

    // Try to find sponsor by ID first, then by referral code
    const sponsor = await prisma.user.findFirst({
      where: {
        OR: [
          { id: parseInt(user.referredBy) || 0 },
          { referralCode: user.referredBy }
        ]
      },
      select: { id: true, username: true, email: true }
    });

    return sponsor;
  }

  // Get referral statistics
  async getReferralStats(userId) {
    const referrals = await this.getUserReferrals(userId)
    const sponsor = await this.getSponsor(userId)
    
    const totalReferrals = referrals.length
    const activeReferrals = referrals.filter(ref => 
      ref.investments.some(inv => inv.isActive && new Date() < inv.endDate)
    ).length
    
    const totalInvestmentFromReferrals = referrals.reduce((sum, ref) => {
      return sum + ref.investments.reduce((invSum, inv) => invSum + inv.amount, 0)
    }, 0)

    return {
      totalReferrals,
      activeReferrals,
      totalInvestmentFromReferrals,
      sponsor
    }
  }

  // Get referral tree (multi-level)
  async getReferralTree(userId, maxLevel = 3) {
    const buildTree = async (userId, level = 0) => {
      if (level >= maxLevel) return []
      
      const referrals = await this.getUserReferrals(userId)
      const tree = []
      
      for (const referral of referrals) {
        const referralData = {
          id: referral.id,
          username: referral.username,
          email: referral.email,
          createdAt: referral.createdAt,
          level,
          investments: referral.investments,
          children: []
        }
        
        // Recursively get children
        referralData.children = await buildTree(referral.id, level + 1)
        
        tree.push(referralData)
      }
      
      return tree
    }
    
    return await buildTree(userId)
  }
}

export default new ReferralService() 