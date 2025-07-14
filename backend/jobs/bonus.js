import Boss from 'pg-boss'
const boss = new Boss(process.env.DATABASE_URL)

async function main() {
  await boss.start()

  // Пример публикации задачи в очередь
  await boss.publish('assign-bonus', { userId: 123 })

  await boss.work('assign-bonus', async job => {
    const { userId } = job.data
    // начисление бонуса
    console.log(`Начисляю бонус пользователю ${userId}`)
  })
}

main().catch(console.error) 