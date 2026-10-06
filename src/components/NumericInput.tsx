import React, { useState, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function NumericInput({ value, onChange, className, placeholder, disabled }: NumericInputProps) {
  const [displayValue, setDisplayValue] = useState(() => {
    const normalizedValue = value || 0;
    return normalizedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });

  // Update displayValue when the prop value changes externally
  useEffect(() => {
    // Treat 0, undefined, null as 0.00
    const normalizedValue = value || 0;
    
    // Format with commas and 2 decimals
    const cleanDisplay = displayValue.replace(/,/g, '');
    const parsedDisplay = parseFloat(cleanDisplay);
    
    // If the display value is fundamentally different or empty, update it
    if (displayValue === '' || isNaN(parsedDisplay) || Math.abs(parsedDisplay - normalizedValue) > 0.001) {
      // If the user is currently typing something like "0.", don't force reset if it's fundamentally 0
      if (normalizedValue === 0 && (displayValue === '0' || displayValue === '0.' || displayValue.startsWith('0.0'))) {
        return;
      }
      setDisplayValue(normalizedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const cleanValue = inputVal.replace(/,/g, '');
    
    // Allow empty, sign, numbers, and decimal point
    if (cleanValue === '' || cleanValue === '-' || /^-?\d*\.?\d*$/.test(cleanValue)) {
      if (cleanValue === '' || cleanValue === '-') {
        setDisplayValue(inputVal);
        onChange(0);
      } else {
        const numValue = parseFloat(cleanValue);
        if (!isNaN(numValue)) {
          // Update parent
          onChange(numValue);
          
          // Format the display value while typing (add commas if needed, but don't force decimals yet)
          if (inputVal.endsWith('.') || (inputVal.includes('.') && inputVal.endsWith('0'))) {
            const parts = inputVal.split('.');
            parts[0] = parts[0].replace(/,/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            setDisplayValue(parts.join('.'));
          } else {
            setDisplayValue(numValue.toLocaleString());
          }
        }
      }
    }
  };

  const handleBlur = () => {
    const normalizedValue = value || 0;
    setDisplayValue(normalizedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // If the value is 0, clear it so the user doesn't have to delete it
    if (value === 0 || displayValue === '0.00') {
      setDisplayValue('');
    } else {
      // Select all for easier replacement
      e.target.select();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={className}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
