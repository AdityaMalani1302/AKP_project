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
import ExportButton from './ExportButton';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';
import {
    applyChartDefaults,
    CHART_COLORS,
    REJECTION_COLORS,
    getLineChartOptions,
    getBarChartOptions,
    getStackedBarOptions,
    getHorizontalBarOptions
} from '../utils/chartConfig';
import { generateDashboardFYOptions } from '../utils/dashboardFYFilter';
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

const formatWeight = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0 T';
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
        return `${Math.round(absValue / 1000)} T`;
    }
    return `${Math.round(absValue)} T`;
};

const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
};



// Month order for sorting
const _monthOrder = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4,
    'may': 5, 'june': 6, 'july': 7, 'august': 8,
    'september': 9, 'october': 10, 'november': 11, 'december': 12
};

const RejectionDashboard = () => {
    const queryClient = useQueryClient();
    const [countdown, setCountdown] = useState(60);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fyOptions = useMemo(() => generateDashboardFYOptions(), []);
    const [activePreset, setActivePreset] = useState('fy');
    const [selectedFY, setSelectedFY] = useState(() => fyOptions[0]?.value);

    // Filter helpers for new Month-Year format
    const parseMonthYear = (monthStr) => {
        if (!monthStr) return { month: '', year: 0, date: new Date(0) };
        const parts = monthStr.split('-');
        const month = (parts[0] || '').toLowerCase();
        const year = parseInt(parts[1], 10) || 0;
        
        // Month index (0-11)
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIndex = monthNames.indexOf(month);
        
        return {
            month,
            year,
            monthIndex,
            date: new Date(year, monthIndex !== -1 ? monthIndex : 0, 1)
        };
    };

    // Fullscreen chart state
    const [expandedChart, setExpandedChart] = useState(null);

    // Chart refs for export
    const prodVsDispatchRef = useRef(null);

    const totalRejectionTrendRef = useRef(null);
    const inhouseVsSubRef = useRef(null);
    const rejectionSplitRef = useRef(null);
    const rejectionPctRef = useRef(null);
    const customerRejPctRef = useRef(null);
    const inhouseRejPctRef = useRef(null);
    const subcontractorRejPctRef = useRef(null);
    const top10InhouseRejChartRef = useRef(null);
    const top10CustomerRejChartRef = useRef(null);
    const top10SubconRejChartRef = useRef(null);
    const segmentWiseRejectionChartRef = useRef(null);
    const productFamiliarRejectionChartRef = useRef(null);

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

            queryClient.invalidateQueries({ queryKey: ['rejection-typewise-all'] });
            setLastRefresh(new Date());
            setCountdown(60);
        }, REFRESH_INTERVAL);
        return () => clearInterval(refreshTimer);
    }, [queryClient]);

    // Manual refresh
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['rejection-dashboard'] });

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
                start = new Date(selectedFY, 3, 1); // April 1
                end = new Date(selectedFY + 1, 2, 31); // March 31
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

    // Fetch Top 10 Subcontractor Rejection by Name data
    const { data: subconNameTopData, isLoading: isLoadingSubconName } = useQuery({
        queryKey: ['rejection-subconname-top', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/subconname-top', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch Top 10 Customer Rejection by Name data
    const { data: customerNameTopData, isLoading: _isLoadingCustomerName } = useQuery({
        queryKey: ['rejection-customername-top', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/customername-top', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });



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

    // Fetch Family and Segment wise rejection data for bottom chart
    const { data: familySegmentData, isLoading: isLoadingFamilySegment } = useQuery({
        queryKey: ['rejection-family-segment', activePreset, selectedFY],
        queryFn: async () => {
            const res = await api.get('/rejection-dashboard/family-segment', {
                params: { startDate: dateRange.startDate, endDate: dateRange.endDate }
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



    // Filter data based on preset
    const filteredData = useMemo(() => {
        if (!dashboardData || !Array.isArray(dashboardData)) return [];

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        switch (activePreset) {
            case 'thisMonth':
                return dashboardData.filter(d => {
                    const pd = parseMonthYear(d.Months);
                    return pd.monthIndex === currentMonth && pd.year === currentYear;
                });
            case 'lastMonth': {
                const lm = subMonths(now, 1);
                return dashboardData.filter(d => {
                    const pd = parseMonthYear(d.Months);
                    return pd.monthIndex === lm.getMonth() && pd.year === lm.getFullYear();
                });
            }
            case 'last3Months': {
                const targetKeys = [];
                for (let i = 0; i < 3; i++) {
                    const m = subMonths(now, i);
                    targetKeys.push(`${m.getFullYear()}-${m.getMonth()}`);
                }
                return dashboardData.filter(d => {
                    const pd = parseMonthYear(d.Months);
                    return targetKeys.includes(`${pd.year}-${pd.monthIndex}`);
                });
            }
            case 'last6Months': {
                const targetKeys = [];
                for (let i = 0; i < 6; i++) {
                    const m = subMonths(now, i);
                    targetKeys.push(`${m.getFullYear()}-${m.getMonth()}`);
                }
                return dashboardData.filter(d => {
                    const pd = parseMonthYear(d.Months);
                    return targetKeys.includes(`${pd.year}-${pd.monthIndex}`);
                });
            }
            case 'fy':
            default:
                return dashboardData.filter(d => {
                    const pd = parseMonthYear(d.Months);
                    // Belongs to selectedFY if:
                    // April (3) to Dec (11) of selectedFY
                    // OR Jan (0) to March (2) of selectedFY + 1
                    if (pd.monthIndex >= 3 && pd.year === selectedFY) return true;
                    if (pd.monthIndex < 3 && pd.year === selectedFY + 1) return true;
                    return false;
                });
        }
    }, [dashboardData, activePreset, selectedFY]);

    const sortedData = useMemo(() => {
        if (!Array.isArray(filteredData)) return [];
        return [...filteredData].sort((a, b) => {
            const pA = parseMonthYear(a.Months);
            const pB = parseMonthYear(b.Months);
            
            // If they are in the same FY context, sort by fiscal month logic,
            // otherwise just chronological
            if (activePreset === 'fy') {
                 const valA = pA.monthIndex < 3 ? pA.monthIndex + 12 : pA.monthIndex;
                 const valB = pB.monthIndex < 3 ? pB.monthIndex + 12 : pB.monthIndex;
                 return valA - valB;
            }
            // Chronological sort for recent months presets
            return pA.date.getTime() - pB.date.getTime();
        });
    }, [filteredData, activePreset]);

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

    // New Chart: Top 10 Inhouse Rejection (Weight) - Horizontal Bar Chart
    const _top10InhouseRejectionChartData = useMemo(() => {
        const sortedData = [...(inhouseTopData || [])]
            .sort((a, b) => (b.inhouseRejWt || 0) - (a.inhouseRejWt || 0))
            .slice(0, 10);

        return {
            labels: sortedData.map(d => d.InternalPartNo || '-'),
            datasets: [{
                label: 'Inhouse Rejection Weight (T)',
                data: sortedData.map(d => (d.inhouseRejWt || 0) / 1000),
                backgroundColor: 'rgba(239, 68, 68, 0.75)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        };
    }, [inhouseTopData]);

    // New Chart: Top 10 Customer Rejection (Weight) - Horizontal Bar Chart
    const top10CustomerRejectionChartData = useMemo(() => {
        const sortedData = [...(customerNameTopData || [])]
            .sort((a, b) => (b.Rej || 0) - (a.Rej || 0))
            .slice(0, 10);

        return {
            labels: sortedData.map(d => d.Name || '-'),
            datasets: [{
                label: 'Customer Rejection Weight (T)',
                data: sortedData.map(d => (d.Rej || 0) / 1000),
                percentages: sortedData.map(d => d['Rej%'] || 0),
                backgroundColor: 'rgba(139, 92, 246, 0.75)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        };
    }, [customerNameTopData]);

    // New Chart: Top 10 Subcontractor Rejection (Weight) by Name
    const top10SubconNameRejectionChartData = useMemo(() => {
        const sortedData = [...(subconNameTopData || [])]
            .sort((a, b) => (b.RejWt || 0) - (a.RejWt || 0))
            .slice(0, 10);

        return {
            labels: sortedData.map(d => d.SubConName || d.Name || '-'),
            datasets: [{
                label: 'Subcontractor Rejection Weight (T)',
                data: sortedData.map(d => (d.RejWt || d.Rej || 0) / 1000),
                percentages: sortedData.map(d => d.RejPer || d['Rej%'] || 0),
                backgroundColor: 'rgba(59, 130, 246, 0.75)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        };
    }, [subconNameTopData]);

    // NEW CHART 1: Family Wise Rejection (Percentages)
    const familyWiseChartData = useMemo(() => {
        if (!Array.isArray(familySegmentData) || familySegmentData.length === 0) return { labels: [], datasets: [] };

        const groupedMap = new Map();
        familySegmentData.forEach(row => {
            const family = row.ProductType ? row.ProductType.trim() : 'Unknown';
            if (!groupedMap.has(family)) {
                groupedMap.set(family, { ProdWt: 0, InhRejWt: 0, SubOutWt: 0, SubRejWt: 0, DispWt: 0, CustRejWt: 0 });
            }
            const data = groupedMap.get(family);
            data.ProdWt += (row.ProductionWeight || 0);
            data.InhRejWt += (row.InhouseRejWt || 0);
            data.SubOutWt += (row.SubconOutweight || 0);
            data.SubRejWt += (row.SubconRejWt || 0);
            data.DispWt += (row.DespatchWeight || 0);
            data.CustRejWt += (row.CustEndRejWt || 0);
        });

        const labels = [];
        const inhPctData = [];
        const subPctData = [];
        const custPctData = [];

        groupedMap.forEach((data, key) => {
            if (data.ProdWt > 0 || data.SubOutWt > 0 || data.DispWt > 0 || data.InhRejWt > 0 || data.SubRejWt > 0 || data.CustRejWt > 0) {
                labels.push(key);
                inhPctData.push(Number((data.ProdWt > 0 ? (data.InhRejWt / data.ProdWt) * 100 : 0).toFixed(2)));
                subPctData.push(Number((data.SubOutWt > 0 ? (data.SubRejWt / data.SubOutWt) * 100 : 0).toFixed(2)));
                custPctData.push(Number((data.DispWt > 0 ? (data.CustRejWt / data.DispWt) * 100 : 0).toFixed(2)));
            }
        });

        if (labels.length === 0) return { labels: [], datasets: [] };

        return {
            labels,
            datasets: [
                { label: 'Inhouse Rejection %', data: inhPctData, backgroundColor: 'rgba(16, 185, 129, 0.75)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1, borderRadius: 4 },
                { label: 'Subcon Rejection %', data: subPctData, backgroundColor: 'rgba(14, 165, 233, 0.75)', borderColor: 'rgba(14, 165, 233, 1)', borderWidth: 1, borderRadius: 4 },
                { label: 'Customer Rejection %', data: custPctData, backgroundColor: 'rgba(168, 85, 247, 0.75)', borderColor: 'rgba(168, 85, 247, 1)', borderWidth: 1, borderRadius: 4 }
            ]
        };
    }, [familySegmentData]);

    // NEW CHART 2: Segment Wise Rejection (Percentages)
    const segmentWiseChartData = useMemo(() => {
        if (!Array.isArray(familySegmentData) || familySegmentData.length === 0) return { labels: [], datasets: [] };

        const groupedMap = new Map();
        familySegmentData.forEach(row => {
            const segment = row.SegmentType ? row.SegmentType.trim() : 'Unknown';
            if (!groupedMap.has(segment)) {
                groupedMap.set(segment, { ProdWt: 0, InhRejWt: 0, SubOutWt: 0, SubRejWt: 0, DispWt: 0, CustRejWt: 0 });
            }
            const data = groupedMap.get(segment);
            data.ProdWt += (row.ProductionWeight || 0);
            data.InhRejWt += (row.InhouseRejWt || 0);
            data.SubOutWt += (row.SubconOutweight || 0);
            data.SubRejWt += (row.SubconRejWt || 0);
            data.DispWt += (row.DespatchWeight || 0);
            data.CustRejWt += (row.CustEndRejWt || 0);
        });

        const labels = [];
        const inhPctData = [];
        const subPctData = [];
        const custPctData = [];

        groupedMap.forEach((data, key) => {
            if (data.ProdWt > 0 || data.SubOutWt > 0 || data.DispWt > 0 || data.InhRejWt > 0 || data.SubRejWt > 0 || data.CustRejWt > 0) {
                labels.push(key);
                inhPctData.push(Number((data.ProdWt > 0 ? (data.InhRejWt / data.ProdWt) * 100 : 0).toFixed(2)));
                subPctData.push(Number((data.SubOutWt > 0 ? (data.SubRejWt / data.SubOutWt) * 100 : 0).toFixed(2)));
                custPctData.push(Number((data.DispWt > 0 ? (data.CustRejWt / data.DispWt) * 100 : 0).toFixed(2)));
            }
        });

        if (labels.length === 0) return { labels: [], datasets: [] };

        return {
            labels,
            datasets: [
                { label: 'Inhouse Rejection %', data: inhPctData, backgroundColor: 'rgba(16, 185, 129, 0.75)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1, borderRadius: 4 },
                { label: 'Subcon Rejection %', data: subPctData, backgroundColor: 'rgba(14, 165, 233, 0.75)', borderColor: 'rgba(14, 165, 233, 1)', borderWidth: 1, borderRadius: 4 },
                { label: 'Customer Rejection %', data: custPctData, backgroundColor: 'rgba(168, 85, 247, 0.75)', borderColor: 'rgba(168, 85, 247, 1)', borderWidth: 1, borderRadius: 4 }
            ]
        };
    }, [familySegmentData]);

    const barChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: { font: { size: 12, weight: '500' }, color: '#374151' }
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return context.dataset.label + ': ' + context.parsed.y + '%';
                    }
                }
            },
            datalabels: {
                display: true,
                align: 'end',
                anchor: 'end',
                color: '#374151',
                font: { size: 10, weight: 'bold' },
                formatter: (value) => value > 0 ? value + '%' : ''
            }
        },
        scales: {
            x: {
                ticks: { font: { size: 11 }, color: '#6B7280' },
                grid: { display: false }
            },
            y: {
                title: { display: true, text: 'Rejection (%)', font: { size: 12, weight: '600' }, color: '#374151' },
                ticks: {
                    font: { size: 11 },
                    color: '#6B7280',
                    callback: (value) => value + '%'
                },
                grid: { color: '#E5E7EB', borderDash: [2, 2] },
                beginAtZero: true
            }
        }
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
                            { ref: rejectionPctRef, title: 'Rejection Percentage Breakdown (%)' },
                            { ref: totalRejectionTrendRef, title: 'Total Rejection Trend' },
                            { ref: customerRejPctRef, title: 'Customer Rejection Trend (%)' },
                            { ref: inhouseRejPctRef, title: 'Inhouse Rejection Trend (%)' },
                            { ref: subcontractorRejPctRef, title: 'Subcontractor Rejection Trend (%)' },
                            { ref: rejectionSplitRef, title: 'Rejection Split' },
                            { ref: inhouseVsSubRef, title: 'Customer vs Inhouse vs Subcontractor Rejection (Weight)' },
                            { ref: top10InhouseRejChartRef, title: 'Top 10 Inhouse Rejection' },
                            { ref: top10CustomerRejChartRef, title: 'Top 10 Customer Rejection' },
                            { ref: top10SubconRejChartRef, title: 'Top 10 Subcontractor Rejection' },
                            { ref: segmentWiseRejectionChartRef, title: 'Segment Wise Rejection' },
                            { ref: productFamiliarRejectionChartRef, title: 'Product Family Wise Rejection' }
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
                    Full FY
                </button>
                {activePreset === 'fy' && (
                    <select 
                        value={selectedFY} 
                        onChange={(e) => setSelectedFY(Number(e.target.value))}
                        style={{
                            padding: '0.5rem 2rem 0.5rem 1rem',
                            backgroundColor: 'white',
                            color: '#374151',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23374151%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem top 50%',
                            backgroundSize: '0.65rem auto'
                        }}
                    >
                        {fyOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )}
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Inhouse Rejection Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.inhouseRejWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Inhouse Rej %</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(kpis.inhousePct)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Dispatch Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.totalDispatchWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Customer Rej Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.custRejWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Customer Rej %</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(kpis.custPct)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Subcon OutWeight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.totalSubconOutWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Subcontractor Rej Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(kpis.subRejWt)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Subcontractor Rej %</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(kpis.subPct)}
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
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📈 Production vs Dispatch (Weight)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExportButton chartRef={prodVsDispatchRef} title="Production vs Dispatch (Weight)" filename="production-vs-dispatch-(weight)" />
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
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
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📈 Rejection Percentage Breakdown (%)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExportButton chartRef={rejectionPctRef} title="Rejection Percentage Breakdown (%)" filename="rejection-percentage-breakdown-(%)" />
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
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
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📊 Total Rejection Trend (%)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExportButton chartRef={totalRejectionTrendRef} title="Total Rejection Trend (%)" filename="total-rejection-trend-(%)" />
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📊 Customer Rejection Trend (%)</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={customerRejPctRef} title="Customer Rejection Trend (%)" filename="customer-rejection-trend-(%)" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📊 Inhouse Rejection Trend (%)</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={inhouseRejPctRef} title="Inhouse Rejection Trend (%)" filename="inhouse-rejection-trend-(%)" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📊 Subcontractor Rejection Trend (%)</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={subcontractorRejPctRef} title="Subcontractor Rejection Trend (%)" filename="subcontractor-rejection-trend-(%)" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
                        ) : (
                            <Line data={subcontractorRejPctData} options={singlePctLineChartOptions} />
                        )}
                    </div>
                </div>




                {/* Rejection Split Pie - Moved into grid */}
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>🥧 Rejection Contribution Split</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={rejectionSplitRef} title="Rejection Contribution Split" filename="rejection-contribution-split" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <Skeleton height="100%" borderRadius="12px" />
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
            </div>

            {/* Inhouse vs Subcontractor vs Customer Rejection - Moved out of grid and made full width */}
            <div
                ref={inhouseVsSubRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📊 Customer vs Inhouse vs Subcontractor Rejection(Weight)',
                    content: <Bar data={inhouseVsSubData} options={stackedBarWithLabels} />
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📊 Customer vs Inhouse vs Subcontractor Rejection(Weight)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExportButton chartRef={inhouseVsSubRef} title="Customer vs Inhouse vs Subcontractor Rejection(Weight)" filename="customer-vs-inhouse-vs-subcontractor-rejection(weight)" />
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Skeleton height="100%" width="100%" borderRadius="12px" />
                        </div>
                    ) : (
                        <Bar data={inhouseVsSubData} options={stackedBarWithLabels} />
                    )}
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>🏭 Top 10 Inhouse Rejection (Parts)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingInhouse ? (
                            <Skeleton count={10} height={40} className="mb-2" />
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
                                                    {item.calculatedPercent.toFixed(1)}%
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>🔧 Top 10 Subcontractor Rejection (Parts)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingSubcon ? (
                            <Skeleton count={10} height={40} className="mb-2" />
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
                                                    {item.RejPer !== null && item.RejPer !== undefined ? `${Number(item.RejPer).toFixed(1)}%` : '0.0%'}
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>👥 Top 10 Customer Rejection (Parts)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingCustend ? (
                            <Skeleton count={10} height={40} className="mb-2" />
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
                                                    {item.RejPer !== null && item.RejPer !== undefined ? `${Number(item.RejPer).toFixed(1)}%` : '0.0%'}
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

            {/* =============== NEW REJECTION CHARTS =============== */}



            {/* Top 10 Customer Rejection Chart */}
            <div
                ref={top10CustomerRejChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '👥 Top 10 Customer Rejection (Weight)',
                    content: <Bar data={top10CustomerRejectionChartData} options={{
                        ...getHorizontalBarOptions((v) => formatWeight(v * 1000)),
                        plugins: {
                            ...getHorizontalBarOptions((v) => formatWeight(v * 1000)).plugins,
                            datalabels: {
                                display: true,
                                anchor: 'end',
                                align: 'end',
                                color: '#1F2937',
                                font: { size: 11, weight: '600' },
                                formatter: (v, context) => {
                                    const weight = formatWeight(v * 1000);
                                    const perc = context.dataset.percentages[context.dataIndex];
                                    return `${weight} (${Number(perc).toFixed(1)}%)`;
                                }
                            }
                        }
                    }} plugins={[ChartDataLabels]} />
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>👥 Top 10 Customer Rejection (Weight)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExportButton chartRef={top10CustomerRejChartRef} title="Top 10 Customer Rejection (Weight)" filename="top-10-customer-rejection-(weight)" />
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoadingCustend ? (
                        <Skeleton height="100%" borderRadius="12px" />
                    ) : top10CustomerRejectionChartData.labels.length > 0 ? (
                        <Bar data={top10CustomerRejectionChartData} options={{
                            ...getHorizontalBarOptions((v) => formatWeight(v * 1000)),
                            plugins: {
                                ...getHorizontalBarOptions((v) => formatWeight(v * 1000)).plugins,
                                datalabels: {
                                    display: true,
                                    anchor: 'end',
                                    align: 'end',
                                    color: '#1F2937',
                                    font: { size: 11, weight: '600' },
                                    formatter: (v, context) => {
                                        const weight = formatWeight(v * 1000);
                                        const perc = context.dataset.percentages[context.dataIndex];
                                        return `${weight} (${Number(perc).toFixed(1)}%)`;
                                    }
                                }
                            }
                        }} plugins={[ChartDataLabels]} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* Top 10 Subcontractor Rejection Chart */}
            <div
                ref={top10SubconRejChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '🔧 Top 10 Subcontractor Rejection (Weight)',
                    content: <Bar data={top10SubconNameRejectionChartData} options={{
                        ...getHorizontalBarOptions((v) => formatWeight(v * 1000)),
                        plugins: {
                            ...getHorizontalBarOptions((v) => formatWeight(v * 1000)).plugins,
                            datalabels: {
                                display: true,
                                anchor: 'end',
                                align: 'end',
                                color: '#1F2937',
                                font: { size: 11, weight: '600' },
                                formatter: (v, context) => {
                                    const weight = formatWeight(v * 1000);
                                    const perc = context.dataset.percentages[context.dataIndex];
                                    return `${weight} (${Number(perc).toFixed(1)}%)`;
                                }
                            }
                        }
                    }} plugins={[ChartDataLabels]} />
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>🔧 Top 10 Subcontractor Rejection (Weight)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ExportButton chartRef={top10SubconRejChartRef} title="Top 10 Subcontractor Rejection (Weight)" filename="top-10-subcontractor-rejection-(weight)" />
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoadingSubconName ? (
                        <Skeleton height="100%" borderRadius="12px" />
                    ) : top10SubconNameRejectionChartData.labels.length > 0 ? (
                        <Bar data={top10SubconNameRejectionChartData} options={{
                            ...getHorizontalBarOptions((v) => formatWeight(v * 1000)),
                            plugins: {
                                ...getHorizontalBarOptions((v) => formatWeight(v * 1000)).plugins,
                                datalabels: {
                                    display: true,
                                    anchor: 'end',
                                    align: 'end',
                                    color: '#1F2937',
                                    font: { size: 11, weight: '600' },
                                    formatter: (v, context) => {
                                        const weight = formatWeight(v * 1000);
                                        const perc = context.dataset.percentages[context.dataIndex];
                                        return `${weight} (${Number(perc).toFixed(1)}%)`;
                                    }
                                }
                            }
                        }} plugins={[ChartDataLabels]} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* =============== TYPE-WISE TOP 10 REJECTION TABLES =============== */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Top 10 Inhouse Rejection (Type) */}
                <div style={{
                    ...chartCardStyle,
                    cursor: 'default'
                }}>
                    <div style={{ marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>🏭 Top 10 Inhouse Rejection (Type)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingTypewise ? (
                            <Skeleton count={10} height={40} className="mb-2" />
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>🔧 Top 10 Subcontractor Rejection (Type)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingTypewise ? (
                            <Skeleton count={10} height={40} className="mb-2" />
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
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>👥 Top 10 Customer Rejection (Type)</h3>
                    </div>
                    <div className="hide-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {isLoadingTypewise ? (
                            <Skeleton count={10} height={40} className="mb-2" />
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



            {/* NEW CHARTS: Family Wise and Segment Wise Rejection */}
            <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
                {/* Family Wise */}
                <div
                    style={{ ...chartCardStyle, cursor: 'pointer' }}
                    onClick={() => setExpandedChart({
                        title: 'Product Family Wise Rejection (%)',
                        content: (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    <Bar data={familyWiseChartData} options={barChartOptions} />
                                </div>
                            </div>
                        )
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📊 Product Family Wise (%)</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={productFamiliarRejectionChartRef} title="Product Family Wise Rejection (%)" filename="family-wise-rejection" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '450px' }}>
                        {isLoadingFamilySegment ? (
                            <Skeleton height="100%" borderRadius="12px" />
                        ) : familyWiseChartData.labels.length > 0 ? (
                            <Bar ref={productFamiliarRejectionChartRef} data={familyWiseChartData} options={barChartOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* Segment Wise */}
                <div
                    style={{ ...chartCardStyle, cursor: 'pointer' }}
                    onClick={() => setExpandedChart({
                        title: 'Segment Wise Rejection (%)',
                        content: (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ flex: 1, minHeight: 0 }}>
                                    <Bar data={segmentWiseChartData} options={barChartOptions} />
                                </div>
                            </div>
                        )
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>📊 Segment Wise (%)</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ExportButton chartRef={segmentWiseRejectionChartRef} title="Segment Wise Rejection (%)" filename="segment-wise-rejection" />
                            <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                        </div>
                    </div>
                    <div style={{ height: '450px' }}>
                        {isLoadingFamilySegment ? (
                            <Skeleton height="100%" borderRadius="12px" />
                        ) : segmentWiseChartData.labels.length > 0 ? (
                            <Bar ref={segmentWiseRejectionChartRef} data={segmentWiseChartData} options={barChartOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default RejectionDashboard;
