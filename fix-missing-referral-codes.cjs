const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

function generateReferralCode() {
  // Генерируем 6-символьный код из букв и цифр
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function fixMissingReferralCodes() {
  try {
    console.log('🔧 Fixing missing referral codes...');
    
    // Находим пользователей без referral кодов
    const usersWithoutReferralCode = await prisma.user.findMany({
      where: {
        OR: [
          { referralCode: null },
          { referralCode: '' }
        ]
      },
      select: {
        id: true,
        email: true,
        referralCode: true
      }
    });
    
    console.log(`Found ${usersWithoutReferralCode.length} users without referral codes`);
    
    if (usersWithoutReferralCode.length === 0) {
      console.log('✅ All users have referral codes!');
      return;
    }
    
    // Исправляем каждого пользователя
    for (const user of usersWithoutReferralCode) {
      console.log(`\n👤 User ${user.id} (${user.email}) - missing referral code`);
      
      let newReferralCode;
      let isUnique = false;
      let attempts = 0;
      
      // Генерируем уникальный код
      while (!isUnique && attempts < 10) {
        newReferralCode = generateReferralCode();
        
        // Проверяем уникальность
        const existingUser = await prisma.user.findUnique({
          where: { referralCode: newReferralCode }
        });
        
        if (!existingUser) {
          isUnique = true;
        } else {
          attempts++;
        }
      }
      
      if (!isUnique) {
        console.log(`❌ Failed to generate unique referral code for user ${user.id}`);
        continue;
      }
      
      // Обновляем пользователя
      await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: newReferralCode }
      });
      
      console.log(`✅ Generated referral code: ${newReferralCode}`);
    }
    
    console.log('\n🎉 Missing referral codes fixed!');
    
    // Проверяем результат
    const finalCheck = await prisma.user.findMany({
      where: {
        OR: [
          { referralCode: null },
          { referralCode: '' }
        ]
      }
    });
    
    console.log(`📊 Final check: ${finalCheck.length} users still without referral codes`);
    
  } catch (error) {
    console.error('❌ Error fixing missing referral codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Запускаем исправление
fixMissingReferralCodes();
