import React, { useState, useRef } from 'react';

/**
 * Enhanced Number Input with +/- buttons
 */
const NumberInput = ({
    value,
    onChange,
    name,
    id,
    min,
    max,
    step = 1,
    placeholder = '0',
    disabled = false,
    showButtons = true,
    formatNumber = false, // Show thousands separator
    className = 'input-field',
    style = {},
    ...props
}) => {
    const inputRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    const numValue = parseFloat(value) || 0;

    const handleIncrement = () => {
        if (disabled) return;
        let newValue = numValue + step;
        if (max !== undefined && newValue > max) newValue = max;
        triggerChange(newValue);
    };

    const handleDecrement = () => {
        if (disabled) return;
        let newValue = numValue - step;
        if (min !== undefined && newValue < min) newValue = min;
        triggerChange(newValue);
    };

    const triggerChange = (newValue) => {
        onChange({
            target: {
                name: name || id,
                value: newValue.toString(),
                type: 'number'
            }
        });
    };

    const handleInputChange = (e) => {
        const rawValue = e.target.value.replace(/,/g, '');
        if (rawValue === '' || rawValue === '-') {
            onChange({
                target: {
                    name: name || id,
                    value: rawValue,
                    type: 'number'
                }
            });
            return;
        }
        
        const numericValue = parseFloat(rawValue);
        if (!isNaN(numericValue)) {
            triggerChange(numericValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            handleIncrement();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            handleDecrement();
        }
    };

    const formatDisplayValue = () => {
        if (value === '' || value === undefined || value === null) return '';
        if (!formatNumber) return value.toString();
        
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return num.toLocaleString('en-IN');
    };

    const buttonStyle = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '38px',
        minWidth: '38px',
        height: '38px',
        border: 'none',
        background: '#F3F4F6',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background-color 0.15s',
        color: disabled ? '#9CA3AF' : '#374151',
        fontSize: '1.1rem',
        fontWeight: '600',
        userSelect: 'none',
        flexShrink: 0
    };

    const containerStyle = {
        display: 'flex',
        alignItems: 'center',
        borderRadius: '0.375rem',
        border: `1px solid ${isFocused ? '#2563EB' : '#D1D5DB'}`,
        boxShadow: isFocused ? '0 0 0 2px rgba(37, 99, 235, 0.1)' : 'none',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        backgroundColor: disabled ? '#F9FAFB' : 'white',
        height: '40px',
        ...style
    };

    const inputStyle = {
        flex: 1,
        border: 'none',
        outline: 'none',
        padding: '0.5rem 0.75rem',
        fontSize: '0.875rem',
        textAlign: showButtons ? 'center' : 'left',
        backgroundColor: 'transparent',
        minWidth: 0,
        height: '100%'
    };

    if (!showButtons) {
        return (
            <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                id={id}
                name={name}
                value={formatDisplayValue()}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                className={className}
                style={style}
                {...props}
            />
        );
    }

    return (
        <div style={containerStyle}>
            <button
                type="button"
                onClick={handleDecrement}
                disabled={disabled || (min !== undefined && numValue <= min)}
                style={{
                    ...buttonStyle,
                    borderRight: '1px solid #E5E7EB',
                    borderRadius: '0.375rem 0 0 0.375rem'
                }}
                onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = '#E5E7EB')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#F3F4F6')}
                tabIndex={-1}
            >
                −
            </button>
            
            <input
                ref={inputRef}
                type="text"
                inputMode="decimal"
                id={id}
                name={name}
                value={formatDisplayValue()}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                disabled={disabled}
                style={inputStyle}
                {...props}
            />
            
            <button
                type="button"
                onClick={handleIncrement}
                disabled={disabled || (max !== undefined && numValue >= max)}
                style={{
                    ...buttonStyle,
                    borderLeft: '1px solid #E5E7EB',
                    borderRadius: '0 0.375rem 0.375rem 0'
                }}
                onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = '#E5E7EB')}
                onMouseLeave={(e) => (e.target.style.backgroundColor = '#F3F4F6')}
                tabIndex={-1}
            >
                +
            </button>
        </div>
    );
};

export default NumberInput;
