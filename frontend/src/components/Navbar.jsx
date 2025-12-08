import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = ({ user }) => {
    return (
        <nav style={{
            display: 'flex',
            gap: '1rem',
            padding: '1rem',
            background: '#333',
            marginBottom: '2rem',
            borderBottom: '1px solid #444'
        }}>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Home</Link>

            <Link to="/database-explorer" style={{ color: '#fff', textDecoration: 'none' }}>Database Explorer</Link>
            {user && user.role === 'admin' && (
                <Link to="/admin" style={{ color: '#0f0', textDecoration: 'none' }}>Admin Dashboard</Link>
            )}
        </nav>
    );
};

export default Navbar;
