import React from 'react';
import '../common/Spinner.css';

const SkeletonLoader = ({ type = 'text', count = 1 }) => {
    const renderSkeleton = () => {
        switch (type) {
            case 'text':
                return Array(count).fill(0).map((_, i) => (
                    <div key={i} className="skeleton skeleton-text" />
                ));
            case 'title':
                return <div className="skeleton skeleton-title" />;
            case 'avatar':
                return <div className="skeleton skeleton-avatar" />;
            case 'card':
                return <div className="skeleton skeleton-card" />;
            case 'table':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {Array(count).fill(0).map((_, i) => (
                            <div key={i} className="skeleton" style={{ height: '3rem' }} />
                        ))}
                    </div>
                );
            default:
                return <div className="skeleton skeleton-text" />;
        }
    };

    return <div className="skeleton-container">{renderSkeleton()}</div>;
};

export default SkeletonLoader;
