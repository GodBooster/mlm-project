import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ReportPage = ({ userData }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Configuration
  const CONFIG = {
    MIN_MONTHLY_APR: 50,      // Minimum monthly yield (%)
    MIN_TVL_USD: 500000,      // Minimum TVL ($)
    MAX_YEARLY_APR: 5000,     // Maximum yearly yield (%) - exclude high-risk pools
    MAX_ACTIVE_POSITIONS: 5,  // Maximum active positions
    CHECK_INTERVAL: 60 * 60 * 1000, // 1 hour
    TVL_DROP_THRESHOLD: 0.1,  // TVL drop threshold (10%)
    API_URL: 'https://yields.llama.fi/pools',
    EXIT_MONTHLY_APR: 48,     // Exit threshold for monthly APR (%)
    EXIT_TVL_USD: 450000      // Exit threshold for TVL ($)
  };

  // API functions
  const loadPositions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !userData?.id) return [];
      
      const response = await fetch(`${API}/api/defi-positions/${userData.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.map(pos => ({
          ...pos,
          status: pos.status.toLowerCase() === 'farming' ? 'farming' : 'unstaked'
        }));
      }
    } catch (e) {
      console.error('Error loading positions:', e);
    }
    return [];
  };

  const savePositions = async (positions) => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !userData?.id) return;
      
      await fetch(`${API}/api/defi-positions/${userData.id}`, {
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

  const formatNumber = (num) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(0)}`;
  };

  const calculateMonthlyAPR = (yearlyAPR) => {
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

  // API
  const fetchPools = async () => {
    try {
      const response = await fetch(CONFIG.API_URL);
      if (!response.ok) throw new Error('API unavailable');
      
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching data:', error);
      throw error;
    }
  };

  const filterEligiblePools = (pools) => {
    const filtered = pools.filter(pool => {
      const monthlyAPR = calculateMonthlyAPR(pool.apy);
      const isEligible = monthlyAPR >= CONFIG.MIN_MONTHLY_APR && 
                        pool.tvlUsd >= CONFIG.MIN_TVL_USD &&
                        pool.apy > 0 &&
                        pool.apy <= CONFIG.MAX_YEARLY_APR;
      
      // For debugging, uncomment:
      // if (pool.apy > CONFIG.MAX_YEARLY_APR) {
      //   console.log(`Excluded high-risk pool: ${pool.symbol} with APR ${pool.apy}%`);
      // }
      
      return isEligible;
    }).sort((a, b) => b.tvlUsd - a.tvlUsd);
    
    return filtered;
  };

  const selectBestPools = (pools, currentActivePoolIds, needCount) => {
    // Exclude pools that are already active
    const availablePools = pools.filter(pool => 
      !currentActivePoolIds.includes(pool.pool)
    );
    
    // If no available pools, return empty array
    if (availablePools.length === 0) {
      return [];
    }
    
    // Sort by score (TVL * monthly APR) and take needed amount
    return availablePools
      .sort((a, b) => {
        const scoreA = a.tvlUsd * calculateMonthlyAPR(a.apy);
        const scoreB = b.tvlUsd * calculateMonthlyAPR(b.apy);
        return scoreB - scoreA;
      })
      .slice(0, needCount);
  };

    // Main logic
  const updatePools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const pools = await fetchPools();
      const eligiblePools = filterEligiblePools(pools);
      const currentPositions = await loadPositions();
       
       let updatedPositions = [...currentPositions];
      
      // STEP 1: Check current active positions for exit conditions
      updatedPositions = updatedPositions.map(position => {
        if (position.status === 'farming') {
          const updatedPool = pools.find(p => p.pool === position.poolId);
          
          if (!updatedPool) {
            return {
              ...position,
              status: 'unstaked',
              exitDate: new Date().toISOString(),
              exitReason: 'Pool removed'
            };
          }
          
          const monthlyAPR = calculateMonthlyAPR(updatedPool.apy);
          const tvlDrop = (position.entryTvl - updatedPool.tvlUsd) / position.entryTvl;
          
          // Update current data
          position.currentApy = updatedPool.apy;
          position.currentTvl = updatedPool.tvlUsd;
          
          // Check exit conditions
          if (monthlyAPR < CONFIG.EXIT_MONTHLY_APR || updatedPool.tvlUsd < CONFIG.EXIT_TVL_USD) {
            return {
              ...position,
              status: 'unstaked',
              exitDate: new Date().toISOString(),
              exitReason: monthlyAPR < CONFIG.EXIT_MONTHLY_APR 
                ? `APR dropped to ${monthlyAPR.toFixed(1)}%/month` 
                : `TVL dropped to ${formatNumber(updatedPool.tvlUsd)}`
            };
          }
        }
        return position;
      });
      
      // STEP 2: Add new positions until maximum (5 active pools) is reached
      const activePositionsAfterUpdate = updatedPositions.filter(p => p.status === 'farming');
      const needNewPositions = CONFIG.MAX_ACTIVE_POSITIONS - activePositionsAfterUpdate.length;
      
      if (needNewPositions > 0 && eligiblePools.length > 0) {
        // Get active pool IDs (don't exclude closed pools for reuse)
        const currentActivePoolIds = activePositionsAfterUpdate.map(p => p.poolId);
        const newPools = selectBestPools(eligiblePools, currentActivePoolIds, needNewPositions);
        
        // Add new positions
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
          
          updatedPositions.unshift(newPosition);
        });
      }
      
             setPositions(updatedPositions);
       await savePositions(updatedPositions);
      
    } catch (error) {
      setError('Failed to get pool data');
      console.error('Error updating pools:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialization
  useEffect(() => {
    const initializeData = async () => {
      const savedPositions = await loadPositions();
      setPositions(savedPositions);
      await updatePools();
    };
    
    if (userData?.id) {
      initializeData();
      
      const interval = setInterval(updatePools, CONFIG.CHECK_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [userData]);

  const activePositions = positions.filter(p => p.status === 'farming');
  const closedPositions = positions.filter(p => p.status === 'unstaked');
  const activeCount = activePositions.length;
  const totalCount = positions.length;
  
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
           <p className="text-gray-400">Monitoring profitable DeFi pools</p>
         </div>
          
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

        {/* Loading State */}
        {loading && positions.length === 0 && (
                     <Card>
             <div className="text-center py-8">
               <div className="inline-flex items-center gap-2 text-gray-400">
                 <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                 <span>Searching for suitable pools...</span>
               </div>
             </div>
           </Card>
         )}

         {/* Active Pools Table */}
         {(
           <Card>
             <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">Active Pools</h3>
             <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
               {activePositions.length} active
             </span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="border-b border-gray-700">
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Pool</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Chain</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">APR</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">TVL</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Entry Date</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Link</th>
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
           </Card>
         )}

         {/* Closed Pools History Table */}
         {(
           <Card>
             <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-semibold text-white">Closed Positions History</h3>
             <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
               {closedPositions.length} closed
             </span>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full">
                 <thead>
                   <tr className="border-b border-gray-700">
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Pool</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Chain</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Entry APR</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Period</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Exit Reason</th>
                     <th className="text-left py-4 px-4 text-gray-400 font-medium">Link</th>
                   </tr>
                 </thead>
                 <tbody>
                   {closedPositions.length === 0 ? (
                     <tr>
                                            <td colSpan="6" className="py-12 text-center">
                       <div className="text-gray-400 text-lg mb-2">No closed positions yet</div>
                       <div className="text-gray-500 text-sm">History will be displayed here when positions are closed</div>
                     </td>
                     </tr>
                   ) : (
                     closedPositions.map((position, index) => {
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
                           <div className="text-red-400 text-sm font-medium">
                             {position.exitReason}
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