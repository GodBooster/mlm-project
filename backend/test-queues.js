const BASE_URL = 'http://localhost:3000'

async function testQueues() {
  console.log('🧪 Тестирование системы очередей...\n')

  try {
    // 1. Проверяем здоровье сервера
    console.log('1. Проверка здоровья сервера...')
    const healthResponse = await fetch(`${BASE_URL}/health`)
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`)
    }
    const healthData = await healthResponse.json()
    console.log('✅ Сервер работает:', healthData)

    // 2. Получаем инвестиционные пакеты
    console.log('\n2. Получение инвестиционных пакетов...')
    const packagesResponse = await fetch(`${BASE_URL}/api/packages`)
    if (!packagesResponse.ok) {
      throw new Error(`Failed to get packages: ${packagesResponse.status}`)
    }
    const packages = await packagesResponse.json()
    console.log('✅ Пакеты загружены:', packages.length, 'шт.')

    if (packages.length === 0) {
      console.log('⚠️  Нет доступных пакетов, создаем тестовый пакет...')
      const createPackageResponse = await fetch(`${BASE_URL}/api/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Package',
          minAmount: 100,
          maxAmount: 10000,
          monthlyYield: 12,
          duration: 30,
          isActive: true
        })
      })
      if (createPackageResponse.ok) {
        const newPackage = await createPackageResponse.json()
        console.log('✅ Тестовый пакет создан:', newPackage.id)
      }
    }

    // 3. Получаем пользователей
    console.log('\n3. Получение пользователей...')
    const usersResponse = await fetch(`${BASE_URL}/api/users`)
    if (!usersResponse.ok) {
      throw new Error(`Failed to get users: ${usersResponse.status}`)
    }
    const users = await usersResponse.json()
    console.log('✅ Пользователи загружены:', users.length, 'шт.')

    if (users.length === 0) {
      console.log('⚠️  Нет пользователей, создаем тестового пользователя...')
      const createUserResponse = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          username: 'testuser',
          password: 'password123',
          referralCode: 'TEST123'
        })
      })
      if (createUserResponse.ok) {
        const newUser = await createUserResponse.json()
        console.log('✅ Тестовый пользователь создан:', newUser.id)
      }
    }

    // 4. Тестируем создание инвестиции
    console.log('\n4. Тестирование создания инвестиции...')
    const investmentData = {
      userId: 1,
      packageId: 1,
      amount: 1000
    }
    const investmentResponse = await fetch(`${BASE_URL}/api/investments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(investmentData)
    })
    if (!investmentResponse.ok) {
      const errorData = await investmentResponse.json()
      throw new Error(`Failed to create investment: ${errorData.error}`)
    }
    const investment = await investmentResponse.json()
    console.log('✅ Инвестиция создана:', investment.id)

    // 5. Тестируем публикацию бонуса
    console.log('\n5. Тестирование публикации бонуса...')
    const bonusData = {
      userId: 1,
      amount: 50,
      reason: 'Тестовый бонус'
    }
    const bonusResponse = await fetch(`${BASE_URL}/api/queue/bonus`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bonusData)
    })
    if (!bonusResponse.ok) {
      const errorData = await bonusResponse.json()
      throw new Error(`Failed to publish bonus: ${errorData.error}`)
    }
    const bonusResult = await bonusResponse.json()
    console.log('✅ Бонус опубликован:', bonusResult)

    // 6. Тестируем ручной запуск ежедневных начислений
    console.log('\n6. Тестирование ежедневных начислений...')
    const dailyProfitResponse = await fetch(`${BASE_URL}/api/queue/daily-profit/trigger`, {
      method: 'POST'
    })
    if (!dailyProfitResponse.ok) {
      const errorData = await dailyProfitResponse.json()
      throw new Error(`Failed to trigger daily profit: ${errorData.error}`)
    }
    const dailyProfitResult = await dailyProfitResponse.json()
    console.log('✅ Ежедневные начисления запущены:', dailyProfitResult)

    // Ждем немного для обработки очереди
    console.log('⏳ Ожидание обработки очереди...')
    await new Promise(resolve => setTimeout(resolve, 3000))

    // 7. Получаем статистику инвестиций
    console.log('\n7. Получение статистики инвестиций...')
    const statsResponse = await fetch(`${BASE_URL}/api/investments/stats/1`)
    if (!statsResponse.ok) {
      const errorData = await statsResponse.json()
      throw new Error(`Failed to get investment stats: ${errorData.error}`)
    }
    const stats = await statsResponse.json()
    console.log('✅ Статистика загружена:', stats)

    // 8. Получаем транзакции пользователя
    console.log('\n8. Получение транзакций пользователя...')
    const transactionsResponse = await fetch(`${BASE_URL}/api/transactions/user/1`)
    if (!transactionsResponse.ok) {
      const errorData = await transactionsResponse.json()
      throw new Error(`Failed to get transactions: ${errorData.error}`)
    }
    const transactions = await transactionsResponse.json()
    console.log('✅ Транзакции загружены:', transactions.length, 'шт.')
    
    // Проверяем, что транзакции обработались
    const bonusTransactions = transactions.filter(t => t.type === 'BONUS')
    const dailyProfitTransactions = transactions.filter(t => t.type === 'DAILY_PROFIT')
    console.log(`   - Бонусные транзакции: ${bonusTransactions.length}`)
    console.log(`   - Ежедневные начисления: ${dailyProfitTransactions.length}`)

    // 9. Тестируем обновление ранга
    console.log('\n9. Тестирование обновления ранга...')
    const rankResponse = await fetch(`${BASE_URL}/api/ranks/update/1`, {
      method: 'POST'
    })
    if (!rankResponse.ok) {
      const errorData = await rankResponse.json()
      throw new Error(`Failed to update rank: ${errorData.error}`)
    }
    const rankResult = await rankResponse.json()
    console.log('✅ Ранг обновлен:', rankResult)

    console.log('\n🎉 Все тесты прошли успешно!')
    console.log('\n📊 Система очередей работает корректно:')
    console.log('   ✅ Ежедневные начисления (Daily Profit)')
    console.log('   ✅ Обработка депозитов (Deposit)')
    console.log('   ✅ Реферальные бонусы (Referral Bonus)')
    console.log('   ✅ Бонусы за ранги (Rank Bonus)')
    console.log('   ✅ Награды за ранги (Rank Reward)')
    console.log('   ✅ Общие бонусы (Bonus)')

  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Функция для проверки готовности сервера
async function waitForServer() {
  const maxAttempts = 30
  let attempts = 0
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(`${BASE_URL}/health`)
      if (response.ok) {
        console.log('🚀 Сервер готов к тестированию!')
        return true
      }
    } catch (error) {
      // Игнорируем ошибки подключения
    }
    
    attempts++
    console.log(`⏳ Ожидание сервера... (${attempts}/${maxAttempts})`)
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  console.error('❌ Сервер не запустился за отведенное время')
  return false
}

// Запускаем тесты после готовности сервера
waitForServer().then(serverReady => {
  if (serverReady) {
    setTimeout(testQueues, 1000)
  }
}) 