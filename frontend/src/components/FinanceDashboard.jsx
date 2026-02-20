import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
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
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { format, subMonths } from 'date-fns';
import api from '../api';
import ExportButtons from './common/ExportButtons';
import {
    applyChartDefaults,
    CHART_COLORS,
    FINANCE_COLORS,
    getLineChartOptions,
    getBarChartOptions,
    getHorizontalBarOptions,
    getStackedBarOptions,
    getDoughnutOptions,
    getMoMGrowthOptions
} from '../utils/chartConfig';
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

const REFRESH_INTERVAL = 120000; // 2 minutes - reduces server load while keeping data fresh

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

const FinanceDashboard = () => {
    const queryClient = useQueryClient();
    const [countdown, setCountdown] = useState(60);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Generate FY options (only current FY since view is limited to FY 2025-26)
    const generateFYOptions = () => {
        const today = new Date();
        const currentFYStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        // Only return current FY since the view has hardcoded dates for FY 2025-26
        return [{
            label: `FY ${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`,
            value: currentFYStart
        }];
    };

    const fyOptions = generateFYOptions();

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
    const [selectedFY, setSelectedFY] = useState(fyOptions[0].value);
    const [appliedFilters, setAppliedFilters] = useState(getCurrentFYDates());

    // Fullscreen chart state
    const [expandedChart, setExpandedChart] = useState(null);

    // Chart refs for export
    const revenueByTypeChartRef = useRef(null);
    const revenueVsExpenseChartRef = useRef(null);
    const revenueBreakdownChartRef = useRef(null);
    const expensesTrendChartRef = useRef(null);
    const expenseCategoryChartRef = useRef(null);
    const operatingCostsChartRef = useRef(null);
    const momGrowthChartRef = useRef(null);

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
            queryClient.invalidateQueries(['finance-dashboard']);
            setLastRefresh(new Date());
            setCountdown(60);
        }, REFRESH_INTERVAL);
        return () => clearInterval(refreshTimer);
    }, [queryClient]);

    // Fetch data from API
    const { data: rawData, isLoading, error } = useQuery({
        queryKey: ['finance-dashboard', 'data', appliedFilters.fromDate, appliedFilters.toDate],
        queryFn: async () => {
            const res = await api.get('/finance-dashboard/data', {
                params: { fromDate: appliedFilters.fromDate, toDate: appliedFilters.toDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    useEffect(() => {
        if (error) {
            console.error('Finance Dashboard Data Error:', error);
            toast.error('Failed to load finance data: ' + (error.response?.data?.error || error.message));
        }
    }, [error]);

    // Manual refresh
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries(['finance-dashboard']);
        setLastRefresh(new Date());
        setCountdown(60);
    }, [queryClient]);

    // Handle preset change
    const handlePresetChange = (preset) => {
        const today = new Date();
        let fromDate, toDate;

        setActivePreset(preset);

        switch (preset) {
            case 'thisMonth':
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
                toDate = today;
                break;
            case 'lastMonth':
                fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                toDate = new Date(today.getFullYear(), today.getMonth(), 0); // Last day of previous month
                break;
            case 'last3Months':
                fromDate = subMonths(today, 3);
                toDate = today;
                break;
            case 'last6Months':
                fromDate = subMonths(today, 6);
                toDate = today;
                break;
            case 'fy':
                const fyStartYear = selectedFY;
                fromDate = new Date(fyStartYear, 3, 1);
                const currentFYStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
                if (fyStartYear === currentFYStart) {
                    toDate = today;
                } else {
                    toDate = new Date(fyStartYear + 1, 2, 31);
                }
                break;
            default:
                return;
        }

        setAppliedFilters({
            fromDate: format(fromDate, 'yyyy-MM-dd'),
            toDate: format(toDate, 'yyyy-MM-dd')
        });
    };

    // Handle FY dropdown change
    const handleFYChange = (fyValue) => {
        const today = new Date();
        setSelectedFY(fyValue);
        setActivePreset('fy');

        const fromDate = new Date(fyValue, 3, 1);
        const currentFYStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        const toDate = fyValue === currentFYStart ? today : new Date(fyValue + 1, 2, 31);

        setAppliedFilters({
            fromDate: format(fromDate, 'yyyy-MM-dd'),
            toDate: format(toDate, 'yyyy-MM-dd')
        });
    };

    // Month order for sorting
    const monthOrder = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12
    };

    // Parse month string for sorting
    const parseMonthKey = (monthStr) => {
        if (!monthStr) return 0;
        const parts = monthStr.split(' - ');
        if (parts.length === 2) {
            const monthName = parts[0].toLowerCase().trim();
            const year = parseInt(parts[1]) || 0;
            const monthNum = monthOrder[monthName] || 0;
            return year * 100 + monthNum;
        }
        return 0;
    };

    // ============================================
    // CLIENT-SIDE AGGREGATION FROM rawData
    // ============================================

    // Calculate Summary KPIs
    const summary = useMemo(() => {
        if (!rawData || rawData.length === 0) {
            return {
                totalRevenue: 0,
                totalExpenses: 0,
                purchaseCosts: 0,
                operatingExpenditure: 0,
                grossMargin: 0,
                netMargin: 0
            };
        }

        let totalRevenue = 0;
        let purchaseCosts = 0;
        let operatingExpenditure = 0;

        rawData.forEach(row => {
            const value = row.Value || 0;

            switch (row.MainGroup) {
                case 'REVENUE':
                    totalRevenue += value;
                    break;
                case 'PURCHASE':
                    purchaseCosts += value;
                    break;
                case 'OPERATING EXPENDITURE':
                    operatingExpenditure += value;
                    break;
                default:
                    break;
            }
        });

        const totalExpenses = purchaseCosts + operatingExpenditure;
        const grossProfit = totalRevenue - purchaseCosts;
        const netProfit = totalRevenue - totalExpenses;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        return {
            totalRevenue,
            totalExpenses,
            purchaseCosts,
            operatingExpenditure,
            grossMargin,
            netMargin
        };
    }, [rawData]);

    // Revenue breakdown by SubGroup
    const revenueBreakdown = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        const breakdown = {};
        rawData.filter(row => row.MainGroup === 'REVENUE').forEach(row => {
            const subGroup = row.SubGroup || 'Other';
            breakdown[subGroup] = (breakdown[subGroup] || 0) + (row.Value || 0);
        });

        const labels = Object.keys(breakdown);
        const values = Object.values(breakdown);
        const total = values.reduce((a, b) => a + b, 0);

        return {
            labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    FINANCE_COLORS.success.medium,
                    FINANCE_COLORS.primary.medium,
                    FINANCE_COLORS.warning.medium,
                    FINANCE_COLORS.danger.medium
                ],
                borderWidth: 2
            }],
            total
        };
    }, [rawData]);

    // Expense breakdown by SubGroup
    const expenseBreakdown = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        const breakdown = {};
        rawData.filter(row => row.MainGroup === 'PURCHASE' || row.MainGroup === 'OPERATING EXPENDITURE').forEach(row => {
            const subGroup = row.SubGroup || 'Other';
            breakdown[subGroup] = (breakdown[subGroup] || 0) + (row.Value || 0);
        });

        // Sort by value descending
        const sorted = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);

        const colors = [
            FINANCE_COLORS.danger.medium,
            FINANCE_COLORS.warning.medium,
            FINANCE_COLORS.primary.medium,
            FINANCE_COLORS.success.medium,
            FINANCE_COLORS.teal.medium,
            // Repeat
            FINANCE_COLORS.danger.solid,
            FINANCE_COLORS.warning.solid,
            FINANCE_COLORS.primary.solid,
            FINANCE_COLORS.success.solid,
            FINANCE_COLORS.teal.solid
        ];

        return {
            labels: sorted.map(([name]) => name),
            datasets: [{
                label: 'Amount',
                data: sorted.map(([, value]) => value),
                backgroundColor: colors.slice(0, sorted.length),
                borderRadius: 4
            }]
        };
    }, [rawData]);

    // Operating vs Non-Operating Expenses
    const operatingVsNonOperating = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        let operating = 0;
        let nonOperating = 0;

        rawData.forEach(row => {
            if (row.MainGroup === 'OPERATING EXPENDITURE') {
                operating += row.Value || 0;
            } else if (row.MainGroup === 'PURCHASE') {
                nonOperating += row.Value || 0;
            }
        });

        return {
            labels: ['Operating Expenses', 'Purchase/Direct Costs'],
            datasets: [{
                data: [operating, nonOperating],
                backgroundColor: [
                    FINANCE_COLORS.warning.medium, // Operating
                    FINANCE_COLORS.primary.medium  // Purchase
                ],
                borderWidth: 2
            }]
        };
    }, [rawData]);

    // Monthly trend data
    const monthlyTrend = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        const monthlyData = {};

        rawData.forEach(row => {
            const month = row.Month || 'Unknown';
            if (!monthlyData[month]) {
                monthlyData[month] = { revenue: 0, purchase: 0, operating: 0 };
            }

            const value = row.Value || 0;
            switch (row.MainGroup) {
                case 'REVENUE':
                    monthlyData[month].revenue += value;
                    break;
                case 'PURCHASE':
                    monthlyData[month].purchase += value;
                    break;
                case 'OPERATING EXPENDITURE':
                    monthlyData[month].operating += value;
                    break;
                default:
                    break;
            }
        });

        // Sort months chronologically
        const months = Object.keys(monthlyData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));

        const revenueData = months.map(m => monthlyData[m].revenue);
        const purchaseData = months.map(m => monthlyData[m].purchase);
        const operatingData = months.map(m => monthlyData[m].operating);
        const totalExpenseData = months.map(m => monthlyData[m].purchase + monthlyData[m].operating);

        return {
            labels: months,
            revenueVsExpense: {
                labels: months,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenueData,
                        borderColor: FINANCE_COLORS.success.solid,
                        backgroundColor: FINANCE_COLORS.success.light,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3
                    },
                    {
                        label: 'Total Expenses',
                        data: totalExpenseData,
                        borderColor: FINANCE_COLORS.danger.solid,
                        backgroundColor: FINANCE_COLORS.danger.light,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3
                    }
                ]
            },
            expensesTrend: {
                labels: months,
                datasets: [
                    {
                        label: 'Purchase/Direct Costs',
                        data: purchaseData,
                        backgroundColor: FINANCE_COLORS.primary.medium,
                        borderColor: FINANCE_COLORS.primary.solid,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Operating Expenses',
                        data: operatingData,
                        backgroundColor: FINANCE_COLORS.warning.medium,
                        borderColor: FINANCE_COLORS.warning.solid,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            marginTrend: {
                labels: months,
                datasets: [
                    {
                        label: 'Gross Margin %',
                        data: months.map(m => {
                            const rev = monthlyData[m].revenue;
                            const pur = monthlyData[m].purchase;
                            return rev > 0 ? ((rev - pur) / rev) * 100 : 0;
                        }),
                        borderColor: FINANCE_COLORS.success.solid,
                        backgroundColor: FINANCE_COLORS.success.light,
                        fill: false,
                        tension: 0.4,
                        borderWidth: 3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Net Margin %',
                        data: months.map(m => {
                            const rev = monthlyData[m].revenue;
                            const totalExp = monthlyData[m].purchase + monthlyData[m].operating;
                            return rev > 0 ? ((rev - totalExp) / rev) * 100 : 0;
                        }),
                        borderColor: FINANCE_COLORS.primary.solid,
                        backgroundColor: FINANCE_COLORS.primary.light,
                        fill: false,
                        tension: 0.4,
                        borderWidth: 3,
                        yAxisID: 'y'
                    }
                ]
            },
            // Grouped bar chart data for Revenue vs Expenses visualization
            stackedAreaTrend: {
                labels: months,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenueData,
                        backgroundColor: FINANCE_COLORS.success.medium,
                        borderColor: FINANCE_COLORS.success.solid,
                        borderWidth: 1
                    },
                    {
                        label: 'Purchase/Direct Costs',
                        data: purchaseData,
                        backgroundColor: FINANCE_COLORS.primary.medium,
                        borderColor: FINANCE_COLORS.primary.solid,
                        borderWidth: 1
                    },
                    {
                        label: 'Operating Expenses',
                        data: operatingData,
                        backgroundColor: FINANCE_COLORS.warning.medium,
                        borderColor: FINANCE_COLORS.warning.solid,
                        borderWidth: 1
                    }
                ]
            }
        };
    }, [rawData]);

    // Monthly Revenue by Direct and Indirect
    const monthlyRevenueByType = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        const monthlyData = {};

        rawData.filter(row => row.MainGroup === 'REVENUE').forEach(row => {
            const month = row.Month || 'Unknown';
            const subGroup = row.SubGroup || 'Other';
            if (!monthlyData[month]) {
                monthlyData[month] = { direct: 0, indirect: 0 };
            }

            const value = row.Value || 0;
            // Classify as Direct or Indirect based on SubGroup
            // Indirect revenue typically includes: Other Income, Indirect Income, etc.
            if (subGroup.toLowerCase().includes('indirect') || subGroup.toLowerCase().includes('other')) {
                monthlyData[month].indirect += value;
            } else {
                monthlyData[month].direct += value;
            }
        });

        // Sort months chronologically
        const months = Object.keys(monthlyData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));

        const directData = months.map(m => monthlyData[m].direct);
        const indirectData = months.map(m => monthlyData[m].indirect);

        return {
            labels: months,
            datasets: [
                {
                    label: 'Direct Revenue',
                    data: directData,
                    backgroundColor: FINANCE_COLORS.success.medium,
                    borderColor: FINANCE_COLORS.success.solid,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Indirect Revenue',
                    data: indirectData,
                    backgroundColor: FINANCE_COLORS.primary.medium, // Or blue
                    borderColor: FINANCE_COLORS.primary.solid,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        };
    }, [rawData]);

    // Month-over-Month (MoM) Revenue Growth %
    const momRevenueGrowthData = useMemo(() => {
        if (!monthlyTrend || !monthlyTrend.labels || monthlyTrend.labels.length < 2) return null;

        const months = monthlyTrend.labels;
        const revenueData = monthlyTrend.revenueVsExpense.datasets[0].data; // Revenue data

        // Calculate MoM growth percentages
        const revenueGrowth = [];
        const growthLabels = [];

        for (let i = 1; i < months.length; i++) {
            growthLabels.push(months[i]);

            const prevRevenue = revenueData[i - 1];
            const currRevenue = revenueData[i];
            const growthPct = prevRevenue > 0 ? ((currRevenue - prevRevenue) / prevRevenue) * 100 : 0;
            revenueGrowth.push(parseFloat(growthPct.toFixed(1)));
        }

        return {
            labels: growthLabels,
            datasets: [
                {
                    label: 'Revenue Growth %',
                    data: revenueGrowth,
                    borderColor: FINANCE_COLORS.success.solid,
                    backgroundColor: FINANCE_COLORS.success.light,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: revenueGrowth.map(v => v >= 0 ? FINANCE_COLORS.success.solid : FINANCE_COLORS.danger.solid),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 8
                }
            ]
        };
    }, [monthlyTrend]);

    // Chart options
    const lineChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            },
            datalabels: {
                display: true,
                align: 'top',
                anchor: 'end',
                color: '#1F2937',
                font: { weight: 'bold', size: 14 },
                formatter: (value) => formatCurrency(value)
            }
        },
        layout: {
            padding: { top: 15 }
        },
        scales: {
            x: {
                offset: true
            },
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                }
            }
        }
    };

    const barChartOptions = {
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
                display: true,
                anchor: 'end',
                align: 'end',
                color: '#1F2937',
                font: { weight: 'bold', size: 14 },
                formatter: (value) => formatCurrency(value)
            }
        },
        layout: {
            padding: { top: 15, right: 60 }
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

    const groupedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            },
            datalabels: {
                display: true,
                align: 'top',
                anchor: 'end',
                color: '#1F2937',
                font: { weight: 'bold', size: 14 },
                formatter: (value) => formatCurrency(value)
            }
        },
        layout: {
            padding: { top: 15 }
        },
        scales: {
            x: { stacked: false },
            y: {
                stacked: false,
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                }
            }
        }
    };

    const marginChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.raw.toFixed(1)}%`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: (value) => `${value}%`
                }
            }
        }
    };

    // Stacked area chart options for Revenue vs Expenses Trend
    const stackedAreaOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: { size: 14 }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            },
            filler: {
                propagate: true
            },
            datalabels: {
                display: true,
                align: 'top',
                anchor: 'end',
                color: '#1F2937',
                font: { weight: 'bold', size: 14 },
                formatter: (value) => formatCurrency(value)
            }
        },
        layout: {
            padding: { top: 15 }
        },
        scales: {
            x: {
                offset: true,
                grid: { display: false }
            },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: {
                    callback: (value) => formatCurrency(value)
                },
                grid: {
                    color: 'rgba(0,0,0,0.05)'
                }
            }
        },
        elements: {
            line: {
                tension: 0.4
            },
            point: {
                radius: 0,
                hoverRadius: 4
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    // Monthly Revenue by Type (Direct/Indirect) chart options with data labels - STACKED
    const monthlyRevenueByTypeOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                mode: 'index',
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatCurrency(context.raw)}`
                }
            },
            datalabels: {
                display: true,
                color: '#080707ff',
                anchor: 'center',
                align: 'center',
                font: {
                    weight: 'bold',
                    size: 11
                },
                formatter: (value) => {
                    if (value === 0) return '';
                    return formatCurrency(value);
                }
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
        },
        layout: {
            padding: {
                top: 10
            }
        }
    };

    // MoM Growth chart options
    const momGrowthChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.raw > 0 ? '+' : ''}${context.raw}%`
                }
            },
            datalabels: {
                display: true,
                color: (context) => context.dataset.data[context.dataIndex] >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)',
                anchor: (context) => context.dataset.data[context.dataIndex] >= 0 ? 'end' : 'start',
                align: (context) => context.dataset.data[context.dataIndex] >= 0 ? 'top' : 'bottom',
                offset: 6,
                font: {
                    weight: 'bold',
                    size: 13
                },
                formatter: (value) => value !== 0 ? `${value > 0 ? '+' : ''}${value}%` : ''
            }
        },
        scales: {
            x: {
                offset: true,
                grid: { display: false }
            },
            y: {
                beginAtZero: false,
                ticks: {
                    callback: (value) => `${value}%`
                },
                grid: {
                    color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'
                }
            }
        },
        layout: {
            padding: {
                top: 25,
                bottom: 25
            }
        }
    };

    const donutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '35%', // Reduced from default ~50% to make donut thicker
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
                    size: 16
                },
                formatter: (value, context) => {
                    const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${percentage}%`;
                },
                anchor: 'center',
                align: 'center'
            }
        }
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
                    <h1>₹ Finance Dashboard</h1>
                    <p className="welcome-text">Financial Performance Overview</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ExportButtons
                        chartRefs={[
                            { ref: revenueByTypeChartRef, title: 'Monthly Revenue (Direct vs Indirect)' },
                            { ref: revenueVsExpenseChartRef, title: 'Revenue vs Expenses Trend' },
                            { ref: revenueBreakdownChartRef, title: 'Revenue Composition' },
                            { ref: expensesTrendChartRef, title: 'Monthly Expenses Trend' },
                            { ref: expenseCategoryChartRef, title: 'Expense Category Ranking' },
                            { ref: operatingCostsChartRef, title: 'Operating vs Direct Costs' },
                            { ref: momGrowthChartRef, title: 'MoM Revenue Growth %' }
                        ]}
                        fileName={`finance-dashboard-${format(new Date(), 'yyyy-MM-dd')}`}
                        title="Finance Dashboard Report"
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

            {/* Filters Bar */}
            <div className="dashboard-filters" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                <button
                    onClick={() => handlePresetChange('fy')}
                    style={getPresetStyle('fy')}
                >
                    {fyOptions[0]?.label || 'FY 2025-26'}
                </button>
            </div>

            {/* KPI Cards */}
            <div className="kpi-cards-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Revenue</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency(summary.totalRevenue)}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>MTD</div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Operating Expenditure</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency(summary.operatingExpenditure)}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Salaries, Admin, etc.</div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Purchase Expenditure</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency(summary.purchaseCosts)}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Raw Material, Consumables</div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Expense</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency((summary.operatingExpenditure || 0) + (summary.purchaseCosts || 0))}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Operating + Purchase</div>
                </div>
            </div>

            {/* Section: Monthly Revenue (Direct & Indirect) */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', marginBottom: '1rem', marginTop: '2rem' }}>
                📊 Monthly Revenue (Direct Revenue and Indirect Revenue)
            </h2>
            <div
                ref={revenueByTypeChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📊 Monthly Revenue (Direct Revenue and Indirect Revenue)',
                    content: monthlyRevenueByType ? (
                        <Bar data={monthlyRevenueByType} options={monthlyRevenueByTypeOptions} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>Monthly Direct vs Indirect Revenue</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : monthlyRevenueByType ? (
                        <Bar data={monthlyRevenueByType} options={monthlyRevenueByTypeOptions} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* Section: Revenue Overview */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', marginBottom: '1rem', marginTop: '2rem' }}>
                📈 Revenue Overview
            </h2>
            {/* Revenue vs Expenses Trend - Full Width */}
            <div
                ref={revenueVsExpenseChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📈 Revenue vs Expenses Trend',
                    content: monthlyTrend?.revenueVsExpense ? (
                        <Line data={monthlyTrend.revenueVsExpense} options={lineChartOptions} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Revenue vs Expenses Trend</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : monthlyTrend?.revenueVsExpense ? (
                        <Line data={monthlyTrend.revenueVsExpense} options={lineChartOptions} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* Revenue Composition & Expense Category Ranking - Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Revenue Composition */}
                <div
                    ref={revenueBreakdownChartRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '🍩 Revenue Composition',
                        content: revenueBreakdown ? (
                            <Doughnut data={revenueBreakdown} options={donutOptions} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🍩 Revenue Composition</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : revenueBreakdown ? (
                            <Doughnut data={revenueBreakdown} options={donutOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* Expense Category Breakdown */}
                <div
                    ref={expenseCategoryChartRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📊 Expense Category Ranking',
                        content: expenseBreakdown ? (
                            <Bar data={expenseBreakdown} options={barChartOptions} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Expense Category Ranking</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : expenseBreakdown ? (
                            <Bar data={expenseBreakdown} options={barChartOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section: Revenue vs Expenses Trend (Stacked Area Chart) */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', marginBottom: '1rem', marginTop: '2rem' }}>
                📈 Revenue vs Expenses Trend
            </h2>
            <div
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📈 Revenue vs Expenses Trend',
                    content: monthlyTrend?.stackedAreaTrend ? (
                        <Bar data={monthlyTrend.stackedAreaTrend} options={groupedBarOptions} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>Monthly Revenue, Purchase & Operating Expenses</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : monthlyTrend?.stackedAreaTrend ? (
                        <Bar data={monthlyTrend.stackedAreaTrend} options={groupedBarOptions} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* Section: Expense Breakdown */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', marginBottom: '1rem', marginTop: '2rem' }}>
                📉 Expense Breakdown
            </h2>
            {/* Monthly Expenses Trend - Full Width */}
            <div
                ref={expensesTrendChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📊 Monthly Expenses Trend',
                    content: monthlyTrend?.expensesTrend ? (
                        <Bar data={monthlyTrend.expensesTrend} options={groupedBarOptions} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Monthly Expenses Trend</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : monthlyTrend?.expensesTrend ? (
                        <Bar data={monthlyTrend.expensesTrend} options={groupedBarOptions} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* Section: Profitability Insights */}
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', marginBottom: '1rem', marginTop: '2rem' }}>
                💹 Insights
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>

                {/* Operating vs Non-Operating Split */}
                <div
                    ref={operatingCostsChartRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '🍩 Operating vs Direct Costs',
                        content: operatingVsNonOperating ? (
                            <Doughnut data={operatingVsNonOperating} options={donutOptions} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🍩 Operating vs Direct Costs</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : operatingVsNonOperating ? (
                            <Doughnut data={operatingVsNonOperating} options={donutOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* Month-over-Month Revenue Growth % */}
                <div
                    ref={momGrowthChartRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📈 Month-over-Month (MoM) Revenue Growth %',
                        content: momRevenueGrowthData ? (
                            <Line data={momRevenueGrowthData} options={momGrowthChartOptions} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 MoM Revenue Growth %</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : momRevenueGrowthData ? (
                            <Line data={momRevenueGrowthData} options={momGrowthChartOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinanceDashboard;
