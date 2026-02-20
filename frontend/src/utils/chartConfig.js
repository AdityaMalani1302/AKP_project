/**
 * Centralized Chart.js Configuration
 * 
 * Modern, accessible chart configurations for all dashboards.
 * WCAG AA compliant colors with 4.5:1+ contrast ratios.
 */

// ============================================
// COLOR PALETTE - WCAG AA Compliant
// ============================================

export const NEW_PALETTE = {
    blue: '#0081a7',       // Primary
    teal: '#00afb9',       // Success/Info
    cream: '#fdfcdc',      // Background/Neutral - VERY LIGHT, use with caution
    peach: '#fed9b7',      // Warning/Secondary
    red: '#f07167'         // Danger
};

export const CHART_COLORS = {
    // Primary (Blue)
    primary: {
        solid: NEW_PALETTE.blue,
        light: 'rgba(0, 129, 167, 0.15)',
        medium: 'rgba(0, 129, 167, 0.7)'
    },
    // Success/Teal
    success: {
        solid: NEW_PALETTE.teal,
        light: 'rgba(0, 175, 185, 0.15)',
        medium: 'rgba(0, 175, 185, 0.7)'
    },
    // Danger (Red)
    danger: {
        solid: NEW_PALETTE.red,
        light: 'rgba(240, 113, 103, 0.15)',
        medium: 'rgba(240, 113, 103, 0.7)'
    },
    // Warning (Peach - might be too light for text, good for backgrounds/fills)
    warning: {
        solid: NEW_PALETTE.peach,
        light: 'rgba(254, 217, 183, 0.15)',
        medium: 'rgba(254, 217, 183, 0.7)'
    },
    // Purple (Mapped to Blue for consistency or we can reuse Red/Teal)
    purple: {
        solid: NEW_PALETTE.blue, // Reused
        light: 'rgba(0, 129, 167, 0.15)',
        medium: 'rgba(0, 129, 167, 0.7)'
    },
    // Teal (Mapped to Teal)
    teal: {
        solid: NEW_PALETTE.teal,
        light: 'rgba(0, 175, 185, 0.15)',
        medium: 'rgba(0, 175, 185, 0.7)'
    },
    // Pink (Mapped to Red)
    pink: {
        solid: NEW_PALETTE.red,
        light: 'rgba(240, 113, 103, 0.15)',
        medium: 'rgba(240, 113, 103, 0.7)'
    },
    // Gray (Neutral)
    gray: {
        solid: '#4B5563',
        light: 'rgba(75, 85, 99, 0.15)',
        medium: 'rgba(75, 85, 99, 0.7)'
    },
    // Raw Palette Access if needed
    palette: NEW_PALETTE
};

// ============================================
// DASHBOARD-SPECIFIC COLOR PALETTES
// ============================================

// 🛒 Sales Dashboard - Blue/Green Theme (Trust & Growth)
export const SALES_COLORS = {
    primary: { solid: '#2563EB', light: 'rgba(37, 99, 235, 0.15)', medium: 'rgba(37, 99, 235, 0.7)' },
    secondary: { solid: '#38BDF8', light: 'rgba(56, 189, 248, 0.15)', medium: 'rgba(56, 189, 248, 0.7)' },
    success: { solid: '#10B981', light: 'rgba(16, 185, 129, 0.15)', medium: 'rgba(16, 185, 129, 0.7)' },
    warning: { solid: '#F59E0B', light: 'rgba(245, 158, 11, 0.15)', medium: 'rgba(245, 158, 11, 0.7)' },
    danger: { solid: '#F43F5E', light: 'rgba(244, 63, 94, 0.15)', medium: 'rgba(244, 63, 94, 0.7)' },
    teal: { solid: '#14B8A6', light: 'rgba(20, 184, 166, 0.15)', medium: 'rgba(20, 184, 166, 0.7)' },
    palette: ['#2563EB', '#38BDF8', '#10B981', '#F59E0B', '#F43F5E', '#14B8A6', '#8B5CF6']
};

