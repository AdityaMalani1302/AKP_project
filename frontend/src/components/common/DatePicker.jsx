import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parse, format, isValid } from 'date-fns';

/**
 * Smooth DatePicker component wrapping react-datepicker
 * Converts between YYYY-MM-DD string format and Date objects
 */
const DatePicker = ({
    value,
    onChange,
    id,
    name,
    placeholder = 'Select date...',
    minDate,
    maxDate,
    disabled = false,
    style = {},
    className = 'input-field',
    dateFormat = 'dd/MM/yyyy',
    ...props
}) => {
    // Convert string value (YYYY-MM-DD) to Date object
    const parseDate = (dateString) => {
        if (!dateString) return null;
        try {
            const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
            return isValid(parsed) ? parsed : null;
        } catch {
            return null;
        }
    };

    // Convert Date object to string (YYYY-MM-DD)
    const formatDate = (date) => {
        if (!date || !isValid(date)) return '';
        return format(date, 'yyyy-MM-dd');
    };

    // Handle date change
    const handleChange = (date) => {
        const formattedDate = formatDate(date);
        // Mimic the native input onChange event structure
        onChange({
            target: {
                name: name || id,
                value: formattedDate,
                type: 'date'
            }
        });
    };

    return (
        <ReactDatePicker
            id={id}
            name={name}
            selected={parseDate(value)}
            onChange={handleChange}
            dateFormat={dateFormat}
            placeholderText={placeholder}
            minDate={minDate ? parseDate(minDate) : undefined}
            maxDate={maxDate ? parseDate(maxDate) : undefined}
            disabled={disabled}
            className={className}
            wrapperClassName="datepicker-wrapper"
            popperClassName="datepicker-popper"
            calendarClassName="datepicker-calendar"
            showPopperArrow={false}
            autoComplete="off"
            {...props}
        />
    );
};

export default DatePicker;
