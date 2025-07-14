import 'dotenv/config'
import Boss from 'pg-boss'

console.log('DATABASE_URL:', process.env.DATABASE_URL)

const boss = new Boss({
  connectionString: process.env.DATABASE_URL,
  schema: 'pgboss',
  monitorInterval: 1000,
  newJobCheckInterval: 1000,
  archiveCompletedJobsEvery: 1000
})

async function testPublish() {
  try {
    await boss.start()
    console.log('[TEST] Boss started')
    const jobId = await boss.publish('daily-profit', { test: true })
    console.log('[TEST] Published daily-profit job, jobId:', jobId)
    await boss.stop()
    process.exit(0)
  } catch (err) {
    console.error('[TEST] Error:', err)
    process.exit(1)
  }
}

testPublish() 