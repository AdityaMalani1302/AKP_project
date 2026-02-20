import React from 'react';

/**
 * EmptyState - A reusable component for displaying empty/no data states
 * with an illustration, title, description, and optional action button.
 */
const EmptyState = ({ 
    title = 'No records found',
    description = 'Try adjusting your search or filters',
    icon = 'search', // 'search', 'data', 'error', 'empty'
    actionLabel,
    onAction,
    size = 'medium' // 'small', 'medium', 'large'
}) => {
    const sizeStyles = {
        small: { iconSize: 48, titleSize: '1rem', descSize: '0.8rem', padding: '1.5rem' },
        medium: { iconSize: 80, titleSize: '1.125rem', descSize: '0.875rem', padding: '2.5rem' },
        large: { iconSize: 120, titleSize: '1.25rem', descSize: '1rem', padding: '3.5rem' }
    };

    const styles = sizeStyles[size];

    const renderIcon = () => {
        const iconStyle = {
            width: styles.iconSize,
            height: styles.iconSize,
            color: '#9CA3AF',
            marginBottom: '1rem'
        };

        switch (icon) {
            case 'search':
                return (
                    <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M10 10l-1.5 1.5M10 7v0" />
                    </svg>
                );
            case 'data':
                return (
                    <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M4 12c0 2.21 3.582 4 8 4s8-1.79 8-4" />
                    </svg>
                );
            case 'error':
                return (
                    <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'empty':
            default:
                return (
                    <svg style={iconStyle} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                );
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: styles.padding,
            textAlign: 'center',
            backgroundColor: '#FAFAFA',
            borderRadius: '12px',
            border: '2px dashed #E5E7EB'
        }}>
            {renderIcon()}
            
            <h3 style={{
                fontSize: styles.titleSize,
                fontWeight: '600',
                color: '#374151',
                margin: 0,
                marginBottom: '0.5rem'
            }}>
                {title}
            </h3>
            
            <p style={{
                fontSize: styles.descSize,
                color: '#6B7280',
                margin: 0,
                maxWidth: '300px'
            }}>
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    style={{
                        marginTop: '1rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#2563EB'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#3B82F6'}
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default EmptyState;
