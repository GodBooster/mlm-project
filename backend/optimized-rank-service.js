import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://mlmuser:ItachiUchiha28%2F04@138.199.150.49:5432/mlmdb"
    }
  },
  // Добавляем настройки для стабильного соединения
  log: ['error'],
  errorFormat: 'pretty',
});

// Кэш для результатов turnover
const turnoverCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

// 20 уровней рангов с правильными данными
export const MLM_RANKS = [
  { level: 1, name: 'Bronze Club Card', turnover: 10000, reward: 300, prize: 'Bronze Club Card with your name' },
  { level: 2, name: 'Silver Club Card', turnover: 25000, reward: 750, prize: 'Silver Club Card with inlay' },
  { level: 3, name: 'Gold Club Card', turnover: 50000, reward: 1500, prize: 'Gold Club Card in leather box' },
  { level: 4, name: 'Gold Bracelet', turnover: 75000, reward: 2250, prize: 'Gold Bracelet (without stones, with engraving)' },
  { level: 5, name: '1st Stone: Garnet', turnover: 100000, reward: 3000, prize: '1st Stone: Garnet — mounted in bracelet' },
  { level: 6, name: 'Cartier Ballon Bleu', turnover: 150000, reward: 4500, prize: 'Cartier Ballon Bleu (men\'s watch)' },
  { level: 7, name: '2nd Stone: Citrine', turnover: 250000, reward: 7500, prize: '2nd Stone: Citrine — bracelet insert' },
  { level: 8, name: 'Breitling Navitimer', turnover: 500000, reward: 15000, prize: 'Breitling Navitimer' },
  { level: 9, name: '3rd Stone: Amethyst', turnover: 750000, reward: 22500, prize: '3rd Stone: Amethyst' },
  { level: 10, name: 'Mercedes-Benz A-Class', turnover: 1000000, reward: 30000, prize: 'Mercedes-Benz A-Class' },
  { level: 11, name: '4th Stone: Topaz', turnover: 2000000, reward: 60000, prize: '4th Stone: Topaz' },
  { level: 12, name: 'Audemars Piguet Royal Oak', turnover: 3000000, reward: 90000, prize: 'Audemars Piguet Royal Oak Offshore' },
  { level: 13, name: '5th Stone: Ruby', turnover: 5000000, reward: 150000, prize: '5th Stone: Ruby' },
  { level: 14, name: 'Porsche 911 Carrera', turnover: 7500000, reward: 225000, prize: 'Porsche 911 Carrera' },
  { level: 15, name: '6th Stone: Sapphire', turnover: 10000000, reward: 300000, prize: '6th Stone: Sapphire' },
  { level: 16, name: 'Bentley Continental GT', turnover: 15000000, reward: 450000, prize: 'Bentley Continental GT' },
  { level: 17, name: '7th Stone: Diamond', turnover: 20000000, reward: 600000, prize: '7th Stone: Diamond' },
  { level: 18, name: 'Richard Mille RM 11-03', turnover: 30000000, reward: 900000, prize: 'Richard Mille RM 11-03' },
  { level: 19, name: 'Ferrari Roma', turnover: 50000000, reward: 1500000, prize: 'Ferrari Roma' },
  { level: 20, name: 'Sunseeker Yacht', turnover: 100000000, reward: 3000000, prize: 'Sunseeker Predator 74 Yacht + complete bracelet with 7 stones' },
];

class OptimizedRankRewardService {
  
  // Выполнить операцию с базой данных с retry при обрыве соединения
  async executeWithRetry(operation, retries = 1) {
    try {
      return await operation();
    } catch (error) {
      if (error.code === 'P1017' && retries > 0) {
        console.log('[OptimizedRankRewardService] DB connection lost, reconnecting...');
        await prisma.$disconnect();
        await prisma.$connect();
        return await this.executeWithRetry(operation, retries - 1);
      }
      throw error;
    }
  }
  
  // Оптимизированная функция получения turnover с кэшированием
  async getUserTurnover(userId) {
    console.log('[OptimizedRankRewardService] getUserTurnover userId:', userId);
    
    // Проверяем кэш
    const cacheKey = `turnover_${userId}`;
    const cached = turnoverCache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('[OptimizedRankRewardService] Using cached turnover:', cached.value);
      return cached.value;
    }
    
    // Если кэш устарел или отсутствует, вычисляем заново
    console.log('[OptimizedRankRewardService] Calculating turnover...');
    const startTime = Date.now();
    
