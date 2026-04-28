import { useState, useCallback } from 'react';

const useFormValidation = (validationRules) => {
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateField = useCallback((name, value) => {
        const rule = validationRules[name];
        if (!rule) return null;

        const strValue = String(value ?? '');
        if (rule.required && (!value || strValue.trim() === '')) {
            return rule.requiredMessage || `${name} is required`;
        }

        if (rule.pattern && value && !rule.pattern.test(strValue)) {
            return rule.patternMessage || `${name} is invalid`;
        }

        if (rule.minLength && value && strValue.length < rule.minLength) {
            return rule.minLengthMessage || `${name} must be at least ${rule.minLength} characters`;
        }

        if (rule.maxLength && value && strValue.length > rule.maxLength) {
            return rule.maxLengthMessage || `${name} must be at most ${rule.maxLength} characters`;
        }

        if (rule.validate) {
            return rule.validate(value);
        }

        return null;
    }, [validationRules]);

    const validateAll = useCallback((data) => {
        const newErrors = {};
        let isValid = true;

        Object.keys(validationRules).forEach(name => {
            const error = validateField(name, data[name]);
            if (error) {
                newErrors[name] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    }, [validationRules, validateField]);

    const handleBlur = useCallback((name, value) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));
    }, [validateField]);

    const handleChange = useCallback((name, value) => {
        if (touched[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    }, [touched, validateField]);

    const clearFieldError = useCallback((name) => {
        setErrors(prev => ({ ...prev, [name]: null }));
    }, []);

    const clearAllErrors = useCallback(() => {
        setErrors({});
        setTouched({});
    }, []);

    const getFieldProps = useCallback((name) => ({
        onBlur: (e) => handleBlur(name, e.target.value),
        onChange: (e) => handleChange(name, e.target.value),
        'aria-invalid': touched[name] && errors[name] ? 'true' : undefined,
        'aria-describedby': touched[name] && errors[name] ? `${name}-error` : undefined
    }), [touched, errors, handleBlur, handleChange]);

    const getInputStyle = useCallback((name, baseStyle) => {
        if (touched[name] && errors[name]) {
            return {
                ...baseStyle,
                borderColor: '#EF4444',
                boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)'
            };
        }
        return baseStyle;
    }, [touched, errors]);

    return {
        errors,
        touched,
        setErrors,
        setTouched,
        validateAll,
        validateField,
        handleBlur,
        handleChange,
        clearFieldError,
        clearAllErrors,
        getFieldProps,
        getInputStyle
    };
};

export default useFormValidation;