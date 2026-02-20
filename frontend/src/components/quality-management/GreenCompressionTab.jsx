import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import DatePicker from '../common/DatePicker';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const GreenCompressionTab = () => {
    const navigate = useNavigate();
    const chartRef = useRef(null);
    const [formData, setFormData] = useState({
        startDate: '2026-01-01',
        endDate: new Date().toISOString().split('T')[0],
        showCpCpk: false
    });

    // Fetch real data from Sand Properties API
    const { data: sandRecords = [], isLoading } = useQuery({
        queryKey: ['sandProperties-chart', 'gcs', formData.startDate, formData.endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('startDate', formData.startDate);
            params.append('endDate', formData.endDate);
            const res = await api.get(`/quality-lab/sand?${params.toString()}`);
            return res.data;
        },
    });

    // Extract Green Compression Strength values from records (sorted by Date ASC)
    const chartData = useMemo(() => {
        const sorted = [...sandRecords].sort((a, b) => new Date(a.Date) - new Date(b.Date));
        return sorted
            .map(r => parseFloat(r['Green Compression Strength']))
            .filter(v => !isNaN(v) && v > 0);
    }, [sandRecords]);

    const labels = chartData.map((_, i) => `R${i + 1}`);

    // Chart configuration with colored zones
    const data = {
        labels: labels,
        datasets: [
            {
                label: 'G.C. Strength',
                data: chartData,
                borderColor: '#3B82F6',
                backgroundColor: '#3B82F6',
                pointBackgroundColor: chartData.map(val => {
                    if (val < 1200 || val > 1400) return '#EF4444'; // Red - out of spec
                    if (val < 1225 || val > 1375) return '#F59E0B'; // Yellow - warning
                    return '#22C55E'; // Green - in spec
                }),
                pointBorderColor: chartData.map(val => {
                    if (val < 1200 || val > 1400) return '#DC2626';
                    if (val < 1225 || val > 1375) return '#D97706';
                    return '#16A34A';
                }),
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.1,
                borderWidth: 1.5
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `Reading ${context.label}: ${context.parsed.y} gm/cm²`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Reading',
                    font: { size: 12 }
                },
                ticks: {
                    maxTicksLimit: 20,
                    font: { size: 10 }
                },
                grid: {
                    display: false
                }
            },
            y: {
                min: 1100,
                max: 1500,
                title: {
                    display: false
                },
                ticks: {
                    stepSize: 100,
                    font: { size: 11 }
                },
                grid: {
                    color: '#E5E7EB',
                    drawBorder: false
                }
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeInOutQuart'
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleBack = () => {
        navigate('/quality-management-system/sand-testing');
    };

    // Calculate statistics for Cp/Cpk cards
    const calculateStats = () => {
        if (chartData.length === 0) {
            return { average: '0', stdDev: '0', cp: '0', cpk: '0', sigma3: '0', sigma6: '0', upperLimit: '1500.000', lowerLimit: '1100.000' };
        }
        const data = chartData;
        const n = data.length;
        
        // Average
        const average = data.reduce((a, b) => a + b, 0) / n;
        
        // Standard Deviation
        const variance = data.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        
        // Specification limits for Green Compression Strength
        const upperLimit = 1500;
        const lowerLimit = 1100;
        
        // Cp and Cpk
        const cp = stdDev > 0 ? (upperLimit - lowerLimit) / (6 * stdDev) : 0;
        const cpu = stdDev > 0 ? (upperLimit - average) / (3 * stdDev) : 0;
        const cpl = stdDev > 0 ? (average - lowerLimit) / (3 * stdDev) : 0;
        const cpk = Math.min(cpu, cpl);
        
        return {
            average: average.toFixed(3),
            stdDev: stdDev.toFixed(3),
            cp: cp.toFixed(3),
            cpk: cpk.toFixed(3),
            sigma3: (3 * stdDev).toFixed(3),
            sigma6: (6 * stdDev).toFixed(3),
            upperLimit: upperLimit.toFixed(3),
            lowerLimit: lowerLimit.toFixed(3)
        };
    };

    const stats = calculateStats();

    const StatsCard = ({ title, value, color }) => (
        <div style={{
            backgroundColor: color,
            borderRadius: '8px',
            padding: '1rem 0.5rem',
            textAlign: 'center',
            color: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
            <div style={{
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem'
            }}>
                {title}
            </div>
            <div style={{
                fontSize: '1.125rem',
                fontWeight: '500'
            }}>
                {value}
            </div>
        </div>
    );

    return (
        <div>
            {/* Back Button */}
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

            {/* Title */}
            <h2 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1F2937',
                textAlign: 'center'
            }}>
                AKP FOUNDRIES - RUN CHART
            </h2>



            {/* Characteristics Info */}
            <div style={{
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#374151'
            }}>
                <strong>Characteristics:</strong> G.C. STRENGTH gm/cm² | <strong>Specification:</strong> 1100 TO 1500 gm/cm²
            </div>

            {/* Date Range and Actions */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center'
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6B7280',
                            marginBottom: '0.25rem'
                        }}>
                            Start Date
                        </label>
                        <DatePicker
                            name="startDate"
                            value={formData.startDate}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.75rem',
                            color: '#6B7280',
                            marginBottom: '0.25rem'
                        }}>
                            End Date
                        </label>
                        <DatePicker
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center'
                }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: '#374151',
                        cursor: 'pointer'
                    }}>
                        <input
                            type="checkbox"
                            name="showCpCpk"
                            checked={formData.showCpCpk}
                            onChange={handleInputChange}
                            style={{ cursor: 'pointer' }}
                        />
                        Show Cp/Cpk
                    </label>

                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
                    Loading chart data...
                </div>
            )}

            {/* No Data State */}
            {!isLoading && chartData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No data available</p>
                    <p style={{ fontSize: '0.875rem' }}>No Green Compression Strength records found for the selected date range.</p>
                </div>
            )}

            {/* Chart Container with Colored Zones */}
            {!isLoading && chartData.length > 0 && (
                <>
                    <div style={{
                        position: 'relative',
                        height: '400px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        backgroundColor: 'white'
                    }}>
                        {/* Background Zones */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Red Zone - Top */}
                            <div style={{
                                height: '10%',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                borderBottom: '2px solid #EF4444'
                            }} />
                            {/* Yellow Zone - Top */}
                            <div style={{
                                height: '10%',
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                borderBottom: '2px solid #F59E0B'
                            }} />
                            {/* Green Zone - Middle */}
                            <div style={{
                                height: '60%',
                                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                                borderBottom: '2px solid #22C55E'
                            }} />
                            {/* Yellow Zone - Bottom */}
                            <div style={{
                                height: '10%',
                                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                borderBottom: '2px solid #F59E0B'
                            }} />
                            {/* Red Zone - Bottom */}
                            <div style={{
                                height: '10%',
                                backgroundColor: 'rgba(239, 68, 68, 0.2)'
                            }} />
                        </div>

                        {/* Chart */}
                        <div style={{
                            position: 'relative',
                            height: '100%',
                            padding: '1rem'
                        }}>
                            <Line ref={chartRef} data={data} options={options} />
                        </div>
                    </div>

                    {/* Legend */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '2rem',
                        marginTop: '1rem',
                        fontSize: '0.875rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '16px', height: '16px', backgroundColor: '#22C55E', borderRadius: '3px' }} />
                            <span>In Specification</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '16px', height: '16px', backgroundColor: '#F59E0B', borderRadius: '3px' }} />
                            <span>Warning</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '16px', height: '16px', backgroundColor: '#EF4444', borderRadius: '3px' }} />
                            <span>Out of Specification</span>
                        </div>
                    </div>
                </>
            )}

            {/* Statistical Cards - Show when Cp/Cpk checkbox is checked */}
            {formData.showCpCpk && chartData.length > 0 && (
                <div style={{
                    marginTop: '1.5rem',
                    padding: '1.5rem',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '1rem'
                    }}>
                        <StatsCard title="Average" value={stats.average} color="#4CAF50" />
                        <StatsCard title="Std Deviation" value={stats.stdDev} color="#2196F3" />
                        <StatsCard title="Cp" value={stats.cp} color="#3F51B5" />
                        <StatsCard title="Cpk" value={stats.cpk} color="#009688" />
                        <StatsCard title="3σ" value={stats.sigma3} color="#FF9800" />
                        <StatsCard title="6σ" value={stats.sigma6} color="#F44336" />
                        <StatsCard title="Upper Limit" value={stats.upperLimit} color="#673AB7" />
                        <StatsCard title="Lower Limit" value={stats.lowerLimit} color="#9C27B0" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default GreenCompressionTab;