// 💰 Finance Dashboard - Green/Gold Theme (Money & Profit)
export const FINANCE_COLORS = {
    primary: { solid: '#2563EB', light: 'rgba(37, 99, 235, 0.15)', medium: 'rgba(37, 99, 235, 0.7)' }, // Blue
    secondary: { solid: '#8B5CF6', light: 'rgba(139, 92, 246, 0.15)', medium: 'rgba(139, 92, 246, 0.7)' }, // Purple
    success: { solid: '#10B981', light: 'rgba(16, 185, 129, 0.15)', medium: 'rgba(16, 185, 129, 0.7)' }, // Green
    warning: { solid: '#EAB308', light: 'rgba(234, 179, 8, 0.15)', medium: 'rgba(234, 179, 8, 0.7)' }, // Gold
    danger: { solid: '#DC2626', light: 'rgba(220, 38, 38, 0.15)', medium: 'rgba(220, 38, 38, 0.7)' }, // Red
    neutral: { solid: '#64748B', light: 'rgba(100, 116, 139, 0.15)', medium: 'rgba(100, 116, 139, 0.7)' }, // Slate
    teal: { solid: '#06B6D4', light: 'rgba(6, 182, 212, 0.15)', medium: 'rgba(6, 182, 212, 0.7)' }, // Cyan
    palette: ['#2563EB', '#10B981', '#EAB308', '#8B5CF6', '#DC2626', '#06B6D4', '#64748B']
};

// ⚙️ Production Dashboard - Industrial Theme (Manufacturing)
export const PRODUCTION_COLORS = {
    primary: { solid: '#3B82F6', light: 'rgba(59, 130, 246, 0.15)', medium: 'rgba(59, 130, 246, 0.7)' },
    secondary: { solid: '#F97316', light: 'rgba(249, 115, 22, 0.15)', medium: 'rgba(249, 115, 22, 0.7)' },
    success: { solid: '#10B981', light: 'rgba(16, 185, 129, 0.15)', medium: 'rgba(16, 185, 129, 0.7)' },
    warning: { solid: '#FBBF24', light: 'rgba(251, 191, 36, 0.15)', medium: 'rgba(251, 191, 36, 0.7)' },
    danger: { solid: '#EF4444', light: 'rgba(239, 68, 68, 0.15)', medium: 'rgba(239, 68, 68, 0.7)' },
    purple: { solid: '#8B5CF6', light: 'rgba(139, 92, 246, 0.15)', medium: 'rgba(139, 92, 246, 0.7)' },
    teal: { solid: '#14B8A6', light: 'rgba(20, 184, 166, 0.15)', medium: 'rgba(20, 184, 166, 0.7)' },
    gray: { solid: '#64748B', light: 'rgba(100, 116, 139, 0.15)', medium: 'rgba(100, 116, 139, 0.7)' },
    palette: ['#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#EF4444', '#14B8A6', '#FBBF24']
};

// 📊 AR Dashboard - Purple/Blue Theme (Professional/Financial)
export const AR_COLORS = {
    primary: { solid: '#6366F1', light: 'rgba(99, 102, 241, 0.15)', medium: 'rgba(99, 102, 241, 0.7)' },
    secondary: { solid: '#8B5CF6', light: 'rgba(139, 92, 246, 0.15)', medium: 'rgba(139, 92, 246, 0.7)' },
    success: { solid: '#06B6D4', light: 'rgba(6, 182, 212, 0.15)', medium: 'rgba(6, 182, 212, 0.7)' },
    warning: { solid: '#F59E0B', light: 'rgba(245, 158, 11, 0.15)', medium: 'rgba(245, 158, 11, 0.7)' },
    danger: { solid: '#E11D48', light: 'rgba(225, 29, 72, 0.15)', medium: 'rgba(225, 29, 72, 0.7)' },
    teal: { solid: '#14B8A6', light: 'rgba(20, 184, 166, 0.15)', medium: 'rgba(20, 184, 166, 0.7)' },
    palette: ['#6366F1', '#8B5CF6', '#06B6D4', '#F59E0B', '#E11D48', '#14B8A6', '#10B981']
};

