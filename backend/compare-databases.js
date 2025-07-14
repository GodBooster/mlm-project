import sqlite3 from 'sqlite3'
import { PrismaClient } from '@prisma/client'

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

async function compareDatabases() {
  let sqliteDb = null
  
  try {
    console.log('🔍 Сравнение данных между SQLite и PostgreSQL...\n')

    // Подключаемся к SQLite
    sqliteDb = await connectSQLite()
    console.log('✅ Подключение к SQLite успешно')

    // Подключаемся к PostgreSQL
    await prisma.$connect()
    console.log('✅ Подключение к PostgreSQL успешно\n')

    // Сравниваем пользователей
    console.log('👥 СРАВНЕНИЕ ПОЛЬЗОВАТЕЛЕЙ:')
    
    const sqliteUsers = await querySQLite(sqliteDb, 'SELECT * FROM User')
    const postgresUsers = await prisma.user.findMany()
    
    console.log(`SQLite: ${sqliteUsers.length} пользователей`)
    console.log(`PostgreSQL: ${postgresUsers.length} пользователей`)
    
    if (sqliteUsers.length !== postgresUsers.length) {
      console.log('⚠️  Количество пользователей не совпадает!')
      
      console.log('\nSQLite пользователи:')
      sqliteUsers.forEach(user => {
        console.log(`   ID: ${user.id}, Email: ${user.email}, Username: ${user.username}`)
      })
      
      console.log('\nPostgreSQL пользователи:')
      postgresUsers.forEach(user => {
        console.log(`   ID: ${user.id}, Email: ${user.email}, Username: ${user.username}`)
      })
    } else {
      console.log('✅ Количество пользователей совпадает')
    }

    // Сравниваем инвестиционные пакеты
    console.log('\n📦 СРАВНЕНИЕ ИНВЕСТИЦИОННЫХ ПАКЕТОВ:')
    
    const sqlitePackages = await querySQLite(sqliteDb, 'SELECT * FROM InvestmentPackage')
    const postgresPackages = await prisma.investmentPackage.findMany()
    
    console.log(`SQLite: ${sqlitePackages.length} пакетов`)
    console.log(`PostgreSQL: ${postgresPackages.length} пакетов`)
    
    if (sqlitePackages.length !== postgresPackages.length) {
      console.log('⚠️  Количество пакетов не совпадает!')
    } else {
      console.log('✅ Количество пакетов совпадает')
    }

    // Сравниваем инвестиции
    console.log('\n💰 СРАВНЕНИЕ ИНВЕСТИЦИЙ:')
    
    const sqliteInvestments = await querySQLite(sqliteDb, 'SELECT * FROM Investment')
    const postgresInvestments = await prisma.investment.findMany()
    
    console.log(`SQLite: ${sqliteInvestments.length} инвестиций`)
    console.log(`PostgreSQL: ${postgresInvestments.length} инвестиций`)
    
    if (sqliteInvestments.length !== postgresInvestments.length) {
      console.log('⚠️  Количество инвестиций не совпадает!')
    } else {
      console.log('✅ Количество инвестиций совпадает')
    }

    // Сравниваем транзакции
    console.log('\n📈 СРАВНЕНИЕ ТРАНЗАКЦИЙ:')
    
    const sqliteTransactions = await querySQLite(sqliteDb, 'SELECT * FROM Transaction')
    const postgresTransactions = await prisma.transaction.findMany()
    
    console.log(`SQLite: ${sqliteTransactions.length} транзакций`)
    console.log(`PostgreSQL: ${postgresTransactions.length} транзакций`)
    
    if (sqliteTransactions.length !== postgresTransactions.length) {
      console.log('⚠️  Количество транзакций не совпадает!')
    } else {
      console.log('✅ Количество транзакций совпадает')
    }

    console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА:')
    console.log(`SQLite: ${sqliteUsers.length} пользователей, ${sqlitePackages.length} пакетов, ${sqliteInvestments.length} инвестиций, ${sqliteTransactions.length} транзакций`)
    console.log(`PostgreSQL: ${postgresUsers.length} пользователей, ${postgresPackages.length} пакетов, ${postgresInvestments.length} инвестиций, ${postgresTransactions.length} транзакций`)

    if (sqliteUsers.length === postgresUsers.length && 
        sqlitePackages.length === postgresPackages.length && 
        sqliteInvestments.length === postgresInvestments.length && 
        sqliteTransactions.length === postgresTransactions.length) {
      console.log('\n🎉 ВСЕ ДАННЫЕ УСПЕШНО ПЕРЕНЕСЕНЫ В POSTGRESQL!')
    } else {
      console.log('\n⚠️  НЕ ВСЕ ДАННЫЕ ПЕРЕНЕСЕНЫ!')
    }

  } catch (error) {
    console.error('❌ Ошибка при сравнении баз данных:', error)
  } finally {
    if (sqliteDb) {
      sqliteDb.close()
    }
    await prisma.$disconnect()
  }
}

compareDatabases() 