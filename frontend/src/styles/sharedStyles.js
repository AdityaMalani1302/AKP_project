// Centralized shared styles for all form components
// Uses CSS custom properties from tokens.css for consistency
// This file consolidates duplicate styles from quality-lab, it-management, pattern-master, and lab-master

import { format, parseISO, isValid } from 'date-fns';

// ============================================
// LABEL & INPUT BASE STYLES
// ============================================

export const labelStyle = {
    display: 'block',
    marginBottom: 'var(--spacing-sm, 0.5rem)',
    fontWeight: 'var(--font-weight-medium, 500)',
    color: 'var(--text-secondary, #374151)',
    fontSize: 'var(--font-size-sm, 0.875rem)'
};

export const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid var(--border-default, #D1D5DB)',
    borderRadius: 'var(--radius-sm, 0.375rem)',
    fontSize: 'var(--font-size-sm, 0.875rem)',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    outline: 'none',
    backgroundColor: 'var(--bg-primary, #fff)',
    boxSizing: 'border-box',
    minHeight: '42px'
};

// ============================================
// SELECT & TEXTAREA STYLES
// ============================================

export const selectStyle = {
    ...inputStyle,
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 0.5rem center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '1.5em 1.5em',
    paddingRight: '2.5rem',
    cursor: 'pointer'
};

export const textareaStyle = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.5'
};

// ============================================
// SECTION CONTAINER STYLES
// ============================================

export const sectionStyle = {
    padding: 'var(--spacing-xl, 1.25rem)',
    borderRadius: 'var(--radius-md, 8px)',
    marginBottom: 'var(--spacing-2xl, 1.5rem)'
};

export const sectionBlue = {
    ...sectionStyle,
    backgroundColor: 'var(--section-blue-bg, #F0F9FF)',
    border: '1px solid var(--section-blue-border, #BAE6FD)'
};

export const sectionGreen = {
    ...sectionStyle,
    backgroundColor: 'var(--section-green-bg, #F0FDF4)',
    border: '1px solid var(--section-green-border, #BBF7D0)'
};

export const sectionOrange = {
    ...sectionStyle,
    backgroundColor: 'var(--section-orange-bg, #FFF7ED)',
    border: '1px solid var(--section-orange-border, #FED7AA)'
};

export const sectionPurple = {
    ...sectionStyle,
    backgroundColor: 'var(--section-purple-bg, #FAF5FF)',
    border: '1px solid var(--section-purple-border, #E9D5FF)'
};

export const sectionGray = {
    ...sectionStyle,
    backgroundColor: 'var(--bg-secondary, #F9FAFB)',
    border: '1px solid var(--border-light, #E5E7EB)'
};

// ============================================
// TABLE STYLES
// ============================================

export const tableHeaderStyle = {
    padding: '0.75rem 1rem',
    fontWeight: 'var(--font-weight-semibold, 600)',
    borderBottom: '2px solid var(--border-light, #E5E7EB)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    backgroundColor: 'var(--bg-secondary, #F9FAFB)'
};

export const tableCellStyle = {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--border-light, #E5E7EB)',
    whiteSpace: 'nowrap'
};

// ============================================
// SPECIALIZED INPUT STYLES
// ============================================

// Small number input for quantities beside checkboxes
export const smallNumberInputStyle = {
    ...inputStyle,
    width: '80px',
    minHeight: '36px',
    padding: '0.375rem 0.5rem',
    fontSize: '0.8rem',
    textAlign: 'center'
};

// Inline label for composite fields
export const inlineLabelStyle = {
    fontSize: '0.75rem',
    color: '#6B7280',
    display: 'block',
    marginBottom: '0.25rem'
};

// ============================================
// REACT-SELECT CUSTOM STYLES
// ============================================

export const customSelectStyles = {
    control: (provided, state) => ({
        ...provided,
        borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
        borderRadius: '6px',
        minHeight: '42px',
        fontSize: '0.875rem',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
        backgroundColor: '#FFFFFF',
        '&:hover': {
            borderColor: state.isFocused ? '#3B82F6' : '#9CA3AF'
        }
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: '2px 12px'
    }),
    input: (provided) => ({
        ...provided,
        margin: '0',
        padding: '0'
    }),
    indicatorSeparator: () => ({
        display: 'none'
    }),
    dropdownIndicator: (provided) => ({
        ...provided,
        padding: '8px',
        color: '#6B7280'
    }),
    menu: (provided) => ({
        ...provided,
        zIndex: 9999,
        borderRadius: '6px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }),
    option: (provided, state) => ({
        ...provided,
        fontSize: '0.875rem',
        padding: '10px 12px',
        backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#EFF6FF' : 'white',
        color: state.isSelected ? 'white' : '#374151',
        cursor: 'pointer'
    }),
    placeholder: (provided) => ({
        ...provided,
        color: '#9CA3AF'
    }),
    singleValue: (provided) => ({
        ...provided,
        color: '#374151'
    })
};

// ============================================
// COLOR CONSTANTS
// ============================================

export const buttonColors = {
    primary: 'var(--color-blue-600, #2563EB)',
    primaryHover: 'var(--color-blue-700, #1D4ED8)',
    success: 'var(--color-green-600, #16A34A)',
    successHover: 'var(--color-green-700, #15803D)',
    danger: 'var(--color-red-700, #B91C1C)',
    dangerHover: 'var(--color-red-800, #991B1B)',
    warning: 'var(--color-yellow-700, #92400E)',
    purple: 'var(--color-purple-700, #6B21A8)'
};

export const textColors = {
    primary: 'var(--text-primary, #111827)',
    secondary: 'var(--text-secondary, #374151)',
    muted: 'var(--text-muted, #9CA3AF)',
    danger: 'var(--color-red-700, #B91C1C)',
    success: 'var(--color-green-700, #15803D)',
    purple: 'var(--color-purple-700, #6B21A8)'
};

// ============================================
// DATE UTILITY FUNCTIONS
// Uses date-fns for locale-independent parsing
// ============================================

/**
 * Format a date for display as dd/MM/yyyy
 * Handles: Date objects, ISO strings, and YYYY-MM-DD strings
 * @param {Date|string} dateString - The date to format
 * @returns {string} Formatted date string (dd/MM/yyyy) or empty string
 */
export const formatDate = (dateString) => {
    if (!dateString) return '';
    
    let date;
    if (dateString instanceof Date) {
        date = dateString;
    } else if (typeof dateString === 'string') {
        // parseISO handles ISO 8601 format (from backend JSON)
        // e.g., "2026-01-15T00:00:00.000Z" or "2026-01-15"
        date = parseISO(dateString);
    }
    
    if (!date || !isValid(date)) return '';
    return format(date, 'dd/MM/yyyy');
};

/**
 * Format a date for HTML date input (YYYY-MM-DD)
 * @param {Date|string} dateString - The date to format
 * @returns {string} Formatted date string (yyyy-MM-dd) or empty string
 */
export const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    let date;
    if (dateString instanceof Date) {
        date = dateString;
    } else if (typeof dateString === 'string') {
        date = parseISO(dateString);
    }
    
    if (!date || !isValid(date)) return '';
    return format(date, 'yyyy-MM-dd');
};

/**
 * Get yesterday's date in YYYY-MM-DD format for date input defaults
 * @returns {string} Yesterday's date in yyyy-MM-dd format
 */
export const getYesterdayDate = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return format(yesterday, 'yyyy-MM-dd');
};

