import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    console.log('🔍 Проверка базы данных PostgreSQL...\n')

    // Проверяем подключение
    await prisma.$connect()
    console.log('✅ Подключение к PostgreSQL успешно')

    // Проверяем количество пользователей
    const userCount = await prisma.user.count()
    console.log(`📊 Пользователей в базе: ${userCount}`)

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          username: true,
          balance: true,
          rank: true,
          referralCode: true,
          createdAt: true
        }
      })
      console.log('👥 Список пользователей:')
      users.forEach(user => {
        console.log(`   ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, Balance: ${user.balance}, Rank: ${user.rank}`)
      })
    }

    // Проверяем инвестиционные пакеты
    const packageCount = await prisma.investmentPackage.count()
    console.log(`\n📦 Инвестиционных пакетов: ${packageCount}`)

    if (packageCount > 0) {
      const packages = await prisma.investmentPackage.findMany({
        select: {
          id: true,
          name: true,
          minAmount: true,
          maxAmount: true,
          monthlyYield: true,
          isActive: true
        }
      })
      console.log('📋 Список пакетов:')
      packages.forEach(pkg => {
        console.log(`   ID: ${pkg.id}, Name: ${pkg.name}, Yield: ${pkg.monthlyYield}%, Active: ${pkg.isActive}`)
      })
    }

    // Проверяем инвестиции
    const investmentCount = await prisma.investment.count()
    console.log(`\n💰 Инвестиций: ${investmentCount}`)

    // Проверяем транзакции
    const transactionCount = await prisma.transaction.count()
    console.log(`📈 Транзакций: ${transactionCount}`)

    // Проверяем типы транзакций
    const transactionTypes = await prisma.transaction.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    })
    console.log('\n📊 Типы транзакций:')
    transactionTypes.forEach(type => {
      console.log(`   ${type.type}: ${type._count.type}`)
    })

    console.log('\n✅ Проверка завершена успешно!')
    console.log('🌐 База данных: PostgreSQL')
    console.log('🔗 URL: postgresql://mlmuser:securepass@localhost:5432/mlmdb')

  } catch (error) {
    console.error('❌ Ошибка при проверке базы данных:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase() 