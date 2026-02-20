import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FiArrowLeft, FiDownload } from 'react-icons/fi';
import api from '../../api';
import DatePicker from '../common/DatePicker';

const FoundryReadings = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState('2026-01-01');
    const [endDate, setEndDate] = useState('2026-02-04');

    // Fetch sand properties data
    const { data: sandRecords = [], isLoading } = useQuery({
        queryKey: ['foundryReadings', startDate, endDate],
        queryFn: async () => {
            const res = await api.get('/quality-lab/sand');
            return res.data;
        },
        staleTime: 2 * 60 * 1000,
    });

    // Filter records by date range
    const filteredRecords = useMemo(() => {
        if (!sandRecords || sandRecords.length === 0) return [];
        
        return sandRecords.filter(record => {
            if (!record.Date) return false;
            const recordDate = new Date(record.Date);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return recordDate >= start && recordDate <= end;
        }).sort((a, b) => new Date(b.Date) - new Date(a.Date));
    }, [sandRecords, startDate, endDate]);

    const handleBack = () => {
        navigate('/quality-management-system/spc');
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            day: 'numeric', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const getValue = (record, field) => {
        const value = record[field];
        if (value === null || value === undefined || value === '') return 'N/A';
        return value;
    };

    return (
        <div className="card">
            {/* Header */}
            <div style={{ marginBottom: '1.5rem' }}>
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
                        transition: 'background-color 0.2s',
                        marginBottom: '1rem'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                >
                    <FiArrowLeft size={18} />
                    Back
                </button>
                
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                }}>
                    <div>
                        <h2 style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '1.75rem',
                            fontWeight: '700',
                            color: '#3B82F6'
                        }}>
                            Foundry Readings
                        </h2>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: '#6B7280'
                        }}>
                            View and manage detailed sand properties readings
                        </p>
                    </div>
                    
                    <div style={{
                        display: 'flex',
                        gap: '0.5rem'
                    }}>
                        <button style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: 'white',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: '#374151'
                        }}>
                            <FiDownload size={16} />
                            Export
                        </button>
                        <button style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#3B82F6',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            color: 'white'
                        }}>
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Sand Properties Analysis Report Section */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #E5E7EB'
            }}>
                <div style={{
                    marginBottom: '1.5rem'
                }}>
                    <h3 style={{
                        margin: '0 0 0.25rem 0',
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#1F2937'
                    }}>
                        Sand Properties Analysis Report
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: '#6B7280'
                    }}>
                        Daily averages and measurements
                    </p>
                </div>

                {/* Date Filters */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                    padding: '1rem',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    alignItems: 'end'
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Start Date
                        </label>
                        <DatePicker
                            name="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            End Date
                        </label>
                        <DatePicker
                            name="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <button
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                            }}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#6B7280',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                color: 'white',
                                fontWeight: '500',
                                transition: 'background-color 0.2s',
                                height: 'fit-content'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4B5563'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6B7280'}
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Data Table */}
                <div style={{
                    overflowX: 'auto',
                    maxHeight: '600px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px'
                }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.75rem'
                    }}>
                        <thead style={{
                            position: 'sticky',
                            top: 0,
                            zIndex: 10,
                            backgroundColor: '#1E40AF'
                        }}>
                            <tr>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'left',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap',
                                    minWidth: '100px'
                                }}>Date</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Total Clay %</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Active Clay %</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Dead Clay %</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Volatile Matter %</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Loss on Ignition %</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Green Compressive Strength gm/cm²</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Compactibility %</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Moisture %</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Permeability Number</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Wet Tensile Strength gm/cm²</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Bentonite Addition Kg/%</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Coal Dust Addition Kg</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Sand Temperature at Moulding Box</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>New Sand Addition Timer (sec)</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>New Sand Addition Weight (kg)</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Daily Dust Collected 1 (Old) kg</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRight: '1px solid #3B82F6',
                                    whiteSpace: 'nowrap'
                                }}>Daily Dust Collected 2 (New) kg</th>
                                <th style={{
                                    padding: '0.75rem',
                                    textAlign: 'center',
                                    color: 'white',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap'
                                }}>Total Dust Collected kg</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan="20" style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        color: '#6B7280'
                                    }}>
                                        Loading data...
                                    </td>
                                </tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr>
                                    <td colSpan="20" style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        color: '#6B7280'
                                    }}>
                                        No records found for the selected date range
                                    </td>
                                </tr>
                            ) : (
                                filteredRecords.map((record, index) => (
                                    <tr key={record.Id || index} style={{
                                        backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB',
                                        borderBottom: '1px solid #E5E7EB'
                                    }}>
                                        <td style={{
                                            padding: '0.75rem',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151',
                                            fontWeight: '500'
                                        }}>{formatDate(record.Date)}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'TOTAL CLAY 11.0 - 14.50%')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'ACTIVE CLAY 7.0 - 9.0%')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'DEAD CLAY 3.0 - 4.50%')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'VOLATILE MATTER 2.30 - 3.50%')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'LOSS ON IGNITION 4.0 - 7.0%')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Green Compression Strength')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Compactability In %')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Moisture In %')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Permeability In No')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Wet Tensile Strength')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Bentonite Addition')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Coal Dust Addition')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Return Sand Temp')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'New Sand Addition Timer')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'New Sand Addition Weight')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Daily Dust Collected 1')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            borderRight: '1px solid #E5E7EB',
                                            color: '#374151'
                                        }}>{getValue(record, 'Daily Dust Collected 2')}</td>
                                        <td style={{
                                            padding: '0.75rem',
                                            textAlign: 'center',
                                            color: '#374151'
                                        }}>{getValue(record, 'Total Dust Collected')}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FoundryReadings;
