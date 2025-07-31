const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearDefiPositions() {
  try {
    console.log('🔄 Очистка всех записей DefiPosition...');
    
    const result = await prisma.defiPosition.deleteMany({});
    
    console.log(`✅ Удалено ${result.count} записей DefiPosition`);
    
  } catch (error) {
    console.error('❌ Ошибка при очистке:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDefiPositions(); 