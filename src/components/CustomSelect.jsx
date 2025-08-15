import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  disabled = false, 
  placeholder = "Select an option",
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Обработчик выбора опции
  const handleOptionClick = (optionValue) => {
    if (!disabled) {
      onChange({ target: { value: optionValue } });
      setIsOpen(false);
    }
  };

  // Обработчик клика по селектору
  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  // Найти выбранную опцию
  const selectedOption = options.find(option => option.value === value);

  return (
    <div ref={selectRef} className={`relative ${className}`}>
      {/* Основной элемент селектора */}
      <div
        onClick={handleToggle}
        className={`
          w-full glass-input px-4 py-3 text-white cursor-pointer
          flex items-center justify-between
          transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-orange-400/40'}
          ${isOpen ? 'border-orange-400/60 shadow-orange-glow' : ''}
        `}
        style={{
          background: isOpen 
            ? 'linear-gradient(180deg, rgba(249, 115, 22, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%)'
            : undefined
        }}
      >
        <span className="flex-1 text-left">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`
            text-orange-400 transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `} 
        />
      </div>

      {/* Dropdown список */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[100] mt-1 max-h-60 overflow-auto">
          <div 
            className="
              glass-modal border border-orange-400/20 rounded-lg 
              shadow-lg backdrop-blur-md py-2
            "
            style={{
              background: 'linear-gradient(180deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)'
            }}
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => handleOptionClick(option.value)}
                className={`
                  px-4 py-3 cursor-pointer transition-all duration-150
                  flex items-center justify-between
                  ${value === option.value 
                    ? 'bg-orange-500/20 text-orange-400 font-medium' 
                    : 'text-white hover:bg-orange-500/10 hover:text-orange-300'
                  }
                `}
                style={{
                  background: value === option.value 
                    ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)'
                    : undefined
                }}
              >
                <span>{option.label}</span>
                {value === option.value && (
                  <Check size={16} className="text-orange-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
