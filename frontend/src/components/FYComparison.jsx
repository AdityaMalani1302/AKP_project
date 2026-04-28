import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';
import api from '../api';
import TreeMapChart from './common/TreeMapChart';
import {
    applyChartDefaults,
    CHART_COLORS,
    SALES_COLORS,
    FINANCE_COLORS,
    PRODUCTION_COLORS,
    REJECTION_COLORS,
    formatShortMonths
} from '../utils/chartConfig';
import './dashboard/Dashboard.css';
import ExportButton from './ExportButton';
import ExportButtons from './common/ExportButtons';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    BarElement, ArcElement, Title, Tooltip, Legend, Filler, ChartDataLabels
);
applyChartDefaults(ChartJS);

const monthOrder = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
};

const parseMonthKey = (monthStr) => {
    if (!monthStr) return 0;
    const parts = monthStr.split(' - ');
    if (parts.length === 2) {
        const monthName = parts[0].toLowerCase().trim();
        const year = parseInt(parts[1]) || 0;
        return (year * 100) + (monthOrder[monthName] || 0);
    }
    return 0;
};

const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '₹0';
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)} Cr`;
    if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)} L`;
    if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)} K`;
    return `${sign}₹${abs.toFixed(0)}`;
};

const formatWeight = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0 T';
    const abs = Math.abs(value);
    if (abs >= 1000) return `${Math.round(abs / 1000)} T`;
    return `${Math.round(abs)} Kg`;
};

const _formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
};

const formatSalesPerKg = (v) => {
    if (v === null || v === undefined || isNaN(v)) return '—';
    if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L/kg`;
    if (v >= 1000) return `₹${(v / 1000).toFixed(2)} K/kg`;
    return `₹${v.toFixed(2)}/kg`;
};

const DASHBOARD_OPTIONS = [
    { value: 'sales', label: 'Sales Dashboard' },
    { value: 'finance', label: 'Finance Dashboard' },
    { value: 'production', label: 'Production Dashboard' },
    { value: 'rejection', label: 'Rejection Dashboard' },
];

const CHART_REGISTRY = {
    sales: [
        { id: 'sales-total-value', label: 'Monthly Sales - Total Value' },
        { id: 'sales-cumulative', label: 'Cumulative Sales Value' },
        { id: 'sales-dom-exp-value', label: 'Monthly Sales Value (Domestic & Export)' },
        { id: 'sales-dom-exp-weight', label: 'Monthly Sales Weight (Domestic & Export)' },
        { id: 'sales-per-kg-monthly', label: 'Sales / kg by month (realisation)' },
        { id: 'sales-value-trend', label: 'Sales Value Trend (Domestic & Export)' },
        { id: 'sales-mom-value', label: 'MoM Growth % (Value)' },
        { id: 'sales-mom-weight', label: 'MoM Growth % (Weight)' },
        { id: 'sales-grade-treemap', label: 'Grade Wise Sales (TreeMap)' },
        { id: 'sales-grade-pie', label: 'Grade Wise Sales (Pie)' },
        { id: 'sales-top5-customers', label: 'Top 5 Customers' },
        { id: 'sales-dom-exp-donut', label: 'Domestic & Export Contribution' },
        { id: 'sales-segment', label: 'Sales by Segment' },
        { id: 'sales-area-group', label: 'Customer Group Distribution' },
    ],
    finance: [
        { id: 'fin-revenue-direct-indirect', label: 'Monthly Revenue (Direct & Indirect)' },
        { id: 'fin-revenue-expense-trend', label: 'Revenue & Expenses Trend' },
        { id: 'fin-revenue-contribution', label: 'Revenue Contribution' },
        { id: 'fin-expense-category', label: 'Category Wise Expense' },
        { id: 'fin-monthly-revenue-total', label: 'Monthly Revenue (Total)' },
        { id: 'fin-monthly-expenses', label: 'Monthly Expenses Trend' },
        { id: 'fin-expense-category-trend', label: 'Category Wise Expense Trend' },
        { id: 'fin-expense-contribution', label: 'Expense Contribution' },
        { id: 'fin-mom-revenue-growth', label: 'MoM Revenue Growth %' },
    ],
    production: [
        { id: 'prod-metal-heats', label: 'Monthly Metal Production & Heats' },
        { id: 'prod-monthly-trend', label: 'Monthly Production Trend' },
        { id: 'prod-grade-treemap', label: 'Grade-wise Production (TreeMap)' },
        { id: 'prod-grade-rejection', label: 'MainGrade Rejection %' },
        { id: 'prod-ok-rej-pie', label: 'OK Production & Rejection Contribution' },
        { id: 'prod-grade-pie', label: 'Grade Wise Production %' },
        { id: 'prod-top-parts', label: 'Top Parts by OK Production Weight' },
        { id: 'prod-mom-growth', label: 'MoM Growth % (OK vs Rejection)' },
        { id: 'prod-yield-improvement', label: 'Monthly Yield Improvement' },
    ],
    rejection: [
        { id: 'rej-prod-dispatch', label: 'Production vs Dispatch (Weight)' },
        { id: 'rej-pct-breakdown', label: 'Rejection % Breakdown' },
        { id: 'rej-total-trend', label: 'Total Rejection Trend (%)' },
        { id: 'rej-customer-trend', label: 'Customer Rejection Trend (%)' },
        { id: 'rej-inhouse-trend', label: 'Inhouse Rejection Trend (%)' },
        { id: 'rej-subcon-trend', label: 'Subcontractor Rejection Trend (%)' },
        { id: 'rej-contribution-pie', label: 'Rejection Contribution Split' },
        { id: 'rej-weight-comparison', label: 'Customer vs Inhouse vs Subcon (Weight)' },
    ],
};

