import React, { useState, useEffect } from 'react';

const Toast = ({ message, type = 'info', duration = 4000, onClose }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const getToastStyle = () => {
    switch (type) {
      case 'success':
        return 'bg-green-600 border-green-400';
      case 'error':
        return 'bg-red-600 border-red-400';
      case 'warning':
        return 'bg-orange-600 border-orange-400';
      case 'info':
      default:
        return 'bg-blue-600 border-blue-400';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
      default:
        return 'Info';
    }
  };

  return (
    <div
      className={`
        ${getToastStyle()} 
        text-white px-6 py-4 rounded-lg shadow-xl 
        border-l-4 transform transition-all duration-300 
        hover:scale-105 animate-fade-in
      `}
    >
      <div className="flex items-center">
        <span className="text-xl mr-3">{getIcon()}</span>
        <div>
          <div className="font-semibold">{getTitle()}</div>
          <div className="text-sm opacity-90">{message}</div>
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-4 text-white hover:text-gray-200 font-bold text-lg"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default Toast;