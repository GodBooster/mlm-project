import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('Checking users in database...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        password: true
      }
    })
    
    console.log('Users:')
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Username: ${user.username}, isAdmin: ${user.isAdmin}, Password length: ${user.password?.length || 0}`)
    })
    
  } catch (error) {
    console.error('Error checking users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers() 