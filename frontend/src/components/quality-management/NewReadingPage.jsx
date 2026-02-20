import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';
import DatePicker from '../common/DatePicker';

const NewReadingPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        partName: '',
        partNumber: '',
        heatNo: '',
        shift: '',
        date: new Date().toISOString().split('T')[0],
        time: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleBack = () => {
        navigate('/quality-management-system/sand-testing');
    };

    const handleSave = () => {
        // Save logic here
        console.log('Saving reading:', formData);
    };

    return (
        <div>
            {/* Back Button */}
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
                Back to Sand Testing
            </button>

            {/* Title */}
            <h2 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1F2937',
                textAlign: 'center'
            }}>
                New Sand Testing Reading
            </h2>

            {/* Form */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                {/* Basic Information */}
                <h3 style={{
                    margin: '0 0 1.25rem 0',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#374151',
                    paddingBottom: '0.75rem',
                    borderBottom: '2px solid #E5E7EB'
                }}>
                    Basic Information
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Date <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <DatePicker
                            name="date"
                            value={formData.date}
                            onChange={handleInputChange}
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
                            Shift <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <select
                            name="shift"
                            value={formData.shift}
                            onChange={handleInputChange}
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}
                        >
                            <option value="">Select Shift</option>
                            <option value="1">Shift 1 (Morning)</option>
                            <option value="2">Shift 2 (Afternoon)</option>
                            <option value="3">Shift 3 (Night)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            Heat No
                        </label>
                        <input
                            type="text"
                            name="heatNo"
                            value={formData.heatNo}
                            onChange={handleInputChange}
                            placeholder="Enter Heat No"
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}
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
                            Part Number
                        </label>
                        <input
                            type="text"
                            name="partNumber"
                            value={formData.partNumber}
                            onChange={handleInputChange}
                            placeholder="Enter Part Number"
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}
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
                            Part Name
                        </label>
                        <input
                            type="text"
                            name="partName"
                            value={formData.partName}
                            onChange={handleInputChange}
                            placeholder="Enter Part Name"
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}
                        />
                    </div>
                </div>

                {/* Sand Testing Parameters */}
                <h3 style={{
                    margin: '0 0 1.25rem 0',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#374151',
                    paddingBottom: '0.75rem',
                    borderBottom: '2px solid #E5E7EB'
                }}>
                    Sand Testing Parameters
                </h3>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '2rem'
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            marginBottom: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                        }}>
                            G.C. Strength (gm/cm²)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Enter value"
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}
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
                            Moisture (%)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Enter value"
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}
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
                            Compactibility (%)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="Enter value"
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}
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
                            Permeability
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            placeholder="Enter value"
                            style={{
                                width: '100%',
                                padding: '0.625rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '8px',
                                fontSize: '0.875rem'
                            }}
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end',
                    paddingTop: '1.5rem',
                    borderTop: '2px solid #E5E7EB'
                }}>
                    <button
                        onClick={() => setFormData({
                            partName: '',
                            partNumber: '',
                            heatNo: '',
                            shift: '',
                            date: new Date().toISOString().split('T')[0],
                            time: ''
                        })}
                        style={{
                            padding: '0.625rem 1.5rem',
                            backgroundColor: 'white',
                            color: '#6B7280',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleSave}
                        style={{
                            padding: '0.625rem 1.5rem',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        <FiPlus size={18} />
                        Save Reading
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewReadingPage;
