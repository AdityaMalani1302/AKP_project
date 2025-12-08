import React from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const TableSkeleton = ({ rows = 5, columns = 4 }) => {
    return (
        <div style={{ width: '100%', padding: '1rem', background: '#fff', borderRadius: '8px' }}>
            {/* Header Skeleton */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '2px solid #e5e7eb' }}>
                {Array(columns).fill(0).map((_, i) => (
                    <div key={`header-${i}`} style={{ flex: 1 }}>
                        <Skeleton height={24} />
                    </div>
                ))}
            </div>

            {/* Rows Skeleton */}
            {Array(rows).fill(0).map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f3f4f6' }}>
                    {Array(columns).fill(0).map((_, colIndex) => (
                        <div key={`cell-${rowIndex}-${colIndex}`} style={{ flex: 1 }}>
                            <Skeleton height={20} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default TableSkeleton;
