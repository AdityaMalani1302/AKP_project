import React, { memo } from 'react';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

/**
 * CardSkeleton - Loading skeleton for KPI/stat cards
 * @param {number} count - Number of cards to show (default: 4)
 */
export const CardSkeleton = memo(({ count = 4 }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
    }}>
        {Array(count).fill(0).map((_, i) => (
            <div key={i} style={{
                background: '#f9fafb',
                borderRadius: '12px',
                padding: '1.25rem',
                minHeight: '100px'
            }}>
                <Skeleton width="60%" height={14} style={{ marginBottom: '0.5rem' }} />
                <Skeleton width="80%" height={28} />
                <Skeleton width="40%" height={12} style={{ marginTop: '0.5rem' }} />
            </div>
        ))}
    </div>
));
CardSkeleton.displayName = 'CardSkeleton';

/**
 * ChartSkeleton - Loading skeleton for chart areas
 * @param {number} height - Height of the chart area (default: 300)
 */
export const ChartSkeleton = memo(({ height = 300 }) => (
    <div style={{
        background: '#f9fafb',
        borderRadius: '12px',
        padding: '1.5rem',
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column'
    }}>
        <Skeleton width="30%" height={20} style={{ marginBottom: '1rem' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            {[60, 80, 45, 90, 70, 55, 85, 65].map((h, i) => (
                <div key={i} style={{ flex: 1 }}>
                    <Skeleton height={`${h}%`} borderRadius={4} />
                </div>
            ))}
        </div>
    </div>
));
ChartSkeleton.displayName = 'ChartSkeleton';

/**
 * DashboardSkeleton - Loading skeleton for dashboard pages
 */
export const DashboardSkeleton = memo(() => (
    <div style={{ padding: '1rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
                <Skeleton width={180} height={28} style={{ marginBottom: '0.5rem' }} />
                <Skeleton width={250} height={16} />
            </div>
            <Skeleton width={100} height={36} borderRadius={8} />
        </div>
        
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Skeleton width={100} height={36} borderRadius={8} />
            <Skeleton width={120} height={36} borderRadius={8} />
            <Skeleton width={120} height={36} borderRadius={8} />
            <Skeleton width={150} height={36} borderRadius={8} />
        </div>

        {/* KPI Cards */}
        <CardSkeleton count={6} />

        {/* Charts Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
            <ChartSkeleton height={280} />
            <ChartSkeleton height={280} />
        </div>
    </div>
));
DashboardSkeleton.displayName = 'DashboardSkeleton';
