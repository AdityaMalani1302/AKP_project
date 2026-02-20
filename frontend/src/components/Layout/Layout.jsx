import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

import Breadcrumbs from '../common/Breadcrumbs';

const SIDEBAR_STATE_KEY = 'smart-erp-sidebar-open';

const Layout = ({ children, user, onLogout }) => {
    // Initialize sidebar state from localStorage (default to true for desktop)
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
            return saved !== null ? saved === 'true' : true;
        }
        return false; // Mobile starts closed
    });

    // Cleanup stale WebGL contexts on route change to prevent VERTEX errors
    useEffect(() => {
        const cleanupWebGL = () => {
            try {
                // Find and cleanup all canvas WebGL contexts
                const canvases = document.querySelectorAll('canvas');
                canvases.forEach(canvas => {
                    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                    if (gl) {
                        // Try to get the loseContext extension
                        const ext = gl.getExtension('WEBGL_lose_context');
                        if (ext) {
                            ext.loseContext();
                        }
                    }
                });
            } catch (e) {
                // Ignore cleanup errors
            }
        };

        // Cleanup on mount and unmount
        cleanupWebGL();

        // Also cleanup before page unload
        window.addEventListener('beforeunload', cleanupWebGL);
        return () => window.removeEventListener('beforeunload', cleanupWebGL);
    }, []);

    // Save to localStorage when sidebar state changes (desktop only)
    useEffect(() => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) {
            localStorage.setItem(SIDEBAR_STATE_KEY, String(sidebarOpen));
        }
    }, [sidebarOpen]);

    // Auto-close sidebar on mobile, respect localStorage on desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) {
                setSidebarOpen(false);
            } else {
                // On desktop, restore from localStorage
                const saved = localStorage.getItem(SIDEBAR_STATE_KEY);
                setSidebarOpen(saved !== null ? saved === 'true' : true);
            }
        };

        // Only run on mount for initial responsive check
        // Don't override user preference on every resize
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const closeSidebar = () => setSidebarOpen(false);

    // Calculate main content margin
    // Desktop: 260px (Open) vs 80px (Collapsed)
    // Mobile: 0 (Fixed Sidebar Overlay)
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    const mainMargin = isDesktop ? (sidebarOpen ? '260px' : '80px') : '0';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F3F4F6' }}>
            {/* Skip Navigation Link */}
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            <Sidebar user={user} onLogout={onLogout} isOpen={sidebarOpen} onClose={closeSidebar} />
            <div style={{
                flex: 1,
                marginLeft: mainMargin,
                display: 'flex',
                flexDirection: 'column',
                transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
