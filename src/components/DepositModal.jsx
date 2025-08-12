import React, { useState, useCallback } from 'react';
import { Copy, CheckCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const DepositModal = ({ isOpen, onClose, token, showSuccess, showError }) => {
  const [selectedNetwork, setSelectedNetwork] = useState('BSC');
  const [depositAddress, setDepositAddress] = useState('');
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);

  // Сброс состояния при закрытии
  const resetState = useCallback(() => {
    setDepositAddress('');
    setAddressCopied(false);
    setIsGeneratingAddress(false);
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

  // Генерация адреса депозита
  const generateDepositAddress = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsGeneratingAddress(true);
    try {
      const res = await fetch(`${API}/api/deposit/generate-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ network: selectedNetwork })
      });
      const data = await res.json();
      if (res.ok) {
        setDepositAddress(data.depositAddress);
        showSuccess(`Deposit address generated for ${selectedNetwork} network`);
      } else {
        showError(data.error || 'Failed to generate deposit address');
      }
    } catch (error) {
      showError('Network error. Please try again.');
    } finally {
      setIsGeneratingAddress(false);
    }
  }, [selectedNetwork, token, showSuccess, showError]);

  // Копирование адреса
  const copyAddress = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      await navigator.clipboard.writeText(depositAddress);
      setAddressCopied(true);
      showSuccess('Address copied to clipboard!');
      setTimeout(() => setAddressCopied(false), 2000);
    } catch (err) {
      showError('Failed to copy address');
    }
  }, [depositAddress, showSuccess, showError]);

  // Обработчик изменения сети
  const handleNetworkChange = useCallback((e) => {
    e.stopPropagation();
    setSelectedNetwork(e.target.value);
    setDepositAddress(''); // Сбрасываем адрес при смене сети
  }, []);

  // Если модальное окно закрыто, не рендерим ничего
  if (!isOpen) return null;

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
        className="glass-modal p-6 w-full max-w-md rounded-2xl relative"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          isolation: 'isolate',
          position: 'relative',
          zIndex: 1
        }}
      >
        <h3 className="text-xl font-semibold text-white mb-4">Deposit Funds</h3>
        
        <div className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <p className="text-blue-400 text-sm">Generate a unique deposit address for secure cryptocurrency transfers</p>
          </div>
          
          <div>
            <label className="block text-[rgb(249,115,22)] text-sm mb-2">Select Network</label>
            <select 
              value={selectedNetwork} 
              onChange={handleNetworkChange}
              className="w-full glass-input px-4 py-3 text-white focus:outline-none"
              disabled={isGeneratingAddress}
            >
              <option value="BSC">BSC (Binance Smart Chain)</option>
              <option value="TRX">TRX (Tron Network)</option>
            </select>
          </div>

          {!depositAddress ? (
            <button 
              onClick={generateDepositAddress}
              disabled={isGeneratingAddress}
              className="w-full orange-button text-white py-3 rounded-lg disabled:opacity-50 transition-opacity"
            >
              {isGeneratingAddress ? 'Generating Address...' : 'Generate Deposit Address'}
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-[rgb(249,115,22)] text-sm mb-2">Your Deposit Address ({selectedNetwork})</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={depositAddress}
                    readOnly
                    className="w-full glass-input px-4 py-3 pr-12 text-white focus:outline-none cursor-pointer"
                    onClick={copyAddress}
                  />
                  <button 
                    onClick={copyAddress}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-orange-400 hover:text-orange-300 transition-colors"
                    title="Copy address"
                  >
                    {addressCopied ? <CheckCircle size={20} /> : <Copy size={20} />}
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Click to copy • Send {selectedNetwork} tokens to this address
                </div>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Only send {selectedNetwork} network tokens to this address. 
                  Sending tokens from other networks may result in permanent loss.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button 
              onClick={handleClose}
              className="flex-1 glass-button text-white py-3 rounded-lg transition-opacity"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DepositModal;
