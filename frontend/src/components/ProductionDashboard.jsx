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

// Disable datalabels globally by default
ChartJS.defaults.plugins.datalabels = { display: false };

// Set global darker font colors
ChartJS.defaults.color = '#111827';
ChartJS.defaults.plugins.legend.labels.color = '#111827';
ChartJS.defaults.plugins.title.color = '#030712';
ChartJS.defaults.scale.ticks.color = '#1f2937';
ChartJS.defaults.scale.title.color = '#1f2937';

// Set global font sizes
ChartJS.defaults.font.size = 13;
ChartJS.defaults.plugins.legend.labels.font = { size: 13 };
ChartJS.defaults.plugins.title.font = { size: 15, weight: 'bold' };
ChartJS.defaults.scale.ticks.font = { size: 12 };
ChartJS.defaults.scale.title.font = { size: 13 };

const REFRESH_INTERVAL = 120000; // 2 minutes

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
        if (!meltingData || meltingData.length === 0) {
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
        if (!meltingData || meltingData.length === 0) return null;

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
                    backgroundColor: 'rgba(59, 130, 246, 0.85)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Heats',
                    data: months.map(m => monthlyData[m].heats),
                    borderColor: 'rgba(245, 158, 11, 1)',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                    yAxisID: 'y1'
                }
            ]
        };
    }, [meltingData]);

    // Grade-wise production breakdown
    const gradeBreakdown = useMemo(() => {
        if (!meltingData || meltingData.length === 0) return null;

        const monthGradeData = {};
        const allGrades = new Set();

        meltingData.forEach(row => {
            const month = row.Month || 'Unknown';
            const grade = row.Grade || 'Unknown';
            allGrades.add(grade);

            if (!monthGradeData[month]) {
                monthGradeData[month] = {};
            }
            monthGradeData[month][grade] = (monthGradeData[month][grade] || 0) + (row.Metal || 0);
        });

        const months = Object.keys(monthGradeData).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));
        const grades = Array.from(allGrades).sort();

        const colors = [
            'rgba(59, 130, 246, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(245, 158, 11, 0.85)',
            'rgba(139, 92, 246, 0.85)',
            'rgba(236, 72, 153, 0.85)',
            'rgba(20, 184, 166, 0.85)',
            'rgba(99, 102, 241, 0.85)',
            'rgba(251, 146, 60, 0.85)'
        ];

        return {
            labels: months,
            datasets: grades.map((grade, i) => ({
                label: grade,
                data: months.map(m => monthGradeData[m][grade] || 0),
                backgroundColor: colors[i % colors.length],
                borderRadius: 2
            }))
        };
    }, [meltingData]);

    // Heat efficiency by grade
    const heatEfficiency = useMemo(() => {
        if (!meltingData || meltingData.length === 0) return null;

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
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                borderColor: 'rgba(37, 99, 235, 1)',
                borderWidth: 1,
                borderRadius: 4
            }]
        };
    }, [meltingData]);

    // ============================================
    // PRODUCTION SECTION - KPIs and Charts
    // ============================================

    const productionSummary = useMemo(() => {
        if (!productionData || productionData.length === 0) {
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
        if (!productionData || productionData.length === 0) return null;

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
                    backgroundColor: 'rgba(156, 163, 175, 0.85)',
                    borderColor: 'rgba(107, 114, 128, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'OK Weight',
                    data: months.map(m => monthlyData[m].ok),
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(16, 185, 129, 1)',
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Rejection %',
                    data: months.map(m => monthlyData[m].poured > 0 ? (monthlyData[m].rej / monthlyData[m].poured) * 100 : 0),
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                    yAxisID: 'y1'
                }
            ]
        };
    }, [productionData]);

    // Grade-wise performance (OK vs Rejection)
    const gradePerformance = useMemo(() => {
        if (!productionData || productionData.length === 0) return null;

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
                    backgroundColor: 'rgba(16, 185, 129, 0.85)',
                    borderRadius: 2
                },
                {
                    label: 'Rejection Weight',
                    data: grades.map(g => gradeData[g].rej),
                    backgroundColor: 'rgba(239, 68, 68, 0.85)',
                    borderRadius: 2
                }
            ]
        };
    }, [productionData]);

    // MainGrade rejection %
    const mainGradeRejection = useMemo(() => {
        if (!productionData || productionData.length === 0) return null;

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
                backgroundColor: entries.map(e => e.rejPct > 5 ? 'rgba(239, 68, 68, 0.85)' : 'rgba(245, 158, 11, 0.85)'),
                borderRadius: 4
            }]
        };
    }, [productionData]);

    // Part & Box Size productivity
    const partProductivity = useMemo(() => {
        if (!productionData || productionData.length === 0) return null;

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

        // Get top 15 parts by OK weight
        const top15 = Object.entries(partData)
            .sort((a, b) => b[1].okWeight - a[1].okWeight)
            .slice(0, 15);

        return {
            labels: top15.map(([part]) => part),
            datasets: [{
                label: 'OK Weight (MT)',
                data: top15.map(([, data]) => data.okWeight),
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
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
                backgroundColor: ['rgba(16, 185, 129, 0.85)', 'rgba(239, 68, 68, 0.85)'],
                borderColor: ['rgba(16, 185, 129, 1)', 'rgba(239, 68, 68, 1)'],
                borderWidth: 2
            }]
        };
    }, [productionSummary]);

    // Month-over-Month Growth % for OK Weight and Rejection Weight
    const momGrowthData = useMemo(() => {
        if (!productionData || productionData.length === 0) return null;

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
                    borderColor: 'rgba(16, 185, 129, 1)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: okGrowth.map(v => v >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 7
                },
                {
                    label: 'Rejection Weight Growth %',
                    data: rejGrowth,
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: rejGrowth.map(v => v >= 0 ? 'rgba(239, 68, 68, 1)' : 'rgba(16, 185, 129, 1)'),
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 7
                }
            ]
        };
    }, [productionData]);

    // BoxSize Stacked Chart (24*24 and 24*28) by Month - Two-level X-axis
    const boxSizeStackedData = useMemo(() => {
        if (!productionData || productionData.length === 0) return null;

        // Filter for only 24*24 and 24*28 box sizes and group by month
        const monthlyBoxData = {};
        productionData.forEach(row => {
            const month = row.Month;
            const boxSize = row.BoxSize;
            if (!month || !boxSize) return;
            
            // Only include 24*24 and 24*28
            if (boxSize !== '24*24' && boxSize !== '24*28') return;

            const key = `${month}|${boxSize}`;
            if (!monthlyBoxData[key]) {
                monthlyBoxData[key] = { month, boxSize, poured: 0, ok: 0, rej: 0 };
            }
            monthlyBoxData[key].poured += row.Pouredweight || 0;
            monthlyBoxData[key].ok += row.OkWeight || 0;
            monthlyBoxData[key].rej += row.RejWeight || 0;
        });

        // Get unique months sorted
        const monthsSet = new Set();
        Object.values(monthlyBoxData).forEach(d => monthsSet.add(d.month));
        const months = Array.from(monthsSet).sort((a, b) => parseMonthKey(a) - parseMonthKey(b));

        if (months.length === 0) return null;

        // Two-level labels: [['24*24    24*28', 'Month']] for each month
        const labels = months.map(m => {
            const parts = m.split(' - ');
            const monthLabel = `${parts[0].substring(0, 3)} ${parts[1] || ''}`.trim();
            return ['24*24    24*28', monthLabel];
        });

        // Prepare data arrays for each BoxSize
        const rej24x24 = [];
        const ok24x24 = [];
        const poured24x24 = [];
        const rej24x28 = [];
        const ok24x28 = [];
        const poured24x28 = [];

        months.forEach(month => {
            const data24x24 = monthlyBoxData[`${month}|24*24`] || { poured: 0, ok: 0, rej: 0 };
            rej24x24.push(data24x24.rej);
            ok24x24.push(data24x24.ok);
            poured24x24.push(data24x24.poured);

            const data24x28 = monthlyBoxData[`${month}|24*28`] || { poured: 0, ok: 0, rej: 0 };
            rej24x28.push(data24x28.rej);
            ok24x28.push(data24x28.ok);
            poured24x28.push(data24x28.poured);
        });

        return {
            labels,
            datasets: [
                // 24*24 stack - BLUE color palette (Rejection bottom, OK middle, Poured top)
                {
                    label: 'Rej 24*24',
                    data: rej24x24,
                    backgroundColor: 'rgba(220, 38, 38, 0.9)',
                    borderColor: 'rgba(185, 28, 28, 1)',
                    borderWidth: 1,
                    stack: '24*24',
                    barPercentage: 0.95,
                    categoryPercentage: 0.7
                },
                {
                    label: 'OK 24*24',
                    data: ok24x24,
                    backgroundColor: 'rgba(59, 130, 246, 0.9)',
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1,
                    stack: '24*24',
                    barPercentage: 0.95,
                    categoryPercentage: 0.7
                },
                {
                    label: 'Poured 24*24',
                    data: poured24x24,
                    backgroundColor: 'rgba(147, 197, 253, 0.9)',
                    borderColor: 'rgba(96, 165, 250, 1)',
                    borderWidth: 1,
                    stack: '24*24',
                    barPercentage: 0.95,
                    categoryPercentage: 0.7
                },
                // 24*28 stack - ORANGE color palette (Rejection bottom, OK middle, Poured top)
                {
                    label: 'Rej 24*28',
                    data: rej24x28,
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgba(220, 38, 38, 1)',
                    borderWidth: 1,
                    stack: '24*28',
                    barPercentage: 0.95,
                    categoryPercentage: 0.7
                },
                {
                    label: 'OK 24*28',
                    data: ok24x28,
                    backgroundColor: 'rgba(249, 115, 22, 0.9)',
                    borderColor: 'rgba(234, 88, 12, 1)',
                    borderWidth: 1,
                    stack: '24*28',
                    barPercentage: 0.95,
                    categoryPercentage: 0.7
                },
                {
                    label: 'Poured 24*28',
                    data: poured24x28,
                    backgroundColor: 'rgba(253, 186, 116, 0.9)',
                    borderColor: 'rgba(251, 146, 60, 1)',
                    borderWidth: 1,
                    stack: '24*28',
                    barPercentage: 0.95,
                    categoryPercentage: 0.7
                }
            ]
        };
    }, [productionData]);

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

    const horizontalBarOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context) => `${formatWeight(context.raw)}`
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { callback: (value) => formatWeight(value) }
            }
        }
    };

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
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: { callback: (value) => `${value}%` }
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
                <div style={{ height: '320px' }}>
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
                <div style={{ height: '320px' }}>
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
                        title: '📊 Grade-wise Production Breakdown',
                        content: gradeBreakdown ? (
                            <Bar data={gradeBreakdown} options={stackedBarOptions} />
                        ) : <div>No data available</div>
                    })}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
                >
                    <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📊 Grade-wise Production</h3>
                        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                    </div>
                    <div style={{ height: '280px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                        ) : gradeBreakdown ? (
                            <Bar data={gradeBreakdown} options={stackedBarOptions} />
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
                    <div style={{ height: '280px' }}>
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
                    <div style={{ height: '280px' }}>
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
                    <div style={{ height: '280px' }}>
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
                <div style={{ height: '320px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : partProductivity ? (
                        <Bar data={partProductivity} options={horizontalBarOptions} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available</div>
                    )}
                </div>
            </div>

            {/* MoM Growth % Chart */}
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
                                        label: (context) => `${context.dataset.label}: ${context.raw}%`
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: false,
                                    ticks: { callback: (value) => `${value}%` },
                                    grid: { color: 'rgba(0,0,0,0.05)' }
                                },
                                x: { grid: { display: false } }
                            }
                        }} />
                    ) : <div>No data available</div>
                })}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'; }}
            >
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📈 MoM Growth % (OK vs Rejection)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '320px' }}>
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
                                        label: (context) => `${context.dataset.label}: ${context.raw}%`
                                    }
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: false,
                                    ticks: { callback: (value) => `${value}%` },
                                    grid: { color: 'rgba(0,0,0,0.05)' }
                                },
                                x: { grid: { display: false } }
                            }
                        }} />
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available (need at least 2 months)</div>
                    )}
                </div>
            </div>

            {/* BoxSize Stacked Chart (24x24 vs 24x28) */}
            <div
                ref={boxSizeStackedChartRef}
                style={{ ...chartCardStyle, marginBottom: '1.5rem' }}
                onClick={() => setExpandedChart({
                    title: '📦 BoxSize Production (24x24 vs 24x28)',
                    content: boxSizeStackedData ? (
                        <Bar data={boxSizeStackedData} options={{
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
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#1F2937' }}>📦 BoxSize Production (24x24 vs 24x28)</h3>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Click to expand</span>
                </div>
                <div style={{ height: '320px' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading...</div>
                    ) : boxSizeStackedData ? (
                        <Bar data={boxSizeStackedData} options={{
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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>No data available for 24x24 or 24x28 box sizes</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductionDashboard;
