import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function checkAdminUsers() {
  try {
    console.log('Checking admin users in database...');
    
    // Найти всех админских пользователей
    const adminUsers = await prisma.user.findMany({
      where: { isAdmin: true },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        emailVerified: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${adminUsers.length} admin users:`);
    adminUsers.forEach(user => {
      console.log(`- ${user.email} (${user.username}) - Admin: ${user.isAdmin}, Verified: ${user.emailVerified}`);
    });
    
    if (adminUsers.length === 0) {
      console.log('\nNo admin users found. Creating one...');
      
      const hashedPassword = await bcrypt.hash('admin123456', 10);
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@margine-space.com',
          username: 'admin',
          password: hashedPassword,
          isAdmin: true,
          emailVerified: true,
          referralCode: 'ADMIN001',
          balance: 0,
          bonus: 0
        }
      });
      
      console.log('Created admin user:', newAdmin.email);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdminUsers();
