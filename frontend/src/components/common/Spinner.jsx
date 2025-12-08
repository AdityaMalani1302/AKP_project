import React from 'react';
import './Spinner.css';

const Spinner = ({ size = 'md', color = 'primary' }) => {
    const sizeMap = {
        sm: '20px',
        md: '40px',
        lg: '60px'
    };

    return (
        <div className="spinner-container">
            <div
                className={`spinner spinner-${color}`}
                style={{
                    width: sizeMap[size],
                    height: sizeMap[size]
                }}
                role="status"
                aria-label="Loading"
            >
                <span className="sr-only">Loading...</span>
            </div>
        </div>
    );
};

export default Spinner;
