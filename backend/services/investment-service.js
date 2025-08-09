import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error'],
  errorFormat: 'pretty',
})

class InvestmentService {
  
  // Выполнить операцию с retry при обрыве соединения
  async executeWithRetry(operation, retries = 1) {
    try {
      return await operation();
    } catch (error) {
      console.log('[InvestmentService] Error:', error.code, error.message?.substring(0, 100));
      if ((error.code === 'P1017' || error.code === 'P2028') && retries > 0) {
        console.log('[InvestmentService] Retrying operation...');
        await prisma.$disconnect();
        await prisma.$connect();
        return await this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }

  // Create new investment
  async createInvestment(userId, packageId, amount) {
    // Optimized investment creation
    
    // Параллельные запросы пользователя и пакета для скорости
    const [packageData, user] = await Promise.all([
      prisma.investmentPackage.findUnique({
        where: { id: packageId },
        select: { id: true, name: true, minAmount: true, maxAmount: true, duration: true } // добавляем maxAmount
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, balance: true } // только нужные поля
      })
    ]);

    if (!packageData) {
      throw new Error('Investment package not found')
    }

    if (amount < packageData.minAmount) {
      throw new Error(`Amount must be at least ${packageData.minAmount}`)
    }

    if (packageData.maxAmount && amount > packageData.maxAmount) {
      throw new Error(`Amount cannot exceed ${packageData.maxAmount}`)
    }

    if (!user) {
      throw new Error('User not found')
    }

    if (user.balance < amount) {
      throw new Error('Insufficient balance')
    }

    // Быстрая проверка существующих инвестиций - только ID
    const existingInvestment = await prisma.investment.findFirst({
      where: {
        userId,
        packageId,
        isActive: true,
        endDate: { gte: new Date() }
      },
      select: { id: true } // только ID для скорости
    })

    // Calculate end date
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + packageData.duration)

    // Create or update investment and update balance in a transaction
    const result = await this.executeWithRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        let investment;

        if (existingInvestment) {
          // Update existing investment - только добавляем сумму, срок не продлеваем
          investment = await tx.investment.update({
            where: { id: existingInvestment.id },
            data: {
              amount: { increment: amount }
              // endDate остается тем же - не продлеваем срок
            },
            select: { id: true, amount: true, startDate: true, endDate: true } // минимум данных
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
            select: { id: true, amount: true, startDate: true, endDate: true, isActive: true, totalEarned: true, lastProfitDate: true, createdAt: true } // минимум данных
          })
        }

        // Update user balance - только balance
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { balance: { decrement: amount } },
          select: { id: true, balance: true } // только нужные поля
        })

        // Create transaction record - без select для скорости
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
    }, {
      timeout: 5000, // Быстрый таймаут - 5 секунд
    });
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