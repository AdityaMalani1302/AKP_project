// Shared styles for all Pattern Master form fields

export const labelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151'
};

// Consistent input styling for all fields
export const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.75rem',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '0.875rem',
    boxSizing: 'border-box',
    minHeight: '42px',
    backgroundColor: '#FFFFFF',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
};

// Style for select dropdowns (native HTML selects)
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

// Style for textareas
export const textareaStyle = {
    ...inputStyle,
    minHeight: '100px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.5'
};

// Consistent react-select styles to match other inputs
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
