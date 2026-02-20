import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiActivity, FiTrendingUp } from 'react-icons/fi';

const QualityManagementSystem = () => {
    const navigate = useNavigate();

    const cards = [
        {
            id: 'sand-testing',
            title: 'Sand Testing',
            description: 'Monitor and analyze sand quality parameters',
            icon: FiActivity,
            color: '#3B82F6',
            bgGradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
            borderColor: '#BFDBFE',
            path: '/quality-management-system/sand-testing'
        },
        {
            id: 'spc',
            title: 'Statistical Process Control',
            description: 'Track process variations and control limits',
            icon: FiTrendingUp,
            color: '#8B5CF6',
            bgGradient: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
            borderColor: '#DDD6FE',
            path: '/quality-management-system/spc'
        }
    ];

    const handleCardClick = (path) => {
        navigate(path);
    };

    return (
        <div className="card">
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1F2937' }}>
                    Process Control Dashboard
                </h2>
                <p style={{ margin: 0, color: '#6B7280', fontSize: '0.95rem' }}>
                    Quality Management System - Monitor and control your sand quality processes
                </p>
            </div>

            {/* Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem'
            }}>
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.id}
                            onClick={() => handleCardClick(card.path)}
                            style={{
                                background: card.bgGradient,
                                border: `1px solid ${card.borderColor}`,
                                borderRadius: '16px',
                                padding: '1.5rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                            }}
                        >
                            {/* Header Row */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                }}>
                                    <Icon size={24} color={card.color} />
                                </div>
                                <div>
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '1.1rem',
                                        fontWeight: '600',
                                        color: '#1F2937'
                                    }}>
                                        {card.title}
                                    </h3>
                                </div>
                            </div>

                            {/* Description */}
                            <p style={{
                                margin: '0 0 1.5rem 0',
                                fontSize: '0.9rem',
                                color: '#6B7280',
                                lineHeight: '1.5'
                            }}>
                                {card.description}
                            </p>


                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default QualityManagementSystem;
