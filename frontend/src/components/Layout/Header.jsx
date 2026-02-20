import React from 'react';

import { FiMenu } from 'react-icons/fi';
import NotificationBell from '../common/NotificationBell';

const Header = ({ user, onMenuClick }) => {
    return (
        <header
            style={{
                height: '64px',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1rem',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}
            role="banner"
        >
            {/* Left Section - Sidebar Toggle + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Sidebar Toggle Button */}
                <button
                    onClick={onMenuClick}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '0.375rem',
                        transition: 'background-color 0.2s'
                    }}
                    className="sidebar-toggle-button"
                    aria-label="Toggle sidebar"
                >
                    <FiMenu size={24} />
                </button>

                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
                    AKP FOUNDRIES PVT LTD
                </h2>
            </div>

            {/* Right Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Notification Bell */}
                <NotificationBell />
                
                {/* User Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} role="complementary" aria-label="User information">
                    <div
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#E0E7FF',
                            color: '#4F46E5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '600',
                            fontSize: '0.875rem'
                        }}
                        aria-label={`User avatar for ${user?.username}`}
                    >
                        {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{user?.username}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'capitalize' }}>{user?.role}</span>
                    </div>
                </div>
            </div>

            <style>{`
                .sidebar-toggle-button:hover {
                    background-color: #F3F4F6;
                }
                @media (max-width: 767px) {
                    .desktop-only {
                        display: none !important;
                    }
                }
                .sr-only {
                    position: absolute;
                    width: 1px;
                    height: 1px;
                    padding: 0;
                    margin: -1px;
                    overflow: hidden;
                    clip: rect(0, 0, 0, 0);
                    white-space: nowrap;
                    border-width: 0;
                }
            `}</style>
        </header>
    );
};

export default Header;
