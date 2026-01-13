import React, { useState, useRef, useEffect } from 'react';
import { Command } from 'cmdk';
import './Combobox.css';

const Combobox = ({ options = [], value, onChange, placeholder, label, disabled = false }) => {
    const [open, setOpen] = useState(false);
    // Initialize inputValue - find matching option label or fallback to value
    const getDisplayValue = (val) => {
        if (val == null || val === '') return '';
        const matchingOption = options.find(opt => opt.value === val);
        return matchingOption ? matchingOption.label : String(val);
    };
    const [inputValue, setInputValue] = useState(getDisplayValue(value));
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);

    // Sync inputValue with value prop when value changes externally
    useEffect(() => {
        const displayVal = getDisplayValue(value);
        setInputValue(displayVal);
    }, [value, options]);

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
        // Find the option to display its label
        const selectedOption = options.find(opt => opt.value === optionValue);
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

    const selectedOption = uniqueOptions.find(opt => opt.value === value);
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
                                    className={`combobox-item ${value === option.value ? 'selected' : ''}`}
                                >
                                    {option.label}
                                    {value === option.value && <span className="check">✓</span>}
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

