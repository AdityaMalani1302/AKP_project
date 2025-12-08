import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import './Combobox.css';

const Combobox = ({ options = [], value, onChange, placeholder, label, disabled = false }) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');

    // Find selected label based on value
    const selectedOption = options.find(opt => opt.value === value);
    const displayValue = selectedOption ? selectedOption.label : '';

    return (
        <div className="combobox-wrapper">
            {label && <label className="combobox-label">{label}</label>}
            <Command className="combobox-root" shouldFilter={false}>
                <div
                    className={`combobox-trigger ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && setOpen(!open)}
                >
                    {displayValue || <span className="placeholder">{placeholder}</span>}
                    <span className="arrow">▼</span>
                </div>

                {open && (
                    <div className="combobox-content">
                        <Command.Input
                            value={search}
                            onValueChange={setSearch}
                            placeholder="Search..."
                            className="combobox-input"
                            autoFocus
                        />
                        <Command.List className="combobox-list">
                            {options.length === 0 && <div className="combobox-empty">No results found.</div>}

                            {options
                                .filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()))
                                .map((option) => (
                                    <Command.Item
                                        key={option.value}
                                        value={option.value}
                                        onSelect={() => {
                                            onChange(option.value);
                                            setOpen(false);
                                            setSearch('');
                                        }}
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
            {open && <div className="combobox-overlay" onClick={() => setOpen(false)} />}
        </div>
    );
};

export default Combobox;
