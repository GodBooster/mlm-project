import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function cleanupPendingRegistrations() {
  try {
    console.log('🧹 Starting cleanup of expired pending registrations...');
    
    const result = await prisma.pendingRegistration.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    
    console.log(`✅ Cleaned up ${result.count} expired pending registrations`);
    
    return result.count;
  } catch (error) {
    console.error('❌ Error cleaning up pending registrations:', error);
    throw error;
  }
}

// Запускаем очистку каждые 5 минут
export function startCleanupScheduler() {
  console.log('🕐 Starting pending registrations cleanup scheduler...');
  
  // Очистка каждые 5 минут
  setInterval(async () => {
    try {
      await cleanupPendingRegistrations();
    } catch (error) {
      console.error('❌ Cleanup scheduler error:', error);
    }
  }, 5 * 60 * 1000); // 5 минут
  
  // Первая очистка через 5 минут после запуска
  setTimeout(async () => {
    try {
      await cleanupPendingRegistrations();
    } catch (error) {
      console.error('❌ Initial cleanup error:', error);
    }
  }, 5 * 60 * 1000); // 5 минут
}
