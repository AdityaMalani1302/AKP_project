import React, { useState, useRef, useEffect } from 'react';
import { FiMenu, FiUser, FiSettings, FiLogOut, FiChevronDown } from 'react-icons/fi';

const Header = ({ user, onMenuClick }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') setDropdownOpen(false);
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDropdownOpen(prev => !prev);
        }
    };

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                        onClick={() => setDropdownOpen(prev => !prev)}
                        onKeyDown={handleKeyDown}
                        aria-expanded={dropdownOpen}
                        aria-haspopup="menu"
                        aria-label={`User menu for ${user?.username}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.5rem',
                            background: dropdownOpen ? '#F3F4F6' : 'transparent',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer',
                            transition: 'background-color 0.15s'
                        }}
                    >
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
                        >
                            {user?.username?.charAt(0).toUpperCase()}
                        </div>
                        <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{user?.username}</span>
                            <span style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'capitalize' }}>{user?.role}</span>
                        </div>
                        <FiChevronDown
                            size={16}
                            style={{
                                color: '#6B7280',
                                transition: 'transform 0.2s',
                                transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                            }}
                            aria-hidden="true"
                        />
                    </button>

                    {dropdownOpen && (
                        <div
                            role="menu"
                            aria-label="User menu"
                            style={{
                                position: 'absolute',
                                top: '100%',
                                right: 0,
                                marginTop: '0.5rem',
                                backgroundColor: 'white',
                                borderRadius: '0.5rem',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                border: '1px solid #E5E7EB',
                                minWidth: '180px',
                                overflow: 'hidden',
                                zIndex: 100
                            }}
                        >
                            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>
                                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>{user?.username}</p>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#6B7280' }}>{user?.role}</p>
                            </div>
                            <button
                                role="menuitem"
                                onClick={() => { setDropdownOpen(false); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    color: '#374151',
                                    textAlign: 'left',
                                    transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FiUser size={16} aria-hidden="true" />
                                Profile
                            </button>
                            <button
                                role="menuitem"
                                onClick={() => { setDropdownOpen(false); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    color: '#374151',
                                    textAlign: 'left',
                                    transition: 'background-color 0.15s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FiSettings size={16} aria-hidden="true" />
                                Settings
                            </button>
                            <div style={{ borderTop: '1px solid #E5E7EB' }}>
                                <button
                                    role="menuitem"
                                    onClick={() => { setDropdownOpen(false); onMenuClick?.(); }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        width: '100%',
                                        padding: '0.75rem 1rem',
                                        border: 'none',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        color: '#DC2626',
                                        textAlign: 'left',
                                        transition: 'background-color 0.15s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <FiLogOut size={16} aria-hidden="true" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
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
