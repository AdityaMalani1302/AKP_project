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
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { format, subMonths } from 'date-fns';
import api from '../api';
import ExportButtons from './common/ExportButtons';
import TreeMapChart from './common/TreeMapChart';
import {
    applyChartDefaults,
    CHART_COLORS,
    PRODUCTION_COLORS,
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

const REFRESH_INTERVAL = 120000; // 2 minutes

// Safe TreeMap wrapper with error handling
const SafeTreeMapChart = ({ data, ...props }) => {
    try {
        if (!data || data.length === 0) {
            return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>;
        }
        return <TreeMapChart data={data} {...props} />;
    } catch (error) {
        console.error('TreeMapChart error:', error);
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#EF4444' }}>Chart unavailable</div>;
    }
};

// Format weight in tons
const formatWeight = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0 T';
    const absValue = Math.abs(value);
    if (absValue >= 1000) {
        return `${(absValue / 1000).toFixed(2)} T`;
    }
    return `${absValue.toFixed(1)} T`;
};

// Format number with commas
const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0';
    return new Intl.NumberFormat('en-IN').format(Math.round(value));
};

// Format percentage
const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '0%';
    return `${value.toFixed(1)}%`;
};

const ProductionDashboard = () => {
    const queryClient = useQueryClient();
    const [countdown, setCountdown] = useState(60);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Catch WebGL errors from other components (e.g., SalesGlobe) that might leak
    useEffect(() => {
        const handleError = (event) => {
            if (event.error && (
                event.error.message?.includes('VERTEX') ||
                event.error.message?.includes('WebGL') ||
                event.error.message?.includes('webgl') ||
                event.error.message?.includes('THREE')
            )) {
                console.warn('ProductionDashboard caught WebGL error:', event.error.message);
                // Prevent the error from bubbling up and crashing the app
                event.preventDefault();
                event.stopPropagation();
            }
        };

        window.addEventListener('error', handleError, true);
        return () => window.removeEventListener('error', handleError, true);
    }, []);

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

    // Fullscreen chart state - stores {title, content} object like FinanceDashboard
    const [expandedChart, setExpandedChart] = useState(null);

    // Chart refs for export
    const meltingTrendChartRef = useRef(null);
    const gradeBreakdownChartRef = useRef(null);
    const heatEfficiencyChartRef = useRef(null);
    const productionTrendChartRef = useRef(null);
    const gradePerformanceChartRef = useRef(null);
    const rejectionChartRef = useRef(null);
    const partProductivityChartRef = useRef(null);
    const okRejectionPieRef = useRef(null);
    const momGrowthChartRef = useRef(null);
    const boxSizeStackedChartRef = useRef(null);
    const monthlyYieldImprovementRef = useRef(null);
    const momYieldGrowthRef = useRef(null);

    // Close modal on Escape
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
            queryClient.invalidateQueries(['production-dashboard']);
            setLastRefresh(new Date());
            setCountdown(60);
        }, REFRESH_INTERVAL);
        return () => clearInterval(refreshTimer);
    }, [queryClient]);

    // Fetch melting data
    const { data: meltingData, isLoading: meltingLoading, error: meltingError } = useQuery({
        queryKey: ['production-dashboard', 'melting', appliedFilters.fromDate, appliedFilters.toDate],
        queryFn: async () => {
            const res = await api.get('/production-dashboard/melting-data', {
                params: { fromDate: appliedFilters.fromDate, toDate: appliedFilters.toDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    // Fetch production data
    const { data: productionData, isLoading: productionLoading, error: productionError } = useQuery({
        queryKey: ['production-dashboard', 'production', appliedFilters.fromDate, appliedFilters.toDate],
        queryFn: async () => {
            const res = await api.get('/production-dashboard/production-data', {
                params: { fromDate: appliedFilters.fromDate, toDate: appliedFilters.toDate }
            });
            return res.data;
        },
        refetchInterval: REFRESH_INTERVAL
    });

    useEffect(() => {
        if (meltingError) {
            console.error('Melting Dashboard Error:', meltingError);
            toast.error('Failed to load melting data: ' + (meltingError.response?.data?.error || meltingError.message));
        }
        if (productionError) {
            console.error('Production Dashboard Error:', productionError);
            toast.error('Failed to load production data: ' + (productionError.response?.data?.error || productionError.message));
        }
    }, [meltingError, productionError]);

    // Manual refresh
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries(['production-dashboard']);
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

    // Month order for sorting
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
            const monthNum = monthOrder[monthName] || 0;
            return year * 100 + monthNum;
        }
        return 0;
    };

    // ============================================
    // MELTING SECTION - KPIs and Charts
    // ============================================

    const meltingSummary = useMemo(() => {
        if (!Array.isArray(meltingData) || meltingData.length === 0) {
            return { totalHeats: 0, totalMetal: 0, avgMetalPerHeat: 0, activeGrades: 0 };
        }

        let totalHeats = 0;
        let totalMetal = 0;
        const grades = new Set();

        meltingData.forEach(row => {
            totalHeats += row.HeatNO || 0;
            totalMetal += row.Metal || 0;
            if (row.Grade) grades.add(row.Grade);
        });

        return {
            totalHeats,
            totalMetal,
            avgMetalPerHeat: totalHeats > 0 ? totalMetal / totalHeats : 0,
            activeGrades: grades.size
        };
    }, [meltingData]);

    // Monthly melting trend
    const meltingMonthlyTrend = useMemo(() => {
        if (!Array.isArray(meltingData) || meltingData.length === 0) return null;

        const monthlyData = {};

        meltingData.forEach(row => {
            const month = row.Month || 'Unknown';
            if (!monthlyData[month]) {
                monthlyData[month] = { heats: 0, metal: 0 };
            }
            monthlyData[month].heats += row.HeatNO || 0;
            monthlyData[month].metal += row.Metal || 0;
        });

        const months = Object.keys(monthlyData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));

        return {
            labels: months,
            datasets: [
                {
                    type: 'bar',
                    label: 'Metal (T)',
                    data: months.map(m => monthlyData[m].metal),
                    backgroundColor: PRODUCTION_COLORS.primary.medium,
                    borderColor: PRODUCTION_COLORS.primary.solid,
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'Heats',
                    data: months.map(m => monthlyData[m].heats),
                    borderColor: PRODUCTION_COLORS.warning.solid,
                    backgroundColor: PRODUCTION_COLORS.warning.light,
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: PRODUCTION_COLORS.warning.solid,
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        };
    }, [meltingData]);

    // Grade-wise production breakdown - TreeMap data
    const gradeBreakdown = useMemo(() => {
        if (!Array.isArray(meltingData) || meltingData.length === 0) return null;

        const gradeData = {};

        meltingData.forEach(row => {
            const grade = row.Grade || 'Unknown';
            if (!gradeData[grade]) {
                gradeData[grade] = 0;
            }
            gradeData[grade] += (row.Metal || 0);
        });

        // Return simple array for TreeMapChart
        return Object.entries(gradeData).map(([grade, value]) => ({
            grade,
            value
        })).sort((a, b) => b.value - a.value);
    }, [meltingData]);

    // Heat efficiency by grade
    const heatEfficiency = useMemo(() => {
        if (!Array.isArray(meltingData) || meltingData.length === 0) return null;

        const gradeData = {};

        meltingData.forEach(row => {
            const grade = row.Grade || 'Unknown';
            if (!gradeData[grade]) {
                gradeData[grade] = { heats: 0, metal: 0 };
            }
            gradeData[grade].heats += row.HeatNO || 0;
            gradeData[grade].metal += row.Metal || 0;
        });

        const entries = Object.entries(gradeData)
            .map(([grade, data]) => ({
                grade,
                efficiency: data.heats > 0 ? data.metal / data.heats : 0
            }))
            .sort((a, b) => b.efficiency - a.efficiency);

        return {
            labels: entries.map(e => e.grade),
            datasets: [{
                label: 'Metal per Heat (MT)',
                data: entries.map(e => e.efficiency),
                backgroundColor: PRODUCTION_COLORS.primary.medium,
                borderColor: PRODUCTION_COLORS.primary.solid,
                borderWidth: 1,
                borderRadius: 4
            }]
        };
    }, [meltingData]);

    // ============================================
    // PRODUCTION SECTION - KPIs and Charts
    // ============================================

    const productionSummary = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0) {
            return { totalPoured: 0, totalOk: 0, totalRej: 0, rejectionPct: 0, distinctParts: 0, yieldByPoured: 0 };
        }

        let totalPoured = 0;
        let totalOk = 0;
        let totalRej = 0;
        const parts = new Set();

        productionData.forEach(row => {
            totalPoured += row.Pouredweight || 0;
            totalOk += row.OkWeight || 0;
            totalRej += row.RejWeight || 0;
            if (row.PartNo) parts.add(row.PartNo);
        });

        return {
            totalPoured,
            totalOk,
            totalRej,
            rejectionPct: totalPoured > 0 ? (totalRej / totalPoured) * 100 : 0,
            distinctParts: parts.size,
            yieldByPoured: totalPoured > 0 ? (totalOk / totalPoured) * 100 : 0
        };
    }, [productionData]);

    // Monthly production trend
    const productionMonthlyTrend = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0) return null;

        const monthlyData = {};

        productionData.forEach(row => {
            const month = row.Month || 'Unknown';
            if (!monthlyData[month]) {
                monthlyData[month] = { poured: 0, ok: 0, rej: 0 };
            }
            monthlyData[month].poured += row.Pouredweight || 0;
            monthlyData[month].ok += row.OkWeight || 0;
            monthlyData[month].rej += row.RejWeight || 0;
        });

        const months = Object.keys(monthlyData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));

        return {
            labels: months,
            datasets: [
                {
                    type: 'bar',
                    label: 'Poured Weight',
                    data: months.map(m => monthlyData[m].poured),
                    backgroundColor: PRODUCTION_COLORS.gray.medium,
                    borderColor: PRODUCTION_COLORS.gray.solid,
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y',
                    order: 2
                },
                {
                    type: 'line',
                    label: 'OK Weight',
                    data: months.map(m => monthlyData[m].ok),
                    borderColor: PRODUCTION_COLORS.success.solid,
                    backgroundColor: PRODUCTION_COLORS.success.light,
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: PRODUCTION_COLORS.success.solid,
                    yAxisID: 'y',
                    order: 1
                },
                {
                    type: 'line',
                    label: 'Rejection %',
                    data: months.map(m => monthlyData[m].poured > 0 ? (monthlyData[m].rej / monthlyData[m].poured) * 100 : 0),
                    borderColor: PRODUCTION_COLORS.danger.solid,
                    backgroundColor: PRODUCTION_COLORS.danger.light,
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: PRODUCTION_COLORS.danger.solid,
                    yAxisID: 'y1',
                    order: 1
                }
            ]
        };
    }, [productionData]);

    // Grade-wise performance (OK vs Rejection)
    const gradePerformance = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0) return null;

        const gradeData = {};

        productionData.forEach(row => {
            const grade = row.Grade || 'Unknown';
            if (!gradeData[grade]) {
                gradeData[grade] = { ok: 0, rej: 0 };
            }
            gradeData[grade].ok += row.OkWeight || 0;
            gradeData[grade].rej += row.RejWeight || 0;
        });

        const grades = Object.keys(gradeData).sort();

        return {
            labels: grades,
            datasets: [
                {
                    label: 'OK Weight',
                    data: grades.map(g => gradeData[g].ok),
                    backgroundColor: PRODUCTION_COLORS.success.medium,
                    borderRadius: 2
                },
                {
                    label: 'Rejection Weight',
                    data: grades.map(g => gradeData[g].rej),
                    backgroundColor: PRODUCTION_COLORS.danger.medium,
                    borderRadius: 2
                }
            ]
        };
    }, [productionData]);

    // MainGrade rejection %
    const mainGradeRejection = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0) return null;

        const mainGradeData = {};

        productionData.forEach(row => {
            const mainGrade = row.MainGrade || 'Unknown';
            if (!mainGradeData[mainGrade]) {
                mainGradeData[mainGrade] = { poured: 0, rej: 0 };
            }
            mainGradeData[mainGrade].poured += row.Pouredweight || 0;
            mainGradeData[mainGrade].rej += row.RejWeight || 0;
        });

        const entries = Object.entries(mainGradeData)
            .map(([mainGrade, data]) => ({
                mainGrade,
                rejPct: data.poured > 0 ? (data.rej / data.poured) * 100 : 0
            }))
            .sort((a, b) => b.rejPct - a.rejPct);

        return {
            labels: entries.map(e => e.mainGrade),
            datasets: [{
                label: 'Rejection %',
                data: entries.map(e => e.rejPct),
                backgroundColor: entries.map(e => e.rejPct > 5 ? PRODUCTION_COLORS.danger.medium : PRODUCTION_COLORS.warning.medium),
                borderRadius: 4
            }]
        };
    }, [productionData]);

    // Part & Box Size productivity
    const partProductivity = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0) return null;

        const partData = {};

        productionData.forEach(row => {
            const partNo = row.PartNo || 'Unknown';
            const boxSize = row.BoxSize || 'Unknown';
            const key = partNo;

            if (!partData[key]) {
                partData[key] = { okWeight: 0, boxSize };
            }
            partData[key].okWeight += row.OkWeight || 0;
        });

        // Get top 10 parts by OK weight
        const top10 = Object.entries(partData)
            .sort((a, b) => b[1].okWeight - a[1].okWeight)
            .slice(0, 10);

        return {
            labels: top10.map(([part]) => part.length > 15 ? part.substring(0, 13) + '...' : part),
            fullNames: top10.map(([part]) => part),
            datasets: [{
                label: 'OK Weight (MT)',
                data: top10.map(([, data]) => data.okWeight),
                backgroundColor: PRODUCTION_COLORS.primary.medium,
                borderRadius: 4
            }]
        };
    }, [productionData]);

    // OK vs Rejection Pie Chart Data
    const okRejectionPieData = useMemo(() => {
        const okWeight = productionSummary.totalOk;
        const rejWeight = productionSummary.totalRej;
        const total = okWeight + rejWeight;

        if (total === 0) return null;

        return {
            labels: ['OK Weight', 'Rejection Weight'],
            datasets: [{
                data: [okWeight, rejWeight],
                backgroundColor: [PRODUCTION_COLORS.success.medium, PRODUCTION_COLORS.danger.medium],
                borderColor: [PRODUCTION_COLORS.success.solid, PRODUCTION_COLORS.danger.solid],
                borderWidth: 2
            }]
        };
    }, [productionSummary]);

    // Month-over-Month Growth % for OK Weight and Rejection Weight
    const momGrowthData = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0) return null;

        // Group by month
        const monthlyData = {};
        productionData.forEach(row => {
            const month = row.Month;
            if (!month) return;
            if (!monthlyData[month]) {
                monthlyData[month] = { ok: 0, rej: 0 };
            }
            monthlyData[month].ok += row.OkWeight || 0;
            monthlyData[month].rej += row.RejWeight || 0;
        });

        const months = Object.keys(monthlyData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));
        if (months.length < 2) return null;

        const okGrowth = [];
        const rejGrowth = [];
        const growthLabels = [];

        for (let i = 1; i < months.length; i++) {
            growthLabels.push(months[i]);

            const prevOk = monthlyData[months[i - 1]].ok;
            const currOk = monthlyData[months[i]].ok;
            const okGrowthPct = prevOk > 0 ? ((currOk - prevOk) / prevOk) * 100 : 0;
            okGrowth.push(parseFloat(okGrowthPct.toFixed(1)));

            const prevRej = monthlyData[months[i - 1]].rej;
            const currRej = monthlyData[months[i]].rej;
            const rejGrowthPct = prevRej > 0 ? ((currRej - prevRej) / prevRej) * 100 : 0;
            rejGrowth.push(parseFloat(rejGrowthPct.toFixed(1)));
        }

        return {
            labels: growthLabels,
            datasets: [
                {
                    label: 'OK Weight Growth %',
                    data: okGrowth,
                    borderColor: PRODUCTION_COLORS.success.solid,
                    backgroundColor: PRODUCTION_COLORS.success.light,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: okGrowth.map(v => v >= 0 ? PRODUCTION_COLORS.success.solid : PRODUCTION_COLORS.danger.solid),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 7
                },
                {
                    label: 'Rejection Weight Growth %',
                    data: rejGrowth,
                    borderColor: PRODUCTION_COLORS.danger.solid,
                    backgroundColor: PRODUCTION_COLORS.danger.light,
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: rejGrowth.map(v => v >= 0 ? PRODUCTION_COLORS.danger.solid : PRODUCTION_COLORS.success.solid),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 7
                }
            ]
        };
    }, [productionData]);

    // Monthly Yield Improvement - Bar-Line Combo Chart
    const monthlyYieldImprovementData = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0 || !Array.isArray(meltingData) || meltingData.length === 0) return null;

        // Group production data by month
        const monthlyProduction = {};
        productionData.forEach(row => {
            const month = row.Month;
            if (!month) return;
            if (!monthlyProduction[month]) {
                monthlyProduction[month] = { poured: 0, ok: 0 };
            }
            monthlyProduction[month].poured += row.Pouredweight || 0;
            monthlyProduction[month].ok += row.OkWeight || 0;
        });

        // Group melting data by month (Total Metal Produced Weight)
        const monthlyMetal = {};
        meltingData.forEach(row => {
            const month = row.Month;
            if (!month) return;
            if (!monthlyMetal[month]) {
                monthlyMetal[month] = 0;
            }
            monthlyMetal[month] += row.Metal || 0;
        });

        // Get all unique months from both datasets
        const allMonths = new Set([...Object.keys(monthlyProduction), ...Object.keys(monthlyMetal)]);
        const months = Array.from(allMonths).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));

        return {
            labels: months,
            datasets: [
                {
                    type: 'bar',
                    label: 'Yield % by Poured Weight',
                    data: months.map(m => {
                        const poured = monthlyProduction[m]?.poured || 0;
                        return monthlyMetal[m] > 0 ? (poured / monthlyMetal[m]) * 100 : 0;
                    }),
                    backgroundColor: PRODUCTION_COLORS.primary.medium,
                    borderColor: PRODUCTION_COLORS.primary.solid,
                    borderWidth: 1,
                    borderRadius: 4,
                    order: 2,
                    datalabels: {
                        display: true,
                        anchor: 'center',
                        align: 'center',
                        color: '#1F2937',
                        font: { size: 14, weight: 'bold' },
                        formatter: (value) => formatPercent(value)
                    }
                },
                {
                    type: 'line',
                    label: 'Yield % by OK Weight',
                    data: months.map(m => {
                        const ok = monthlyProduction[m]?.ok || 0;
                        return monthlyMetal[m] > 0 ? (ok / monthlyMetal[m]) * 100 : 0;
                    }),
                    borderColor: PRODUCTION_COLORS.success.solid,
                    backgroundColor: PRODUCTION_COLORS.success.light,
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: PRODUCTION_COLORS.success.solid,
                    order: 1,
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'top',
                        offset: 6,
                        color: '#374151',
                        font: { size: 14, weight: '600' },
                        formatter: (value) => formatPercent(value)
                    }
                }
            ]
        };
    }, [productionData, meltingData]);

    // MoM Growth % (Yield by Poured Weight)
    const momYieldGrowthData = useMemo(() => {
        if (!Array.isArray(productionData) || productionData.length === 0 || !Array.isArray(meltingData) || meltingData.length === 0) return null;

        // Group production data by month
        const monthlyProduction = {};
        productionData.forEach(row => {
            const month = row.Month;
            if (!month) return;
            if (!monthlyProduction[month]) {
                monthlyProduction[month] = { poured: 0, ok: 0 };
            }
            monthlyProduction[month].poured += row.Pouredweight || 0;
            monthlyProduction[month].ok += row.OkWeight || 0;
        });

        // Group melting data by month (Total Metal Produced Weight)
        const monthlyMetal = {};
        meltingData.forEach(row => {
            const month = row.Month;
            if (!month) return;
            if (!monthlyMetal[month]) {
                monthlyMetal[month] = 0;
            }
            monthlyMetal[month] += row.Metal || 0;
        });

        // Get all unique months
        const allMonths = new Set([...Object.keys(monthlyProduction), ...Object.keys(monthlyMetal)]);
        const months = Array.from(allMonths).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));
        if (months.length < 2) return null;

        const growthData = [];
        const growthLabels = [];

        for (let i = 1; i < months.length; i++) {
            growthLabels.push(months[i]);
            
            const prevMetal = monthlyMetal[months[i - 1]] || 0;
            const currMetal = monthlyMetal[months[i]] || 0;
            const prevPoured = monthlyProduction[months[i - 1]]?.poured || 0;
            const currPoured = monthlyProduction[months[i]]?.poured || 0;
            
            const prevYield = prevMetal > 0 ? (prevPoured / prevMetal) * 100 : 0;
            const currYield = currMetal > 0 ? (currPoured / currMetal) * 100 : 0;
            
            const growthPct = prevYield > 0 ? ((currYield - prevYield) / prevYield) * 100 : 0;
            growthData.push(parseFloat(growthPct.toFixed(1)));
        }

        return {
            labels: growthLabels,
            datasets: [{
                label: 'MoM Growth % (Yield by Poured Weight)',
                data: growthData,
                borderColor: PRODUCTION_COLORS.secondary.solid,
                backgroundColor: PRODUCTION_COLORS.secondary.light,
                borderWidth: 3,
                fill: false,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: growthData.map(v => v >= 0 ? PRODUCTION_COLORS.success.solid : PRODUCTION_COLORS.danger.solid),
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 8
            }]
        };
    }, [productionData, meltingData]);

    // BoxSize Chart Data Helper Function
    const getBoxSizeData = (boxSize) => {
        if (!Array.isArray(productionData) || productionData.length === 0) return null;

        // Filter for specific box size and group by month
        const monthlyBoxData = {};
        productionData.forEach(row => {
            const month = row.Month;
            const currentBoxSize = row.BoxSize;
            if (!month || currentBoxSize !== boxSize) return;

            if (!monthlyBoxData[month]) {
                monthlyBoxData[month] = { month, poured: 0, ok: 0, rej: 0 };
            }
            monthlyBoxData[month].poured += row.Pouredweight || 0;
            monthlyBoxData[month].ok += row.OkWeight || 0;
            monthlyBoxData[month].rej += row.RejWeight || 0;
        });

        // Get unique months sorted
        const months = Object.keys(monthlyBoxData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));

        if (months.length === 0) return null;

        // Labels: ['Apr 2025', 'May 2025', etc.]
        const labels = months.map(m => {
            const parts = m.split(' - ');
            return `${parts[0].substring(0, 3)} ${parts[1] || ''}`.trim();
        });

        const is24x24 = boxSize === '24*24';

        return {
            labels,
            datasets: [
                {
                    label: is24x24 ? 'Rej 24*24' : 'Rej 24*28',
                    data: months.map(m => monthlyBoxData[m].rej),
                    backgroundColor: PRODUCTION_COLORS.danger.medium,
                    borderColor: PRODUCTION_COLORS.danger.solid,
                    borderWidth: 1,
                    stack: 'stack'
                },
                {
                    label: is24x24 ? 'OK 24*24' : 'OK 24*28',
                    data: months.map(m => monthlyBoxData[m].ok),
                    backgroundColor: is24x24 ? PRODUCTION_COLORS.success.medium : PRODUCTION_COLORS.purple.medium,
                    borderColor: is24x24 ? PRODUCTION_COLORS.success.solid : PRODUCTION_COLORS.purple.solid,
                    borderWidth: 1,
                    stack: 'stack'
                },
                {
                    label: is24x24 ? 'Poured 24*24' : 'Poured 24*28',
                    data: months.map(m => monthlyBoxData[m].poured),
                    backgroundColor: is24x24 ? PRODUCTION_COLORS.primary.medium : PRODUCTION_COLORS.teal.medium,
                    borderColor: is24x24 ? PRODUCTION_COLORS.primary.solid : PRODUCTION_COLORS.teal.solid,
                    borderWidth: 1,
                    stack: 'stack'
                }
            ]
        };
    };

    // BoxSize Charts - Separate charts for 24*24 and 24*28
    const boxSize24Data = useMemo(() => getBoxSizeData('24*24'), [productionData]);
    const boxSize28Data = useMemo(() => getBoxSizeData('24*28'), [productionData]);

    // Legacy data for backward compatibility (used by expanded chart)
    const boxSizeStackedData = boxSize24Data && boxSize28Data ? { ...boxSize24Data } : null;

    // Chart options
    const comboChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.raw;
                        if (context.dataset.yAxisID === 'y1') {
                            return `${context.dataset.label}: ${formatNumber(value)}`;
                        }
                        return `${context.dataset.label}: ${formatWeight(value)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                title: { display: true, text: 'Weight (MT)' },
                ticks: { callback: (value) => formatWeight(value) }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                title: { display: true, text: 'Count' },
                grid: { drawOnChartArea: false }
            }
        }
    };

    const productionComboOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = context.raw;
                        if (context.dataset.yAxisID === 'y1') {
                            return `${context.dataset.label}: ${formatPercent(value)}`;
                        }
                        return `${context.dataset.label}: ${formatWeight(value)}`;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                title: { display: true, text: 'Weight (MT)' },
                ticks: { callback: (value) => formatWeight(value) }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                title: { display: true, text: 'Rejection %' },
                grid: { drawOnChartArea: false },
                ticks: { callback: (value) => `${value}%` }
            }
        }
    };

    const stackedBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatWeight(context.raw)}`
                }
            }
        },
        scales: {
            x: { stacked: true },
            y: {
                stacked: true,
                beginAtZero: true,
                ticks: { callback: (value) => formatWeight(value) }
            }
        }
    };

    const horizontalBarOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (tooltipItems) => {
                        if (partProductivity && partProductivity.fullNames) {
                            return partProductivity.fullNames[tooltipItems[0].dataIndex];
                        }
                        return tooltipItems[0].label;
                    },
                    label: (context) => `${formatWeight(context.raw)}`
                }
            },
            datalabels: {
                display: true,
                anchor: 'end',
                align: 'end',
                offset: 4,
                color: '#1F2937',
                font: {
                    weight: 'bold',
                    size: 13
                },
                formatter: (value) => formatWeight(value)
            }
        },
        layout: {
            padding: { right: 50 }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { callback: (value) => formatWeight(value) }
            }
        }
    }), [partProductivity]);

    const rejectionBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `Rejection: ${formatPercent(context.raw)}`
                }
            },
            datalabels: {
                display: true,
                color: '#000000',
                anchor: 'center',
                align: 'center',
                font: { weight: 'bold', size: 14 },
                formatter: (value) => formatPercent(value)
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { callback: (value) => `${value}%` }
            }
        }
    };

    // Monthly Yield Improvement chart options (bar-line combo)
    const yieldImprovementOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' },
            tooltip: {
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatPercent(context.raw)}`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                title: { display: true, text: 'Yield %' },
                ticks: { callback: (value) => `${value.toFixed(0)}%` }
            }
        }
    };

    // Preset button style - matches FinanceDashboard
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

    // Chart card style - matches FinanceDashboard
    const chartCardStyle = {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s'
    };

    const isLoading = meltingLoading || productionLoading;

    return (
        <div className="dashboard-container">
            {/* Fullscreen Chart Modal - matches FinanceDashboard pattern */}
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
                    <h1>🏭 Production Dashboard</h1>
                    <p className="welcome-text">Melting & Production Performance Analytics</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ExportButtons
                        chartRefs={[
                            { ref: meltingTrendChartRef, title: 'Monthly Metal & Heats Trend' },
                            { ref: gradeBreakdownChartRef, title: 'Grade-wise Production Breakdown' },
                            { ref: heatEfficiencyChartRef, title: 'Heat Efficiency by Grade' },
                            { ref: productionTrendChartRef, title: 'Monthly Production Trend' },
                            { ref: gradePerformanceChartRef, title: 'Grade-wise Performance' },
                            { ref: rejectionChartRef, title: 'MainGrade Rejection %' },
                            { ref: partProductivityChartRef, title: 'Part Productivity' }
                        ]}
                        fileName={`production-dashboard-${format(new Date(), 'yyyy-MM-dd')}`}
                        title="Production Dashboard Report"
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
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Heats</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatNumber(meltingSummary.totalHeats)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Metal Produced Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(meltingSummary.totalMetal)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Avg Metal per Heat</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : `${meltingSummary.avgMetalPerHeat.toFixed(1)} kg`}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Active Grades</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : meltingSummary.activeGrades}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Poured Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(productionSummary.totalPoured)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total OK Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(productionSummary.totalOk)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Total Rejection Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatWeight(productionSummary.totalRej)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Rejection %</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(productionSummary.rejectionPct)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Distinct Parts</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : productionSummary.distinctParts}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Yield % by Poured Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(meltingSummary.totalMetal > 0 ? (productionSummary.totalPoured / meltingSummary.totalMetal) * 100 : 0)}
                    </div>
                </div>

                <div className="kpi-card">
                    <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>Yield % by OK Weight</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '700', marginTop: '0.5rem' }}>
                        {isLoading ? '...' : formatPercent(meltingSummary.totalMetal > 0 ? (productionSummary.totalOk / meltingSummary.totalMetal) * 100 : 0)}
                    </div>
                </div>
            </div>

            {/* Monthly Metal & Heats Trend */}
            <div
                ref={meltingTrendChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📈 Monthly Metal & Heats Trend',
                    content: meltingMonthlyTrend ? (
                        <Bar data={meltingMonthlyTrend} options={comboChartOptions} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Monthly Metal & Heats Trend</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : meltingMonthlyTrend ? (
                        <Bar data={meltingMonthlyTrend} options={comboChartOptions} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* Monthly Production Trend */}
            <div
                ref={productionTrendChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📈 Monthly Production Trend',
                    content: productionMonthlyTrend ? (
                        <Bar data={productionMonthlyTrend} options={productionComboOptions} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 Monthly Production Trend</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : productionMonthlyTrend ? (
                        <Bar data={productionMonthlyTrend} options={productionComboOptions} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* Four Charts in 2x2 Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Grade-wise Production */}
                <div
                    ref={gradeBreakdownChartRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📊 Grade-wise Production (TreeMap)',
                        content: gradeBreakdown ? (
                            <SafeTreeMapChart data={gradeBreakdown} responsive={true} colorPalette={PRODUCTION_COLORS.palette} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Grade-wise Production</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : gradeBreakdown ? (
                            <SafeTreeMapChart data={gradeBreakdown} width={600} height={350} colorPalette={PRODUCTION_COLORS.palette} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* Grade-wise OK vs Rejection */}
                <div
                    ref={gradePerformanceChartRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📊 Grade-wise OK vs Rejection Weight',
                        content: gradePerformance ? (
                            <Bar data={gradePerformance} options={stackedBarOptions} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Grade-wise OK vs Rejection</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : gradePerformance ? (
                            <Bar data={gradePerformance} options={stackedBarOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* MainGrade Rejection % */}
                <div
                    ref={rejectionChartRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '⚠️ MainGrade Rejection %',
                        content: mainGradeRejection ? (
                            <Bar data={mainGradeRejection} options={rejectionBarOptions} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>⚠️ MainGrade Rejection %</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : mainGradeRejection ? (
                            <Bar data={mainGradeRejection} options={rejectionBarOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* OK vs Rejection Pie Chart */}
                <div
                    ref={okRejectionPieRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '🥧 OK vs Rejection Weight %',
                        content: okRejectionPieData ? (
                            <Pie data={okRejectionPieData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom' },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => {
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const pct = ((context.raw / total) * 100).toFixed(1);
                                                return `${context.label}: ${formatWeight(context.raw)} (${pct}%)`;
                                            }
                                        }
                                    },
                                    datalabels: {
                                        display: true,
                                        color: '#000',
                                        font: { weight: 'bold', size: 14 },
                                        formatter: (value, context) => {
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                            const pct = ((value / total) * 100).toFixed(1);
                                            return `${pct}%`;
                                        }
                                    }
                                }
                            }} plugins={[ChartDataLabels]} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🥧 OK vs Rejection Weight</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : okRejectionPieData ? (
                            <Pie data={okRejectionPieData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom' },
                                    tooltip: {
                                        callbacks: {
                                            label: (context) => {
                                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                                const pct = ((context.raw / total) * 100).toFixed(1);
                                                return `${context.label}: ${formatWeight(context.raw)} (${pct}%)`;
                                            }
                                        }
                                    },
                                    datalabels: {
                                        display: true,
                                        color: '#000',
                                        font: { weight: 'bold', size: 14 },
                                        formatter: (value, context) => {
                                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                            const pct = ((value / total) * 100).toFixed(1);
                                            return `${pct}%`;
                                        }
                                    }
                                }
                            }} plugins={[ChartDataLabels]} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Part Productivity (Full Width) */}
            <div
                ref={partProductivityChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '🔧 Top Parts by OK Weight',
                    content: partProductivity ? (
                        <Bar data={partProductivity} options={horizontalBarOptions} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>🔧 Top Parts by OK Weight</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : partProductivity ? (
                        <Bar data={partProductivity} options={horizontalBarOptions} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* MoM Growth % Chart - Styled like Finance Dashboard */}
            <div
                ref={momGrowthChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📈 Month-over-Month Growth %',
                    content: momGrowthData ? (
                        <Line data={momGrowthData} options={{
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
                                    color: (context) => {
                                        const value = context.dataset.data[context.dataIndex];
                                        const isOkWeight = context.dataset.label.includes('OK');
                                        // For OK Weight: positive is good (green), negative is bad (red)
                                        // For Rejection: positive is bad (red), negative is good (green)
                                        if (isOkWeight) {
                                            return value >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
                                        } else {
                                            return value >= 0 ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)';
                                        }
                                    },
                                    anchor: 'center',
                                    align: (context) => {
                                        const datasetIndex = context.datasetIndex;
                                        const dataIndex = context.dataIndex;
                                        const datasets = context.chart.data.datasets;
                                        const currentVal = datasets[datasetIndex].data[dataIndex];
                                        const otherVal = datasets[datasetIndex === 0 ? 1 : 0].data[dataIndex];
                                        return currentVal >= otherVal ? 'top' : 'bottom';
                                    },
                                    offset: 6,
                                    font: { weight: 'bold', size: 15 },
                                    formatter: (value) => value !== 0 ? `${value > 0 ? '+' : ''}${value}%` : ''
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: false,
                                    ticks: { callback: (value) => `${value}%` },
                                    grid: {
                                        color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'
                                    }
                                },
                                x: { grid: { display: false } }
                            },
                            layout: { padding: { top: 20 } }
                        }} plugins={[ChartDataLabels]} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 MoM Growth % (OK vs Rejection)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '400px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : momGrowthData ? (
                        <Line data={momGrowthData} options={{
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
                                    color: (context) => {
                                        const value = context.dataset.data[context.dataIndex];
                                        const isOkWeight = context.dataset.label.includes('OK');
                                        // For OK Weight: positive is good (green), negative is bad (red)
                                        // For Rejection: positive is bad (red), negative is good (green)
                                        if (isOkWeight) {
                                            return value >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
                                        } else {
                                            return value >= 0 ? 'rgba(239, 68, 68, 1)' : 'rgba(34, 197, 94, 1)';
                                        }
                                    },
                                    anchor: 'center',
                                    align: (context) => {
                                        const datasetIndex = context.datasetIndex;
                                        const dataIndex = context.dataIndex;
                                        const datasets = context.chart.data.datasets;
                                        const currentVal = datasets[datasetIndex].data[dataIndex];
                                        const otherVal = datasets[datasetIndex === 0 ? 1 : 0].data[dataIndex];
                                        return currentVal >= otherVal ? 'top' : 'bottom';
                                    },
                                    offset: 6,
                                    font: { weight: 'bold', size: 15 },
                                    formatter: (value) => value !== 0 ? `${value > 0 ? '+' : ''}${value}%` : ''
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: false,
                                    ticks: { callback: (value) => `${value}%` },
                                    grid: {
                                        color: (context) => context.tick.value === 0 ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)'
                                    }
                                },
                                x: { grid: { display: false } }
                            },
                            layout: { padding: { top: 20 } }
                        }} plugins={[ChartDataLabels]} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available (need at least 2 months)</div>
                    )}
                </div>
            </div>

            {/* New Charts Grid - Monthly Yield & MoM Growth */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Monthly Yield Improvement Chart */}
                <div
                    ref={monthlyYieldImprovementRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📊 Monthly Yield Improvement (%)',
                        content: monthlyYieldImprovementData ? (
                            <Bar data={monthlyYieldImprovementData} options={yieldImprovementOptions} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Monthly Yield Improvement (%)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : monthlyYieldImprovementData ? (
                            <Bar data={monthlyYieldImprovementData} options={yieldImprovementOptions} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                        )}
                    </div>
                </div>

                {/* MoM Growth % (Yield by Poured Weight) Chart */}
                <div
                    ref={momYieldGrowthRef}
                    style={chartCardStyle}
                    onClick={() => setExpandedChart({
                        title: '📈 MoM Growth % (Yield by Poured Weight)',
                        content: momYieldGrowthData ? (
                            <Line data={momYieldGrowthData} options={getMoMGrowthOptions()} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 MoM Growth % (Yield by Poured Weight)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '350px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : momYieldGrowthData ? (
                            <Line data={momYieldGrowthData} options={getMoMGrowthOptions()} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available (need at least 2 months)</div>
                        )}
                    </div>
                </div>
            </div>

            {/* BoxSize Production Charts - 24x24 and 24x28 as separate charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* 24x24 Chart */}
                <div
                    ref={boxSizeStackedChartRef}
                    style={{ ...chartCardStyle }}
                    onClick={() => setExpandedChart({
                        title: '📦 BoxSize Production (24x24)',
                        content: boxSize24Data ? (
                            <Bar data={boxSize24Data} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' },
                                    tooltip: {
                                        callbacks: {
                                            title: () => '',
                                            label: (context) => {
                                                const label = context.dataset.label || '';
                                                let type = 'Weight';
                                                if (label.toLowerCase().includes('rej')) type = 'Rejection Weight';
                                                else if (label.toLowerCase().includes('ok')) type = 'OK Weight';
                                                else if (label.toLowerCase().includes('poured')) type = 'Poured Weight';
                                                return `${type}: ${formatWeight(context.raw)}`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        stacked: true,
                                        grid: { display: false },
                                        ticks: { font: { weight: 'bold' } }
                                    },
                                    y: {
                                        stacked: true,
                                        beginAtZero: true,
                                        ticks: { callback: (value) => formatWeight(value) },
                                        grid: { color: 'rgba(0,0,0,0.05)' }
                                    }
                                },
                                barPercentage: 0.9,
                                categoryPercentage: 0.8
                            }} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📦 BoxSize Production (24x24)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : boxSize24Data ? (
                            <Bar data={boxSize24Data} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' },
                                    tooltip: {
                                        callbacks: {
                                            title: () => '',
                                            label: (context) => {
                                                const label = context.dataset.label || '';
                                                let type = 'Weight';
                                                if (label.toLowerCase().includes('rej')) type = 'Rejection Weight';
                                                else if (label.toLowerCase().includes('ok')) type = 'OK Weight';
                                                else if (label.toLowerCase().includes('poured')) type = 'Poured Weight';
                                                return `${type}: ${formatWeight(context.raw)}`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        stacked: true,
                                        grid: { display: false },
                                        ticks: { font: { weight: 'bold' } }
                                    },
                                    y: {
                                        stacked: true,
                                        beginAtZero: true,
                                        ticks: { callback: (value) => formatWeight(value) },
                                        grid: { color: 'rgba(0,0,0,0.05)' }
                                    }
                                },
                                barPercentage: 0.9,
                                categoryPercentage: 0.8
                            }} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available for 24x24 box size</div>
                        )}
                    </div>
                </div>

                {/* 24x28 Chart */}
                <div
                    style={{ ...chartCardStyle }}
                    onClick={() => setExpandedChart({
                        title: '📦 BoxSize Production (24x28)',
                        content: boxSize28Data ? (
                            <Bar data={boxSize28Data} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' },
                                    tooltip: {
                                        callbacks: {
                                            title: () => '',
                                            label: (context) => {
                                                const label = context.dataset.label || '';
                                                let type = 'Weight';
                                                if (label.toLowerCase().includes('rej')) type = 'Rejection Weight';
                                                else if (label.toLowerCase().includes('ok')) type = 'OK Weight';
                                                else if (label.toLowerCase().includes('poured')) type = 'Poured Weight';
                                                return `${type}: ${formatWeight(context.raw)}`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        stacked: true,
                                        grid: { display: false },
                                        ticks: { font: { weight: 'bold' } }
                                    },
                                    y: {
                                        stacked: true,
                                        beginAtZero: true,
                                        ticks: { callback: (value) => formatWeight(value) },
                                        grid: { color: 'rgba(0,0,0,0.05)' }
                                    }
                                },
                                barPercentage: 0.9,
                                categoryPercentage: 0.8
                            }} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📦 BoxSize Production (24x28)</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '400px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : boxSize28Data ? (
                            <Bar data={boxSize28Data} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'top' },
                                    tooltip: {
                                        callbacks: {
                                            title: () => '',
                                            label: (context) => {
                                                const label = context.dataset.label || '';
                                                let type = 'Weight';
                                                if (label.toLowerCase().includes('rej')) type = 'Rejection Weight';
                                                else if (label.toLowerCase().includes('ok')) type = 'OK Weight';
                                                else if (label.toLowerCase().includes('poured')) type = 'Poured Weight';
                                                return `${type}: ${formatWeight(context.raw)}`;
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    x: {
                                        stacked: true,
                                        grid: { display: false },
                                        ticks: { font: { weight: 'bold' } }
                                    },
                                    y: {
                                        stacked: true,
                                        beginAtZero: true,
                                        ticks: { callback: (value) => formatWeight(value) },
                                        grid: { color: 'rgba(0,0,0,0.05)' }
                                    }
                                },
                                barPercentage: 0.9,
                                categoryPercentage: 0.8
                            }} />
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available for 24x28 box size</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductionDashboard;
