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
import { Bar, Line } from 'react-chartjs-2';
import { format, subMonths } from 'date-fns';

import api from '../api';
import {
    applyChartDefaults,
    SALES_COLORS,
    PRODUCTION_COLORS,
    getLineChartOptions,
    getHorizontalBarOptions,
    getStackedBarOptions
} from '../utils/chartConfig';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import './dashboard/Dashboard.css';
import ExportButton from './ExportButton';
import ExportButtons from './common/ExportButtons';

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

applyChartDefaults(ChartJS);

const REFRESH_INTERVAL = 120000; // 2 minutes

const formatCurrency = (value) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
    return `₹${(value || 0).toFixed(0)}`;
};

const formatWeight = (value) => {
    return `${Math.round(value || 0)} T`;
};



const DailyDashboard = () => {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [expandedChart, setExpandedChart] = useState(null);

    // Chart refs for PDF/Excel export
    const daywiseExportChartRef = useRef(null);
    const daywiseDomesticChartRef = useRef(null);
    const salesTrendChartRef = useRef(null);
    const cumulativeSalesWeightChartRef = useRef(null);
    const cumulativeSalesValueChartRef = useRef(null);
    const cumulativeTotalSalesValueChartRef = useRef(null);
    const top10GroupsChartRef = useRef(null);
    const daywiseOkWeightChartRef = useRef(null);
    const daywiseRejWeightChartRef = useRef(null);
    const daywiseRejPercentChartRef = useRef(null);
    const productionTrendChartRef = useRef(null);
    const cumulativeProductionChartRef = useRef(null);
    const cumulativeRejWeightChartRef = useRef(null);
    const [countdown, setCountdown] = useState(60);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Date filter - default to current month
    const today = new Date();
    const [activePreset, setActivePreset] = useState('thisMonth');
    const [appliedFilters, setAppliedFilters] = useState({
        fromDate: format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd'),
        toDate: format(today, 'yyyy-MM-dd')
    });

    // Active tab from URL
    const activeTab = searchParams.get('tab') || 'sales';
    const setActiveTab = useCallback((tab) => {
        setSearchParams(prev => { prev.set('tab', tab); return prev; }, { replace: true });
    }, [setSearchParams]);

    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries(['daily-dashboard']);
        setLastRefresh(new Date());
        setCountdown(60);
    }, [queryClient]);

    // Auto-refresh countdown
    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    queryClient.invalidateQueries(['daily-dashboard']);
                    setLastRefresh(new Date());
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [queryClient]);

    // Lock body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = expandedChart ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [expandedChart]);

    // Handle preset change
    const handlePresetChange = (preset) => {
        const now = new Date();
        let fromDate, toDate;
        setActivePreset(preset);

        switch (preset) {
            case 'thisMonth':
                fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
                toDate = now;
                break;
            case 'lastMonth':
                fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                toDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'last3Months':
                fromDate = subMonths(now, 3);
                toDate = now;
                break;
            default:
                return;
        }

        setAppliedFilters({
            fromDate: format(fromDate, 'yyyy-MM-dd'),
            toDate: format(toDate, 'yyyy-MM-dd')
        });
    };

    // ============= DATA FETCHING =============

    const { data: salesRaw, isLoading: isSalesLoading } = useQuery({
        queryKey: ['daily-dashboard', 'sales', appliedFilters.fromDate, appliedFilters.toDate],
        queryFn: async () => {
            const res = await api.get('/daily-dashboard/sales-data', {
                params: { fromDate: appliedFilters.fromDate, toDate: appliedFilters.toDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    const { data: productionRaw, isLoading: isProdLoading } = useQuery({
        queryKey: ['daily-dashboard', 'production', appliedFilters.fromDate, appliedFilters.toDate],
        queryFn: async () => {
            const res = await api.get('/daily-dashboard/production-data', {
                params: { fromDate: appliedFilters.fromDate, toDate: appliedFilters.toDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // ============= SALES CHART DATA =============

    // 1a. Day-wise Sales (Export) (Value) - Bar
    const daywiseExportData = useMemo(() => {
        if (!salesRaw || salesRaw.length === 0) return null;

        const dayData = {};
        salesRaw.forEach(row => {
            const date = row.InvDate;
            const category = (row.CategoryName || '').toLowerCase();
            if (category.includes('export')) {
                dayData[date] = (dayData[date] || 0) + (row.Value || 0);
            }
        });

        const dates = Object.keys(dayData).sort();
        const shortLabels = dates.map(d => {
            const dt = new Date(d);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        return {
            labels: shortLabels,
            datasets: [{
                label: 'Export Value',
                data: dates.map(d => dayData[d]),
                backgroundColor: SALES_COLORS.success.medium,
                borderColor: SALES_COLORS.success.solid,
                borderWidth: 1,
                borderRadius: 4,
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 2,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => formatCurrency(value)
                }
            }]
        };
    }, [salesRaw]);

    // 1b. Day-wise Sales (Domestic) (Value) - Bar
    const daywiseDomesticData = useMemo(() => {
        if (!salesRaw || salesRaw.length === 0) return null;

        const dayData = {};
        salesRaw.forEach(row => {
            const date = row.InvDate;
            const category = (row.CategoryName || '').toLowerCase();
            if (!category.includes('export')) {
                dayData[date] = (dayData[date] || 0) + (row.Value || 0);
            }
        });

        const dates = Object.keys(dayData).sort();
        const shortLabels = dates.map(d => {
            const dt = new Date(d);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        return {
            labels: shortLabels,
            datasets: [{
                label: 'Domestic Value',
                data: dates.map(d => dayData[d]),
                backgroundColor: SALES_COLORS.primary.medium,
                borderColor: SALES_COLORS.primary.solid,
                borderWidth: 1,
                borderRadius: 4,
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 2,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => formatCurrency(value)
                }
            }]
        };
    }, [salesRaw]);

    // 2. Day-wise Sales Trend (Line) - total value per day
    const salesTrendData = useMemo(() => {
        if (!salesRaw || salesRaw.length === 0) return null;

        const dayTotals = {};
        salesRaw.forEach(row => {
            const date = row.InvDate;
            dayTotals[date] = (dayTotals[date] || 0) + (row.Value || 0);
        });

        const dates = Object.keys(dayTotals).sort();
        const shortLabels = dates.map(d => {
            const dt = new Date(d);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        return {
            labels: shortLabels,
            datasets: [{
                label: 'Total Sales Value',
                data: dates.map(d => dayTotals[d]),
                borderColor: SALES_COLORS.primary.solid,
                backgroundColor: SALES_COLORS.primary.light,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: SALES_COLORS.primary.solid,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                datalabels: {
                    display: true,
                    align: (context) => context.dataIndex % 2 === 0 ? 'top' : 'bottom',
                    anchor: (context) => context.dataIndex % 2 === 0 ? 'end' : 'start',
                    offset: 4,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value) => formatCurrency(value)
                }
            }]
        };
    }, [salesRaw]);

    // 3. Cumulative Sales (Weight) - running total area chart
    const cumulativeSalesWeightData = useMemo(() => {
        if (!salesRaw || salesRaw.length === 0) return null;

        const dayWeights = {};
        salesRaw.forEach(row => {
            const date = row.InvDate;
            dayWeights[date] = (dayWeights[date] || 0) + (row.Weight || 0);
        });

        const dates = Object.keys(dayWeights).sort();
        const shortLabels = dates.map(d => {
            const dt = new Date(d);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        // Cumulative (convert Kg to Tonnes)
        let cumulative = 0;
        const cumulativeValues = dates.map(d => {
            cumulative += dayWeights[d] / 1000;
            return cumulative;
        });

        return {
            labels: shortLabels,
            datasets: [{
                label: 'Cumulative Weight (T)',
                data: cumulativeValues,
                borderColor: SALES_COLORS.danger.solid,
                backgroundColor: SALES_COLORS.danger.light,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: SALES_COLORS.danger.solid,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                datalabels: {
                    display: true,
                    align: (context) => context.dataIndex % 2 === 0 ? 'top' : 'bottom',
                    anchor: (context) => context.dataIndex % 2 === 0 ? 'end' : 'start',
                    offset: 4,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value) => `${Math.round(value)} T`
                }
            }]
        };
    }, [salesRaw]);

    // 3b. Cumulative Sales (Export & Domestic)(Value) - two-line area chart
    const cumulativeSalesValueData = useMemo(() => {
        if (!salesRaw || salesRaw.length === 0) return null;

        const dayValues = {};
        salesRaw.forEach(row => {
            const date = row.InvDate;
            const category = (row.CategoryName || '').toLowerCase();
            if (!dayValues[date]) dayValues[date] = { export: 0, domestic: 0 };
            if (category.includes('export')) {
                dayValues[date].export += (row.Value || 0);
            } else {
                dayValues[date].domestic += (row.Value || 0);
            }
        });

        const dates = Object.keys(dayValues).sort();
        const shortLabels = dates.map(d => {
            const dt = new Date(d);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        let cumExport = 0, cumDomestic = 0;
        const exportCum = dates.map(d => { cumExport += dayValues[d].export; return cumExport; });
        const domesticCum = dates.map(d => { cumDomestic += dayValues[d].domestic; return cumDomestic; });

        return {
            labels: shortLabels,
            datasets: [
                {
                    label: 'Cumulative Export Value',
                    data: exportCum,
                    borderColor: SALES_COLORS.success.solid,
                    backgroundColor: SALES_COLORS.success.light,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: SALES_COLORS.success.solid,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    datalabels: {
                        display: true,
                        align: (context) => context.dataIndex % 2 === 0 ? 'top' : 'bottom',
                        anchor: (context) => context.dataIndex % 2 === 0 ? 'end' : 'start',
                        offset: 4,
                        color: '#065F46',
                        font: { weight: 'bold', size: 11 },
                        formatter: (value) => formatCurrency(value)
                    }
                },
                {
                    label: 'Cumulative Domestic Value',
                    data: domesticCum,
                    borderColor: SALES_COLORS.primary.solid,
                    backgroundColor: SALES_COLORS.primary.light,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: SALES_COLORS.primary.solid,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6,
                    datalabels: {
                        display: true,
                        align: (context) => context.dataIndex % 2 === 0 ? 'bottom' : 'top',
                        anchor: (context) => context.dataIndex % 2 === 0 ? 'start' : 'end',
                        offset: 4,
                        color: '#1E40AF',
                        font: { weight: 'bold', size: 11 },
                        formatter: (value) => formatCurrency(value)
                    }
                }
            ]
        };
    }, [salesRaw]);

    // 3c. Cumulative Total Sales (Export & Domestic)(Value) - single running total line
    const cumulativeTotalSalesValueData = useMemo(() => {
        if (!salesRaw || salesRaw.length === 0) return null;

        const dayTotals = {};
        salesRaw.forEach(row => {
            const date = row.InvDate;
            dayTotals[date] = (dayTotals[date] || 0) + (row.Value || 0);
        });

        const dates = Object.keys(dayTotals).sort();
        const shortLabels = dates.map(d => {
            const dt = new Date(d);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        let cumTotal = 0;
        const cumulativeValues = dates.map(d => {
            cumTotal += dayTotals[d];
            return cumTotal;
        });

        return {
            labels: shortLabels,
            datasets: [{
                label: 'Cumulative Total Sales Value',
                data: cumulativeValues,
                borderColor: SALES_COLORS.warning.solid,
                backgroundColor: SALES_COLORS.warning.light,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: SALES_COLORS.warning.solid,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                datalabels: {
                    display: true,
                    align: (context) => context.dataIndex % 2 === 0 ? 'top' : 'bottom',
                    anchor: (context) => context.dataIndex % 2 === 0 ? 'end' : 'start',
                    offset: 4,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value) => formatCurrency(value)
                }
            }]
        };
    }, [salesRaw]);

    // 4. Top 10 Groups (Value) - horizontal bar
    const top10GroupsData = useMemo(() => {
        if (!salesRaw || salesRaw.length === 0) return null;

        const groupValues = {};
        salesRaw.forEach(row => {
            const group = row.CustomerGroup || 'Other';
            groupValues[group] = (groupValues[group] || 0) + (row.Value || 0);
        });

        const sorted = Object.entries(groupValues)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        return {
            labels: sorted.map(([name]) => name.length > 25 ? name.substring(0, 25) + '...' : name),
            fullNames: sorted.map(([name]) => name),
            datasets: [{
                label: 'Value',
                data: sorted.map(([, value]) => value),
                backgroundColor: SALES_COLORS.primary.medium,
                borderColor: SALES_COLORS.primary.solid,
                borderWidth: 1,
                borderRadius: 4,
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'end',
                    offset: 4,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value) => formatCurrency(value)
                }
            }]
        };
    }, [salesRaw]);

    // ============= PRODUCTION CHART DATA =============

    // 1a. Day-wise Production (OK Weight) - bar chart
    const daywiseOkWeightData = useMemo(() => {
        if (!productionRaw || productionRaw.length === 0) return null;

        const dates = productionRaw.map(r => {
            const dt = new Date(r.ProdDate);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        return {
            labels: dates,
            datasets: [{
                label: 'OK Production Weight (T)',
                data: productionRaw.map(r => (r.OkWeight || 0) / 1000),
                backgroundColor: PRODUCTION_COLORS.success.medium,
                borderColor: PRODUCTION_COLORS.success.solid,
                borderWidth: 1,
                borderRadius: 4,
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 2,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => `${value.toFixed(2)} T`
                }
            }]
        };
    }, [productionRaw]);

    // 1b. Day-wise Production (Rejection Weight) - bar chart
    const daywiseRejWeightData = useMemo(() => {
        if (!productionRaw || productionRaw.length === 0) return null;

        const dates = productionRaw.map(r => {
            const dt = new Date(r.ProdDate);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        return {
            labels: dates,
            datasets: [{
                label: 'Inhouse Rejection Weight (T)',
                data: productionRaw.map(r => (r.RejWeight || 0) / 1000),
                backgroundColor: PRODUCTION_COLORS.danger.medium,
                borderColor: PRODUCTION_COLORS.danger.solid,
                borderWidth: 1,
                borderRadius: 4,
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 2,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => `${value.toFixed(2)} T`
                }
            }]
        };
    }, [productionRaw]);

    // 1c. Day-wise Production (Rejection Weight) (Percentage) - bar chart
    const daywiseRejPercentData = useMemo(() => {
        if (!productionRaw || productionRaw.length === 0) return null;

        const dates = productionRaw.map(r => {
            const dt = new Date(r.ProdDate);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        return {
            labels: dates,
            datasets: [{
                label: 'Inhouse Rejection %',
                data: productionRaw.map(r => {
                    const total = (r.OkWeight || 0) + (r.RejWeight || 0);
                    return total > 0 ? ((r.RejWeight || 0) / total) * 100 : 0;
                }),
                backgroundColor: PRODUCTION_COLORS.danger.medium,
                borderColor: PRODUCTION_COLORS.danger.solid,
                borderWidth: 1,
                borderRadius: 4,
                datalabels: {
                    display: true,
                    anchor: 'end',
                    align: 'top',
                    offset: 2,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 11 },
                    formatter: (value) => `${value.toFixed(1)}%`
                }
            }]
        };
    }, [productionRaw]);

    // 2. Day-wise Production Trend (Line)
    const productionTrendData = useMemo(() => {
        if (!productionRaw || productionRaw.length === 0) return null;

        const dates = productionRaw.map(r => {
            const dt = new Date(r.ProdDate);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        return {
            labels: dates,
            datasets: [{
                label: 'Total Production (T)',
                data: productionRaw.map(r => ((r.OkWeight || 0) + (r.RejWeight || 0)) / 1000),
                borderColor: PRODUCTION_COLORS.primary.solid,
                backgroundColor: PRODUCTION_COLORS.primary.light,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: PRODUCTION_COLORS.primary.solid,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                datalabels: {
                    display: true,
                    align: (context) => context.dataIndex % 2 === 0 ? 'top' : 'bottom',
                    anchor: (context) => context.dataIndex % 2 === 0 ? 'end' : 'start',
                    offset: 4,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value) => `${Math.round(value)} T`
                }
            }]
        };
    }, [productionRaw]);

    // 3. Cumulative Production (Weight)
    const cumulativeProductionData = useMemo(() => {
        if (!productionRaw || productionRaw.length === 0) return null;

        const dates = productionRaw.map(r => {
            const dt = new Date(r.ProdDate);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        let cumulative = 0;
        const cumulativeValues = productionRaw.map(r => {
            cumulative += (r.OkWeight || 0) / 1000;
            return cumulative;
        });

        return {
            labels: dates,
            datasets: [{
                label: 'Cumulative OK Production Weight (T)',
                data: cumulativeValues,
                borderColor: PRODUCTION_COLORS.success.solid,
                backgroundColor: PRODUCTION_COLORS.success.light,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: PRODUCTION_COLORS.success.solid,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                datalabels: {
                    display: true,
                    align: (context) => context.dataIndex % 2 === 0 ? 'top' : 'bottom',
                    anchor: (context) => context.dataIndex % 2 === 0 ? 'end' : 'start',
                    offset: 4,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value) => `${Math.round(value)} T`
                }
            }]
        };
    }, [productionRaw]);

    // 3b. Cumulative Production (Rejection Weight)
    const cumulativeRejWeightData = useMemo(() => {
        if (!productionRaw || productionRaw.length === 0) return null;

        const dates = productionRaw.map(r => {
            const dt = new Date(r.ProdDate);
            return `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
        });

        let cumulative = 0;
        const cumulativeValues = productionRaw.map(r => {
            cumulative += (r.RejWeight || 0) / 1000;
            return cumulative;
        });

        return {
            labels: dates,
            datasets: [{
                label: 'Cumulative Rejection Weight (T)',
                data: cumulativeValues,
                borderColor: PRODUCTION_COLORS.danger.solid,
                backgroundColor: PRODUCTION_COLORS.danger.light,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: PRODUCTION_COLORS.danger.solid,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6,
                datalabels: {
                    display: true,
                    align: (context) => context.dataIndex % 2 === 0 ? 'top' : 'bottom',
                    anchor: (context) => context.dataIndex % 2 === 0 ? 'end' : 'start',
                    offset: 4,
                    color: '#1F2937',
                    font: { weight: 'bold', size: 13 },
                    formatter: (value) => `${Math.round(value)} T`
                }
            }]
        };
    }, [productionRaw]);

    // ============= CHART OPTIONS =============

    const salesBarOptions = getStackedBarOptions(formatCurrency, {
        plugins: { title: { display: false }, datalabels: { display: false } }
    });

    const salesTrendOptions = getLineChartOptions(formatCurrency, {
        plugins: { title: { display: false }, datalabels: { display: false } }
    });

    const cumulativeWeightOptions = getLineChartOptions(formatWeight, {
        plugins: { title: { display: false }, datalabels: { display: false } }
    });

    const top10Options = getHorizontalBarOptions(formatCurrency, {
        plugins: { title: { display: false }, datalabels: { display: false } }
    });

    const prodBarOptions = getStackedBarOptions(formatWeight, {
        plugins: { title: { display: false }, datalabels: { display: false } }
    });

    const prodTrendOptions = getLineChartOptions(formatWeight, {
        plugins: { title: { display: false }, datalabels: { display: false } }
    });

    const cumulativeProdOptions = getLineChartOptions(formatWeight, {
        plugins: { title: { display: false }, datalabels: { display: false } }
    });

    // ============= SALES KPI CALCULATIONS =============
    const salesKpis = useMemo(() => {
        if (!salesRaw || salesRaw.length === 0) return { totalValue: 0, totalWeight: 0, domesticValue: 0, exportValue: 0, daysCount: 0 };

        let totalValue = 0, totalWeight = 0, domesticValue = 0, exportValue = 0;
        const datesSet = new Set();

        salesRaw.forEach(row => {
            totalValue += row.Value || 0;
            totalWeight += (row.Weight || 0) / 1000;  // Convert Kg to T
            if (row.InvDate) datesSet.add(row.InvDate);
            const cat = (row.CategoryName || '').toLowerCase();
            if (cat.includes('export')) exportValue += row.Value || 0;
            else domesticValue += row.Value || 0;
        });

        return { totalValue, totalWeight, domesticValue, exportValue, daysCount: datesSet.size };
    }, [salesRaw]);

    // ============= PRODUCTION KPI CALCULATIONS =============
    const prodKpis = useMemo(() => {
        if (!productionRaw || productionRaw.length === 0) return { totalOk: 0, totalRej: 0, totalPoured: 0, daysCount: 0 };

        let totalOk = 0, totalRej = 0, totalPoured = 0;
        productionRaw.forEach(row => {
            totalOk += (row.OkWeight || 0) / 1000;      // Convert Kg to T
            totalRej += (row.RejWeight || 0) / 1000;
            totalPoured += (row.PouredWeight || 0) / 1000;
        });

        return { totalOk, totalRej, totalPoured, daysCount: productionRaw.length };
    }, [productionRaw]);

    // Chart card style
    const chartCardStyle = {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
    };

    // Render chart helper
    const renderChart = (data, isLoading, ChartComponent, options, emptyMsg = 'No data available') => (
        <div style={{ height: '500px' }}>
            {isLoading ? (
                <Skeleton height="100%" borderRadius="8px" />
            ) : data ? (
                <ChartComponent data={data} options={options} />
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#6B7280' }}>{emptyMsg}</div>
            )}
        </div>
    );

    return (
        <div className="dashboard-container">
            {/* Fullscreen Chart Modal */}
            {expandedChart && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
                    }}
                    onClick={() => setExpandedChart(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'white', borderRadius: '16px', padding: '2rem',
                            width: '90vw', height: '85vh', maxWidth: '1400px',
                            position: 'relative', display: 'flex', flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1F2937', margin: 0 }}>{expandedChart.title}</h2>
                            <button onClick={() => setExpandedChart(null)} style={{
                                background: '#EF4444', color: 'white', border: 'none', borderRadius: '8px',
                                padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem'
                            }}>✕ Close</button>
                        </div>
                        <div style={{ flex: 1, minHeight: 0 }}>{expandedChart.content}</div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h1>📊 Day-wise Dashboard</h1>
                    <p className="welcome-text">Day-wise Sales & Production Overview</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ExportButtons
                        chartRefs={[
                            { ref: daywiseExportChartRef, title: 'Day-wise Sales (Export) (Value)' },
                            { ref: daywiseDomesticChartRef, title: 'Day-wise Sales (Domestic) (Value)' },
                            { ref: salesTrendChartRef, title: 'Day-wise Sales (Trend)' },
                            { ref: cumulativeSalesWeightChartRef, title: 'Cumulative Sales (Weight)' },
                            { ref: cumulativeSalesValueChartRef, title: 'Cumulative Sales (Export & Domestic) (Value)' },
                            { ref: cumulativeTotalSalesValueChartRef, title: 'Cumulative Total Sales (Export & Domestic) (Value)' },
                            { ref: top10GroupsChartRef, title: 'Top 10 Groups (Value)' },
                            { ref: daywiseOkWeightChartRef, title: 'Day-wise OK Production Weight' },
                            { ref: daywiseRejWeightChartRef, title: 'Day-wise Inhouse Rejection' },
                            { ref: daywiseRejPercentChartRef, title: 'Day-wise Inhouse Rejection %' },
                            { ref: productionTrendChartRef, title: 'Day-wise Production (Trend)' },
                            { ref: cumulativeProductionChartRef, title: 'Cumulative OK Production Weight' },
                            { ref: cumulativeRejWeightChartRef, title: 'Cumulative Rejection Weight' }
                        ]}
                        fileName={`daily-dashboard-${format(new Date(), 'yyyy-MM-dd')}`}
                        title="Daily Dashboard Report"
                    />
                    <div className="refresh-indicator">
                        <span className="refresh-countdown">Auto-refresh in <strong>{countdown}s</strong></span>
                        <button className="refresh-btn" onClick={handleRefresh} title="Refresh Now">🔄</button>
                        <span className="last-refresh">Last: {format(lastRefresh, 'HH:mm:ss')}</span>
                    </div>
                </div>
            </div>

            {/* Date Filter Presets */}
            <div style={{
                display: 'flex', gap: '0.5rem', marginBottom: '1rem',
                flexWrap: 'wrap', alignItems: 'center'
            }}>
                {[
                    { key: 'thisMonth', label: 'This Month' }
                ].map(({ key, label }) => (
                    <button
                        key={key}
                        onClick={() => handlePresetChange(key)}
                        style={{
                            padding: '0.5rem 1rem',
                            border: activePreset === key ? '2px solid #3b82f6' : '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontWeight: activePreset === key ? '600' : '400',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            background: activePreset === key ? '#eff6ff' : 'white',
                            color: activePreset === key ? '#2563eb' : '#374151',
                            transition: 'all 0.2s'
                        }}
                    >{label}</button>
                ))}
            </div>

            {/* Tab Buttons */}
            <div style={{
                display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
                background: 'white', padding: '0.5rem', borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}>
                <button onClick={() => setActiveTab('sales')} style={{
                    padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px',
                    fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'sales' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : '#f3f4f6',
                    color: activeTab === 'sales' ? 'white' : '#374151',
                    boxShadow: activeTab === 'sales' ? '0 4px 12px rgba(59,130,246,0.3)' : 'none'
                }}>📈 Sales</button>
                <button onClick={() => setActiveTab('production')} style={{
                    padding: '0.75rem 1.5rem', border: 'none', borderRadius: '8px',
                    fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                    background: activeTab === 'production' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f3f4f6',
                    color: activeTab === 'production' ? 'white' : '#374151',
                    boxShadow: activeTab === 'production' ? '0 4px 12px rgba(16,185,129,0.3)' : 'none'
                }}>🏭 Production</button>
            </div>

            {/* ===== SALES TAB ===== */}
            {activeTab === 'sales' && (
                <>
                    {/* Sales KPI Cards */}
                    <div className="kpi-cards-grid" style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem', marginBottom: '1.5rem'
                    }}>
                        <div className="kpi-card">
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Sales Value</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                                {isSalesLoading ? '...' : formatCurrency(salesKpis.totalValue)}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Period Total</div>
                        </div>
                        <div className="kpi-card">
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Domestic Sales</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                                {isSalesLoading ? '...' : formatCurrency(salesKpis.domesticValue)}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>
                                {salesKpis.totalValue > 0 ? `${((salesKpis.domesticValue / salesKpis.totalValue) * 100).toFixed(1)}%` : '—'}
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Export Sales</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                                {isSalesLoading ? '...' : formatCurrency(salesKpis.exportValue)}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>
                                {salesKpis.totalValue > 0 ? `${((salesKpis.exportValue / salesKpis.totalValue) * 100).toFixed(1)}%` : '—'}
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Weight</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                                {isSalesLoading ? '...' : formatWeight(salesKpis.totalWeight)}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>{salesKpis.daysCount} days</div>
                        </div>
                    </div>

                    {/* Chart 1a: Day-wise Sales (Export) - Full Width */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={daywiseExportChartRef} style={chartCardStyle} onClick={() => daywiseExportData && setExpandedChart({
                            title: 'Day-wise Sales (Export) (Value)',
                            content: <Bar data={daywiseExportData} options={salesBarOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Day-wise Sales Value (Export)</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Day-wise Sales (Export) (Value)" filename="day-wise-sales-(export)-(value)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(daywiseExportData, isSalesLoading, Bar, salesBarOptions)}
                        </div>
                    </div>

                    {/* Chart 1b: Day-wise Sales (Domestic) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={daywiseDomesticChartRef} style={chartCardStyle} onClick={() => daywiseDomesticData && setExpandedChart({
                            title: 'Day-wise Sales (Domestic) (Value)',
                            content: <Bar data={daywiseDomesticData} options={salesBarOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Day-wise Sales Value (Domestic)</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Day-wise Sales (Domestic) (Value)" filename="day-wise-sales-(domestic)-(value)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(daywiseDomesticData, isSalesLoading, Bar, salesBarOptions)}
                        </div>
                    </div>

                    {/* Chart 2: Day-wise Sales Trend */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={salesTrendChartRef} style={chartCardStyle} onClick={() => salesTrendData && setExpandedChart({
                            title: 'Day-wise Sales (Trend)',
                            content: <Line data={salesTrendData} options={salesTrendOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Day-wise Sales (Trend)</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Day-wise Sales (Trend)" filename="day-wise-sales-(trend)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(salesTrendData, isSalesLoading, Line, salesTrendOptions)}
                        </div>
                    </div>

                    {/* Chart 3: Cumulative Sales Weight - Full Width */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={cumulativeSalesWeightChartRef} style={chartCardStyle} onClick={() => cumulativeSalesWeightData && setExpandedChart({
                            title: 'Cumulative Sales (Weight)',
                            content: <Line data={cumulativeSalesWeightData} options={cumulativeWeightOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Cumulative Sales Weight</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Cumulative Sales (Weight)" filename="cumulative-sales-(weight)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(cumulativeSalesWeightData, isSalesLoading, Line, cumulativeWeightOptions)}
                        </div>
                    </div>

                    {/* Chart 3b: Cumulative Sales (Export & Domestic)(Value) - Full Width */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={cumulativeSalesValueChartRef} style={chartCardStyle} onClick={() => cumulativeSalesValueData && setExpandedChart({
                            title: 'Cumulative Sales (Export & Domestic) (Value)',
                            content: <Line data={cumulativeSalesValueData} options={salesTrendOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Cumulative Sales Value (Export & Domestic)</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Cumulative Sales (Export  Domestic) (Value)" filename="cumulative-sales-(export--domestic)-(value)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(cumulativeSalesValueData, isSalesLoading, Line, salesTrendOptions)}
                        </div>
                    </div>

                    {/* Chart 3c: Cumulative Total Sales (Export & Domestic)(Value) - Full Width */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={cumulativeTotalSalesValueChartRef} style={chartCardStyle} onClick={() => cumulativeTotalSalesValueData && setExpandedChart({
                            title: 'Cumulative Total Sales (Export & Domestic) (Value)',
                            content: <Line data={cumulativeTotalSalesValueData} options={salesTrendOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Cumulative Total Sales Value (Export & Domestic)</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Cumulative Total Sales (Export  Domestic) (Value)" filename="cumulative-total-sales-(export--domestic)-(value)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(cumulativeTotalSalesValueData, isSalesLoading, Line, salesTrendOptions)}
                        </div>
                    </div>

                    {/* Chart 4: Top 10 Groups (Value) - Full Width */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={top10GroupsChartRef} style={chartCardStyle} onClick={() => top10GroupsData && setExpandedChart({
                            title: 'Top 10 Groups (Value)',
                            content: <Bar data={top10GroupsData} options={top10Options} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Top 10 Groups Value</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Top 10 Groups (Value)" filename="top-10-groups-(value)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(top10GroupsData, isSalesLoading, Bar, top10Options)}
                        </div>
                    </div>
                </>
            )}

            {/* ===== PRODUCTION TAB ===== */}
            {activeTab === 'production' && (
                <>
                    {/* Production KPI Cards */}
                    <div className="kpi-cards-grid" style={{
                        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '1rem', marginBottom: '1.5rem'
                    }}>
                        <div className="kpi-card">
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>OK Production Weight</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                                {isProdLoading ? '...' : formatWeight(prodKpis.totalOk)}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>Period Total</div>
                        </div>
                        <div className="kpi-card">
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Rejection Weight</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                                {isProdLoading ? '...' : formatWeight(prodKpis.totalRej)}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>
                                {prodKpis.totalPoured > 0 ? `${((prodKpis.totalRej / prodKpis.totalPoured) * 100).toFixed(1)}% rej` : '—'}
                            </div>
                        </div>
                        <div className="kpi-card">
                            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Production Weight</div>
                            <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                                {isProdLoading ? '...' : formatWeight(prodKpis.totalPoured)}
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', fontWeight: '500' }}>{prodKpis.daysCount} days</div>
                        </div>

                    </div>

                    {/* Chart 1a: Day-wise Production (OK Weight) - Full Width */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={daywiseOkWeightChartRef} style={chartCardStyle} onClick={() => daywiseOkWeightData && setExpandedChart({
                            title: 'Day-wise OK Production Weight',
                            content: <Bar data={daywiseOkWeightData} options={prodBarOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Day-wise OK Production Weight</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Day-wise OK Production Weight" filename="day-wise-ok-production-weight" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(daywiseOkWeightData, isProdLoading, Bar, prodBarOptions)}
                        </div>
                    </div>

                    {/* Chart 1b: Day-wise Production (Rejection Weight) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={daywiseRejWeightChartRef} style={chartCardStyle} onClick={() => daywiseRejWeightData && setExpandedChart({
                            title: 'Day-wise Production (Rejection Weight)',
                            content: <Bar data={daywiseRejWeightData} options={prodBarOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Day-wise Inhouse Rejection</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Day-wise Inhouse Rejection" filename="day-wise-inhouse-rejection" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(daywiseRejWeightData, isProdLoading, Bar, prodBarOptions)}
                        </div>
                    </div>

                    {/* Chart 1c: Day-wise Production %(Rejection Weight) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={daywiseRejPercentChartRef} style={chartCardStyle} onClick={() => daywiseRejPercentData && setExpandedChart({
                            title: 'Day-wise Inhouse Rejection %',
                            content: <Bar data={daywiseRejPercentData} options={prodBarOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Day-wise Inhouse Rejection %</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Day-wise Inhouse Rejection %" filename="day-wise-inhouse-rejection-(percentage)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(daywiseRejPercentData, isProdLoading, Bar, prodBarOptions)}
                        </div>
                    </div>

                    {/* Chart 2: Day-wise Production Trend */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={productionTrendChartRef} style={chartCardStyle} onClick={() => productionTrendData && setExpandedChart({
                            title: 'Day-wise Production (Trend)',
                            content: <Line data={productionTrendData} options={prodTrendOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Day-wise Production (Trend)</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Day-wise Production (Trend)" filename="day-wise-production-(trend)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(productionTrendData, isProdLoading, Line, prodTrendOptions)}
                        </div>
                    </div>

                    {/* Chart 3: Cumulative Production Weight */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={cumulativeProductionChartRef} style={chartCardStyle} onClick={() => cumulativeProductionData && setExpandedChart({
                            title: 'Cumulative OK Production Weight',
                            content: <Line data={cumulativeProductionData} options={cumulativeProdOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Cumulative OK Production Weight</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Cumulative OK Production Weight" filename="cumulative-production-(ok-weight)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(cumulativeProductionData, isProdLoading, Line, cumulativeProdOptions)}
                        </div>
                    </div>

                    {/* Chart 3b: Cumulative Production (Rejection Weight) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div ref={cumulativeRejWeightChartRef} style={chartCardStyle} onClick={() => cumulativeRejWeightData && setExpandedChart({
                            title: 'Cumulative Rejection Weight',
                            content: <Line data={cumulativeRejWeightData} options={cumulativeProdOptions} />
                        })}>
                            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Cumulative Rejection Weight</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ExportButton chartRef={null} title="Cumulative Rejection Weight" filename="cumulative-production-(rejection-weight)" />
                                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                                </div>
                            </div>
                            {renderChart(cumulativeRejWeightData, isProdLoading, Line, cumulativeProdOptions)}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DailyDashboard;
