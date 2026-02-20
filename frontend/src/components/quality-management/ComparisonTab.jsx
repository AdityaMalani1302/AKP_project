import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPrinter, FiDownload } from 'react-icons/fi';
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

const ComparisonTab = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        startDate: '2026-01-01',
        endDate: '2026-02-03'
    });
    const [selectedParams, setSelectedParams] = useState({
        compactibility: true,
        moisture: true
    });
    const [showChart, setShowChart] = useState(true);

    // Fetch real data from Sand Properties API
    const { data: sandRecords = [], isLoading } = useQuery({
        queryKey: ['sandProperties-chart', 'comparison', formData.startDate, formData.endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('startDate', formData.startDate);
            params.append('endDate', formData.endDate);
            const res = await api.get(`/quality-lab/sand?${params.toString()}`);
            return res.data;
        },
    });

    // Extract Compactability and Moisture values (sorted by Date ASC)
    const sortedRecords = useMemo(() => {
        return [...sandRecords].sort((a, b) => new Date(a.Date) - new Date(b.Date));
    }, [sandRecords]);

    const compactibilityData = useMemo(() => {
        return sortedRecords.map(r => parseFloat(r['Compactability In %'])).filter(v => !isNaN(v));
    }, [sortedRecords]);

    const moistureData = useMemo(() => {
        return sortedRecords.map(r => parseFloat(r['Moisture In %'])).filter(v => !isNaN(v));
    }, [sortedRecords]);

    const maxLen = Math.max(compactibilityData.length, moistureData.length);
    const labels = Array.from({ length: maxLen }, (_, i) => `R${i + 1}`);

    // Chart configuration
    const data = {
        labels: labels,
        datasets: [
            ...(selectedParams.compactibility ? [{
                label: 'Compactibility',
                data: compactibilityData,
                borderColor: '#3B82F6',
                backgroundColor: '#3B82F6',
                pointBackgroundColor: '#3B82F6',
                pointBorderColor: '#2563EB',
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.3,
                borderWidth: 2
            }] : []),
            ...(selectedParams.moisture ? [{
                label: 'Moisture',
                data: moistureData,
                borderColor: '#22C55E',
                backgroundColor: '#22C55E',
                pointBackgroundColor: '#22C55E',
                pointBorderColor: '#16A34A',
                pointRadius: 3,
                pointHoverRadius: 5,
                tension: 0.3,
                borderWidth: 2
            }] : [])
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y}`;
                    }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: false
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
                min: 0,
                max: 60,
                title: {
                    display: true,
                    text: 'Readings',
                    font: { size: 12 }
                },
                ticks: {
                    stepSize: 15,
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
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleParamToggle = (param) => {
        setSelectedParams(prev => ({
            ...prev,
            [param]: !prev[param]
        }));
    };

    const handleBack = () => {
        navigate('/quality-management-system/sand-testing');
    };

    const handlePrint = () => {
        window.print();
    };

    // Check if dates are filled to show chart
    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            setShowChart(true);
        } else {
            setShowChart(false);
        }
    }, [formData.startDate, formData.endDate]);

    return (
        <div>
            {/* Header with Back and Print buttons */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
            }}>
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
                        transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                >
                    <FiArrowLeft size={18} />
                    Back
                </button>

                <div style={{
                    display: 'flex',
                    gap: '0.5rem'
                }}>
                    <button
                        onClick={handlePrint}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        <FiPrinter size={16} />
                        PRINT CHART
                    </button>
                </div>
            </div>

            {/* Title */}
            <h2 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1F2937',
                textAlign: 'center'
            }}>
                AKP FOUNDRIES - PERFORMANCE COMPARISON
            </h2>

            {/* Date Range and Parameter Selection */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '2rem',
                marginBottom: '1.5rem'
            }}>
                {/* Date Fields */}
                <div style={{
                    display: 'flex',
                    gap: '2rem',
                    flex: '1'
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

                {/* Parameter Checkboxes */}
                <div style={{
                    display: 'flex',
                    gap: '1.5rem',
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
                            checked={selectedParams.compactibility}
                            onChange={() => handleParamToggle('compactibility')}
                            style={{ cursor: 'pointer' }}
                        />
                        Compactibility
                    </label>
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
                            checked={selectedParams.moisture}
                            onChange={() => handleParamToggle('moisture')}
                            style={{ cursor: 'pointer' }}
                        />
                        Moisture
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
            {!isLoading && showChart && (selectedParams.compactibility || selectedParams.moisture) && maxLen === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No data available</p>
                    <p style={{ fontSize: '0.875rem' }}>No sand property records found for the selected date range.</p>
                </div>
            )}

            {/* Chart Container */}
            {!isLoading && showChart && (selectedParams.compactibility || selectedParams.moisture) && maxLen > 0 && (
                <div style={{
                    position: 'relative',
                    height: '400px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: 'white',
                    padding: '1rem'
                }}>
                    <Line data={data} options={options} />
                </div>
            )}

            {/* Empty State */}
            {(!showChart || (!selectedParams.compactibility && !selectedParams.moisture)) && (
                <div style={{
                    marginTop: '2rem',
                    padding: '3rem',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    textAlign: 'center'
                }}>
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: '#6B7280'
                    }}>
                        {!showChart 
                            ? 'Please select a date range to view the comparison chart' 
                            : 'Please select at least one parameter to display'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ComparisonTab;
