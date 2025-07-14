import 'dotenv/config'
import Boss from 'pg-boss'

console.log('🔍 Pg-boss Debug Script')
console.log('DATABASE_URL:', process.env.DATABASE_URL)

// Test different configurations
const configs = [
  {
    name: 'Default config',
    config: process.env.DATABASE_URL
  },
  {
    name: 'With schema',
    config: {
      connectionString: process.env.DATABASE_URL,
      schema: 'pgboss'
    }
  },
  {
    name: 'With minimal options',
    config: {
      connectionString: process.env.DATABASE_URL,
      schema: 'pgboss',
      monitorInterval: 1000,
      newJobCheckInterval: 1000
    }
  },
  {
    name: 'With all options',
    config: {
      connectionString: process.env.DATABASE_URL,
      schema: 'pgboss',
      monitorInterval: 1000,
      newJobCheckInterval: 1000,
      archiveCompletedJobsEvery: 1000,
      deleteArchivedJobsEvery: 1000,
      maintenanceIntervalMinutes: 1
    }
  }
]

async function testConfig(config, configName) {
  console.log(`\n🧪 Testing: ${configName}`)
  
  const boss = new Boss(config)
  
  try {
    console.log('  Starting boss...')
    await boss.start()
    console.log('  ✅ Boss started')
    
    console.log('  Publishing job...')
    const jobId = await boss.publish('test-job', { test: true })
    console.log(`  ✅ Job published, jobId: ${jobId}`)
    
    if (jobId) {
      console.log('  ✅ SUCCESS - Job published with ID!')
    } else {
      console.log('  ❌ FAILED - Job published but no ID returned')
    }
    
    await boss.stop()
    console.log('  ✅ Boss stopped')
    
    return jobId !== undefined
  } catch (error) {
    console.error(`  ❌ ERROR: ${error.message}`)
    try {
      await boss.stop()
    } catch (e) {
      // Ignore stop errors
    }
    return false
  }
}

async function runTests() {
  console.log('\n🚀 Starting pg-boss configuration tests...\n')
  
  for (const config of configs) {
    const success = await testConfig(config.config, config.name)
    if (success) {
      console.log(`\n🎉 FOUND WORKING CONFIG: ${config.name}`)
      console.log('Config:', JSON.stringify(config.config, null, 2))
      return config.config
    }
  }
  
  console.log('\n❌ No working configuration found')
  return null
}

runTests().then((workingConfig) => {
  if (workingConfig) {
    console.log('\n💡 Use this configuration in your main app!')
  }
  process.exit(0)
}).catch(console.error) 