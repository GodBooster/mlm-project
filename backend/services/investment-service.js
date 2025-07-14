import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

class InvestmentService {
  // Create new investment
  async createInvestment(userId, packageId, amount) {
    const packageData = await prisma.investmentPackage.findUnique({
      where: { id: packageId }
    })

    if (!packageData) {
      throw new Error('Investment package not found')
    }

    if (amount < packageData.minAmount) {
      throw new Error(`Amount must be at least ${packageData.minAmount}`)
    }

    // Check user balance
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    if (user.balance < amount) {
      throw new Error('Insufficient balance')
    }

    // Check if user already has an active investment in this package
    const existingInvestment = await prisma.investment.findFirst({
      where: {
        userId,
        packageId,
        isActive: true,
        endDate: {
          gte: new Date()
        }
      }
    })

    // Calculate end date
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + packageData.duration)

    // Create or update investment and update balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let investment;

      if (existingInvestment) {
        // Update existing investment - только добавляем сумму, срок не продлеваем
        investment = await tx.investment.update({
          where: { id: existingInvestment.id },
          data: {
            amount: {
              increment: amount
            }
            // endDate остается тем же - не продлеваем срок
          },
          include: {
            package: true,
            user: true
          }
        })
      } else {
        // Create new investment
        investment = await tx.investment.create({
          data: {
            userId,
            packageId,
            amount,
            endDate,
            isActive: true
          },
          include: {
            package: true,
            user: true
          }
        })
      }

      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: amount
          }
        }
      })

      // Create transaction record
      await tx.transaction.create({
        data: {
          userId,
          investmentId: investment.id,
          type: 'INVESTMENT',
          amount: amount,
          description: existingInvestment ? 
            `Additional investment in ${packageData.name} package` : 
            `Investment in ${packageData.name} package`,
          status: 'COMPLETED'
        }
      })

      return { investment, updatedUser }
    })

    return result.investment
  }

  // Get user investments
  async getUserInvestments(userId) {
    return await prisma.investment.findMany({
      where: { userId },
      include: {
        package: true
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Get active investments
  async getActiveInvestments() {
    return await prisma.investment.findMany({
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
  }

  // Calculate daily profit for investment
  calculateDailyProfit(investment) {
    const dailyYield = (investment.package.monthlyYield / 30) / 100
    return investment.amount * dailyYield
  }

  // Get investment statistics
  async getInvestmentStats(userId) {
    const investments = await this.getUserInvestments(userId)
    
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0)
    const totalEarned = investments.reduce((sum, inv) => sum + inv.totalEarned, 0)
    const activeInvestments = investments.filter(inv => inv.isActive && new Date() < inv.endDate)
    
    return {
      totalInvested,
      totalEarned,
      activeCount: activeInvestments.length,
      investments
    }
  }
}

export default new InvestmentService() 