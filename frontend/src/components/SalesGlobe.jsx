import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import Globe from 'react-globe.gl';

// WebGL detection function
const isWebGLAvailable = () => {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        return !!(gl && gl instanceof WebGLRenderingContext);
    } catch (e) {
        return false;
    }
};

// Country name to ISO 3166-1 alpha-3 code mapping (reusing from SalesByCountryMap)
const countryMapping = {
    // Common variations to ISO codes
    'USA': 'USA',
    'United States': 'USA',
    'US': 'USA',
    'UK': 'GBR',
    'United Kingdom': 'GBR',
    'England': 'GBR',
    'Germany': 'DEU',
    'France': 'FRA',
    'Italy': 'ITA',
    'Spain': 'ESP',
    'Canada': 'CAN',
    'Australia': 'AUS',
    'Japan': 'JPN',
    'China': 'CHN',
    'India': 'IND',
    'Brazil': 'BRA',
    'Russia': 'RUS',
    'Mexico': 'MEX',
    'Netherlands': 'NLD',
    'Belgium': 'BEL',
    'Switzerland': 'CHE',
    'Sweden': 'SWE',
    'Norway': 'NOR',
    'Denmark': 'DNK',
    'Finland': 'FIN',
    'Poland': 'POL',
    'Austria': 'AUT',
    'Ireland': 'IRL',
    'Portugal': 'PRT',
    'Greece': 'GRC',
    'Turkey': 'TUR',
    'South Korea': 'KOR',
    'Korea': 'KOR',
    'Singapore': 'SGP',
    'Malaysia': 'MYS',
    'Thailand': 'THA',
    'Indonesia': 'IDN',
    'Vietnam': 'VNM',
    'Philippines': 'PHL',
    'UAE': 'ARE',
    'United Arab Emirates': 'ARE',
    'Saudi Arabia': 'SAU',
    'South Africa': 'ZAF',
    'Egypt': 'EGY',
    'Nigeria': 'NGA',
    'Argentina': 'ARG',
    'Chile': 'CHL',
    'Colombia': 'COL',
    'Peru': 'PER',
    'New Zealand': 'NZL',
    'Israel': 'ISR',
    'Taiwan': 'TWN',
    'Hong Kong': 'HKG',
    'Bangladesh': 'BGD',
    'Pakistan': 'PAK',
    'Sri Lanka': 'LKA',
    'Nepal': 'NPL',
    // Domestic (India) and Export handling
    'Domestic': 'IND',
    'DOMESTIC': 'IND',
    'Export': null,
    'EXPORT': null
};

// Map customer group names to their headquarters countries
const customerGroupToCountry = {
    // Indian/Domestic companies
    'AKP FERROCAST PVT LTD': 'India',
    'AKP FERROCAST': 'India',
    'DOMESTIC': 'India',
    'OTHER': 'India', // Assume "OTHER" is domestic

    // USA companies
    'CUMMINS GROUP': 'United States of America',
    'CUMMINS': 'United States of America',
    'CATERPILLAR GROUP': 'United States of America',
    'CATERPILLAR': 'United States of America',
    'IDEX GROUP': 'United States of America',
    'IDEX': 'United States of America',
    'JOHN DEERE': 'United States of America',
    'GENERAL ELECTRIC': 'United States of America',

    // UK companies
    'JCB GROUP': 'United Kingdom',
    'JCB': 'United Kingdom',

    // Swedish companies
    'ALFA LAVAL GROUP': 'Sweden',
    'ALFA LAVAL': 'Sweden',
    'ATLAS COPCO': 'Sweden',

    // German companies
    'ATLAS GROUP': 'Germany',
    'BOSCH': 'Germany',
    'SIEMENS': 'Germany',

    // Japanese companies
    'KOMATSU': 'Japan',
    'HITACHI': 'Japan',

    // Korean companies
    'HYUNDAI': 'South Korea',
    'DOOSAN': 'South Korea',
};

// Format currency in Indian format
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

