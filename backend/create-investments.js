import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createInvestments() {
  try {
    console.log('💰 Создание новых инвестиций для пользователей...\n')

    // Получаем доступные пакеты
    const packages = await prisma.investmentPackage.findMany({
      where: { isActive: true },
      orderBy: { minAmount: 'asc' }
    })

    console.log('📦 Доступные пакеты:')
    packages.forEach(pkg => {
      console.log(`   - ${pkg.name}: ${pkg.minAmount} - ${pkg.maxAmount} (${pkg.monthlyYield}%)`)
    })

    // Получаем пользователей с балансом
    const users = await prisma.user.findMany({
      where: {
        balance: {
          gt: 0
        }
      },
      orderBy: { balance: 'desc' }
    })

    console.log('\n👥 Пользователи для инвестирования:')
    users.forEach(user => {
      console.log(`   - ${user.email}: ${user.balance} баланс`)
    })

    // Создаем инвестиции для каждого пользователя
    for (const user of users) {
      console.log(`\n🎯 Обрабатываем пользователя: ${user.email}`)
      
      // Находим подходящий пакет
      let selectedPackage = null
      for (const pkg of packages) {
        if (user.balance >= pkg.minAmount && user.balance <= pkg.maxAmount) {
          selectedPackage = pkg
          break
        }
      }

      // Если не нашли подходящий, берем самый дорогой доступный
      if (!selectedPackage) {
        selectedPackage = packages[packages.length - 1]
      }

      // Создаем инвестицию
      const investmentAmount = Math.min(user.balance, selectedPackage.maxAmount)
      
      const investment = await prisma.investment.create({
        data: {
          userId: user.id,
          packageId: selectedPackage.id,
          amount: investmentAmount,
          startDate: new Date(),
          endDate: new Date(Date.now() + selectedPackage.duration * 24 * 60 * 60 * 1000),
          isActive: true,
          totalEarned: 0,
          createdAt: new Date()
        }
      })

      // Обновляем баланс пользователя
      await prisma.user.update({
        where: { id: user.id },
        data: {
          balance: {
            decrement: investmentAmount
          }
        }
      })

      // Создаем транзакцию депозита
      await prisma.transaction.create({
        data: {
          userId: user.id,
          investmentId: investment.id,
          type: 'DEPOSIT',
          amount: investmentAmount,
          description: `Investment in ${selectedPackage.name}`,
          status: 'COMPLETED',
          createdAt: new Date()
        }
      })

      console.log(`   ✅ Создана инвестиция: ${investmentAmount} в пакет ${selectedPackage.name}`)
      console.log(`   💰 Новый баланс: ${user.balance - investmentAmount}`)
    }

    // Показываем итоговую статистику
    const activeInvestments = await prisma.investment.findMany({
      where: { isActive: true },
      include: {
        user: { select: { email: true } },
        package: true
      }
    })

    console.log('\n📊 Итоговая статистика:')
    console.log(`   💰 Активных инвестиций: ${activeInvestments.length}`)
    
    const totalInvested = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0)
    console.log(`   💵 Общая сумма инвестиций: ${totalInvested}`)

    console.log('\n📋 Детали инвестиций:')
    activeInvestments.forEach(inv => {
      console.log(`   - ${inv.user.email}: ${inv.amount} в ${inv.package.name}`)
    })

    console.log('\n✅ Создание инвестиций завершено!')

  } catch (error) {
    console.error('❌ Ошибка при создании инвестиций:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createInvestments() 