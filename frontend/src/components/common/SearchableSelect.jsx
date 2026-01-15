import React from 'react';
import Select from 'react-select';

/**
 * Searchable Select component with project styling
 * Replaces native <select> with searchable, keyboard-navigable dropdown
 */
const SearchableSelect = ({
    options = [],
    value,
    onChange,
    name,
    id,
    placeholder = 'Select...',
    isMulti = false,
    isClearable = true,
    isDisabled = false,
    isLoading = false,
    className = '',
    menuPortalTarget = document.body,
    ...props
}) => {
    // Custom styles matching project design
    const customStyles = {
        control: (base, state) => ({
            ...base,
            minHeight: '38px',
            borderColor: state.isFocused ? '#2563EB' : '#D1D5DB',
            boxShadow: state.isFocused ? '0 0 0 2px rgba(37, 99, 235, 0.1)' : 'none',
            borderRadius: '0.375rem',
            backgroundColor: isDisabled ? '#F9FAFB' : 'white',
            '&:hover': {
                borderColor: state.isFocused ? '#2563EB' : '#9CA3AF'
            },
            transition: 'border-color 0.2s, box-shadow 0.2s'
        }),
        valueContainer: (base) => ({
            ...base,
            padding: '0 0.75rem'
        }),
        input: (base) => ({
            ...base,
            margin: 0,
            padding: 0
        }),
        placeholder: (base) => ({
            ...base,
            color: '#9CA3AF'
        }),
        singleValue: (base) => ({
            ...base,
            color: '#1F2937'
        }),
        menu: (base) => ({
            ...base,
            borderRadius: '0.5rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB',
            overflow: 'hidden',
            zIndex: 9999,
            animation: 'selectMenuSlide 0.15s ease-out'
        }),
        menuList: (base) => ({
            ...base,
            padding: '0.25rem'
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isSelected 
                ? '#2563EB' 
                : state.isFocused 
                    ? '#EFF6FF' 
                    : 'transparent',
            color: state.isSelected ? 'white' : '#1F2937',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            '&:active': {
                backgroundColor: state.isSelected ? '#2563EB' : '#DBEAFE'
            }
        }),
        indicatorSeparator: () => ({
            display: 'none'
        }),
        dropdownIndicator: (base, state) => ({
            ...base,
            color: '#6B7280',
            padding: '0 0.5rem',
            transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.2s'
        }),
        clearIndicator: (base) => ({
            ...base,
            color: '#9CA3AF',
            padding: '0 0.25rem',
            '&:hover': {
                color: '#EF4444'
            }
        }),
        multiValue: (base) => ({
            ...base,
            backgroundColor: '#EFF6FF',
            borderRadius: '0.25rem'
        }),
        multiValueLabel: (base) => ({
            ...base,
            color: '#1E40AF',
            padding: '0.125rem 0.375rem'
        }),
        multiValueRemove: (base) => ({
            ...base,
            color: '#3B82F6',
            '&:hover': {
                backgroundColor: '#DBEAFE',
                color: '#1E40AF'
            }
        }),
        menuPortal: (base) => ({
            ...base,
            zIndex: 9999
        }),
        noOptionsMessage: (base) => ({
            ...base,
            color: '#9CA3AF',
            padding: '0.75rem'
        }),
        loadingMessage: (base) => ({
            ...base,
            color: '#6B7280'
        })
    };

    // Handle change - mimic native select onChange
    const handleChange = (selected) => {
        if (isMulti) {
            const values = selected ? selected.map(opt => opt.value) : [];
            onChange({
                target: {
                    name: name || id,
                    value: values,
                    type: 'select-multiple'
                }
            });
        } else {
            onChange({
                target: {
                    name: name || id,
                    value: selected ? selected.value : '',
                    type: 'select-one'
                }
            });
        }
    };

    // Find selected option(s) from value
    const getSelectedValue = () => {
        if (isMulti) {
            if (!value || !Array.isArray(value)) return [];
            return options.filter(opt => value.includes(opt.value));
        }
        // Use loose equality to handle string/number type mismatches (e.g., "123" == 123)
        // eslint-disable-next-line eqeqeq
        return options.find(opt => opt.value == value) || null;
    };

    return (
        <>
            <Select
                inputId={id}
                name={name}
                options={options}
                value={getSelectedValue()}
                onChange={handleChange}
                placeholder={placeholder}
                isMulti={isMulti}
                isClearable={isClearable}
                isDisabled={isDisabled}
                isLoading={isLoading}
                styles={customStyles}
                className={className}
                classNamePrefix="searchable-select"
                menuPortalTarget={menuPortalTarget}
                menuPlacement="auto"
                noOptionsMessage={() => 'No options found'}
                loadingMessage={() => 'Loading...'}
                {...props}
            />
            <style>{`
                @keyframes selectMenuSlide {
                    from {
                        opacity: 0;
                        transform: translateY(-8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </>
    );
};

export default SearchableSelect;
