const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixForeignKeyIssues() {
  try {
    console.log('🔧 Fixing foreign key constraint issues...');
    
    // Находим пользователей с невалидными referredBy
    const usersWithInvalidReferrer = await prisma.user.findMany({
      where: {
        referredBy: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        referredBy: true
      }
    });
    
    console.log(`Found ${usersWithInvalidReferrer.length} users with referredBy field`);
    
    // Проверяем каждого пользователя
    for (const user of usersWithInvalidReferrer) {
      console.log(`\n👤 User ${user.id} (${user.email}) has referredBy: "${user.referredBy}"`);
      
      // Проверяем существует ли пользователь с таким referral кодом
      const referrer = await prisma.user.findFirst({
        where: { 
          referralCode: user.referredBy 
        }
      });
      
      if (referrer) {
        console.log(`✅ Valid referral code: "${user.referredBy}" -> User ${referrer.id} (${referrer.email})`);
      } else {
        console.log(`❌ Invalid referral code: "${user.referredBy}" - no user found with this code`);
        
        // Убираем невалидную ссылку
        await prisma.user.update({
          where: { id: user.id },
          data: { referredBy: null }
        });
        
        console.log(`✅ Fixed user ${user.id} - removed invalid referral code`);
      }
    }
    
    console.log('\n🎉 Foreign key constraint issues fixed!');
    console.log('💡 referredBy field correctly stores referral codes (strings), not user IDs');
    
  } catch (error) {
    console.error('❌ Error fixing foreign key issues:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем исправление
fixForeignKeyIssues();
