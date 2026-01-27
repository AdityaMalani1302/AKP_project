import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { parse, format, isValid, getYear, getMonth } from 'date-fns';
import { FiCalendar } from 'react-icons/fi';

// Generate range of years for dropdown
const range = (start, end) => {
    const years = [];
    for (let i = start; i <= end; i++) {
        years.push(i);
    }
    return years;
};

const years = range(1950, getYear(new Date()) + 10);
const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

/**
 * Enhanced DatePicker component with dark theme, month/year dropdowns, and calendar icon
 * Converts between YYYY-MM-DD string format and Date objects
 * Displays dates in dd/MM/yyyy format
 */
const DatePicker = ({
    value,
    onChange,
    id,
    name,
    placeholder = 'DD/MM/YYYY',
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

    // Custom input with calendar icon
    const CustomInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
        <div className="datepicker-input-wrapper" onClick={onClick} ref={ref}>
            <input
                type="text"
                value={value}
                placeholder={placeholder}
                readOnly
                className={className}
                disabled={disabled}
                style={{ paddingRight: '2.5rem', cursor: 'pointer', ...style }}
            />
            <FiCalendar className="datepicker-icon" />
        </div>
    ));

    // Custom header with month/year dropdowns
    const renderCustomHeader = ({
        date,
        changeYear,
        changeMonth,
        decreaseMonth,
        increaseMonth,
        prevMonthButtonDisabled,
        nextMonthButtonDisabled,
    }) => (
        <div className="datepicker-custom-header">
            <div className="datepicker-header-selects">
                <select
                    value={months[getMonth(date)]}
                    onChange={({ target: { value } }) => changeMonth(months.indexOf(value))}
                    className="datepicker-month-select"
                >
                    {months.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
                <select
                    value={getYear(date)}
                    onChange={({ target: { value } }) => changeYear(parseInt(value))}
                    className="datepicker-year-select"
                >
                    {years.map((option) => (
                        <option key={option} value={option}>
                            {option}
                        </option>
                    ))}
                </select>
            </div>
            <div className="datepicker-nav-buttons">
                <button
                    type="button"
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    className="datepicker-nav-btn"
                >
                    ‹
                </button>
                <button
                    type="button"
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    className="datepicker-nav-btn"
                >
                    ›
                </button>
            </div>
        </div>
    );

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
            customInput={<CustomInput />}
            renderCustomHeader={renderCustomHeader}
            wrapperClassName="datepicker-wrapper"
            popperClassName="datepicker-popper datepicker-dark"
            calendarClassName="datepicker-calendar datepicker-dark-calendar"
            showPopperArrow={false}
            autoComplete="off"
            {...props}
        />
    );
};

export default DatePicker;
