const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 Проверяем подключение к базе данных...\n');
    
    // Проверяем подключение
    await prisma.$connect();
    console.log('✅ Подключение к базе данных успешно');
    
    // Проверяем таблицу defi_positions
    const count = await prisma.defiPosition.count();
    console.log(`📊 Количество записей в defi_positions: ${count}`);
    
    if (count > 0) {
      const positions = await prisma.defiPosition.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('\n📋 Последние записи:');
      positions.forEach((pos, index) => {
        console.log(`${index + 1}. ID: ${pos.id}, Pool: ${pos.symbol}, Status: ${pos.status}`);
      });
    } else {
      console.log('📝 Таблица пуста - данных пока нет');
    }
    
    // Проверяем таблицу User
    const userCount = await prisma.user.count();
    console.log(`👥 Количество пользователей: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 