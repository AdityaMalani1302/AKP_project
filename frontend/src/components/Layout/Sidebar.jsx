import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    FiUsers,
    FiDatabase,
    FiSettings,
    FiLogOut,
    FiPlusSquare,
    FiBox,
    FiX,
    FiCalendar,
    FiActivity,
    FiDroplet,
    FiHexagon,
    FiMenu,
    FiFileText,
    FiClock,
    FiClipboard,
    FiMonitor,
    FiTrendingUp,
    FiHome,
    FiSearch,
    FiAlertTriangle,
} from 'react-icons/fi';
import { TbCurrencyRupee, TbBuildingFactory2 } from 'react-icons/tb';
// Define all navigation items with their page IDs for permission checking
const NAV_ITEMS = [
    { path: '/', pageId: 'homepage', label: 'Homepage', icon: FiHome },
    { path: '/daily-dashboard', pageId: 'daily-dashboard', label: 'Day-wise Dashboard', icon: FiActivity },
    { path: '/sales-dashboard', pageId: 'sales-dashboard', label: 'Sales Dashboard', icon: FiTrendingUp },
    { path: '/finance-dashboard', pageId: 'finance-dashboard', label: 'Finance Dashboard', icon: TbCurrencyRupee },
    { path: '/ar-ap-dashboard', pageId: 'ar-ap-dashboard', label: 'AR Dashboard', icon: FiFileText },
    { path: '/production-dashboard', pageId: 'production-dashboard', label: 'Production Dashboard', icon: TbBuildingFactory2 },
    { path: '/rejection-dashboard', pageId: 'rejection-dashboard', label: 'Rejection Dashboard', icon: FiAlertTriangle },
    { path: '/pattern-master', pageId: 'pattern-master', label: 'Pattern Master', icon: FiBox },
    { path: '/planning-master', pageId: 'planning-master', label: 'Planning', icon: FiCalendar },
    { path: '/lab-master', pageId: 'lab-master', label: 'Lab Master', icon: FiActivity },
    { path: '/melting', pageId: 'melting', label: 'Melting', icon: FiDroplet },
    { path: '/quality-lab', pageId: 'quality-lab', label: 'Quality & Lab', icon: FiClipboard },
    { path: '/quality-management-system', pageId: 'quality-management-system', label: 'QMS', icon: FiActivity },
    { path: '/it-management', pageId: 'it-management', label: 'IT Management', icon: FiMonitor },
    { path: '/database-explorer', pageId: 'database-explorer', label: 'Database Explorer', icon: FiDatabase },
    { path: '/marketing', pageId: 'marketing', label: 'Marketing', icon: FiPlusSquare },
];

