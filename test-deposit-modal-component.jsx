import React, { useState } from 'react';

// Простой тест компонента DepositModal
const TestDepositModal = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState('BSC');

  const showSuccess = (message) => {
    console.log('✅ Success:', message);
    alert('✅ ' + message);
  };

  const showError = (message) => {
    console.log('❌ Error:', message);
    alert('❌ ' + message);
  };

  const handleNetworkChange = (e) => {
    e.stopPropagation();
    setSelectedNetwork(e.target.value);
    console.log('🔄 Network changed to:', e.target.value);
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#0c0c0c', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h1 style={{ color: '#ffffff', textAlign: 'center', marginBottom: '30px' }}>
          🧪 Deposit Modal Component Test
        </h1>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)',
            border: '1px solid rgba(249, 115, 22, 0.4)',
            color: 'rgb(249, 115, 22)',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'block',
            margin: '0 auto 30px'
          }}
        >
          🚀 Open Deposit Modal
        </button>

        {/* Inline test of the selector styling */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
          backdropFilter: 'blur(25px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '30px',
          marginBottom: '20px'
        }}>
          <h2 style={{ color: 'rgb(249, 115, 22)', marginBottom: '20px' }}>
            🎨 Inline Selector Test
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: 'rgb(249, 115, 22)', 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '8px' 
            }}>
              Select Network
            </label>
            <div style={{ position: 'relative' }}>
              <select 
                value={selectedNetwork} 
                onChange={handleNetworkChange}
                className="w-full glass-input px-4 py-3 text-white focus:outline-none appearance-none cursor-pointer"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: '40px',
                  color: '#ffffff',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgb(249,115,22)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.background = 'linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%)';
                  e.target.style.borderColor = 'rgba(249, 115, 22, 0.4)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.background = 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)';
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="BSC" style={{
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  color: '#ffffff'
                }}>BSC (Binance Smart Chain)</option>
                <option value="TRX" style={{
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  color: '#ffffff'
                }}>TRX (Tron Network)</option>
                <option value="ETH" style={{
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  color: '#ffffff'
                }}>ETH (Ethereum Network)</option>
                <option value="POLYGON" style={{
                  backgroundColor: 'rgba(30, 30, 30, 0.95)',
                  color: '#ffffff'
                }}>POLYGON (Polygon Network)</option>
              </select>
            </div>
            <div style={{ color: '#999999', fontSize: '12px', marginTop: '8px' }}>
              ✅ Choose the blockchain network for your deposit
            </div>
          </div>

          <div style={{ 
            background: 'rgba(249, 115, 22, 0.1)', 
            border: '1px solid rgba(249, 115, 22, 0.2)',
            borderRadius: '8px',
            padding: '15px'
          }}>
            <h3 style={{ color: 'rgb(249, 115, 22)', margin: '0 0 10px 0', fontSize: '16px' }}>
              🎯 Test Results:
            </h3>
            <ul style={{ color: '#ffffff', fontSize: '14px', margin: 0, paddingLeft: '20px' }}>
              <li>Selected Network: <strong style={{ color: 'rgb(249, 115, 22)' }}>{selectedNetwork}</strong></li>
              <li>Focus border should be orange</li>
              <li>Dropdown arrow should be orange</li>
              <li>Options should have dark background</li>
              <li>Selected option should highlight in orange</li>
            </ul>
          </div>
        </div>

        {/* Test instructions */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <h3 style={{ color: 'rgb(59, 130, 246)', marginBottom: '15px' }}>
            📋 Test Instructions:
          </h3>
          <ol style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }}>
            <li>Click on the selector above to test focus state</li>
            <li>Check that border becomes orange when focused</li>
            <li>Verify dropdown arrow is orange (not blue)</li>
            <li>Test option selection - should highlight in orange</li>
            <li>Try in different browsers (Chrome, Firefox, Safari, Edge)</li>
            <li>Test in both light and dark browser themes</li>
            <li>Open the full Deposit Modal using the button above</li>
          </ol>
        </div>
      </div>

      {/* Mock modal for testing */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
              backdropFilter: 'blur(25px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
              padding: '30px',
              width: '100%',
              maxWidth: '400px',
              margin: '20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: '#ffffff', marginBottom: '20px' }}>Deposit Funds</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                color: 'rgb(249, 115, 22)', 
                fontSize: '14px', 
                fontWeight: '500',
                marginBottom: '8px' 
              }}>
                Select Network
              </label>
              <select 
                value={selectedNetwork} 
                onChange={handleNetworkChange}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  paddingRight: '40px',
                  color: '#ffffff',
                  background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0) 100%)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: 'pointer',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgb(249,115,22)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px'
                }}
              >
                <option value="BSC">BSC (Binance Smart Chain)</option>
                <option value="TRX">TRX (Tron Network)</option>
              </select>
            </div>
            
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(249, 115, 22, 0.2)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                color: 'rgb(249, 115, 22)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestDepositModal;
