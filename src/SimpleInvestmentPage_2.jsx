import React, { useState } from 'react';

const SimpleInvestmentPage = ({ userData, packages, onInvest, loading }) => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [investAmount, setInvestAmount] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setInvestAmount(pkg.minAmount || '');
    setShowModal(true);
  };

  const handleInvest = async () => {
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

    // Убираем системный confirm - слишком много попапов

    try {
      await onInvest(selectedPackage, investAmount);
      
      // Показываем быстрое уведомление об успехе
      setSuccessMessage(`Investment of $${amount.toLocaleString()} in ${selectedPackage.name} completed!`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setShowModal(false);
      setSelectedPackage(null);
      setInvestAmount('');
    } catch (error) {
      console.error('Investment failed:', error);
      // Показываем конкретную ошибку от сервера или общую
      showError(error.message || 'Investment failed. Please try again.');
    }
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPackage(null);
    setInvestAmount('');
  };

  if (!packages || packages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-xl">Loading investment packages...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-left mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Investment Packages</h1>
        <p className="text-gray-300">Choose your investment package and start earning</p>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="glass-card glass-card-hover p-5 rounded-xl relative overflow-hidden min-h-[280px]">
            {/* Background Image - Right Half */}
            {pkg.name && (
              <div className="absolute top-0 right-0 w-1/2 h-full opacity-25 flex items-center justify-center">
                <img 
                  src={`/${pkg.name}.png`} 
                  alt={`${pkg.name} package`} 
                  className="w-full h-full object-contain"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}

            {/* Content with Text Shadow for Better Readability */}
            <div className="relative z-10 h-full flex flex-col">
              {/* Package Header */}
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">{pkg.name}</h3>
              </div>

              {/* Package Details */}
              <div className="space-y-3 flex-1">
                <div className="flex justify-between items-center">
                  <span className="text-gray-200 text-sm drop-shadow">Investment Range:</span>
                  <span className="text-white font-bold drop-shadow-lg">${pkg.minAmount?.toLocaleString()} - ${pkg.maxAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-200 text-sm drop-shadow">Monthly Return:</span>
                  <span className="text-orange-400 font-bold drop-shadow-lg">{pkg.percent}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-200 text-sm drop-shadow">Duration:</span>
                  <span className="text-white font-bold drop-shadow-lg">{pkg.duration} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-200 text-sm drop-shadow">Daily Profit:</span>
                  <span className="text-green-400 font-bold drop-shadow-lg">
                    {((pkg.percent || 0) / 30).toFixed(3)}%
                  </span>
                </div>
              </div>

              {/* Large Invest Button - Always Visible */}
              <div className="mt-6">
                <button 
                  onClick={() => handleSelectPackage(pkg)}
                  className="w-full orange-button text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-200 shadow-lg drop-shadow-xl"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'INVEST NOW'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Investment Modal */}
      {showModal && selectedPackage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-md">
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

            {/* Investment Amount Input */}
            <div className="mb-6">
              <label className="block text-orange-400 text-sm font-semibold mb-2">
                Investment Amount (USD)
              </label>
              <input
                type="number"
                min={selectedPackage.minAmount || 1}
                max={Math.min(selectedPackage.maxAmount || userData?.balance || 0, userData?.balance || 0)}
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
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
                onClick={closeModal}
                className="flex-1 glass-button text-white py-3 rounded-lg font-semibold"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-3">
        {/* Success Toast */}
        {successMessage && (
          <div className="bg-green-600 text-white px-6 py-4 rounded-lg shadow-xl animate-fade-in border-l-4 border-green-400 transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center">
              <span className="text-xl mr-3">✅</span>
              <div>
                <div className="font-semibold">Success!</div>
                <div className="text-sm opacity-90">{successMessage}</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {errorMessage && (
          <div className="bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl animate-fade-in border-l-4 border-red-400 transform transition-all duration-300 hover:scale-105">
            <div className="flex items-center">
              <span className="text-xl mr-3">❌</span>
              <div>
                <div className="font-semibold">Error</div>
                <div className="text-sm opacity-90">{errorMessage}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleInvestmentPage;