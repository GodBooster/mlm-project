import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDefiData() {
  try {
    console.log('🔍 Проверяем данные в таблице defi_positions...\n');
    
    // Проверяем общее количество записей
    const totalCount = await prisma.defiPosition.count();
    console.log(`📊 Общее количество записей: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log('❌ Таблица пуста - данных пока нет');
      return;
    }
    
    // Получаем все записи
    const allPositions = await prisma.defiPosition.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log('\n📋 Все записи в таблице defi_positions:');
    console.log('=' .repeat(80));
    
    allPositions.forEach((position, index) => {
      console.log(`\n${index + 1}. Позиция ID: ${position.id}`);
      console.log(`   Пользователь: ${position.user.email} (ID: ${position.userId})`);
      console.log(`   Пул: ${position.symbol} (${position.project})`);
      console.log(`   Блокчейн: ${position.chain}`);
      console.log(`   Статус: ${position.status}`);
      console.log(`   APR при входе: ${position.entryApy}%`);
      console.log(`   Текущий APR: ${position.currentApy}%`);
      console.log(`   TVL при входе: $${position.entryTvl.toLocaleString()}`);
      console.log(`   Текущий TVL: $${position.currentTvl.toLocaleString()}`);
      console.log(`   Дата входа: ${position.entryDate.toLocaleString('ru-RU')}`);
      if (position.exitDate) {
        console.log(`   Дата выхода: ${position.exitDate.toLocaleString('ru-RU')}`);
        console.log(`   Причина выхода: ${position.exitReason}`);
      }
      console.log(`   Создано: ${position.createdAt.toLocaleString('ru-RU')}`);
      console.log(`   Обновлено: ${position.updatedAt.toLocaleString('ru-RU')}`);
    });
    
    // Статистика по статусам
    const farmingCount = await prisma.defiPosition.count({
      where: { status: 'FARMING' }
    });
    
    const unstakedCount = await prisma.defiPosition.count({
      where: { status: 'UNSTAKED' }
    });
    
    console.log('\n📈 Статистика по статусам:');
    console.log(`   Активные (FARMING): ${farmingCount}`);
    console.log(`   Закрытые (UNSTAKED): ${unstakedCount}`);
    
    // Статистика по пользователям
    const userStats = await prisma.defiPosition.groupBy({
      by: ['userId'],
      _count: {
        id: true
      },
      include: {
        user: {
          select: {
            email: true,
            username: true
          }
        }
      }
    });
    
    console.log('\n👥 Статистика по пользователям:');
    userStats.forEach(stat => {
      console.log(`   ${stat.user.email}: ${stat._count.id} позиций`);
    });
    
  } catch (error) {
    console.error('❌ Ошибка при проверке данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDefiData(); 