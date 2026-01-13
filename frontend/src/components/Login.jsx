import React, { useState } from 'react';
import { toast } from 'sonner';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLoader, FiHexagon } from 'react-icons/fi';

const Login = ({ setToken, setUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        
        try {
            const res = await api.post('/auth/login', { username, password });
            if (res.data.success) {
                toast.success('Login successful!');
                setUser({ 
                    username: res.data.username, 
                    role: res.data.role,
                    allowedPages: res.data.allowedPages || []
                });
                navigate('/');
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Login failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decoration circles */}
            <div style={{
                position: 'absolute',
                top: '-100px',
                right: '-100px',
                width: '400px',
                height: '400px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%'
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-150px',
                left: '-150px',
                width: '500px',
                height: '500px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '50%'
            }} />

            <div className="card" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2.5rem',
                position: 'relative',
                zIndex: 1,
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                borderRadius: '16px'
            }}>
                {/* Logo/Brand Section */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ 
                            color: '#0EA5E9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <FiHexagon size={48} strokeWidth={1.5} />
                        </div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#111827', margin: 0 }}>
                            Smart ERP
                        </h1>
                    </div>
                    <p style={{ color: '#6B7280', fontSize: '0.95rem' }}>
                        Sign in to your account
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: '#FEF2F2',
                        color: '#DC2626',
                        padding: '0.875rem 1rem',
                        borderRadius: '0.5rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: '1px solid #FECACA'
                    }}>
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label htmlFor="login-username" style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem', 
                            fontSize: '0.875rem', 
                            fontWeight: '600', 
                            color: '#374151' 
                        }}>
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
                            disabled={isLoading}
                            aria-required="true"
                            style={{
                                padding: '0.75rem 1rem',
                                fontSize: '1rem',
                                borderRadius: '0.5rem'
                            }}
                        />
                    </div>

                    <div>
                        <label htmlFor="login-password" style={{ 
                            display: 'block', 
                            marginBottom: '0.5rem', 
                            fontSize: '0.875rem', 
                            fontWeight: '600', 
                            color: '#374151' 
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="login-password"
                                type={showPassword ? 'text' : 'password'}
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                                disabled={isLoading}
                                aria-required="true"
                                style={{
                                    padding: '0.75rem 1rem',
                                    paddingRight: '3rem',
                                    fontSize: '1rem',
                                    borderRadius: '0.5rem'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#6B7280',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                tabIndex={-1}
                            >
                                {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={isLoading}
                        style={{ 
                            width: '100%', 
                            padding: '0.875rem', 
                            fontSize: '1rem',
                            borderRadius: '0.5rem',
                            marginTop: '0.5rem',
                            background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)',
                            border: 'none',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            opacity: isLoading ? 0.8 : 1,
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? (
                            <>
                                <FiLoader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <p style={{ 
                    textAlign: 'center', 
                    marginTop: '1.5rem', 
                    fontSize: '0.8rem', 
                    color: '#9CA3AF' 
                }}>
                    Smart ERP v1.0 • © 2025
                </p>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
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
