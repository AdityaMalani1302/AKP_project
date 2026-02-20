import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import api from '../api';
import ExportButtons from './common/ExportButtons';
import {
    applyChartDefaults,
    CHART_COLORS,
    REJECTION_COLORS,
    getLineChartOptions,
    getBarChartOptions,
    getStackedBarOptions,
    getDoughnutOptions
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

// Apply global chart defaults
applyChartDefaults(ChartJS);

const REFRESH_INTERVAL = 120000; // 2 minutes

// Helpers
const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return new Intl.NumberFormat('en-IN').format(Math.round(value));
};

const formatWeight = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0 T';
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
        return `${(absValue / 1000).toFixed(2)} T`;
    }
    return `${absValue.toFixed(1)} T`;
};

const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
};

const RejectionDashboard = () => {
    const queryClient = useQueryClient();
    const [countdown, setCountdown] = useState(60);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Generate FY options
    const generateFYOptions = () => {
        const today = new Date();
        const currentFYStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
        return [{
            label: `FY ${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`,
            value: currentFYStart
        }];
    };

    const fyOptions = generateFYOptions();
    const [activePreset, setActivePreset] = useState('fy');
    const [selectedFY, setSelectedFY] = useState(fyOptions[0].value);

    // Fullscreen chart state
    const [expandedChart, setExpandedChart] = useState(null);

    // Chart refs for export
    const prodVsDispatchRef = useRef(null);
    const prodVsDispatchWtRef = useRef(null);
    const totalRejectionTrendRef = useRef(null);
    const inhouseVsSubRef = useRef(null);
    const rejectionSplitRef = useRef(null);
    const customerRejRef = useRef(null);
    const rejectionPctRef = useRef(null);
    const customerRejPctRef = useRef(null);
    const inhouseRejPctRef = useRef(null);
    const subcontractorRejPctRef = useRef(null);

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

    // Lock body scroll when modal open
    useEffect(() => {
        if (expandedChart) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
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
            queryClient.invalidateQueries({ queryKey: ['rejection-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['rejection-inhouse-all'] });
            queryClient.invalidateQueries({ queryKey: ['rejection-subcon-all'] });
            queryClient.invalidateQueries({ queryKey: ['rejection-custend-all'] });
            queryClient.invalidateQueries({ queryKey: ['rejection-typewise-all'] });
            setLastRefresh(new Date());
            setCountdown(60);
        }, REFRESH_INTERVAL);
        return () => clearInterval(refreshTimer);
    }, [queryClient]);

    // Manual refresh
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['rejection-dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['rejection-inhouse-all'] });
        queryClient.invalidateQueries({ queryKey: ['rejection-subcon-all'] });
        queryClient.invalidateQueries({ queryKey: ['rejection-custend-all'] });
        queryClient.invalidateQueries({ queryKey: ['rejection-typewise-top'] });
        queryClient.invalidateQueries({ queryKey: ['rejection-typewise-all'] });
        setLastRefresh(new Date());
        setCountdown(60);
    }, [queryClient]);

    // Handle preset change
    const handlePresetChange = (preset) => {
        setActivePreset(preset);
    };

    // Compute date range from active preset for Top 10 queries
    const dateRange = useMemo(() => {
        const now = new Date();
        let start, end;
        switch (activePreset) {
            case 'thisMonth':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'lastMonth': {
                const lm = subMonths(now, 1);
                start = startOfMonth(lm);
                end = endOfMonth(lm);
                break;
            }
            case 'last3Months':
                start = startOfMonth(subMonths(now, 2));
                end = endOfMonth(now);
                break;
            case 'last6Months':
                start = startOfMonth(subMonths(now, 5));
                end = endOfMonth(now);
                break;
            case 'fy':
            default: {
                const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
                start = new Date(fyStart, 3, 1); // April 1
                end = new Date(fyStart + 1, 2, 31); // March 31
                break;
            }
        }
        return {
            startDate: format(start, 'yyyy-MM-dd'),
            endDate: format(end, 'yyyy-MM-dd')
        };
    }, [activePreset, selectedFY]);

    // Fetch data
    const { data: dashboardData, isLoading, error } = useQuery({
        queryKey: ['rejection-dashboard'],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/data');
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch Top 10 Inhouse Rejection data
    const { data: inhouseTopData, isLoading: isLoadingInhouse } = useQuery({
        queryKey: ['rejection-inhouse-top', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/inhouse-top', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch Top 10 Subcontractor Rejection data
    const { data: subconTopData, isLoading: isLoadingSubcon } = useQuery({
        queryKey: ['rejection-subcon-top', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/subcon-top', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch Top 10 Customer Rejection data
    const { data: custendTopData, isLoading: isLoadingCustend } = useQuery({
        queryKey: ['rejection-custend-top', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/custend-top', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch ALL parts for Pareto charts (no TOP 10 limit)
    const { data: inhouseAllData } = useQuery({
        queryKey: ['rejection-inhouse-all', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/inhouse-top', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate, all: 'true' }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    const { data: subconAllData } = useQuery({
        queryKey: ['rejection-subcon-all', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/subcon-top', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate, all: 'true' }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    const { data: custendAllData } = useQuery({
        queryKey: ['rejection-custend-all', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/custend-top', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate, all: 'true' }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch ALL type-wise rejection data (used for both Top 10 lists and Pareto charts)
    const { data: typewiseAllData, isLoading: isLoadingTypewise } = useQuery({
        queryKey: ['rejection-typewise-all', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/typewise', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate, all: 'true' }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    useEffect(() => {
        if (error) {
            console.error('Rejection Dashboard Error:', error);
            toast.error('Failed to load dashboard data: ' + (error.response?.data?.error || error.message));
        }
    }, [error]);

    // Month order for sorting
    const monthOrder = {
        'january': 1, 'february': 2, 'march': 3, 'april': 4,
        'may': 5, 'june': 6, 'july': 7, 'august': 8,
        'september': 9, 'october': 10, 'november': 11, 'december': 12
    };

    // Filter data based on preset
    const filteredData = useMemo(() => {
        if (!dashboardData) return [];

        const now = new Date();
        const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];

        const getMonthName = (date) => monthNames[date.getMonth()];

        switch (activePreset) {
            case 'thisMonth':
                return dashboardData.filter(d => (d.Months || '').toLowerCase() === getMonthName(now));
            case 'lastMonth': {
                const lastMonthDate = subMonths(now, 1);
                return dashboardData.filter(d => (d.Months || '').toLowerCase() === getMonthName(lastMonthDate));
            }
            case 'last3Months': {
                const targetMonths = [];
                // Last 3 months usually means current + previous 2? Or just previous 3? 
                // "Last 3 Months" typically implies inclusive of current or just recent 3. 
                // Let's assume inclusive of current month for now based on standard dashboard behaviors, or strictly past 3.
                // Replicating typical "Last N Months" behavior: usually T, T-1, T-2.
                for (let i = 0; i < 3; i++) {
                    targetMonths.push(getMonthName(subMonths(now, i)));
                }
                return dashboardData.filter(d => targetMonths.includes((d.Months || '').toLowerCase()));
            }
            case 'last6Months': {
                const targetMonths = [];
                for (let i = 0; i < 6; i++) {
                    targetMonths.push(getMonthName(subMonths(now, i)));
                }
                return dashboardData.filter(d => targetMonths.includes((d.Months || '').toLowerCase()));
            }
            case 'fy':
            default:
                return dashboardData;
        }
    }, [dashboardData, activePreset]);

    const sortedData = useMemo(() => {
        if (!Array.isArray(filteredData)) return [];
        return [...filteredData].sort((a, b) => {
            const mA = monthOrder[(a.Months || '').toLowerCase()] || 0;
            const mB = monthOrder[(b.Months || '').toLowerCase()] || 0;
            const valA = mA < 4 ? mA + 12 : mA;
            const valB = mB < 4 ? mB + 12 : mB;
            return valA - valB;
        });
    }, [filteredData]);

    const months = sortedData.map(d => d.Months);

    // KPI Calculations
    const kpis = useMemo(() => {
        if (!sortedData || sortedData.length === 0) return {};
        const totalProdQty = sortedData.reduce((acc, curr) => acc + (curr.ProductionQty || 0), 0);
        const totalProdWt = sortedData.reduce((acc, curr) => acc + (curr.ProductionWeight || 0), 0);
        const totalDispatchQty = sortedData.reduce((acc, curr) => acc + (curr.DespatchQty || 0), 0);
        const totalDispatchWt = sortedData.reduce((acc, curr) => acc + (curr.DespatchWeight || 0), 0);
        const totalRejectionQty = sortedData.reduce((acc, curr) => acc + (curr.TotalRejQty || 0), 0);
        const totalRejectionWt = sortedData.reduce((acc, curr) => acc + (curr.TotalWeight || 0), 0);
        const totalSubconOutWt = sortedData.reduce((acc, curr) => acc + (curr.SubconOutweight || 0), 0);


        const inhouseRejOnly = sortedData.reduce((acc, curr) => acc + (curr.ProductionRejQty || 0), 0);
        const inhouseRejWt = sortedData.reduce((acc, curr) => acc + (curr.InhouseRejWt || 0), 0);
        const subRejOnly = sortedData.reduce((acc, curr) => acc + (curr.SubConRejQty || 0), 0);
        const subRejWt = sortedData.reduce((acc, curr) => acc + (curr.SubconRejWt || 0), 0);
        const custRejOnly = sortedData.reduce((acc, curr) => acc + (curr.CustEndRejQty || 0), 0);
        const custRejWt = sortedData.reduce((acc, curr) => acc + (curr.CustEndRejWt || 0), 0);

        const inhousePct = totalProdWt > 0 ? (inhouseRejWt / totalProdWt) * 100 : 0;
        const subPct = totalSubconOutWt > 0 ? (subRejWt / totalSubconOutWt) * 100 : 0;
        const custPct = totalDispatchWt > 0 ? (custRejWt / totalDispatchWt) * 100 : 0;

        const rejectionPct = inhousePct + subPct + custPct;

        return {
            totalProdQty,
            totalProdWt,
            totalDispatchQty,
            totalDispatchWt,
            totalRejectionQty,
            totalRejectionWt,
            rejectionPct,
            inhouseRejOnly,
            inhouseRejWt,
            subRejOnly,
            subRejWt,
            custRejOnly,
            custRejWt,
            inhousePct,
            subPct,
            custPct,
            totalSubconOutWt
        };
        return {
            totalProdQty,
            totalProdWt,
            totalDispatchQty,
            totalDispatchWt,
            totalRejectionQty,
            totalRejectionWt,
            rejectionPct,
            inhouseRejOnly,
            inhouseRejWt,
            subRejOnly,
            subRejWt,
            custRejOnly,
            custRejWt,
            inhousePct,
            subPct,
            custPct
        };
    }, [sortedData]);

    // Chart Data Configs

    // 1. Production vs Dispatch (Trend) - Weight
    const prodVsDispatchData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Production Weight',
                data: sortedData.map(d => d.ProductionWeight),
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            },
            {
                label: 'Dispatch Weight',
                data: sortedData.map(d => d.DespatchWeight),
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }
        ]
    }), [months, sortedData]);

    // 2. Production Weight vs Dispatch Weight
    const prodVsDispatchWtData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Dispatch Qty',
                data: sortedData.map(d => d.DespatchQty),
                backgroundColor: REJECTION_COLORS.success.medium,
                borderColor: REJECTION_COLORS.success.solid,
                borderWidth: 1,
                borderRadius: 4
            },
            {
                label: 'Production Qty',
                data: sortedData.map(d => d.ProductionQty),
                backgroundColor: REJECTION_COLORS.primary.medium,
                borderColor: REJECTION_COLORS.primary.solid,
                borderWidth: 1,
                borderRadius: 4
            }
        ]
    }), [months, sortedData]);

    // 3. Total Rejection Trend (Percentage)
    const totalRejData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Total Rejection %',
                data: sortedData.map(d => {
                    const i = d.ProductionWeight > 0 ? (d.InhouseRejWt / d.ProductionWeight) * 100 : 0;
                    const s = d.SubconOutweight > 0 ? (d.SubconRejWt / d.SubconOutweight) * 100 : 0;
                    const c = d.DespatchWeight > 0 ? (d.CustEndRejWt / d.DespatchWeight) * 100 : 0;
                    return i + s + c;
                }),
                backgroundColor: 'rgba(239, 68, 68, 0.85)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
                borderRadius: 4
            }
        ]
    }), [months, sortedData]);

    // 4. Inhouse vs Subcontractor vs Customer Rejection (Weight)
    const inhouseVsSubData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Inhouse Rejection (Wt)',
                data: sortedData.map(d => d.InhouseRejWt),
                backgroundColor: 'rgba(134, 239, 172, 0.75)',
                borderRadius: 4
            },
            {
                label: 'Subcontractor Rejection (Wt)',
                data: sortedData.map(d => d.SubconRejWt),
                backgroundColor: 'rgba(147, 197, 253, 0.75)',
                borderRadius: 4
            },
            {
                label: 'Customer Rejection (Wt)',
                data: sortedData.map(d => d.CustEndRejWt),
                backgroundColor: 'rgba(216, 180, 254, 0.75)',
                borderRadius: 4
            }
        ]
    }), [months, sortedData]);

    // 5. Rejection Contribution Split - Uses actual rejection percentages
    const rejectionSplitData = useMemo(() => {
        // Calculate the actual rejection percentages (same logic as kpis)
        const totalProdWt = sortedData.reduce((acc, curr) => acc + (curr.ProductionWeight || 0), 0);
        const totalSubconOutWt = sortedData.reduce((acc, curr) => acc + (curr.SubconOutweight || 0), 0);
        const totalDispatchWt = sortedData.reduce((acc, curr) => acc + (curr.DespatchWeight || 0), 0);
        const inhouseRejWt = sortedData.reduce((acc, curr) => acc + (curr.InhouseRejWt || 0), 0);
        const subRejWt = sortedData.reduce((acc, curr) => acc + (curr.SubconRejWt || 0), 0);
        const custRejWt = sortedData.reduce((acc, curr) => acc + (curr.CustEndRejWt || 0), 0);

        const inhousePct = totalProdWt > 0 ? (inhouseRejWt / totalProdWt) * 100 : 0;
        const subPct = totalSubconOutWt > 0 ? (subRejWt / totalSubconOutWt) * 100 : 0;
        const custPct = totalDispatchWt > 0 ? (custRejWt / totalDispatchWt) * 100 : 0;

        return {
            labels: ['Inhouse', 'Subcontractor', 'Customer'],
            datasets: [{
                data: [inhousePct, subPct, custPct],
                backgroundColor: [REJECTION_COLORS.primary.medium, REJECTION_COLORS.success.medium, REJECTION_COLORS.warning.medium],
                borderWidth: 2,
                borderColor: '#ffffff'
            }],
            total: inhousePct + subPct + custPct
        };
    }, [sortedData]);

    // 6. Customer Rejection Trend
    const custRejData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Customer Rejection Weight',
                data: sortedData.map(d => d.CustEndRejWt),
                borderColor: 'rgba(139, 92, 246, 1)',
                backgroundColor: 'rgba(139, 92, 246, 0.15)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }
        ]
    }), [months, sortedData]);

    // 7. Inhouse Rejection Trend (Weight)
    const inhouseRejTrendWtData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Inhouse Rejection Weight',
                data: sortedData.map(d => d.InhouseRejWt),
                borderColor: 'rgba(239, 68, 68, 1)', // Red
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }
        ]
    }), [months, sortedData]);

    // 8. Subcontractor Rejection Trend (Weight)
    const subRejTrendWtData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Subcontractor Rejection Weight',
                data: sortedData.map(d => d.SubconRejWt),
                borderColor: 'rgba(249, 115, 22, 1)', // Orange
                backgroundColor: 'rgba(249, 115, 22, 0.15)',
                tension: 0.4,
                fill: true,
                borderWidth: 3
            }
        ]
    }), [months, sortedData]);

    // 9. Rejection Split by Type (Percentage)
    const rejectionSplitPctData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Inhouse Rej %',
                data: sortedData.map(d => d.ProductionWeight > 0 ? (d.InhouseRejWt / d.ProductionWeight) * 100 : 0),
                backgroundColor: 'rgba(134, 239, 172, 0.75)',
                borderRadius: 4
            },
            {
                label: 'Subcontractor Rej %',
                data: sortedData.map(d => d.SubconOutweight > 0 ? (d.SubconRejWt / d.SubconOutweight) * 100 : 0),
                backgroundColor: 'rgba(147, 197, 253, 0.75)',
                borderRadius: 4
            },
            {
                label: 'Customer Rej %',
                data: sortedData.map(d => d.DespatchWeight > 0 ? (d.CustEndRejWt / d.DespatchWeight) * 100 : 0),
                backgroundColor: 'rgba(216, 180, 254, 0.75)',
                borderRadius: 4
            }
        ]
    }), [months, sortedData]);

    // 7. Rejection Percentage by Month
    const rejectionPctData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Customer Rejection %',
                data: sortedData.map(d => d.DespatchWeight > 0 ? (d.CustEndRejWt / d.DespatchWeight) * 100 : 0),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#3B82F6',
                borderWidth: 1
            },
            {
                label: 'Inhouse Rej %',
                data: sortedData.map(d => d.ProductionWeight > 0 ? (d.InhouseRejWt / d.ProductionWeight) * 100 : 0),
                backgroundColor: 'rgba(20, 184, 166, 0.8)',
                borderColor: '#14B8A6',
                borderWidth: 1
            },
            {
                label: 'Subcontractor Rej %',
                data: sortedData.map(d => d.SubconOutweight > 0 ? (d.SubconRejWt / d.SubconOutweight) * 100 : 0),
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                borderColor: '#F59E0B',
                borderWidth: 1
            }
        ]
    }), [months, sortedData]);

    // 10. Customer Rejection Trend (Percentage) - Line Chart
    const customerRejPctData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Customer Rejection %',
                data: sortedData.map(d => d.DespatchWeight > 0 ? (d.CustEndRejWt / d.DespatchWeight) * 100 : 0),
                borderColor: 'rgba(168, 85, 247, 1)',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7
            }
        ]
    }), [months, sortedData]);

    // 11. Inhouse Rejection Trend (Percentage) - Line Chart
    const inhouseRejPctData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Inhouse Rejection %',
                data: sortedData.map(d => d.ProductionWeight > 0 ? (d.InhouseRejWt / d.ProductionWeight) * 100 : 0),
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7
            }
        ]
    }), [months, sortedData]);

    // 12. Subcontractor Rejection Trend (Percentage) - Line Chart
    const subcontractorRejPctData = useMemo(() => ({
        labels: months,
        datasets: [
            {
                label: 'Subcontractor Rejection %',
                data: sortedData.map(d => d.SubconOutweight > 0 ? (d.SubconRejWt / d.SubconOutweight) * 100 : 0),
                borderColor: 'rgba(14, 165, 233, 1)',
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7
            }
        ]
    }), [months, sortedData]);

    // =============== PARETO CHART DATA ===============

    // Helper: build Pareto data from top rejection items
    const buildParetoData = (items, weightField, labelField = 'InternalPartNo') => {
        if (!items || items.length === 0) return { labels: [], weights: [], percents: [], cumPercents: [] };

        // Sort by weight descending
        const sorted = [...items].sort((a, b) => (b[weightField] || 0) - (a[weightField] || 0));
        const totalWeight = sorted.reduce((sum, item) => sum + (item[weightField] || 0), 0);

        // Take top 10 items only
        const top10 = sorted.slice(0, 10);

        let cumSum = 0;
        const labels = [];
        const weights = [];
        const percents = [];
        const cumPercents = [];

        top10.forEach(item => {
            const wt = item[weightField] || 0;
            const pct = totalWeight > 0 ? (wt / totalWeight) * 100 : 0;
            cumSum += pct;
            labels.push(item[labelField] || '-');
            weights.push(Number((wt / 1000).toFixed(2))); // in tonnes
            percents.push(Number(pct.toFixed(1)));
            cumPercents.push(Number(cumSum.toFixed(1)));
        });

        return { labels, weights, percents, cumPercents };
    };

    // Pareto - Inhouse Rejection
    const inhouseParetoData = useMemo(() => {
        const pareto = buildParetoData(inhouseAllData, 'inhouseRejWt');
        return {
            labels: pareto.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Rejection Weight (T)',
                    data: pareto.weights,
                    backgroundColor: 'rgba(107, 114, 128, 0.65)',
                    borderColor: 'rgba(107, 114, 128, 0.8)',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Cumulative %',
                    data: pareto.cumPercents,
                    borderColor: '#1F2937',
                    backgroundColor: '#1F2937',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#1F2937',
                    tension: 0.3,
                    yAxisID: 'y1',
                    order: 1
                }
            ],
            _paretoMeta: { weights: pareto.weights, percents: pareto.percents, cumPercents: pareto.cumPercents }
        };
    }, [inhouseAllData]);

    // Pareto - Subcontractor Rejection
    const subconParetoData = useMemo(() => {
        const pareto = buildParetoData(subconAllData, 'SubRejweight');
        return {
            labels: pareto.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Rejection Weight (T)',
                    data: pareto.weights,
                    backgroundColor: 'rgba(107, 114, 128, 0.65)',
                    borderColor: 'rgba(107, 114, 128, 0.8)',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Cumulative %',
                    data: pareto.cumPercents,
                    borderColor: '#1F2937',
                    backgroundColor: '#1F2937',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#1F2937',
                    tension: 0.3,
                    yAxisID: 'y1',
                    order: 1
                }
            ],
            _paretoMeta: { weights: pareto.weights, percents: pareto.percents, cumPercents: pareto.cumPercents }
        };
    }, [subconAllData]);

    // Pareto - Customer Rejection
    const custendParetoData = useMemo(() => {
        const pareto = buildParetoData(custendAllData, 'CustRejWt');
        return {
            labels: pareto.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Rejection Weight (T)',
                    data: pareto.weights,
                    backgroundColor: 'rgba(107, 114, 128, 0.65)',
                    borderColor: 'rgba(107, 114, 128, 0.8)',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Cumulative %',
                    data: pareto.cumPercents,
                    borderColor: '#1F2937',
                    backgroundColor: '#1F2937',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#1F2937',
                    tension: 0.3,
                    yAxisID: 'y1',
                    order: 1
                }
            ],
            _paretoMeta: { weights: pareto.weights, percents: pareto.percents, cumPercents: pareto.cumPercents }
        };
    }, [custendAllData]);

    // =============== TYPE-WISE PARETO CHART DATA ===============

    // Pareto - Inhouse Rejection (Type)
    const inhouseTypeParetoData = useMemo(() => {
        const pareto = buildParetoData(
            (typewiseAllData || []).filter(item => (item.InhRejtypeWt || 0) > 0),
            'InhRejtypeWt',
            'description'
        );
        return {
            labels: pareto.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Rejection Weight (T)',
                    data: pareto.weights,
                    backgroundColor: 'rgba(107, 114, 128, 0.65)',
                    borderColor: 'rgba(107, 114, 128, 0.8)',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Cumulative %',
                    data: pareto.cumPercents,
                    borderColor: '#1F2937',
                    backgroundColor: '#1F2937',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#1F2937',
                    tension: 0.3,
                    yAxisID: 'y1',
                    order: 1
                }
            ],
            _paretoMeta: { weights: pareto.weights, percents: pareto.percents, cumPercents: pareto.cumPercents }
        };
    }, [typewiseAllData]);

    // Pareto - Subcontractor Rejection (Type)
    const subconTypeParetoData = useMemo(() => {
        const pareto = buildParetoData(
            (typewiseAllData || []).filter(item => (item.SubRejtypeWt || 0) > 0),
            'SubRejtypeWt',
            'description'
        );
        return {
            labels: pareto.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Rejection Weight (T)',
                    data: pareto.weights,
                    backgroundColor: 'rgba(107, 114, 128, 0.65)',
                    borderColor: 'rgba(107, 114, 128, 0.8)',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Cumulative %',
                    data: pareto.cumPercents,
                    borderColor: '#1F2937',
                    backgroundColor: '#1F2937',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#1F2937',
                    tension: 0.3,
                    yAxisID: 'y1',
                    order: 1
                }
            ],
            _paretoMeta: { weights: pareto.weights, percents: pareto.percents, cumPercents: pareto.cumPercents }
        };
    }, [typewiseAllData]);

    // Pareto - Customer Rejection (Type)
    const custendTypeParetoData = useMemo(() => {
        const pareto = buildParetoData(
            (typewiseAllData || []).filter(item => (item.CustRejtypeWt || 0) > 0),
            'CustRejtypeWt',
            'description'
        );
        return {
            labels: pareto.labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Rejection Weight (T)',
                    data: pareto.weights,
                    backgroundColor: 'rgba(107, 114, 128, 0.65)',
                    borderColor: 'rgba(107, 114, 128, 0.8)',
                    borderWidth: 1,
                    borderRadius: 2,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Cumulative %',
                    data: pareto.cumPercents,
                    borderColor: '#1F2937',
                    backgroundColor: '#1F2937',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#1F2937',
                    tension: 0.3,
                    yAxisID: 'y1',
                    order: 1
                }
            ],
            _paretoMeta: { weights: pareto.weights, percents: pareto.percents, cumPercents: pareto.cumPercents }
        };
    }, [typewiseAllData]);

    // ParetoDataTable variant for type-wise (uses 'Type' label instead of 'Part')
    const ParetoTypeDataTable = ({ data }) => {
        if (!data?._paretoMeta) return null;
        const { weights, percents, cumPercents } = data._paretoMeta;
        const labels = data.labels || [];
        return (
            <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'center' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'left', color: '#374151', whiteSpace: 'nowrap' }}>Type</td>
                            {labels.map((l, i) => (
                                <td key={i} style={{ padding: '4px 6px', color: '#1F2937', fontWeight: '500', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l}</td>
                            ))}
                        </tr>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                            <td style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'left', color: '#374151' }}>Wt (T)</td>
                            {weights.map((w, i) => (
                                <td key={i} style={{ padding: '4px 6px', color: '#1F2937' }}>{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(w)}</td>
                            ))}
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'left', color: '#374151' }}>Percent</td>
                            {percents.map((p, i) => (
                                <td key={i} style={{ padding: '4px 6px', color: '#1F2937' }}>{p}</td>
                            ))}
                        </tr>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                            <td style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'left', color: '#374151' }}>Cum %</td>
                            {cumPercents.map((c, i) => (
                                <td key={i} style={{ padding: '4px 6px', color: '#1F2937', fontWeight: '600' }}>{c}</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    // Pareto chart options (dual Y-axis)
    const getParetoOptions = (title) => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: title,
                font: { size: 16, weight: '700' },
                color: '#1F2937',
                padding: { bottom: 20 }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => {
                        if (context.dataset.type === 'line') {
                            return `Cum %: ${context.raw}%`;
                        }
                        return `Weight: ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(context.raw)} T`;
                    }
                }
            },
            datalabels: { display: false }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    maxRotation: 45,
                    minRotation: 30,
                    font: { size: 10 },
                    color: '#374151'
                }
            },
            y: {
                type: 'linear',
                position: 'left',
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Rejection in Tonnes',
                    font: { size: 12, weight: '600' },
                    color: '#374151'
                },
                grid: {
                    color: 'rgba(0,0,0,0.06)',
                    drawBorder: false
                },
                ticks: {
                    color: '#374151',
                    callback: (value) => new Intl.NumberFormat('en-IN').format(value)
                }
            },
            y1: {
                type: 'linear',
                position: 'right',
                min: 0,
                max: 100,
                title: {
                    display: true,
                    text: 'Percent',
                    font: { size: 12, weight: '600' },
                    color: '#374151'
                },
                grid: { drawOnChartArea: false },
                ticks: {
                    color: '#374151',
                    callback: (value) => `${value}`
                }
            }
        }
    });

    // Pareto data table component
    const ParetoDataTable = ({ data }) => {
        if (!data?._paretoMeta) return null;
        const { weights, percents, cumPercents } = data._paretoMeta;
        const labels = data.labels || [];
        return (
            <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'center' }}>
                    <tbody>
                        <tr>
                            <td style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'left', color: '#374151', whiteSpace: 'nowrap' }}>Part</td>
                            {labels.map((l, i) => (
                                <td key={i} style={{ padding: '4px 6px', color: '#1F2937', fontWeight: '500', maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l}</td>
                            ))}
                        </tr>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                            <td style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'left', color: '#374151' }}>Wt (T)</td>
                            {weights.map((w, i) => (
                                <td key={i} style={{ padding: '4px 6px', color: '#1F2937' }}>{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(w)}</td>
                            ))}
                        </tr>
                        <tr>
                            <td style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'left', color: '#374151' }}>Percent</td>
                            {percents.map((p, i) => (
                                <td key={i} style={{ padding: '4px 6px', color: '#1F2937' }}>{p}</td>
                            ))}
                        </tr>
                        <tr style={{ backgroundColor: '#F9FAFB' }}>
                            <td style={{ padding: '4px 8px', fontWeight: '700', textAlign: 'left', color: '#374151' }}>Cum %</td>
                            {cumPercents.map((c, i) => (
                                <td key={i} style={{ padding: '4px 6px', color: '#1F2937', fontWeight: '600' }}>{c}</td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    // Preset button style - matches ProductionDashboard
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

    // Chart card style - matches ProductionDashboard
    const chartCardStyle = {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
    };

    // Custom chart options with data labels enabled
    // For multi-line charts, alternate label positions to avoid collision
    const lineChartWithLabels = {
        ...getLineChartOptions('Weight'),
        plugins: {
            ...getLineChartOptions('Weight').plugins,
            datalabels: {
                display: true,
                backgroundColor: (context) => context.datasetIndex === 0 ? 'rgba(37, 99, 235, 0.9)' : 'rgba(5, 150, 105, 0.9)',
                borderRadius: 4,
                color: 'white',
                font: { size: 12, weight: 'bold' },
                padding: 4,
                anchor: (context) => context.datasetIndex === 0 ? 'end' : 'start',
                align: (context) => context.datasetIndex === 0 ? 'top' : 'bottom',
                offset: 6,
                formatter: (value) => formatWeight(value)
            }
        }
    };

    const barChartWithLabels = {
        ...getBarChartOptions('%'),
        plugins: {
            ...getBarChartOptions('%').plugins,
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                offset: 4,
                color: '#374151',
                font: { size: 14, weight: '600' },
                formatter: (value) => formatPercent(value)
            }
        }
    };

    const stackedBarWithLabels = {
        ...getStackedBarOptions('Weight'),
        plugins: {
            ...getStackedBarOptions('Weight').plugins,
            datalabels: {
                display: true,
                anchor: 'center',
                align: 'center',
                color: '#000000',
                font: { size: 11, weight: '600' },
                formatter: (value) => value > 0 ? formatWeight(value) : ''
            }
        }
    };

    const percentBarChartWithLabels = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: { size: 12 }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatPercent(context.raw)}`
                }
            },
            datalabels: {
                display: true,
                color: '#000000',
                anchor: 'end',
                align: 'top',
                offset: 4,
                font: { size: 11, weight: '600' },
                formatter: (value) => value > 0 ? formatPercent(value) : ''
            }
        },
        scales: {
            x: {
                offset: true,
                grid: { display: false }
            },
            y: {
                stacked: false,
                beginAtZero: true,
                ticks: {
                    callback: (value) => `${value}%`
                },
                grid: {
                    color: 'rgba(0,0,0,0.05)'
                }
            }
        },
        layout: {
            padding: {
                top: 20,
                bottom: 10
            }
        }
    };

    const customerLineChartWithLabels = {
        ...getLineChartOptions('Weight'),
        plugins: {
            ...getLineChartOptions('Weight').plugins,
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                offset: 4,
                color: '#000000',
                font: { size: 12, weight: '600' },
                formatter: (value) => formatWeight(value)
            }
        }
    };

    const inhouseLineChartWithLabels = {
        ...getLineChartOptions('Weight'),
        plugins: {
            ...getLineChartOptions('Weight').plugins,
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                offset: 4,
                color: '#000000',
                font: { size: 12, weight: '600' },
                formatter: (value) => formatWeight(value)
            }
        }
    };

    const subLineChartWithLabels = {
        ...getLineChartOptions('Weight'),
        plugins: {
            ...getLineChartOptions('Weight').plugins,
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                offset: 4,
                color: '#000000',
                font: { size: 12, weight: '600' },
                formatter: (value) => formatWeight(value)
            }
        }
    };

    const weightBarChartWithLabels = {
        ...getBarChartOptions('Weight'),
        plugins: {
            ...getBarChartOptions('Weight').plugins,
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                offset: 4,
                color: '#374151',
                font: { size: 12, weight: '600' },
                formatter: (value) => formatWeight(value)
            }
        }
    };

    const stackedBarPercentWithLabels = {
        ...getStackedBarOptions('%'),
        plugins: {
            ...getStackedBarOptions('%').plugins,
            datalabels: {
                display: true,
                anchor: 'center',
                align: 'center',
                color: '#000000',
                font: { size: 11, weight: '600' },
                formatter: (value) => value > 0 ? formatPercent(value) : ''
            }
        }
    };

    // Single percentage line chart options for individual trend charts
    const singlePctLineChartOptions = {
        ...getLineChartOptions('%'),
        plugins: {
            ...getLineChartOptions('%').plugins,
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'top',
                offset: 6,
                color: '#374151',
                font: { size: 12, weight: '600' },
                formatter: (value) => formatPercent(value)
            }
        }
    };

    return (
        <div className="dashboard-container">
            {/* Fullscreen Chart Modal - matches ProductionDashboard pattern */}
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
                    <h1>⚠️ Rejection Dashboard</h1>
                    <p className="welcome-text">Quality & Rejection Analysis</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ExportButtons
                        chartRefs={[
                            { ref: prodVsDispatchRef, title: 'Production vs Dispatch' },
                            { ref: totalRejectionTrendRef, title: 'Total Rejection Trend' },
                            { ref: rejectionSplitRef, title: 'Rejection Split' }
                        ]}
                        fileName={`rejection-dashboard-${format(new Date(), 'yyyy-MM-dd')}`}
                        title="Rejection Dashboard Report"
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
                <button onClick={() => handlePresetChange('fy')} style={getPresetStyle('fy')}>
                    {fyOptions[0]?.label || 'FY 2025-26'}
                </button>
            </div>

            {/* All KPI Cards at Top */}
            <div className="kpi-cards-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Production Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.totalProdWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Dispatch Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.totalDispatchWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Subcon OutWeight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.totalSubconOutWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Rejection Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.totalRejectionWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Overall Rejection %</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(kpis.rejectionPct)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Inhouse Rejection Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.inhouseRejWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Subcontractor Rej Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.subRejWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Customer Rej Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.custRejWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Inhouse Rej %</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(kpis.inhousePct)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Subcontractor Rej %</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(kpis.subPct)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Customer Rej %</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(kpis.custPct)}
                    </div>
                </div>
            </div>

            {/* Production vs Dispatch Trend */}
            <div
                ref={prodVsDispatchRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📈 Production vs Dispatch (Weight)',
                    content: <Line data={prodVsDispatchData} options={lineChartWithLabels} />
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Production vs Dispatch (Weight)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Line data={prodVsDispatchData} options={lineChartWithLabels} />
                    )}
                </div>
            </div>

            {/* Rejection Percentage Breakdown */}
            <div
                ref={rejectionPctRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📈 Rejection Percentage Breakdown (%)',
                    content: <Bar data={rejectionPctData} options={percentBarChartWithLabels} />
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Rejection Percentage Breakdown (%)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Bar data={rejectionPctData} options={percentBarChartWithLabels} />
                    )}
                </div>
            </div>

            {/* Total Rejection Trend */}
            <div
                ref={totalRejectionTrendRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📊 Total Rejection Trend (%)',
                    content: <Bar data={totalRejData} options={barChartWithLabels} />
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Total Rejection Trend (%)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Bar data={totalRejData} options={barChartWithLabels} />
                    )}
                </div>
            </div>

            {/* Individual Rejection Trend Charts - 2 Column Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Customer Rejection Trend (Percentage) */}
                <div
                    ref={customerRejPctRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📊 Customer Rejection Trend (%)',
                        content: <Line data={customerRejPctData} options={singlePctLineChartOptions} />
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Customer Rejection Trend (%)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : (
                            <Line data={customerRejPctData} options={singlePctLineChartOptions} />
                        )}
                    </div>
                </div>

                {/* Inhouse Rejection Trend (Percentage) */}
                <div
                    ref={inhouseRejPctRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📊 Inhouse Rejection Trend (%)',
                        content: <Line data={inhouseRejPctData} options={singlePctLineChartOptions} />
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Inhouse Rejection Trend (%)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : (
                            <Line data={inhouseRejPctData} options={singlePctLineChartOptions} />
                        )}
                    </div>
                </div>

                {/* Subcontractor Rejection Trend (Percentage) */}
                <div
                    ref={subcontractorRejPctRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📊 Subcontractor Rejection Trend (%)',
                        content: <Line data={subcontractorRejPctData} options={singlePctLineChartOptions} />
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Subcontractor Rejection Trend (%)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : (
                            <Line data={subcontractorRejPctData} options={singlePctLineChartOptions} />
                        )}
                    </div>
                </div>




                {/* Inhouse vs Subcontractor vs Customer Rejection */}
                <div
                    ref={inhouseVsSubRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📊 Customer vs Inhouse vs Subcontractor Rejection(Weight)',
                        content: <Bar data={inhouseVsSubData} options={stackedBarWithLabels} />
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Customer vs Inhouse vs Subcontractor Rejection(Weight)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : (
                            <Bar data={inhouseVsSubData} options={stackedBarWithLabels} />
                        )}
                    </div>
                </div>

                {/* Rejection Split Pie */}
                <div
                    ref={rejectionSplitRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '🥧 Rejection Contribution Split',
                        content: <Pie data={rejectionSplitData} options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'bottom' },
                                tooltip: {
                                    callbacks: {
                                        label: (context) => {
                                            return `${context.label}: ${context.raw.toFixed(2)}%`;
                                        }
                                    }
                                },
                                datalabels: {
                                    display: true,
                                    color: '#000',
                                    font: { weight: 'bold', size: 14 },
                                    formatter: (value) => {
                                        return `${value.toFixed(1)}%`;
                                    }
                                }
                            }
                        }} plugins={[ChartDataLabels]} />
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🥧 Rejection Contribution Split</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : (
                            <Pie data={rejectionSplitData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom' },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => {
                                                return `${context.label}: ${context.raw.toFixed(2)}%`;
                                            }
                                        }
                                    },
                                    datalabels: {
                                        display: true,
                                        color: '#000',
                                        font: { weight: 'bold', size: 14 },
                                        formatter: (value) => {
                                            return `${value.toFixed(1)}%`;
                                        }
                                    }
                                }
                            }} plugins={[ChartDataLabels]} />
                        )}
                    </div>
                </div>

                {/* Customer Rejection Trend */}
                <div
                    ref={customerRejRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📈 Customer Rejection Trend (Weight)',
                        content: <Line data={custRejData} options={customerLineChartWithLabels} />
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Customer Rejection Trend (Weight)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : (
                            <Line data={custRejData} options={customerLineChartWithLabels} />
                        )}
                    </div>
                </div>

                {/* Inhouse Rejection Trend (Weight) */}
                <div
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📈 Inhouse Rejection Trend (Weight)',
                        content: <Line data={inhouseRejTrendWtData} options={inhouseLineChartWithLabels} />
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Inhouse Rejection Trend (Weight)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : (
                            <Line data={inhouseRejTrendWtData} options={inhouseLineChartWithLabels} />
                        )}
                    </div>
                </div>

                {/* Subcontractor Rejection Trend (Weight) */}
                <div
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📈 Subcontractor Rejection Trend (Weight)',
                        content: <Line data={subRejTrendWtData} options={subLineChartWithLabels} />
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Subcontractor Rejection Trend (Weight)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : (
                            <Line data={subRejTrendWtData} options={subLineChartWithLabels} />
                        )}
                    </div>
                </div>
            </div>

            {/* Top 10 Rejection Tables Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Top 10 Inhouse Rejection */}
                <div style={{
                    ...chartCardStyle,
                    cursor: 'default'
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🏭 Top 10 Inhouse Rejection (Parts)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingInhouse ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>Loading...</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F3F4F6', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB', width: '50px' }}>Sr. No.</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Parts</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Weight (T)</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Rejection %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(inhouseTopData || [])
                                        .map(item => {
                                            const totalWt = (item.inhouseokWt || 0) + (item.inhouseRejWt || 0);
                                            const percent = totalWt > 0 ? ((item.inhouseRejWt || 0) / totalWt) * 100 : 0;
                                            return { ...item, calculatedPercent: percent };
                                        })
                                        .sort((a, b) => b.calculatedPercent - a.calculatedPercent)
                                        .slice(0, 10)
                                        .map((item, index) => (
                                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>{index + 1}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>{item.InternalPartNo || '-'}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#EF4444', fontWeight: '500' }}>
                                                    {item.inhouseRejWt !== null && item.inhouseRejWt !== undefined
                                                        ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(item.inhouseRejWt / 1000)
                                                        : '0'}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>
                                                    {item.calculatedPercent.toFixed(2)}%
                                                </td>
                                            </tr>
                                        ))}
                                    {(!inhouseTopData || inhouseTopData.length === 0) && (
                                        <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#9CA3AF' }}>No data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Top 10 Subcontractor Rejection */}
                <div style={{
                    ...chartCardStyle,
                    cursor: 'default'
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🔧 Top 10 Subcontractor Rejection (Parts)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingSubcon ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>Loading...</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F3F4F6', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB', width: '50px' }}>Sr. No.</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Parts</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Weight (T)</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Rejection %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {([...(subconTopData || [])])
                                        .sort((a, b) => (b.RejPer || 0) - (a.RejPer || 0))
                                        .slice(0, 10)
                                        .map((item, index) => (
                                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>{index + 1}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>{item.InternalPartNo || '-'}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#F59E0B', fontWeight: '500' }}>
                                                    {item.SubRejweight !== null && item.SubRejweight !== undefined
                                                        ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(item.SubRejweight / 1000)
                                                        : '0'}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>
                                                    {item.RejPer !== null && item.RejPer !== undefined ? `${Number(item.RejPer).toFixed(2)}%` : '0.00%'}
                                                </td>
                                            </tr>
                                        ))}
                                    {(!subconTopData || subconTopData.length === 0) && (
                                        <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#9CA3AF' }}>No data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Top 10 Customer Rejection */}
                <div style={{
                    ...chartCardStyle,
                    cursor: 'default'
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>👥 Top 10 Customer Rejection (Parts)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingCustend ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>Loading...</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F3F4F6', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB', width: '50px' }}>Sr. No.</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Parts</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Weight (T)</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Rejection %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {([...(custendTopData || [])])
                                        .sort((a, b) => (b.RejPer || 0) - (a.RejPer || 0))
                                        .slice(0, 10)
                                        .map((item, index) => (
                                            <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>{index + 1}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>{item.InternalPartNo || '-'}</td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#8B5CF6', fontWeight: '500' }}>
                                                    {item.CustRejWt !== null && item.CustRejWt !== undefined
                                                        ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(item.CustRejWt / 1000)
                                                        : '0'}
                                                </td>
                                                <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>
                                                    {item.RejPer !== null && item.RejPer !== undefined ? `${item.RejPer}%` : '0%'}
                                                </td>
                                            </tr>
                                        ))}
                                    {(!custendTopData || custendTopData.length === 0) && (
                                        <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#9CA3AF' }}>No data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* =============== PARETO CHARTS =============== */}

            {/* Pareto Chart - Inhouse Rejection */}
            <div
                style={{ ...chartCardStyle, marginBottom: '1.5rem', cursor: 'pointer' }}
                onClick={() => setExpandedChart({
                    title: 'Pareto Chart of Inhouse Rejection',
                    content: (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <Bar data={inhouseParetoData} options={getParetoOptions('Pareto Chart of Inhouse Rejection')} />
                            </div>
                            <ParetoDataTable data={inhouseParetoData} />
                        </div>
                    )
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Pareto Chart of Inhouse Rejection</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    {isLoadingInhouse ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Bar data={inhouseParetoData} options={getParetoOptions('Pareto Chart of Inhouse Rejection')} />
                    )}
                </div>
                {!isLoadingInhouse && <ParetoDataTable data={inhouseParetoData} />}
            </div>

            {/* Pareto Chart - Subcontractor Rejection */}
            <div
                style={{ ...chartCardStyle, marginBottom: '1.5rem', cursor: 'pointer' }}
                onClick={() => setExpandedChart({
                    title: 'Pareto Chart of Subcontractor Rejection',
                    content: (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <Bar data={subconParetoData} options={getParetoOptions('Pareto Chart of Subcontractor Rejection')} />
                            </div>
                            <ParetoDataTable data={subconParetoData} />
                        </div>
                    )
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Pareto Chart of Subcontractor Rejection</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    {isLoadingSubcon ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Bar data={subconParetoData} options={getParetoOptions('Pareto Chart of Subcontractor Rejection')} />
                    )}
                </div>
                {!isLoadingSubcon && <ParetoDataTable data={subconParetoData} />}
            </div>

            {/* Pareto Chart - Customer End Rejection */}
            <div
                style={{ ...chartCardStyle, marginBottom: '1.5rem', cursor: 'pointer' }}
                onClick={() => setExpandedChart({
                    title: 'Pareto Chart of Customer End Rejection',
                    content: (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <Bar data={custendParetoData} options={getParetoOptions('Pareto Chart of Customer End Rejection')} />
                            </div>
                            <ParetoDataTable data={custendParetoData} />
                        </div>
                    )
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Pareto Chart of Customer End Rejection</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    {isLoadingCustend ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Bar data={custendParetoData} options={getParetoOptions('Pareto Chart of Customer End Rejection')} />
                    )}
                </div>
                {!isLoadingCustend && <ParetoDataTable data={custendParetoData} />}
            </div>

            {/* =============== TYPE-WISE TOP 10 REJECTION TABLES =============== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Top 10 Inhouse Rejection (Type) */}
                <div style={{
                    ...chartCardStyle,
                    cursor: 'default'
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🏭 Top 10 Inhouse Rejection (Type)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingTypewise ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>Loading...</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F3F4F6', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB', width: '50px' }}>Sr. No.</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Weight (T)</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Rejection %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const items = (typewiseAllData || []).filter(item => (item.InhRejtypeWt || 0) > 0);
                                        const totalWt = items.reduce((sum, item) => sum + (item.InhRejtypeWt || 0), 0);
                                        return items
                                            .sort((a, b) => (b.InhRejtypeWt || 0) - (a.InhRejtypeWt || 0))
                                            .slice(0, 10)
                                            .map((item, index) => (
                                                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>{index + 1}</td>
                                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>{item.description || '-'}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#EF4444', fontWeight: '500' }}>
                                                        {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format((item.InhRejtypeWt || 0) / 1000)}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>
                                                        {totalWt > 0 ? ((item.InhRejtypeWt || 0) / totalWt * 100).toFixed(2) : '0.00'}%
                                                    </td>
                                                </tr>
                                            ));
                                    })()}
                                    {(!typewiseAllData || typewiseAllData.filter(item => (item.InhRejtypeWt || 0) > 0).length === 0) && (
                                        <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#9CA3AF' }}>No data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Top 10 Subcontractor Rejection (Type) */}
                <div style={{
                    ...chartCardStyle,
                    cursor: 'default'
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🔧 Top 10 Subcontractor Rejection (Type)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingTypewise ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>Loading...</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F3F4F6', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB', width: '50px' }}>Sr. No.</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Weight (T)</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Rejection %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const items = (typewiseAllData || []).filter(item => (item.SubRejtypeWt || 0) > 0);
                                        const totalWt = items.reduce((sum, item) => sum + (item.SubRejtypeWt || 0), 0);
                                        return items
                                            .sort((a, b) => (b.SubRejtypeWt || 0) - (a.SubRejtypeWt || 0))
                                            .slice(0, 10)
                                            .map((item, index) => (
                                                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>{index + 1}</td>
                                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>{item.description || '-'}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#F59E0B', fontWeight: '500' }}>
                                                        {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format((item.SubRejtypeWt || 0) / 1000)}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>
                                                        {totalWt > 0 ? ((item.SubRejtypeWt || 0) / totalWt * 100).toFixed(2) : '0.00'}%
                                                    </td>
                                                </tr>
                                            ));
                                    })()}
                                    {(!typewiseAllData || typewiseAllData.filter(item => (item.SubRejtypeWt || 0) > 0).length === 0) && (
                                        <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#9CA3AF' }}>No data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Top 10 Customer Rejection (Type) */}
                <div style={{
                    ...chartCardStyle,
                    cursor: 'default'
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>👥 Top 10 Customer Rejection (Type)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingTypewise ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>Loading...</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F3F4F6', position: 'sticky', top: 0 }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB', width: '50px' }}>Sr. No.</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Type</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Weight (T)</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#374151', borderBottom: '2px solid #E5E7EB' }}>Rejection %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const items = (typewiseAllData || []).filter(item => (item.CustRejtypeWt || 0) > 0);
                                        const totalWt = items.reduce((sum, item) => sum + (item.CustRejtypeWt || 0), 0);
                                        return items
                                            .sort((a, b) => (b.CustRejtypeWt || 0) - (a.CustRejtypeWt || 0))
                                            .slice(0, 10)
                                            .map((item, index) => (
                                                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                    <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid #E5E7EB', color: '#6B7280' }}>{index + 1}</td>
                                                    <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>{item.description || '-'}</td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#8B5CF6', fontWeight: '500' }}>
                                                        {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format((item.CustRejtypeWt || 0) / 1000)}
                                                    </td>
                                                    <td style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #E5E7EB', color: '#1F2937' }}>
                                                        {totalWt > 0 ? ((item.CustRejtypeWt || 0) / totalWt * 100).toFixed(2) : '0.00'}%
                                                    </td>
                                                </tr>
                                            ));
                                    })()}
                                    {(!typewiseAllData || typewiseAllData.filter(item => (item.CustRejtypeWt || 0) > 0).length === 0) && (
                                        <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#9CA3AF' }}>No data available</td></tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* =============== TYPE-WISE PARETO CHARTS =============== */}

            {/* Pareto Chart - Inhouse Rejection (Type) */}
            <div
                style={{ ...chartCardStyle, marginBottom: '1.5rem', cursor: 'pointer' }}
                onClick={() => setExpandedChart({
                    title: 'Pareto Chart of Inhouse Rejection (Type)',
                    content: (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <Bar data={inhouseTypeParetoData} options={getParetoOptions('Pareto Chart of Inhouse Rejection (Type)')} />
                            </div>
                            <ParetoTypeDataTable data={inhouseTypeParetoData} />
                        </div>
                    )
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Pareto Chart of Inhouse Rejection (Type)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    {isLoadingTypewise ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Bar data={inhouseTypeParetoData} options={getParetoOptions('Pareto Chart of Inhouse Rejection (Type)')} />
                    )}
                </div>
                {!isLoadingTypewise && <ParetoTypeDataTable data={inhouseTypeParetoData} />}
            </div>

            {/* Pareto Chart - Subcontractor Rejection (Type) */}
            <div
                style={{ ...chartCardStyle, marginBottom: '1.5rem', cursor: 'pointer' }}
                onClick={() => setExpandedChart({
                    title: 'Pareto Chart of Subcontractor Rejection (Type)',
                    content: (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <Bar data={subconTypeParetoData} options={getParetoOptions('Pareto Chart of Subcontractor Rejection (Type)')} />
                            </div>
                            <ParetoTypeDataTable data={subconTypeParetoData} />
                        </div>
                    )
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Pareto Chart of Subcontractor Rejection (Type)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    {isLoadingTypewise ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Bar data={subconTypeParetoData} options={getParetoOptions('Pareto Chart of Subcontractor Rejection (Type)')} />
                    )}
                </div>
                {!isLoadingTypewise && <ParetoTypeDataTable data={subconTypeParetoData} />}
            </div>

            {/* Pareto Chart - Customer Rejection (Type) */}
            <div
                style={{ ...chartCardStyle, marginBottom: '1.5rem', cursor: 'pointer' }}
                onClick={() => setExpandedChart({
                    title: 'Pareto Chart of Customer Rejection (Type)',
                    content: (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <Bar data={custendTypeParetoData} options={getParetoOptions('Pareto Chart of Customer Rejection (Type)')} />
                            </div>
                            <ParetoTypeDataTable data={custendTypeParetoData} />
                        </div>
                    )
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Pareto Chart of Customer Rejection (Type)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '450px' }}>
                    {isLoadingTypewise ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : (
                        <Bar data={custendTypeParetoData} options={getParetoOptions('Pareto Chart of Customer Rejection (Type)')} />
                    )}
                </div>
                {!isLoadingTypewise && <ParetoTypeDataTable data={custendTypeParetoData} />}
            </div>
        </div>
    );
};

export default RejectionDashboard;
