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
        const matchingOption = options.find(opt => opt.value == val || (typeof opt.value === 'string' && typeof val === 'string' && opt.value.trim() === val.trim()));
        return matchingOption ? matchingOption.label : String(val);
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

    // Close dropdown when disabled or when options significantly change
    useEffect(() => {
        if (disabled || options.length === 0) {
            setOpen(false);
        }
    }, [disabled, options.length]);

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

    // eslint-disable-next-line eqeqeq
    const selectedOption = uniqueOptions.find(opt => opt.value == value);
    const selectedLabel = selectedOption ? selectedOption.label : '';

    const searchValue = inputValue != null ? String(inputValue).toLowerCase() : '';

    // If the input value matches the currently selected option's label or the current display value,
    // show all options. Otherwise, filter based on the search value.
    const currentDisplayValue = getDisplayValue(value);
    const showAll = (selectedLabel && inputValue === selectedLabel) || (currentDisplayValue && inputValue === currentDisplayValue);

    // Filter and limit to 100 for display
    const filteredOptions = React.useMemo(() => {
        return uniqueOptions
            .filter(opt => showAll || (opt.label && opt.label.toLowerCase().includes(searchValue)))
            .slice(0, 100);
    }, [uniqueOptions, showAll, searchValue]);

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
                    {/* Clear button - shows only when there's a value */}
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