    try {
      // Оптимизированный запрос - получаем все данные одним запросом
      const userWithReferrals = await this.executeWithRetry(async () => {
        return await prisma.user.findUnique({
          where: { id: userId },
          include: {
            referrals: {
              include: {
                investments: {
                  where: { isActive: true },
                  select: { amount: true }
                },
                referrals: {
                  include: {
                    investments: {
                      where: { isActive: true },
                      select: { amount: true }
                    },
                    referrals: {
                      include: {
                        investments: {
                          where: { isActive: true },
                          select: { amount: true }
                        },
                        referrals: {
                          include: {
                            investments: {
                              where: { isActive: true },
                              select: { amount: true }
                            },
                            referrals: {
                              include: {
                                investments: {
                                  where: { isActive: true },
                                  select: { amount: true }
                                },
                                referrals: {
                                  include: {
                                    investments: {
                                      where: { isActive: true },
                                      select: { amount: true }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });
      });
      
      if (!userWithReferrals) {
        console.log('[OptimizedRankRewardService] User not found');
        return 0;
      }
      
      // Рекурсивно вычисляем общую сумму инвестиций
      const calculateTotal = (user) => {
        let total = 0;
        
        // Сумма инвестиций текущего пользователя
        if (user.investments) {
          total += user.investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        }
        
        // Сумма инвестиций всех рефералов
        if (user.referrals) {
          user.referrals.forEach(referral => {
            total += calculateTotal(referral);
          });
        }
        
        return total;
      };
      
      const total = calculateTotal(userWithReferrals);
      const endTime = Date.now();
      
      console.log(`[OptimizedRankRewardService] Calculated turnover: $${total.toLocaleString()} in ${endTime - startTime}ms`);
      
      // Сохраняем в кэш
      turnoverCache.set(cacheKey, {
        value: total,
        timestamp: Date.now()
      });
      
      return total;
      
    } catch (error) {
      console.error('[OptimizedRankRewardService] Error calculating turnover:', error);
      
      // Если ошибка соединения с БД, возвращаем 0
      if (error.code === 'P1017' || error.message?.includes('Server has closed the connection')) {
        console.log('[OptimizedRankRewardService] Database connection error, returning 0');
        return 0;
      }
      
      return 0;
    }
  }
  
  // Получить текущий ранг пользователя
  getUserRank(turnover) {
    if (!turnover || turnover < 10000) {
      return {
        level: 0,
        name: 'No rank',
        turnover: 0,
      }
    }
    
    // Если оборот >= 10000, ищем максимальный подходящий ранг
    let current = null;
    for (const rank of MLM_RANKS) {
      if (turnover >= rank.turnover) current = rank;
    }
    return current;
  }
  
  // Получить прогресс до следующего ранга
  getNextRank(turnover) {
    if (turnover === 0) {
      return MLM_RANKS[0]
    }
    
    // Находим следующий ранг (первый ранг, который требует больше turnover)
    for (const rank of MLM_RANKS) {
      if (turnover < rank.turnover) {
        return rank;
      }
    }
    
    // Если достигнут максимальный ранг
    return MLM_RANKS[MLM_RANKS.length - 1];
  }
  
  // Получить заклеймленные награды
  async getClaimedRewards(userId) {
    try {
      const txs = await this.executeWithRetry(async () => {
        return await prisma.transaction.findMany({
          where: {
            userId,
            type: 'RANK_REWARD'
          }
        });
      });
      
      const claimed = txs.map(tx => {
        // Парсим новые форматы описаний
        let levelMatch = tx.description.match(/Rank (\d+)/);
        const typeMatch = tx.description.match(/\((Cash|Prize)\)/);
        return {
          level: levelMatch ? parseInt(levelMatch[1]) : null,
          type: typeMatch ? typeMatch[1] : 'Cash',
          amount: tx.amount,
          description: tx.description
        };
      }).filter(item => item.level !== null);
      
      return claimed;
    } catch (error) {
      console.error('[OptimizedRankRewardService] Error getting claimed rewards:', error);
      
      // Если ошибка соединения с БД, возвращаем пустой массив
      if (error.code === 'P1017' || error.message?.includes('Server has closed the connection')) {
        console.log('[OptimizedRankRewardService] Database connection error, returning empty array');
        return [];
      }
      
      return [];
    }
  }
  
  // Заклеймить награду
  async claimReward(userId, level, rewardType = 'Cash') {
    try {
      // Проверяем, не заклеймлена ли уже награда
      const claimed = await this.getClaimedRewards(userId);
      const alreadyClaimed = claimed.find(c => c.level === level && c.type === rewardType);
      
      if (alreadyClaimed) {
        throw new Error(`Already claimed ${rewardType} for this rank`);
      }
      
      // Находим ранг
      const rank = MLM_RANKS.find(r => r.level === level);
      if (!rank) {
        throw new Error(`Invalid rank level: ${level}`);
      }
      
      // Проверяем, доступен ли ранг по обороту
      const turnover = await this.getUserTurnover(userId);
      if (turnover < rank.turnover) {
        throw new Error('Not enough turnover');
      }
      
      let amount = 0;
      let description = '';
      
      if (rewardType === 'Cash') {
        amount = rank.reward;
        description = `Rank ${level} (Cash)`;
        
        // Создаем транзакцию
        await this.executeWithRetry(async () => {
          return await prisma.transaction.create({
            data: {
              userId,
              type: 'RANK_REWARD',
              amount: amount,
              description: description,
              status: 'COMPLETED'
            }
          });
        });
        
        // Обновляем баланс пользователя с retry логикой
        await this.executeWithRetry(async () => {
          return await prisma.user.update({
            where: { id: userId },
            data: {
              balance: {
                increment: amount
              }
            }
          });
        });
        
      } else if (rewardType === 'Prize') {
        description = `Rank ${level} (Prize)`;
        
        // Создаем запись о призе
        await this.executeWithRetry(async () => {
          return await prisma.transaction.create({
            data: {
              userId,
              type: 'RANK_REWARD',
              amount: 0,
              description: description,
              status: 'COMPLETED'
            }
          });
        });
      }
      
      // Очищаем кэш turnover для этого пользователя
      turnoverCache.delete(`turnover_${userId}`);
      
      return {
        success: true,
        message: `Successfully claimed ${rewardType} reward for ${rank.name}`,
        amount: amount,
        description: description
      };
      
    } catch (error) {
      console.error('[OptimizedRankRewardService] Error claiming reward:', error);
      throw error;
    }
  }
  
  // Очистить кэш для пользователя
  clearCache(userId) {
    turnoverCache.delete(`turnover_${userId}`);
    console.log(`[OptimizedRankRewardService] Cleared cache for user ${userId}`);
  }
  
  // Очистить весь кэш
  clearAllCache() {
    turnoverCache.clear();
    console.log('[OptimizedRankRewardService] Cleared all cache');
  }
}

const optimizedRankRewardService = new OptimizedRankRewardService();
export default optimizedRankRewardService; 