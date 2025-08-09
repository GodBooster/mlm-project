// DeFi Data Processor Worker

// Configuration
const CONFIG = {
  MIN_MONTHLY_APR: 50,      
  MIN_TVL_USD: 500000,      
  MAX_YEARLY_APR: 5000,     
  MAX_ACTIVE_POSITIONS: 5  
};

// Worker ready message
self.postMessage({
  type: 'WORKER_READY',
  data: { timestamp: Date.now() }
});

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    switch (type) {
      case 'FILTER_POOLS':
        filterPools(data.pools);
        break;
        
      case 'SORT_POOLS':
        sortPools(data.pools, data.sortBy, data.ascending);
        break;
        
      case 'SELECT_BEST_POOLS':
        selectBestPools(data.pools, data.currentActivePoolIds, data.needCount);
        break;
        
      case 'ANALYZE_POOLS':
        analyzePools(data.pools);
        break;
        
      case 'SEARCH_POOLS':
        searchPools(data.pools, data.query);
        break;
        
      case 'PROCESS_POSITIONS':
        processPositions(data.positions, data.pools);
        break;
        
      case 'UPDATE_CONFIG':
        updateConfig(data.config);
        break;
    }
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      data: { error: error.message, operation: type }
    });
  }
};

function calculateMonthlyAPR(yearlyAPR) {
  return yearlyAPR / 12;
}

function filterPools(pools) {
  console.log(`Filtering ${pools.length} pools...`);
  
  const filtered = pools.filter(pool => {
    const monthlyAPR = calculateMonthlyAPR(pool.apy);
    const isEligible = monthlyAPR >= CONFIG.MIN_MONTHLY_APR && 
                      pool.tvlUsd >= CONFIG.MIN_TVL_USD &&
                      pool.apy > 0 &&
                      pool.apy <= CONFIG.MAX_YEARLY_APR;
    
    return isEligible;
  }).sort((a, b) => b.tvlUsd - a.tvlUsd);
  
  console.log(`Filtered to ${filtered.length} eligible pools`);
  
  self.postMessage({
    type: 'FILTERED_POOLS',
    data: { 
      pools: filtered,
      originalCount: pools.length,
      filteredCount: filtered.length
    }
  });
}

function sortPools(pools, sortBy = 'apr', ascending = false) {
  const sorted = [...pools].sort((a, b) => {
    let valueA, valueB;
    
    switch (sortBy) {
      case 'apr':
        valueA = a.apy;
        valueB = b.apy;
        break;
      case 'tvl':
        valueA = a.tvlUsd;
        valueB = b.tvlUsd;
        break;
      case 'score':
        valueA = a.tvlUsd * calculateMonthlyAPR(a.apy);
        valueB = b.tvlUsd * calculateMonthlyAPR(b.apy);
        break;
      case 'symbol':
        valueA = a.symbol.toLowerCase();
        valueB = b.symbol.toLowerCase();
        break;
      case 'project':
        valueA = a.project.toLowerCase();
        valueB = b.project.toLowerCase();
        break;
      case 'chain':
        valueA = a.chain.toLowerCase();
        valueB = b.chain.toLowerCase();
        break;
      default:
        valueA = a.apy;
        valueB = b.apy;
    }
    
    if (ascending) {
      return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
    } else {
      return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
    }
  });
  
  self.postMessage({
    type: 'SORTED_POOLS',
    data: { pools: sorted, sortBy, ascending }
  });
}

function selectBestPools(pools, currentActivePoolIds = [], needCount = 5) {
  console.log(`Selecting ${needCount} best pools from ${pools.length} available...`);
  
  // Exclude pools that are already active
  const availablePools = pools.filter(pool => 
    !currentActivePoolIds.includes(pool.pool)
  );
  
  console.log(`${availablePools.length} pools available after excluding active ones`);
  
  if (availablePools.length === 0) {
    self.postMessage({
      type: 'BEST_POOLS_SELECTED',
      data: { pools: [], reason: 'No available pools' }
    });
    return;
  }
  
  // Advanced scoring algorithm
  const scoredPools = availablePools.map(pool => {
    const monthlyAPR = calculateMonthlyAPR(pool.apy);
    
    // Base score: TVL * Monthly APR
    let score = pool.tvlUsd * monthlyAPR;
    
    // Risk adjustment
    let riskMultiplier = 1;
    
    // High APR risk penalty
    if (pool.apy > 2000) riskMultiplier *= 0.7;
    else if (pool.apy > 1000) riskMultiplier *= 0.85;
    else if (pool.apy > 500) riskMultiplier *= 0.95;
    
    // Low TVL risk penalty
    if (pool.tvlUsd < 500000) riskMultiplier *= 0.8;
    else if (pool.tvlUsd < 1000000) riskMultiplier *= 0.9;
    
    // Chain preference (Ethereum = safer)
    if (pool.chain.toLowerCase() === 'ethereum') riskMultiplier *= 1.1;
    else if (['bsc', 'polygon', 'avalanche'].includes(pool.chain.toLowerCase())) riskMultiplier *= 1.05;
    
    // Project reputation (basic scoring)
    const goodProjects = ['uniswap', 'sushiswap', 'curve', 'aave', 'compound'];
    if (goodProjects.some(project => pool.project.toLowerCase().includes(project))) {
      riskMultiplier *= 1.15;
    }
    
    return {
      ...pool,
      score: score * riskMultiplier,
      riskMultiplier,
      monthlyAPR
    };
  });
  
  // Sort by score and take needed amount
  const bestPools = scoredPools
    .sort((a, b) => b.score - a.score)
    .slice(0, needCount);
  
  console.log(`Selected ${bestPools.length} best pools`);
  
  self.postMessage({
    type: 'BEST_POOLS_SELECTED',
    data: { 
      pools: bestPools,
      selectedCount: bestPools.length,
      requestedCount: needCount
    }
  });
}

