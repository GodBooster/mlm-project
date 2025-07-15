const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Инициализация клиентов
const prisma = new PrismaClient();
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

console.log('🚀 Начинаем миграцию SQLite → PostgreSQL...');

async function migrateData() {
  try {
    // Миграция пользователей
    console.log('📊 Мигрируем пользователей...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM User', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          password: user.password,
          balance: user.balance,
          bonus: user.bonus,
          rank: user.rank,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          wallet: user.wallet,
          avatar: user.avatar,
          isAdmin: user.isAdmin === 1,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }
    console.log(`✅ Мигрировано ${users.length} пользователей`);

    // Миграция инвестиционных пакетов
    console.log('📦 Мигрируем инвестиционные пакеты...');
    const packages = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM InvestmentPackage', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const pkg of packages) {
      await prisma.investmentPackage.create({
        data: {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
          minAmount: pkg.minAmount,
          maxAmount: pkg.maxAmount,
          dailyProfit: pkg.dailyProfit,
          duration: pkg.duration,
          isActive: pkg.isActive === 1,
          createdAt: new Date(pkg.createdAt),
          updatedAt: new Date(pkg.updatedAt)
        }
      });
    }
    console.log(`✅ Мигрировано ${packages.length} инвестиционных пакетов`);

    // Миграция инвестиций
    console.log('💰 Мигрируем инвестиции...');
    const investments = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Investment', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const investment of investments) {
      await prisma.investment.create({
        data: {
          id: investment.id,
          userId: investment.userId,
          packageId: investment.packageId,
          amount: investment.amount,
          dailyProfit: investment.dailyProfit,
          totalProfit: investment.totalProfit,
          status: investment.status,
          startDate: new Date(investment.startDate),
          endDate: investment.endDate ? new Date(investment.endDate) : null,
          createdAt: new Date(investment.createdAt),
          updatedAt: new Date(investment.updatedAt)
        }
      });
    }
    console.log(`✅ Мигрировано ${investments.length} инвестиций`);

    // Миграция транзакций
    console.log('💳 Мигрируем транзакции...');
    const transactions = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Transaction', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const transaction of transactions) {
      await prisma.transaction.create({
        data: {
          id: transaction.id,
          userId: transaction.userId,
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          status: transaction.status,
          createdAt: new Date(transaction.createdAt),
          updatedAt: new Date(transaction.updatedAt)
        }
      });
    }
    console.log(`✅ Мигрировано ${transactions.length} транзакций`);

    console.log('🎉 Миграция завершена успешно!');
    console.log('📊 Статистика:');
    console.log(`   - Пользователи: ${users.length}`);
    console.log(`   - Инвестиционные пакеты: ${packages.length}`);
    console.log(`   - Инвестиции: ${investments.length}`);
    console.log(`   - Транзакции: ${transactions.length}`);

  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
    throw error;
  } finally {
    // Закрываем соединения
    sqliteDb.close();
    await prisma.$disconnect();
  }
}

// Запуск миграции
migrateData()
  .then(() => {
    console.log('✅ Миграция завершена!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Миграция не удалась:', error);
    process.exit(1);
  }); 