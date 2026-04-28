import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { format, subMonths } from 'date-fns';
import api from '../api';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import ExportButtons from './common/ExportButtons';
import ExportButton from './ExportButton';
import {
    applyChartDefaults,
    CHART_COLORS,
    AR_COLORS,
    formatShortMonths
} from '../utils/chartConfig';
import {
    generateDashboardFYOptions,
    getFyApiDateRange,
    DASHBOARD_FY_SELECT_STYLE
} from '../utils/dashboardFYFilter';
import './dashboard/Dashboard.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    ChartDataLabels
);

// Apply global chart defaults from shared config
applyChartDefaults(ChartJS);

const REFRESH_INTERVAL = 120000; // 2 minutes

// Format currency in Indian format (L, Cr)
const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '₹0';
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    if (absValue >= 10000000) {
        return `${sign}₹${(absValue / 10000000).toFixed(2)} Cr`;
    } else if (absValue >= 100000) {
        return `${sign}₹${(absValue / 100000).toFixed(2)} L`;
    } else if (absValue >= 1000) {
        return `${sign}₹${(absValue / 1000).toFixed(1)} K`;
    }
    return `${sign}₹${absValue.toFixed(0)}`;
};

// Format percentage
const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
};

const ARAPDashboard = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [countdown, setCountdown] = useState(60);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [expandedChart, setExpandedChart] = useState(null);
    
    // Read tab from URL, default to 'outstanding'
    const activeTab = searchParams.get('tab') || 'outstanding';
    
    // Handler to change tab and update URL
    const setActiveTab = useCallback((tab) => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    const fyOptions = useMemo(() => generateDashboardFYOptions(), []);

    // Get current FY dates
    const getCurrentFYDates = () => {
        const today = new Date();
        const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        return {
            fromDate: format(new Date(fyStartYear, 3, 1), 'yyyy-MM-dd'),
            toDate: format(today, 'yyyy-MM-dd')
        };
    };

    // Filter states
    const [activePreset, setActivePreset] = useState('fy');
    const [selectedFY, setSelectedFY] = useState(() => fyOptions[0]?.value);
    const [nonFyRange, setNonFyRange] = useState(getCurrentFYDates);

    const appliedFilters = useMemo(() => {
        if (activePreset === 'fy') {
            const { fromDate, toDate } = getFyApiDateRange(selectedFY);
            return {
                fromDate: format(fromDate, 'yyyy-MM-dd'),
                toDate: format(toDate, 'yyyy-MM-dd')
            };
        }
        return nonFyRange;
    }, [activePreset, selectedFY, nonFyRange]);

    // Handle preset change
    const handlePresetChange = (preset) => {
        setActivePreset(preset);
        if (preset === 'fy') return;

        const today = new Date();
        let fromDate, toDate;

        switch (preset) {
            case 'thisMonth':
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                toDate = today;
                break;
            case 'lastMonth':
                fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                toDate = new Date(today.getFullYear(), today.getMonth(), 0);
                break;
            case 'last3Months':
                fromDate = subMonths(today, 3);
                toDate = today;
                break;
            case 'last6Months':
                fromDate = subMonths(today, 6);
                toDate = today;
                break;
            default:
                return;
        }

        setNonFyRange({
            fromDate: format(fromDate, 'yyyy-MM-dd'),
            toDate: format(toDate, 'yyyy-MM-dd')
        });
    };

    // Preset button style helper
    const getPresetStyle = (preset) => ({
        padding: '0.5rem 1rem',
        backgroundColor: activePreset === preset ? '#3B82F6' : '#E5E7EB',
        color: activePreset === preset ? 'white' : '#374151',
        border: 'none',
        borderRadius: '8px',
        fontWeight: '600',
        cursor: 'pointer',
        fontSize: '0.875rem',
        transition: 'all 0.2s'
    });

    // Chart refs for export
    const agingChartRef = useRef(null);
    const categoryOutstandingChartRef = useRef(null);
    const top10ChartRef = useRef(null);
    const clientsChartRef = useRef(null);
    const monthlyRecoveryTrendRef = useRef(null);
    const domExpContributionRef = useRef(null);
    const recoveryMixRef = useRef(null);
    const momGrowthRef = useRef(null);
    const cumulativeRecoveryRef = useRef(null);

    // Close modal on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && expandedChart) {
                setExpandedChart(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [expandedChart]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (expandedChart) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [expandedChart]);

    // Countdown timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => prev <= 1 ? 60 : prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto-refresh
    useEffect(() => {
        const refreshTimer = setInterval(() => {
            queryClient.invalidateQueries(['ar-dashboard']);
            setLastRefresh(new Date());
            setCountdown(60);
        }, REFRESH_INTERVAL);
        return () => clearInterval(refreshTimer);
    }, [queryClient]);

    // Fetch data from API
    const { data: rawData, isLoading } = useQuery({
        queryKey: ['ar-dashboard', 'data'],
        queryFn: async () => {
            const res = await api.get('/ar-dashboard/data');
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch recovery data from API with date filters
    const { data: recoveryData, isLoading: isRecoveryLoading } = useQuery({
        queryKey: ['ar-dashboard', 'recovery', appliedFilters.fromDate, appliedFilters.toDate],
        queryFn: async () => {
            const res = await api.get('/ar-dashboard/recovery', {
                params: {
                    fromDate: appliedFilters.fromDate,
                    toDate: appliedFilters.toDate
                }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Manual refresh
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries(['ar-dashboard']);
        setLastRefresh(new Date());
        setCountdown(60);
    }, [queryClient]);

    // ============================================
    // DATA PROCESSING
    // ============================================

    // Calculate KPIs
    const kpis = useMemo(() => {
        if (!Array.isArray(rawData) || rawData.length === 0) {
            return {
                totalOutstanding: 0,
                overdueAmount: 0,
                onAccountAmount: 0,
                avgCreditPeriod: 0,
                overduePercent: 0
            };
        }

        let totalOutstanding = 0;
        let overdueAmount = 0;
        let onAccountAmount = 0;
        let totalCreditPeriod = 0;
        let creditPeriodCount = 0;

        rawData.forEach(row => {
            const amount = row.Amount || 0;
            const desc = (row.Description || '').toLowerCase();
            const creditPeriod = row.CreditPeriod || 0;

            // Total Outstanding Amount - AgeSlab = 'Total Outstanding Amount(Rs.)'
            if (desc.includes('total outstanding amount')) {
                totalOutstanding += amount;
            }
            // Overdue Amount - AgeSlab = 'Overdue Amount(Rs.)'
            if (desc.includes('overdue amount')) {
                overdueAmount += amount;
            }
            // On Account Amount - AgeSlab = 'On Account Amount(Rs.)'
            if (desc.includes('on account amount')) {
                onAccountAmount += amount;
            }
            // Collect credit periods for average calculation
            if (creditPeriod > 0) {
                totalCreditPeriod += creditPeriod;
                creditPeriodCount++;
            }
        });

        // Average Credit Period
        const avgCreditPeriod = creditPeriodCount > 0 ? totalCreditPeriod / creditPeriodCount : 0;

        // % Overdue = Overdue ÷ Total Outstanding
        const overduePercent = totalOutstanding > 0 ? (overdueAmount / totalOutstanding) * 100 : 0;

        return {
            totalOutstanding,
            overdueAmount,
            onAccountAmount,
            avgCreditPeriod,
            overduePercent
        };
    }, [rawData]);

    // 1. Aging Bucket Distribution - Horizontal Bar Chart
    // Y-axis: AgeSlab, X-axis: Sum(Amount)
    const agingBucketData = useMemo(() => {
        if (!Array.isArray(rawData) || rawData.length === 0) return null;

        const agingBuckets = {
            '0 - 45': 0,
            '46 - 60': 0,
            '61 - 90': 0,
            'Above 90': 0
        };

        rawData.forEach(row => {
            const desc = row.Description || '';
            const amount = row.Amount || 0;

            // Check if it's an aging slab (contains numbers with dash)
            if (/^\d+\s*-\s*(\\d+|above)/i.test(desc) || desc.match(/^\d+\s*-\s*\d+/) || desc.toLowerCase().includes('above')) {
                // Map to buckets
                if (desc.includes('0 - 45') || desc.includes('0-45') || desc.match(/^0\s*-\s*45/)) {
                    agingBuckets['0 - 45'] += amount;
                } else if (desc.includes('46 - 60') || desc.includes('46-60') || desc.match(/46\s*-\s*60/)) {
                    agingBuckets['46 - 60'] += amount;
                } else if (desc.includes('61 - 90') || desc.includes('61-90') || desc.match(/61\s*-\s*90/)) {
                    agingBuckets['61 - 90'] += amount;
                } else if (desc.includes('91') || desc.toLowerCase().includes('above') || desc.includes('120')) {
                    agingBuckets['Above 90'] += amount;
                }
            }
        });

        const labels = Object.keys(agingBuckets);
        const data = Object.values(agingBuckets);

        return {
            labels,
            datasets: [{
                label: 'Amount',
                data,
                backgroundColor: [
                    CHART_COLORS.success.medium,
                    CHART_COLORS.primary.medium,
                    CHART_COLORS.warning.medium,
                    CHART_COLORS.danger.medium
                ],
                borderColor: [
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(234, 88, 12, 1)',
                    'rgba(220, 38, 38, 1)'
                ],
                borderWidth: 1,
                borderRadius: 4
            }]
        };
    }, [rawData]);

    // 2. Category-wise Outstanding Exposure - Vertical Bar Chart
    // X-axis: Category, Y-axis: Sum(Amount) split by Overdue/Not Overdue
    const categoryOutstandingData = useMemo(() => {
        if (!Array.isArray(rawData) || rawData.length === 0) return null;

        const categoryData = {};

        rawData.forEach(row => {
            const category = row.Category || 'Unknown';
            const desc = (row.Description || '').toLowerCase();
            const amount = row.Amount || 0;

            if (!categoryData[category]) {
                categoryData[category] = { outstanding: 0, overdue: 0 };
            }

            if (desc.includes('total outstanding amount')) {
                categoryData[category].outstanding += amount;
            } else if (desc.includes('overdue amount')) {
                categoryData[category].overdue += amount;
            }
        });

        const labels = Object.keys(categoryData);
        const notOverdueData = labels.map(cat => Math.max(0, categoryData[cat].outstanding - categoryData[cat].overdue));
        const overdueData = labels.map(cat => categoryData[cat].overdue);

        return {
            labels,
            datasets: [
                {
                    label: 'Not Overdue',
                    data: notOverdueData,
                    backgroundColor: AR_COLORS.success.medium,
                    borderColor: AR_COLORS.success.solid,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Overdue',
                    data: overdueData,
                    backgroundColor: AR_COLORS.danger.medium,
                    borderColor: AR_COLORS.danger.solid,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        };
    }, [rawData]);





    // Top 10 Outstanding - Export & Domestic Combined
    const top10Data = useMemo(() => {
        if (!Array.isArray(rawData) || rawData.length === 0) return null;

        // Get outstanding amounts by customer
        const customerOutstanding = {};
        
        rawData.forEach(row => {
            const desc = (row.Description || '').toLowerCase();
            if (desc.includes('total outstanding')) {
                const customer = row.CustomerName || 'Unknown';
                const category = row.Category || 'Domestic';
                const amount = row.Amount || 0;
                
                if (!customerOutstanding[customer]) {
                    customerOutstanding[customer] = { amount: 0, category };
                }
                customerOutstanding[customer].amount += amount;
            }
        });

        // Sort and get top 10
        const sorted = Object.entries(customerOutstanding)
            .sort((a, b) => b[1].amount - a[1].amount)
            .slice(0, 10);

        const labels = sorted.map(([name]) => name.length > 20 ? name.substring(0, 18) + '...' : name);
        const fullNames = sorted.map(([name]) => name);
        const data = sorted.map(([, val]) => val.amount);
        const categories = sorted.map(([, val]) => val.category);

        return {
            labels,
            fullNames,
            datasets: [{
                label: 'Outstanding Amount',
                data,
                backgroundColor: AR_COLORS.success.medium,
                borderColor: AR_COLORS.success.solid,
                borderWidth: 1,
                borderRadius: 4
            }],
            categories
        };
    }, [rawData]);

    // Clients Overdue - Vertical Bar Chart
    // Only show Overdue amounts
    const clientsOverdueData = useMemo(() => {
        if (!Array.isArray(rawData) || rawData.length === 0) return null;

        // Get overdue amounts by customer
        const customerData = {};
        
        rawData.forEach(row => {
            const desc = (row.Description || '').toLowerCase();
            const customer = row.CustomerName || 'Unknown';
            const amount = row.Amount || 0;
            
            if (!customerData[customer]) {
                customerData[customer] = { overdue: 0 };
            }
            
            if (desc.includes('overdue amount')) {
                customerData[customer].overdue += amount;
            }
        });

        // Sort by overdue and get top 10
        const sorted = Object.entries(customerData)
            .filter(([, data]) => data.overdue > 0)
            .sort((a, b) => b[1].overdue - a[1].overdue)
            .slice(0, 10);

        const labels = sorted.map(([name]) => name.length > 15 ? name.substring(0, 13) + '...' : name);
        const fullNames = sorted.map(([name]) => name);
        const overdueData = sorted.map(([, data]) => data.overdue);

        return {
            labels,
            fullNames,
            datasets: [
                {
                    label: 'Overdue',
                    data: overdueData,
                    backgroundColor: AR_COLORS.danger.medium,
                    borderColor: AR_COLORS.danger.solid,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        };
    }, [rawData]);

    // ============================================
    // RECOVERY SECTION DATA PROCESSING
    // ============================================

    // Recovery KPIs
    const recoveryKpis = useMemo(() => {
        if (!Array.isArray(recoveryData) || recoveryData.length === 0) {
            return {
                totalRecovery: 0,
                domesticRecovery: 0,
                exportRecovery: 0,
                domesticPercent: 0,
                exportPercent: 0
            };
        }

        const totalRecovery = recoveryData.reduce((sum, row) => sum + (row.TotalAmount || 0), 0);
        const domesticRecovery = recoveryData.reduce((sum, row) => sum + (row.DomesticAmount || 0), 0);
        const exportRecovery = recoveryData.reduce((sum, row) => sum + (row.ExportAmount || 0), 0);

        return {
            totalRecovery,
            domesticRecovery,
            exportRecovery,
            domesticPercent: totalRecovery > 0 ? (domesticRecovery / totalRecovery) * 100 : 0,
            exportPercent: totalRecovery > 0 ? (exportRecovery / totalRecovery) * 100 : 0
        };
    }, [recoveryData]);

    // 1. Monthly Recovery Trend - Multi-line Chart
    const monthlyTrendData = useMemo(() => {
        if (!Array.isArray(recoveryData) || recoveryData.length === 0) return null;

        const labels = formatShortMonths(recoveryData.map(row => row.TransactionDate));
        const domesticData = recoveryData.map(row => row.DomesticAmount || 0);
        const exportData = recoveryData.map(row => row.ExportAmount || 0);
        const totalData = recoveryData.map(row => row.TotalAmount || 0);

        return {
            labels,
            datasets: [
                {
                    label: 'Domestic',
                    data: domesticData,
                    borderColor: AR_COLORS.primary.solid,
                    backgroundColor: AR_COLORS.primary.light,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Export',
                    data: exportData,
                    borderColor: AR_COLORS.success.solid,
                    backgroundColor: AR_COLORS.success.light,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                },
                {
                    label: 'Total',
                    data: totalData,
                    borderColor: AR_COLORS.success.solid,
                    backgroundColor: 'transparent',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2
                }
            ]
        };
    }, [recoveryData]);

    // 2. Stacked Column Chart - Domestic vs Export Contribution
    const stackedContributionData = useMemo(() => {
        if (!Array.isArray(recoveryData) || recoveryData.length === 0) return null;

        const labels = formatShortMonths(recoveryData.map(row => row.TransactionDate));

        return {
            labels,
            datasets: [
                {
                    label: 'Domestic',
                    data: recoveryData.map(row => row.DomesticAmount || 0),
                    backgroundColor: AR_COLORS.primary.medium,
                    borderColor: AR_COLORS.primary.solid,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Export',
                    data: recoveryData.map(row => row.ExportAmount || 0),
                    backgroundColor: AR_COLORS.success.medium,
                    borderColor: AR_COLORS.success.solid,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        };
    }, [recoveryData]);

    // 3. Recovery Mix Donut Chart
    const recoveryMixData = useMemo(() => {
        if (!recoveryKpis) return null;

        return {
            labels: ['Domestic', 'Export'],
            datasets: [{
                data: [recoveryKpis.domesticRecovery, recoveryKpis.exportRecovery],
                backgroundColor: [
                    AR_COLORS.primary.medium,
                    AR_COLORS.success.medium
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        };
    }, [recoveryKpis]);

    // 4. Month-over-Month Growth Bar Chart
    const momGrowthData = useMemo(() => {
        if (!Array.isArray(recoveryData) || recoveryData.length < 2) return null;

        const labels = formatShortMonths(recoveryData.slice(1).map(row => row.TransactionDate));
        const growthData = recoveryData.slice(1).map((row, idx) => {
            const prevTotal = recoveryData[idx].TotalAmount || 1;
            const currTotal = row.TotalAmount || 0;
            return ((currTotal - prevTotal) / prevTotal) * 100;
        });

        return {
            labels,
            datasets: [{
                label: 'MoM Growth %',
                data: growthData,
                backgroundColor: growthData.map(g => 
                    g >= 0 ? AR_COLORS.success.medium : AR_COLORS.danger.medium
                ),
                borderColor: growthData.map(g =>
                    g >= 0 ? AR_COLORS.success.solid : AR_COLORS.danger.solid
                ),
                borderWidth: 1,
                borderRadius: 4
            }]
        };
    }, [recoveryData]);

    // 5. Cumulative Recovery Line Chart
    const cumulativeData = useMemo(() => {
        if (!Array.isArray(recoveryData) || recoveryData.length === 0) return null;

        const labels = formatShortMonths(recoveryData.map(row => row.TransactionDate));
        let runningTotal = 0;
        const cumulativeTotals = recoveryData.map(row => {
            runningTotal += (row.TotalAmount || 0);
            return runningTotal;
        });

        return {
            labels,
            datasets: [{
                label: 'Cumulative Recovery',
                data: cumulativeTotals,
                borderColor: AR_COLORS.success.solid,
                backgroundColor: AR_COLORS.success.light,
                fill: true,
                tension: 0.4,
                borderWidth: 3
            }]
        };
    }, [recoveryData]);

    // 1. Horizontal Bar Options for Aging Bucket Distribution
    const agingHorizontalBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => formatCurrency(context.raw)
                }
            },
            datalabels: {
                display: (context) => context.dataset.data[context.dataIndex] > 0,
                anchor: 'center',
                align: 'center',
                color: '#000000',
                font: {
                    weight: 'bold',
                    size: 12
                },
                formatter: (value) => formatCurrency(value)
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                }
            }
        }
    };

    // 2. Category-wise Stacked Bar Options
    const categoryStackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            },
            datalabels: {
                display: (context) => context.dataset.data[context.dataIndex] > 0,
                anchor: 'center',
                align: 'center',
                color: '#000000',
                font: {
                    weight: 'bold',
                    size: 13
                },
                formatter: (value) => formatCurrency(value)
            }
        },
        scales: {
            x: { 
                stacked: true,
                grid: { display: false }
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                }
            }
        },
        // Make bars thinner
        barPercentage: 0.5,
        categoryPercentage: 0.6
    };



    // ============================================
    // RECOVERY SECTION CHART OPTIONS
    // ============================================

    // Line chart options for monthly trend
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            },
            datalabels: {
                display: true, // Show labels
                align: 'top',
                anchor: 'center',
                offset: 4,
                color: '#000000',
                font: { weight: 'bold', size: 15 },
                formatter: (value) => formatCurrency(value),
                backgroundColor: 'rgba(255, 255, 255, 0.75)', // Add background for readability
                borderRadius: 4,
                padding: 2
            }
        },
        scales: {
            x: {
                offset: true,
                grid: { display: false }
            },
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                }
            }
        }
    };

    // Stacked bar options for contribution chart
    const recoveryStackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            },
            datalabels: {
                display: (context) => context.dataset.data[context.dataIndex] > 0,
                anchor: 'center',
                align: 'center',
                color: '#000000',
                font: { weight: 'bold', size: 15 },
                formatter: (value) => formatCurrency(value)
            }
        },
        scales: {
            x: { stacked: true },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                }
            }
        }
    };

    // MoM Growth bar options
    const momGrowthOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.raw.toFixed(1)}%`
                }
            },
            datalabels: {
                display: true,
                color: (context) => {
                    const value = context.dataset.data[context.dataIndex];
                    return value >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(220, 38, 38, 1)';
                },
                anchor: (context) => {
                    const value = context.dataset.data[context.dataIndex];
                    return value >= 0 ? 'end' : 'start';
                },
                align: (context) => {
                    const value = context.dataset.data[context.dataIndex];
                    return value >= 0 ? 'top' : 'bottom';
                },
                offset: 4,
                font: { weight: 'bold', size: 15 },
                formatter: (value) => `${value.toFixed(1)}%`
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                ticks: {
                    callback: (value) => `${value.toFixed(0)}%`
                }
            }
        }
    };

    // Vertical bar options for clients overdue
    const clientsOverdueOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    title: (tooltipItems) => {
                        if (clientsOverdueData && clientsOverdueData.fullNames) {
                            return clientsOverdueData.fullNames[tooltipItems[0].dataIndex];
                        }
                        return tooltipItems[0].label;
                    },
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            },
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                color: '#1a1a2e',
                font: { weight: 'bold', size: 13 },
                formatter: (value) => formatCurrency(value)
            }
        },
        scales: {
            x: { grid: { display: false } }, // Not stacked anymore
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                }
            }
        }
    }), [clientsOverdueData]);

    // Simple horizontal bar options for top 10
    const horizontalBarOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (tooltipItems) => {
                        if (top10Data && top10Data.fullNames) {
                            return top10Data.fullNames[tooltipItems[0].dataIndex];
                        }
                        return tooltipItems[0].label;
                    },
                    label: (context) => formatCurrency(context.raw)
                }
            },
            datalabels: {
                labels: {
                    name: {
                        display: true,
                        anchor: 'start',
                        align: 'right',
                        offset: 4,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 11
                        },
                        formatter: (value, context) => {
                            if (top10Data && top10Data.fullNames) {
                                return top10Data.fullNames[context.dataIndex];
                            }
                            return '';
                        }
                    },
                    amount: {
                        display: true,
                        anchor: 'end',
                        align: 'right',
                        offset: 4,
                        color: '#000000',
                        font: {
                            weight: 'bold',
                            size: 14
                        },
                        formatter: (value) => formatCurrency(value)
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                }
            },
            y: {
                ticks: {
                    display: false
                }
            }
        }
    }), [top10Data]);

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '35%', // Thicker donut like Finance Dashboard
        plugins: {
            legend: { position: 'right' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? ((context.raw / total) * 100).toFixed(1) : 0;
                        return `${context.label}: ${formatCurrency(context.raw)} (${pct}%)`;
                    }
                }
            },
            datalabels: {
                display: true,
                color: '#111827',
                font: {
                    weight: 'bold',
                    size: 15
                },
                formatter: (value, context) => {
                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return percentage > 5 ? `${percentage}%` : '';
                },
                anchor: 'center',
                align: 'center'
            }
        }
    };

    // Chart card style
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
            {/* Fullscreen Chart Modal */}
            {expandedChart && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.85)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2rem'
                    }}
                    onClick={() => setExpandedChart(null)}
                >
                    <div 
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '2rem',
                            width: '90vw',
                            height: '85vh',
                            maxWidth: '1400px',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', margin: 0 }}>
                                {expandedChart.title}
                            </h2>
                            <button
                                onClick={() => setExpandedChart(null)}
                                style={{
                                    background: '#EF4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.5rem 1rem',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.875rem'
                                }}
                            >
                                ✕ Close
                            </button>
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>
                            {expandedChart.content}
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>📊 Outstanding and Recovery Dashboard</h1>
                    <p className="welcome-text">Account Receivables Overview</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ExportButtons
                        chartRefs={[
                            { ref: agingChartRef, title: 'Aging Bucket Distribution' },
                            { ref: categoryOutstandingChartRef, title: 'Category-wise Outstanding' },
                            { ref: top10ChartRef, title: 'Top 10 Outstanding' },
                            { ref: clientsChartRef, title: 'Overdue by Clients' },
                            { ref: monthlyRecoveryTrendRef, title: 'Monthly Recovery Trend' },
                            { ref: domExpContributionRef, title: 'Domestic & Export Contribution' },
                            { ref: recoveryMixRef, title: 'Domestic & Export Recovery Contribution' },
                            { ref: momGrowthRef, title: 'Month-over-Month Growth %' },
                            { ref: cumulativeRecoveryRef, title: 'Cumulative Recovery' }
                        ]}
                        fileName={`ar-dashboard-${format(new Date(), 'yyyy-MM-dd')}`}
                        title="Outstanding and Recovery Dashboard Report"
                    />
                    <div className="refresh-indicator">
                        <span className="refresh-countdown">
                            Auto-refresh in <strong>{countdown}s</strong>
                        </span>
                        <button className="refresh-btn" onClick={handleRefresh} title="Refresh Now">
                            🔄
                        </button>
                        <span className="last-refresh">
                            Last: {format(lastRefresh, 'HH:mm:ss')}
                        </span>
                    </div>
                </div>
            </div>

            {/* Filters Bar - Only show for Recovery tab (Outstanding is a current snapshot) */}
            {activeTab === 'recovery' && (
                <div className="dashboard-filters" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <button onClick={() => handlePresetChange('thisMonth')} style={getPresetStyle('thisMonth')}>
                        This Month
                    </button>
                    <button onClick={() => handlePresetChange('lastMonth')} style={getPresetStyle('lastMonth')}>
                        Last Month
                    </button>
                    <button onClick={() => handlePresetChange('last3Months')} style={getPresetStyle('last3Months')}>
                        Last 3 Months
                    </button>
                    <button onClick={() => handlePresetChange('last6Months')} style={getPresetStyle('last6Months')}>
                        Last 6 Months
                    </button>
                    <button onClick={() => handlePresetChange('fy')} style={getPresetStyle('fy')}>
                        Full FY
                    </button>
                    {activePreset === 'fy' && (
                        <select
                            value={selectedFY}
                            onChange={(e) => setSelectedFY(Number(e.target.value))}
                            style={DASHBOARD_FY_SELECT_STYLE}
                        >
                            {fyOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {/* Tab Buttons */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '1.5rem',
                background: 'white',
                padding: '0.5rem',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
                <button
                    onClick={() => setActiveTab('outstanding')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeTab === 'outstanding' 
                            ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' 
                            : '#f3f4f6',
                        color: activeTab === 'outstanding' ? 'white' : '#374151',
                        boxShadow: activeTab === 'outstanding' 
                            ? '0 4px 12px rgba(59, 130, 246, 0.3)' 
                            : 'none'
                    }}
                >
                    📊 Outstanding
                </button>
                <button
                    onClick={() => setActiveTab('recovery')}
                    style={{
                        padding: '0.75rem 1.5rem',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: activeTab === 'recovery' 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                            : '#f3f4f6',
                        color: activeTab === 'recovery' ? 'white' : '#374151',
                        boxShadow: activeTab === 'recovery' 
                            ? '0 4px 12px rgba(16, 185, 129, 0.3)' 
                            : 'none'
                    }}
                >
                    💰 Recovery
                </button>
            </div>

            {/* Outstanding Section */}
            {activeTab === 'outstanding' && (
            <>
            <div className="kpi-cards-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Outstanding</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency(kpis.totalOutstanding)}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Net Balance Due</div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Overdue Amount</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency(kpis.overdueAmount)}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Past Due Invoices</div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>On Account Amount</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency(kpis.onAccountAmount)}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Advance Payments</div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Avg Credit Period</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : `${Math.round(kpis.avgCreditPeriod)} Days`}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Customer Average</div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>% Overdue</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(kpis.overduePercent)}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>of Total Outstanding</div>
                </div>
            </div>

            {/* Charts Row 1: Aging Bucket Distribution & Category Outstanding */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '1.5rem',
                marginBottom: '1.5rem'
            }}>
                {/* 1. Aging Bucket Distribution - Horizontal Bar */}
                <div 
                    ref={agingChartRef}
                    style={chartCardStyle}
                    onClick={() => agingBucketData && setExpandedChart({
                        title: 'Aging Bucket Distribution',
                        content: <Bar data={agingBucketData} options={agingHorizontalBarOptions} />
                    })}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Aging Bucket Distribution</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={agingChartRef} title="Aging Bucket Distribution" filename="aging-bucket-distribution" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
                        ) : agingBucketData ? (
                            <Bar data={agingBucketData} options={agingHorizontalBarOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                No aging data available
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Category-wise Outstanding - Vertical Stacked Bar */}
                <div 
                    ref={categoryOutstandingChartRef}
                    style={chartCardStyle}
                    onClick={() => categoryOutstandingData && setExpandedChart({
                        title: 'Category-wise Outstanding Exposure',
                        content: <Bar data={categoryOutstandingData} options={categoryStackedBarOptions} />
                    })}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Category-wise Outstanding</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={categoryOutstandingChartRef} title="Category-wise Outstanding" filename="category-wise-outstanding" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
                        ) : categoryOutstandingData ? (
                            <Bar data={categoryOutstandingData} options={categoryStackedBarOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                No category data available
                            </div>
                        )}
                    </div>
                </div>
            </div>



            {/* Charts Row 3: Top Customers (Full Width) */}
            <div style={{ marginBottom: '1.5rem' }}>
                {/* Top 10 Outstanding Customers */}
                <div 
                    style={chartCardStyle}
                    onClick={() => top10Data && setExpandedChart({
                        title: 'Top 10 Outstanding Customers',
                        content: <Bar ref={top10ChartRef} data={top10Data} options={horizontalBarOptions} />
                    })}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Top 10 Outstanding Customers</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={top10ChartRef} title="Top 10 Outstanding Customers" filename="top-10-outstanding-customers" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
                        ) : top10Data ? (
                            <Bar ref={top10ChartRef} data={top10Data} options={horizontalBarOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                No outstanding data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Row 4: Clients Outstanding (Full Width) */}
            <div style={{ marginBottom: '1.5rem' }}>
                {/* Overdue by Clients - Vertical Bar */}
                <div 
                    style={chartCardStyle}
                    onClick={() => clientsOverdueData && setExpandedChart({
                        title: 'Overdue by Clients',
                        content: <Bar ref={clientsChartRef} data={clientsOverdueData} options={clientsOverdueOptions} />
                    })}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Overdue by Clients</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={clientsChartRef} title="Overdue by Clients" filename="overdue-by-clients" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
                        ) : clientsOverdueData ? (
                            <Bar ref={clientsChartRef} data={clientsOverdueData} options={clientsOverdueOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                No overdue data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
            </>
            )}

            {/* Recovery Section */}
            {activeTab === 'recovery' && (
            <>
                {/* Recovery KPI Cards */}
                <div className="kpi-cards-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem'
                }}>
                    <div className="kpi-card">
                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Recovery</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                            {isRecoveryLoading ? '...' : formatCurrency(recoveryKpis.totalRecovery)}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>FY Total</div>
                    </div>

                    <div className="kpi-card">
                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Domestic Recovery</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                            {isRecoveryLoading ? '...' : formatCurrency(recoveryKpis.domesticRecovery)}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>
                            {formatPercent(recoveryKpis.domesticPercent)} of Total
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Export Recovery</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                            {isRecoveryLoading ? '...' : formatCurrency(recoveryKpis.exportRecovery)}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>
                            {formatPercent(recoveryKpis.exportPercent)} of Total
                        </div>
                    </div>

                    <div className="kpi-card">
                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Domestic %</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                            {isRecoveryLoading ? '...' : formatPercent(recoveryKpis.domesticPercent)}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Share</div>
                    </div>

                    <div className="kpi-card">
                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Export %</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                            {isRecoveryLoading ? '...' : formatPercent(recoveryKpis.exportPercent)}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Share</div>
                    </div>
                </div>

                {/* Row 1: Monthly Trend (Full Width) */}
                <div ref={monthlyRecoveryTrendRef} style={chartCardStyle} onClick={() => monthlyTrendData && setExpandedChart({
                    title: 'Monthly Recovery Trend',
                    content: <Line data={monthlyTrendData} options={lineChartOptions} />
                })}>
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Monthly Recovery Trend</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={monthlyRecoveryTrendRef} title="Monthly Recovery Trend" filename="monthly-recovery-trend" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '380px' }}>
                        {isRecoveryLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
                        ) : monthlyTrendData ? (
                            <Line data={monthlyTrendData} options={lineChartOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                No trend data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 2: Domestic vs Export Contribution - Full Width */}
                <div style={{ marginTop: '1.5rem' }}>
                    {/* Stacked Column Chart */}
                    <div ref={domExpContributionRef} style={chartCardStyle} onClick={() => stackedContributionData && setExpandedChart({
                        title: 'Domestic vs Export Contribution',
                        content: <Bar data={stackedContributionData} options={recoveryStackedBarOptions} />
                    })}>
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Domestic & Export Contribution</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={domExpContributionRef} title="Domestic vs Export Contribution" filename="domestic-vs-export-contribution" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                        </div>
                        <div style={{ height: '450px' }}>
                            {isRecoveryLoading ? (
                                <Skeleton height="100%" borderRadius="12px" />
                            ) : stackedContributionData ? (
                                <Bar data={stackedContributionData} options={recoveryStackedBarOptions} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                    No data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 2b: Recovery Mix Donut - Standalone */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr', 
                    gap: '1.5rem',
                    marginTop: '1.5rem'
                }}>
                    {/* Donut Chart */}
                    <div ref={recoveryMixRef} style={chartCardStyle} onClick={() => recoveryMixData && setExpandedChart({
                        title: 'Domestic & Export Recovery Contribution',
                        content: <Doughnut data={recoveryMixData} options={doughnutOptions} />
                    })}>
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Domestic & Export Recovery Contribution</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={recoveryMixRef} title="Domestic & Export Recovery Contribution" filename="domestic--export-recovery-contribution" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                        </div>
                        <div style={{ height: '350px' }}>
                            {isRecoveryLoading ? (
                                <Skeleton height="100%" borderRadius="12px" />
                            ) : recoveryMixData ? (
                                <Doughnut data={recoveryMixData} options={doughnutOptions} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                    No data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Row 3: MoM Growth & Cumulative */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                    gap: '1.5rem',
                    marginTop: '1.5rem'
                }}>
                    {/* MoM Growth Bar Chart */}
                    <div ref={momGrowthRef} style={chartCardStyle} onClick={() => momGrowthData && setExpandedChart({
                        title: 'Month-over-Month Growth',
                        content: <Bar data={momGrowthData} options={momGrowthOptions} />
                    })}>
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Month-over-Month Recovery Growth %</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={momGrowthRef} title="Month-over-Month Growth %" filename="month-over-month-growth-%" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                        </div>
                        <div style={{ height: '350px' }}>
                            {isRecoveryLoading ? (
                                <Skeleton height="100%" borderRadius="12px" />
                            ) : momGrowthData ? (
                                <Bar data={momGrowthData} options={momGrowthOptions} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                    Not enough data for MoM analysis
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cumulative Recovery Line Chart */}
                    <div ref={cumulativeRecoveryRef} style={chartCardStyle} onClick={() => cumulativeData && setExpandedChart({
                        title: 'Cumulative Recovery',
                        content: <Line data={cumulativeData} options={lineChartOptions} />
                    })}>
                        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Cumulative Recovery</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={cumulativeRecoveryRef} title="Cumulative Recovery" filename="cumulative-recovery" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                        </div>
                        <div style={{ height: '350px' }}>
                            {isRecoveryLoading ? (
                                <Skeleton height="100%" borderRadius="12px" />
                            ) : cumulativeData ? (
                                <Line data={cumulativeData} options={lineChartOptions} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>
                                    No cumulative data available
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
            )}
        </div>
    );
};

export default ARAPDashboard;
