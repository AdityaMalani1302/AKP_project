import React, { useState, useRef, useEffect } from 'react';

/**
 * Animated Tabs component with sliding indicator
 */
const AnimatedTabs = ({
    tabs = [],
    activeTab,
    onTabChange,
    variant = 'default', // 'default' | 'pills' | 'underline'
    size = 'md', // 'sm' | 'md' | 'lg'
    className = ''
}) => {
    const tabRefs = useRef({});
    const containerRef = useRef(null);
    const [indicatorStyle, setIndicatorStyle] = useState({});

    // Update indicator position when active tab changes
    useEffect(() => {
        const activeTabEl = tabRefs.current[activeTab];
        if (activeTabEl && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const tabRect = activeTabEl.getBoundingClientRect();
            
            setIndicatorStyle({
                left: tabRect.left - containerRect.left,
                width: tabRect.width
            });
        }
    }, [activeTab, tabs]);

    const sizeClasses = {
        sm: { padding: '0.375rem 0.75rem', fontSize: '0.8125rem' },
        md: { padding: '0.5rem 1rem', fontSize: '0.875rem' },
        lg: { padding: '0.625rem 1.25rem', fontSize: '1rem' }
    };

    const baseTabStyle = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: 'none',
        background: 'transparent',
        position: 'relative',
        whiteSpace: 'nowrap',
        ...sizeClasses[size]
    };

    const getTabStyle = (tab) => {
        const isActive = tab.id === activeTab;
        
        if (variant === 'pills') {
            return {
                ...baseTabStyle,
                borderRadius: '9999px',
                backgroundColor: isActive ? '#2563EB' : 'transparent',
                color: isActive ? 'white' : '#6B7280'
            };
        }
        
        return {
            ...baseTabStyle,
            color: isActive ? '#2563EB' : '#6B7280'
        };
    };

    return (
        <div className={`animated-tabs ${className}`}>
            <div 
                ref={containerRef}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: variant === 'pills' ? '0.5rem' : '0',
                    position: 'relative',
                    borderBottom: variant !== 'pills' ? '2px solid #E5E7EB' : 'none',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        ref={el => tabRefs.current[tab.id] = el}
                        onClick={() => onTabChange(tab.id)}
                        disabled={tab.disabled}
                        style={{
                            ...getTabStyle(tab),
                            opacity: tab.disabled ? 0.5 : 1,
                            cursor: tab.disabled ? 'not-allowed' : 'pointer'
                        }}
                        onMouseEnter={(e) => {
                            if (tab.id !== activeTab && variant !== 'pills') {
                                e.target.style.color = '#374151';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (tab.id !== activeTab && variant !== 'pills') {
                                e.target.style.color = '#6B7280';
                            }
                        }}
                    >
                        {tab.icon && <span style={{ display: 'flex' }}>{tab.icon}</span>}
                        {tab.label}
                        {tab.badge && (
                            <span style={{
                                backgroundColor: '#EF4444',
                                color: 'white',
                                fontSize: '0.75rem',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '9999px',
                                marginLeft: '0.25rem'
                            }}>
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
                
                {/* Sliding indicator for underline variant */}
                {variant !== 'pills' && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '-2px',
                            height: '2px',
                            backgroundColor: '#2563EB',
                            borderRadius: '1px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            ...indicatorStyle
                        }}
                    />
                )}
            </div>

            <style>{`
                .animated-tabs div::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default AnimatedTabs;
