import React from 'react';

const FieldError = ({ error, id }) => {
    if (!error) return null;

    return (
        <span
            id={id}
            role="alert"
            style={{
                display: 'block',
                color: '#EF4444',
                fontSize: '0.75rem',
                marginTop: '0.25rem',
                fontWeight: '400'
            }}
        >
            {error}
        </span>
    );
};

export default FieldError;