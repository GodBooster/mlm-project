import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database initialization...')

  // Create investment packages
  const packages = [
    {
      name: 'Starter Package',
      minAmount: 100,
      monthlyYield: 5.0, // 5% monthly
      duration: 30,
      isActive: true
    },
    {
      name: 'Premium Package',
      minAmount: 1000,
      monthlyYield: 8.0, // 8% monthly
      duration: 60,
      isActive: true
    },
    {
      name: 'VIP Package',
      minAmount: 10000,
      monthlyYield: 12.0, // 12% monthly
      duration: 90,
      isActive: true
    },
    {
      name: 'Elite Package',
      minAmount: 100000,
      monthlyYield: 15.0, // 15% monthly
      duration: 120,
      isActive: true
    }
  ]

  console.log('Creating investment packages...')
  for (const packageData of packages) {
    await prisma.investmentPackage.upsert({
      where: { name: packageData.name },
      update: packageData,
      create: packageData
    })
  }

  // Получаем id пакетов после upsert
  const packageList = await prisma.investmentPackage.findMany();
  const packageMap = {};
  for (const pkg of packageList) {
    packageMap[pkg.name] = pkg.id;
  }

  // Create test users
  const bcrypt = await import('bcrypt');
  const users = [
    {
      email: 'admin@example.com',
      username: 'admin',
      password: await bcrypt.hash('admin123', 10),
      balance: 10000,
      bonus: 500,
      rank: 'DIAMOND',
      referralCode: 'ADMIN001',
      isAdmin: true
    },
    {
      email: 'user1@example.com',
      username: 'user1',
      password: await bcrypt.hash('user123', 10),
      balance: 5000,
      bonus: 200,
      rank: 'GOLD',
      referralCode: 'USER001',
      referredBy: 'ADMIN001'
    },
    {
      email: 'user2@example.com',
      username: 'user2',
      password: await bcrypt.hash('user123', 10),
      balance: 2000,
      bonus: 100,
      rank: 'SILVER',
      referralCode: 'USER002',
      referredBy: 'USER001'
    },
    {
      email: 'user3@example.com',
      username: 'user3',
      password: await bcrypt.hash('user123', 10),
      balance: 500,
      bonus: 50,
      rank: 'BRONZE',
      referralCode: 'USER003',
      referredBy: 'USER002'
    }
  ]

  console.log('Creating test users...')
  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: userData,
      create: userData
    })
  }

  // Create test investments
  const testInvestments = [
    {
      userId: 1, // admin
      packageId: packageMap['Premium Package'], // Premium Package
      amount: 5000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      isActive: true,
      totalEarned: 200
    },
    {
      userId: 2, // user1
      packageId: packageMap['Starter Package'], // Starter Package
      amount: 500,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true,
      totalEarned: 50
    },
    {
      userId: 3, // user2
      packageId: packageMap['Starter Package'], // Starter Package
      amount: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isActive: true,
      totalEarned: 20
    }
  ]

  console.log('Creating test investments...')
  for (const investmentData of testInvestments) {
    await prisma.investment.create({
      data: investmentData
    })
  }

  // Получаем реальные инвестиции для маппинга investmentId
  const allInvestments = await prisma.investment.findMany();
  // Ключ: userId + packageId
  const investmentMap = {};
  for (const inv of allInvestments) {
    investmentMap[`${inv.userId}_${inv.packageId}`] = inv.id;
  }

  // Create test transactions
  const testTransactions = [
    {
      userId: 1,
      investmentId: investmentMap[`1_${packageMap['Premium Package']}`],
      type: 'DEPOSIT',
      amount: 5000,
      description: 'Investment deposit',
      status: 'COMPLETED'
    },
    {
      userId: 1,
      investmentId: investmentMap[`1_${packageMap['Premium Package']}`],
      type: 'DAILY_PROFIT',
      amount: 13.33,
      description: 'Daily profit from Premium Package',
      status: 'COMPLETED'
    },
    {
      userId: 2,
      investmentId: investmentMap[`2_${packageMap['Starter Package']}`],
      type: 'DEPOSIT',
      amount: 500,
      description: 'Investment deposit',
      status: 'COMPLETED'
    },
    {
      userId: 2,
      type: 'REFERRAL_BONUS',
      amount: 10,
      description: 'Referral bonus from user 3',
      status: 'COMPLETED'
    },
    {
      userId: 1,
      type: 'REFERRAL_BONUS',
      amount: 10,
      description: 'Referral bonus from user 2',
      status: 'COMPLETED'
    },
    {
      userId: 1,
      type: 'RANK_BONUS',
      amount: 1000,
      description: 'Rank bonus for DIAMOND',
      status: 'COMPLETED'
    }
  ]

  console.log('Creating test transactions...')
  for (const transactionData of testTransactions) {
    await prisma.transaction.create({
      data: transactionData
    })
  }

  console.log('Database initialization completed successfully!')
}

main()
  .catch((e) => {
    console.error('Error during database initialization:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 