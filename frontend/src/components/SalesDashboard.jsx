import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense, useRef } from 'react';
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
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';
import { format, subMonths } from 'date-fns';
import api from '../api';
import ExportButtons from './common/ExportButtons';
import { DashboardSkeleton, CardSkeleton, ChartSkeleton } from './common/Skeletons';
import { ErrorBoundary } from 'react-error-boundary';
import {
    applyChartDefaults,
    CHART_COLORS,
    SALES_COLORS,
    getLineChartOptions,
    getBarChartOptions,
    getHorizontalBarOptions,
    getStackedBarOptions,
    getDoughnutOptions,
    getMoMGrowthOptions
} from '../utils/chartConfig';
import './dashboard/Dashboard.css';



// Loading fallback for the globe


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

const formatCurrency = (value) => {
    if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
        return `₹${(value / 100000).toFixed(2)} L`;
    } else if (value >= 1000) {
        return `₹${(value / 1000).toFixed(1)} K`;
    }
    return `₹${(value || 0).toFixed(0)}`;
};

const formatWeight = (value) => {
    if (value >= 1000) {
        return `${(value / 1000).toFixed(2)} T`;
    }
    return `${(value || 0).toFixed(0)} Kg`;
};

const formatNumber = (value) => {
    if (value >= 10000000) {
        return `${(value / 10000000).toFixed(2)} Cr`;
    } else if (value >= 100000) {
        return `${(value / 100000).toFixed(2)} L`;
    } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)} K`;
    }
    return (value || 0).toFixed(0);
};

const SalesDashboard = () => {
    const queryClient = useQueryClient();
    const [countdown, setCountdown] = useState(60);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Generate FY options (only current FY since view is limited to current FY)
    const generateFYOptions = () => {
        const today = new Date();
        const currentFYStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        // Only return current FY since the view has hardcoded dates for current FY
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

    // Filter states - default to current FY
    const [activePreset, setActivePreset] = useState('fy');
    const [selectedFY, setSelectedFY] = useState(fyOptions[0].value);
    const [appliedFilters, setAppliedFilters] = useState(getCurrentFYDates());

    // Fullscreen chart state
    const [expandedChart, setExpandedChart] = useState(null);

    // Chart refs for export
    const totalValueChartRef = useRef(null);
    const domesticValueChartRef = useRef(null);
    const domesticWeightChartRef = useRef(null);
    const momGrowthChartRef = useRef(null);
    const topCustomersChartRef = useRef(null);
    const categoryChartRef = useRef(null);
    const segmentChartRef = useRef(null);
    const areaGroupChartRef = useRef(null);


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
            queryClient.invalidateQueries(['sales-dashboard']);
            setLastRefresh(new Date());
            setCountdown(60);
        }, REFRESH_INTERVAL);
        return () => clearInterval(refreshTimer);
    }, [queryClient]);

    // Fetch ALL data from single /data endpoint
    const { data: rawData, isLoading } = useQuery({
        queryKey: ['sales-dashboard', 'data', appliedFilters.fromDate, appliedFilters.toDate],
        queryFn: async () => {
            const res = await api.get('/sales-dashboard/data', {
                params: { fromDate: appliedFilters.fromDate, toDate: appliedFilters.toDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch historical records (highest ever month and FY)
    const { data: historicalRecords, isLoading: isLoadingHistorical } = useQuery({
        queryKey: ['sales-dashboard', 'historical-records'],
        queryFn: async () => {
            const res = await api.get('/sales-dashboard/historical-records');
            return res.data;
        },
        staleTime: 300000 // Cache for 5 minutes since this is historical data
    });

    // Manual refresh
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries(['sales-dashboard']);
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

    // ============================================
    // CLIENT-SIDE AGGREGATION FROM rawData
    // ============================================

    // Calculate Summary KPIs
    const summary = useMemo(() => {
        if (!rawData || rawData.length === 0) {
            return {
                totalValue: 0,
                totalQuantity: 0,
                totalWeight: 0,
                avgSalesValue: 0,
                topCustomer: 'N/A',
                topSegment: 'N/A',
                categoryBreakdown: []
            };
        }

        let totalValue = 0;
        let totalQuantity = 0;
        let totalWeight = 0;
        const customerValues = {};
        const segmentValues = {};
        const categoryValues = {};
        const monthsSet = new Set();

        rawData.forEach(row => {
            const value = row.Value || 0;
            const qty = row.Quantity || 0;
            const weight = row.Weight || 0;

            totalValue += value;
            totalQuantity += qty;
            totalWeight += weight;

            // Track months for average
            if (row.Month) monthsSet.add(row.Month);

            // Customer aggregation
            const custName = row.CustName || 'Unknown';
            customerValues[custName] = (customerValues[custName] || 0) + value;

            // Segment aggregation
            const segment = row.Segment_Type || 'Other';
            segmentValues[segment] = (segmentValues[segment] || 0) + value;

            // Category aggregation (Domestic/Export)
            const category = row.CategoryName || 'Other';
            categoryValues[category] = (categoryValues[category] || 0) + value;
        });

        const monthCount = monthsSet.size || 1;
        const avgSalesValue = totalValue / monthCount;
        const avgMonthlyTonnage = totalWeight / monthCount;

        // Find top customer
        const topCustomerEntry = Object.entries(customerValues).sort((a, b) => b[1] - a[1])[0];
        const topCustomer = topCustomerEntry ? topCustomerEntry[0] : 'N/A';

        // Find top segment
        const topSegmentEntry = Object.entries(segmentValues).sort((a, b) => b[1] - a[1])[0];
        const topSegment = topSegmentEntry ? topSegmentEntry[0] : 'N/A';

        // Category breakdown for donut chart
        const categoryBreakdown = Object.entries(categoryValues).map(([name, value]) => ({
            CategoryName: name,
            CategoryValue: value
        }));

        return {
            totalValue,
            totalQuantity,
            totalWeight,
            avgSalesValue,
            avgMonthlyTonnage,
            topCustomer,
            topSegment,
            categoryBreakdown
        };
    }, [rawData]);

    // Prepare Monthly Trend Data (Domestic vs Export)
    const trendData = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        // Month name to number mapping for sorting
        const monthOrder = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        };

        // Parse month string like "April - 2021" to sortable value
        const parseMonthKey = (monthStr) => {
            const parts = monthStr.split(' - ');
            if (parts.length === 2) {
                const monthName = parts[0].toLowerCase().trim();
                const year = parseInt(parts[1]) || 0;
                const monthNum = monthOrder[monthName] || 0;
                return year * 100 + monthNum; // e.g., 202104 for April 2021
            }
            return 0;
        };

        // Group by Month and Category
        const monthlyData = {};
        rawData.forEach(row => {
            const month = row.Month || 'Unknown';
            const category = (row.CategoryName || '').toLowerCase();
            const value = row.Value || 0;
            const weight = row.Weight || 0;

            if (!monthlyData[month]) {
                monthlyData[month] = { domesticValue: 0, exportValue: 0, domesticWeight: 0, exportWeight: 0 };
            }

            if (category.includes('domestic')) {
                monthlyData[month].domesticValue += value;
                monthlyData[month].domesticWeight += weight;
            } else if (category.includes('export')) {
                monthlyData[month].exportValue += value;
                monthlyData[month].exportWeight += weight;
            }
        });

        // Sort months chronologically
        const months = Object.keys(monthlyData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));
        const domesticValues = months.map(m => monthlyData[m].domesticValue);
        const exportValues = months.map(m => monthlyData[m].exportValue);
        const domesticWeight = months.map(m => monthlyData[m].domesticWeight);
        const exportWeight = months.map(m => monthlyData[m].exportWeight);

        return {
            labels: months,
            valueData: {
                labels: months,
                datasets: [
                    {
                        label: 'Domestic Value',
                        data: domesticValues,
                        backgroundColor: SALES_COLORS.primary.medium,
                        borderColor: SALES_COLORS.primary.solid,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Export Value',
                        data: exportValues,
                        backgroundColor: SALES_COLORS.success.medium,
                        borderColor: SALES_COLORS.success.solid,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            // Trend line data for line chart
            valueTrendLine: {
                labels: months,
                datasets: [
                    {
                        label: 'Domestic Value',
                        data: domesticValues,
                        borderColor: SALES_COLORS.primary.solid,
                        backgroundColor: SALES_COLORS.primary.light,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: SALES_COLORS.primary.solid,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Export Value',
                        data: exportValues,
                        borderColor: SALES_COLORS.success.solid,
                        backgroundColor: SALES_COLORS.success.light,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: SALES_COLORS.success.solid,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 6
                    }
                ]
            },
            weightData: {
                labels: months,
                datasets: [
                    {
                        label: 'Domestic Weight',
                        data: domesticWeight,
                        backgroundColor: SALES_COLORS.danger.medium,
                        borderColor: SALES_COLORS.danger.solid,
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Export Weight',
                        data: exportWeight,
                        backgroundColor: SALES_COLORS.warning.medium,
                        borderColor: SALES_COLORS.warning.solid,
                        borderWidth: 1,
                        borderRadius: 4
                    }
                ]
            },
            // Total Value Trend (Domestic + Export combined) - Area Chart
            totalValueTrend: {
                labels: months,
                datasets: [
                    {
                        label: 'Total Sales Value',
                        data: months.map((_, i) => domesticValues[i] + exportValues[i]),
                        borderColor: SALES_COLORS.primary.solid,
                        backgroundColor: SALES_COLORS.primary.light,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointBackgroundColor: SALES_COLORS.primary.solid,
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 7
                    }
                ]
            }
        };
    }, [rawData]);

    // Calculate Month-over-Month (MoM) Growth %
    const momGrowthData = useMemo(() => {
        if (!trendData || !trendData.labels || trendData.labels.length < 2) return null;

        const months = trendData.labels;
        const domesticValues = trendData.valueData.datasets[0].data;
        const exportValues = trendData.valueData.datasets[1].data;
        const domesticWeight = trendData.weightData.datasets[0].data;
        const exportWeight = trendData.weightData.datasets[1].data;

        // Calculate total values and weights per month
        const totalValues = months.map((_, i) => domesticValues[i] + exportValues[i]);
        const totalWeights = months.map((_, i) => domesticWeight[i] + exportWeight[i]);

        // Calculate MoM growth percentages
        const valueGrowth = [];
        const weightGrowth = [];
        const growthLabels = [];

        for (let i = 1; i < months.length; i++) {
            growthLabels.push(months[i]);

            // Value growth %
            const prevValue = totalValues[i - 1];
            const currValue = totalValues[i];
            const valueGrowthPct = prevValue > 0 ? ((currValue - prevValue) / prevValue) * 100 : 0;
            valueGrowth.push(parseFloat(valueGrowthPct.toFixed(1)));

            // Weight growth %
            const prevWeight = totalWeights[i - 1];
            const currWeight = totalWeights[i];
            const weightGrowthPct = prevWeight > 0 ? ((currWeight - prevWeight) / prevWeight) * 100 : 0;
            weightGrowth.push(parseFloat(weightGrowthPct.toFixed(1)));
        }

        // Separate data for Value Growth chart
        const valueGrowthData = {
            labels: growthLabels,
            datasets: [{
                label: 'Value Growth %',
                data: valueGrowth,
                borderColor: SALES_COLORS.primary.solid,
                backgroundColor: SALES_COLORS.primary.light,
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: valueGrowth.map(v => v >= 0 ? SALES_COLORS.success.solid : SALES_COLORS.danger.solid),
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                datalabels: {
                    display: true,
                    align: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value >= 0 ? 'top' : 'bottom';
                    },
                    anchor: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value >= 0 ? 'end' : 'start';
                    },
                    offset: 6,
                    color: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value >= 0 ? SALES_COLORS.success.solid : SALES_COLORS.danger.solid;
                    },
                    font: { weight: 'bold', size: 15 },
                    formatter: (value) => `${value >= 0 ? '+' : ''}${value}%`
                }
            }]
        };

        // Separate data for Weight Growth chart
        const weightGrowthData = {
            labels: growthLabels,
            datasets: [{
                label: 'Weight Growth %',
                data: weightGrowth,
                borderColor: SALES_COLORS.warning.solid,
                backgroundColor: SALES_COLORS.warning.light,
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: weightGrowth.map(v => v >= 0 ? SALES_COLORS.success.solid : SALES_COLORS.danger.solid),
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7,
                datalabels: {
                    display: true,
                    align: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value >= 0 ? 'top' : 'bottom';
                    },
                    anchor: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value >= 0 ? 'end' : 'start';
                    },
                    offset: 6,
                    color: (context) => {
                        const value = context.dataset.data[context.dataIndex];
                        return value >= 0 ? SALES_COLORS.success.solid : SALES_COLORS.danger.solid;
                    },
                    font: { weight: 'bold', size: 15 },
                    formatter: (value) => `${value >= 0 ? '+' : ''}${value}%`
                }
            }]
        };

        return { valueGrowthData, weightGrowthData };
    }, [trendData]);

    // Revenue Speedometer data (target: 84 Cr = 840000000)
    const REVENUE_TARGET = 840000000; // 84 Cr in absolute value
    const revenueProgress = useMemo(() => {
        const current = summary.totalValue || 0;
        const percentage = Math.min((current / REVENUE_TARGET) * 100, 100);
        return {
            current,
            target: REVENUE_TARGET,
            percentage: parseFloat(percentage.toFixed(1))
        };
    }, [summary.totalValue]);

    // Prepare Top 5 Customers
    const topCustomersData = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        const customerValues = {};
        rawData.forEach(row => {
            const custName = row.CustName || 'Unknown';
            customerValues[custName] = (customerValues[custName] || 0) + (row.Value || 0);
        });

        const sorted = Object.entries(customerValues)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            labels: sorted.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name),
            fullNames: sorted.map(([name]) => name),
            datasets: [{
                label: 'Value',
                data: sorted.map(([, value]) => value),
                backgroundColor: [
                    SALES_COLORS.primary.medium,
                    SALES_COLORS.success.medium,
                    SALES_COLORS.danger.medium,
                    SALES_COLORS.warning.medium,
                    SALES_COLORS.teal.medium
                ],
                borderRadius: 4
            }]
        };
    }, [rawData]);

    // Prepare Category Distribution (Donut)
    const categoryData = useMemo(() => {
        if (!summary.categoryBreakdown || summary.categoryBreakdown.length === 0) return null;

        return {
            labels: summary.categoryBreakdown.map(c => c.CategoryName),
            datasets: [{
                data: summary.categoryBreakdown.map(c => c.CategoryValue),
                backgroundColor: [
                    SALES_COLORS.primary.medium,
                    SALES_COLORS.success.medium,
                    SALES_COLORS.danger.medium,
                    SALES_COLORS.warning.medium
                ],
                borderWidth: 2
            }]
        };
    }, [summary.categoryBreakdown]);

    // Prepare Segment Analysis
    const segmentChartData = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        const segmentValues = {};
        rawData.forEach(row => {
            const segment = row.Segment_Type || 'Other';
            segmentValues[segment] = (segmentValues[segment] || 0) + (row.Value || 0);
        });

        const sorted = Object.entries(segmentValues).sort((a, b) => b[1] - a[1]);

        return {
            labels: sorted.map(([name]) => name),
            datasets: [{
                label: 'Value',
                data: sorted.map(([, value]) => value),
                backgroundColor: SALES_COLORS.primary.medium,
                borderColor: SALES_COLORS.primary.solid,
                borderWidth: 1,
                borderRadius: 4
            }]
        };
    }, [rawData]);

    // Prepare Customer Area Group (Pie)
    const areaGroupData = useMemo(() => {
        if (!rawData || rawData.length === 0) return null;

        const areaValues = {};
        rawData.forEach(row => {
            const area = row['CUSTOMER AREA GROUP'] || 'Other';
            areaValues[area] = (areaValues[area] || 0) + (row.Value || 0);
        });

        const sorted = Object.entries(areaValues).sort((a, b) => b[1] - a[1]);

        const colors = [
            SALES_COLORS.primary.solid,
            SALES_COLORS.success.solid,
            SALES_COLORS.danger.solid,
            SALES_COLORS.warning.solid,
            SALES_COLORS.teal.solid,
            // Repeat with slight transparency if we run out (or use helper)
            SALES_COLORS.primary.medium,
            SALES_COLORS.success.medium,
            SALES_COLORS.danger.medium,
            SALES_COLORS.warning.medium
        ];

        return {
            labels: sorted.map(([name]) => name),
            datasets: [{
                data: sorted.map(([, value]) => value),
                backgroundColor: colors.slice(0, sorted.length),
                borderWidth: 2
            }]
        };
    }, [rawData]);

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
                    <h1>📈 Sales Dashboard</h1>
                    <p className="welcome-text">Sales Performance Overview</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ExportButtons
                        chartRefs={[
                            { ref: totalValueChartRef, title: 'Monthly Sales - Total Value' },
                            { ref: domesticValueChartRef, title: 'Monthly Sales Value (Domestic vs Export)' },
                            { ref: domesticWeightChartRef, title: 'Monthly Sales Weight (Domestic vs Export)' },
                            { ref: momGrowthChartRef, title: 'MoM Sales Growth %' },
                            { ref: topCustomersChartRef, title: 'Top 5 Customers' },
                            { ref: categoryChartRef, title: 'Domestic vs Export' },
                            { ref: segmentChartRef, title: 'Sales by Segment' },
                            { ref: areaGroupChartRef, title: 'Customer Area Group Distribution' }
                        ]}
                        fileName={`sales-dashboard-${format(new Date(), 'yyyy-MM-dd')}`}
                        title="Sales Dashboard Report"
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
                <button
                    onClick={() => handlePresetChange('thisMonth')}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: activePreset === 'thisMonth' ? '#3B82F6' : '#E5E7EB',
                        color: activePreset === 'thisMonth' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s'
                    }}
                >
                    This Month
                </button>
                <button
                    onClick={() => handlePresetChange('lastMonth')}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: activePreset === 'lastMonth' ? '#3B82F6' : '#E5E7EB',
                        color: activePreset === 'lastMonth' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s'
                    }}
                >
                    Last Month
                </button>
                <button
                    onClick={() => handlePresetChange('last3Months')}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: activePreset === 'last3Months' ? '#3B82F6' : '#E5E7EB',
                        color: activePreset === 'last3Months' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s'
                    }}
                >
                    Last 3 Months
                </button>
                <button
                    onClick={() => handlePresetChange('last6Months')}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: activePreset === 'last6Months' ? '#3B82F6' : '#E5E7EB',
                        color: activePreset === 'last6Months' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s'
                    }}
                >
                    Last 6 Months
                </button>
                <button
                    onClick={() => handlePresetChange('fy')}
                    style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: activePreset === 'fy' ? '#3B82F6' : '#E5E7EB',
                        color: activePreset === 'fy' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        transition: 'all 0.2s'
                    }}
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Sales Value</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency(summary.totalValue)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Quantity</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatNumber(summary.totalQuantity)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(summary.totalWeight)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Avg Monthly Sales</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatCurrency(summary.avgSalesValue)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Avg Monthly Tonnage</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(summary.avgMonthlyTonnage)}
                    </div>
                </div>

                {/* Historical Records - Highest Ever Month */}
                <div className="kpi-card" style={{
                    border: '2px solid #9CA3AF'
                }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>🏆 Highest Ever Month</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoadingHistorical ? '...' : (historicalRecords?.highestMonth?.month || 'N/A')}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginTop: '0.25rem' }}>
                        {isLoadingHistorical ? '' : formatCurrency(historicalRecords?.highestMonth?.value || 0)}
                    </div>
                </div>

                {/* Historical Records - Highest Ever FY */}
                <div className="kpi-card" style={{
                    border: '2px solid #9CA3AF'
                }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>🏆 Highest Ever FY</div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoadingHistorical ? '...' : (historicalRecords?.highestFY?.fy || 'N/A')}
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', marginTop: '0.25rem' }}>
                        {isLoadingHistorical ? '' : formatCurrency(historicalRecords?.highestFY?.value || 0)}
                    </div>
                </div>
            </div>

            {/* Monthly Sales - Total Value (Full Width Area Chart) */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div
                    ref={totalValueChartRef}
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '📊 Monthly Sales - Total Value (Domestic + Export)',
                        content: trendData?.totalValueTrend ? (
                            <Line
                                data={trendData.totalValueTrend}
                                options={{
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
                                            display: true,
                                            align: 'top',
                                            anchor: 'end',
                                            offset: 4,
                                            color: '#1F2937',
                                            font: { weight: 'bold', size: 15 },
                                            formatter: (value) => formatCurrency(value)
                                        }
                                    },
                                    layout: {
                                        padding: { top: 20 }
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
                                    },
                                    interaction: {
                                        mode: 'index',
                                        intersect: false
                                    }
                                }}
                            />
                        ) : <div>No data available</div>
                    })}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Monthly Sales - Total Value (Domestic + Export)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '380px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : trendData?.totalValueTrend ? (
                            <Line
                                data={trendData.totalValueTrend}
                                options={{
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
                                            display: true,
                                            align: 'top',
                                            anchor: 'end',
                                            offset: 4,
                                            color: '#1F2937',
                                            font: { weight: 'bold', size: 15 },
                                            formatter: (value) => formatCurrency(value)
                                        }
                                    },
                                    layout: {
                                        padding: { top: 20 }
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
                                    },
                                    interaction: {
                                        mode: 'index',
                                        intersect: false
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Charts Grid - Row 1 */}
            {/* Monthly Sales Value - Full Width */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div
                    ref={domesticValueChartRef}
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '📊 Monthly Sales - Domestic vs Export (Value)',
                        content: trendData?.valueData ? (
                            <Bar
                                data={trendData.valueData}
                                options={{
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
                                            anchor: 'end',
                                            align: 'top',
                                            color: '#1F2937',
                                            font: { weight: 'bold', size: 14 },
                                            formatter: (value) => formatCurrency(value)
                                        }
                                    },
                                    layout: {
                                        padding: { top: 15 }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                callback: (value) => formatCurrency(value)
                                            }
                                        }
                                    }
                                }}
                            />
                        ) : <div>No data available</div>
                    })}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Monthly Sales - Domestic vs Export (Value)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : trendData?.valueData ? (
                            <Bar
                                data={trendData.valueData}
                                options={{
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
                                            anchor: 'end',
                                            align: 'top',
                                            color: '#1F2937',
                                            font: { weight: 'bold', size: 14 },
                                            formatter: (value) => formatCurrency(value)
                                        }
                                    },
                                    layout: {
                                        padding: { top: 15 }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                callback: (value) => formatCurrency(value)
                                            }
                                        }
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Monthly Sales Weight - Full Width */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div
                    ref={domesticWeightChartRef}
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '⚖️ Monthly Sales - Domestic vs Export (Weight)',
                        content: trendData?.weightData ? (
                            <Bar data={trendData.weightData} options={{ responsive: true, maintainAspectRatio: false, layout: { padding: { top: 15 } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (context) => `${context.dataset.label}: ${formatWeight(context.raw)}` } }, datalabels: { display: true, anchor: 'end', align: 'top', color: '#1F2937', font: { weight: 'bold', size: 14 }, formatter: (value) => formatWeight(value) } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatWeight(value) } } } }} />
                        ) : <div>No data</div>
                    })}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>⚖️ Monthly Sales - Domestic vs Export (Weight)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : trendData?.weightData ? (
                            <Bar
                                data={trendData.weightData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { position: 'bottom' },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.dataset.label}: ${formatWeight(context.raw)}`
                                            }
                                        },
                                        datalabels: {
                                            display: true,
                                            anchor: 'end',
                                            align: 'top',
                                            color: '#1F2937',
                                            font: { weight: 'bold', size: 14 },
                                            formatter: (value) => formatWeight(value)
                                        }
                                    },
                                    layout: {
                                        padding: { top: 15 }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                callback: (value) => formatWeight(value)
                                            }
                                        }
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Trend Line Chart - Full Width */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '📈 Monthly Sales Trend - Domestic vs Export (Value)',
                        content: trendData?.valueTrendLine ? (
                            <Line
                                data={trendData.valueTrendLine}
                                options={{
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
                                            display: true,
                                            align: 'top',
                                            anchor: 'end',
                                            offset: 4,
                                            color: '#1F2937',
                                            font: { weight: 'bold', size: 15 },
                                            formatter: (value) => formatCurrency(value)
                                        }
                                    },
                                    layout: {
                                        padding: { top: 20 }
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
                                    },
                                    interaction: {
                                        mode: 'index',
                                        intersect: false
                                    }
                                }}
                            />
                        ) : <div>No data available</div>
                    })}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Monthly Sales Trend - Domestic vs Export (Value)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : trendData?.valueTrendLine ? (
                            <Line
                                data={trendData.valueTrendLine}
                                options={{
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
                                            display: true,
                                            align: 'top',
                                            anchor: 'end',
                                            offset: 4,
                                            color: '#1F2937',
                                            font: { weight: 'bold', size: 15 },
                                            formatter: (value) => formatCurrency(value)
                                        }
                                    },
                                    layout: {
                                        padding: { top: 20 }
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
                                    },
                                    interaction: {
                                        mode: 'index',
                                        intersect: false
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>


            {/* MoM Growth Charts - Separate Full Width */}
            {/* Month-over-Month Growth % (Value) */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div
                    ref={momGrowthChartRef}
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '📈 Month-over-Month (MoM) Growth % (Value)',
                        content: momGrowthData?.valueGrowthData ? (
                            <Line
                                data={momGrowthData.valueGrowthData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.dataset.label}: ${context.raw}%`
                                            }
                                        }
                                    },
                                    scales: {
                                        y: {
                                            ticks: {
                                                callback: (value) => `${value}%`
                                            },
                                            grid: {
                                                color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
                                            }
                                        }
                                    },
                                    interaction: {
                                        mode: 'index',
                                        intersect: false
                                    }
                                }}
                            />
                        ) : <div>No data available</div>
                    })}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Month-over-Month (MoM) Growth % (Value)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : momGrowthData?.valueGrowthData ? (
                            <Line
                                data={momGrowthData.valueGrowthData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.dataset.label}: ${context.raw}%`
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            offset: true,
                                            grid: { display: false }
                                        },
                                        y: {
                                            ticks: {
                                                callback: (value) => `${value}%`
                                            },
                                            grid: {
                                                color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
                                            }
                                        }
                                    },
                                    interaction: {
                                        mode: 'index',
                                        intersect: false
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>Not enough data for MoM calculation</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Month-over-Month Growth % (Weight) */}
            <div style={{ marginBottom: '1.5rem' }}>
                <div
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '⚖️ Month-over-Month (MoM) Growth % (Weight)',
                        content: momGrowthData?.weightGrowthData ? (
                            <Line
                                data={momGrowthData.weightGrowthData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.dataset.label}: ${context.raw}%`
                                            }
                                        }
                                    },
                                    scales: {
                                        y: {
                                            ticks: {
                                                callback: (value) => `${value}%`
                                            },
                                            grid: {
                                                color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
                                            }
                                        }
                                    },
                                    interaction: {
                                        mode: 'index',
                                        intersect: false
                                    }
                                }}
                            />
                        ) : <div>No data available</div>
                    })}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>⚖️ Month-over-Month (MoM) Growth % (Weight)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : momGrowthData?.weightGrowthData ? (
                            <Line
                                data={momGrowthData.weightGrowthData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.dataset.label}: ${context.raw}%`
                                            }
                                        }
                                    },
                                    scales: {
                                        x: {
                                            offset: true,
                                            grid: { display: false }
                                        },
                                        y: {
                                            ticks: {
                                                callback: (value) => `${value}%`
                                            },
                                            grid: {
                                                color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'
                                            }
                                        }
                                    },
                                    interaction: {
                                        mode: 'index',
                                        intersect: false
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>Not enough data for MoM calculation</div>
                        )}
                    </div>
                </div>
            </div>



            {/* Charts Grid - Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Top 5 Customers */}
                <div
                    ref={topCustomersChartRef}
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '🏆 Top 5 Customers',
                        content: topCustomersData ? (
                            <Bar
                                data={topCustomersData}
                                options={{
                                    indexAxis: 'y',
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    layout: { padding: { right: 50 } },
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                title: (tooltipItems) => topCustomersData?.fullNames?.[tooltipItems[0].dataIndex] || tooltipItems[0].label,
                                                label: (context) => formatCurrency(context.raw)
                                            }
                                        },
                                        datalabels: {
                                            labels: {
                                                name: {
                                                    display: true,
                                                    anchor: 'start',
                                                    align: 'end',
                                                    color: '#000000',
                                                    font: { weight: 'bold', size: 15 },
                                                    formatter: (value, context) => topCustomersData?.fullNames?.[context.dataIndex] || '',
                                                },
                                                value: {
                                                    display: true,
                                                    anchor: 'end',
                                                    align: 'end',
                                                    color: '#1F2937',
                                                    font: { weight: 'bold', size: 15 },
                                                    formatter: (value) => formatCurrency(value)
                                                }
                                            }
                                        }
                                    },
                                    scales: {
                                        x: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) } },
                                        y: { ticks: { display: false } }
                                    }
                                }}
                            />
                        ) : <div>No data</div>
                    })}
                    style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', gridColumn: '1 / -1' }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🏆 Top 5 Customers</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : topCustomersData ? (
                            <Bar
                                data={topCustomersData}
                                options={{
                                    indexAxis: 'y',
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    layout: {
                                        padding: {
                                            right: 50
                                        }
                                    },
                                    plugins: {
                                        legend: { display: false },
                                        tooltip: {
                                            callbacks: {
                                                title: (tooltipItems) => topCustomersData?.fullNames?.[tooltipItems[0].dataIndex] || tooltipItems[0].label,
                                                label: (context) => formatCurrency(context.raw)
                                            }
                                        },
                                        datalabels: {
                                            labels: {
                                                name: {
                                                    display: true,
                                                    anchor: 'start',
                                                    align: 'end',
                                                    color: '#000000',
                                                    font: { weight: 'bold', size: 15 },
                                                    formatter: (value, context) => topCustomersData?.fullNames?.[context.dataIndex] || '',
                                                },
                                                value: {
                                                    display: true,
                                                    anchor: 'end',
                                                    align: 'end',
                                                    color: '#1F2937',
                                                    font: { weight: 'bold', size: 15 },
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
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* Category Distribution */}
                <div
                    ref={categoryChartRef}
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '🥧 Domestic vs Export',
                        content: categoryData ? (
                            <Doughnut data={categoryData} options={{ responsive: true, maintainAspectRatio: false, cutout: '35%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (context) => `${context.label}: ${formatCurrency(context.raw)}` } }, datalabels: { display: true, color: '#111827', font: { weight: 'bold', size: 20 }, formatter: (value, context) => { const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); const percentage = ((value / total) * 100).toFixed(1); return percentage > 5 ? `${percentage}%` : ''; }, anchor: 'center', align: 'center' } } }} />
                        ) : <div>No data</div>
                    })}
                    style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🥧 Domestic vs Export</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '320px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : categoryData ? (
                            <Doughnut
                                data={categoryData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    cutout: '35%',
                                    plugins: {
                                        legend: { position: 'bottom' },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.label}: ${formatCurrency(context.raw)}`
                                            }
                                        },
                                        datalabels: {
                                            display: true,
                                            color: '#111827',
                                            font: {
                                                weight: 'bold',
                                                size: 20
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
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* Sales Target Progress - Small Speedometer */}
                <div
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '🎯 Sales Target Progress',
                        content: (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: '500px' }}>
                                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round" />
                                    <defs>
                                        <linearGradient id="speedometerGradientExpanded" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#EF4444" />
                                            <stop offset="50%" stopColor="#F97316" />
                                            <stop offset="100%" stopColor="#22C55E" />
                                        </linearGradient>
                                    </defs>
                                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#speedometerGradientExpanded)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(revenueProgress.percentage / 100) * 251.2} 251.2`} />
                                    <g style={{ transformOrigin: '100px 100px', transform: `rotate(${-90 + (revenueProgress.percentage / 100) * 180}deg)` }}>
                                        <line x1="100" y1="100" x2="100" y2="35" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
                                        <circle cx="100" cy="100" r="8" fill="#1F2937" />
                                        <circle cx="100" cy="100" r="4" fill="white" />
                                    </g>
                                    <text x="20" y="115" textAnchor="middle" fontSize="12" fill="#6B7280">₹0</text>
                                    <text x="180" y="115" textAnchor="middle" fontSize="12" fill="#6B7280">₹84 Cr</text>
                                </svg>
                                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                                    <div style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1F2937' }}>{formatCurrency(revenueProgress.current)}</div>
                                    <div style={{ fontSize: '1.25rem', color: '#6B7280', marginTop: '0.5rem' }}>{revenueProgress.percentage}% of ₹84 Cr Target</div>
                                    <div style={{ fontSize: '1rem', color: revenueProgress.percentage >= 75 ? '#22C55E' : revenueProgress.percentage >= 50 ? '#EAB308' : '#6B7280', marginTop: '1rem', fontWeight: '600' }}>
                                        {revenueProgress.percentage >= 100 ? '🎉 Target Achieved!' : revenueProgress.percentage >= 75 ? '🔥 Almost there!' : revenueProgress.percentage >= 50 ? '📈 Good progress!' : '💪 Keep pushing!'}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🎯 Sales Target Progress</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {isLoading ? (
                            <div>Loading...</div>
                        ) : (
                            <>
                                <svg viewBox="0 0 200 120" style={{ width: '100%', maxWidth: '400px' }}>
                                    <style>{`
                                        @keyframes drawArc2 { from { stroke-dasharray: 0 251.2; } to { stroke-dasharray: ${(revenueProgress.percentage / 100) * 251.2} 251.2; } }
                                        @keyframes rotateNeedle2 { from { transform: rotate(-90deg); } to { transform: rotate(${-90 + (revenueProgress.percentage / 100) * 180}deg); } }
                                        .speedometer-arc2 { animation: drawArc2 1.5s ease-out forwards; }
                                        .speedometer-needle2 { transform-origin: 100px 100px; animation: rotateNeedle2 1.5s ease-out forwards; }
                                    `}</style>
                                    <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#E5E7EB" strokeWidth="16" strokeLinecap="round" />
                                    <defs>
                                        <linearGradient id="speedometerGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                                            <stop offset="0%" stopColor="#EF4444" />
                                            <stop offset="50%" stopColor="#F97316" />
                                            <stop offset="100%" stopColor="#22C55E" />
                                        </linearGradient>
                                    </defs>
                                    <path className="speedometer-arc2" d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#speedometerGradient2)" strokeWidth="16" strokeLinecap="round" strokeDasharray={`${(revenueProgress.percentage / 100) * 251.2} 251.2`} />
                                    <g className="speedometer-needle2">
                                        <line x1="100" y1="100" x2="100" y2="35" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
                                        <circle cx="100" cy="100" r="8" fill="#1F2937" />
                                        <circle cx="100" cy="100" r="4" fill="white" />
                                    </g>
                                    <text x="20" y="115" textAnchor="middle" fontSize="10" fill="#6B7280">₹0</text>
                                    <text x="180" y="115" textAnchor="middle" fontSize="10" fill="#6B7280">₹84 Cr</text>
                                </svg>
                                <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1F2937' }}>{formatCurrency(revenueProgress.current)}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>{revenueProgress.percentage}% of ₹84 Cr Target</div>
                                    <div style={{ fontSize: '0.7rem', color: revenueProgress.percentage >= 75 ? '#22C55E' : revenueProgress.percentage >= 50 ? '#EAB308' : '#6B7280', marginTop: '0.5rem', fontWeight: '600' }}>
                                        {revenueProgress.percentage >= 100 ? '🎉 Target Achieved!' : revenueProgress.percentage >= 75 ? '🔥 Almost there!' : revenueProgress.percentage >= 50 ? '📈 Good progress!' : '💪 Keep pushing!'}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Sales by Segment */}
                <div
                    ref={segmentChartRef}
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '📦 Sales by Segment',
                        content: segmentChartData ? (
                            <Bar data={segmentChartData} options={{ responsive: true, maintainAspectRatio: false, layout: { padding: { top: 20 } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => formatCurrency(context.raw) } }, datalabels: { display: true, anchor: 'end', align: 'top', color: '#1F2937', font: { weight: 'bold', size: 15 }, formatter: (value) => formatCurrency(value) } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) } } } }} />
                        ) : <div>No data</div>
                    })}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.005)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📦 Sales by Segment</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : segmentChartData ? (
                            <Bar
                                data={segmentChartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
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
                                            align: 'top',
                                            color: '#1F2937',
                                            font: { weight: 'bold', size: 15 },
                                            formatter: (value) => formatCurrency(value)
                                        }
                                    },
                                    layout: {
                                        padding: {
                                            top: 20
                                        }
                                    },
                                    scales: {
                                        y: {
                                            beginAtZero: true,
                                            ticks: {
                                                callback: (value) => formatCurrency(value)
                                            }
                                        }
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* Customer Area Group - Pie Chart */}
                <div
                    ref={areaGroupChartRef}
                    className="chart-card"
                    onClick={() => setExpandedChart({
                        title: '🌍 Customer Area Group Distribution',
                        content: areaGroupData ? (
                            <Pie data={areaGroupData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 15, font: { size: 15 } } }, tooltip: { callbacks: { label: (context) => `${context.label}: ${formatCurrency(context.raw)}` } }, datalabels: { display: true, color: '#000000', font: { weight: 'bold', size: 19 }, formatter: (value, context) => { const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); const percentage = ((value / total) * 100).toFixed(1); return percentage > 5 ? `${percentage}%` : ''; }, anchor: 'center', align: 'center' } } }} />
                        ) : <div>No data</div>
                    })}
                    style={{ backgroundColor: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
                >
                    <div className="chart-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🌍 Customer Area Group Distribution</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '420px', display: 'flex', justifyContent: 'center' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : areaGroupData ? (
                            <Pie
                                data={areaGroupData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: 'right',
                                            labels: {
                                                boxWidth: 12,
                                                padding: 15,
                                                font: { size: 15 }
                                            }
                                        },
                                        tooltip: {
                                            callbacks: {
                                                label: (context) => `${context.label}: ${formatCurrency(context.raw)}`
                                            }
                                        },
                                        datalabels: {
                                            display: true,
                                            color: '#000000',
                                            formatter: (value, context) => {
                                                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                                                const percentage = ((value / total) * 100).toFixed(1);
                                                return percentage > 5 ? `${percentage}%` : '';
                                            },
                                            anchor: 'center',
                                            align: 'center'
                                        }
                                    }
                                }}
                            />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>


        </div>
    );
};

export default SalesDashboard;
