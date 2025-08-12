import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';

const InvestmentModal = ({ 
  isOpen, 
  onClose, 
  selectedPackage, 
  userData, 
  onInvest, 
  loading,
  showSuccess,
  showError 
}) => {
  const [investAmount, setInvestAmount] = useState('');

  // Инициализация суммы при открытии модального окна
  useEffect(() => {
    if (isOpen && selectedPackage) {
      setInvestAmount(selectedPackage.minAmount || '');
    }
  }, [isOpen, selectedPackage]);

  // Сброс состояния при закрытии
  const resetState = useCallback(() => {
    setInvestAmount('');
  }, []);

  // Обработчик закрытия модального окна
  const handleClose = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    resetState();
    onClose();
  }, [onClose, resetState]);

  // Обработчик изменения суммы инвестиции
  const handleAmountChange = useCallback((e) => {
    e.stopPropagation();
    setInvestAmount(e.target.value);
  }, []);

  // Обработчик инвестиции
  const handleInvest = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const amount = Number(investAmount);
    
    // Валидация суммы
    if (!investAmount || isNaN(amount) || amount <= 0) {
      showError('Please enter a valid investment amount');
      return;
    }

    if (amount < (selectedPackage?.minAmount || 1)) {
      showError(`Minimum investment amount is $${selectedPackage?.minAmount?.toLocaleString() || 1}`);
      return;
    }

    if (amount > (selectedPackage?.maxAmount || 0)) {
      showError(`Maximum investment amount for ${selectedPackage.name} is $${selectedPackage?.maxAmount?.toLocaleString() || 0}`);
      return;
    }

    if (amount > userData.balance) {
      showError('Insufficient balance. Please deposit funds first.');
      return;
    }

    try {
      await onInvest(selectedPackage, investAmount);
      showSuccess(`Investment of $${amount.toLocaleString()} in ${selectedPackage.name} completed!`);
      handleClose();
    } catch (error) {
      showError('Investment failed. Please try again.');
    }
  }, [investAmount, selectedPackage, userData.balance, onInvest, showError, showSuccess, handleClose]);

  // Если модальное окно закрыто или нет выбранного пакета, не рендерим ничего
  if (!isOpen || !selectedPackage) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
      onClick={handleClose}
      style={{ 
        isolation: 'isolate',
        contain: 'layout style paint',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div 
        className="bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          <X size={20} />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">
            Invest in {selectedPackage.name}
          </h3>
          <div className="text-gray-400 text-sm">
            Current Balance: ${userData?.balance?.toLocaleString() || '0'}
          </div>
        </div>

        {/* Package Summary */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Package:</span>
            <span className="text-white">{selectedPackage.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Monthly Return:</span>
            <span className="text-orange-400">{selectedPackage.percent}%</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Duration:</span>
            <span className="text-white">{selectedPackage.duration} days</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Min Investment:</span>
            <span className="text-white">${selectedPackage.minAmount?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Max Investment:</span>
            <span className="text-white">${selectedPackage.maxAmount?.toLocaleString()}</span>
          </div>
        </div>

        {/* Investment Form */}
        <div className="mb-6">
          <label className="block text-orange-400 text-sm font-semibold mb-2">
            Investment Amount (USD)
          </label>
          <input
            type="number"
            min={selectedPackage.minAmount || 1}
            max={Math.min(selectedPackage.maxAmount || userData?.balance || 0, userData?.balance || 0)}
            value={investAmount}
            onChange={handleAmountChange}
            onKeyPress={(e) => e.key === 'Enter' && handleInvest()}
            className="w-full glass-input px-4 py-3 text-white focus:outline-none text-lg"
            placeholder={`Min: $${selectedPackage.minAmount || 1} - Max: $${selectedPackage.maxAmount}`}
            disabled={loading}
            autoFocus
          />
          
          {/* Quick Amount Buttons */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setInvestAmount((selectedPackage.minAmount || 1).toString())}
              className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Min
            </button>
            <button
              type="button"
              onClick={() => {
                const minAmount = selectedPackage.minAmount || 1;
                const maxAmount = Math.min(selectedPackage.maxAmount || 0, userData?.balance || 0);
                const range = maxAmount - minAmount;
                const amount = Math.round(minAmount + (range * 0.25));
                setInvestAmount(amount.toString());
              }}
              className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              25%
            </button>
            <button
              type="button"
              onClick={() => {
                const minAmount = selectedPackage.minAmount || 1;
                const maxAmount = Math.min(selectedPackage.maxAmount || 0, userData?.balance || 0);
                const range = maxAmount - minAmount;
                const amount = Math.round(minAmount + (range * 0.5));
                setInvestAmount(amount.toString());
              }}
              className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setInvestAmount(Math.min(selectedPackage.maxAmount || 0, userData?.balance || 0).toString())}
              className="px-3 py-2 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              disabled={loading}
            >
              Max
            </button>
          </div>
          
          {investAmount && !isNaN(investAmount) && (
            <div className="mt-3 p-3 bg-gray-800 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Daily profit:</span>
                  <span className="text-green-400 font-semibold">
                    ~${((Number(investAmount) * selectedPackage.percent / 100) / 30).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Monthly profit:</span>
                  <span className="text-green-400 font-semibold">
                    ~${((Number(investAmount) * selectedPackage.percent / 100)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total return:</span>
                  <span className="text-orange-400 font-semibold">
                    ${(Number(investAmount) + (Number(investAmount) * selectedPackage.percent / 100)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleInvest}
            className="flex-1 orange-button text-white py-3 rounded-lg font-semibold"
            disabled={loading || !investAmount || isNaN(investAmount)}
          >
            {loading ? 'Processing...' : 'Confirm Investment'}
          </button>
          <button
            onClick={handleClose}
            className="flex-1 glass-button text-white py-3 rounded-lg font-semibold"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentModal;
