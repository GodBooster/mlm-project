import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';
import optimizedService from './services/optimizedService';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ReportPage = ({ userData }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Configuration
  const CONFIG = {
    MIN_MONTHLY_APR: 50,      // Minimum monthly yield (%)
    MIN_TVL_USD: 500000,      // Minimum TVL ($)
    MAX_YEARLY_APR: 5000,     // Maximum yearly yield (%) - exclude high-risk pools
    MAX_ACTIVE_POSITIONS: 5,  // Maximum active positions
    CHECK_INTERVAL: 15 * 60 * 1000, // 15 минут
    TVL_DROP_THRESHOLD: 0.1,  // TVL drop threshold (10%)
    API_URL: 'https://yields.llama.fi/pools',
    EXIT_MONTHLY_APR: 48,     // Exit threshold for monthly APR (%)
    EXIT_TVL_USD: 450000,     // Exit threshold for TVL ($)
    CACHE_TTL: 5 * 60 * 1000  // Cache TTL: 5 minutes
  };

  // API functions
  const loadPositions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return [];
      
      // Используем системный endpoint для демонстрации
      const response = await fetch(`${API}/api/defi-positions/system`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded positions:', data);
        
        // Ограничиваем количество активных позиций до 5 при загрузке
        const positions = data.map(pos => ({
          ...pos,
          status: pos.status.toLowerCase() === 'farming' ? 'farming' : 'unstaked'
        }));
        
        // Разделяем активные и закрытые позиции
        const activePositions = positions.filter(p => p.status === 'farming');
        const closedPositions = positions.filter(p => p.status === 'unstaked');
        
        // Ограничиваем активные позиции до 5 (берем самые новые)
        const limitedActivePositions = activePositions
          .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))
          .slice(0, CONFIG.MAX_ACTIVE_POSITIONS);
        
        // Возвращаем ограниченные активные + все закрытые
        return [...limitedActivePositions, ...closedPositions];
      }
    } catch (e) {
      console.error('Error loading positions:', e);
    }
    return [];
  };

  const savePositions = async (positions) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Для системной страницы сохраняем в базу данных
      await fetch(`${API}/api/defi-positions/system`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ positions })
      });
    } catch (e) {
      console.error('Error saving positions:', e);
    }
  };

  const updateActivePositions = async (positions, isBackgroundUpdate = false) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Для системной страницы обновляем активные позиции
      await fetch(`${API}/api/defi-positions/system/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ positions, isBackgroundUpdate })
      });
    } catch (e) {
      console.error('Error updating positions:', e);
    }
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '--';
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(0)}`;
  };

  const calculateMonthlyAPR = (yearlyAPR) => {
    // Simple calculation - no need for Web Worker for basic math
    return yearlyAPR / 12; // Simple division of APY by 12
  };

  const getChainClass = (chain) => {
    const chainMap = {
      'Ethereum': 'bg-blue-500/20 text-blue-400',
      'BSC': 'bg-yellow-500/20 text-yellow-400',
      'Polygon': 'bg-purple-500/20 text-purple-400',
      'Arbitrum': 'bg-green-500/20 text-green-400',
      'Optimism': 'bg-red-500/20 text-red-400',
      'Base': 'bg-indigo-500/20 text-indigo-400'
    };
    return chainMap[chain] || 'bg-gray-500/20 text-gray-400';
  };

  // API with cache integration
  const fetchPools = async () => {
    try {
      const response = await fetch(CONFIG.API_URL);
      if (!response.ok) throw new Error('API unavailable');
      
      const data = await response.json();
      const pools = data.data || [];
      
      // Cache the fresh data if services are available
      if (servicesInitialized) {
        try {
          optimizedService.cacheData('pools_data', pools, CONFIG.CACHE_TTL);
        } catch (e) {
          console.warn('Cache service not available:', e);
        }
      }
      
      return pools;
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  };

  const filterEligiblePools = (pools) => {
    // Fallback filtering (всегда используем эту логику)
    const filtered = pools.filter(pool => {
      const monthlyAPR = calculateMonthlyAPR(pool.apy);
      const isEligible = monthlyAPR >= CONFIG.MIN_MONTHLY_APR && 
                        pool.tvlUsd >= CONFIG.MIN_TVL_USD &&
                        pool.apy > 0 &&
                        pool.apy <= CONFIG.MAX_YEARLY_APR;
      
      return isEligible;
    }).sort((a, b) => b.tvlUsd - a.tvlUsd);
    
    return filtered;
  };

  const selectBestPools = (pools, currentActivePoolIds, needCount) => {
    // Fallback selection (всегда используем эту логику)
    const availablePools = pools.filter(pool => 
      !currentActivePoolIds.includes(pool.pool)
    );
    
    if (availablePools.length === 0) {
      return [];
    }
    
    return availablePools
      .sort((a, b) => {
        const scoreA = a.tvlUsd * calculateMonthlyAPR(a.apy);
        const scoreB = b.tvlUsd * calculateMonthlyAPR(b.apy);
        return scoreB - scoreA;
      })
      .slice(0, needCount);
  };

    // Main logic
  // Функция для тихого обновления только значений (без UI изменений)
  const silentUpdatePools = async () => {
    // Prevent multiple simultaneous updates
    if (isUpdating) {
      console.log('Silent update already in progress, skipping...');
      return;
    }
    
    try {
      setIsUpdating(true);
      console.log('Starting silent update...');
      const pools = await fetchPools();
      const currentPositions = await loadPositions();
      
      // Проверяем, есть ли данные для обновления
      if (currentPositions.length === 0) {
        console.log('No positions to update, skipping silent update');
        return;
      }
      
      // Обновляем только текущие значения активных позиций
      const updatedPositions = currentPositions.map(position => {
        if (position.status === 'farming') {
          const updatedPool = pools.find(p => p.pool === position.poolId);
          if (updatedPool) {
            return {
              ...position,
              currentApy: updatedPool.apy,
              currentTvl: updatedPool.tvlUsd
            };
          }
        }
        return position;
      });
      
      setPositions(updatedPositions);
      setLastUpdate(new Date());
      console.log('Silent update completed at:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error in silent update:', error);
    } finally {
      setIsUpdating(false);
    }
  };



  const updatePools = async () => {
    // Предотвращаем множественные одновременные вызовы
    if (loading) {
      console.log('Update already in progress, skipping...');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const pools = await fetchPools();
      const currentPositions = await loadPositions();
      
      // Separate active and historical positions
      const activePositions = currentPositions.filter(p => p.status === 'farming');
      const historicalPositions = currentPositions.filter(p => p.status === 'unstaked');
      
      let updatedActivePositions = [...activePositions];
      let positionsToClose = [];
      
      // STEP 1: Update active positions data and check exit conditions
      updatedActivePositions = updatedActivePositions.map(position => {
        const updatedPool = pools.find(p => p.pool === position.poolId);
        
        if (!updatedPool) {
          // Position should be closed
          const closedPosition = {
            ...position,
            status: 'unstaked',
            exitDate: new Date().toISOString(),
            exitReason: 'Pool removed'
          };
          positionsToClose.push(closedPosition);
          return null; // Will be filtered out
        }
        
        // Update current data
        position.currentApy = updatedPool.apy;
        position.currentTvl = updatedPool.tvlUsd;
        
        const monthlyAPR = calculateMonthlyAPR(updatedPool.apy);
        
        // Check exit conditions
        if (monthlyAPR < CONFIG.EXIT_MONTHLY_APR || updatedPool.tvlUsd < CONFIG.EXIT_TVL_USD) {
          const closedPosition = {
            ...position,
            status: 'unstaked',
            exitDate: new Date().toISOString(),
            exitReason: monthlyAPR < CONFIG.EXIT_MONTHLY_APR 
              ? `APR dropped to ${monthlyAPR.toFixed(1)}%/month` 
              : `TVL dropped to ${formatNumber(updatedPool.tvlUsd)}`
          };
          positionsToClose.push(closedPosition);
          return null; // Will be filtered out
        }
        
        return position;
      }).filter(Boolean); // Remove null positions
      
      // STEP 2: Add new positions if needed (limit to 5 active positions)
      const needNewPositions = CONFIG.MAX_ACTIVE_POSITIONS - updatedActivePositions.length;
      
      if (needNewPositions > 0) {
        const eligiblePools = filterEligiblePools(pools);
        const currentActivePoolIds = updatedActivePositions.map(p => p.poolId);
        const newPools = selectBestPools(eligiblePools, currentActivePoolIds, needNewPositions);
        
        console.log(`Adding ${newPools.length} new pools from ${eligiblePools.length} available`);
        newPools.forEach(pool => {
          const newPosition = {
            poolId: pool.pool,
            symbol: pool.symbol,
            project: pool.project,
            chain: pool.chain,
            entryApy: pool.apy,
            currentApy: pool.apy,
            entryTvl: pool.tvlUsd,
            currentTvl: pool.tvlUsd,
            status: 'farming',
            entryDate: new Date().toISOString(),
            exitDate: null,
            exitReason: null
          };
          
          updatedActivePositions.push(newPosition);
        });
      }
      
      // Ограничиваем количество активных позиций до 5
      updatedActivePositions = updatedActivePositions.slice(0, CONFIG.MAX_ACTIVE_POSITIONS);
      
      // Combine all positions: active + historical + newly closed
      const allPositions = [
        ...updatedActivePositions,
        ...historicalPositions,
        ...positionsToClose
      ];
      
      console.log('Updated positions:', allPositions);
      setPositions(allPositions);
      
      // For system page, save changes to database to maintain consistency
      if (positionsToClose.length > 0 || needNewPositions > 0) {
        await savePositions(allPositions);
        console.log('System mode - positions saved to database');
      } else {
        // Only update active positions data
        await updateActivePositions(updatedActivePositions);
        console.log('System mode - active positions updated');
      }
    } catch (error) {
      console.error('Error updating pools:', error);
      setError('Failed to update pools');
    } finally {
      setLoading(false);
    }
  };

    // Initialize optimized service
  useEffect(() => {
    const initializeServices = async () => {
      try {
        console.log('🚀 Initializing optimized service...');
        
        // Initialize optimized service
        optimizedService.init();
        
        // Setup callbacks for Web Workers
        optimizedService.on('background', 'BACKGROUND_UPDATE', () => {
          console.log('🔄 Background update triggered');
          // System updater handles updates independently
        });
        
        optimizedService.on('cache', 'CACHED_DATA_RETRIEVED', (data) => {
          console.log('📦 Cached data retrieved:', data);
        });
        
        optimizedService.on('defi', 'FILTERED_POOLS', (data) => {
          console.log('✅ Pools filtered:', data.pools?.length);
        });
        
        optimizedService.on('defi', 'BEST_POOLS_SELECTED', (data) => {
          console.log('🎯 Best pools selected:', data.pools?.length);
        });
        
        setServicesInitialized(true);
        console.log('✅ Optimized service initialized successfully');
        
      } catch (error) {
        console.error('❌ Failed to initialize optimized service:', error);
        setServicesInitialized(true);
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      optimizedService.destroy();
    };
  }, []);

  // Handle cached pools
  const handleCachedPools = (cachedPools) => {
    // Use cached data while fetching fresh data
    processPoolsData(cachedPools, true);
  };

  // Process pools data (cached or fresh)
  const processPoolsData = (pools, isFromCache = false) => {
    console.log(`Processing ${pools.length} pools (${isFromCache ? 'cached' : 'fresh'})`);
    
    // Start monitoring if we have active positions
    if (servicesInitialized && activePositions.length > 0) {
      try {
        monitorService.startMonitoring(activePositions, pools, 5 * 60 * 1000); // 5 minutes
      } catch (e) {
        console.warn('MonitorService not available:', e);
      }
    }
  };

  // Handle best pools selection
  const handleBestPoolsSelected = (bestPools) => {
    // Process selected best pools
    console.log('Processing best pools:', bestPools);
  };

  // Handle monitor alerts
  const handleMonitorAlerts = (alerts) => {
    alerts.forEach(alert => {
      if (alert.type === 'exit_condition') {
        console.log(`🚨 Exit alert for ${alert.symbol}: ${alert.reason}`);
        // Handle exit condition
      }
    });
  };

  // Initialization with services
  useEffect(() => {
    let isMounted = true;
    let dataLoaded = false;
    
    const initializeData = async () => {
      if (!isMounted || dataLoaded) return;
      
      // Load fresh data
      const savedPositions = await loadPositions();
      if (isMounted && !dataLoaded) {
        setPositions(savedPositions);
        dataLoaded = true;
        setLastUpdate(new Date());
        
        // Cache the positions if services are available
        if (servicesInitialized) {
          try {
            optimizedService.cacheData('positions', savedPositions, 2 * 60 * 1000);
          } catch (e) {
            console.warn('Cache service not available for positions:', e);
          }
        }
      }
    };
    
    // Load data immediately, don't wait for services
    initializeData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const activePositions = positions.filter(p => p.status === 'farming');
  const closedPositions = positions.filter(p => p.status === 'unstaked');
  const activeCount = activePositions.length;
  const totalCount = positions.length;
  
  // Debug information
  console.log('Total positions:', totalCount);
  console.log('Active positions:', activeCount);
  console.log('Closed positions:', closedPositions.length);
  
  // Calculate average monthly yield for active pools
  const averageMonthlyAPR = activePositions.length > 0 
    ? activePositions.reduce((sum, pos) => sum + calculateMonthlyAPR(pos.currentApy), 0) / activePositions.length
    : 0;

  const Card = ({ children, className = "" }) => (
    <div className={`glass-card glass-card-hover p-6 animate-fade-in-up w-full ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">DeFi Investment Report</h1>
            <p className="text-gray-400">
              Monitoring profitable DeFi pools
              {lastUpdate && (
                <span className="ml-2 text-xs text-gray-500">
                  • Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </p>
            {/* Services Status */}
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${servicesInitialized ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
              <span className="text-xs text-gray-500">
                {servicesInitialized ? 'Optimized service active' : 'Initializing services...'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={updatePools}
            disabled={loading || !servicesInitialized}
            className={`glass-button px-4 py-2 rounded-lg text-sm ${
              !servicesInitialized ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Updating...' : 'Update Pools'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="text-green-400" size={24} />
              </div>
                             <div>
                 <div className="text-2xl font-bold text-white">{activeCount}</div>
                 <div className="text-gray-400 text-sm">Active pools</div>
               </div>
            </div>
          </Card>
          
                     <Card>
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                 <TrendingUp className="text-orange-400" size={24} />
               </div>
               <div>
                 <div className="text-2xl font-bold text-white">
                   {averageMonthlyAPR > 0 ? `${averageMonthlyAPR.toFixed(1)}%` : '--'}
                 </div>
                 <div className="text-gray-400 text-sm">Avg. monthly yield</div>
               </div>
             </div>
           </Card>
          
                     <Card>
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                 <AlertTriangle className="text-red-400" size={24} />
               </div>
               <div>
                 <div className="text-2xl font-bold text-white">
                   {closedPositions.length}
                 </div>
                 <div className="text-gray-400 text-sm">Closed positions</div>
               </div>
             </div>
           </Card>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-red-500/20 bg-red-500/10">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Loading State - только при ручном обновлении */}
        {loading && (
          <Card>
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                <span>Updating pools...</span>
              </div>
            </div>
          </Card>
        )}

         {/* Active Pools Table */}
         {(
           <Card>
             <div className="mb-4">
               <div className="flex items-center justify-between mb-1">
                 <h3 className="text-2xl font-bold text-white">Active Pools</h3>
                 <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                   {activePositions.length} active
                 </span>
               </div>
               <p className="text-gray-300 opacity-70 text-sm">View your current active DeFi positions and performance</p>
             </div>
             
             {/* Desktop Table View */}
             <div className="hidden sm:block overflow-x-auto">
               <table className="w-full">
                 <thead className="sticky top-0 z-10 bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90">
                   <tr>
                     <th className="text-left py-4 px-4 font-semibold text-white uppercase rounded-tl-lg text-xs sm:text-sm">Pool</th>
                     <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">Chain</th>
                     <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">APR</th>
                     <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">TVL</th>
                     <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">Entry Date</th>
                     <th className="text-left py-4 px-4 font-semibold text-white uppercase rounded-tr-lg text-xs sm:text-sm">Link</th>
                   </tr>
                 </thead>
                 <tbody>
                   {activePositions.length === 0 ? (
                     <tr>
                       <td colSpan="6" className="py-12 text-center">
                         <div className="text-gray-400 text-lg mb-2">No active pools</div>
                         <div className="text-gray-500 text-sm">Searching for suitable pools...</div>
                       </td>
                     </tr>
                   ) : (
                     activePositions.map((position, index) => {
                     const monthlyAPR = calculateMonthlyAPR(position.currentApy);
                     
                     return (
                       <tr 
                         key={index} 
                         className="border-b border-gray-800 hover:bg-gray-800/20 transition-colors bg-green-500/5"
                       >
                         <td className="py-4 px-4">
                           <div className="text-white font-medium">{position.symbol}</div>
                           <div className="text-gray-500 text-sm">{position.project}</div>
                         </td>
                         <td className="py-4 px-4">
                           <span className={`px-3 py-1 rounded-full text-xs font-medium ${getChainClass(position.chain)}`}>
                             {position.chain}
                           </span>
                         </td>
                         <td className="py-4 px-4">
                           <div className="text-green-400 font-semibold text-lg">
                             {position.currentApy.toFixed(1)}%
                           </div>
                           <div className="text-gray-500 text-sm">
                             {monthlyAPR.toFixed(1)}%/month
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <div className="text-white font-medium">
                             {formatNumber(position.currentTvl)}
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <div className="text-gray-400 text-sm">
                             {new Date(position.entryDate).toLocaleDateString('ru-RU')}
                           </div>
                           <div className="text-gray-500 text-xs">
                             {new Date(position.entryDate).toLocaleTimeString('ru-RU')}
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <a 
                             href={`https://defillama.com/yields/pool/${position.poolId}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="glass-button px-3 py-1 rounded-lg text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1 w-fit"
                           >
                             <ExternalLink size={14} />
                             View
                           </a>
                         </td>
                       </tr>
                     );
                   }))}
                 </tbody>
               </table>
             </div>

             {/* Mobile Cards View */}
             <div className="sm:hidden space-y-4">
               {activePositions.length === 0 ? (
                 <div className="py-12 text-center">
                   <div className="text-gray-400 text-lg mb-2">No active pools</div>
                   <div className="text-gray-500 text-sm">Searching for suitable pools...</div>
                 </div>
               ) : (
                 activePositions.map((position, index) => {
                   const monthlyAPR = calculateMonthlyAPR(position.currentApy);
                   
                   return (
                     <div 
                       key={index} 
                       className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 space-y-3"
                     >
                       {/* Pool Info */}
                       <div className="flex items-center justify-between">
                         <div>
                           <div className="text-white font-medium text-lg">{position.symbol}</div>
                           <div className="text-gray-500 text-sm">{position.project}</div>
                         </div>
                         <span className={`px-3 py-1 rounded-full text-xs font-medium ${getChainClass(position.chain)}`}>
                           {position.chain}
                         </span>
                       </div>

                       {/* APR and TVL */}
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                           <div className="text-gray-400 text-xs uppercase tracking-wide">APR</div>
                           <div className="text-green-400 font-semibold text-xl">
                             {position.currentApy.toFixed(1)}%
                           </div>
                           <div className="text-gray-500 text-xs">
                             {monthlyAPR.toFixed(1)}%/month
                           </div>
                         </div>
                         <div>
                           <div className="text-gray-400 text-xs uppercase tracking-wide">TVL</div>
                           <div className="text-white font-medium">
                             {formatNumber(position.currentTvl)}
                           </div>
                         </div>
                       </div>

                       {/* Entry Date */}
                       <div>
                         <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Entry Date</div>
                         <div className="text-gray-300 text-sm">
                           {new Date(position.entryDate).toLocaleDateString('ru-RU')}
                         </div>
                         <div className="text-gray-500 text-xs">
                           {new Date(position.entryDate).toLocaleTimeString('ru-RU')}
                         </div>
                       </div>

                       {/* Link */}
                       <div className="pt-2">
                         <a 
                           href={`https://defillama.com/yields/pool/${position.poolId}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="glass-button px-4 py-2 rounded-lg text-sm text-orange-400 hover:text-orange-300 flex items-center justify-center gap-2 w-full"
                         >
                           <ExternalLink size={16} />
                           View Pool Details
                         </a>
                       </div>
                     </div>
                   );
                 })
               )}
             </div>
           </Card>
         )}

         {/* Closed Pools History Table */}
         {(
           <Card>
             <div className="mb-4">
               <div className="flex items-center justify-between mb-1">
                 <h3 className="text-2xl font-bold text-white">Closed Positions History</h3>
                 <span className="px-4 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium whitespace-nowrap">
                   {closedPositions.length} closed
                 </span>
               </div>
               <p className="text-gray-300 opacity-70 text-sm">View your closed positions and exit reasons</p>
             </div>

                         {/* Desktop Table View */}
            <div className="hidden sm:block">
              <div className="max-h-96 overflow-y-auto border border-gray-800 rounded-lg">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90">
                    <tr>
                      <th className="text-left py-4 px-4 font-semibold text-white uppercase rounded-tl-lg text-xs sm:text-sm">Pool</th>
                      <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">Chain</th>
                      <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">Entry APR</th>
                      <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">Entry TVL</th>
                      <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">Period</th>
                      <th className="text-left py-4 px-4 font-semibold text-white uppercase text-xs sm:text-sm">Exit Details</th>
                      <th className="text-left py-4 px-4 font-semibold text-white uppercase rounded-tr-lg text-xs sm:text-sm">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedPositions.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-12 text-center">
                          <div className="text-gray-400 text-lg mb-2">No closed positions yet</div>
                          <div className="text-gray-500 text-sm">History will be displayed here when positions are closed</div>
                        </td>
                      </tr>
                    ) : (
                      closedPositions.slice(0, 10).map((position, index) => {
                     const entryMonthlyAPR = calculateMonthlyAPR(position.entryApy);
                     const daysDiff = position.exitDate 
                       ? Math.floor((new Date(position.exitDate) - new Date(position.entryDate)) / (1000 * 60 * 60 * 24))
                       : 0;
                     
                     return (
                       <tr 
                         key={index} 
                         className="border-b border-gray-800 hover:bg-gray-800/20 transition-colors"
                       >
                         <td className="py-4 px-4">
                           <div className="text-white font-medium">{position.symbol}</div>
                           <div className="text-gray-500 text-sm">{position.project}</div>
                         </td>
                         <td className="py-4 px-4">
                           <span className={`px-3 py-1 rounded-full text-xs font-medium ${getChainClass(position.chain)}`}>
                             {position.chain}
                           </span>
                         </td>
                         <td className="py-4 px-4">
                           <div className="text-gray-400 font-medium">
                             {position.entryApy.toFixed(1)}%
                           </div>
                           <div className="text-gray-500 text-sm">
                             {entryMonthlyAPR.toFixed(1)}%/month
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <div className="text-white font-medium">
                             {formatNumber(position.entryTvl)}
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <div className="text-gray-400 text-sm">
                             {daysDiff} {daysDiff === 1 ? 'day' : daysDiff < 5 ? 'days' : 'days'}
                           </div>
                           <div className="text-gray-500 text-xs">
                             {new Date(position.entryDate).toLocaleDateString('ru-RU')} {new Date(position.entryDate).toLocaleTimeString('ru-RU')}
                           </div>
                           <div className="text-gray-500 text-xs">
                             {new Date(position.exitDate).toLocaleDateString('ru-RU')} {new Date(position.exitDate).toLocaleTimeString('ru-RU')}
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <div className="text-red-400 text-sm font-medium mb-1">
                             {position.exitReason}
                           </div>
                           <div className="text-gray-400 text-xs">
                             Exit APR: {position.exitApy?.toFixed(1) || '--'}%
                           </div>
                           <div className="text-gray-400 text-xs">
                             Exit TVL: {formatNumber(position.exitTvl)}
                           </div>
                         </td>
                         <td className="py-4 px-4">
                           <a 
                             href={`https://defillama.com/yields/pool/${position.poolId}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="glass-button px-3 py-1 rounded-lg text-sm text-orange-400 hover:text-orange-300 flex items-center gap-1 w-fit"
                           >
                             <ExternalLink size={14} />
                             View
                           </a>
                         </td>
                       </tr>
                     );
                   }))}
                 </tbody>
               </table>
              </div>
            </div>

             {/* Mobile Cards View */}
             <div className="sm:hidden">
               {closedPositions.length === 0 ? (
                 <div className="py-12 text-center">
                   <div className="text-gray-400 text-lg mb-2">No closed positions yet</div>
                   <div className="text-gray-500 text-sm">History will be displayed here when positions are closed</div>
                 </div>
               ) : (
                 <div>
                   {/* All cards in one scrollable container */}
                   <div className="max-h-96 overflow-y-auto border border-gray-800 rounded-lg p-2">
                     <div className="space-y-3">
                       {closedPositions.map((position, index) => {
                         const entryMonthlyAPR = calculateMonthlyAPR(position.entryApy);
                         const daysDiff = position.exitDate 
                           ? Math.floor((new Date(position.exitDate) - new Date(position.entryDate)) / (1000 * 60 * 60 * 24))
                           : 0;
                         
                         return (
                           <div 
                             key={index} 
                             className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-2"
                           >
                             {/* Pool Info */}
                             <div className="flex items-center justify-between">
                               <div>
                                 <div className="text-white font-medium text-sm">{position.symbol}</div>
                                 <div className="text-gray-500 text-xs">{position.project}</div>
                               </div>
                               <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getChainClass(position.chain)}`}>
                                 {position.chain}
                               </span>
                             </div>

                             {/* Entry and Exit Data */}
                             <div className="grid grid-cols-2 gap-3">
                               <div>
                                 <div className="text-gray-400 text-xs uppercase tracking-wide">Entry APR</div>
                                 <div className="text-gray-300 font-semibold text-lg">
                                   {position.entryApy.toFixed(1)}%
                                 </div>
                                 <div className="text-gray-500 text-xs">
                                   TVL: {formatNumber(position.entryTvl)}
                                 </div>
                               </div>
                               <div>
                                 <div className="text-gray-400 text-xs uppercase tracking-wide">Exit APR</div>
                                 <div className="text-gray-300 font-semibold text-lg">
                                   {position.exitApy?.toFixed(1) || '--'}%
                                 </div>
                                 <div className="text-gray-500 text-xs">
                                   TVL: {formatNumber(position.exitTvl)}
                                 </div>
                               </div>
                             </div>

                             {/* Period and Exit Reason */}
                             <div className="grid grid-cols-2 gap-3">
                               <div>
                                 <div className="text-gray-400 text-xs uppercase tracking-wide">Period</div>
                                 <div className="text-gray-300 font-semibold text-lg">
                                   {daysDiff} {daysDiff === 1 ? 'day' : 'days'}
                                 </div>
                                 <div className="text-gray-500 text-xs">
                                   {new Date(position.entryDate).toLocaleDateString('ru-RU')} - {new Date(position.exitDate).toLocaleDateString('ru-RU')}
                                 </div>
                               </div>
                               <div>
                                 <div className="text-gray-400 text-xs uppercase tracking-wide">Exit Reason</div>
                                 <div className="text-red-400 font-medium text-sm">
                                   {position.exitReason}
                                 </div>
                               </div>
                             </div>

                             {/* Link */}
                             <div className="pt-1">
                               <a 
                                 href={`https://defillama.com/yields/pool/${position.poolId}`}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="glass-button px-3 py-1 rounded text-xs text-orange-400 hover:text-orange-300 flex items-center justify-center gap-1 w-full"
                               >
                                 <ExternalLink size={12} />
                                 View Pool
                               </a>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                 </div>
               )}
             </div>
           </Card>
         )}

         {/* Empty States */}
         {!loading && activePositions.length === 0 && closedPositions.length === 0 && !error && (
           <Card>
             <div className="text-center py-12">
               <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
               <div className="text-gray-400 text-lg mb-2">No pool data yet</div>
               <div className="text-gray-500 text-sm">System will automatically find suitable pools on next update</div>
             </div>
           </Card>
         )}

         {!loading && activePositions.length === 0 && closedPositions.length > 0 && !error && (
           <Card>
             <div className="text-center py-8">
                                      <div className="text-gray-400 text-lg mb-2">No active pools</div>
                       <div className="text-gray-500 text-sm">Searching for new suitable pools...</div>
             </div>
           </Card>
         )}
      </div>
    </div>
  );
};

export default ReportPage;