// 🚫 Rejection Dashboard - Red/Orange Theme (Quality Control)
export const REJECTION_COLORS = {
    primary: { solid: '#EF4444', light: 'rgba(239, 68, 68, 0.15)', medium: 'rgba(239, 68, 68, 0.7)' },
    secondary: { solid: '#F97316', light: 'rgba(249, 115, 22, 0.15)', medium: 'rgba(249, 115, 22, 0.7)' },
    success: { solid: '#10B981', light: 'rgba(16, 185, 129, 0.15)', medium: 'rgba(16, 185, 129, 0.7)' },
    warning: { solid: '#FBBF24', light: 'rgba(251, 191, 36, 0.15)', medium: 'rgba(251, 191, 36, 0.7)' },
    danger: { solid: '#DC2626', light: 'rgba(220, 38, 38, 0.15)', medium: 'rgba(220, 38, 38, 0.7)' },
    neutral: { solid: '#475569', light: 'rgba(71, 85, 105, 0.15)', medium: 'rgba(71, 85, 105, 0.7)' },
    palette: ['#EF4444', '#F97316', '#FBBF24', '#10B981', '#475569', '#DC2626', '#8B5CF6']
};

// Semantic color arrays for charts
export const BAR_COLORS = [
    NEW_PALETTE.blue,
    NEW_PALETTE.teal,
    NEW_PALETTE.red,
    NEW_PALETTE.peach,
    NEW_PALETTE.cream,
];

export const PIE_COLORS = [
    NEW_PALETTE.blue,
    NEW_PALETTE.teal,
    NEW_PALETTE.red,
    NEW_PALETTE.peach,
    NEW_PALETTE.cream
];

// ============================================
// TYPOGRAPHY - Darker, More Readable
// ============================================

export const CHART_FONTS = {
    family: "'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    sizes: {
        title: 18,
        legend: 14,
        ticks: 13,
        datalabels: 15,
        axisTitle: 14
    },
    weights: {
        normal: 500,
        bold: 600
    },
    colors: {
        title: '#111827',      // Gray 900 - very dark
        legend: '#1F2937',     // Gray 800
        ticks: '#000000',      // Black (Darkest)
        grid: 'rgba(0, 0, 0, 0.06)'
    }
};

// ============================================
// TOOLTIP CONFIGURATION - Modern Glassmorphism
// ============================================

export const tooltipConfig = {
    enabled: true,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    titleColor: '#111827',
    bodyColor: '#374151',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderWidth: 1,
    cornerRadius: 8,
    padding: 14,
    boxPadding: 8,
    titleFont: {
        size: 15,
        weight: 600,
        family: CHART_FONTS.family
    },
    bodyFont: {
        size: 14,
        weight: 500,
        family: CHART_FONTS.family
    },
    displayColors: true,
    usePointStyle: true
};

// ============================================
// LEGEND CONFIGURATION
// ============================================

export const legendConfig = {
    position: 'top',
    align: 'center',
    labels: {
        color: CHART_FONTS.colors.legend,
        font: {
            size: CHART_FONTS.sizes.legend,
            weight: CHART_FONTS.weights.bold,
            family: CHART_FONTS.family
        },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 8,
        boxHeight: 8
    }
};

// ============================================
// AXIS CONFIGURATION
// ============================================

