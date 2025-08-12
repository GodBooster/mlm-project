import React from 'react';

const SimpleInvestmentPage = ({ userData, packages, onInvest, loading }) => {
  const handleSelectPackage = (pkg) => {
    onInvest(pkg); // Открывает изолированное модальное окно в главном дашборде
  };

  if (!packages || packages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">No packages available</div>
          <div className="text-gray-500 text-sm">Please check back later</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Investment Packages</h2>
        <p className="text-gray-400">Choose from our profitable investment plans</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg, index) => (
          <div key={pkg.id || index} className="glass-card p-6 hover:glass-card-hover transition-all duration-300">
            {/* Package Header */}
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-white mb-2">{pkg.name}</h3>
              <div className="text-orange-400 text-2xl font-bold">
                {pkg.dailyReturn || pkg.percent}%
              </div>
              <div className="text-gray-400 text-sm">
                {pkg.dailyReturn ? 'Daily Return' : 'Monthly Return'}
              </div>
            </div>

            {/* Package Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Duration:</span>
                <span className="text-white">{pkg.duration} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Min Amount:</span>
                <span className="text-white">${pkg.minAmount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Max Amount:</span>
                <span className="text-white">${pkg.maxAmount?.toLocaleString()}</span>
              </div>
              {pkg.totalReturn && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Total Return:</span>
                  <span className="text-green-400 font-semibold">{pkg.totalReturn}%</span>
                </div>
              )}
            </div>

            {/* Investment Button */}
            <button
              onClick={() => handleSelectPackage(pkg)}
              disabled={loading || !userData?.balance || userData.balance < pkg.minAmount}
              className="w-full orange-button text-white py-3 rounded-lg font-semibold disabled:opacity-50 transition-all duration-300"
            >
              {loading ? (
                'Loading...'
              ) : !userData?.balance || userData.balance < pkg.minAmount ? (
                'Insufficient Balance'
              ) : (
                'Invest Now'
              )}
            </button>

            {/* Package Benefits */}
            {pkg.features && (
              <div className="mt-4 space-y-1">
                {pkg.features.map((feature, idx) => (
                  <div key={idx} className="text-xs text-gray-400 flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Balance Display */}
      <div className="text-center p-4 glass-card">
        <div className="text-gray-400 text-sm">Your Current Balance</div>
        <div className="text-white text-2xl font-bold">
          ${userData?.balance?.toLocaleString() || '0.00'}
        </div>
      </div>
    </div>
  );
};

export default SimpleInvestmentPage;
