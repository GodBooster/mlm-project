import React, { useState, useEffect, useRef } from 'react';

export default function WithdrawModal({
  isOpen,
  onClose,
  onWithdraw,
  balance,
  savedWallet,
  minAmount = 50,
  maxWalletLength = 50,
}) {
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState(savedWallet || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const amountInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setWallet(savedWallet || '');
      setError('');
      setLoading(false);
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }
  }, [isOpen, savedWallet]);

  const validate = () => {
    if (!amount || isNaN(amount) || Number(amount) < minAmount) {
      return `Enter amount ≥ ${minAmount}`;
    }
    if (Number(amount) > balance) {
      return 'Not enough balance';
    }
    if (!wallet || wallet.trim() === '') {
      return 'Enter wallet address';
    }
    if (wallet.length > maxWalletLength) {
      return `Wallet max ${maxWalletLength} chars`;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onWithdraw(Number(amount), wallet.trim());
      onClose();
    } catch (e) {
      setError(e.message || 'Withdraw failed');
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-2xl shadow-lg p-6 w-full max-w-md relative"
        onClick={e => e.stopPropagation()}
        tabIndex={-1}
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <h3 className="text-2xl font-bold text-white mb-4 text-center">Withdraw Funds</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-orange-400 text-sm mb-1">Your Balance</label>
            <div className="text-white font-bold mb-2">${balance?.toFixed(2)}</div>
          </div>
          <div>
            <label className="block text-orange-400 text-sm mb-1">Amount</label>
            <input
              ref={amountInputRef}
              type="number"
              min={minAmount}
              max={balance}
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full glass-input px-4 py-3 text-white focus:outline-none"
              placeholder={`Enter amount (min $${minAmount})`}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-orange-400 text-sm mb-1">Wallet Address</label>
            <input
              type="text"
              value={wallet}
              onChange={e => setWallet(e.target.value)}
              maxLength={maxWalletLength}
              className="w-full glass-input px-4 py-3 text-white focus:outline-none"
              placeholder="Enter your crypto wallet address"
              disabled={loading}
            />
            {savedWallet && (
              <button
                type="button"
                className="text-xs text-blue-400 underline mt-1"
                onClick={() => setWallet(savedWallet)}
                tabIndex={-1}
              >
                Use saved wallet
              </button>
            )}
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full orange-button text-white py-3 rounded-lg mt-2 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Withdraw'}
          </button>
        </form>
      </div>
    </div>
  );
} 