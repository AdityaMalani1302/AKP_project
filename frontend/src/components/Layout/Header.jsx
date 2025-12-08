import React from 'react';
import { FiSearch, FiBell, FiUser, FiMenu } from 'react-icons/fi';
import DatabaseSelector from '../DatabaseSelector';

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
            {/* Left Section - Hamburger + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {/* Hamburger Menu - Mobile Only */}
                <button
                    onClick={onMenuClick}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        color: '#6B7280',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    className="mobile-menu-button"
                    aria-label="Open navigation menu"
                    aria-expanded="false"
                >
                    <FiMenu size={24} />
                </button>

                <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
                    Dashboard
                </h2>
            </div>

            {/* Right Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="desktop-only">
                    <DatabaseSelector />
                </div>

                {/* Search - Desktop Only */}
                <div className="desktop-only" style={{ position: 'relative' }}>
                    <label htmlFor="global-search" className="sr-only">Search</label>
                    <FiSearch
                        style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}
                        aria-hidden="true"
                    />
                    <input
                        id="global-search"
                        type="text"
                        placeholder="Search..."
                        style={{
                            padding: '0.5rem 0.5rem 0.5rem 2.25rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #E5E7EB',
                            outline: 'none',
                            fontSize: '0.875rem',
                            width: '240px',
                            backgroundColor: '#F9FAFB'
                        }}
                        aria-label="Global search"
                    />
                </div>

                {/* Notifications - Desktop Only */}
                <button
                    className="desktop-only"
                    style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280' }}
                    aria-label="Notifications (1 unread)"
                >
                    <FiBell size={20} />
                    <span
                        style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#EF4444',
                            borderRadius: '50%'
                        }}
                        aria-hidden="true"
                    ></span>
                </button>

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
                @media (min-width: 768px) {
                    .mobile-menu-button {
                        display: none !important;
                    }
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
