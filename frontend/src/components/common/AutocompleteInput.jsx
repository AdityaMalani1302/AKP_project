import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getFieldHistory } from '../../utils/useInputHistory';

/**
 * AutocompleteInput - A text input with autocomplete suggestions from localStorage history
 * 
 * @param {Object} props
 * @param {string} props.formPrefix - Form identifier (e.g., 'labMaster')
 * @param {string} props.fieldName - Field name for history storage
 * @param {string} props.value - Current input value
 * @param {function} props.onChange - Change handler (receives event)
 * @param {string} props.placeholder - Input placeholder
 * @param {string} props.className - CSS class name
 * @param {Object} props.style - Inline styles
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.readOnly - ReadOnly state
 * @param {string} props.type - Input type (default: 'text')
 * @param {string} props.name - Input name attribute
 * @param {Object} props.rest - Other input props
 */
const AutocompleteInput = ({
    formPrefix,
    fieldName,
    value = '',
    onChange,
    placeholder = '',
    className = 'input-field',
    style = {},
    disabled = false,
    readOnly = false,
    type = 'text',
    name,
    ...rest
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Get suggestions when input changes
    useEffect(() => {
        if (disabled || readOnly) {
            setSuggestions([]);
            return;
        }

        const history = getFieldHistory(formPrefix, fieldName);
        
        if (!value || value.trim() === '') {
            // Show all history when empty and focused
            setSuggestions(history);
        } else {
            // Filter history based on current input
            const lowerValue = value.toLowerCase().trim();
            const filtered = history.filter(item => 
                item.toLowerCase().includes(lowerValue) && 
                item.toLowerCase() !== lowerValue
            );
            setSuggestions(filtered);
        }
    }, [value, formPrefix, fieldName, disabled, readOnly]);

    // Handle click outside to close suggestions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle selecting a suggestion
    const handleSelectSuggestion = useCallback((suggestion) => {
        // Create a synthetic event to match the onChange signature
        const syntheticEvent = {
            target: {
                name: name || fieldName,
                value: suggestion
            }
        };
        onChange(syntheticEvent);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    }, [onChange, name, fieldName]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    e.preventDefault();
                    handleSelectSuggestion(suggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setShowSuggestions(false);
                setHighlightedIndex(-1);
                break;
            default:
                break;
        }
    }, [showSuggestions, suggestions, highlightedIndex, handleSelectSuggestion]);

    const handleFocus = () => {
        if (!disabled && !readOnly && suggestions.length > 0) {
            setShowSuggestions(true);
        }
    };

    const handleInputChange = (e) => {
        onChange(e);
        if (!disabled && !readOnly) {
            setShowSuggestions(true);
        }
        setHighlightedIndex(-1);
    };

    // Don't show dropdown for number, date, datetime, etc types
    const showDropdown = showSuggestions && 
        suggestions.length > 0 && 
        !disabled && 
        !readOnly &&
        type === 'text';

    return (
        <div 
            ref={wrapperRef} 
            style={{ position: 'relative', width: '100%' }}
        >
            <input
                ref={inputRef}
                type={type}
                name={name || fieldName}
                value={value}
                onChange={handleInputChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className}
                style={style}
                disabled={disabled}
                readOnly={readOnly}
                autoComplete="off"
                {...rest}
            />
            
            {showDropdown && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    zIndex: 1000,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '2px'
                }}>
                    <div style={{
                        padding: '4px 8px',
                        fontSize: '0.7rem',
                        color: '#9CA3AF',
                        borderBottom: '1px solid #E5E7EB',
                        fontWeight: '500'
                    }}>
                        Recent entries
                    </div>
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            onClick={() => handleSelectSuggestion(suggestion)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: '#374151',
                                backgroundColor: highlightedIndex === index ? '#F3F4F6' : 'white',
                                borderBottom: index < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                                transition: 'background-color 0.1s'
                            }}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            onMouseLeave={() => setHighlightedIndex(-1)}
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AutocompleteInput;
