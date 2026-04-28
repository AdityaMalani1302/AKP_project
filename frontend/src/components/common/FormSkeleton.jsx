import React, { memo } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const ShimmerBar = ({ height = 38, delay = 0, width = '100%' }) => (
    <div
        className="animate-shimmer"
        style={{
            height: `${height}px`,
            width,
            borderRadius: '6px',
            animationDelay: `${delay}ms`,
        }}
    />
);

/**
 * FormSkeleton - A loading skeleton for forms
 * @param {number} fields - Number of skeleton fields to display (default: 6)
 * @param {number} rows - Number of fields per row (default: 3)
 * @param {boolean} useCustomShimmer - Use custom shimmer animation from App.css (default: false)
 */
const FormSkeleton = memo(({ fields = 6, fieldsPerRow = 3, useCustomShimmer = false }) => {
    return (
        <div style={{ 
            padding: '1.5rem',
            background: '#fff',
            borderRadius: '8px',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{ marginBottom: '1.5rem' }}>
                {useCustomShimmer ? (
                    <ShimmerBar height={28} width="40%" delay={0} />
                ) : (
                    <Skeleton height={28} width="40%" />
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${fieldsPerRow}, 1fr)`,
                gap: '1rem',
                marginBottom: '1rem'
            }}>
                {Array(fields).fill(0).map((_, i) => (
                    <div key={`field-${i}`} style={{ animation: 'fadeInUp 0.3s ease-out forwards', animationDelay: `${i * 50}ms`, opacity: 0 }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                            {useCustomShimmer ? (
                                <ShimmerBar height={14} width="30%" delay={i * 30} />
                            ) : (
                                <Skeleton height={14} width="30%" />
                            )}
                        </div>
                        {useCustomShimmer ? (
                            <ShimmerBar height={42} delay={i * 30 + 15} />
                        ) : (
                            <Skeleton height={42} />
                        )}
                    </div>
                ))}
            </div>

            <div style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                marginTop: '1.5rem',
                paddingTop: '1rem',
                borderTop: '1px solid #e5e7eb'
            }}>
                {Array(2).fill(0).map((_, i) => (
                    <div key={`btn-${i}`} style={{ animation: 'fadeIn 0.3s ease-out forwards', animationDelay: `${fields * 50 + i * 100}ms`, opacity: 0 }}>
                        {useCustomShimmer ? (
                            <ShimmerBar height={38} width={i === 0 ? '80px' : '100px'} delay={0} />
                        ) : (
                            <Skeleton height={38} width={i === 0 ? '80px' : '100px'} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
});

FormSkeleton.displayName = 'FormSkeleton';

export default FormSkeleton;