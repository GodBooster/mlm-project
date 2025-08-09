import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateMaxAmount() {
  try {
    console.log('Updating existing packages with maxAmount values...')
    
    // Обновляем каждый пакет с соответствующим maxAmount
    const updates = [
      { name: 'Member', maxAmount: 999 },
      { name: 'Adept', maxAmount: 4999 },
      { name: 'Visionary', maxAmount: 9999 },
      { name: 'Elite', maxAmount: 24999 },
      { name: 'Fortune', maxAmount: 100000 }
    ]
    
    for (const update of updates) {
      const result = await prisma.investmentPackage.updateMany({
        where: { name: update.name },
        data: { maxAmount: update.maxAmount }
      })
      console.log(`Updated ${result.count} records for ${update.name}`)
    }
    
    console.log('All packages updated successfully!')
  } catch (error) {
    console.error('Error updating packages:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateMaxAmount() 