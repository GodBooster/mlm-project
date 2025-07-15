import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
]

class RankRewardService {
  // Получить оборот по открытым линиям (всех рефералов 1-й линии и их команд)
  async getUserTurnover(userId) {
    console.log('[getUserTurnover] userId:', userId)
    
    // Используем ту же логику, что и в referral-service.js
    const buildTree = async (userId, level = 0) => {
      if (level >= 10) return [] // Ограничиваем глубину
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          referrals: {
            select: {
              id: true,
              username: true,
              email: true,
              createdAt: true,
              investments: {
                where: {
                  isActive: true
                },
                select: {
                  id: true,
                  amount: true,
                  isActive: true,
                  endDate: true,
                  package: {
                    select: {
                      id: true,
                      name: true,
                      monthlyYield: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      const referrals = user?.referrals || []
      const tree = []
      
      for (const referral of referrals) {
        const referralData = {
          id: referral.id,
          username: referral.username,
          email: referral.email,
          createdAt: referral.createdAt,
          level,
          investments: referral.investments,
          children: []
        }
        
        // Recursively get children
        referralData.children = await buildTree(referral.id, level + 1)
        
        tree.push(referralData)
      }
      
      return tree
    }
    
    const tree = await buildTree(userId)
    console.log('[getUserTurnover] tree built, referrals count:', tree.length)
    
    // Считаем общую сумму инвестиций в дереве
    let total = 0
    const calculateTotal = (nodes) => {
      if (!nodes || !Array.isArray(nodes)) return
      nodes.forEach(node => {
        if (node.investments && Array.isArray(node.investments)) {
          const nodeTotal = node.investments.reduce((sum, inv) => sum + (inv.amount || 0), 0)
          console.log('[getUserTurnover] node', node.id, 'investments total:', nodeTotal)
          total += nodeTotal
        }
        if (node.children && Array.isArray(node.children)) {
          calculateTotal(node.children)
        }
      })
    }
    
    calculateTotal(tree)
    console.log('[getUserTurnover] total turnover:', total)
    return total
  }

  // Получить текущий ранг пользователя
  getUserRank(turnover) {
    if (!turnover || turnover < 10000) {
      return {
        level: 0,
        name: 'No rank',
        turnover: 0,
        prize: null
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
      if (turnover < rank.turnover) return rank
    }
    // Если turnover больше или равен всем рангам, значит достигнут максимальный ранг
    return null
  }

  // Получить историю клеймов наград
  async getClaimedRewards(userId) {
    console.log('[getClaimedRewards] userId:', userId)
    const txs = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'RANK_REWARD'
      }
    })
    console.log('[getClaimedRewards] transactions found:', txs.length)
    
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
    
    console.log('[getClaimedRewards] claimed rewards:', claimed)
    return claimed
  }

  // Клейм награды за ранг
  async claimReward(userId, level, rewardType = 'Cash') {
    console.log('[claimReward] Start:', { userId, level, rewardType })
    
    const rank = MLM_RANKS.find(r => r.level === level)
    if (!rank) {
      console.log('[claimReward] Invalid rank:', level)
      throw new Error('Invalid rank')
    }
    console.log('[claimReward] Found rank:', rank)
    
    // Проверяем, не был ли уже клейм этого типа
    const claimed = await this.getClaimedRewards(userId)
    const alreadyClaimed = claimed.find(c => c.level === level && c.type === rewardType)
    if (alreadyClaimed) {
      console.log('[claimReward] Already claimed:', alreadyClaimed)
      throw new Error(`Already claimed ${rewardType} for this rank`)
    }
    
    // Проверяем, доступен ли ранг по обороту
    const turnover = await this.getUserTurnover(userId)
    console.log('[claimReward] User turnover:', turnover, 'Required:', rank.turnover)
    if (turnover < rank.turnover) {
      console.log('[claimReward] Not enough turnover')
      throw new Error('Not enough turnover')
    }
    
    let amount = 0;
    let description = '';
    
    if (rewardType === 'Cash') {
      amount = rank.reward;
      description = `Rank ${level} (Cash)`;
      
      console.log('[claimReward] Creating cash transaction:', { userId, amount, description })
      
      // Создаем транзакцию
      await prisma.transaction.create({
        data: {
          userId,
          type: 'RANK_REWARD',
          amount: amount,
          description: description,
          status: 'COMPLETED'
        }
      })
      
      console.log('[claimReward] Updating user balance')
      
      // Начисляем на баланс
      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: amount } }
      })
    } else {
      // Для призов не начисляем деньги, только записываем транзакцию
      description = `Rank ${level} (Prize)`;
      
      console.log('[claimReward] Creating prize transaction:', { userId, description })
      
      await prisma.transaction.create({
        data: {
          userId,
          type: 'RANK_REWARD',
          amount: 0,
          description: description,
          status: 'COMPLETED'
        }
      })
    }
    
    const result = { 
      success: true, 
      reward: rewardType === 'Cash' ? rank.reward : 0, 
      level, 
      prize: rank.prize,
      type: rewardType,
      message: rewardType === 'Cash' 
        ? `You claimed $${rank.reward.toLocaleString()}` 
        : `How to get your reward?\nTo receive your prize: ${rank.prize}\nPlease contact your leader or company support.`
    }
    
    console.log('[claimReward] Success result:', result)
    return result
  }
}

export default new RankRewardService() 