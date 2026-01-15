import React, { useState, useRef, useEffect } from 'react';
import { Command } from 'cmdk';
import './Combobox.css';

const Combobox = ({ options = [], value, onChange, placeholder, label, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);
    
    // Initialize inputValue - find matching option label or fallback to value
    // Use loose equality (==) to handle number/string type mismatches
    const getDisplayValue = React.useCallback((val) => {
        if (val == null || val === '') return '';
        // eslint-disable-next-line eqeqeq
        const matchingOption = options.find(opt => opt.value == val);
        return matchingOption ? matchingOption.label : '';
    }, [options]);
    
    const [inputValue, setInputValue] = useState(() => getDisplayValue(value));

    // Sync inputValue with value prop when value or options change externally
    useEffect(() => {
        const displayVal = getDisplayValue(value);
        // Only update if we found a valid display value or if value is cleared
        if (displayVal || value == null || value === '') {
            setInputValue(displayVal);
        }
    }, [value, options, getDisplayValue]);

    // Handle clicking outside to close and accept value
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                if (open) {
                    setOpen(false);
                    // Accept the typed value when clicking outside
                    if (inputValue !== value) {
                        onChange(inputValue);
                    }
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, inputValue, value, onChange]);

    const handleInputChange = (newValue) => {
        setInputValue(newValue);
        if (!open) setOpen(true);
    };

    const handleSelectOption = (optionValue) => {
        // Find the option to display its label (use loose equality for type safety)
        // eslint-disable-next-line eqeqeq
        const selectedOption = options.find(opt => opt.value == optionValue);
        setInputValue(selectedOption ? selectedOption.label : String(optionValue));
        onChange(optionValue);
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onChange(inputValue);
            setOpen(false);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    // Deduplicate options based on value to prevent key errors
    const uniqueOptions = React.useMemo(() => {
        const seen = new Set();
        return options.filter(option => {
            const val = option.value;
            if (seen.has(val)) {
                return false;
            }
            seen.add(val);
            return true;
        });
    }, [options]);

    // eslint-disable-next-line eqeqeq
    const selectedOption = uniqueOptions.find(opt => opt.value == value);
    const selectedLabel = selectedOption ? selectedOption.label : '';
    
    const searchValue = inputValue != null ? String(inputValue).toLowerCase() : '';
    
    // If the input value matches the currently selected option's label, show all options.
    // Otherwise, filter based on the search value.
    const showAll = selectedLabel && inputValue === selectedLabel;

    const filteredOptions = uniqueOptions.filter(opt => 
        showAll || (opt.label && opt.label.toLowerCase().includes(searchValue))
    );

    return (
        <div className="combobox-wrapper" ref={wrapperRef}>
            {label && <label className="combobox-label">{label}</label>}
            <Command className="combobox-root" shouldFilter={false}>
                <div className="combobox-input-wrapper">
                    <Command.Input
                        ref={inputRef}
                        value={inputValue}
                        onValueChange={handleInputChange}
                        onFocus={(e) => {
                            setOpen(true);
                            e.target.select();
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className="combobox-text-input"
                        disabled={disabled}
                    />
                    <span 
                        className="combobox-arrow" 
                        onClick={() => {
                            if (!disabled) {
                                setOpen(!open);
                                if (!open && inputRef.current) {
                                    inputRef.current.focus();
                                }
                            }
                        }}
                    >
                        ▼
                    </span>
                </div>

                {open && filteredOptions.length > 0 && (
                    <div className="combobox-content">
                        <Command.List className="combobox-list">
                            {filteredOptions.map((option) => (
                                <Command.Item
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => handleSelectOption(option.value)}
                                    // eslint-disable-next-line eqeqeq
                                    className={`combobox-item ${value == option.value ? 'selected' : ''}`}
                                >
                                    {option.label}
                                    {/* eslint-disable-next-line eqeqeq */}
                                    {value == option.value && <span className="check">✓</span>}
                                </Command.Item>
                            ))}
                        </Command.List>
                    </div>
                )}
            </Command>
        </div>
    );
};

export default Combobox;

