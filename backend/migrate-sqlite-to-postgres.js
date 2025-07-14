import sqlite3 from 'sqlite3'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// Функция для подключения к SQLite
function connectSQLite() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('./database.sqlite', (err) => {
      if (err) {
        reject(err)
      } else {
        resolve(db)
      }
    })
  })
}

// Функция для выполнения запроса к SQLite
function querySQLite(db, sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })
}

function mapTransactionType(type) {
  switch ((type || '').toLowerCase().replace(/ /g, '_')) {
    case 'deposit': return 'DEPOSIT'
    case 'withdrawal': return 'WITHDRAWAL'
    case 'daily_profit': case 'dailyprofit': return 'DAILY_PROFIT'
    case 'referral_bonus': case 'referralbonus': return 'REFERRAL_BONUS'
    case 'rank_bonus': case 'rankbonus': return 'RANK_BONUS'
    case 'rank_reward': case 'rankreward': return 'RANK_REWARD'
    case 'bonus': return 'BONUS'
    default: return 'BONUS'
  }
}

async function migrateData() {
  let sqliteDb = null
  
  try {
    console.log('🚀 Миграция данных из SQLite в PostgreSQL...\n')

    // Подключаемся к SQLite
    sqliteDb = await connectSQLite()
    console.log('✅ Подключение к SQLite успешно')

    // Подключаемся к PostgreSQL
    await prisma.$connect()
    console.log('✅ Подключение к PostgreSQL успешно\n')

    // Мигрируем пользователей
    console.log('👥 Миграция пользователей...')
    const sqliteUsers = await querySQLite(sqliteDb, 'SELECT * FROM Users')
    
    for (const sqliteUser of sqliteUsers) {
      // Проверяем, существует ли пользователь в PostgreSQL
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: sqliteUser.email },
            { username: sqliteUser.username || sqliteUser.email }
          ]
        }
      })

      if (!existingUser) {
        // Хешируем пароль
        const hashedPassword = await bcrypt.hash(sqliteUser.password, 10)
        
        // Генерируем referral code
        const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        
        // Создаем пользователя
        const newUser = await prisma.user.create({
          data: {
            email: sqliteUser.email,
            username: sqliteUser.username || sqliteUser.email,
            password: hashedPassword,
            balance: sqliteUser.balance || 0,
            rank: 'BRONZE',
            referralCode,
            createdAt: new Date(sqliteUser.createdAt),
            updatedAt: new Date(sqliteUser.updatedAt)
          }
        })
        console.log(`   ✅ Создан пользователь: ${newUser.email}`)
      } else {
        console.log(`   ⏭️  Пользователь уже существует: ${sqliteUser.email}`)
      }
    }

    // Мигрируем пакеты
    console.log('\n📦 Миграция инвестиционных пакетов...')
    const sqlitePackages = await querySQLite(sqliteDb, 'SELECT * FROM Packages')
    
    for (const sqlitePackage of sqlitePackages) {
      const existingPackage = await prisma.investmentPackage.findFirst({
        where: { name: sqlitePackage.name }
      })

      if (!existingPackage) {
        const newPackage = await prisma.investmentPackage.create({
          data: {
            name: sqlitePackage.name,
            minAmount: sqlitePackage.minAmount || 100,
            monthlyYield: sqlitePackage.monthlyYield || 10,
            duration: sqlitePackage.duration || 30,
            isActive: true,
            createdAt: new Date()
          }
        })
        console.log(`   ✅ Создан пакет: ${newPackage.name}`)
      } else {
        console.log(`   ⏭️  Пакет уже существует: ${sqlitePackage.name}`)
      }
    }

    // Мигрируем инвестиции
    console.log('\n💰 Миграция инвестиций...')
    const sqliteInvestments = await querySQLite(sqliteDb, 'SELECT * FROM Investments')
    
    for (const sqliteInvestment of sqliteInvestments) {
      // Находим пользователя
      const user = await prisma.user.findFirst({
        where: { email: sqliteInvestment.userEmail }
      })
      
      // Находим пакет
      const package_ = await prisma.investmentPackage.findFirst({
        where: { name: sqliteInvestment.packageName }
      })

      if (user && package_) {
        const existingInvestment = await prisma.investment.findFirst({
          where: {
            userId: user.id,
            packageId: package_.id,
            amount: sqliteInvestment.amount
          }
        })

        if (!existingInvestment) {
                  const newInvestment = await prisma.investment.create({
          data: {
            userId: user.id,
            packageId: package_.id,
            amount: sqliteInvestment.amount,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
            isActive: sqliteInvestment.isActive === 1,
            totalEarned: sqliteInvestment.totalEarned || 0,
            createdAt: new Date()
          }
        })
          console.log(`   ✅ Создана инвестиция: ${newInvestment.id}`)
        } else {
          console.log(`   ⏭️  Инвестиция уже существует: ${existingInvestment.id}`)
        }
      } else {
        console.log(`   ⚠️  Не удалось найти пользователя или пакет для инвестиции`)
      }
    }

    // Мигрируем транзакции
    console.log('\n📈 Миграция транзакций...')
    const sqliteTransactions = await querySQLite(sqliteDb, 'SELECT * FROM Transactions')
    
    for (const sqliteTransaction of sqliteTransactions) {
      // Находим пользователя
      const user = await prisma.user.findFirst({
        where: { email: sqliteTransaction.userEmail }
      })

      const mappedType = mapTransactionType(sqliteTransaction.type)

      if (user) {
        const existingTransaction = await prisma.transaction.findFirst({
          where: {
            userId: user.id,
            amount: sqliteTransaction.amount,
            type: mappedType,
            createdAt: new Date(sqliteTransaction.createdAt)
          }
        })

        if (!existingTransaction) {
          const newTransaction = await prisma.transaction.create({
            data: {
              userId: user.id,
              type: mappedType,
              amount: sqliteTransaction.amount,
              description: sqliteTransaction.description || 'Migrated transaction',
              status: 'COMPLETED',
              createdAt: new Date(sqliteTransaction.createdAt)
            }
          })
          console.log(`   ✅ Создана транзакция: ${newTransaction.id}`)
        } else {
          console.log(`   ⏭️  Транзакция уже существует: ${existingTransaction.id}`)
        }
      } else {
        console.log(`   ⚠️  Не удалось найти пользователя для транзакции`)
      }
    }

    console.log('\n🎉 Миграция завершена!')
    
    // Проверяем результат
    const postgresUsers = await prisma.user.count()
    const postgresPackages = await prisma.investmentPackage.count()
    const postgresInvestments = await prisma.investment.count()
    const postgresTransactions = await prisma.transaction.count()
    
    console.log('\n📊 Итоговая статистика PostgreSQL:')
    console.log(`   👥 Пользователей: ${postgresUsers}`)
    console.log(`   📦 Пакетов: ${postgresPackages}`)
    console.log(`   💰 Инвестиций: ${postgresInvestments}`)
    console.log(`   📈 Транзакций: ${postgresTransactions}`)

  } catch (error) {
    console.error('❌ Ошибка при миграции:', error)
  } finally {
    if (sqliteDb) {
      sqliteDb.close()
    }
    await prisma.$disconnect()
  }
}

migrateData() 