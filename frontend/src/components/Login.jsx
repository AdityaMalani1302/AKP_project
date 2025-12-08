import React, { useState } from 'react';
import { toast } from 'sonner';
import api from '../api';
import { useNavigate } from 'react-router-dom';

const Login = ({ setToken, setUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login', { username, password });
            if (res.data.success) {
                toast.success('Login successful!');
                setUser({ username: res.data.username, role: res.data.role });
                navigate('/');
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed';
            setError(msg);
            toast.error(msg);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: '#F3F4F6',
            padding: '1rem'
        }}>
            <div className="card" style={{
                width: '100%',
                maxWidth: '400px',
                padding: '2rem'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>Welcome Back</h1>
                    <p style={{ color: '#6B7280', marginTop: '0.5rem' }}>Please sign in to your account</p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#FEF2F2',
                        color: '#EF4444',
                        padding: '0.75rem',
                        borderRadius: '0.375rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label htmlFor="login-username" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            Username
                        </label>
                        <input
                            id="login-username"
                            type="text"
                            className="input-field"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            aria-required="true"
                        />
                    </div>

                    <div>
                        <label htmlFor="login-password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                            Password
                        </label>
                        <input
                            id="login-password"
                            type="password"
                            className="input-field"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            aria-required="true"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}>
                        Sign In
                    </button>
                </form>
            </div>

            <style>{`
                @media (max-width: 480px) {
                    .card {
                        padding: 1.5rem !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default Login;
