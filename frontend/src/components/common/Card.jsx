import React from 'react';

/**
 * Card - A flexible container component with optional hover effects
 * @param {React.ReactNode} children - Card content
 * @param {string} title - Optional card header title
 * @param {React.ReactNode} headerAction - Optional element in the header right side
 * @param {boolean} hoverable - Enable hover animation
 * @param {boolean} clickable - Show pointer cursor and enhance hover effect
 * @param {function} onClick - Click handler
 * @param {string} padding - Padding size: 'none' | 'sm' | 'md' | 'lg'
 * @param {object} style - Additional inline styles
 */
const Card = ({ 
    children, 
    title,
    headerAction,
    hoverable = false,
    clickable = false,
    onClick,
    padding = 'md',
    style = {},
    className = ''
}) => {
    const paddingStyles = {
        none: '0',
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem'
    };

    const currentPadding = paddingStyles[padding] || paddingStyles.md;

    const baseStyles = {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s ease',
        cursor: clickable || onClick ? 'pointer' : 'default',
        ...style
    };

    const [isHovered, setIsHovered] = React.useState(false);

    const hoverStyles = (hoverable || clickable) && isHovered ? {
        transform: 'translateY(-2px)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
    } : {};

    return (
        <div
            className={`${className} ${hoverable || clickable ? 'card-hover' : ''}`.trim()}
            style={{
                ...baseStyles,
                ...hoverStyles
            }}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {title && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: `${currentPadding} ${currentPadding} 0 ${currentPadding}`,
                    marginBottom: currentPadding
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: '#111827'
                    }}>
                        {title}
                    </h3>
                    {headerAction && (
                        <div>{headerAction}</div>
                    )}
                </div>
            )}
            <div style={{ padding: title ? `0 ${currentPadding} ${currentPadding} ${currentPadding}` : currentPadding }}>
                {children}
            </div>
        </div>
    );
};

/**
 * CardHeader - A header section for cards
 */
export const CardHeader = ({ children, style = {} }) => (
    <div style={{
        borderBottom: '1px solid #E5E7EB',
        padding: '1rem 1.5rem',
        marginBottom: '1rem',
        ...style
    }}>
        {children}
    </div>
);

/**
 * CardBody - Body content section
 */
export const CardBody = ({ children, style = {} }) => (
    <div style={{
        padding: '0 1.5rem 1.5rem',
        ...style
    }}>
        {children}
    </div>
);

/**
 * CardFooter - Footer section with border
 */
export const CardFooter = ({ children, style = {} }) => (
    <div style={{
        borderTop: '1px solid #E5E7EB',
        padding: '1rem 1.5rem',
        marginTop: '1rem',
        ...style
    }}>
        {children}
    </div>
);

export default Card;
