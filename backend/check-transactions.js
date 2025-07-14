import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTransactions() {
  try {
    console.log('🔍 Детальная проверка транзакций...\n')

    // Получаем все транзакции с информацией о пользователях
    const transactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        },
        investment: {
          include: {
            package: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`📊 Всего транзакций: ${transactions.length}\n`)

    // Группируем по типам
    const groupedTransactions = {}
    transactions.forEach(tx => {
      if (!groupedTransactions[tx.type]) {
        groupedTransactions[tx.type] = []
      }
      groupedTransactions[tx.type].push(tx)
    })

    // Показываем детали по каждому типу
    for (const [type, txs] of Object.entries(groupedTransactions)) {
      console.log(`📈 ${type} (${txs.length}):`)
      txs.forEach(tx => {
        console.log(`   ID: ${tx.id}, User: ${tx.user.email}, Amount: ${tx.amount}, Date: ${tx.createdAt.toISOString().split('T')[0]}`)
        if (tx.investment) {
          console.log(`     Investment: ${tx.investment.package.name} (${tx.investment.amount})`)
        }
      })
      console.log('')
    }

    // Проверяем активные инвестиции
    console.log('💰 Активные инвестиции:')
    const activeInvestments = await prisma.investment.findMany({
      where: { isActive: true },
      include: {
        user: {
          select: { email: true }
        },
        package: true
      }
    })

    if (activeInvestments.length === 0) {
      console.log('   ❌ Нет активных инвестиций')
    } else {
      activeInvestments.forEach(inv => {
        console.log(`   ID: ${inv.id}, User: ${inv.user.email}, Package: ${inv.package.name}, Amount: ${inv.amount}`)
      })
    }

  } catch (error) {
    console.error('❌ Ошибка:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkTransactions() 