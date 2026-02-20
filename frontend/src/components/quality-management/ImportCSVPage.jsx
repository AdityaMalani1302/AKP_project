import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUpload, FiDownload, FiFile } from 'react-icons/fi';

const ImportCSVPage = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState(null);

    const handleBack = () => {
        navigate('/quality-management-system/sand-testing');
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.name.endsWith('.csv')) {
                setSelectedFile(file);
                setImportStatus(null);
            } else {
                setImportStatus({
                    type: 'error',
                    message: 'Please select a CSV file'
                });
            }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (file.name.endsWith('.csv')) {
                setSelectedFile(file);
                setImportStatus(null);
            } else {
                setImportStatus({
                    type: 'error',
                    message: 'Please drop a CSV file'
                });
            }
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleImport = async () => {
        if (!selectedFile) return;

        setIsImporting(true);
        setImportStatus(null);

        // Simulate import process
        setTimeout(() => {
            setIsImporting(false);
            setImportStatus({
                type: 'success',
                message: `Successfully imported ${selectedFile.name}`
            });
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }, 2000);
    };

    const handleDownloadTemplate = () => {
        // Create a sample CSV template
        const template = 'Date,Shift,Heat No,Part No,Part Name,G.C. Strength,Moisture,Compactibility,Permeability\n2026-02-09,1,H001,P123,Casting A,1250,4.0,42,135\n';
        
        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sand_testing_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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
                Import CSV Data
            </h2>

            {/* Import Status */}
            {importStatus && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    borderRadius: '8px',
                    backgroundColor: importStatus.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                    border: `1px solid ${importStatus.type === 'success' ? '#10B981' : '#EF4444'}`,
                    color: importStatus.type === 'success' ? '#047857' : '#DC2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    {importStatus.type === 'success' ? (
                        <span style={{ fontSize: '1.25rem' }}>✓</span>
                    ) : (
                        <span style={{ fontSize: '1.25rem' }}>✕</span>
                    )}
                    {importStatus.message}
                </div>
            )}

            {/* Upload Area */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                marginBottom: '1.5rem'
            }}>
                <h3 style={{
                    margin: '0 0 1.5rem 0',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#374151'
                }}>
                    Upload CSV File
                </h3>

                {/* Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                        border: '2px dashed #D1D5DB',
                        borderRadius: '12px',
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        cursor: 'pointer',
                        backgroundColor: '#FAFAFA',
                        transition: 'all 0.2s ease',
                        marginBottom: '1.5rem'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3B82F6';
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#D1D5DB';
                        e.currentTarget.style.backgroundColor = '#FAFAFA';
                    }}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".csv"
                        style={{ display: 'none' }}
                    />

                    <div style={{
                        width: '64px',
                        height: '64px',
                        margin: '0 auto 1rem',
                        backgroundColor: '#EFF6FF',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <FiUpload size={28} color="#3B82F6" />
                    </div>

                    <p style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '1rem',
                        fontWeight: '500',
                        color: '#374151'
                    }}>
                        Drag and drop your CSV file here
                    </p>
                    <p style={{
                        margin: '0 0 1rem 0',
                        fontSize: '0.875rem',
                        color: '#6B7280'
                    }}>
                        or click to browse
                    </p>
                    <p style={{
                        margin: 0,
                        fontSize: '0.75rem',
                        color: '#9CA3AF'
                    }}>
                        Supported format: .csv
                    </p>
                </div>

                {/* Selected File */}
                {selectedFile && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '8px',
                        marginBottom: '1.5rem'
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#E5E7EB',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <FiFile size={20} color="#6B7280" />
                            </div>
                            <div>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.875rem',
                                    fontWeight: '500',
                                    color: '#374151'
                                }}>
                                    {selectedFile.name}
                                </p>
                                <p style={{
                                    margin: 0,
                                    fontSize: '0.75rem',
                                    color: '#6B7280'
                                }}>
                                    {(selectedFile.size / 1024).toFixed(2)} KB
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            style={{
                                padding: '0.5rem',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#6B7280'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* Import Button */}
                <button
                    onClick={handleImport}
                    disabled={!selectedFile || isImporting}
                    style={{
                        width: '100%',
                        padding: '0.875rem',
                        backgroundColor: !selectedFile || isImporting ? '#9CA3AF' : '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        cursor: !selectedFile || isImporting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        transition: 'background-color 0.2s'
                    }}
                >
                    {isImporting ? (
                        <>
                            <span style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid white',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }} />
                            Importing...
                        </>
                    ) : (
                        <>
                            <FiUpload size={18} />
                            Import CSV
                        </>
                    )}
                </button>
            </div>

            {/* Instructions */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
                <h3 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151'
                }}>
                    CSV Format Instructions
                </h3>

                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    marginBottom: '1rem'
                }}>
                    <button
                        onClick={handleDownloadTemplate}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#F3F4F6',
                            color: '#374151',
                            border: '1px solid #E5E7EB',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        <FiDownload size={16} />
                        Download Template
                    </button>
                </div>

                <p style={{
                    margin: '0 0 1rem 0',
                    fontSize: '0.875rem',
                    color: '#6B7280'
                }}>
                    Your CSV file should contain the following columns:
                </p>

                <div style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: '8px',
                    padding: '1rem',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    overflowX: 'auto'
                }}>
                    Date,Shift,Heat No,Part No,Part Name,G.C. Strength,Moisture,Compactibility,Permeability
                </div>

                <p style={{
                    margin: '1rem 0 0 0',
                    fontSize: '0.75rem',
                    color: '#9CA3AF'
                }}>
                    Note: Do not change the column names in the CSV file.
                </p>
            </div>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ImportCSVPage;