function analyzePools(pools) {
  const analysis = {
    total: pools.length,
    byChain: {},
    byProject: {},
    aprDistribution: {
      low: 0,      // < 100%
      medium: 0,   // 100-500%
      high: 0,     // 500-1000%
      veryHigh: 0  // > 1000%
    },
    tvlDistribution: {
      small: 0,    // < $100K
      medium: 0,   // $100K - $1M
      large: 0,    // $1M - $10M
      huge: 0      // > $10M
    },
    qualityPools: 0,
    riskyPools: 0,
    recommendations: []
  };
  
  pools.forEach(pool => {
    // Chain distribution
    analysis.byChain[pool.chain] = (analysis.byChain[pool.chain] || 0) + 1;
    
    // Project distribution
    analysis.byProject[pool.project] = (analysis.byProject[pool.project] || 0) + 1;
    
    // APR distribution
    if (pool.apy < 100) analysis.aprDistribution.low++;
    else if (pool.apy < 500) analysis.aprDistribution.medium++;
    else if (pool.apy < 1000) analysis.aprDistribution.high++;
    else analysis.aprDistribution.veryHigh++;
    
    // TVL distribution
    if (pool.tvlUsd < 100000) analysis.tvlDistribution.small++;
    else if (pool.tvlUsd < 1000000) analysis.tvlDistribution.medium++;
    else if (pool.tvlUsd < 10000000) analysis.tvlDistribution.large++;
    else analysis.tvlDistribution.huge++;
    
    // Quality assessment
    const monthlyAPR = calculateMonthlyAPR(pool.apy);
    if (monthlyAPR >= CONFIG.MIN_MONTHLY_APR && 
        pool.tvlUsd >= CONFIG.MIN_TVL_USD && 
        pool.apy <= CONFIG.MAX_YEARLY_APR) {
      analysis.qualityPools++;
    }
    
    // Risk assessment
    if (pool.apy > 2000 || pool.tvlUsd < 100000) {
      analysis.riskyPools++;
    }
  });
  
  // Generate recommendations
  const qualityRatio = analysis.qualityPools / analysis.total;
  if (qualityRatio < 0.1) {
    analysis.recommendations.push('Very few quality pools available - consider adjusting criteria');
  } else if (qualityRatio > 0.5) {
    analysis.recommendations.push('Good selection of quality pools available');
  }
  
  if (analysis.riskyPools > analysis.qualityPools) {
    analysis.recommendations.push('High number of risky pools - exercise caution');
  }
  
  self.postMessage({
    type: 'POOLS_ANALYZED',
    data: { analysis }
  });
}

function searchPools(pools, query) {
  const searchTerms = query.toLowerCase().split(' ');
  
  const results = pools.filter(pool => {
    const searchText = `${pool.symbol} ${pool.project} ${pool.chain}`.toLowerCase();
    return searchTerms.every(term => searchText.includes(term));
  });
  
  // Sort by relevance (exact symbol matches first)
  results.sort((a, b) => {
    const aExact = a.symbol.toLowerCase() === query.toLowerCase() ? 1 : 0;
    const bExact = b.symbol.toLowerCase() === query.toLowerCase() ? 1 : 0;
    
    if (aExact !== bExact) return bExact - aExact;
    
    // Then by TVL
    return b.tvlUsd - a.tvlUsd;
  });
  
  self.postMessage({
    type: 'SEARCH_RESULTS',
    data: { 
      query,
      results,
      count: results.length
    }
  });
}

function processPositions(positions, pools) {
  const processed = positions.map(position => {
    if (position.status === 'farming') {
      // Find updated pool data
      const updatedPool = pools.find(p => p.pool === position.poolId);
      
      if (updatedPool) {
        return {
          ...position,
          currentApy: updatedPool.apy,
          currentTvl: updatedPool.tvlUsd,
          priceChange: {
            apy: ((updatedPool.apy - position.entryApy) / position.entryApy * 100).toFixed(2),
            tvl: ((updatedPool.tvlUsd - position.entryTvl) / position.entryTvl * 100).toFixed(2)
          }
        };
      }
    }
    
    return position;
  });
  
  self.postMessage({
    type: 'POSITIONS_PROCESSED',
    data: { positions: processed }
  });
}

function updateConfig(config) {
  Object.assign(CONFIG, config);
  
  self.postMessage({
    type: 'CONFIG_UPDATED',
    data: { config: CONFIG }
  });
}