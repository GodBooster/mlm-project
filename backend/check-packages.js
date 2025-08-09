import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkPackages() {
  try {
    console.log('Checking packages in database...')
    
    const packages = await prisma.investmentPackage.findMany()
    
    console.log('All packages:')
    packages.forEach(pkg => {
      console.log(`- ${pkg.name}: minAmount=${pkg.minAmount}, maxAmount=${pkg.maxAmount}, isActive=${pkg.isActive}`)
    })
    
    const activePackages = await prisma.investmentPackage.findMany({
      where: { isActive: true }
    })
    
    console.log('\nActive packages:')
    activePackages.forEach(pkg => {
      console.log(`- ${pkg.name}: minAmount=${pkg.minAmount}, maxAmount=${pkg.maxAmount}`)
    })
    
  } catch (error) {
    console.error('Error checking packages:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkPackages() 