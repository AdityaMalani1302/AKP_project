import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiArrowLeft, FiBarChart2, FiTrendingUp, FiActivity, FiZap, FiBox } from 'react-icons/fi';
import api from '../../api';

const StatisticalProcessControl = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('clay');

    // Fetch sand properties data from Quality Lab
    const { data: sandRecords = [], isLoading } = useQuery({
        queryKey: ['sandPropertiesForSPC'],
        queryFn: async () => {
            const res = await api.get('/quality-lab/sand');
            return res.data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    // Helper function to calculate statistics
    const calculateStats = (values) => {
        if (!values || values.length === 0) return { avg: null, stdDev: null, cpk: null, count: 0 };
        
        const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));
        if (validValues.length === 0) return { avg: null, stdDev: null, cpk: null, count: 0 };
        
        // Calculate average
        const sum = validValues.reduce((a, b) => a + b, 0);
        const avg = sum / validValues.length;
        
        // Calculate standard deviation
        const squaredDiffs = validValues.map(value => Math.pow(value - avg, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / validValues.length;
        const stdDev = Math.sqrt(avgSquaredDiff);
        
        // Calculate Cpk (assuming spec limits based on typical foundry standards)
        // Using typical spec limits - you may need to adjust these
        const cpk = null; // Placeholder - Cpk calculation requires specification limits
        
        return { avg, stdDev, cpk, count: validValues.length };
    };

    // Extract data from records
    const processedData = useMemo(() => {
        if (!sandRecords || sandRecords.length === 0) return {};

        return {
            // Clay Parameters
            totalClay: calculateStats(sandRecords.map(r => parseFloat(r['TOTAL CLAY 11.0 - 14.50%'])).filter(v => !isNaN(v))),
            activeClay: calculateStats(sandRecords.map(r => parseFloat(r['ACTIVE CLAY 7.0 - 9.0%'])).filter(v => !isNaN(v))),
            deadClay: calculateStats(sandRecords.map(r => parseFloat(r['DEAD CLAY 3.0 - 4.50%'])).filter(v => !isNaN(v))),
            
            // Strength Parameters
            cgs: calculateStats(sandRecords.map(r => parseFloat(r['Green Compression Strength'])).filter(v => !isNaN(v))),
            wetTensile: calculateStats(sandRecords.map(r => parseFloat(r['Wet Tensile Strength'])).filter(v => !isNaN(v))),
            compactibility: calculateStats(sandRecords.map(r => parseFloat(r['Compactability In %'])).filter(v => !isNaN(v))),
            
            // Composition Parameters
            volatile: calculateStats(sandRecords.map(r => parseFloat(r['VOLATILE MATTER 2.30 - 3.50%'])).filter(v => !isNaN(v))),
            loi: calculateStats(sandRecords.map(r => parseFloat(r['LOSS ON IGNITION 4.0 - 7.0%'])).filter(v => !isNaN(v))),
            moisture: calculateStats(sandRecords.map(r => parseFloat(r['Moisture In %'])).filter(v => !isNaN(v))),
            permeability: calculateStats(sandRecords.map(r => parseFloat(r['Permeability In No'])).filter(v => !isNaN(v))),
            
            // Process Parameters
            sandTemp: calculateStats(sandRecords.map(r => parseFloat(r['Return Sand Temp'])).filter(v => !isNaN(v))),
        };
    }, [sandRecords]);

    // Get latest record date for "Last Updated"
    const getLastUpdated = () => {
        if (!sandRecords || sandRecords.length === 0) return 'No data available';
        const latestRecord = sandRecords[0];
        return latestRecord.Date ? new Date(latestRecord.Date).toLocaleDateString() : 'No data available';
    };

    const handleBack = () => {
        navigate('/quality-management-system');
    };

    const tabs = [
        { id: 'clay', label: 'CLAY PARAMETERS', icon: FiBox },
        { id: 'strength', label: 'STRENGTH PARAMETERS', icon: FiActivity },
        { id: 'composition', label: 'COMPOSITION PARAMETERS', icon: FiBarChart2 },
        { id: 'process', label: 'PROCESS PARAMETERS', icon: FiZap }
    ];

    const clayParameters = [
        { id: 'total-clay', name: 'total Clay', unit: '%', dataKey: 'totalClay' },
        { id: 'active-clay', name: 'active Clay', unit: '%', dataKey: 'activeClay' },
        { id: 'dead-clay', name: 'dead Clay', unit: '%', dataKey: 'deadClay' }
    ];

    const strengthParameters = [
        { id: 'cgs', name: 'cgs', unit: 'gm/cm²', dataKey: 'cgs' },
        { id: 'wet-tensile', name: 'wet Tensile Strength', unit: '', dataKey: 'wetTensile' },
        { id: 'compactibility', name: 'compactibility', unit: '%', dataKey: 'compactibility' }
    ];

    const compositionParameters = [
        { id: 'volatile', name: 'volatile Matter', unit: '%', dataKey: 'volatile' },
        { id: 'loi', name: 'loss On Ignition', unit: '%', dataKey: 'loi' },
        { id: 'moisture', name: 'moisture', unit: '%', dataKey: 'moisture' },
        { id: 'permeability', name: 'permeability', unit: '', dataKey: 'permeability' }
    ];

    const processParameters = [
        { id: 'sand-temp', name: 'sand Temperature', unit: '°C', dataKey: 'sandTemp' },
        { id: 'bentonite', name: 'bentonite Addition', unit: '', dataKey: null },
        { id: 'coal-dust', name: 'coal Dust Addition', unit: '', dataKey: null },
        { id: 'sand-time', name: 'new Sand Addition Time', unit: '', dataKey: null },
        { id: 'sand-weight', name: 'new Sand Addition Weight', unit: '', dataKey: null }
    ];

    const getCurrentParameters = () => {
        switch (activeTab) {
            case 'clay': return clayParameters;
            case 'strength': return strengthParameters;
            case 'composition': return compositionParameters;
            case 'process': return processParameters;
            default: return clayParameters;
        }
    };

    const ParameterCard = ({ param }) => {
        const stats = param.dataKey ? processedData[param.dataKey] : null;
        const hasData = stats && stats.avg !== null;
        
        return (
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB',
                position: 'relative',
                minHeight: '180px'
            }}>
                {/* Info icon */}
                <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    width: '24px',
                    height: '24px',
                    backgroundColor: '#3B82F6',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                }}>
                    <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>i</span>
                </div>

                {/* Parameter Name */}
                <h4 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: '#374151',
                    textTransform: 'lowercase'
                }}>
                    {param.name}
                </h4>

                {/* Main Value */}
                <div style={{ marginBottom: '1rem' }}>
                    <span style={{
                        fontSize: '2.5rem',
                        fontWeight: '300',
                        color: hasData ? '#374151' : '#9CA3AF'
                    }}>
                        {hasData ? stats.avg.toFixed(2) : 'N/A'}
                    </span>
                    <span style={{
                        fontSize: '0.875rem',
                        color: '#9CA3AF',
                        marginLeft: '0.25rem'
                    }}>
                        avg {param.unit}
                    </span>
                </div>

                {/* Stats Grid */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    marginTop: '1rem'
                }}>
                    <div>
                        <p style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '0.75rem',
                            color: '#6B7280',
                            textTransform: 'capitalize'
                        }}>
                            Std Dev
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            {hasData && stats.stdDev !== null ? stats.stdDev.toFixed(2) : 'N/A'}
                        </p>
                    </div>
                    <div>
                        <p style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '0.75rem',
                            color: '#6B7280',
                            textTransform: 'capitalize'
                        }}>
                            Cpk
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            {hasData && stats.cpk !== null ? stats.cpk.toFixed(2) : 'N/A'}
                        </p>
                    </div>
                </div>

                {/* Last Updated */}
                <p style={{
                    margin: '1rem 0 0 0',
                    fontSize: '0.75rem',
                    color: '#9CA3AF'
                }}>
                    Last Updated: {getLastUpdated()}
                </p>
            </div>
        );
    };

    return (
        <div className="card">
            {/* Header */}
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
                
                <h2 style={{ 
                    margin: 0, 
                    fontSize: '1.75rem', 
                    fontWeight: '700', 
                    color: '#4F46E5',
                    textAlign: 'center'
                }}>
                    Foundry Process Control Dashboard
                </h2>
            </div>

            {/* Top Cards - Foundry Readings & Analysis Results */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                {/* Foundry Readings Card */}
                <div
                    onClick={() => navigate('/quality-management-system/foundry-readings')}
                    style={{
                        backgroundColor: '#3B82F6',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 12px -2px rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.3)';
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.5rem'
                    }}>
                        <FiBarChart2 size={24} />
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.1rem',
                            fontWeight: '600'
                        }}>
                            Foundry Readings
                        </h3>
                    </div>
                    <p style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        opacity: 0.9
                    }}>
                        View and manage detailed readings
                    </p>
                </div>

                {/* Analysis Results Card */}
                <div
                    onClick={() => navigate('/quality-management-system/sand-testing/analysis-results')}
                    style={{
                        backgroundColor: '#16A34A',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 12px -2px rgba(22, 163, 74, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(22, 163, 74, 0.3)';
                    }}
                >
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.5rem'
                    }}>
                        <FiTrendingUp size={24} />
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.1rem',
                            fontWeight: '600'
                        }}>
                            Analysis Results
                        </h3>
                    </div>
                    <p style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        opacity: 0.9
                    }}>
                        Explore trends and analytics
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '2px solid #E5E7EB',
                marginBottom: '1.5rem',
                flexWrap: 'wrap',
                gap: '0.5rem'
            }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.875rem 1.25rem',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderBottom: isActive ? '3px solid #4F46E5' : '3px solid transparent',
                                color: isActive ? '#4F46E5' : '#6B7280',
                                fontSize: '0.8rem',
                                fontWeight: isActive ? '600' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Parameter Cards Grid */}
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                    Loading data from Quality Lab...
                </div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {getCurrentParameters().map((param) => (
                        <ParameterCard key={param.id} param={param} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default StatisticalProcessControl;
