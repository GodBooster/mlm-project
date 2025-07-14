import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deletePackages() {
  try {
    console.log('🗑️  Удаление инвестиционных пакетов...\n')

    const packagesToDelete = [
      'Starter Package',
      'Premium Package', 
      'VIP Package',
      'Elite Package'
    ]

    for (const packageName of packagesToDelete) {
      const package_ = await prisma.investmentPackage.findFirst({
        where: { name: packageName }
      })

      if (package_) {
        // Проверяем, есть ли связанные инвестиции
        const relatedInvestments = await prisma.investment.findMany({
          where: { packageId: package_.id }
        })

        if (relatedInvestments.length > 0) {
          console.log(`⚠️  Пакет "${packageName}" имеет ${relatedInvestments.length} связанных инвестиций. Сначала удаляем инвестиции...`)
          
          // Удаляем связанные транзакции
          for (const investment of relatedInvestments) {
            await prisma.transaction.deleteMany({
              where: { investmentId: investment.id }
            })
          }
          
          // Удаляем инвестиции
          await prisma.investment.deleteMany({
            where: { packageId: package_.id }
          })
        }

        // Удаляем пакет
        await prisma.investmentPackage.delete({
          where: { id: package_.id }
        })
        
        console.log(`✅ Удален пакет: ${packageName}`)
      } else {
        console.log(`⚠️  Пакет не найден: ${packageName}`)
      }
    }

    // Показываем оставшиеся пакеты
    const remainingPackages = await prisma.investmentPackage.findMany()
    console.log('\n📦 Оставшиеся пакеты:')
    remainingPackages.forEach(pkg => {
      console.log(`   - ${pkg.name} (ID: ${pkg.id})`)
    })

    console.log('\n✅ Удаление завершено!')

  } catch (error) {
    console.error('❌ Ошибка при удалении:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deletePackages() 