import React, { useMemo } from 'react';
import { treemap, hierarchy } from 'd3-hierarchy';
import { scaleOrdinal } from 'd3-scale';
import { schemeCategory10 } from 'd3-scale-chromatic';

/**
 * Helper to determine best text color (black or white) for a given background
 * Uses YIQ contrast algorithm
 */
const getContrastColor = (_hexColor) => {
    // Always return dark black as per user preference
    return '#000000';
};

/**
 * Professional D3.js Squarified TreeMap Component
 * 
 * Features:
 * - Uses D3's squarified treemap algorithm for optimal rectangle packing
 * - Vibrant color palette based on Category/Name
 * - Dynamic text contrast (black/white) for readability
 * - Responsive labels that show grade name and formatted value
 */
const TreeMapChart = ({ data, width = 600, height = 350, colorPalette = schemeCategory10, responsive = false, valueFormatter = (val) => val }) => {
    const containerRef = React.useRef(null);
    const [dimensions, setDimensions] = React.useState({ width, height });

    // Handle responsive resizing
    React.useEffect(() => {
        if (!responsive || !containerRef.current) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            // Only update if dimensions actually changed/valid
            if (width > 0 && height > 0 && !isNaN(width) && !isNaN(height)) {
                setDimensions({ width, height });
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [responsive]);

    // Update dimensions if fixed props change (and not responsive)
    React.useEffect(() => {
        if (!responsive) {
            setDimensions({ width, height });
        }
    }, [width, height, responsive]);

    // Use current dimensions
    const chartWidth = dimensions.width;
    const chartHeight = dimensions.height;

    // Calculate total value for percentages
    const totalValue = data ? data.reduce((sum, item) => sum + item.value, 0) : 0;

    // Create D3 hierarchy from data
    const root = useMemo(() => {
        if (!data || data.length === 0 || !chartWidth || !chartHeight || isNaN(chartWidth) || isNaN(chartHeight)) return null;

        const sortedData = [...data].sort((a, b) => b.value - a.value);
        
        // Create hierarchy structure required by D3
        const hierarchyData = {
            name: 'root',
            children: sortedData.map(item => ({
                name: item.grade,
                value: item.value,
                data: item
            }))
        };

        const rootNode = hierarchy(hierarchyData)
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        // Create treemap layout
        const treemapLayout = treemap()
            .size([chartWidth, chartHeight])
            .padding(2)
            .round(true);

        treemapLayout(rootNode);

        return rootNode;
    }, [data, chartWidth, chartHeight]);

    // Color scale - Ordinal scale assigns a unique color to each grade
    const colorScale = useMemo(() => {
        const grades = data ? data.map(d => d.grade) : [];
        return scaleOrdinal(colorPalette).domain(grades);
    }, [data, colorPalette]);

    const formatWeight = (value) => {
        // Values are in kg, convert to tonnes (1 T = 1000 kg)
        const tonnes = value / 1000;
        if (tonnes >= 1) {
            return `${Math.round(tonnes)} T`;
        }
        return `${Math.round(value)} kg`;
    };

    // If root is null (e.g. 0 dimensions), render empty container
    if (!root) {
        return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
    }

    // Get leaves (actual data rectangles)
    const leaves = root.leaves();

    return (
        <div ref={containerRef} style={{ width: responsive ? '100%' : width, height: responsive ? '100%' : height, position: 'relative' }}>
            <svg width={chartWidth || 0} height={chartHeight || 0} style={{ display: 'block', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {leaves.map((leaf, index) => {
                    const { x0, x1, y0, y1 } = leaf;
                    const rectWidth = x1 - x0;
                    const rectHeight = y1 - y0;
                    const value = leaf.data.value; // Weight
                    const valueAmount = leaf.data.data.valueAmount; // Monetary Value (optional)
                    const grade = leaf.data.name;
                    
                    // Get color for this block
                    const bgColor = colorScale(grade);
                    const textColor = getContrastColor(bgColor);
                    
                    // Calculate font sizes based on rectangle size
                    const minDimension = Math.min(rectWidth, rectHeight);
                    const showText = minDimension > 40;
                    const showValue = minDimension > 60;
                    const fontSize = Math.min(16, Math.max(12, minDimension / 5));
                    
                    const hasAmount = valueAmount !== undefined;
                    // Adjust vertical spacing whether 2 elements or 3 elements are shown
                    const textYOffset = showValue ? (hasAmount ? -20 : -10) : 0;
                    
                    return (
                        <g key={index}>
                            <rect
                                x={x0}
                                y={y0}
                                width={rectWidth}
                                height={rectHeight}
                                fill={bgColor}
                                stroke="white"
                                strokeWidth={2}
                                style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
                            >
                                <title>
                                    {grade}: {formatWeight(value)} ({((value / totalValue) * 100).toFixed(1)}%)
                                    {hasAmount ? `\nValue: ${valueFormatter(valueAmount)}` : ''}
                                </title>
                            </rect>
                            {showText && (
                                <text
                                    x={(x0 + x1) / 2}
                                    y={(y0 + y1) / 2 + textYOffset}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={textColor}
                                    fontSize={fontSize}
                                    fontWeight="600"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {grade.length > 15 && rectWidth < 120
                                        ? grade.substring(0, 12) + '...' 
                                        : grade}
                                </text>
                            )}
                            {showValue && (
                                <text
                                    x={(x0 + x1) / 2}
                                    y={(y0 + y1) / 2 + textYOffset + 20}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={textColor}
                                    fontSize={fontSize - 2}
                                    fontWeight="500"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {formatWeight(value)}
                                </text>
                            )}
                            {showValue && hasAmount && rectHeight > 80 && (
                                <text
                                    x={(x0 + x1) / 2}
                                    y={(y0 + y1) / 2 + textYOffset + 40}
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                    fill={textColor}
                                    fontSize={fontSize - 3}
                                    fontWeight="bold"
                                    style={{ pointerEvents: 'none' }}
                                >
                                    {valueFormatter(valueAmount)}
                                </text>
                            )}
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export default TreeMapChart;
