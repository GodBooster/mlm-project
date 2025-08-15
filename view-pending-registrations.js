import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function viewPendingRegistrations() {
  console.log('=== PENDING REGISTRATIONS ===\n');
  
  try {
    const pendingUsers = await prisma.pendingRegistration.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`📊 Total pending registrations: ${pendingUsers.length}\n`);
    
    if (pendingUsers.length === 0) {
      console.log('🔸 No pending registrations found');
      return;
    }
    
    pendingUsers.forEach((user, index) => {
      const now = new Date();
      const isExpired = user.expiresAt < now;
      const timeLeft = isExpired ? 'EXPIRED' : `${Math.round((user.expiresAt - now) / 1000 / 60)} min`;
      
      console.log(`${index + 1}. Email: ${user.email}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   Code: ${user.verificationCode}`);
      console.log(`   Token: ${user.verificationToken.substring(0, 20)}...`);
      console.log(`   Created: ${user.createdAt.toLocaleString()}`);
      console.log(`   Expires: ${user.expiresAt.toLocaleString()} (${timeLeft})`);
      console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`);
      console.log(`   Referral: ${user.referralCode || 'None'}`);
      console.log('');
    });
    
    // Статистика
    const activeCount = pendingUsers.filter(u => u.expiresAt >= new Date()).length;
    const expiredCount = pendingUsers.length - activeCount;
    
    console.log('📈 STATISTICS:');
    console.log(`   Active: ${activeCount}`);
    console.log(`   Expired: ${expiredCount}`);
    
  } catch (error) {
    console.error('❌ Error fetching pending registrations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

viewPendingRegistrations();