const getFYLabel = (fyStartYear) => `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

const FYComparison = () => {
    const [selectedDashboard, setSelectedDashboard] = useState('sales');
    const [selectedChart, setSelectedChart] = useState(CHART_REGISTRY.sales[0].id);
    const [expandedChart, setExpandedChart] = useState(null);

    // Chart refs for PDF/Excel export
    const leftPanelRef = useRef(null);
    const rightPanelRef = useRef(null);

    const today = useMemo(() => new Date(), []);
    const currentFYStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;

    const fyOptions = [];
    for (let y = currentFYStart; y >= currentFYStart - 5; y--) {
        fyOptions.push({ value: y, label: getFYLabel(y) });
    }

    const [leftFY, setLeftFY] = useState(currentFYStart - 1);
    const [rightFY, setRightFY] = useState(currentFYStart);

    const handleDashboardChange = (newDashboard) => {
        setSelectedDashboard(newDashboard);
        const charts = CHART_REGISTRY[newDashboard];
        if (charts && charts.length > 0) {
            setSelectedChart(charts[0].id);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && expandedChart) setExpandedChart(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [expandedChart]);

    useEffect(() => {
        document.body.style.overflow = expandedChart ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [expandedChart]);

    const chartCardStyle = {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
    };

    return (
        <div className="dashboard-container">
            {expandedChart && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}
                    onClick={() => setExpandedChart(null)}
                >
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '2rem', width: '90vw', height: '85vh', maxWidth: '1400px', position: 'relative', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', margin: 0 }}>{expandedChart.title}</h2>
                            <button onClick={() => setExpandedChart(null)} style={{ background: '#EF4444', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem' }}>Close</button>
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>{expandedChart.content}</div>
                    </div>
                </div>
            )}

            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>Comparison Dashboard</h1>
                    <p className="welcome-text">Compare {getFYLabel(leftFY)} vs {getFYLabel(rightFY)} side by side</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ExportButtons
                        chartRefs={[
                            { ref: leftPanelRef, title: `${getFYLabel(leftFY)} - ${(CHART_REGISTRY[selectedDashboard] || []).find(c => c.id === selectedChart)?.label || selectedChart}` },
                            { ref: rightPanelRef, title: `${getFYLabel(rightFY)} - ${(CHART_REGISTRY[selectedDashboard] || []).find(c => c.id === selectedChart)?.label || selectedChart}` }
                        ]}
                        fileName={`fy-comparison-${selectedDashboard}-${format(new Date(), 'yyyy-MM-dd')}`}
                        title="FY Comparison Report"
                    />
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap' }}>Dashboard:</label>
                    <select
                        value={selectedDashboard}
                        onChange={e => handleDashboardChange(e.target.value)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', backgroundColor: '#F9FAFB', minWidth: '200px' }}
                    >
                        {DASHBOARD_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap' }}>Chart:</label>
                    <select
                        value={selectedChart}
                        onChange={e => setSelectedChart(e.target.value)}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', backgroundColor: '#F9FAFB', minWidth: '280px' }}
                    >
                        {(CHART_REGISTRY[selectedDashboard] || []).map(ch => (
                            <option key={ch.id} value={ch.id}>{ch.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#F59E0B', whiteSpace: 'nowrap' }}>Left FY:</label>
                    <select
                        value={leftFY}
                        onChange={e => setLeftFY(parseInt(e.target.value))}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '2px solid #F59E0B', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', backgroundColor: '#FFFBEB', minWidth: '130px' }}
                    >
                        {fyOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#3B82F6', whiteSpace: 'nowrap' }}>Right FY:</label>
                    <select
                        value={rightFY}
                        onChange={e => setRightFY(parseInt(e.target.value))}
                        style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '2px solid #3B82F6', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', backgroundColor: '#EFF6FF', minWidth: '130px' }}
                    >
                        {fyOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                <ComparisonPanel
                    panelRef={leftPanelRef}
                    label={getFYLabel(leftFY)}
                    fyStart={leftFY}
                    currentFYStart={currentFYStart}
                    today={today}
                    dashboard={selectedDashboard}
                    chartId={selectedChart}
                    chartCardStyle={chartCardStyle}
                    onExpand={setExpandedChart}
                    panelColor="#F59E0B"
                />
                <ComparisonPanel
                    panelRef={rightPanelRef}
                    label={getFYLabel(rightFY)}
                    fyStart={rightFY}
                    currentFYStart={currentFYStart}
                    today={today}
                    dashboard={selectedDashboard}
                    chartId={selectedChart}
                    chartCardStyle={chartCardStyle}
                    onExpand={setExpandedChart}
                    panelColor="#3B82F6"
                />
            </div>
        </div>
    );
};

const QUARTER_FILTERS = [
    { key: 'full', label: 'Full FY' },
    { key: 'q1', label: 'Q1' },
    { key: 'q2', label: 'Q2' },
    { key: 'q3', label: 'Q3' },
    { key: 'q4', label: 'Q4' },
];

const getQuarterDates = (fyStart, quarter, currentFYStart, today) => {
    const isCurrent = fyStart === currentFYStart;
    const fyEnd = isCurrent ? today : new Date(fyStart + 1, 2, 31);
    switch (quarter) {
        case 'q1': return { fromDate: format(new Date(fyStart, 3, 1), 'yyyy-MM-dd'), toDate: format(isCurrent && today < new Date(fyStart, 6, 0) ? today : new Date(fyStart, 5, 30), 'yyyy-MM-dd') };
        case 'q2': return { fromDate: format(new Date(fyStart, 6, 1), 'yyyy-MM-dd'), toDate: format(isCurrent && today < new Date(fyStart, 9, 0) ? today : new Date(fyStart, 8, 30), 'yyyy-MM-dd') };
        case 'q3': return { fromDate: format(new Date(fyStart, 9, 1), 'yyyy-MM-dd'), toDate: format(isCurrent && today < new Date(fyStart + 1, 0, 0) ? today : new Date(fyStart, 11, 31), 'yyyy-MM-dd') };
        case 'q4': return { fromDate: format(new Date(fyStart + 1, 0, 1), 'yyyy-MM-dd'), toDate: format(isCurrent && today < new Date(fyStart + 1, 3, 0) ? today : new Date(fyStart + 1, 2, 31), 'yyyy-MM-dd') };
        default: return { fromDate: format(new Date(fyStart, 3, 1), 'yyyy-MM-dd'), toDate: format(fyEnd, 'yyyy-MM-dd') };
    }
};

const ComparisonPanel = ({ panelRef, label, fyStart, currentFYStart, today, dashboard, chartId, chartCardStyle, onExpand, panelColor }) => {
    const [activeQuarter, setActiveQuarter] = useState('full');
    const dates = useMemo(() => getQuarterDates(fyStart, activeQuarter, currentFYStart, today), [fyStart, activeQuarter, currentFYStart, today]);

    const qBtnStyle = (key) => ({
        padding: '0.4rem 1rem',
        fontSize: '0.85rem',
        fontWeight: activeQuarter === key ? '700' : '500',
        backgroundColor: activeQuarter === key ? panelColor : '#F3F4F6',
        color: activeQuarter === key ? 'white' : '#4B5563',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.15s',
    });

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ width: '4px', height: '32px', backgroundColor: panelColor, borderRadius: '4px' }} />
                <div style={{ flex: '0 0 auto' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1F2937', margin: 0 }}>{label}</h2>
                    <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>{dates.fromDate} to {dates.toDate}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                    {QUARTER_FILTERS.map(q => (
                        <button key={q.key} onClick={() => setActiveQuarter(q.key)} style={qBtnStyle(q.key)}>{q.label}</button>
                    ))}
                </div>
            </div>
            <div ref={panelRef} style={chartCardStyle}
                onClick={() => {
                    const content = <ChartRenderer dashboard={dashboard} chartId={chartId} dates={dates} height="100%" />;
                    onExpand({ title: `${label} (${activeQuarter === 'full' ? 'Full FY' : activeQuarter.toUpperCase()}) - ${chartId}`, content });
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'right', marginBottom: '0.5rem', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                    <ExportButton chartRef={panelRef} title={`${label} - ${chartId}`} filename={`fy-${label}-${chartId}`} />
                    <span>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    <ChartRenderer dashboard={dashboard} chartId={chartId} dates={dates} height="450px" />
                </div>
            </div>
        </div>
    );
};

const ChartRenderer = ({ dashboard, chartId, dates, height }) => {
    switch (dashboard) {
        case 'sales': return <SalesChartRenderer chartId={chartId} dates={dates} height={height} />;
        case 'finance': return <FinanceChartRenderer chartId={chartId} dates={dates} height={height} />;
        case 'production': return <ProductionChartRenderer chartId={chartId} dates={dates} height={height} />;
        case 'rejection': return <RejectionChartRenderer chartId={chartId} dates={dates} height={height} />;
        default: return <NoData />;
    }
};

const NoData = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF', fontSize: '0.95rem' }}>
        No data available
    </div>
);

const LoadingState = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>Loading...</div>
);

// ===================== SALES CHART RENDERER =====================
const SalesChartRenderer = ({ chartId, dates }) => {
    const skipMainSalesQueries = chartId === 'sales-per-kg-monthly';

    const { data: rawData, isLoading } = useQuery({
        queryKey: ['fy-compare', 'sales', dates.fromDate, dates.toDate],
        queryFn: async () => {
            const res = await api.get('/sales-dashboard/data', { params: { fromDate: dates.fromDate, toDate: dates.toDate } });
            return res.data;
        },
        enabled: !skipMainSalesQueries
    });

    const { data: gradeData } = useQuery({
        queryKey: ['fy-compare', 'sales-grade', dates.fromDate, dates.toDate],
        queryFn: async () => {
            const res = await api.get('/sales-dashboard/grade-wise-sales', { params: { fromDate: dates.fromDate, toDate: dates.toDate } });
            return res.data;
        },
        enabled: !skipMainSalesQueries
    });

    const { data: salesPerKgPayload, isLoading: salesPerKgLoading } = useQuery({
        queryKey: ['fy-compare', 'sales-per-kg', dates.fromDate, dates.toDate],
        queryFn: async () => {
            const res = await api.get('/finance-dashboard/sales-per-kg', {
                params: { fromDate: dates.fromDate, toDate: dates.toDate }
            });
            return res.data;
        },
        enabled: chartId === 'sales-per-kg-monthly'
    });

    const trendData = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;
        const monthly = {};
        rawData.forEach(row => {
            const month = row.Month || 'Unknown';
            const cat = (row.CategoryName || '').toLowerCase();
            if (!monthly[month]) monthly[month] = { dv: 0, ev: 0, dw: 0, ew: 0 };
            if (cat.includes('domestic')) { monthly[month].dv += row.Value || 0; monthly[month].dw += row.Weight || 0; }
            else if (cat.includes('export')) { monthly[month].ev += row.Value || 0; monthly[month].ew += row.Weight || 0; }
        });
        const months = Object.keys(monthly).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));
        const dv = months.map(m => monthly[m].dv);
        const ev = months.map(m => monthly[m].ev);
        const dw = months.map(m => monthly[m].dw);
        const ew = months.map(m => monthly[m].ew);
        return { months, dv, ev, dw, ew };
    }, [rawData]);

    const summary = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;
        const custVals = {}, segVals = {}, catVals = {}, areaVals = {};
        rawData.forEach(row => {
            const v = row.Value || 0;
            const c = row.CustName || 'Unknown';
            custVals[c] = (custVals[c] || 0) + v;
            const s = row.Segment_Type || 'Other';
            segVals[s] = (segVals[s] || 0) + v;
            const cat = row.CategoryName || 'Other';
            catVals[cat] = (catVals[cat] || 0) + v;
            const area = row['CUSTOMER AREA GROUP'] || 'Other';
            areaVals[area] = (areaVals[area] || 0) + v;
        });
        return { custVals, segVals, catVals, areaVals };
    }, [rawData]);

    const gradeChartData = useMemo(() => {
        if (!gradeData || gradeData.length === 0) return null;
        const typeData = {};
        const gradeMonthly = {};
        const gradeColors = ['#2563EB', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#14B8A6', '#EC4899', '#F97316', '#6366F1', '#78716C'];
        gradeData.forEach(row => {
            const mainType = row.MainType || 'None';
            const type = row.Type || 'None';
            if (!typeData[type]) typeData[type] = { value: 0, wt: 0 };
            typeData[type].value += row.Value || 0;
            typeData[type].wt += row.Wt || 0;
            if (!gradeMonthly[mainType]) gradeMonthly[mainType] = {};
            const month = row.Month || 'Unknown';
            if (!gradeMonthly[mainType][month]) gradeMonthly[mainType][month] = { value: 0, wt: 0 };
            gradeMonthly[mainType][month].value += row.Value || 0;
            gradeMonthly[mainType][month].wt += row.Wt || 0;
        });
        const gradeTypes = Object.keys(gradeMonthly);
        const pieTotals = gradeTypes.map(g => Object.values(gradeMonthly[g]).reduce((sum, v) => sum + v.value, 0));
        const treemap = Object.keys(typeData).map(t => ({ grade: t, value: typeData[t].wt, valueAmount: typeData[t].value }));
        return {
            pie: { labels: gradeTypes, datasets: [{ data: pieTotals, backgroundColor: gradeColors.slice(0, gradeTypes.length), borderWidth: 2 }] },
            treemap
        };
    }, [gradeData]);

    const salesPerKgMonthlyChartData = useMemo(() => {
        const rows = salesPerKgPayload?.monthly;
        if (!rows?.length) return null;
        const labels = formatShortMonths(rows.map((r) => r.month));
        return {
            labels,
            datasets: [{
                label: 'Sales / kg (₹/kg)',
                data: rows.map((r) => (r.salesPerKg != null ? r.salesPerKg : 0)),
                borderColor: SALES_COLORS.success.solid,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                fill: true,
                tension: 0.35,
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: SALES_COLORS.success.solid
            }]
        };
    }, [salesPerKgPayload]);

    const salesPerKgMonthlyOptions = useMemo(() => {
        const rows = salesPerKgPayload?.monthly || [];
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        title: (items) => (items[0] ? items[0].label : ''),
                        label: (ctx) => ` ${formatSalesPerKg(ctx.raw)}`,
                        afterBody: (items) => {
                            const row = rows[items[0]?.dataIndex];
                            if (!row) return [];
                            const w = row.totalWeight != null ? Number(row.totalWeight).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '0';
                            return [
                                `Total sales: ${formatCurrency(row.totalValue)}`,
                                `Total weight: ${w} kg`
                            ];
                        }
                    }
                },
                datalabels: {
                    display: true,
                    align: 'top',
                    anchor: 'end',
                    color: '#065F46',
                    font: { weight: 'bold', size: 10 },
                    formatter: (value) => (value > 0 ? `₹${Math.round(value)}` : '')
                }
            },
            scales: {
                x: { offset: true, grid: { display: false } },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: '₹ per kg' },
                    ticks: {
                        callback: (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                    }
                }
            },
            layout: { padding: { top: 18 } }
        };
    }, [salesPerKgPayload]);

    if (chartId === 'sales-per-kg-monthly') {
        if (salesPerKgLoading) return <LoadingState />;
        if (!salesPerKgMonthlyChartData) return <NoData />;
        return <Line data={salesPerKgMonthlyChartData} options={salesPerKgMonthlyOptions} />;
    }

    if (isLoading) return <LoadingState />;
    if (!trendData && !summary) return <NoData />;

    const baseLineOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { display: true, align: 'top', anchor: 'end', color: '#1F2937', font: { weight: 'bold', size: 11 }, formatter: v => formatCurrency(v) } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatCurrency(v) } } } };
    const baseBarOpts = { ...baseLineOpts };
    const momOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { display: true, color: ctx => (ctx.dataset.data[ctx.dataIndex] >= 0 ? '#10B981' : '#EF4444'), align: ctx => ctx.dataset.data[ctx.dataIndex] >= 0 ? 'top' : 'bottom', anchor: ctx => ctx.dataset.data[ctx.dataIndex] >= 0 ? 'end' : 'start', font: { weight: 'bold', size: 11 }, formatter: v => `${v >= 0 ? '+' : ''}${v}%` } }, scales: { y: { ticks: { callback: v => `${v}%` } } } };

    const shortMonths = trendData ? formatShortMonths(trendData.months) : [];
    switch (chartId) {
        case 'sales-total-value': {
            if (!trendData) return <NoData />;
            return <Line data={{ labels: shortMonths, datasets: [{ label: 'Total Sales Value', data: trendData.months.map((_, i) => trendData.dv[i] + trendData.ev[i]), borderColor: SALES_COLORS.primary.solid, backgroundColor: SALES_COLORS.primary.light, borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4 }] }} options={baseLineOpts} />;
        }
        case 'sales-cumulative': {
            if (!trendData) return <NoData />;
            const cumData = trendData.months.reduce((acc, _, i) => { acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + trendData.dv[i] + trendData.ev[i]); return acc; }, []);
            return <Line data={{ labels: shortMonths, datasets: [{ label: 'Cumulative Sales', data: cumData, borderColor: SALES_COLORS.success.solid, backgroundColor: SALES_COLORS.success.light, borderWidth: 3, fill: true, tension: 0.4, pointRadius: 4 }] }} options={baseLineOpts} />;
        }
        case 'sales-dom-exp-value': {
            if (!trendData) return <NoData />;
            return <Bar data={{ labels: shortMonths, datasets: [{ label: 'Domestic', data: trendData.dv, backgroundColor: SALES_COLORS.primary.medium, borderRadius: 4 }, { label: 'Export', data: trendData.ev, backgroundColor: SALES_COLORS.success.medium, borderRadius: 4 }] }} options={baseBarOpts} />;
        }
        case 'sales-dom-exp-weight': {
            if (!trendData) return <NoData />;
            const weightOpts = { ...baseBarOpts, plugins: { ...baseBarOpts.plugins, datalabels: { ...baseBarOpts.plugins.datalabels, formatter: v => formatWeight(v) } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatWeight(v) } } } };
            return <Bar data={{ labels: shortMonths, datasets: [{ label: 'Domestic Weight', data: trendData.dw, backgroundColor: SALES_COLORS.danger.medium, borderRadius: 4 }, { label: 'Export Weight', data: trendData.ew, backgroundColor: SALES_COLORS.warning.medium, borderRadius: 4 }] }} options={weightOpts} />;
        }
        case 'sales-value-trend': {
            if (!trendData) return <NoData />;
            return <Line data={{ labels: shortMonths, datasets: [{ label: 'Domestic', data: trendData.dv, borderColor: SALES_COLORS.primary.solid, backgroundColor: SALES_COLORS.primary.light, fill: true, tension: 0.4, borderWidth: 3 }, { label: 'Export', data: trendData.ev, borderColor: SALES_COLORS.success.solid, backgroundColor: SALES_COLORS.success.light, fill: true, tension: 0.4, borderWidth: 3 }] }} options={baseLineOpts} />;
        }
        case 'sales-mom-value': {
            if (!trendData || trendData.months.length < 2) return <NoData />;
            const totals = trendData.months.map((_, i) => trendData.dv[i] + trendData.ev[i]);
            const growth = []; const labels = [];
            for (let i = 1; i < totals.length; i++) { labels.push(shortMonths[i]); growth.push(totals[i - 1] > 0 ? parseFloat((((totals[i] - totals[i - 1]) / totals[i - 1]) * 100).toFixed(1)) : 0); }
            return <Line data={{ labels, datasets: [{ label: 'Value Growth %', data: growth, borderColor: SALES_COLORS.primary.solid, borderWidth: 3, tension: 0.4, pointRadius: 5, pointBackgroundColor: growth.map(v => v >= 0 ? '#10B981' : '#EF4444'), fill: false }] }} options={momOpts} />;
        }
        case 'sales-mom-weight': {
            if (!trendData || trendData.months.length < 2) return <NoData />;
            const totals = trendData.months.map((_, i) => trendData.dw[i] + trendData.ew[i]);
            const growth = []; const labels = [];
            for (let i = 1; i < totals.length; i++) { labels.push(shortMonths[i]); growth.push(totals[i - 1] > 0 ? parseFloat((((totals[i] - totals[i - 1]) / totals[i - 1]) * 100).toFixed(1)) : 0); }
            return <Line data={{ labels, datasets: [{ label: 'Weight Growth %', data: growth, borderColor: SALES_COLORS.warning.solid, borderWidth: 3, tension: 0.4, pointRadius: 5, pointBackgroundColor: growth.map(v => v >= 0 ? '#10B981' : '#EF4444'), fill: false }] }} options={momOpts} />;
        }
        case 'sales-grade-treemap': {
            if (!gradeChartData?.treemap || gradeChartData.treemap.length === 0) return <NoData />;
            return <TreeMapChart data={gradeChartData.treemap} />;
        }
        case 'sales-grade-pie': {
            if (!gradeChartData?.pie) return <NoData />;
            return <Pie data={gradeChartData.pie} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { display: true, color: '#1F2937', font: { weight: 'bold', size: 12 }, formatter: (v, ctx) => { const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); return `${((v / total) * 100).toFixed(1)}%`; } } } }} />;
        }
        case 'sales-top5-customers': {
            if (!summary) return <NoData />;
            const sorted = Object.entries(summary.custVals).sort((a, b) => b[1] - a[1]).slice(0, 5);
            return <Bar data={{ labels: sorted.map(([n]) => n.length > 18 ? n.substring(0, 16) + '..' : n), datasets: [{ label: 'Value', data: sorted.map(([, v]) => v), backgroundColor: [SALES_COLORS.primary.medium, SALES_COLORS.success.medium, SALES_COLORS.danger.medium, SALES_COLORS.warning.medium, SALES_COLORS.teal.medium], borderRadius: 4 }] }} options={{ ...baseBarOpts, indexAxis: 'y' }} />;
        }
        case 'sales-dom-exp-donut': {
            if (!summary) return <NoData />;
            const entries = Object.entries(summary.catVals);
            return <Doughnut data={{ labels: entries.map(([n]) => n), datasets: [{ data: entries.map(([, v]) => v), backgroundColor: [SALES_COLORS.primary.medium, SALES_COLORS.success.medium, SALES_COLORS.danger.medium], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, cutout: '35%', plugins: { legend: { position: 'right' }, datalabels: { display: true, color: '#1F2937', font: { weight: 'bold', size: 14 }, formatter: (v, ctx) => { const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); return `${((v / total) * 100).toFixed(1)}%`; } } } }} />;
        }
        case 'sales-segment': {
            if (!summary) return <NoData />;
            const sorted = Object.entries(summary.segVals).sort((a, b) => b[1] - a[1]);
            return <Bar data={{ labels: sorted.map(([n]) => n), datasets: [{ label: 'Value', data: sorted.map(([, v]) => v), backgroundColor: SALES_COLORS.primary.medium, borderRadius: 4 }] }} options={baseBarOpts} />;
        }
        case 'sales-area-group': {
            if (!summary) return <NoData />;
            const sorted = Object.entries(summary.areaVals).sort((a, b) => b[1] - a[1]);
            return <Pie data={{ labels: sorted.map(([n]) => n), datasets: [{ data: sorted.map(([, v]) => v), backgroundColor: SALES_COLORS.palette || [SALES_COLORS.primary.solid, SALES_COLORS.success.solid, SALES_COLORS.danger.solid, SALES_COLORS.warning.solid, SALES_COLORS.teal.solid], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { display: true, color: '#1F2937', font: { weight: 'bold', size: 12 }, formatter: (v, ctx) => { const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); return total > 0 ? `${((v / total) * 100).toFixed(1)}%` : ''; } } } }} />;
        }
        default: return <NoData />;
    }
};

// ===================== FINANCE CHART RENDERER =====================
const FinanceChartRenderer = ({ chartId, dates }) => {
    const { data: rawData, isLoading } = useQuery({
        queryKey: ['fy-compare', 'finance', dates.fromDate, dates.toDate],
        queryFn: async () => {
            const res = await api.get('/finance-dashboard/data', { params: { fromDate: dates.fromDate, toDate: dates.toDate } });
            return res.data;
        }
    });

    const processed = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;
        const monthlyData = {};
        const revenueBySubGroup = {};
        const expenseBySubGroup = {};

        rawData.forEach(row => {
            const month = row.Month || 'Unknown';
            const value = row.Value || 0;
            const subGroup = row.SubGroup || 'Other';
            if (!monthlyData[month]) monthlyData[month] = { revenue: 0, purchase: 0, operating: 0, directRev: 0, indirectRev: 0 };
            switch (row.MainGroup) {
                case 'REVENUE':
                    monthlyData[month].revenue += value;
                    if (subGroup.toLowerCase().includes('indirect') || subGroup.toLowerCase().includes('other')) monthlyData[month].indirectRev += value;
                    else monthlyData[month].directRev += value;
                    revenueBySubGroup[subGroup] = (revenueBySubGroup[subGroup] || 0) + value;
                    break;
                case 'PURCHASE': monthlyData[month].purchase += value; expenseBySubGroup[subGroup] = (expenseBySubGroup[subGroup] || 0) + value; break;
                case 'OPERATING EXPENDITURE': monthlyData[month].operating += value; expenseBySubGroup[subGroup] = (expenseBySubGroup[subGroup] || 0) + value; break;
                default: break;
            }
        });

        const months = Object.keys(monthlyData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));
        return { monthlyData, months, revenueBySubGroup, expenseBySubGroup };
    }, [rawData]);

    if (isLoading) return <LoadingState />;
    if (!processed) return <NoData />;

    const { monthlyData, months, revenueBySubGroup, expenseBySubGroup } = processed;
    const shortMonths = formatShortMonths(months);
    const currOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { display: true, align: 'top', anchor: 'end', color: '#1F2937', font: { weight: 'bold', size: 11 }, formatter: v => formatCurrency(v) } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatCurrency(v) } } } };
    const donutOpts = { responsive: true, maintainAspectRatio: false, cutout: '35%', plugins: { legend: { position: 'right' }, datalabels: { display: true, color: '#111827', font: { weight: 'bold', size: 14 }, formatter: (v, ctx) => { const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); return `${((v / total) * 100).toFixed(1)}%`; } } } };

    switch (chartId) {
        case 'fin-revenue-direct-indirect':
            return <Bar data={{ labels: shortMonths, datasets: [{ label: 'Direct Revenue', data: months.map(m => monthlyData[m].directRev), backgroundColor: FINANCE_COLORS.success.medium, borderRadius: 4 }, { label: 'Indirect Revenue', data: months.map(m => monthlyData[m].indirectRev), backgroundColor: FINANCE_COLORS.primary.medium, borderRadius: 4 }] }} options={currOpts} />;
        case 'fin-revenue-expense-trend':
            return <Line data={{ labels: shortMonths, datasets: [{ label: 'Revenue', data: months.map(m => monthlyData[m].revenue), borderColor: FINANCE_COLORS.success.solid, backgroundColor: FINANCE_COLORS.success.light, fill: true, tension: 0.4, borderWidth: 3 }, { label: 'Total Expenses', data: months.map(m => monthlyData[m].purchase + monthlyData[m].operating), borderColor: FINANCE_COLORS.danger.solid, backgroundColor: FINANCE_COLORS.danger.light, fill: true, tension: 0.4, borderWidth: 3 }] }} options={currOpts} />;
        case 'fin-revenue-contribution': {
            const labels = Object.keys(revenueBySubGroup);
            return <Doughnut data={{ labels, datasets: [{ data: Object.values(revenueBySubGroup), backgroundColor: [FINANCE_COLORS.success.medium, FINANCE_COLORS.primary.medium, FINANCE_COLORS.warning.medium, FINANCE_COLORS.danger.medium], borderWidth: 2 }] }} options={donutOpts} />;
        }
        case 'fin-expense-category': {
            const sorted = Object.entries(expenseBySubGroup).sort((a, b) => b[1] - a[1]);
            return <Bar data={{ labels: sorted.map(([n]) => n), datasets: [{ label: 'Amount', data: sorted.map(([, v]) => v), backgroundColor: FINANCE_COLORS.palette.slice(0, sorted.length), borderRadius: 4 }] }} options={{ ...currOpts, indexAxis: 'y' }} />;
        }
        case 'fin-monthly-revenue-total':
            return <Line data={{ labels: shortMonths, datasets: [{ label: 'Total Revenue', data: months.map(m => monthlyData[m].revenue), borderColor: FINANCE_COLORS.success.solid, backgroundColor: FINANCE_COLORS.success.light, borderWidth: 3, tension: 0.4, fill: true, pointRadius: 5, pointBackgroundColor: FINANCE_COLORS.success.solid, pointHoverRadius: 7 }] }} options={currOpts} />;
        case 'fin-monthly-expenses':
            return <Bar data={{ labels: shortMonths, datasets: [{ label: 'Purchase', data: months.map(m => monthlyData[m].purchase), backgroundColor: FINANCE_COLORS.primary.medium, borderRadius: 4 }, { label: 'Operating', data: months.map(m => monthlyData[m].operating), backgroundColor: FINANCE_COLORS.warning.medium, borderRadius: 4 }] }} options={currOpts} />;
        case 'fin-expense-category-trend': {
            const subGroups = {};
            rawData.filter(r => r.MainGroup === 'PURCHASE' || r.MainGroup === 'OPERATING EXPENDITURE').forEach(row => {
                const sg = row.SubGroup || 'Other'; const m = row.Month || 'Unknown';
                if (!subGroups[sg]) subGroups[sg] = {};
                subGroups[sg][m] = (subGroups[sg][m] || 0) + (row.Value || 0);
            });
            const catColors = ['#3B82F6', '#EF4444', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
            const datasets = Object.keys(subGroups).slice(0, 8).map((sg, i) => ({ label: sg, data: months.map(m => subGroups[sg][m] || 0), borderColor: catColors[i], backgroundColor: catColors[i] + '66', fill: true, tension: 0.4, borderWidth: 2 }));
            return <Line data={{ labels: shortMonths, datasets }} options={{ ...currOpts, plugins: { ...currOpts.plugins, datalabels: { display: false } } }} />;
        }
        case 'fin-expense-contribution': {
            let operating = 0, purchase = 0;
            rawData.forEach(r => { if (r.MainGroup === 'OPERATING EXPENDITURE') operating += r.Value || 0; else if (r.MainGroup === 'PURCHASE') purchase += r.Value || 0; });
            return <Doughnut data={{ labels: ['Operating Expenses', 'Purchase/Direct Costs'], datasets: [{ data: [operating, purchase], backgroundColor: [FINANCE_COLORS.warning.medium, FINANCE_COLORS.primary.medium], borderWidth: 2 }] }} options={donutOpts} />;
        }
        case 'fin-mom-revenue-growth': {
            if (months.length < 2) return <NoData />;
            const revData = months.map(m => monthlyData[m].revenue);
            const growth = []; const labels = [];
            for (let i = 1; i < months.length; i++) { labels.push(shortMonths[i]); growth.push(revData[i - 1] > 0 ? parseFloat((((revData[i] - revData[i - 1]) / revData[i - 1]) * 100).toFixed(1)) : 0); }
            return <Line data={{ labels, datasets: [{ label: 'Revenue Growth %', data: growth, borderColor: FINANCE_COLORS.success.solid, borderWidth: 3, tension: 0.4, pointRadius: 5, pointBackgroundColor: growth.map(v => v >= 0 ? '#10B981' : '#EF4444'), fill: false }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { display: true, color: ctx => ctx.dataset.data[ctx.dataIndex] >= 0 ? '#10B981' : '#EF4444', align: ctx => ctx.dataset.data[ctx.dataIndex] >= 0 ? 'top' : 'bottom', anchor: ctx => ctx.dataset.data[ctx.dataIndex] >= 0 ? 'end' : 'start', font: { weight: 'bold', size: 11 }, formatter: v => `${v >= 0 ? '+' : ''}${v}%` } }, scales: { y: { ticks: { callback: v => `${v}%` } } } }} />;
        }
        default: return <NoData />;
    }
};

// ===================== PRODUCTION CHART RENDERER =====================
const ProductionChartRenderer = ({ chartId, dates }) => {
    const { data: meltingData, isLoading: ml } = useQuery({
        queryKey: ['fy-compare', 'prod-melting', dates.fromDate, dates.toDate],
        queryFn: async () => { const res = await api.get('/production-dashboard/melting-data', { params: { fromDate: dates.fromDate, toDate: dates.toDate } }); return res.data; }
    });
    const { data: productionData, isLoading: pl } = useQuery({
        queryKey: ['fy-compare', 'prod-production', dates.fromDate, dates.toDate],
        queryFn: async () => { const res = await api.get('/production-dashboard/production-data', { params: { fromDate: dates.fromDate, toDate: dates.toDate } }); return res.data; }
    });

    const meltingTrend = useMemo(() => {
        if (!Array.isArray(meltingData) || meltingData.length === 0) return null;
        const monthly = {};
        meltingData.forEach(r => { const m = r.Month || 'Unknown'; if (!monthly[m]) monthly[m] = { heats: 0, metal: 0 }; monthly[m].heats += r.HeatNO || 0; monthly[m].metal += r.Metal || 0; });
        const months = Object.keys(monthly).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));
        return { months, heats: months.map(m => monthly[m].heats), metal: months.map(m => monthly[m].metal) };
    }, [meltingData]);

    const prodTrend = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0) return null;
        const monthly = {};
        const gradeData = {};
        productionData.forEach(r => {
            const m = r.Month || 'Unknown';
            if (!monthly[m]) monthly[m] = { ok: 0, rej: 0 };
            monthly[m].ok += r.OKProductionWeight || 0;
            monthly[m].rej += r.RejectionWeight || 0;
            const g = r.MainGrade || 'Other';
            if (!gradeData[g]) gradeData[g] = { ok: 0, rej: 0 };
            gradeData[g].ok += r.OKProductionWeight || 0;
            gradeData[g].rej += r.RejectionWeight || 0;
        });
        const months = Object.keys(monthly).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));
        const partData = {};
        productionData.forEach(r => { const p = r.PartNo || 'Unknown'; partData[p] = (partData[p] || 0) + (r.OKProductionWeight || 0); });
        return { months, ok: months.map(m => monthly[m].ok), rej: months.map(m => monthly[m].rej), gradeData, partData };
    }, [productionData]);

    if (ml || pl) return <LoadingState />;

    const barOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { display: true, align: 'top', anchor: 'end', color: '#1F2937', font: { weight: 'bold', size: 11 }, formatter: v => formatWeight(v) } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatWeight(v) } } } };

    switch (chartId) {
        case 'prod-metal-heats': {
            if (!meltingTrend) return <NoData />;
            return <Bar data={{ labels: formatShortMonths(meltingTrend.months), datasets: [{ label: 'Metal (T)', data: meltingTrend.metal, backgroundColor: PRODUCTION_COLORS.primary.medium, borderRadius: 4 }, { label: 'Heats', data: meltingTrend.heats, backgroundColor: PRODUCTION_COLORS.success.medium, borderRadius: 4 }] }} options={barOpts} />;
        }
        case 'prod-monthly-trend': {
            if (!prodTrend) return <NoData />;
            return <Bar data={{ labels: formatShortMonths(prodTrend.months), datasets: [{ label: 'OK Production', data: prodTrend.ok, backgroundColor: PRODUCTION_COLORS.success.medium, borderRadius: 4 }, { label: 'Rejection', data: prodTrend.rej, backgroundColor: PRODUCTION_COLORS.danger.medium, borderRadius: 4 }] }} options={barOpts} />;
        }
        case 'prod-grade-treemap': {
            if (!prodTrend) return <NoData />;
            const treemap = Object.entries(prodTrend.gradeData).map(([g, d]) => ({ grade: g, value: d.ok }));
            if (treemap.length === 0) return <NoData />;
            return <TreeMapChart data={treemap} />;
        }
        case 'prod-grade-rejection': {
            if (!prodTrend) return <NoData />;
            const entries = Object.entries(prodTrend.gradeData).filter(([, d]) => d.ok + d.rej > 0).map(([g, d]) => ({ grade: g, pct: ((d.rej / (d.ok + d.rej)) * 100) })).sort((a, b) => b.pct - a.pct).slice(0, 10);
            return <Bar data={{ labels: entries.map(e => e.grade), datasets: [{ label: 'Rejection %', data: entries.map(e => parseFloat(e.pct.toFixed(1))), backgroundColor: PRODUCTION_COLORS.danger.medium, borderRadius: 4 }] }} options={{ ...barOpts, plugins: { ...barOpts.plugins, datalabels: { ...barOpts.plugins.datalabels, formatter: v => `${v}%` } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `${v}%` } } } }} />;
        }
        case 'prod-ok-rej-pie': {
            if (!prodTrend) return <NoData />;
            const totalOk = prodTrend.ok.reduce((a, b) => a + b, 0);
            const totalRej = prodTrend.rej.reduce((a, b) => a + b, 0);
            return <Pie data={{ labels: ['OK Production', 'Rejection'], datasets: [{ data: [totalOk, totalRej], backgroundColor: [PRODUCTION_COLORS.success.medium, PRODUCTION_COLORS.danger.medium], borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { display: true, color: '#1F2937', font: { weight: 'bold', size: 14 }, formatter: (v, ctx) => { const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); return `${((v / total) * 100).toFixed(1)}%`; } } } }} />;
        }
        case 'prod-grade-pie': {
            if (!prodTrend) return <NoData />;
            const entries = Object.entries(prodTrend.gradeData).sort((a, b) => b[1].ok - a[1].ok);
            const colors = ['#2563EB', '#10B981', '#F59E0B', '#F43F5E', '#8B5CF6', '#14B8A6', '#EC4899', '#F97316'];
            return <Pie data={{ labels: entries.map(([g]) => g), datasets: [{ data: entries.map(([, d]) => d.ok), backgroundColor: colors.slice(0, entries.length), borderWidth: 2 }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { display: true, color: '#1F2937', font: { weight: 'bold', size: 12 }, formatter: (v, ctx) => { const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); const p = ((v / total) * 100).toFixed(1); return p > 3 ? `${p}%` : ''; } } } }} />;
        }
        case 'prod-top-parts': {
            if (!prodTrend) return <NoData />;
            const sorted = Object.entries(prodTrend.partData).sort((a, b) => b[1] - a[1]).slice(0, 10);
            return <Bar data={{ labels: sorted.map(([n]) => n.length > 15 ? n.substring(0, 13) + '..' : n), datasets: [{ label: 'OK Weight', data: sorted.map(([, v]) => v), backgroundColor: PRODUCTION_COLORS.success.medium, borderRadius: 4 }] }} options={{ ...barOpts, indexAxis: 'y' }} />;
        }
        case 'prod-mom-growth': {
            if (!prodTrend || prodTrend.months.length < 2) return <NoData />;
            const shortM = formatShortMonths(prodTrend.months);
            const labels = []; const okG = []; const rejG = [];
            for (let i = 1; i < prodTrend.months.length; i++) {
                labels.push(shortM[i]);
                okG.push(prodTrend.ok[i - 1] > 0 ? parseFloat((((prodTrend.ok[i] - prodTrend.ok[i - 1]) / prodTrend.ok[i - 1]) * 100).toFixed(1)) : 0);
                rejG.push(prodTrend.rej[i - 1] > 0 ? parseFloat((((prodTrend.rej[i] - prodTrend.rej[i - 1]) / prodTrend.rej[i - 1]) * 100).toFixed(1)) : 0);
            }
            return <Line data={{ labels, datasets: [{ label: 'OK Growth %', data: okG, borderColor: PRODUCTION_COLORS.success.solid, borderWidth: 3, tension: 0.4, pointRadius: 5, fill: false }, { label: 'Rejection Growth %', data: rejG, borderColor: PRODUCTION_COLORS.danger.solid, borderWidth: 3, tension: 0.4, pointRadius: 5, fill: false }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { display: true, color: ctx => ctx.dataset.data[ctx.dataIndex] >= 0 ? '#10B981' : '#EF4444', font: { weight: 'bold', size: 10 }, formatter: v => `${v >= 0 ? '+' : ''}${v}%` } }, scales: { y: { ticks: { callback: v => `${v}%` } } } }} />;
        }
        case 'prod-yield-improvement': {
            if (!prodTrend || prodTrend.months.length === 0) return <NoData />;
            const yields = prodTrend.months.map((_, i) => { const total = prodTrend.ok[i] + prodTrend.rej[i]; return total > 0 ? parseFloat(((prodTrend.ok[i] / total) * 100).toFixed(1)) : 0; });
            return <Bar data={{ labels: formatShortMonths(prodTrend.months), datasets: [{ label: 'Yield %', data: yields, backgroundColor: PRODUCTION_COLORS.success.medium, borderRadius: 4 }] }} options={{ ...barOpts, plugins: { ...barOpts.plugins, datalabels: { ...barOpts.plugins.datalabels, formatter: v => `${v}%` } }, scales: { y: { beginAtZero: false, min: Math.max(0, Math.min(...yields) - 5), ticks: { callback: v => `${v}%` } } } }} />;
        }
        default: return <NoData />;
    }
};

// ===================== REJECTION CHART RENDERER =====================
const RejectionChartRenderer = ({ chartId, dates }) => {
    const { data: dashData, isLoading } = useQuery({
        queryKey: ['fy-compare', 'rejection', dates.fromDate, dates.toDate],
        queryFn: async () => { const res = await api.get('/rejection-dashboard/data'); return res.data; }
    });

    const sorted = useMemo(() => {
        if (!Array.isArray(dashData) || dashData.length === 0) return [];
        return [...dashData].sort((a, b) => {
            const mA = monthOrder[(a.Months || '').toLowerCase()] || 0;
            const mB = monthOrder[(b.Months || '').toLowerCase()] || 0;
            const valA = mA < 4 ? mA + 12 : mA;
            const valB = mB < 4 ? mB + 12 : mB;
            return valA - valB;
        });
    }, [dashData]);

    if (isLoading) return <LoadingState />;
    if (sorted.length === 0) return <NoData />;

    const monthLabels = formatShortMonths(sorted.map(d => d.Months));
    const lineOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, datalabels: { display: true, align: 'top', anchor: 'end', color: '#1F2937', font: { weight: 'bold', size: 11 } } }, scales: { y: { beginAtZero: true } } };
    const pctFormatter = v => `${(v || 0).toFixed(1)}%`;

    switch (chartId) {
        case 'rej-prod-dispatch':
            return <Line data={{ labels: monthLabels, datasets: [{ label: 'Production Weight', data: sorted.map(d => d.ProductionWeight || 0), borderColor: 'rgba(59, 130, 246, 1)', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 3, tension: 0.4, fill: true }, { label: 'Dispatch Weight', data: sorted.map(d => d.DespatchWeight || 0), borderColor: 'rgba(16, 185, 129, 1)', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderWidth: 3, tension: 0.4, fill: true }] }} options={{ ...lineOpts, plugins: { ...lineOpts.plugins, datalabels: { ...lineOpts.plugins.datalabels, formatter: v => formatWeight(v) } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatWeight(v) } } } }} />;
        case 'rej-pct-breakdown':
            return <Bar data={{ labels: monthLabels, datasets: [{ label: 'Inhouse %', data: sorted.map(d => d.ProductionWeight > 0 ? (d.InhouseRejWt / d.ProductionWeight) * 100 : 0), backgroundColor: 'rgba(20, 184, 166, 0.8)', borderRadius: 4 }, { label: 'Subcon %', data: sorted.map(d => d.SubconOutweight > 0 ? (d.SubconRejWt / d.SubconOutweight) * 100 : 0), backgroundColor: 'rgba(245, 158, 11, 0.8)', borderRadius: 4 }, { label: 'Customer %', data: sorted.map(d => d.DespatchWeight > 0 ? (d.CustEndRejWt / d.DespatchWeight) * 100 : 0), backgroundColor: 'rgba(59, 130, 246, 0.8)', borderRadius: 4 }] }} options={{ ...lineOpts, plugins: { ...lineOpts.plugins, datalabels: { ...lineOpts.plugins.datalabels, formatter: pctFormatter } }, scales: { y: { beginAtZero: true, stacked: true, ticks: { callback: v => `${v}%` } }, x: { stacked: true } } }} />;
        case 'rej-total-trend':
            return <Bar data={{ labels: monthLabels, datasets: [{ label: 'Total Rejection %', data: sorted.map(d => { const i = d.ProductionWeight > 0 ? (d.InhouseRejWt / d.ProductionWeight) * 100 : 0; const s = d.SubconOutweight > 0 ? (d.SubconRejWt / d.SubconOutweight) * 100 : 0; const c = d.DespatchWeight > 0 ? (d.CustEndRejWt / d.DespatchWeight) * 100 : 0; return i + s + c; }), backgroundColor: 'rgba(239, 68, 68, 0.85)', borderRadius: 4 }] }} options={{ ...lineOpts, plugins: { ...lineOpts.plugins, datalabels: { ...lineOpts.plugins.datalabels, formatter: pctFormatter } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `${v}%` } } } }} />;
        case 'rej-customer-trend':
            return <Line data={{ labels: monthLabels, datasets: [{ label: 'Customer Rejection %', data: sorted.map(d => d.DespatchWeight > 0 ? (d.CustEndRejWt / d.DespatchWeight) * 100 : 0), borderColor: REJECTION_COLORS.primary.solid, borderWidth: 3, tension: 0.4, fill: false, pointRadius: 5 }] }} options={{ ...lineOpts, plugins: { ...lineOpts.plugins, datalabels: { ...lineOpts.plugins.datalabels, formatter: pctFormatter } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `${v}%` } } } }} />;
        case 'rej-inhouse-trend':
            return <Line data={{ labels: monthLabels, datasets: [{ label: 'Inhouse Rejection %', data: sorted.map(d => d.ProductionWeight > 0 ? (d.InhouseRejWt / d.ProductionWeight) * 100 : 0), borderColor: REJECTION_COLORS.warning?.solid || '#F59E0B', borderWidth: 3, tension: 0.4, fill: false, pointRadius: 5 }] }} options={{ ...lineOpts, plugins: { ...lineOpts.plugins, datalabels: { ...lineOpts.plugins.datalabels, formatter: pctFormatter } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `${v}%` } } } }} />;
        case 'rej-subcon-trend':
            return <Line data={{ labels: monthLabels, datasets: [{ label: 'Subcontractor Rejection %', data: sorted.map(d => d.SubconOutweight > 0 ? (d.SubconRejWt / d.SubconOutweight) * 100 : 0), borderColor: REJECTION_COLORS.danger?.solid || '#EF4444', borderWidth: 3, tension: 0.4, fill: false, pointRadius: 5 }] }} options={{ ...lineOpts, plugins: { ...lineOpts.plugins, datalabels: { ...lineOpts.plugins.datalabels, formatter: pctFormatter } }, scales: { y: { beginAtZero: true, ticks: { callback: v => `${v}%` } } } }} />;
        case 'rej-contribution-pie': {
            const totalProdWt = sorted.reduce((a, d) => a + (d.ProductionWeight || 0), 0);
            const totalSubconOutWt = sorted.reduce((a, d) => a + (d.SubconOutweight || 0), 0);
            const totalDispatchWt = sorted.reduce((a, d) => a + (d.DespatchWeight || 0), 0);
            const inhouseRejWt = sorted.reduce((a, d) => a + (d.InhouseRejWt || 0), 0);
            const subRejWt = sorted.reduce((a, d) => a + (d.SubconRejWt || 0), 0);
            const custRejWt = sorted.reduce((a, d) => a + (d.CustEndRejWt || 0), 0);
            const inhousePct = totalProdWt > 0 ? (inhouseRejWt / totalProdWt) * 100 : 0;
            const subPct = totalSubconOutWt > 0 ? (subRejWt / totalSubconOutWt) * 100 : 0;
            const custPct = totalDispatchWt > 0 ? (custRejWt / totalDispatchWt) * 100 : 0;
            return <Pie data={{ labels: ['Inhouse', 'Subcontractor', 'Customer'], datasets: [{ data: [inhousePct, subPct, custPct], backgroundColor: [REJECTION_COLORS.primary.medium, REJECTION_COLORS.success.medium, REJECTION_COLORS.warning.medium], borderWidth: 2, borderColor: '#fff' }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { display: true, color: '#1F2937', font: { weight: 'bold', size: 14 }, formatter: (v, ctx) => { const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); return total > 0 ? `${((v / total) * 100).toFixed(1)}%` : ''; } } } }} />;
        }
        case 'rej-weight-comparison':
            return <Bar data={{ labels: monthLabels, datasets: [{ label: 'Inhouse', data: sorted.map(d => d.InhouseRejWt || 0), backgroundColor: 'rgba(134, 239, 172, 0.75)', borderRadius: 4 }, { label: 'Subcontractor', data: sorted.map(d => d.SubconRejWt || 0), backgroundColor: 'rgba(147, 197, 253, 0.75)', borderRadius: 4 }, { label: 'Customer', data: sorted.map(d => d.CustEndRejWt || 0), backgroundColor: 'rgba(216, 180, 254, 0.75)', borderRadius: 4 }] }} options={{ ...lineOpts, plugins: { ...lineOpts.plugins, datalabels: { ...lineOpts.plugins.datalabels, formatter: v => formatWeight(v) } }, scales: { y: { beginAtZero: true, ticks: { callback: v => formatWeight(v) } } } }} />;
        default: return <NoData />;
    }
};


export default FYComparison;
