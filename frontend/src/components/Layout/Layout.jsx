import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

import Breadcrumbs from '../common/Breadcrumbs';

const Layout = ({ children, user, onLogout }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Auto-close sidebar on mobile, auto-open on desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6' }}>
            {/* Skip Navigation Link */}
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            <Sidebar user={user} onLogout={onLogout} isOpen={sidebarOpen} onClose={closeSidebar} />
            <div style={{
                flex: 1,
                marginLeft: window.innerWidth >= 768 && sidebarOpen ? '260px' : '0',
                display: 'flex',
                flexDirection: 'column',
                transition: 'margin-left 0.3s ease-in-out',
                width: '100%',
                minWidth: 0
            }}>
                <Header user={user} onMenuClick={toggleSidebar} />
                <main
                    id="main-content"
                    style={{ flex: 1, padding: '1rem' }}
                    role="main"
                    aria-label="Main content"
                >
                    <Breadcrumbs />
                    {children}
                </main>
            </div>
            <style>{`
                @media (max-width: 767px) {
                    main {
                        padding: 1rem !important;
                    }
                }
                @media (min-width: 768px) {
                    main {
                        padding: 2rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Layout;
