import { PrismaClient, PositionStatus } from '@prisma/client'

const prisma = new PrismaClient()

// Configuration
const CONFIG = {
  UPDATE_INTERVAL: 15 * 60 * 1000, // 15 minutes
  MIN_MONTHLY_APR: 50,
  MIN_TVL_USD: 500000,
  MAX_YEARLY_APR: 5000,
  MAX_ACTIVE_POSITIONS: 5,
  EXIT_MONTHLY_APR: 48,
  EXIT_TVL_USD: 450000,
  API_URL: 'https://yields.llama.fi/pools'
}

class SystemUpdater {
  constructor() {
    this.isRunning = false;
    this.updateInterval = null;
  }

  async start() {
    if (this.isRunning) {
      console.log('System updater is already running');
      return;
    }

    console.log('🚀 Starting system updater...');
    this.isRunning = true;

    // Start the update cycle
    this.scheduleNextUpdate();
    
    // Perform initial update
    await this.performSystemUpdate();
  }

  async stop() {
    if (this.updateInterval) {
      clearTimeout(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 System updater stopped');
  }

  scheduleNextUpdate() {
    this.updateInterval = setTimeout(async () => {
      if (this.isRunning) {
        await this.performSystemUpdate();
        this.scheduleNextUpdate();
      }
    }, CONFIG.UPDATE_INTERVAL);
  }

  async performSystemUpdate() {
    try {
      console.log('🔄 Performing system update at:', new Date().toLocaleString());
      
      // Fetch fresh pool data
      const pools = await this.fetchPools();
      if (!pools || pools.length === 0) {
        console.log('❌ No pools data available, skipping update');
        return;
      }
      
      console.log(`📊 Processing ${pools.length} pools...`);

      // Get current positions
      const currentPositions = await this.getCurrentPositions();
      
      // Process positions
      const result = await this.processPositions(pools, currentPositions);
      const { updatedActivePositions: updatedPositions, positionsToClose, newPositions } = result;
      
      // Validate results
      if (!Array.isArray(updatedPositions)) {
        console.error('❌ updatedPositions is not an array:', updatedPositions);
        return;
      }
      if (!Array.isArray(positionsToClose)) {
        console.error('❌ positionsToClose is not an array:', positionsToClose);
        return;
      }
      if (!Array.isArray(newPositions)) {
        console.error('❌ newPositions is not an array:', newPositions);
        return;
      }
      
      // Save changes to database
      await this.savePositions(updatedPositions, positionsToClose, newPositions);
      
      console.log('✅ System update completed successfully');
      console.log(`   Active positions: ${updatedPositions.length}`);
      console.log(`   Closed positions: ${positionsToClose.length}`);
      console.log(`   New positions: ${newPositions.length}`);
      
    } catch (error) {
      console.error('❌ System update failed:', error);
    }
  }

  //Для LocalHost
  /*async fetchPools() {
    try {
      const response = await fetch(CONFIG.API_URL);
      if (!response.ok) throw new Error('API unavailable');
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching pools:', error);
      return [];
    }
  }
*/

async fetchPools() {
  const maxRetries = 3;
  const retryDelay = 5000; // 5 секунд между попытками
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // console.log(`🔄 Attempt ${attempt}/${maxRetries} to fetch pools...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 секунд
      
      const response = await fetch(CONFIG.API_URL, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'MLM-Backend/1.0',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      
      const data = await response.json();
      console.log(`✅ Fetched ${data.data?.length || 0} pools from API (attempt ${attempt})`);
      return data.data || [];
    } catch (error) {
      // console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
              if (attempt === maxRetries) {
          console.error('❌ All attempts to fetch pools failed');
          return [];
        }
      
      // Ждем перед следующей попыткой
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

  async getCurrentPositions() {
    try {
      return await prisma.defiPosition.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error getting current positions:', error);
      return [];
    }
  }

  calculateMonthlyAPR(yearlyAPR) {
    return yearlyAPR / 12;
  }

  filterEligiblePools(pools) {
    return pools.filter(pool => {
      const monthlyAPR = this.calculateMonthlyAPR(pool.apy);
      return monthlyAPR >= CONFIG.MIN_MONTHLY_APR && 
             pool.tvlUsd >= CONFIG.MIN_TVL_USD &&
             pool.apy > 0 &&
             pool.apy <= CONFIG.MAX_YEARLY_APR;
    }).sort((a, b) => b.tvlUsd - a.tvlUsd);
  }

  selectBestPools(pools, currentActivePoolIds, needCount) {
    const availablePools = pools.filter(pool => 
      !currentActivePoolIds.includes(pool.pool)
    );
    
    if (availablePools.length === 0) return [];
    
    return availablePools
      .sort((a, b) => {
        const scoreA = a.tvlUsd * this.calculateMonthlyAPR(a.apy);
        const scoreB = b.tvlUsd * this.calculateMonthlyAPR(b.apy);
        return scoreB - scoreA;
      })
      .slice(0, needCount);
  }

  async processPositions(pools, currentPositions) {
    const activePositions = currentPositions.filter(p => p.status === 'FARMING');
    const historicalPositions = currentPositions.filter(p => p.status === 'UNSTAKED');
    
    let updatedActivePositions = [...activePositions];
    let positionsToClose = [];
    
    // Check exit conditions for active positions
    updatedActivePositions = updatedActivePositions.map(position => {
      const updatedPool = pools.find(p => p.pool === position.poolId);
      
      if (!updatedPool) {
        positionsToClose.push({
          ...position,
          status: 'UNSTAKED',
          exitDate: new Date(),
          exitApy: position.currentApy,    // ✅ Фиксируем последний известный APR
          exitTvl: position.currentTvl,    // ✅ Фиксируем последний известный TVL
          exitReason: 'Pool removed'
        });
        return null;
      }
      
      // Update current data
      position.currentApy = updatedPool.apy;
      position.currentTvl = updatedPool.tvlUsd;
      
      const monthlyAPR = this.calculateMonthlyAPR(updatedPool.apy);
      
      // Check exit conditions
      if (monthlyAPR < CONFIG.EXIT_MONTHLY_APR || updatedPool.tvlUsd < CONFIG.EXIT_TVL_USD) {
        positionsToClose.push({
          ...position,
          status: 'UNSTAKED',
          exitDate: new Date(),
          exitApy: updatedPool.apy,        // ✅ Фиксируем Exit APR
          exitTvl: updatedPool.tvlUsd,     // ✅ Фиксируем Exit TVL
          exitReason: monthlyAPR < CONFIG.EXIT_MONTHLY_APR 
            ? `APR dropped to ${monthlyAPR.toFixed(1)}%/month` 
            : `TVL dropped to ${updatedPool.tvlUsd.toLocaleString()}`
        });
        return null;
      }
      
      return position;
    }).filter(Boolean);
    
    // Add new positions if needed
    const needNewPositions = CONFIG.MAX_ACTIVE_POSITIONS - updatedActivePositions.length;
    let newPositions = [];
    
    if (needNewPositions > 0) {
      const eligiblePools = this.filterEligiblePools(pools);
      const currentActivePoolIds = updatedActivePositions.map(p => p.poolId);
      const newPools = this.selectBestPools(eligiblePools, currentActivePoolIds, needNewPositions);
      
      newPositions = newPools.map(pool => ({
        userId: 1, // System user
        poolId: pool.pool,
        symbol: pool.symbol,
        project: pool.project,
        chain: pool.chain,
        entryApy: pool.apy,
        currentApy: pool.apy,
        entryTvl: pool.tvlUsd,
        currentTvl: pool.tvlUsd,
        status: PositionStatus.FARMING,
        entryDate: new Date(),
        exitDate: null,
        exitReason: null
      }));
    }
    
    // Ensure all return values are arrays
    const safeUpdatedActivePositions = Array.isArray(updatedActivePositions) ? updatedActivePositions : [];
    const safePositionsToClose = Array.isArray(positionsToClose) ? positionsToClose : [];
    const safeNewPositions = Array.isArray(newPositions) ? newPositions : [];
    
    console.log(`[processPositions] Returning: active=${safeUpdatedActivePositions.length}, close=${safePositionsToClose.length}, new=${safeNewPositions.length}`);
    
    return { 
      updatedActivePositions: safeUpdatedActivePositions, 
      positionsToClose: safePositionsToClose, 
      newPositions: safeNewPositions 
    };
  }

  async savePositions(updatedPositions, positionsToClose, newPositions) {
    try {
      // Update existing active positions
      for (const position of updatedPositions) {
        await prisma.defiPosition.update({
          where: { id: position.id },
          data: {
            currentApy: position.currentApy,
            currentTvl: position.currentTvl,
            updatedAt: new Date()
          }
        });
      }
      
      // Close positions that don't meet criteria
      for (const position of positionsToClose) {
        await prisma.defiPosition.update({
          where: { id: position.id },
          data: {
            status: PositionStatus.UNSTAKED,
            exitDate: position.exitDate,
            exitApy: position.exitApy,      // ✅ Сохраняем Exit APR
            exitTvl: position.exitTvl,      // ✅ Сохраняем Exit TVL
            exitReason: position.exitReason,
            updatedAt: new Date()
          }
        });
      }
      
      // Create new positions
      if (newPositions.length > 0) {
        await prisma.defiPosition.createMany({
          data: newPositions
        });
      }
      
      console.log(`💾 Saved to database: ${updatedPositions.length} updated, ${positionsToClose.length} closed, ${newPositions.length} new`);
      
    } catch (error) {
      console.error('Error saving positions:', error);
    }
  }
}

// Create and export the system updater instance
const systemUpdater = new SystemUpdater();

// Handle process termination
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down system updater...');
  await systemUpdater.stop();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down system updater...');
  await systemUpdater.stop();
  await prisma.$disconnect();
  process.exit(0);
});

export default systemUpdater; 