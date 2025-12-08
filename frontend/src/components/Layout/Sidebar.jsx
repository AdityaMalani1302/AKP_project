import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    FiHome,
    FiUsers,
    FiDatabase,
    FiSettings,
    FiLogOut,
    FiPlusSquare,
    FiBox,
    FiX,
    FiCalendar,
    FiActivity,
    FiDroplet
} from 'react-icons/fi';

const Sidebar = ({ user, onLogout, isOpen, onClose }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    const handleNavClick = () => {
        // Close sidebar on mobile when navigation item is clicked
        if (window.innerWidth < 768) {
            onClose();
        }
    };

    // Keyboard navigation - close on Escape
    React.useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && window.innerWidth < 768) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 99,
                        display: window.innerWidth < 768 ? 'block' : 'none'
                    }}
                    onClick={onClose}
                    aria-label="Close sidebar"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onClose();
                        }
                    }}
                />
            )}

            {/* Sidebar */}
            <aside
                style={{
                    width: '260px',
                    backgroundColor: '#FFFFFF',
                    borderRight: '1px solid #E5E7EB',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    position: 'fixed',
                    left: isOpen ? 0 : '-260px',
                    top: 0,
                    zIndex: 100,
                    transition: 'left 0.3s ease-in-out',
                    overflowY: 'auto'
                }}
                role="navigation"
                aria-label="Main navigation"
            >
                {/* Mobile Close Button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        right: '1rem',
                        top: '1rem',
                        background: 'none',
                        border: 'none',
                        padding: '0.5rem',
                        cursor: 'pointer',
                        color: '#6B7280',
                        display: window.innerWidth < 768 ? 'block' : 'none',
                        zIndex: 101
                    }}
                    aria-label="Close navigation menu"
                >
                    <FiX size={24} />
                </button>

                {/* Logo Area */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
                        Manufacturing ERP
                    </h1>
                </div>

                {/* Navigation */}
                <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9CA3AF', marginBottom: '0.75rem', paddingLeft: '0.75rem', textTransform: 'uppercase' }}>
                            Main Menu
                        </p>

                        <NavLink
                            to="/"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={navLinkStyle}
                            onClick={handleNavClick}
                        >
                            <FiHome size={20} />
                            <span>Dashboard</span>
                        </NavLink>

                        <NavLink
                            to="/pattern-master"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={navLinkStyle}
                            onClick={handleNavClick}
                        >
                            <FiBox size={20} />
                            <span>Pattern Master</span>
                        </NavLink>

                        <NavLink
                            to="/planning-master"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={navLinkStyle}
                            onClick={handleNavClick}
                        >
                            <FiCalendar size={20} />
                            <span>Planning</span>
                        </NavLink>

                        <NavLink
                            to="/lab-master"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={navLinkStyle}
                            onClick={handleNavClick}
                        >
                            <FiActivity size={20} />
                            <span>Lab Master</span>
                        </NavLink>

                        <NavLink
                            to="/melting"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={navLinkStyle}
                            onClick={handleNavClick}
                        >
                            <FiDroplet size={20} />
                            <span>Melting</span>
                        </NavLink>

                        <NavLink
                            to="/database-explorer"
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            style={navLinkStyle}
                            onClick={handleNavClick}
                        >
                            <FiDatabase size={20} />
                            <span>Database Explorer</span>
                        </NavLink>

                        {user && user.role === 'admin' && (
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                style={navLinkStyle}
                                onClick={handleNavClick}
                            >
                                <FiUsers size={20} />
                                <span>User Management</span>
                            </NavLink>
                        )}
                    </div>
                </nav>

                {/* Bottom Section */}
                <div style={{ padding: '1rem', borderTop: '1px solid #E5E7EB' }}>
                    <button onClick={handleLogout} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#EF4444',
                        cursor: 'pointer',
                        fontWeight: '500'
                    }}>
                        <FiLogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

const navLinkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    borderRadius: '0.375rem',
    color: '#4B5563',
    fontWeight: '500',
    transition: 'all 0.2s',
    textDecoration: 'none'
};

export default Sidebar;
