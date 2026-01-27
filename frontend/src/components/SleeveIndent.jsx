import React, { useState, useRef } from 'react';
import { toast } from 'sonner';
import api from '../api';
import '../App.css';
import TableSkeleton from './common/TableSkeleton';
import DatePicker from './common/DatePicker';
import { formatDate } from '../styles/sharedStyles';

const SleeveIndent = () => {
    // Step state - 'selection' or 'table'
    const [currentStep, setCurrentStep] = useState('selection');
    
    // Form state
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    
    // Table state
    const [sleeveIndentData, setSleeveIndentData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Preview modal state
    const [showPreview, setShowPreview] = useState(false);
    
    // Reference for print content
    const printRef = useRef(null);

    // Fetch sleeve indent data when Next is clicked
    const fetchSleeveIndentData = async () => {
        if (!fromDate) {
            toast.error('Please select a From Date');
            return;
        }
        if (!toDate) {
            toast.error('Please select a To Date');
            return;
        }
        if (new Date(fromDate) > new Date(toDate)) {
            toast.error('From Date cannot be after To Date');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.get(`/sleeve-indent?fromDate=${fromDate}&toDate=${toDate}`);
            // Ensure we always have an array
            const data = Array.isArray(response.data) ? response.data : [];
            setSleeveIndentData(data);
            setCurrentStep('table');
            if (data.length === 0) {
                toast.info('No sleeve indent data found for the selected date range');
            }
        } catch (err) {
            console.error('Error fetching sleeve indent data:', err);
            toast.error('Failed to fetch sleeve indent data');
            setSleeveIndentData([]); // Reset to empty array on error
        } finally {
            setIsLoading(false);
        }
    };

    // Handle back button
    const handleBack = () => {
        setCurrentStep('selection');
        setSleeveIndentData([]);
    };

    // Format sleeve qty display: (type=qty, type2=qty2) = total
    const formatSleeveQty = (row) => {
        const details = row.SleeveDetails || [];
        if (details.length === 0) {
            return row.SleeveQty || 0;
        }
        if (details.length === 1) {
            return `${details[0].name} = ${details[0].qty}`;
        }
        // Multiple sleeves
        const parts = details.map(d => `${d.name} = ${d.qty}`).join(', ');
        return `(${parts}) = ${row.SleeveQty}`;
    };

    // Format required sleeve qty display: (type=required, type2=required) = total
    const formatRequiredSleeveQty = (row) => {
        const details = row.SleeveDetails || [];
        if (details.length === 0) {
            return row.RequiredSleeveQty || 0;
        }
        if (details.length === 1) {
            return `${details[0].name} = ${details[0].requiredQty}`;
        }
        // Multiple sleeves
        const parts = details.map(d => `${d.name} = ${d.requiredQty}`).join(', ');
        return `(${parts}) = ${row.RequiredSleeveQty}`;
    };

    // Handle print functionality
    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        
        // Aggregate sleeve quantities by type across all rows
        const sleeveAggregation = {};
        sleeveIndentData.forEach(row => {
            const details = row.SleeveDetails || [];
            details.forEach(d => {
                if (!sleeveAggregation[d.name]) {
                    sleeveAggregation[d.name] = 0;
                }
                sleeveAggregation[d.name] += d.requiredQty || 0;
            });
        });
        
        const aggregatedSleeves = Object.entries(sleeveAggregation).map(([name, qty]) => ({ name, qty }));
        const totalRequired = aggregatedSleeves.reduce((sum, s) => sum + s.qty, 0);

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Sleeve Indent Report</title>
                <style>
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        color: #1e3a5f;
                        background: white;
                        min-height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 40px 20px;
                        flex: 1;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 15px;
                        border-bottom: 3px solid #1e3a5f;
                    }
                    .header h1 {
                        font-size: 24px;
                        font-weight: 700;
                        color: #1e3a5f;
                        margin-bottom: 8px;
                        letter-spacing: 2px;
                    }
                    .header p {
                        font-size: 12px;
                        color: #5a7a9a;
                        font-style: italic;
                        text-decoration: underline;
                    }
                    .date-card {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 15px 25px;
                        margin-bottom: 30px;
                        display: flex;
                        justify-content: center;
                        gap: 40px;
                    }
                    .date-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .date-label {
                        font-weight: 600;
                        color: #1e3a5f;
                    }
                    .date-value {
                        background: white;
                        border: 1px solid #cbd5e1;
                        padding: 6px 15px;
                        border-radius: 4px;
                        font-weight: 500;
                    }
                    .table-container {
                        margin-bottom: 30px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    th {
                        background: #1e3a5f;
                        color: white;
                        padding: 12px 20px;
                        text-align: left;
                        font-weight: 600;
                        font-size: 14px;
                    }
                    th:last-child {
                        text-align: center;
                    }
                    td {
                        padding: 12px 20px;
                        border-bottom: 1px solid #e2e8f0;
                        font-size: 13px;
                    }
                    td:last-child {
                        text-align: center;
                        font-weight: 600;
                    }
                    tr:hover {
                        background: #f8fafc;
                    }
                    .total-row {
                        background: #fef3c7 !important;
                    }
                    .total-row td {
                        font-weight: 700;
                        font-size: 14px;
                        border-top: 2px solid #1e3a5f;
                    }
                    .footer {
                        margin-top: auto;
                        padding-top: 60px;
                    }
                    .signature-section {
                        display: flex;
                        justify-content: space-between;
                        padding: 0 40px;
                    }
                    .signature-box {
                        text-align: center;
                    }
                    .signature-line {
                        width: 150px;
                        border-top: 1px solid #1e3a5f;
                        margin-bottom: 8px;
                    }
                    .signature-label {
                        font-size: 12px;
                        font-weight: 600;
                        color: #1e3a5f;
                    }
                    @media print {
                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SLEEVE INDENT</h1>
                        <p>Production Planning Department</p>
                    </div>
                    
                    <div class="date-card">
                        <div class="date-item">
                            <span class="date-label">From Date:</span>
                            <span class="date-value">${formatDate(fromDate)}</span>
                        </div>
                        <div class="date-item">
                            <span class="date-label">To Date:</span>
                            <span class="date-value">${formatDate(toDate)}</span>
                        </div>
                    </div>
                    
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Sleeve Type</th>
                                    <th>Quantity</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${aggregatedSleeves.map(sleeve => `
                                    <tr>
                                        <td>${sleeve.name}</td>
                                        <td>${sleeve.qty}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td>Total</td>
                                    <td>${totalRequired}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="footer">
                    <div class="signature-section">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">Prepared By</div>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <div class="signature-label">Approved By</div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `);
        
        printWindow.document.close();
        printWindow.focus();
        
        // Wait for content to load then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    // Handle preview functionality
    const handlePreview = () => {
        setShowPreview(true);
    };

    // Table styles
    const thStyle = {
        padding: '0.75rem 1rem',
        fontWeight: '600',
        border: '1px solid #374151',
        borderBottom: '2px solid #374151',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontSize: '0.875rem',
        backgroundColor: '#FEF3C7'
    };

    const tdStyle = {
        padding: '0.75rem 1rem',
        border: '1px solid #374151',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontSize: '0.875rem'
    };

    return (
        <div>
            {/* Step 1: Date Range Selection */}
            {currentStep === 'selection' && (
                <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title blue">Select Date Range</h3>

                    <div className="form-grid" style={{ maxWidth: '600px' }}>
                        {/* From Date */}
                        <div className="form-group">
                            <label htmlFor="fromDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                From Date <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <DatePicker
                                id="fromDate"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                placeholder="Select start date..."
                            />
                        </div>

                        {/* To Date */}
                        <div className="form-group">
                            <label htmlFor="toDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                To Date <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <DatePicker
                                id="toDate"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                placeholder="Select end date..."
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <button
                            onClick={fetchSleeveIndentData}
                            className="btn btn-primary"
                            disabled={isLoading}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 2rem',
                                fontSize: '1rem'
                            }}
                        >
                            {isLoading ? 'Loading...' : 'Next →'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Sleeve Indent Table */}
            {currentStep === 'table' && (
                <>
                    {/* Header with Back button and Info */}
                    <div className="section-container section-amber" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 className="section-title amber" style={{ marginBottom: '0.5rem' }}>
                                    Sleeve Indent
                                </h3>
                                <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                                    From: <strong>{formatDate(fromDate)}</strong> | To: <strong>{formatDate(toDate)}</strong>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handlePreview}
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    disabled={sleeveIndentData.length === 0}
                                >
                                    👁 Preview
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="btn btn-primary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    disabled={sleeveIndentData.length === 0}
                                >
                                    🖨 Print
                                </button>
                                <button
                                    onClick={handleBack}
                                    className="btn btn-secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    ← Back
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="section-container section-gray" style={{ marginBottom: '1.5rem' }} ref={printRef}>
                        <h3 className="section-title gray">
                            Sleeve Indent Table ({sleeveIndentData.length} entries)
                        </h3>

                        {isLoading ? (
                            <TableSkeleton rows={5} columns={6} />
                        ) : sleeveIndentData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                No sleeve indent data found for the selected date range.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Part Code</th>
                                            <th style={thStyle}>Pattern No</th>
                                            <th style={thStyle}>Cavity</th>
                                            <th style={thStyle}>Schedule Qty</th>
                                            <th style={thStyle}>Sleeve Qty</th>
                                            <th style={{ ...thStyle, backgroundColor: '#D1FAE5', color: '#047857' }}>Required Sleeve Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sleeveIndentData.map((row, index) => (
                                            <tr
                                                key={index}
                                                style={{
                                                    backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB',
                                                    transition: 'background-color 0.15s'
                                                }}
                                            >
                                                <td style={{ ...tdStyle, fontWeight: '600', color: '#2563EB' }}>
                                                    {row.PartCode}
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: '500' }}>
                                                    {row.PatternNo}
                                                </td>
                                                <td style={tdStyle}>
                                                    {row.Cavity}
                                                </td>
                                                <td style={tdStyle}>
                                                    {row.ScheduleQty}
                                                </td>
                                                <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: '200px' }}>
                                                    {formatSleeveQty(row)}
                                                </td>
                                                <td style={{ 
                                                    ...tdStyle, 
                                                    fontWeight: '700', 
                                                    backgroundColor: '#ECFDF5',
                                                    color: '#047857',
                                                    whiteSpace: 'normal',
                                                    minWidth: '220px'
                                                }}>
                                                    {formatRequiredSleeveQty(row)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* Summary footer */}
                                    <tfoot>
                                        <tr style={{ backgroundColor: '#FEF3C7' }}>
                                            <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', borderTop: '2px solid #F59E0B' }}>
                                                Total Required Sleeves:
                                            </td>
                                            <td style={{ 
                                                ...tdStyle, 
                                                fontWeight: '700', 
                                                fontSize: '1.1rem',
                                                backgroundColor: '#FEF3C7',
                                                color: '#B45309',
                                                borderTop: '2px solid #F59E0B'
                                            }}>
                                                {sleeveIndentData.reduce((sum, row) => sum + (row.RequiredSleeveQty || 0), 0)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Preview Modal */}
            {showPreview && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => setShowPreview(false)}
                >
                    <div 
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            width: '100%',
                            maxWidth: '800px',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Preview Header */}
                        <div style={{ 
                            padding: '1rem 1.5rem', 
                            borderBottom: '1px solid #E5E7EB',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#F9FAFB'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>Print Preview</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={handlePrint}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    🖨 Print
                                </button>
                                <button
                                    onClick={() => setShowPreview(false)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    ✕ Close
                                </button>
                            </div>
                        </div>
                        
                        {/* Preview Content - A4 simulation */}
                        <div style={{ 
                            padding: '20px',
                            backgroundColor: '#E5E7EB'
                        }}>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '40px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                fontFamily: "'Segoe UI', Arial, sans-serif",
                                color: '#1e3a5f',
                                minHeight: '500px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {/* Report Header */}
                                <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '3px solid #1e3a5f', paddingBottom: '15px' }}>
                                    <h1 style={{ fontSize: '24px', margin: '0 0 8px 0', color: '#1e3a5f', fontWeight: '700', letterSpacing: '2px' }}>SLEEVE INDENT</h1>
                                    <p style={{ fontSize: '12px', color: '#5a7a9a', margin: 0, fontStyle: 'italic', textDecoration: 'underline' }}>Production Planning Department</p>
                                </div>
                                
                                {/* Date Card */}
                                <div style={{ 
                                    background: '#f8fafc', 
                                    border: '1px solid #e2e8f0', 
                                    borderRadius: '8px', 
                                    padding: '15px 25px', 
                                    marginBottom: '30px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    gap: '40px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontWeight: '600', color: '#1e3a5f' }}>From Date:</span>
                                        <span style={{ background: 'white', border: '1px solid #cbd5e1', padding: '6px 15px', borderRadius: '4px', fontWeight: '500' }}>{formatDate(fromDate)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ fontWeight: '600', color: '#1e3a5f' }}>To Date:</span>
                                        <span style={{ background: 'white', border: '1px solid #cbd5e1', padding: '6px 15px', borderRadius: '4px', fontWeight: '500' }}>{formatDate(toDate)}</span>
                                    </div>
                                </div>
                                
                                {/* Table */}
                                <div style={{ marginBottom: '30px', flex: 1 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ background: '#1e3a5f', color: 'white', padding: '12px 20px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Sleeve Type</th>
                                                <th style={{ background: '#1e3a5f', color: 'white', padding: '12px 20px', textAlign: 'center', fontWeight: '600', fontSize: '14px' }}>Quantity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                // Aggregate sleeve quantities by type
                                                const sleeveAggregation = {};
                                                sleeveIndentData.forEach(row => {
                                                    const details = row.SleeveDetails || [];
                                                    details.forEach(d => {
                                                        if (!sleeveAggregation[d.name]) {
                                                            sleeveAggregation[d.name] = 0;
                                                        }
                                                        sleeveAggregation[d.name] += d.requiredQty || 0;
                                                    });
                                                });
                                                const aggregatedSleeves = Object.entries(sleeveAggregation).map(([name, qty]) => ({ name, qty }));
                                                const totalRequired = aggregatedSleeves.reduce((sum, s) => sum + s.qty, 0);
                                                
                                                return (
                                                    <>
                                                        {aggregatedSleeves.map((sleeve, index) => (
                                                            <tr key={index} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                                <td style={{ padding: '12px 20px', fontSize: '13px' }}>{sleeve.name}</td>
                                                                <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: '600', fontSize: '13px' }}>{sleeve.qty}</td>
                                                            </tr>
                                                        ))}
                                                        <tr style={{ background: '#fef3c7' }}>
                                                            <td style={{ padding: '12px 20px', fontWeight: '700', fontSize: '14px', borderTop: '2px solid #1e3a5f' }}>Total</td>
                                                            <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: '700', fontSize: '14px', borderTop: '2px solid #1e3a5f' }}>{totalRequired}</td>
                                                        </tr>
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                                
                                {/* Signature Footer */}
                                <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 40px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ width: '150px', borderTop: '1px solid #1e3a5f', marginBottom: '8px' }}></div>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e3a5f' }}>Prepared By</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ width: '150px', borderTop: '1px solid #1e3a5f', marginBottom: '8px' }}></div>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1e3a5f' }}>Approved By</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SleeveIndent;