const SalesGlobe = memo(({ salesData }) => {
    const globeEl = useRef();
    const containerRef = useRef();
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [countries, setCountries] = useState({ features: [] });
    const [hoverD, setHoverD] = useState();
    const [webGLSupported, setWebGLSupported] = useState(true);
    const [globeError, setGlobeError] = useState(null);

    // Check WebGL support on mount
    useEffect(() => {
        const supported = isWebGLAvailable();
        setWebGLSupported(supported);
        if (!supported) {
            console.warn('WebGL is not supported in this browser. Globe visualization will be disabled.');
        }
    }, []);

    // Handle responsive sizing with debounce to prevent lag during sidebar transitions
    useEffect(() => {
        let resizeTimeout = null;

        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: containerRef.current.offsetHeight
                });
            }
        };

        // Debounced version for resize observer
        const debouncedUpdate = () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(updateDimensions, 150);
        };

        // Initial setup (immediate, no debounce)
        updateDimensions();

        // Observer for resizing with debounce
        const resizeObserver = new ResizeObserver(debouncedUpdate);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            if (containerRef.current) {
                resizeObserver.unobserve(containerRef.current);
            }
        };
    }, []);

    // Load GeoJSON data
    useEffect(() => {
        // Using a reliable GeoJSON source for countries
        fetch('https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson')
            .then(res => res.json())
            .then(setCountries);
    }, []);

    // Configure auto-rotation
    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true;
            globeEl.current.controls().autoRotateSpeed = 0.5;
            globeEl.current.pointOfView({ altitude: 2.0 });
        }
    }, [globeEl.current]);

    // Normalize country names for consistency
    const normalizeCountryName = (name) => {
        if (!name) return null;
        const normalized = name.trim().toUpperCase();

        // Map common variations to standard names
        const variations = {
            'USA': 'United States',
            'UNITED STATES': 'United States',
            'UNITED STATES OF AMERICA': 'United States',
            'UK': 'United Kingdom',
            'UNITED KINGDOM': 'United Kingdom',
            'ENGLAND': 'United Kingdom',
            'INDIA': 'India',
            'GERMANY': 'Germany',
            'SWEDEN': 'Sweden',
            'FRANCE': 'France',
            'POLAND': 'Poland',
            'BELGIUM': 'Belgium',
            'CHINA': 'China',
            'THAILAND': 'Thailand',
            'SINGAPORE': 'Singapore',
            'FINLAND': 'Finland',
            'DENMARK': 'Denmark',
            'JAPAN': 'Japan',
            'SOUTH KOREA': 'South Korea',
            'KOREA': 'South Korea',
            'CANADA': 'Canada',
            'AUSTRALIA': 'Australia',
            'BRAZIL': 'Brazil',
            'RUSSIA': 'Russia',
            'MEXICO': 'Mexico',
            'NETHERLANDS': 'Netherlands',
            'SWITZERLAND': 'Switzerland',
            'NORWAY': 'Norway',
            'AUSTRIA': 'Austria',
            'IRELAND': 'Ireland',
            'PORTUGAL': 'Portugal',
            'GREECE': 'Greece',
            'TURKEY': 'Turkey',
            'MALAYSIA': 'Malaysia',
            'INDONESIA': 'Indonesia',
            'VIETNAM': 'Vietnam',
            'PHILIPPINES': 'Philippines',
            'UAE': 'UAE',
            'UNITED ARAB EMIRATES': 'UAE',
            'SAUDI ARABIA': 'Saudi Arabia',
            'SOUTH AFRICA': 'South Africa',
            'EGYPT': 'Egypt',
            'NIGERIA': 'Nigeria',
            'ARGENTINA': 'Argentina',
            'CHILE': 'Chile',
            'COLOMBIA': 'Colombia',
            'PERU': 'Peru',
            'NEW ZEALAND': 'New Zealand',
            'ISRAEL': 'Israel',
            'TAIWAN': 'Taiwan',
            'HONG KONG': 'Hong Kong',
            'BANGLADESH': 'Bangladesh',
            'PAKISTAN': 'Pakistan',
            'SRI LANKA': 'Sri Lanka',
            'NEPAL': 'Nepal',
            'ITALY': 'Italy',
            'SPAIN': 'Spain'
        };

        return variations[normalized] || name.trim();
    };

    // Process sales data - Use CountryName directly from database, with fallback to CUSTOMER AREA GROUP
    const countryValues = useMemo(() => {
        if (!salesData || salesData.length === 0) {
            console.log('No sales data provided to Globe');
            return {};
        }

        console.log('Globe Raw Sales Data sample:', salesData.slice(0, 3));
        console.log('First row keys:', salesData[0] ? Object.keys(salesData[0]) : 'No data');

        const values = {};
        salesData.forEach(row => {
            // Try CountryName first, then fall back to CUSTOMER AREA GROUP mapping
            let countryName = row.CountryName || '';
            const value = row.Value || row.value || 0;

            // If no CountryName, try to get country from CUSTOMER AREA GROUP
            if (!countryName) {
                const areaGroup = row['CUSTOMER AREA GROUP'] || '';
                const upperGroup = areaGroup.trim().toUpperCase();

                // Map customer area groups to countries
                if (upperGroup.includes('CUMMINS') || upperGroup.includes('CATERPILLAR') || upperGroup.includes('IDEX')) {
                    countryName = 'UNITED STATES';
                } else if (upperGroup.includes('JCB')) {
                    countryName = 'UNITED KINGDOM';
                } else if (upperGroup.includes('ALFA LAVAL')) {
                    countryName = 'SWEDEN';
                } else if (upperGroup.includes('ATLAS')) {
                    countryName = 'GERMANY';
                } else if (upperGroup.includes('AKP') || upperGroup.includes('FERROCAST') ||
                    upperGroup.includes('DOMESTIC') || upperGroup === 'OTHER' || !upperGroup) {
                    countryName = 'INDIA';
                } else {
                    countryName = 'INDIA'; // Default to India for domestic
                }
            }

            if (countryName && value > 0) {
                const normalizedCountry = normalizeCountryName(countryName);
                if (normalizedCountry) {
                    values[normalizedCountry] = (values[normalizedCountry] || 0) + value;
                }
            }
        });
        console.log('Globe Aggregated Country Values:', values);
        return values;
    }, [salesData]);

    // Get max value for scaling
    const maxValue = useMemo(() => {
        const values = Object.values(countryValues);
        return values.length > 0 ? Math.max(...values) : 1;
    }, [countryValues]);

    // Generate simple gray texture for the sea
    const [globeImage, setGlobeImage] = useState(null);
    useEffect(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f3f4f6'; // Light gray for sea
        ctx.fillRect(0, 0, 1, 1);
        setGlobeImage(canvas.toDataURL());
    }, []);

    // Country name to ISO code mapping for reliable matching
    const countryToIso = useMemo(() => ({
        'india': 'IND',
        'sweden': 'SWE',
        'united states of america': 'USA',
        'united states': 'USA',
        'usa': 'USA',
        'germany': 'DEU',
        'united kingdom': 'GBR',
        'uk': 'GBR',
        'japan': 'JPN',
        'south korea': 'KOR',
        'korea': 'KOR',
        'china': 'CHN',
        'france': 'FRA',
        'italy': 'ITA',
        'spain': 'ESP',
        'canada': 'CAN',
        'australia': 'AUS',
        'brazil': 'BRA',
        'russia': 'RUS',
        'mexico': 'MEX',
        'netherlands': 'NLD',
        'belgium': 'BEL',
        'switzerland': 'CHE',
        'norway': 'NOR',
        'denmark': 'DNK',
        'finland': 'FIN',
        'poland': 'POL',
        'austria': 'AUT',
        'ireland': 'IRL',
        'portugal': 'PRT',
        'greece': 'GRC',
        'turkey': 'TUR',
        'singapore': 'SGP',
        'malaysia': 'MYS',
        'thailand': 'THA',
        'indonesia': 'IDN',
        'vietnam': 'VNM',
        'philippines': 'PHL',
        'uae': 'ARE',
        'united arab emirates': 'ARE',
        'saudi arabia': 'SAU',
        'south africa': 'ZAF',
        'egypt': 'EGY',
        'nigeria': 'NGA',
        'argentina': 'ARG',
        'chile': 'CHL',
        'colombia': 'COL',
        'peru': 'PER',
        'new zealand': 'NZL',
        'israel': 'ISR',
        'taiwan': 'TWN',
        'hong kong': 'HKG',
        'bangladesh': 'BGD',
        'pakistan': 'PAK',
        'sri lanka': 'LKA',
        'nepal': 'NPL'
    }), []);

    // Pre-compute ISO-based sales values for efficient polygon matching
    const isoSalesValues = useMemo(() => {
        const isoValues = {};
        Object.entries(countryValues).forEach(([country, value]) => {
            const countryLower = country.toLowerCase().trim();
            const isoCode = countryToIso[countryLower];
            if (isoCode) {
                isoValues[isoCode] = (isoValues[isoCode] || 0) + value;
            }
        });
        return isoValues;
    }, [countryValues, countryToIso]);

    // Name-based lookup for countries with invalid ISO codes (e.g., France has ISO_A3 = '-99' in Natural Earth)
    const nameSalesValues = useMemo(() => {
        const nameValues = {};
        Object.entries(countryValues).forEach(([country, value]) => {
            // Store with lowercase key for case-insensitive matching
            const countryLower = country.toLowerCase().trim();
            nameValues[countryLower] = (nameValues[countryLower] || 0) + value;
            
            // Also add common variations for GeoJSON matching
            const variations = {
                'united states': ['united states of america'],
                'united kingdom': ['united kingdom of great britain and northern ireland', 'england'],
                'south korea': ['korea, republic of', 'republic of korea'],
                'russia': ['russian federation'],
                'uae': ['united arab emirates'],
                'vietnam': ['viet nam']
            };
            
            if (variations[countryLower]) {
                variations[countryLower].forEach(variant => {
                    nameValues[variant] = (nameValues[variant] || 0) + value;
                });
            }
        });
        return nameValues;
    }, [countryValues]);

    // Calculate styling for each country polygon
    const getPolygonCapColor = (d) => {
        const isoCode = d.properties.ISO_A3;
        const countryName = (d.properties.NAME || '').toLowerCase().trim();
        const adminName = (d.properties.ADMIN || '').toLowerCase().trim();
        const brkName = (d.properties.BRK_NAME || '').toLowerCase().trim();

        // Try ISO code first (most reliable when valid)
        let matchedValue = isoCode && isoCode !== '-99' ? (isoSalesValues[isoCode] || 0) : 0;
        
        // If no match by ISO (or ISO is '-99'), try name-based matching
        if (matchedValue === 0) {
            matchedValue = nameSalesValues[countryName] || 
                           nameSalesValues[adminName] || 
                           nameSalesValues[brkName] || 
                           0;
        }

        // Store value in properties for tooltip
        d.properties.salesValue = matchedValue;

        if (matchedValue > 0) {
            // Vibrant Blue for Sales Highlighting (matching reference)
            const intensity = Math.min(matchedValue / maxValue, 1);
            // Interpolate between a base blue and a deep blue
            return `rgba(37, 99, 235, ${0.7 + (intensity * 0.3)})`; // #2563eb base
        }

        // Soft Blue-Gray for non-sales land (matching reference aesthetics)
        return '#cbd5e1';
    };

    const getPolygonSideColor = (d) => {
        return 'rgba(0,0,0,0)';
    };

    const getPolygonAltitude = (d) => {
        return d === hoverD ? 0.08 : 0.01;
    };

    // Coordinates for small countries/territories that don't show up well as polygons
    const smallCountryCoords = {
        'singapore': { lat: 1.3521, lng: 103.8198, name: 'Singapore' },
        'hong kong': { lat: 22.3193, lng: 114.1694, name: 'Hong Kong' },
        'luxembourg': { lat: 49.8153, lng: 6.1296, name: 'Luxembourg' },
        'malta': { lat: 35.9375, lng: 14.3754, name: 'Malta' },
        'bahrain': { lat: 26.0667, lng: 50.5577, name: 'Bahrain' },
        'qatar': { lat: 25.3548, lng: 51.1839, name: 'Qatar' },
        'mauritius': { lat: -20.3484, lng: 57.5522, name: 'Mauritius' },
        'maldives': { lat: 3.2028, lng: 73.2207, name: 'Maldives' },
        'brunei': { lat: 4.5353, lng: 114.7277, name: 'Brunei' },
        'monaco': { lat: 43.7384, lng: 7.4246, name: 'Monaco' },
        'liechtenstein': { lat: 47.1660, lng: 9.5554, name: 'Liechtenstein' },
        'andorra': { lat: 42.5063, lng: 1.5218, name: 'Andorra' },
        'taiwan': { lat: 23.5937, lng: 120.9605, name: 'Taiwan' }
    };

    // Generate point markers for small countries with sales
    const pointsData = useMemo(() => {
        const points = [];
        Object.entries(countryValues).forEach(([country, value]) => {
            const countryLower = country.toLowerCase().trim();
            const coords = smallCountryCoords[countryLower];
            if (coords && value > 0) {
                points.push({
                    lat: coords.lat,
                    lng: coords.lng,
                    name: coords.name,
                    value: value,
                    size: Math.min(0.8, 0.3 + (value / maxValue) * 0.5) // Size based on value
                });
            }
        });
        return points;
    }, [countryValues, maxValue]);

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', background: 'transparent' }}>
            {/* WebGL not supported fallback */}
            {!webGLSupported ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    width: '100%',
                    padding: '20px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                    borderRadius: '8px'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌍</div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '16px' }}>3D Globe Unavailable</h3>
                    <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '13px' }}>
                        WebGL is not supported in this browser.
                    </p>
                    {/* Show sales data as a simple table instead */}
                    <div style={{
                        width: '100%',
                        maxHeight: '250px',
                        overflowY: 'auto',
                        background: 'white',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9', position: 'sticky', top: 0 }}>
                                    <th style={{ padding: '8px', textAlign: 'left', color: '#1e293b' }}>Country</th>
                                    <th style={{ padding: '8px', textAlign: 'right', color: '#1e293b' }}>Sales Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(countryValues)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([country, value]) => (
                                        <tr key={country} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                            <td style={{ padding: '8px', color: '#334155' }}>{country}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>{formatCurrency(value)}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <>
                    {/* Sales Legend Panel - Shows country sales breakdown */}
                    <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        background: 'rgba(255,255,255,0.95)',
                        color: '#1e293b',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        zIndex: 100,
                        maxWidth: '220px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <strong style={{ color: '#2563eb' }}>📊 Data Keys ({Object.keys(countryValues).length}):</strong>
                        {Object.keys(countryValues).length === 0 ? (
                            <div style={{ color: '#dc2626', marginTop: 4 }}>No data received!</div>
                        ) : (
                            <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                                {Object.entries(countryValues)
                                    .sort((a, b) => b[1] - a[1]) // Sort by value descending
                                    .map(([k, v]) => (
                                        <li key={k} style={{ marginBottom: 2 }}>
                                            <span style={{ fontWeight: 600 }}>{k}:</span> {formatCurrency(v)}
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                    {dimensions.width > 0 && globeImage && countries.features && countries.features.length > 0 && (
                        <Globe
                            ref={globeEl}
                            width={dimensions.width}
                            height={dimensions.height}
                            backgroundColor="rgba(0,0,0,0)"
                            globeImageUrl={globeImage}
                            showAtmosphere={false}
                            showGraticules={true}
                            graticulesColor="rgba(0,0,0,0.15)"
                            polygonsData={countries.features}
                            polygonAltitude={getPolygonAltitude}
                            polygonCapColor={getPolygonCapColor}
                            polygonSideColor={getPolygonSideColor}
                            polygonStrokeColor={() => '#ffffff'}
                            polygonLabel={({ properties: d }) => `
                                <div style="background: rgba(255,255,255,0.95); color: #1e293b; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-family: system-ui; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
                                    <b style="font-size:13px">${d.NAME || d.ADMIN}</b> <br />
                                    <span style="color: #2563eb; font-weight: 600;">${d.salesValue ? formatCurrency(d.salesValue) : 'No Sales'}</span>
                                </div>
                            `}
                            onPolygonHover={setHoverD}
                            polygonsTransitionDuration={300}
                            // Point markers for small countries
                            pointsData={pointsData}
                            pointLat={d => d.lat}
                            pointLng={d => d.lng}
                            pointColor={() => '#2563eb'}
                            pointAltitude={0.02}
                            pointRadius={d => d.size}
                            pointLabel={d => `
                                <div style="background: rgba(255,255,255,0.95); color: #1e293b; padding: 8px 12px; border-radius: 6px; font-size: 12px; font-family: system-ui; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
                                    <b style="font-size:13px">${d.name}</b> <br />
                                    <span style="color: #2563eb; font-weight: 600;">${formatCurrency(d.value)}</span>
                                </div>
                            `}
                        />
                    )}
                </>
            )}
        </div>
    );
});

SalesGlobe.displayName = 'SalesGlobe';

export default SalesGlobe;
