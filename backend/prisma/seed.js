//nano prisma/seed.js на сервере запустить

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // 1. Создание investment packages
  console.log('📦 Creating investment packages...')
  
  const packages = [
    {
      name: 'Member',
      minAmount: 100,
      maxAmount: 999,
      monthlyYield: 22,
      duration: 30,
      isActive: true
    },
    {
      name: 'Adept', 
      minAmount: 1000,
      maxAmount: 4999,
      monthlyYield: 25,
      duration: 30,
      isActive: true
    },
    {
      name: 'Visionary',
      minAmount: 5000,
      maxAmount: 9999,
      monthlyYield: 28,
      duration: 30,
      isActive: true
    },
    {
      name: 'Elite',
      minAmount: 10000,
      maxAmount: 24999,
      monthlyYield: 30,
      duration: 30,
      isActive: true
    },
    {
      name: 'Fortune',
      minAmount: 25000,
      maxAmount: 100000,
      monthlyYield: 35,
      duration: 30,
      isActive: true
    }
  ]

  for (const pkg of packages) {
    await prisma.investmentPackage.upsert({
      where: { name: pkg.name },
      update: pkg,
      create: pkg
    })
  }

  // 2. Создание admin пользователей
  console.log('👑 Creating admin users...')
  
  const admins = [
    {
      email: 'admin@margine-space.com',
      username: 'admin',
      password: 'admin123456',
      isAdmin: true,
      emailVerified: true,
      referralCode: 'ADMIN001',
      balance: 0,
      bonus: 0
    },
    {
      email: 'superadmin@margine-space.com',
      username: 'superadmin',
      password: 'superadmin123456',
      isAdmin: true,
      emailVerified: true,
      referralCode: 'ADMIN002',
      balance: 0,
      bonus: 0
    }
  ]

  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash(admin.password, 10)
    await prisma.user.upsert({
      where: { email: admin.email },
      update: { password: hashedPassword },
      create: { ...admin, password: hashedPassword }
    })
  }

  // 3. Создание тестовых пользователей
  console.log('👤 Creating test users...')
  
  const testUsers = [
    {
      email: 'test1@margine-space.com',
      username: 'testuser1',
      password: 'testpass123',
      isAdmin: false,
      emailVerified: true,
      referralCode: 'TEST001',
      balance: 1000,
      bonus: 100
    },
    {
      email: 'test2@margine-space.com',
      username: 'testuser2',
      password: 'testpass123',
      isAdmin: false,
      emailVerified: true,
      referralCode: 'TEST002',
      balance: 2000,
      bonus: 200,
      referredBy: 'TEST001'
    },
    {
      email: 'test3@margine-space.com',
      username: 'testuser3',
      password: 'testpass123',
      isAdmin: false,
      emailVerified: true,
      referralCode: 'TEST003',
      balance: 5000,
      bonus: 500,
      referredBy: 'TEST001'
    }
  ]

  for (const user of testUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10)
    await prisma.user.upsert({
      where: { email: user.email },
      update: { password: hashedPassword },
      create: { ...user, password: hashedPassword }
    })
  }

  // 4. Проверка результатов
  const packageCount = await prisma.investmentPackage.count()
  const userCount = await prisma.user.count()
  
  console.log('\n✅ Database seeding completed successfully!')
  console.log(`📦 Investment packages created: ${packageCount}`)
  console.log(`👥 Users created: ${userCount}`)
  console.log('\n🔑 Login credentials:')
  console.log('Admin: admin@margine-space.com / admin123456')
  console.log('Super Admin: superadmin@margine-space.com / superadmin123456')
  console.log('Test users: test1@margine-space.com, test2@margine-space.com, test3@margine-space.com / testpass123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })