import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = ({ user, requiredRole, children }) => {
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole && user.role !== requiredRole) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>Access Denied</h2>
            <p>You do not have permission to view this page.</p>
        </div>;
    }

    return children ? children : <Outlet />;
};

export default PrivateRoute;
