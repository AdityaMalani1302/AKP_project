import React from 'react';

/**
 * Badge - A small label component for status, counts, or categories
 * @param {React.ReactNode} children - Badge content
 * @param {string} variant - 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} dot - Show a dot before the text
 * @param {boolean} pulse - Add pulse animation (useful for real-time indicators)
 */
const Badge = ({ 
    children, 
    variant = 'default', 
    size = 'md', 
    dot = false,
    pulse = false,
    style = {}
}) => {
    const variantStyles = {
        default: {
            backgroundColor: '#F3F4F6',
            color: '#374151',
            dotColor: '#9CA3AF'
        },
        primary: {
            backgroundColor: '#DBEAFE',
            color: '#1D4ED8',
            dotColor: '#3B82F6'
        },
        success: {
            backgroundColor: '#D1FAE5',
            color: '#047857',
            dotColor: '#10B981'
        },
        warning: {
            backgroundColor: '#FEF3C7',
            color: '#B45309',
            dotColor: '#F59E0B'
        },
        danger: {
            backgroundColor: '#FEE2E2',
            color: '#B91C1C',
            dotColor: '#EF4444'
        },
        info: {
            backgroundColor: '#E0E7FF',
            color: '#4338CA',
            dotColor: '#6366F1'
        }
    };

    const sizeStyles = {
        sm: {
            padding: '0.125rem 0.5rem',
            fontSize: '0.688rem',
            fontWeight: 500,
            dotSize: '6px',
            gap: '0.25rem'
        },
        md: {
            padding: '0.25rem 0.625rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            dotSize: '8px',
            gap: '0.375rem'
        },
        lg: {
            padding: '0.375rem 0.75rem',
            fontSize: '0.813rem',
            fontWeight: 600,
            dotSize: '10px',
            gap: '0.5rem'
        }
    };

    const currentVariant = variantStyles[variant] || variantStyles.default;
    const currentSize = sizeStyles[size] || sizeStyles.md;

    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: dot ? currentSize.gap : 0,
                padding: currentSize.padding,
                borderRadius: '9999px',
                fontSize: currentSize.fontSize,
                fontWeight: currentSize.fontWeight,
                lineHeight: 1,
                backgroundColor: currentVariant.backgroundColor,
                color: currentVariant.color,
                whiteSpace: 'nowrap',
                ...style
            }}
        >
            {dot && (
                <span
                    style={{
                        width: currentSize.dotSize,
                        height: currentSize.dotSize,
                        borderRadius: '50%',
                        backgroundColor: currentVariant.dotColor,
                        flexShrink: 0,
                        ...(pulse && {
                            animation: 'pulse 2s ease-in-out infinite'
                        })
                    }}
                />
            )}
            {children}
        </span>
    );
};

export default Badge;
