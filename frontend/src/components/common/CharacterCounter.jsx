import React, { useState, useEffect } from 'react';

const CharacterCounter = ({ value = '', maxLength = 500, showAt = 0, style = {} }) => {
    const [count, setCount] = useState(value.length);

    useEffect(() => {
        setCount(value.length);
    }, [value]);

    if (showAt > 0 && count < showAt) return null;

    const isNearLimit = count >= maxLength * 0.9;
    const isOverLimit = count > maxLength;

    return (
        <span
            style={{
                fontSize: '0.75rem',
                color: isOverLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : '#9CA3AF',
                textAlign: 'right',
                display: 'block',
                marginTop: '0.25rem',
                ...style
            }}
            aria-live="polite"
        >
            {count}/{maxLength}
        </span>
    );
};

export default CharacterCounter;