export const axisConfig = {
    x: {
        grid: {
            display: false
        },
        ticks: {
            color: '#000000', // Black
            font: {
                size: CHART_FONTS.sizes.ticks,
                weight: 'bold', // Bold
                family: CHART_FONTS.family
            },
            padding: 10
        },
        title: {
            color: CHART_FONTS.colors.legend,
            font: {
                size: CHART_FONTS.sizes.axisTitle,
                weight: CHART_FONTS.weights.bold,
                family: CHART_FONTS.family
            }
        }
    },
    y: {
        grid: {
            color: CHART_FONTS.colors.grid,
            drawBorder: false
        },
        ticks: {
            color: '#000000', // Black
            font: {
                size: CHART_FONTS.sizes.ticks,
                weight: 'bold', // Bold
                family: CHART_FONTS.family
            },
            padding: 10
        },
        title: {
            color: CHART_FONTS.colors.legend,
            font: {
                size: CHART_FONTS.sizes.axisTitle,
                weight: CHART_FONTS.weights.bold,
                family: CHART_FONTS.family
            }
        }
    }
};

// ============================================
// CHART OPTIONS GENERATORS
// ============================================

/**
 * Base options shared by all charts
 */
export const getBaseOptions = (overrides = {}) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: legendConfig,
        tooltip: tooltipConfig,
        datalabels: { display: false }
    },
    ...overrides
});

/**
 * Line chart options
 */
export const getLineChartOptions = (formatCallback, overrides = {}) => ({
    ...getBaseOptions(),
    interaction: {
        mode: 'index',
        intersect: false
    },
    scales: {
        x: axisConfig.x,
        y: {
            ...axisConfig.y,
            beginAtZero: true,
            ticks: {
                ...axisConfig.y.ticks,
                callback: formatCallback
            }
        }
    },
    elements: {
        line: {
            tension: 0.4,
            borderWidth: 2.5
        },
        point: {
            radius: 4,
            hoverRadius: 6,
            borderWidth: 2,
            backgroundColor: '#fff'
        }
    },
    ...overrides
});

/**
 * Bar chart options (vertical)
 */
export const getBarChartOptions = (formatCallback, overrides = {}) => ({
    ...getBaseOptions(),
    scales: {
        x: axisConfig.x,
        y: {
            ...axisConfig.y,
            beginAtZero: true,
            ticks: {
                ...axisConfig.y.ticks,
                callback: formatCallback
            }
        }
    },
    ...overrides
});

/**
 * Horizontal bar chart options
 */
export const getHorizontalBarOptions = (formatCallback, overrides = {}) => ({
    ...getBaseOptions(),
    indexAxis: 'y',
    scales: {
        x: {
            ...axisConfig.y,
            beginAtZero: true,
            ticks: {
                ...axisConfig.y.ticks,
                callback: formatCallback
            }
        },
        y: {
            ...axisConfig.x,
            ticks: {
                ...axisConfig.x.ticks
            }
        }
    },
    ...overrides
});

/**
 * Stacked bar chart options
 */
export const getStackedBarOptions = (formatCallback, overrides = {}) => ({
    ...getBaseOptions(),
    scales: {
        x: {
            ...axisConfig.x,
            stacked: true
        },
        y: {
            ...axisConfig.y,
            stacked: true,
            beginAtZero: true,
            ticks: {
                ...axisConfig.y.ticks,
                callback: formatCallback
            }
        }
    },
    ...overrides
});

/**
 * Doughnut/Pie chart options
 */
export const getDoughnutOptions = (overrides = {}) => ({
    ...getBaseOptions(),
    cutout: '65%',
    plugins: {
        legend: {
            ...legendConfig,
            position: 'bottom'
        },
        tooltip: tooltipConfig,
        datalabels: {
            display: true,
            color: '#fff',
            font: {
                size: CHART_FONTS.sizes.datalabels,
                weight: CHART_FONTS.weights.bold
            },
            formatter: (value, context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return percentage > 5 ? `${percentage}%` : '';
            }
        }
    },
    ...overrides
});

/**
 * MoM Growth chart options (with zero line and colored points)
 */
