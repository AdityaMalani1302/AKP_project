import React from 'react';
import './dashboard/Dashboard.css';

const HomePage = ({ user }) => {
    // Get current time for greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <div className="homepage-container">
            {/* Welcome Banner */}
            <div className="welcome-banner" style={{
                background: 'linear-gradient(135deg, #38BDF8 0%, #0EA5E9 100%)',
                borderRadius: '16px',
                padding: '2rem 2.5rem',
                color: 'white',
                boxShadow: '0 10px 40px rgba(56, 189, 248, 0.4)',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background decorations */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '200px',
                    height: '200px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '50%'
                }} />
                <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '30%',
                    width: '100px',
                    height: '100px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '50%'
                }} />
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ 
                        fontSize: '0.9rem', 
                        opacity: 0.9,
                        marginBottom: '0.5rem',
                        fontWeight: '500'
                    }}>
                        {getGreeting()} 👋
                    </div>
                    <h1 style={{ 
                        fontSize: '2rem', 
                        fontWeight: '700',
                        margin: 0,
                        textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}>
                        Welcome, <span style={{ 
                            background: 'rgba(255,255,255,0.2)',
                            padding: '0.2rem 0.75rem',
                            borderRadius: '8px',
                            display: 'inline-block'
                        }}>{user?.username || 'User'}</span>!
                    </h1>
                    
                    {/* Role Badge and Date */}
                    <div style={{
                        marginTop: '1.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{
                            background: 'rgba(255,255,255,0.2)',
                            padding: '0.4rem 1rem',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {user?.role === 'admin' ? '🛡️ Administrator' : '👤 User'}
                        </span>
                        <span style={{
                            fontSize: '0.85rem',
                            opacity: 0.8
                        }}>
                            📅 {new Date().toLocaleDateString('en-IN', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
