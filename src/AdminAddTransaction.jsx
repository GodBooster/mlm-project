import React, { useState, useEffect } from 'react';

export default function AdminAddTransaction({ token, users }) {
  const [userId, setUserId] = useState(users && users.length > 0 ? users[0].id : '');
  const [investments, setInvestments] = useState([]);
  const [investmentId, setInvestmentId] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('DAILY_PROFIT');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Загружать активные инвестиции только если выбран тип DAILY_PROFIT
  useEffect(() => {
    if (!userId || type !== 'DAILY_PROFIT') {
      setInvestments([]);
      setInvestmentId('');
      return;
    }
    setInvestments([]);
    setInvestmentId('');
    fetch(`/api/users/${userId}`)
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
      const res = await fetch('/api/admin/transactions', {
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
      } else {
        setError(data.error || 'Failed to add transaction');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <pre style={{color: 'white', background: '#222', padding: 8, fontSize: 12}}>
        {JSON.stringify(investments, null, 2)}
      </pre>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-gray-300 mb-1 font-medium">User</label>
          <select value={userId} onChange={e => setUserId(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none">
            {users && users.map(user => (
              <option key={user.id} value={user.id}>
                {user.email} ({user.username})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-gray-300 mb-1 font-medium">Transaction Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none">
            <option value="DAILY_PROFIT">DAILY_PROFIT</option>
            <option value="DEPOSIT">DEPOSIT</option>
            <option value="WITHDRAWAL">WITHDRAWAL</option>
            <option value="REFERRAL_BONUS">REFERRAL_BONUS</option>
            <option value="RANK_BONUS">RANK_BONUS</option>
            <option value="RANK_REWARD">RANK_REWARD</option>
            <option value="BONUS">BONUS</option>
          </select>
        </div>
        {type === 'DAILY_PROFIT' && (
          <div>
            <label className="block text-gray-300 mb-1 font-medium">Investment</label>
            <select value={investmentId} onChange={e => setInvestmentId(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none">
              {investments.length === 0 && <option value="">No active investments</option>}
              {investments.map(inv => (
                <option key={inv.id} value={inv.id}>
                  #{inv.id} — {inv.package?.name || 'Package'}: {inv.amount} USD
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-gray-300 mb-1 font-medium">Amount</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none" />
        </div>
        <div>
          <label className="block text-gray-300 mb-1 font-medium">Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-orange-500 focus:outline-none" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
        {success && <div className="text-green-400 text-center mt-2">{success}</div>}
        {error && <div className="text-red-400 text-center mt-2">{error}</div>}
      </form>
    </>
  );
} 