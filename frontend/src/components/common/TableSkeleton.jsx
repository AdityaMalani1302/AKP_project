import React, { memo } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * TableSkeleton - A loading skeleton for tables
 * @param {number} rows - Number of skeleton rows to display (default: 5)
 * @param {number} columns - Number of skeleton columns to display (default: 4)
 * @param {boolean} useCustomShimmer - Use custom shimmer animation from App.css (default: false)
 */
const TableSkeleton = memo(({ rows = 5, columns = 4, useCustomShimmer = false }) => {
    // Custom shimmer skeleton bar
    const ShimmerBar = ({ height = 20, delay = 0 }) => (
        <div
            className="animate-shimmer"
            style={{
                height: `${height}px`,
                borderRadius: '4px',
                animationDelay: `${delay}ms`,
            }}
        />
    );

    return (
        <div style={{ 
            width: '100%', 
            padding: '1rem', 
            background: '#fff', 
            borderRadius: '8px',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            {/* Header Skeleton */}
            <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginBottom: '1rem', 
                paddingBottom: '0.75rem', 
                borderBottom: '2px solid #e5e7eb' 
            }}>
                {Array(columns).fill(0).map((_, i) => (
                    <div key={`header-${i}`} style={{ flex: 1 }}>
                        {useCustomShimmer ? (
                            <ShimmerBar height={24} delay={i * 50} />
                        ) : (
                            <Skeleton height={24} />
                        )}
                    </div>
                ))}
            </div>

            {/* Rows Skeleton */}
            {Array(rows).fill(0).map((_, rowIndex) => (
                <div 
                    key={`row-${rowIndex}`} 
                    style={{ 
                        display: 'flex', 
                        gap: '1rem', 
                        marginBottom: '0.75rem', 
                        paddingBottom: '0.75rem', 
                        borderBottom: '1px solid #f3f4f6',
                        animation: 'fadeInUp 0.3s ease-out forwards',
                        animationDelay: `${rowIndex * 50}ms`,
                        opacity: 0
                    }}
                >
                    {Array(columns).fill(0).map((_, colIndex) => (
                        <div key={`cell-${rowIndex}-${colIndex}`} style={{ flex: 1 }}>
                            {useCustomShimmer ? (
                                <ShimmerBar height={20} delay={(rowIndex * columns + colIndex) * 30} />
                            ) : (
                                <Skeleton height={20} />
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
});

TableSkeleton.displayName = 'TableSkeleton';

export default TableSkeleton;

