import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Bonus amounts for each package
const PACKAGE_BONUSES = {
  5: 50,   // Member - $50 bonus
  6: 100,  // Adept - $100 bonus
  7: 200,  // Visionary - $200 bonus
  8: 500,  // Elite - $500 bonus
  9: 1000  // Fortune - $1000 bonus
}

async function awardPackageBonuses() {
  try {
    console.log('🎁 Начисление бонусов по пакетам...\n')

    // Get all active investments
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

    let totalBonusesAwarded = 0
    let usersUpdated = 0

    for (const investment of activeInvestments) {
      const packageId = investment.packageId
      const bonusAmount = PACKAGE_BONUSES[packageId]

      if (bonusAmount) {
        console.log(`💰 Пользователь: ${investment.user.username}`)
        console.log(`   Пакет: ${investment.package.name} (ID: ${packageId})`)
        console.log(`   Сумма инвестиции: $${investment.amount}`)
        console.log(`   Бонус: $${bonusAmount}`)

        // Update user bonus
        await prisma.user.update({
          where: { id: investment.userId },
          data: {
            bonus: {
              increment: bonusAmount
            }
          }
        })

        // Create transaction record
        await prisma.transaction.create({
          data: {
            userId: investment.userId,
            investmentId: investment.id,
            type: 'BONUS',
            amount: bonusAmount,
            description: `Package bonus for ${investment.package.name}`,
            status: 'COMPLETED'
          }
        })

        totalBonusesAwarded += bonusAmount
        usersUpdated++
        console.log(`   ✅ Бонус начислен!\n`)
      }
    }

    console.log(`🎉 Начисление завершено!`)
    console.log(`📈 Обновлено пользователей: ${usersUpdated}`)
    console.log(`💰 Общая сумма бонусов: $${totalBonusesAwarded}`)

  } catch (error) {
    console.error('❌ Ошибка при начислении бонусов:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the bonus awarding
awardPackageBonuses() 