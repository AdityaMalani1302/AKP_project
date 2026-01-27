/**
 * Chart.js Modern Theme
 * 
 * This file provides a modern, clean, and visually appealing theme for Chart.js.
 * It includes a fresh color palette, gradient fills, improved typography, and modern tooltips.
 */

// 1. MODERN COLOR PALETTE
// A fresh, vibrant, and accessible color palette.
// Source: Coolors.co, manually curated for data visualization.
const brandColors = {
  primary: 'rgba(75, 192, 192, 1)',
  secondary: 'rgba(255, 99, 132, 1)',
  accent: 'rgba(255, 205, 86, 1)',
  neutral: 'rgba(201, 203, 207, 1)',
  info: 'rgba(54, 162, 235, 1)',
  success: 'rgba(153, 255, 153, 1)',
  warning: 'rgba(255, 159, 64, 1)',
  danger: 'rgba(255, 87, 87, 1)',
};

// Full palette for charts with multiple datasets
const colorPalette = [
  'rgba(52, 152, 219, 1)', // Belize Hole
  'rgba(231, 76, 60, 1)',  // Alizarin
  'rgba(46, 204, 113, 1)', // Emerald
  'rgba(241, 196, 15, 1)', // Sun Flower
  'rgba(155, 89, 182, 1)', // Amethyst
  'rgba(26, 188, 156, 1)', // Turquoise
  'rgba(230, 126, 34, 1)', // Carrot
  'rgba(149, 165, 166, 1)'  // Concrete
];

// 2. GRADIENT HELPER
/**
 * Creates a canvas gradient for chart backgrounds.
 * @param {CanvasRenderingContext2D} ctx - The chart's canvas rendering context.
 * @param {string} topColor - The color at the top of the gradient.
 * @param {string} bottomColor - The color at the bottom of the gradient.
 * @returns {CanvasGradient}
 */
const createGradient = (ctx, topColor, bottomColor) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  return gradient;
};

// Function to get a gradient background for a chart dataset
export const getGradientBackground = (context, topColor, bottomColor) => {
  const chart = context.chart;
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    // This case happens on initial chart load before the area is defined
    return null;
  }
  
  // Use a single color if top or bottom is missing
  if (!bottomColor) return topColor;
  if (!topColor) return bottomColor;

  // Create a gradient
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, bottomColor); // Start
  gradient.addColorStop(0.5, topColor);  // Middle
  gradient.addColorStop(1, topColor);    // End
  return gradient;
};


// 3. APPLY MODERN THEME
/**
 * Applies the modern theme to Chart.js global defaults.
 * @param {object} ChartJS - The Chart.js instance.
 */
export const applyModernTheme = (ChartJS) => {
  // TYPOGRAPHY & GLOBAL STYLES
  ChartJS.defaults.font.family = "'Helvetica Neue', 'Helvetica', 'Arial', sans-serif";
  ChartJS.defaults.font.size = 14;
  ChartJS.defaults.font.weight = '500';
  ChartJS.defaults.color = '#6c757d'; // Muted gray for text
  ChartJS.defaults.responsive = true;
  ChartJS.defaults.maintainAspectRatio = false;
  ChartJS.defaults.animation.duration = 1200; // Smoother animations
  ChartJS.defaults.animation.easing = 'easeInOutQuart';

  // GRID LINES & SCALES
  ChartJS.defaults.scale.grid.drawOnChartArea = false; // Hide grid lines by default
  ChartJS.defaults.scale.grid.color = 'rgba(0, 0, 0, 0.05)';
  ChartJS.defaults.scale.ticks.color = '#495057';
  ChartJS.defaults.scale.ticks.padding = 10;

  // LEGEND
  ChartJS.defaults.plugins.legend.position = 'bottom';
  ChartJS.defaults.plugins.legend.labels.usePointStyle = true;
  ChartJS.defaults.plugins.legend.labels.padding = 20;
  ChartJS.defaults.plugins.legend.labels.boxWidth = 8;

  // TOOLTIPS
  ChartJS.defaults.plugins.tooltip.enabled = true;
  ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  ChartJS.defaults.plugins.tooltip.titleFont = { size: 16, weight: 'bold' };
  ChartJS.defaults.plugins.tooltip.bodyFont = { size: 14 };
  ChartJS.defaults.plugins.tooltip.padding = 12;
  ChartJS.defaults.plugins.tooltip.cornerRadius = 8;
  ChartJS.defaults.plugins.tooltip.displayColors = true;
  ChartJS.defaults.plugins.tooltip.boxPadding = 4;
  ChartJS.defaults.plugins.tooltip.caretSize = 6;
  
  // Apply a subtle shadow to tooltips via external CSS if possible,
  // but for now, we rely on the built-in options.

  // CHART-SPECIFIC OPTIONS
  // You can extend this with default options for Bar, Line, etc.
  // For example:
  ChartJS.defaults.datasets.bar.backgroundColor = brandColors.primary;
  ChartJS.defaults.datasets.line.borderColor = brandColors.primary;
  ChartJS.defaults.datasets.line.tension = 0.4; // Smoother lines
  ChartJS.defaults.datasets.line.fill = true;

  // Return colors for easy access in components
  return {
    brandColors,
    colorPalette,
    createGradient,
  };
};
