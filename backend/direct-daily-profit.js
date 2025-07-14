import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function processDailyProfitDirectly() {
  try {
    console.log('🎯 Прямая обработка ежедневных начислений...\n')
    
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

    console.log(`📊 Найдено ${activeInvestments.length} активных инвестиций\n`)

    let totalProcessed = 0
    let totalProfit = 0

    for (const investment of activeInvestments) {
      console.log(`💰 Обработка инвестиции ID: ${investment.id}`)
      console.log(`   Пользователь: ${investment.user.username}`)
      console.log(`   Пакет: ${investment.package.name}`)
      console.log(`   Сумма: $${investment.amount}`)
      
      const dailyYield = (investment.package.monthlyYield / 30) / 100
      const dailyProfit = investment.amount * dailyYield

      console.log(`   Доходность: ${investment.package.monthlyYield}% в месяц`)
      console.log(`   Ежедневная доходность: ${dailyYield}`)
      console.log(`   Ежедневный доход: $${dailyProfit.toFixed(2)}`)

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

        console.log(`   ✅ Транзакция создана: ${transaction.id}`)
        console.log(`   ✅ Баланс обновлён: $${updatedUser.balance.toFixed(2)}`)
        console.log(`   ✅ Общий заработок: $${updatedInvestment.totalEarned.toFixed(2)}`)
        
        totalProcessed++
        totalProfit += dailyProfit
        console.log('')
      } catch (error) {
        console.error(`   ❌ Ошибка при обработке инвестиции ${investment.id}:`, error)
      }
    }

    console.log(`🎉 Обработка завершена!`)
    console.log(`📈 Обработано инвестиций: ${totalProcessed}`)
    console.log(`💰 Общий доход: $${totalProfit.toFixed(2)}`)

  } catch (error) {
    console.error('❌ Ошибка при обработке ежедневных начислений:', error)
  } finally {
    await prisma.$disconnect()
  }
}

processDailyProfitDirectly() 