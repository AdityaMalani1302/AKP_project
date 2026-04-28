import React, { useState, useRef, useEffect } from 'react';
import { Command } from 'cmdk';
import './Combobox.css';

const Combobox = ({ options = [], value, onChange, placeholder, label, disabled = false, 'aria-required': ariaRequired, 'aria-invalid': ariaInvalid, 'aria-describedby': ariaDescribedBy }) => {
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);
    const wrapperRef = useRef(null);

    // Initialize inputValue - find matching option label or fallback to value
    // Use loose equality (==) to handle number/string type mismatches
    const getDisplayValue = React.useCallback((val) => {
        if (val == null || val === '') return '';
        const matchingOption = options.find(opt => opt.value == val || (typeof opt.value === 'string' && typeof val === 'string' && opt.value.trim() === val.trim()));
        return matchingOption ? matchingOption.label : String(val);
    }, [options]);

    const [inputValue, setInputValue] = useState(() => getDisplayValue(value));
    const [prevValue, setPrevValue] = useState(value);
    const [prevOptions, setPrevOptions] = useState(options);

    if (value !== prevValue || options !== prevOptions) {
        setPrevValue(value);
        setPrevOptions(options);
        const displayVal = getDisplayValue(value);
        if (displayVal || value == null || value === '') {
            setInputValue(displayVal);
        }
        if (disabled || options.length === 0) {
            setOpen(false);
        }
    }

    // Handle clicking outside to close and restore display value
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                if (open) {
                    setOpen(false);
                    // Restore inputValue to the display value of the current selection
                    // This prevents clearing the value when clicking outside without selecting
                    const displayVal = getDisplayValue(value);
                    setInputValue(displayVal);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, value, getDisplayValue]);

    const handleInputChange = (newValue) => {
        setInputValue(newValue);
        if (!open) setOpen(true);
    };

    const handleSelectOption = (optionValue) => {
        const selectedOption = options.find(opt => opt.value == optionValue);
        setInputValue(selectedOption ? selectedOption.label : String(optionValue));
        onChange(optionValue);
        setOpen(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const filtered = getFilteredOptions();
            // If user typed something and there are filtered matches, select the first one
            if (inputValue && filtered.length > 0) {
                handleSelectOption(filtered[0].value);
            } else if (filtered.length === 1) {
                handleSelectOption(filtered[0].value);
            } else {
                const displayVal = getDisplayValue(value);
                setInputValue(displayVal);
                setOpen(false);
            }
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    // Deduplicate options based on value to prevent key errors
    // and limit to 100 to avoid performance issues with huge lists
    const uniqueOptions = React.useMemo(() => {
        const seen = new Set();
        const deduplicated = [];
        for (const option of options) {
            const val = option.value;
            if (!seen.has(val)) {
                seen.add(val);
                deduplicated.push(option);
            }
            if (deduplicated.length >= 5000) break; // Hard limit for safety
        }
        return deduplicated;
    }, [options]);

    const selectedOption = uniqueOptions.find(opt => opt.value == value);
    const selectedLabel = selectedOption ? selectedOption.label : '';

    // Filter options based on search input - always filter while typing
    // When no search input, show first 100 options
    const getFilteredOptions = () => {
        const search = inputValue ? inputValue.toLowerCase() : '';
        if (!search) {
            return uniqueOptions.slice(0, 100);
        }
        return uniqueOptions
            .filter(opt => opt.label && opt.label.toLowerCase().includes(search))
            .slice(0, 100);
    };

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
                        aria-required={ariaRequired}
                        aria-invalid={ariaInvalid}
                        aria-describedby={ariaDescribedBy}
                    />
                    {value && !disabled && (
                        <span
                            className="combobox-clear"
                            onClick={(e) => {
                                e.stopPropagation();
                                setInputValue('');
                                onChange('');
                                setOpen(false);
                            }}
                            title="Clear selection"
                            role="button"
                            aria-label="Clear selection"
                        >
                            ✕
                        </span>
                    )}
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

                {open && getFilteredOptions().length > 0 && (
                    <div className="combobox-content">
                        <Command.List className="combobox-list">
                            {getFilteredOptions().map((option) => (
                                <Command.Item
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => handleSelectOption(option.value)}
                                    className={`combobox-item ${value == option.value ? 'selected' : ''}`}
                                >
                                    {option.label}
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

