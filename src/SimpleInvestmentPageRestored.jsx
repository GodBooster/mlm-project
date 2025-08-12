import React, { useState } from 'react';

const SimpleInvestmentPage = ({ userData, packages, onInvest, loading }) => {
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSelectPackage = (pkg) => {
    // Теперь onInvest открывает изолированное модальное окно в главном дашборде
    onInvest(pkg);
  };

  const showError = (message) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 4000);
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
