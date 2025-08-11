import React, { useEffect, useState } from 'react';
import { HelpCircle, Trophy, Gift } from 'lucide-react';
import ToastContainer from './components/ToastContainer';
import { useToast } from './hooks/useToast';

const Card = ({ children, className = "" }) => (
  <div className={`glass-card glass-card-hover p-6 animate-fade-in-up ${className}`}>{children}</div>
);

const Modal = ({ onClose, children }) => (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="glass-modal p-8 rounded-2xl max-w-md w-full">
      {children}
      <button 
        className="orange-button text-white px-6 py-2 rounded w-full" 
        onClick={onClose}
      >
        OK
      </button>
    </div>
  </div>
);

export default function RankRewardsPage({ onRankUpdate }) {
  const { toasts, removeToast, showSuccess, showError } = useToast();
  const [rankData, setRankData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [selectedRank, setSelectedRank] = useState(null);

  useEffect(() => {
    fetchRankData();
  }, []);

  const fetchRankData = async () => {
      setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API}/api/rank-rewards`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      console.log('Rank data:', data);
      setRankData(data);
      
      // Update parent component with current rank
      if (onRankUpdate && data.currentRank) {
        onRankUpdate(data.currentRank.level);
      }
    } catch (error) {
      console.error('Error fetching rank data:', error);
    }
    setLoading(false);
  };

  const handleClaimClick = (rank) => {
    setSelectedRank(rank);
    setShowChoiceModal(true);
  };

  const handleClaim = async (rewardType) => {
    if (!selectedRank) return;
    
    setClaiming(true);
    try {
      const token = localStorage.getItem('token');
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API}/api/rank-rewards/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          level: selectedRank.level, 
          rewardType 
        })
      });
      
      if (res.ok) {
        const result = await res.json();
        setModalData(result);
        setShowClaimModal(true);
        setShowChoiceModal(false);
        // Refresh data after claim
        await fetchRankData();
      } else {
        const errorData = await res.json();
        showError(errorData.error || 'Failed to claim reward');
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
      showError('Failed to claim reward');
    }
    setClaiming(false);
  };

  if (loading || !rankData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-lg">Loading rank rewards...</div>
      </div>
    );
  }

  const { 
    turnover = 0, 
    currentRank = null, 
    nextRank = null, 
    claimed = [], 
    totalClaimedCash = 0,
    lastClaimedPrize = null,
    ranks = [] 
  } = rankData;

  return (
    <div className="space-y-4 px-2 sm:px-4">
      <Card>
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-1">
            <Trophy className="text-orange-400 w-6 h-6" />
            <h3 className="text-2xl font-bold text-white">Rank Rewards System</h3>
          </div>
          <p className="text-gray-300 opacity-70 text-sm">View your rank progress and available rewards</p>
        </div>
        
        <div className="text-gray-300 mb-6 text-xs sm:text-sm">
          <b>How it works:</b> Your rank is based on the total investments (turnover) of all your referrals in <b>all your open lines</b>. 
          When you reach a rank, you can claim either the cash reward or the special prize. For prizes, contact your leader or company support.
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 text-center">
            <div className="text-gray-400 text-sm">Your Turnover</div>
            <div className="text-2xl font-bold text-green-400">${turnover.toLocaleString()}</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-gray-400 text-sm">Claimed Cash Reward</div>
            <div className="text-xl font-bold text-orange-400">${totalClaimedCash.toLocaleString()}</div>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="text-gray-400 text-sm">Last Claimed Prize</div>
            <div className="text-lg font-bold text-blue-400">
              {lastClaimedPrize ? `${lastClaimedPrize.level}. ${ranks.find(r => r.level === lastClaimedPrize.level)?.name || 'Unknown'}` : 'No prizes claimed'}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {nextRank && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>Progress to next rank</span>
              <span>{Math.round((turnover / nextRank.turnover) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((turnover / nextRank.turnover) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${turnover.toLocaleString()} / ${nextRank.turnover.toLocaleString()}
            </div>
          </div>
        )}

        {/* Ranks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-gradient-to-r from-cyan-900/90 via-gray-900/90 to-yellow-900/90">
              <tr>
                <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tl-lg">Rank</th>
                <th className="text-left py-3 px-3 font-semibold text-white uppercase">Turnover</th>
                <th className="text-left py-3 px-3 font-semibold text-white uppercase">Cash Reward</th>
                <th className="text-left py-3 px-3 font-semibold text-white uppercase">Special Prize</th>
                <th className="text-left py-3 px-3 font-semibold text-white uppercase rounded-tr-lg">Status</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map((rank) => {
                const achieved = turnover >= rank.turnover;
                const isCurrent = currentRank?.level === rank.level;
                const claimedCash = claimed.find(c => c.level === rank.level && c.type === 'Cash');
                const claimedPrize = claimed.find(c => c.level === rank.level && c.type === 'Prize');
                const canClaimCash = achieved && !claimedCash;
                const canClaimPrize = achieved && !claimedPrize;
                const canClaim = canClaimCash || canClaimPrize;

                return (
                  <tr 
                    key={rank.level} 
                    className={`border-b border-gray-800 transition-all ${
                      achieved ? 'bg-green-900/10' : ''
                    } ${isCurrent ? 'ring-2 ring-orange-400' : ''}`}
                  >
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1">
                        <span className="text-white font-bold">{rank.level}</span>
                        {isCurrent && <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-orange-400 font-semibold">
                      ${rank.turnover.toLocaleString()}
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-green-400 font-semibold">${rank.reward.toLocaleString()}</span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-start gap-1">
                        <Gift className="text-blue-400 w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300 text-xs sm:text-sm leading-relaxed break-words sm:break-normal" title={rank.prize}>
                          {rank.prize}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      {(claimedCash || claimedPrize) ? (
                        <div className="flex items-center gap-1">
                          <Trophy className="text-yellow-400 w-3 h-3" />
                          <span className="text-yellow-400 text-xs sm:text-sm">Claimed</span>
                        </div>
                      ) : canClaim ? (
                        <button
                          onClick={() => handleClaimClick(rank)}
                          disabled={claiming}
                          className="glass-button bg-gradient-to-r from-orange-400 to-red-500 text-white px-2 py-1 rounded text-xs font-semibold hover:from-orange-500 hover:to-red-600 transition-all disabled:opacity-50"
                        >
                          {claiming ? 'Claiming...' : 'Claim'}
                        </button>
                      ) : (
                        <span className="text-gray-500 text-xs sm:text-sm">
                          {achieved ? 'Available' : 'Locked'}
                        </span>
                      )}
                    </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Choice Modal */}
      {showChoiceModal && selectedRank && (
        <Modal onClose={() => setShowChoiceModal(false)}>
          <div className="text-center">
            <Trophy className="text-orange-400 w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">Choose Your Reward</h3>
            <div className="text-white mb-6">
              <div className="mb-6 text-gray-300">
                You can claim your reward for Rank {selectedRank.level}
              </div>
              <div className="space-y-4">
                <button
                  onClick={() => handleClaim('Cash')}
                  disabled={claiming}
                  className="w-full glass-card p-4 rounded-lg transition-all disabled:opacity-50 hover:bg-green-500/10 border-green-500/20 hover:border-green-500/40"
                >
                  <div className="text-center mb-2">
                    <span className="text-xl font-bold text-green-400">
                      Claim Cash Reward: ${selectedRank.reward.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">Money will be added to your balance</div>
                </button>
                <button
                  onClick={() => handleClaim('Prize')}
                  disabled={claiming}
                  className="w-full glass-card p-4 rounded-lg transition-all disabled:opacity-50 hover:bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40"
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Gift className="text-blue-400 w-5 h-5" />
                    <span className="text-xl font-bold text-blue-400">
                      Get Special Prize
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">{selectedRank.prize}</div>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Claim Modal */}
      {showClaimModal && modalData && (
        <Modal onClose={() => setShowClaimModal(false)}>
          <div className="text-center">
            <Trophy className="text-orange-400 w-16 h-16 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-4">Congratulations!</h3>
            <div className="text-white mb-6">
              {modalData.type === 'Cash' ? (
                <div className="glass-card p-4 rounded-lg mb-4 border-green-500/20">
                  <div className="text-center mb-2">
                    <span className="text-green-400 text-xl font-bold">
                      {modalData.message}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">Added to your balance</div>
                </div>
              ) : (
                <div className="glass-card p-4 rounded-lg border-blue-500/20">
                  <div className="text-left">
                    <div className="text-sm text-gray-400 whitespace-pre-line">
                      {modalData.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
} 