import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import DatePicker from '../common/DatePicker';

const AnalysisResults = () => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState('01-02-2026');
    const [expandedParams, setExpandedParams] = useState({
        moisture: true,
        permeability: false,
        compactibility: false,
        gcs: false
    });

    // Format date from YYYY-MM-DD to DD-MM-YYYY for API
    const formatDateForAPI = (dateStr) => {
        if (!dateStr) return '';
        // If already in DD-MM-YYYY format, return as is
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return dateStr;
        // If in YYYY-MM-DD format, convert to DD-MM-YYYY
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const [year, month, day] = dateStr.split('-');
            return `${day}-${month}-${year}`;
        }
        return dateStr;
    };

    // Parse date input (supports both formats)
    const parseDateInput = (dateStr) => {
        if (!dateStr) return '';
        // If in DD-MM-YYYY format, convert to YYYY-MM-DD for input
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('-');
            return `${year}-${month}-${day}`;
        }
        return dateStr;
    };

    // Fetch process capability data
    const { data: capabilityData, isLoading: isLoadingCapability, error: capabilityError } = useQuery({
        queryKey: ['processCapability', selectedDate],
        queryFn: async () => {
            const formattedDate = formatDateForAPI(selectedDate);
            // Fetch data for the selected date (start and end same date for single day)
            const res = await api.get('/quality-lab/sand/process-capability', {
                params: {
                    startDate: formattedDate,
                    endDate: formattedDate
                }
            });
            return res.data;
        },
        enabled: !!selectedDate,
        staleTime: 60 * 1000,
    });

    // Fetch raw sand data for individual readings
    const { data: sandData, isLoading: isLoadingSand, error: sandError } = useQuery({
        queryKey: ['sandReadings', selectedDate],
        queryFn: async () => {
            const formattedDate = formatDateForAPI(selectedDate);
            // Fetch raw sand data
            const res = await api.get('/quality-lab/sand', {
                params: {
                    startDate: formattedDate,
                    endDate: formattedDate
                }
            });
            return res.data;
        },
        enabled: !!selectedDate,
        staleTime: 60 * 1000,
    });

    const handleBack = () => {
        navigate('/quality-management-system/spc');
    };

    const toggleParam = (param) => {
        setExpandedParams(prev => ({
            ...prev,
            [param]: !prev[param]
        }));
    };

    // Parse numeric value from string (handles NVARCHAR fields)
    const parseNumericValue = (value) => {
        if (value === null || value === undefined || value === '') return null;
        const cleaned = String(value).replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? null : parsed;
    };

    // Extract individual readings from sand data
    const getIndividualReadings = () => {
        if (!sandData || !Array.isArray(sandData) || sandData.length === 0) {
            return {
                moisture: [],
                permeability: [],
                compactibility: [],
                gcs: []
            };
        }

        const readings = {
            moisture: [],
            permeability: [],
            compactibility: [],
            gcs: []
        };

        sandData.forEach((record, index) => {
            // Extract moisture reading
            const moisture = parseNumericValue(record['Moisture In %']);
            if (moisture !== null) {
                readings.moisture.push({
                    id: index + 1,
                    value: moisture,
                    time: record['InspectionTime'] || `Reading ${index + 1}`,
                    partNo: record['PartNo'] || '',
                    shift: record['Shift'] || ''
                });
            }

            // Extract compactability reading
            const compactability = parseNumericValue(record['Compactability In %']);
            if (compactability !== null) {
                readings.compactibility.push({
                    id: index + 1,
                    value: compactability,
                    time: record['InspectionTime'] || `Reading ${index + 1}`,
                    partNo: record['PartNo'] || '',
                    shift: record['Shift'] || ''
                });
            }

            // Extract permeability reading
            const permeability = parseNumericValue(record['Permeability In No']);
            if (permeability !== null) {
                readings.permeability.push({
                    id: index + 1,
                    value: permeability,
                    time: record['InspectionTime'] || `Reading ${index + 1}`,
                    partNo: record['PartNo'] || '',
                    shift: record['Shift'] || ''
                });
            }

            // Extract green compression strength reading
            const gcs = parseNumericValue(record['Green Compression Strength']);
            if (gcs !== null) {
                readings.gcs.push({
                    id: index + 1,
                    value: gcs,
                    time: record['InspectionTime'] || `Reading ${index + 1}`,
                    partNo: record['PartNo'] || '',
                    shift: record['Shift'] || ''
                });
            }
        });

        return readings;
    };

    const individualReadings = getIndividualReadings();

    // Extract readings data from API response
    const getReadingsData = () => {
        if (!capabilityData || !capabilityData.parameters) {
            return {
                moisture: { average: null, cp: null, cpk: null, readings: individualReadings.moisture },
                permeability: { average: null, cp: null, cpk: null, readings: individualReadings.permeability },
                compactibility: { average: null, cp: null, cpk: null, readings: individualReadings.compactibility },
                gcs: { average: null, cp: null, cpk: null, readings: individualReadings.gcs }
            };
        }

        const { parameters } = capabilityData;
        
        return {
            moisture: {
                average: parameters.moisture?.average ?? null,
                cp: parameters.moisture?.cp ?? null,
                cpk: parameters.moisture?.cpk ?? null,
                readings: individualReadings.moisture
            },
            permeability: {
                average: parameters.permeability?.average ?? null,
                cp: parameters.permeability?.cp ?? null,
                cpk: parameters.permeability?.cpk ?? null,
                readings: individualReadings.permeability
            },
            compactibility: {
                average: parameters.compactability?.average ?? null,
                cp: parameters.compactability?.cp ?? null,
                cpk: parameters.compactability?.cpk ?? null,
                readings: individualReadings.compactibility
            },
            gcs: {
                average: parameters.greenCompressionStrength?.average ?? null,
                cp: parameters.greenCompressionStrength?.cp ?? null,
                cpk: parameters.greenCompressionStrength?.cpk ?? null,
                readings: individualReadings.gcs
            }
        };
    };

    const readingsData = getReadingsData();

    // Build analysis table data from API response
    const getAnalysisData = () => {
        if (!capabilityData || !capabilityData.parameters) {
            return [
                { parameter: 'Moisture %', average: 'N/A', stdDev: 'N/A', cp: 'N/A', cpk: 'N/A', count: 'N/A' },
                { parameter: 'Permeability Number', average: 'N/A', stdDev: 'N/A', cp: 'N/A', cpk: 'N/A', count: 'N/A' },
                { parameter: 'Compactibility %', average: 'N/A', stdDev: 'N/A', cp: 'N/A', cpk: 'N/A', count: 'N/A' },
                { parameter: 'Green Compressive Strength gm/cm²', average: 'N/A', stdDev: 'N/A', cp: 'N/A', cpk: 'N/A', count: 'N/A' }
            ];
        }

        const { parameters } = capabilityData;
        
        return [
            {
                parameter: 'Moisture %',
                average: parameters.moisture?.average?.toFixed(2) ?? 'N/A',
                stdDev: parameters.moisture?.stdDev?.toFixed(2) ?? 'N/A',
                cp: parameters.moisture?.cp?.toFixed(2) ?? 'N/A',
                cpk: parameters.moisture?.cpk?.toFixed(2) ?? 'N/A',
                count: parameters.moisture?.count ?? 'N/A'
            },
            {
                parameter: 'Permeability Number',
                average: parameters.permeability?.average?.toFixed(2) ?? 'N/A',
                stdDev: parameters.permeability?.stdDev?.toFixed(2) ?? 'N/A',
                cp: parameters.permeability?.cp?.toFixed(2) ?? 'N/A',
                cpk: parameters.permeability?.cpk?.toFixed(2) ?? 'N/A',
                count: parameters.permeability?.count ?? 'N/A'
            },
            {
                parameter: 'Compactibility %',
                average: parameters.compactability?.average?.toFixed(2) ?? 'N/A',
                stdDev: parameters.compactability?.stdDev?.toFixed(2) ?? 'N/A',
                cp: parameters.compactability?.cp?.toFixed(2) ?? 'N/A',
                cpk: parameters.compactability?.cpk?.toFixed(2) ?? 'N/A',
                count: parameters.compactability?.count ?? 'N/A'
            },
            {
                parameter: 'Green Compressive Strength gm/cm²',
                average: parameters.greenCompressionStrength?.average?.toFixed(2) ?? 'N/A',
                stdDev: parameters.greenCompressionStrength?.stdDev?.toFixed(2) ?? 'N/A',
                cp: parameters.greenCompressionStrength?.cp?.toFixed(2) ?? 'N/A',
                cpk: parameters.greenCompressionStrength?.cpk?.toFixed(2) ?? 'N/A',
                count: parameters.greenCompressionStrength?.count ?? 'N/A'
            }
        ];
    };

    const analysisData = getAnalysisData();

    const parameters = [
        { id: 'moisture', label: 'Moisture %' },
        { id: 'permeability', label: 'Permeability Number' },
        { id: 'compactibility', label: 'Compactibility %' },
        { id: 'gcs', label: 'Green Compressive Strength gm/cm²' }
    ];

    // Format value for display
    const formatValue = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return typeof value === 'number' ? value.toFixed(2) : value;
    };

    const isLoading = isLoadingCapability || isLoadingSand;
    const error = capabilityError || sandError;

    return (
        <div style={{ padding: '1rem' }}>
            {/* Header */}
            <button
                onClick={handleBack}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    backgroundColor: '#F3F4F6',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: '#4B5563',
                    fontWeight: '500',
                    marginBottom: '1.5rem'
                }}
            >
                <FiArrowLeft size={18} />
                Back
            </button>

            {/* Title */}
            <h1 style={{
                textAlign: 'center',
                fontSize: '1.75rem',
                fontWeight: '600',
                color: '#1F2937',
                marginBottom: '2rem'
            }}>
                Foundry Sand Testing Parameters
            </h1>

            {/* Main Content - Two Column Layout */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '400px 1fr',
                gap: '2rem',
                alignItems: 'start'
            }}>
                {/* Left Panel - Dropdowns */}
                <div>
                    {/* Date Picker */}
                    <div style={{
                        marginBottom: '1.5rem'
                    }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Select Date
                        </label>
                        <DatePicker
                            name="selectedDate"
                            value={parseDateInput(selectedDate)}
                            onChange={(e) => setSelectedDate(formatDateForAPI(e.target.value))}
                        />
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#F3F4F6',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#6B7280',
                            marginBottom: '1rem'
                        }}>
                            Loading data...
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div style={{
                            padding: '1rem',
                            backgroundColor: '#FEE2E2',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#DC2626',
                            marginBottom: '1rem'
                        }}>
                            Error loading data. Please try again.
                        </div>
                    )}

                    {/* Parameter Dropdowns */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                    }}>
                        {parameters.map((param) => {
                            const data = readingsData[param.id];
                            const isExpanded = expandedParams[param.id];
                            
                            return (
                                <div 
                                    key={param.id}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #E5E7EB',
                                        overflow: 'hidden',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {/* Header */}
                                    <button
                                        onClick={() => toggleParam(param.id)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '1rem 1.25rem',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            fontSize: '0.9375rem',
                                            color: '#3B82F6',
                                            cursor: 'pointer',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <span style={{ fontWeight: '500' }}>{param.label}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                                {data.readings.length} readings
                                            </span>
                                            {isExpanded ? (
                                                <FiChevronUp size={20} style={{ color: '#9CA3AF' }} />
                                            ) : (
                                                <FiChevronDown size={20} style={{ color: '#9CA3AF' }} />
                                            )}
                                        </div>
                                    </button>
                                    
                                    {/* Expanded Content */}
                                    {isExpanded && (
                                        <div style={{
                                            padding: '0 1.25rem 1rem 1.25rem',
                                            borderTop: '1px solid #F3F4F6'
                                        }}>
                                            {/* Stats Row */}
                                            <div style={{
                                                padding: '0.75rem 0',
                                                fontSize: '0.8125rem',
                                                color: '#6B7280',
                                                borderBottom: '1px solid #F3F4F6',
                                                marginBottom: '0.5rem'
                                            }}>
                                                <div>Average: {formatValue(data.average)}</div>
                                                <div style={{ marginTop: '0.25rem' }}>Cp: {formatValue(data.cp)} | Cpk: {formatValue(data.cpk)}</div>
                                            </div>
                                            
                                            {/* Readings List */}
                                            <div style={{
                                                maxHeight: '280px',
                                                overflowY: 'auto',
                                                paddingRight: '0.5rem'
                                            }}>
                                                {data.readings.length === 0 ? (
                                                    <div style={{
                                                        textAlign: 'center',
                                                        padding: '2rem 0',
                                                        color: '#9CA3AF',
                                                        fontSize: '0.875rem'
                                                    }}>
                                                        No individual readings available
                                                    </div>
                                                ) : (
                                                    <div>
                                                        {data.readings.map((reading, idx) => (
                                                            <div key={idx} style={{
                                                                padding: '0.5rem 0.25rem',
                                                                borderBottom: '1px solid #F3F4F6',
                                                                fontSize: '0.875rem',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center'
                                                            }}>
                                                                <span style={{ 
                                                                    color: '#374151',
                                                                    fontSize: '0.9375rem'
                                                                }}>
                                                                    {reading.value}
                                                                </span>
                                                                <span style={{ 
                                                                    color: '#6B7280',
                                                                    fontSize: '0.8125rem'
                                                                }}>
                                                                    {reading.time}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel - Process Capability Analysis Table */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    padding: '1.5rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{
                        margin: '0 0 1.5rem 0',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        Process Capability Analysis
                    </h3>

                    <div style={{
                        overflowX: 'auto'
                    }}>
                        <table style={{
                            width: '100%',
                            borderCollapse: 'collapse'
                        }}>
                            <thead>
                                <tr style={{
                                    borderBottom: '2px solid #E5E7EB'
                                }}>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'left',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>Parameter</th>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>Average</th>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>Std Dev</th>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>Cp</th>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>Cpk</th>
                                    <th style={{
                                        padding: '0.75rem',
                                        textAlign: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        color: '#374151'
                                    }}>Count</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysisData.map((row, index) => (
                                    <tr
                                        key={index}
                                        style={{
                                            borderBottom: '1px solid #E5E7EB'
                                        }}
                                    >
                                        <td style={{
                                            padding: '0.75rem',
                                            fontSize: '0.875rem',
                                            color: '#374151'
                                        }}>{row.parameter}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            fontSize: '0.875rem',
                                            color: '#374151'
                                        }}>{row.average}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            fontSize: '0.875rem',
                                            color: '#374151'
                                        }}>{row.stdDev}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            fontSize: '0.875rem',
                                            color: '#374151'
                                        }}>{row.cp}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            fontSize: '0.875rem',
                                            color: '#374151'
                                        }}>{row.cpk}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            fontSize: '0.875rem',
                                            color: '#374151'
                                        }}>{row.count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Show total records info */}
                    {capabilityData && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            backgroundColor: '#F3F4F6',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            color: '#6B7280'
                        }}>
                            Total records found: {capabilityData.totalRecords || 0}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalysisResults;
