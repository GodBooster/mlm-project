import emailService from './services/email-service.js'

async function testEmails() {
  try {
    // Test 1: Connection check
    console.log('\n🔍 Testing SMTP connection...')
    const connected = await emailService.verifyConnection()
    console.log(connected ? '✅ Connection successful' : '❌ Connection failed')

    if (connected) {
      // Test 2: Verification email
      console.log('\n📧 Testing verification email...')
      await emailService.sendVerificationEmail(
        'test@example.com',
        '123456',
        'test-token-123'
      )
      console.log('✅ Verification email sent')

      // Test 3: Password reset
      console.log('\n🔑 Testing password reset email...')
      await emailService.sendPasswordResetEmail(
        'test@example.com',
        'test-reset-token-123'
      )
      console.log('✅ Password reset email sent')
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
  }
}

testEmails() 