const Sidebar = ({ user, onLogout, isOpen, onClose }) => {
    const navigate = useNavigate();
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
    const [searchTerm, setSearchTerm] = useState('');

    // Track screen size for responsive behavior
    useEffect(() => {
        const handleResize = () => {
            setIsDesktop(window.innerWidth >= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    const handleNavClick = () => {
        // Close sidebar on mobile when navigation item is clicked
        if (!isDesktop) {
            onClose();
        }
    };

    // Filter navigation items based on user permissions
    const getVisibleNavItems = () => {
        if (!user) return [];
        
        let items = NAV_ITEMS;
        
        // Admins see all items
        if (user.role !== 'admin') {
            // Employees only see items they have access to
            const allowedPages = user.allowedPages || [];
            if (!allowedPages.includes('all')) {
                items = items.filter(item => allowedPages.includes(item.pageId));
            }
        }
        
        // Apply search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            items = items.filter(item => 
                item.label.toLowerCase().includes(search) ||
                item.pageId.toLowerCase().includes(search)
            );
        }
        
        return items;
    };

    const visibleNavItems = getVisibleNavItems();
    
    // Determine collapsed state: Desktop AND !isOpen
    const isCollapsed = isDesktop && !isOpen;
    
    // Sidebar styles
    const sidebarWidth = isCollapsed ? '80px' : '260px';
    const sidebarLeft = isDesktop ? '0' : (isOpen ? '0' : '-260px');

    return (
        <>
            {/* Mobile Overlay */}
            {!isDesktop && isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 99
                    }}
                    onClick={onClose}
                    aria-label="Close sidebar"
                />
            )}

            {/* Sidebar */}
            <aside
                className="sidebar-scroll-hidden"
                style={{
                    width: sidebarWidth,
                    backgroundColor: '#FFFFFF',
                    borderRight: '1px solid #E5E7EB',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100vh',
                    position: 'fixed',
                    left: sidebarLeft,
                    top: 0,
                    zIndex: 100,
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    willChange: 'width, left',
                    contain: 'layout',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none' // IE and Edge
                }}
                role="navigation"
                aria-label="Main navigation"
            >
                {/* Mobile Close Button */}
                {!isDesktop && (
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
                            zIndex: 101
                        }}
                    >
                        <FiX size={24} />
                    </button>
                )}

                {/* Logo Area */}
                <div style={{ 
                    padding: isCollapsed ? '1.5rem 0' : '1.5rem', 
                    borderBottom: '1px solid #E5E7EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: '0.75rem',
                    height: '73px', // Fix height to prevent jumping
                    whiteSpace: 'nowrap'
                }}>
                    <div style={{ 
                        color: '#2563EB', // Royal Blue
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FiHexagon size={isCollapsed ? 32 : 28} fill={isCollapsed ? "none" : "none"} />
                    </div>
                    {!isCollapsed && (
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                            Smart ERP
                        </h1>
                    )}
                </div>

                {/* Navigation */}
                <nav style={{ 
                    flex: 1, 
                    padding: isCollapsed ? '1.5rem 0.5rem' : '1.5rem 1rem', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem',
                    alignItems: isCollapsed ? 'center' : 'stretch'
                }}>
                    {/* Search Input */}
                    {!isCollapsed && (
                        <div style={{ 
                            position: 'relative', 
                            marginBottom: '1rem'
                        }}>
                            <FiSearch 
                                size={16} 
                                style={{ 
                                    position: 'absolute', 
                                    left: '0.75rem', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)',
                                    color: '#9CA3AF'
                                }} 
                            />
                            <input
                                type="text"
                                placeholder="Search menu..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #E5E7EB',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#2563EB'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    style={{
                                        position: 'absolute',
                                        right: '0.5rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#9CA3AF',
                                        padding: '0.25rem',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <FiX size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    <div style={{ marginBottom: '1rem', width: '100%', display: 'flex', flexDirection: 'column', alignItems: isCollapsed ? 'center' : 'stretch' }}>
                        {!isCollapsed && (
                            <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9CA3AF', marginBottom: '0.75rem', paddingLeft: '0.75rem', textTransform: 'uppercase' }}>
                                Main Menu
                            </p>
                        )}

                        {visibleNavItems.map(item => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    style={({ isActive }) => ({
                                        ...navLinkStyle,
                                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                                        padding: isCollapsed ? '0.75rem' : '0.75rem',
                                        backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                                        color: isActive ? '#2563EB' : '#4B5563'
                                    })}
                                    onClick={handleNavClick}
                                    title={isCollapsed ? item.label : ''} // Tooltip on collapse
                                >
                                    <Icon size={24} />
                                    {!isCollapsed && <span>{item.label}</span>}
                                </NavLink>
                            );
                        })}

                        {user && user.role === 'admin' && (
                            <NavLink
                                to="/admin"
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                style={({ isActive }) => ({
                                    ...navLinkStyle,
                                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                                    padding: isCollapsed ? '0.75rem' : '0.75rem',
                                    backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                                    color: isActive ? '#2563EB' : '#4B5563'
                                })}
                                onClick={handleNavClick}
                                title={isCollapsed ? "User Management" : ""}
                            >
                                <FiUsers size={24} />
                                {!isCollapsed && <span>User Management</span>}
                            </NavLink>
                        )}

                        {user && user.role === 'admin' && (
                            <>
                                {!isCollapsed && (
                                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#9CA3AF', marginTop: '1rem', marginBottom: '0.5rem', paddingLeft: '0.75rem', textTransform: 'uppercase' }}>
                                        Reports
                                    </p>
                                )}
                                <NavLink
                                    to="/report-builder"
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    style={({ isActive }) => ({
                                        ...navLinkStyle,
                                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                                        padding: isCollapsed ? '0.75rem' : '0.75rem',
                                        backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                                        color: isActive ? '#2563EB' : '#4B5563'
                                    })}
                                    onClick={handleNavClick}
                                    title={isCollapsed ? "Report Builder" : ""}
                                >
                                    <FiFileText size={24} />
                                    {!isCollapsed && <span>Report Builder</span>}
                                </NavLink>
                                <NavLink
                                    to="/report-scheduler"
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                    style={({ isActive }) => ({
                                        ...navLinkStyle,
                                        justifyContent: isCollapsed ? 'center' : 'flex-start',
                                        padding: isCollapsed ? '0.75rem' : '0.75rem',
                                        backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                                        color: isActive ? '#2563EB' : '#4B5563'
                                    })}
                                    onClick={handleNavClick}
                                    title={isCollapsed ? "Report Scheduler" : ""}
                                >
                                    <FiClock size={24} />
                                    {!isCollapsed && <span>Report Scheduler</span>}
                                </NavLink>
                            </>
                        )}
                    </div>
                </nav>

                {/* Bottom Section */}
                <div style={{ 
                    padding: isCollapsed ? '1rem 0.5rem' : '1rem', 
                    borderTop: '1px solid #E5E7EB',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isCollapsed ? 'center' : 'stretch',
                    gap: '0.5rem'
                }}>
                    <button onClick={handleLogout} 
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isCollapsed ? 'center' : 'flex-start',
                            gap: '0.75rem',
                            width: '100%',
                            padding: '0.75rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            backgroundColor: '#FEF2F2',
                            color: '#EF4444',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                        title={isCollapsed ? "Logout" : ""}
                    >
                        <FiLogOut size={20} />
                        {!isCollapsed && <span>Logout</span>}
                    </button>

                    {!isCollapsed && (
                        <div style={{textAlign: 'center', fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.25rem'}}>v1.0.0</div>
                    )}
                </div>
            </aside>
        </>
    );
};

const navLinkStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    borderRadius: '0.375rem',
    fontWeight: '500',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    textDecoration: 'none',
    width: '100%'
};

export default Sidebar;
