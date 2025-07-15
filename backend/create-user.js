import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function createUser() {
  try {
    // Хешируем пароль
    const password = 'password123'
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Генерируем referral код
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    
    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email: 'directuser@test.com',
        username: 'DirectUser',
        password: hashedPassword,
        referralCode,
        balance: 0,
        bonus: 0,
        rank: 'BRONZE',
        isAdmin: false
      }
    })
    
    console.log('User created successfully:', {
      id: user.id,
      email: user.email,
      username: user.username,
      referralCode: user.referralCode
    })
    
    console.log('You can now login with:')
    console.log('Email: directuser@test.com')
    console.log('Password: password123')
    
  } catch (error) {
    console.error('Error creating user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createUser() 