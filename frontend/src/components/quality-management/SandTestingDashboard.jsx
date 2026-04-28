import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { 
    TbArrowsVertical, 
    TbDroplet, 
    TbRulerMeasure, 
    TbWind, 
    TbArrowsDiff 
} from 'react-icons/tb';

const SandTestingDashboard = () => {
    const navigate = useNavigate();

    const cards = [
        {
            id: 'green-compression',
            title: 'Green Compressive Strength',
            description: 'Indicates the compactness and strength of green sand molds',
            icon: TbArrowsVertical,
            color: '#3B82F6',
            bgColor: '#EFF6FF',
            path: '/quality-management-system/sand-testing/green-compression'
        },
        {
            id: 'moisture',
            title: 'Moisture Content',
            description: 'Measures water content to ensure optimal mold strength',
            icon: TbDroplet,
            color: '#9333EA',
            bgColor: '#F3E8FF',
            path: '/quality-management-system/sand-testing/moisture'
        },
        {
            id: 'compactibility',
            title: 'Compactibility',
            description: 'Evaluates the mold\'s ability to maintain shape under pressure',
            icon: TbRulerMeasure,
            color: '#10B981',
            bgColor: '#ECFDF5',
            path: '/quality-management-system/sand-testing/compactibility'
        },
        {
            id: 'permeability',
            title: 'Permeability',
            description: 'Measures gas escape capability during the casting process',
            icon: TbWind,
            color: '#F97316',
            bgColor: '#FFF7ED',
            path: '/quality-management-system/sand-testing/permeability'
        },
        {
            id: 'comparison',
            title: 'Comparison',
            description: 'Analyze and compare gas escape capabilities during the casting process',
            icon: TbArrowsDiff,
            color: '#3B82F6',
            bgColor: '#EFF6FF',
            path: '/quality-management-system/sand-testing/comparison'
        }
    ];

    const handleBack = () => {
        navigate('/quality-management-system');
    };

    const handleCardClick = (path) => {
        navigate(path);
    };

    return (
        <div className="card">
            {/* Header with Back Button */}
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    onClick={handleBack}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#F3F4F6',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        color: '#4B5563',
                        fontWeight: '500',
                        transition: 'background-color 0.2s',
                        marginBottom: '1rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                >
                    <FiArrowLeft size={18} />
                    Back
                </button>
                
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.75rem',
                        fontWeight: '700',
                        color: '#8B5CF6',
                        background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        Sand Testing Dashboard
                    </h2>
                </div>
            </div>

            {/* Cards Grid - All 5 cards displayed together */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem'
            }}>
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={card.id}
                            onClick={() => handleCardClick(card.path)}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '2rem',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                border: '1px solid #E5E7EB',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                            }}
                        >
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '16px',
                                backgroundColor: card.bgColor,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '1.25rem'
                            }}>
                                <Icon size={32} color={card.color} />
                            </div>
                            
                            <h3 style={{
                                margin: '0 0 0.75rem 0',
                                fontSize: '1.25rem',
                                fontWeight: '600',
                                color: '#1F2937'
                            }}>
                                {card.title}
                            </h3>
                            
                            <p style={{
                                margin: 0,
                                fontSize: '0.9rem',
                                color: '#6B7280',
                                lineHeight: '1.6'
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

export default SandTestingDashboard;