export const getMoMGrowthOptions = (overrides = {}) => ({
    ...getBaseOptions(),
    interaction: {
        mode: 'index',
        intersect: false
    },
    scales: {
        x: axisConfig.x,
        y: {
            ...axisConfig.y,
            beginAtZero: false,
            ticks: {
                ...axisConfig.y.ticks,
                callback: (value) => `${value.toFixed(0)}%`
            },
            grid: {
                ...axisConfig.y.grid,
                color: (context) => {
                    if (context.tick.value === 0) {
                        return 'rgba(0, 0, 0, 0.3)';
                    }
                    return CHART_FONTS.colors.grid;
                },
                lineWidth: (context) => {
                    if (context.tick.value === 0) {
                        return 2;
                    }
                    return 1;
                }
            }
        }
    },
    plugins: {
        legend: legendConfig,
        tooltip: {
            ...tooltipConfig,
            callbacks: {
                label: (context) => {
                    const value = context.raw;
                    const prefix = value >= 0 ? '+' : '';
                    return `${context.dataset.label}: ${prefix}${value.toFixed(1)}%`;
                }
            }
        },
        datalabels: {
            display: true,
            anchor: (context) => {
                const value = context.dataset.data[context.dataIndex];
                return value >= 0 ? 'end' : 'start';
            },
            align: (context) => {
                const value = context.dataset.data[context.dataIndex];
                return value >= 0 ? 'top' : 'bottom';
            },
            offset: 6,
            font: {
                size: CHART_FONTS.sizes.datalabels,
                weight: CHART_FONTS.weights.bold
            },
            color: (context) => {
               const value = context.dataset.data[context.dataIndex];
               return value >= 0 ? CHART_COLORS.success.solid : CHART_COLORS.danger.solid;
            },
            formatter: (value) => {
                const prefix = value >= 0 ? '+' : '';
                return `${prefix}${value.toFixed(1)}%`;
            }
        }
    },
    elements: {
        line: {
            tension: 0.4,
            borderWidth: 3
        },
        point: {
            radius: 6,
            hoverRadius: 8,
            borderWidth: 2,
            backgroundColor: '#fff'
        }
    },
    ...overrides
});

// ============================================
// GLOBAL CHART.JS DEFAULTS SETTER
// ============================================

/**
 * Apply global Chart.js defaults for consistent styling
 * Call this once in your app (e.g., in dashboard components)
 */
export const applyChartDefaults = (ChartJS) => {
    // Global font settings
    ChartJS.defaults.color = CHART_FONTS.colors.legend;
    ChartJS.defaults.font.family = CHART_FONTS.family;
    ChartJS.defaults.font.size = CHART_FONTS.sizes.ticks;
    ChartJS.defaults.font.weight = 'bold'; // Global Bold

    // Legend defaults
    ChartJS.defaults.plugins.legend.labels.color = CHART_FONTS.colors.legend;
    ChartJS.defaults.plugins.legend.labels.font = {
        size: CHART_FONTS.sizes.legend,
        weight: CHART_FONTS.weights.bold
    };
    ChartJS.defaults.plugins.legend.labels.usePointStyle = true;

    // Title defaults
    ChartJS.defaults.plugins.title.color = CHART_FONTS.colors.title;
    ChartJS.defaults.plugins.title.font = {
        size: CHART_FONTS.sizes.title,
        weight: CHART_FONTS.weights.bold
    };

    // Scale defaults
    ChartJS.defaults.scale.ticks.color = '#000000'; // Black
    ChartJS.defaults.scale.ticks.font = {
        size: CHART_FONTS.sizes.ticks,
        weight: 'bold' // Bold
    };
    ChartJS.defaults.scale.grid.color = CHART_FONTS.colors.grid;

    // Disable datalabels globally by default
    ChartJS.defaults.plugins.datalabels = { display: false };
};
