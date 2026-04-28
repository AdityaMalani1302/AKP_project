import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { FiEye, FiEyeOff, FiLoader, FiHexagon } from 'react-icons/fi';

const Login = ({ setUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const savedUsername = localStorage.getItem('rememberedUsername');
        if (savedUsername) {
            setUsername(savedUsername);
            setRememberMe(true);
        }
        localStorage.removeItem('rememberedPassword');
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const res = await api.post('/auth/login', { username, password });
            if (res.data.success) {
                if (rememberMe) {
                    localStorage.setItem('rememberedUsername', username);
                } else {
                    localStorage.removeItem('rememberedUsername');
                }
                
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
            background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', // Light blue gradient
            fontFamily: "'Open Sans', sans-serif"
        }}>
            <div className="login-card" style={{
                width: '100%',
                maxWidth: '380px',
                padding: '3rem 2rem',
                background: '#ffffff', // White card
                borderTopLeftRadius: '90px',
                borderBottomRightRadius: '0px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                border: '1px solid #e5e7eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                        background: '#0ea5e9', // Accent blue
                        borderRadius: '12px',
                        width: '56px',
                        height: '56px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        <FiHexagon size={32} color="white" fill="white" />
                    </div>
                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '800',
                        color: '#111827', // Primary dark
                        margin: 0,
                        fontFamily: "'Open Sans', sans-serif"
                    }}>
                        Smart ERP
                    </h1>
                </div>

                <h2 style={{
                    color: '#0ea5e9', // Accent blue
                    fontSize: '2rem',
                    fontWeight: '600',
                    marginBottom: '2rem',
                    textAlign: 'center'
                }}>Sign in</h2>

                {/* Removed static error box in favor of sonner toast */}

                <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Username Input */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1.5rem',
                                borderRadius: '9999px',
                                border: '1px solid #e5e7eb', // Light border
                                background: '#f9fafb', // Light gray background
                                color: '#111827', // Dark text
                                fontSize: '1rem',
                                outline: 'none',
                                placeholderColor: '#6b7280'
                            }}
                        />
                    </div>

                    {/* Password Input */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1.5rem',
                                paddingRight: '3rem',
                                borderRadius: '9999px',
                                border: '1px solid #e5e7eb',
                                background: '#f9fafb',
                                color: '#111827',
                                fontSize: '1rem',
                                outline: 'none'
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '1.25rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6b7280' // Gray icon
                            }}
                        >
                            {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                        </button>
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.85rem',
                        color: '#6b7280', // Gray text
                        padding: '0 0.5rem'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.5rem' }}>
                            <input 
                                type="checkbox" 
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                style={{ cursor: 'pointer', accentColor: '#0ea5e9', width: '16px', height: '16px' }} 
                            />
                            <span>Remember me</span>
                        </label>
                        <a href="#" style={{ textDecoration: 'none', color: '#0ea5e9' }}></a>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            fontSize: '1.5rem',
                            borderRadius: '9999px',
                            marginTop: '1rem',
                            background: '#111827', // Primary dark
                            color: '#ffffff', // White text
                            border: 'none',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.9 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                        onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                                <FiLoader size={20} style={{ animation: 'spin 1s linear infinite' }} />
                                Processing
                            </div>
                        ) : (
                            'Log in'
                        )}
                    </button>
                </form>

                <p style={{
                    marginTop: '2rem',
                    fontSize: '0.75rem',
                    color: '#6b7280', // Gray text
                    opacity: 0.8,
                    textAlign: 'center',
                    fontWeight: '500',
                    width: '100%',
                    maxWidth: '100%'
                }}>
                    © Copyright 2026 All Right Reserved by AKP Foundries Pvt. Ltd.
                </p>            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .input-field::placeholder {
                    color: #4B5563;
                }
            `}</style>
        </div>
    );
};

export default Login;