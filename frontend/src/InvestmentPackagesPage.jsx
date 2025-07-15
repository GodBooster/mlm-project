import React from 'react';

const Card = ({ children, className = "" }) => (
  <div className={`glass-card glass-card-hover p-6 animate-fade-in-up ${className}`}>{children}</div>
);

export default function InvestmentPackagesPage({ userData, packages, onInvest, loading, selectedPackage, setSelectedPackage, purchaseAmount, setPurchaseAmount, bonus, setBonus }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg, i) => (
        <Card key={i} className="relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-semibold text-white mb-2">{pkg.name}</h3>
            <div className="text-gray-400 text-sm mb-1">Starting at <span className="text-white font-bold">${pkg.minAmount?.toLocaleString()}</span></div>
            <div className="text-orange-400 text-sm mb-2">Up to <span className="font-bold">{pkg.percent}%</span> monthly returns</div>
            <div className="text-gray-500 text-xs mb-4">Duration: {pkg.duration} days</div>
            <button onClick={() => setSelectedPackage(pkg)} className="w-full orange-button text-white py-3 rounded-lg font-semibold">Select Package</button>
          </div>
        </Card>
      ))}
      {/* Invest modal */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-modal p-6 w-full max-w-md rounded-2xl">
            <h3 className="text-xl font-semibold text-white mb-4">Invest in {selectedPackage.name}</h3>
            <form onSubmit={e => {e.preventDefault(); onInvest(selectedPackage);}} className="space-y-4">
              <input type="number" min={selectedPackage.minAmount || 1} value={purchaseAmount} onChange={e => setPurchaseAmount(e.target.value)} className="w-full glass-input px-4 py-3 text-white focus:outline-none" placeholder={`Min: $${selectedPackage.minAmount || 1}`} required />
              <button type="submit" className="w-full orange-button text-white py-3 rounded-lg" disabled={loading}>Invest</button>
              <button type="button" onClick={() => {setSelectedPackage(null); setPurchaseAmount(''); setBonus(null);}} className="w-full glass-button text-white py-2 rounded-lg">Cancel</button>
              {bonus && <div className="text-green-400 text-sm mt-2">Bonus for period: ${bonus}</div>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 