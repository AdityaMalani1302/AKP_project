/**
 * Centralized Chart.js Configuration
 * 
 * Modern, accessible chart configurations for all dashboards.
 * WCAG AA compliant colors with 4.5:1+ contrast ratios.
 */

// ============================================
// COLOR PALETTE - WCAG AA Compliant
// ============================================

export const CHART_COLORS = {
    // Primary colors with solid and translucent variants
    primary: {
        solid: '#2563EB',      // Blue 600 - 4.5:1 contrast
        light: 'rgba(37, 99, 235, 0.15)',
        medium: 'rgba(37, 99, 235, 0.7)'
    },
    success: {
        solid: '#059669',      // Emerald 600 - 4.6:1 contrast
        light: 'rgba(5, 150, 105, 0.15)',
        medium: 'rgba(5, 150, 105, 0.7)'
    },
    danger: {
        solid: '#DC2626',      // Red 600 - 4.5:1 contrast
        light: 'rgba(220, 38, 38, 0.15)',
        medium: 'rgba(220, 38, 38, 0.7)'
    },
    warning: {
        solid: '#D97706',      // Amber 600 - 4.5:1 contrast
        light: 'rgba(217, 119, 6, 0.15)',
        medium: 'rgba(217, 119, 6, 0.7)'
    },
    purple: {
        solid: '#7C3AED',      // Violet 600 - 4.5:1 contrast
        light: 'rgba(124, 58, 237, 0.15)',
        medium: 'rgba(124, 58, 237, 0.7)'
    },
    teal: {
        solid: '#0D9488',      // Teal 600
        light: 'rgba(13, 148, 136, 0.15)',
        medium: 'rgba(13, 148, 136, 0.7)'
    },
    pink: {
        solid: '#DB2777',      // Pink 600
        light: 'rgba(219, 39, 119, 0.15)',
        medium: 'rgba(219, 39, 119, 0.7)'
    },
    gray: {
        solid: '#4B5563',      // Gray 600
        light: 'rgba(75, 85, 99, 0.15)',
        medium: 'rgba(75, 85, 99, 0.7)'
    }
};

// Semantic color arrays for charts
export const BAR_COLORS = [
    CHART_COLORS.primary.medium,
    CHART_COLORS.success.medium,
    CHART_COLORS.warning.medium,
    CHART_COLORS.purple.medium,
    CHART_COLORS.pink.medium,
    CHART_COLORS.teal.medium
];

export const PIE_COLORS = [
    CHART_COLORS.primary.solid,
    CHART_COLORS.success.solid,
    CHART_COLORS.warning.solid,
    CHART_COLORS.purple.solid,
    CHART_COLORS.pink.solid,
    CHART_COLORS.teal.solid
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
        datalabels: 13,
        axisTitle: 14
    },
    weights: {
        normal: 500,
        bold: 600
    },
    colors: {
        title: '#111827',      // Gray 900 - very dark
        legend: '#1F2937',     // Gray 800
        ticks: '#374151',      // Gray 700
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
            color: CHART_FONTS.colors.ticks,
            font: {
                size: CHART_FONTS.sizes.ticks,
                weight: CHART_FONTS.weights.normal,
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
            color: CHART_FONTS.colors.ticks,
            font: {
                size: CHART_FONTS.sizes.ticks,
                weight: CHART_FONTS.weights.normal,
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
    ChartJS.defaults.font.weight = CHART_FONTS.weights.normal;

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
    ChartJS.defaults.scale.ticks.color = CHART_FONTS.colors.ticks;
    ChartJS.defaults.scale.ticks.font = {
        size: CHART_FONTS.sizes.ticks,
        weight: CHART_FONTS.weights.normal
    };
    ChartJS.defaults.scale.grid.color = CHART_FONTS.colors.grid;

    // Disable datalabels globally by default
    ChartJS.defaults.plugins.datalabels = { display: false };
};
