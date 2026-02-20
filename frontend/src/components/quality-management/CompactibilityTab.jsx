import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import DatePicker from '../common/DatePicker';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const CompactibilityTab = () => {
    const navigate = useNavigate();
    const chartRef = useRef(null);
    const [formData, setFormData] = useState({
        startDate: '2026-01-01',
        endDate: new Date().toISOString().split('T')[0],
        showCpCpk: false
    });

    const { data: sandRecords = [], isLoading } = useQuery({
        queryKey: ['sandProperties-chart', 'compactability', formData.startDate, formData.endDate],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('startDate', formData.startDate);
            params.append('endDate', formData.endDate);
            const res = await api.get(`/quality-lab/sand?${params.toString()}`);
            return res.data;
        },
    });

    const chartData = useMemo(() => {
        const sorted = [...sandRecords].sort((a, b) => new Date(a.Date) - new Date(b.Date));
        return sorted.map(r => parseFloat(r['Compactability In %'])).filter(v => !isNaN(v) && v > 0);
    }, [sandRecords]);

    const labels = chartData.map((_, i) => `R${i + 1}`);
    const USL = 46, LSL = 38, UWL = 44, LWL = 40;

    const data = {
        labels,
        datasets: [{
            label: 'Compactibility %', data: chartData,
            borderColor: '#10B981', backgroundColor: '#10B981',
            pointBackgroundColor: chartData.map(v => v < LSL || v > USL ? '#EF4444' : v < LWL || v > UWL ? '#F59E0B' : '#22C55E'),
            pointBorderColor: chartData.map(v => v < LSL || v > USL ? '#DC2626' : v < LWL || v > UWL ? '#D97706' : '#16A34A'),
            pointRadius: 4, pointHoverRadius: 6, tension: 0.1, borderWidth: 1.5
        }]
    };

    const options = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `Reading ${ctx.label}: ${ctx.parsed.y}%` } } },
        scales: {
            x: { title: { display: true, text: 'Reading', font: { size: 12 } }, ticks: { maxTicksLimit: 20, font: { size: 10 } }, grid: { display: false } },
            y: { min: 36, max: 48, ticks: { stepSize: 3, font: { size: 11 } }, grid: { color: '#E5E7EB', drawBorder: false } }
        },
        animation: { duration: 1000, easing: 'easeInOutQuart' }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const calculateStats = () => {
        if (chartData.length === 0) return { average: '0', stdDev: '0', cp: '0', cpk: '0', sigma3: '0', sigma6: '0', upperLimit: USL.toFixed(3), lowerLimit: LSL.toFixed(3) };
        const n = chartData.length;
        const average = chartData.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(chartData.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / n);
        const cp = stdDev > 0 ? (USL - LSL) / (6 * stdDev) : 0;
        const cpk = stdDev > 0 ? Math.min((USL - average) / (3 * stdDev), (average - LSL) / (3 * stdDev)) : 0;
        return { average: average.toFixed(3), stdDev: stdDev.toFixed(3), cp: cp.toFixed(3), cpk: cpk.toFixed(3), sigma3: (3 * stdDev).toFixed(3), sigma6: (6 * stdDev).toFixed(3), upperLimit: USL.toFixed(3), lowerLimit: LSL.toFixed(3) };
    };
    const stats = calculateStats();

    const StatsCard = ({ title, value, color }) => (
        <div style={{ backgroundColor: color, borderRadius: '8px', padding: '1rem 0.5rem', textAlign: 'center', color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>{title}</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '500' }}>{value}</div>
        </div>
    );

    return (
        <div>
            <button onClick={() => navigate('/quality-management-system/sand-testing')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#4B5563', fontWeight: '500', marginBottom: '1rem' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E5E7EB'} onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F3F4F6'}>
                <FiArrowLeft size={18} /> Back
            </button>

            <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.5rem', fontWeight: '600', color: '#1F2937', textAlign: 'center' }}>AKP FOUNDRIES - RUN CHART</h2>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#374151' }}><strong>Characteristics:</strong> Compactibility % | <strong>Specification:</strong> 38 TO 46 %</div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Start Date</label>
                        <DatePicker name="startDate" value={formData.startDate} onChange={handleInputChange} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>End Date</label>
                        <DatePicker name="endDate" value={formData.endDate} onChange={handleInputChange} />
                    </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" name="showCpCpk" checked={formData.showCpCpk} onChange={handleInputChange} style={{ cursor: 'pointer' }} /> Show Cp/Cpk
                </label>
            </div>

            {isLoading && <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Loading chart data...</div>}

            {!isLoading && chartData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>No data available</p>
                    <p style={{ fontSize: '0.875rem' }}>No Compactibility records found for the selected date range.</p>
                </div>
            )}

            {!isLoading && chartData.length > 0 && (
                <>
                    <div style={{ position: 'relative', height: '400px', border: '1px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ height: '8%', backgroundColor: 'rgba(239,68,68,0.2)', borderBottom: '2px solid #EF4444' }} />
                            <div style={{ height: '12%', backgroundColor: 'rgba(245,158,11,0.2)', borderBottom: '2px solid #F59E0B' }} />
                            <div style={{ height: '60%', backgroundColor: 'rgba(34,197,94,0.2)', borderBottom: '2px solid #22C55E' }} />
                            <div style={{ height: '12%', backgroundColor: 'rgba(245,158,11,0.2)', borderBottom: '2px solid #F59E0B' }} />
                            <div style={{ height: '8%', backgroundColor: 'rgba(239,68,68,0.2)' }} />
                        </div>
                        <div style={{ position: 'relative', height: '100%', padding: '1rem' }}><Line ref={chartRef} data={data} options={options} /></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem', fontSize: '0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 16, height: 16, backgroundColor: '#22C55E', borderRadius: 3 }} /><span>In Specification (40-44%)</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 16, height: 16, backgroundColor: '#F59E0B', borderRadius: 3 }} /><span>Warning</span></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{ width: 16, height: 16, backgroundColor: '#EF4444', borderRadius: 3 }} /><span>Out of Specification</span></div>
                    </div>
                </>
            )}

            {formData.showCpCpk && chartData.length > 0 && (
                <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
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

export default CompactibilityTab;
