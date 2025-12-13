import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ user, requiredRole, requiredPage, children }) => {
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check role-based access (for admin-only pages)
    if (requiredRole && user.role !== requiredRole) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Access Denied</h2>
            <p>You do not have permission to view this page.</p>
        </div>;
    }

    // Check page-based access (for employees with restricted pages)
    if (requiredPage && user.role !== 'admin') {
        const allowedPages = user.allowedPages || [];
        // If user has 'all' permission or the specific page, allow access
        const hasAccess = allowedPages.includes('all') || allowedPages.includes(requiredPage);
        
        if (!hasAccess) {
            return <div style={{ 
                padding: '2rem', 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
                <h2 style={{ color: '#1F2937', marginBottom: '0.5rem' }}>Access Denied</h2>
                <p style={{ color: '#6B7280', maxWidth: '400px' }}>
                    You do not have permission to view this page. Please contact your administrator if you need access.
                </p>
            </div>;
        }
    }

    return children ? children : <Outlet />;
};

export default PrivateRoute;
