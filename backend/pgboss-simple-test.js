import 'dotenv/config'
import Boss from 'pg-boss'

console.log('DATABASE_URL:', process.env.DATABASE_URL)

const boss = new Boss(process.env.DATABASE_URL)

async function testPublish() {
  try {
    console.log('[TEST] Starting boss...')
    await boss.start()
    console.log('[TEST] Boss started successfully')
    
    console.log('[TEST] Publishing job...')
    const jobId = await boss.publish('simple-test', { message: 'hello' })
    console.log('[TEST] Job published, jobId:', jobId)
    
    console.log('[TEST] Stopping boss...')
    await boss.stop()
    console.log('[TEST] Boss stopped')
    
    process.exit(0)
  } catch (err) {
    console.error('[TEST] Error:', err)
    process.exit(1)
  }
}

testPublish() 