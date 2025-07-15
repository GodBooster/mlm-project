const { PrismaClient } = require('@prisma/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Инициализация клиентов
const prisma = new PrismaClient();
const sqliteDb = new sqlite3.Database(path.join(__dirname, 'database.sqlite'));

console.log('🚀 Начинаем миграцию SQLite → PostgreSQL...');

async function migrateData() {
  try {
    // Миграция пользователей (Users → User)
    console.log('📊 Мигрируем пользователей...');
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Users', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const user of users) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          username: user.name, // name из SQLite → username в Prisma
          password: user.password,
          balance: parseFloat(user.balance) || 0,
          bonus: 0, // новое поле в Prisma
          rank: getRankFromNumber(user.rank), // конвертируем число в строку ранга
          referralCode: user.referralLink || generateReferralCode(), // referralLink → referralCode
          referredBy: null, // новое поле в Prisma
          wallet: '', // новое поле в Prisma
          avatar: user.avatar || '',
          isAdmin: false, // новое поле в Prisma
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt)
        }
      });
    }
    console.log(`✅ Мигрировано ${users.length} пользователей`);

    // Миграция инвестиционных пакетов (Packages → InvestmentPackage)
    console.log('📦 Мигрируем инвестиционные пакеты...');
    const packages = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Packages', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const pkg of packages) {
      await prisma.investmentPackage.create({
        data: {
          id: pkg.id,
          name: pkg.name,
          minAmount: parseFloat(pkg.minAmount) || 0,
          monthlyYield: parseFloat(pkg.percent) || 0, // percent → monthlyYield
          percent: parseFloat(pkg.percent) || 0, // оставляем percent как есть
          duration: parseInt(pkg.duration) || 30,
          isActive: true, // новое поле в Prisma
          createdAt: new Date(pkg.createdAt)
        }
      });
    }
    console.log(`✅ Мигрировано ${packages.length} инвестиционных пакетов`);

    // Миграция инвестиций (Investments → Investment)
    console.log('💰 Мигрируем инвестиции...');
    const investments = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Investments', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const investment of investments) {
      await prisma.investment.create({
        data: {
          id: investment.id,
          userId: investment.UserId,
          packageId: investment.PackageId,
          amount: parseFloat(investment.amount) || 0,
          startDate: new Date(investment.date || investment.createdAt),
          endDate: new Date(investment.date || investment.createdAt), // используем startDate как endDate
          isActive: true, // новое поле в Prisma
          totalEarned: parseFloat(investment.bonus) || 0, // bonus → totalEarned
          lastProfitDate: null, // новое поле в Prisma
          createdAt: new Date(investment.createdAt)
        }
      });
    }
    console.log(`✅ Мигрировано ${investments.length} инвестиций`);

    // Миграция транзакций (Transactions → Transaction)
    console.log('💳 Мигрируем транзакции...');
    const transactions = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM Transactions', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    for (const transaction of transactions) {
      await prisma.transaction.create({
        data: {
          id: transaction.id,
          userId: transaction.UserId,
          investmentId: null, // новое поле в Prisma, пока null
          type: normalizeTransactionType(transaction.type), // нормализуем тип транзакции
          amount: parseFloat(transaction.amount) || 0,
          description: transaction.description || '',
          status: normalizeTransactionStatus(transaction.status), // нормализуем статус
          createdAt: new Date(transaction.createdAt)
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

// Вспомогательные функции для преобразования данных

function getRankFromNumber(rankNumber) {
  const ranks = {
    1: 'BRONZE',
    2: 'SILVER', 
    3: 'GOLD',
    4: 'PLATINUM',
    5: 'DIAMOND'
  };
  return ranks[rankNumber] || 'BRONZE';
}

function generateReferralCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function normalizeTransactionType(type) {
  const typeMap = {
    'deposit': 'DEPOSIT',
    'withdrawal': 'WITHDRAWAL',
    'investment': 'INVESTMENT',
    'bonus': 'BONUS',
    'referral': 'REFERRAL_BONUS',
    'profit': 'DAILY_PROFIT'
  };
  return typeMap[type?.toLowerCase()] || 'DEPOSIT';
}

function normalizeTransactionStatus(status) {
  const statusMap = {
    'pending': 'PENDING',
    'completed': 'COMPLETED',
    'failed': 'FAILED',
    'cancelled': 'CANCELLED'
  };
  return statusMap[status?.toLowerCase()] || 'PENDING';
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