import React, { useState, useEffect } from 'react';
import { Search, User, DollarSign, Package } from 'lucide-react';

export default function AdminAddTransaction({ token, users }) {
  const [userId, setUserId] = useState(users && users.length > 0 ? users[0].id : '');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [investments, setInvestments] = useState([]);
  const [investmentId, setInvestmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('DAILY_PROFIT');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Фильтруем пользователей по поиску
  const filteredUsers = users?.filter(user =>
    user.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase())
  ) || [];

  // Загружать активные инвестиции только если выбран тип DAILY_PROFIT
  useEffect(() => {
    if (!userId || type !== 'DAILY_PROFIT') {
      setInvestments([]);
      setInvestmentId('');
      return;
    }
    setInvestments([]);
    setInvestmentId('');
    fetch(`${import.meta.env.VITE_API_URL}/api/users/${userId}`)
      .then(res => res.json())
      .then(user => {
        if (user && user.investments) {
          // Только активные инвестиции
          const active = user.investments.filter(inv => inv.isActive);
          setInvestments(active);
          if (active.length > 0) setInvestmentId(active[0].id);
        } else {
          setInvestments([]);
        }
      });
  }, [userId, type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          investmentId: type === 'DAILY_PROFIT' ? investmentId : undefined,
          amount,
          type,
          description
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Transaction added successfully!');
        setAmount('');
        setType('DAILY_PROFIT');
        setDescription('');
        setInvestmentId('');
        setUserSearchTerm('');
      } else {
        setError(data.error || 'Failed to add transaction');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users?.find(u => u.id === userId);

  // Закрыть dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Selection with Search */}
        <div className="relative user-dropdown-container">
          <label className="block text-gray-300 mb-2 font-medium flex items-center gap-2">
            <User size={16} />
            User
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users by email or username..."
              value={userSearchTerm}
              onChange={(e) => {
                setUserSearchTerm(e.target.value);
                setShowUserDropdown(true);
              }}
              onFocus={() => setShowUserDropdown(true)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white focus:border-orange-500 focus:outline-none"
            />
          </div>
          
          {/* User Dropdown */}
          {showUserDropdown && filteredUsers.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg max-h-60 overflow-y-auto">
              {filteredUsers.map(user => (
                <div
                  key={user.id}
                  onClick={() => {
                    setUserId(user.id);
                    setUserSearchTerm(user.email);
                    setShowUserDropdown(false);
                  }}
                  className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0"
                >
                  <div className="text-white font-medium">{user.email}</div>
                  <div className="text-gray-400 text-sm">{user.username}</div>
                </div>
              ))}
            </div>
          )}
          
          {/* Selected User Display */}
          {selectedUser && (
            <div className="mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="text-white font-medium">{selectedUser.email}</div>
              <div className="text-gray-400 text-sm">Username: {selectedUser.username}</div>
              <div className="text-green-400 text-sm">Balance: ${selectedUser.balance?.toFixed(2)}</div>
            </div>
          )}
        </div>

        {/* Transaction Type */}
        <div>
          <label className="block text-gray-300 mb-2 font-medium flex items-center gap-2">
            <Package size={16} />
            Transaction Type
          </label>
          <select 
            value={type} 
            onChange={e => setType(e.target.value)} 
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
          >
            <option value="DAILY_PROFIT">Daily Profit</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="REFERRAL_BONUS">Referral Bonus</option>
            <option value="RANK_BONUS">Rank Bonus</option>
            <option value="RANK_REWARD">Rank Reward</option>
            <option value="BONUS">Bonus</option>
          </select>
        </div>

        {/* Investment Selection */}
        {type === 'DAILY_PROFIT' && (
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Investment</label>
            <select 
              value={investmentId} 
              onChange={e => setInvestmentId(e.target.value)} 
              required 
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
            >
              {investments.length === 0 && <option value="">No active investments</option>}
              {investments.map(inv => (
                <option key={inv.id} value={inv.id}>
                  #{inv.id} — {inv.package?.name || 'Package'}: ${inv.amount} USD
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="block text-gray-300 mb-2 font-medium flex items-center gap-2">
            <DollarSign size={16} />
            Amount
          </label>
          <input 
            type="number" 
            value={amount} 
            onChange={e => setAmount(e.target.value)} 
            required 
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none" 
            placeholder="Enter amount..."
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-gray-300 mb-2 font-medium">Description</label>
          <input 
            type="text" 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
            placeholder="Transaction description..."
          />
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={loading || !userId} 
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:transform-none shadow-lg hover:shadow-xl"
        >
          {loading ? 'Adding Transaction...' : 'Add Transaction'}
        </button>

        {/* Status Messages */}
        {success && (
          <div className="text-green-400 text-center mt-3 p-3 bg-green-900/20 rounded-lg border border-green-500/30">
            {success}
          </div>
        )}
        {error && (
          <div className="text-red-400 text-center mt-3 p-3 bg-red-900/20 rounded-lg border border-red-500/30">
            {error}
          </div>
        )}
      </form>
    </>
  );
} 