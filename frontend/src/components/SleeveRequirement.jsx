import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import '../App.css';
import TableSkeleton from './common/TableSkeleton';
import DatePicker from './common/DatePicker';
import { formatDate } from '../styles/sharedStyles';

const SleeveRequirement = () => {
    const queryClient = useQueryClient();
    
    // Step state - 'selection' or 'table'
    const [currentStep, setCurrentStep] = useState('selection');
    
    // Form state
    const [planDate, setPlanDate] = useState('');
    const [shift, setShift] = useState('');
    
    // Table state
    const [sleeveData, setSleeveData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedRows, setSelectedRows] = useState(new Set());

    // Print preview state
    const [printPlanDate, setPrintPlanDate] = useState('');
    const [printShift, setPrintShift] = useState('');
    const [showPrintPreview, setShowPrintPreview] = useState(false);
    const [printData, setPrintData] = useState([]);
    const [isPrintLoading, setIsPrintLoading] = useState(false);
    const printRef = useRef(null);

    // Records filter state
    const [filterSearch, setFilterSearch] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [filterShift, setFilterShift] = useState('');

    // Fetch submitted sleeve requirement records
    const { data: records = [], isLoading: isRecordsLoading, refetch: refetchRecords } = useQuery({
        queryKey: ['sleeve-requirement-records'],
        queryFn: async () => {
            const res = await api.get('/sleeve-requirement/records');
            return res.data;
        },
        staleTime: 30000,
    });

    // Fetch sleeve requirements when Next is clicked
    const fetchSleeveRequirements = async () => {
        if (!planDate) {
            toast.error('Please select a Plan Date');
            return;
        }
        if (!shift) {
            toast.error('Please select a Shift');
            return;
        }

        setIsLoading(true);
        try {
            const response = await api.get(`/sleeve-requirement?planDate=${planDate}&shift=${shift}`);
            // Ensure we always have an array
            const data = Array.isArray(response.data) ? response.data : [];
            setSleeveData(data);
            setCurrentStep('table');
            if (data.length === 0) {
                toast.info('No planning entries found for the selected date and shift');
            }
        } catch (err) {
            console.error('Error fetching sleeve requirements:', err);
            toast.error('Failed to fetch sleeve requirements');
            setSleeveData([]); // Reset to empty array on error
        } finally {
            setIsLoading(false);
        }
    };

    // Handle row selection
    const handleRowToggle = (index) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    // Handle select all (only non-submitted entries)
    const handleSelectAll = () => {
        const pendingIndices = sleeveData
            .map((row, i) => (!row.isSubmitted ? i : null))
            .filter(i => i !== null);
        
        if (selectedRows.size === pendingIndices.length && pendingIndices.length > 0) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(pendingIndices));
        }
    };

    // Submit mutation
    const submitMutation = useMutation({
        mutationFn: (data) => api.post('/sleeve-requirement', data),
        onSuccess: () => {
            toast.success('Sleeve requirements submitted successfully!');
            setSelectedRows(new Set());
            // Refresh data to update status of submitted entries
            fetchSleeveRequirements();
            // Also refresh records table
            refetchRecords();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to submit sleeve requirements');
        }
    });

    // Handle submit
    const handleSubmit = () => {
        if (selectedRows.size === 0) {
            toast.error('Please select at least one row to submit');
            return;
        }

        const selectedData = sleeveData.filter((_, index) => selectedRows.has(index));
        submitMutation.mutate({
            planDate,
            shift: parseInt(shift),
            entries: selectedData
        });
    };

    // Handle back button
    const handleBack = () => {
        setCurrentStep('selection');
        setSleeveData([]);
        setSelectedRows(new Set());
    };

    // Handle Preview and Print
    const handlePreviewAndPrint = async () => {
        if (!printPlanDate) {
            toast.error('Please select a Plan Date for print');
            return;
        }
        if (!printShift) {
            toast.error('Please select a Shift for print');
            return;
        }

        setIsPrintLoading(true);
        try {
            const response = await api.get(`/sleeve-requirement/print-data?planDate=${printPlanDate}&shift=${printShift}`);
            if (response.data.length === 0) {
                toast.info('No sleeve data found for the selected date and shift');
                return;
            }
            setPrintData(response.data);
            setShowPrintPreview(true);
        } catch (err) {
            console.error('Error fetching print data:', err);
            toast.error('Failed to fetch print data');
        } finally {
            setIsPrintLoading(false);
        }
    };

    // Handle print action
    const handlePrint = () => {
        window.print();
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
        backgroundColor: '#E0F2FE'
    };

    const tdStyle = {
        padding: '0.75rem 1rem',
        border: '1px solid #374151',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontSize: '0.875rem'
    };

    const recordThStyle = {
        padding: '0.5rem 0.75rem',
        fontWeight: '600',
        border: '1px solid #374151',
        borderBottom: '2px solid #374151',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontSize: '0.8rem',
        backgroundColor: '#F0FDF4'
    };

    const recordTdStyle = {
        padding: '0.5rem 0.75rem',
        border: '1px solid #374151',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        fontSize: '0.8rem'
    };

    return (
        <div>
            {/* Step 1: Date and Shift Selection */}
            {currentStep === 'selection' && (
                <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title blue">Select Plan Date and Shift</h3>

                    <div className="form-grid" style={{ maxWidth: '600px' }}>
                        {/* Plan Date */}
                        <div className="form-group">
                            <label htmlFor="planDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Plan Date <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <DatePicker
                                id="planDate"
                                value={planDate}
                                onChange={(e) => setPlanDate(e.target.value)}
                                placeholder="Select plan date..."
                            />
                        </div>

                        {/* Shift */}
                        <div className="form-group">
                            <label htmlFor="shift" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Shift <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <select
                                id="shift"
                                value={shift}
                                onChange={(e) => setShift(e.target.value)}
                                className="input-field"
                                style={{ cursor: 'pointer' }}
                            >
                                <option value="">Select Shift</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: '1.5rem' }}>
                        <button
                            onClick={fetchSleeveRequirements}
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

            {/* Step 2: Sleeve Requirement Table */}
            {currentStep === 'table' && (
                <>
                    {/* Header with Back button and Info */}
                    <div className="section-container section-teal" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h3 className="section-title teal" style={{ marginBottom: '0.5rem' }}>
                                    Sleeve Requirements
                                </h3>
                                <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                                    Date: <strong>{formatDate(planDate)}</strong> | Shift: <strong>{shift}</strong>
                                </p>
                            </div>
                            <button
                                onClick={handleBack}
                                className="btn btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                ← Back
                            </button>
                        </div>
                    </div>

                    {/* Table Section */}
                    <div className="section-container section-gray" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <h3 className="section-title gray">
                                Sleeve Requirement Table ({sleeveData.length} entries)
                            </h3>
                        </div>

                        {isLoading ? (
                            <TableSkeleton rows={5} columns={6} />
                        ) : sleeveData.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                No sleeve requirements found for the selected date and shift.
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr>
                                            <th style={thStyle}>Pattern No</th>
                                            <th style={thStyle}>Plate Qty</th>
                                            <th style={thStyle}>Sleeve Type</th>
                                            <th style={thStyle}>Sleeve Qty</th>
                                            <th style={{ ...thStyle, backgroundColor: '#D1FAE5', color: '#047857' }}>Total Sleeves</th>
                                            <th style={{ ...thStyle, width: '100px' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sleeveData.map((row, index) => (
                                            <tr
                                                key={index}
                                                style={{
                                                    backgroundColor: row.isSubmitted 
                                                        ? '#F0FDF4' 
                                                        : (index % 2 === 0 ? 'white' : '#F9FAFB'),
                                                    transition: 'background-color 0.15s',
                                                    opacity: row.isSubmitted ? 0.8 : 1
                                                }}
                                            >
                                                <td style={{ ...tdStyle, fontWeight: '600', color: row.isSubmitted ? '#6B7280' : '#2563EB' }}>
                                                    {row.PatternNo}
                                                </td>
                                                <td style={tdStyle}>
                                                    {row.PlateQty}
                                                </td>
                                                <td style={{ ...tdStyle, fontWeight: '500' }}>
                                                    {row.SleeveType}
                                                </td>
                                                <td style={tdStyle}>
                                                    {row.SleeveQty}
                                                </td>
                                                <td style={{ 
                                                    ...tdStyle, 
                                                    fontWeight: '700', 
                                                    backgroundColor: '#ECFDF5',
                                                    color: '#047857',
                                                    fontSize: '1rem'
                                                }}>
                                                    {row.TotalSleeves}
                                                </td>
                                                <td style={tdStyle}>
                                                    {row.isSubmitted ? (
                                                        <span style={{
                                                            padding: '0.25rem 0.75rem',
                                                            backgroundColor: '#D1FAE5',
                                                            color: '#047857',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600'
                                                        }}>
                                                            ✓ Done
                                                        </span>
                                                    ) : (
                                                        <span style={{
                                                            padding: '0.25rem 0.75rem',
                                                            backgroundColor: '#FEF3C7',
                                                            color: '#B45309',
                                                            borderRadius: '9999px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600'
                                                        }}>
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    {/* Summary footer */}
                                    <tfoot>
                                        <tr style={{ backgroundColor: '#FEF3C7' }}>
                                            <td colSpan={5} style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', borderTop: '2px solid #F59E0B' }}>
                                                Grand Total:
                                            </td>
                                            <td style={{ 
                                                ...tdStyle, 
                                                fontWeight: '700', 
                                                fontSize: '1.1rem',
                                                backgroundColor: '#FEF3C7',
                                                color: '#B45309',
                                                borderTop: '2px solid #F59E0B'
                                            }}>
                                                {sleeveData.reduce((sum, row) => sum + (row.TotalSleeves || 0), 0)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* Submit Button */}
                        {sleeveData.length > 0 && sleeveData.some(row => !row.isSubmitted) && (
                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => {
                                        // Auto-select all pending entries and submit
                                        const pendingIndices = sleeveData
                                            .map((row, i) => (!row.isSubmitted ? i : null))
                                            .filter(i => i !== null);
                                        setSelectedRows(new Set(pendingIndices));
                                        // Submit after state update
                                        setTimeout(() => {
                                            const pendingData = sleeveData.filter(row => !row.isSubmitted);
                                            submitMutation.mutate({
                                                planDate,
                                                shift: parseInt(shift),
                                                entries: pendingData
                                            });
                                        }, 0);
                                    }}
                                    className="btn"
                                    disabled={submitMutation.isPending}
                                    style={{
                                        backgroundColor: '#10B981',
                                        color: 'white',
                                        padding: '0.75rem 2rem',
                                        fontSize: '1rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    {submitMutation.isPending ? 'Submitting...' : `Submit All (${sleeveData.filter(row => !row.isSubmitted).length} pending)`}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Records Table Section */}
            <div className="section-container section-green" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title green" style={{ marginBottom: '1rem' }}>
                    Submitted Sleeve Requirements ({records.length} records)
                </h3>
                
                {/* Filter Controls */}
                <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    marginBottom: '1rem', 
                    flexWrap: 'wrap',
                    alignItems: 'flex-end'
                }}>
                    {/* Search Filter */}
                    <div style={{ flex: '1', minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
                            Search (Pattern No / Sleeve Type)
                        </label>
                        <input
                            type="text"
                            value={filterSearch}
                            onChange={(e) => setFilterSearch(e.target.value)}
                            placeholder="Type to search..."
                            className="input-field"
                            style={{ width: '100%' }}
                        />
                    </div>
                    
                    {/* Date Filter */}
                    <div style={{ minWidth: '150px' }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
                            Plan Date
                        </label>
                        <DatePicker
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                            placeholder="Filter by date..."
                        />
                    </div>
                    
                    {/* Shift Filter */}
                    <div style={{ minWidth: '100px' }}>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', color: '#374151', fontWeight: '500' }}>
                            Shift
                        </label>
                        <select
                            value={filterShift}
                            onChange={(e) => setFilterShift(e.target.value)}
                            className="input-field"
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="">All</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>
                    
                    {/* Clear Filters Button */}
                    {(filterSearch || filterDate || filterShift) && (
                        <button
                            onClick={() => {
                                setFilterSearch('');
                                setFilterDate('');
                                setFilterShift('');
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '0.5rem 1rem', height: 'fit-content' }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
                
                {(() => {
                    // Filter records based on filters
                    const filteredRecords = records.filter(record => {
                        // Search filter
                        if (filterSearch) {
                            const searchLower = filterSearch.toLowerCase();
                            const matchesPattern = record.PatternNo?.toLowerCase().includes(searchLower);
                            const matchesSleeve = record.SleeveType?.toLowerCase().includes(searchLower);
                            if (!matchesPattern && !matchesSleeve) return false;
                        }
                        
                        // Date filter
                        if (filterDate) {
                            const recordDate = new Date(record.PlanDate).toISOString().split('T')[0];
                            if (recordDate !== filterDate) return false;
                        }
                        
                        // Shift filter
                        if (filterShift && record.Shift != filterShift) return false;
                        
                        return true;
                    });
                    
                    return isRecordsLoading ? (
                        <TableSkeleton rows={5} columns={8} />
                    ) : filteredRecords.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                            {records.length === 0 
                                ? 'No records found. Submit sleeve requirements to see them here.'
                                : `No records match the current filters (${records.length} total records)`
                            }
                        </div>
                    ) : (
                    <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={recordThStyle}>Sr. No</th>
                                    <th style={recordThStyle}>Plan Date</th>
                                    <th style={recordThStyle}>Shift</th>
                                    <th style={recordThStyle}>Pattern No</th>
                                    <th style={recordThStyle}>Plate Qty</th>
                                    <th style={recordThStyle}>Sleeve Type</th>
                                    <th style={recordThStyle}>Sleeve Qty</th>
                                    <th style={recordThStyle}>Total Sleeves</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecords.map((record, index) => (
                                    <tr
                                        key={record.Id}
                                        style={{
                                            backgroundColor: 'white',
                                            transition: 'background-color 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F0FDF4'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <td style={recordTdStyle}>{index + 1}</td>
                                        <td style={recordTdStyle}>{formatDate(record.PlanDate)}</td>
                                        <td style={recordTdStyle}>{record.Shift}</td>
                                        <td style={{ ...recordTdStyle, fontWeight: '600', color: '#2563EB' }}>{record.PatternNo}</td>
                                        <td style={recordTdStyle}>{record.PlateQty}</td>
                                        <td style={{ ...recordTdStyle, fontWeight: '500' }}>{record.SleeveType}</td>
                                        <td style={recordTdStyle}>{record.SleeveQty}</td>
                                        <td style={{ ...recordTdStyle, fontWeight: '700', color: '#047857' }}>{record.TotalSleeves}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    );
                })()}
            </div>

            {/* Print Controls Section */}
            <div className="section-container section-purple" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title purple" style={{ marginBottom: '1rem' }}>
                    Preview & Print Sleeve Requirements
                </h3>
                
                <div className="form-grid" style={{ maxWidth: '600px', marginBottom: '1rem' }}>
                    {/* Print Plan Date */}
                    <div className="form-group">
                        <label htmlFor="printPlanDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Plan Date <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <DatePicker
                            id="printPlanDate"
                            value={printPlanDate}
                            onChange={(e) => setPrintPlanDate(e.target.value)}
                            placeholder="Select print date..."
                        />
                    </div>

                    {/* Print Shift */}
                    <div className="form-group">
                        <label htmlFor="printShift" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Shift <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <select
                            id="printShift"
                            value={printShift}
                            onChange={(e) => setPrintShift(e.target.value)}
                            className="input-field"
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="">Select Shift</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handlePreviewAndPrint}
                    className="btn btn-purple"
                    disabled={isPrintLoading}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem 2rem',
                        fontSize: '1rem'
                    }}
                >
                    {isPrintLoading ? 'Loading...' : '🖨️ Preview and Print'}
                </button>
            </div>

            {/* Print Preview Modal */}
            {showPrintPreview && (
                <div 
                    className="print-modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setShowPrintPreview(false)}
                >
                    <div 
                        className="print-modal-content"
                        style={{
                            backgroundColor: 'white',
                            padding: '2rem',
                            borderRadius: '8px',
                            maxWidth: '600px',
                            width: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Print Buttons */}
                        <div className="no-print" style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handlePrint}
                                className="btn btn-primary"
                                style={{ padding: '0.5rem 1.5rem' }}
                            >
                                🖨️ Print
                            </button>
                            <button
                                onClick={() => setShowPrintPreview(false)}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem 1.5rem' }}
                            >
                                ✕ Close
                            </button>
                        </div>

                        {/* Print Content */}
                        <div ref={printRef} className="print-content" style={{ 
                            border: '2px solid #1e3a5f', 
                            padding: '2rem',
                            fontFamily: "'Segoe UI', 'Roboto', 'Arial', sans-serif",
                            background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)'
                        }}>
                            {/* Header with Logo/Company Name */}
                            <div style={{ 
                                textAlign: 'center', 
                                marginBottom: '1.5rem',
                                paddingBottom: '1rem',
                                borderBottom: '3px solid #1e3a5f'
                            }}>
                                <h1 style={{ 
                                    fontSize: '1.6rem', 
                                    fontWeight: '700', 
                                    color: '#1e3a5f',
                                    margin: '0 0 0.5rem 0',
                                    letterSpacing: '2px',
                                    textTransform: 'uppercase'
                                }}>
                                    Sleeves Requirement Planning
                                </h1>
                                <p style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#64748b',
                                    margin: 0,
                                    fontStyle: 'italic'
                                }}>
                                    Production Planning Department
                                </p>
                            </div>

                            {/* Date and Shift Info */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                gap: '3rem', 
                                marginBottom: '2rem',
                                padding: '1rem',
                                backgroundColor: '#e8f4fd',
                                borderRadius: '8px',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ 
                                        fontWeight: '600', 
                                        color: '#374151',
                                        fontSize: '0.95rem'
                                    }}>Plan Date:</span>
                                    <span style={{ 
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #94a3b8',
                                        padding: '0.4rem 1rem',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        color: '#1e3a5f',
                                        fontSize: '0.95rem'
                                    }}>
                                        {formatDate(printPlanDate)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ 
                                        fontWeight: '600', 
                                        color: '#374151',
                                        fontSize: '0.95rem'
                                    }}>Shift:</span>
                                    <span style={{ 
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #94a3b8',
                                        padding: '0.4rem 1rem',
                                        borderRadius: '4px',
                                        fontWeight: '600',
                                        color: '#1e3a5f',
                                        fontSize: '0.95rem',
                                        minWidth: '40px',
                                        textAlign: 'center'
                                    }}>
                                        {printShift}
                                    </span>
                                </div>
                            </div>

                            {/* Sleeve Table */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                                <table style={{ 
                                    borderCollapse: 'collapse', 
                                    minWidth: '380px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    borderRadius: '8px',
                                    overflow: 'hidden'
                                }}>
                                    <thead>
                                        <tr>
                                            <th style={{ 
                                                backgroundColor: '#1e3a5f',
                                                color: '#ffffff',
                                                padding: '0.85rem 2rem',
                                                fontWeight: '600',
                                                fontSize: '1rem',
                                                textAlign: 'left',
                                                borderBottom: '2px solid #1e3a5f'
                                            }}>
                                                Sleeve Type
                                            </th>
                                            <th style={{ 
                                                backgroundColor: '#1e3a5f',
                                                color: '#ffffff',
                                                padding: '0.85rem 2rem',
                                                fontWeight: '600',
                                                fontSize: '1rem',
                                                textAlign: 'center',
                                                borderBottom: '2px solid #1e3a5f'
                                            }}>
                                                Quantity
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printData.map((item, index) => (
                                            <tr key={index} style={{ 
                                                backgroundColor: index % 2 === 0 ? '#f8fafc' : '#ffffff'
                                            }}>
                                                <td style={{ 
                                                    padding: '0.75rem 2rem',
                                                    borderBottom: '1px solid #e2e8f0',
                                                    fontSize: '0.95rem',
                                                    color: '#334155'
                                                }}>
                                                    {item.SleeveType}
                                                </td>
                                                <td style={{ 
                                                    padding: '0.75rem 2rem',
                                                    borderBottom: '1px solid #e2e8f0',
                                                    textAlign: 'center',
                                                    fontWeight: '600',
                                                    fontSize: '0.95rem',
                                                    color: '#1e3a5f'
                                                }}>
                                                    {item.Quantity}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ backgroundColor: '#dbeafe' }}>
                                            <td style={{ 
                                                padding: '0.85rem 2rem',
                                                fontWeight: '700',
                                                fontSize: '1rem',
                                                color: '#1e3a5f',
                                                borderTop: '2px solid #1e3a5f'
                                            }}>
                                                Total
                                            </td>
                                            <td style={{ 
                                                padding: '0.85rem 2rem',
                                                textAlign: 'center',
                                                fontWeight: '700',
                                                fontSize: '1.1rem',
                                                color: '#1e3a5f',
                                                borderTop: '2px solid #1e3a5f'
                                            }}>
                                                {printData.reduce((sum, item) => sum + (item.Quantity || 0), 0)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Signature Section */}
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                marginTop: '3rem',
                                paddingTop: '1.5rem',
                                borderTop: '2px solid #1e3a5f'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ 
                                        borderTop: '1px solid #64748b',
                                        width: '150px',
                                        marginTop: '2.5rem',
                                        marginBottom: '0.5rem',
                                        paddingTop: '0.5rem'
                                    }}></div>
                                    <span style={{ 
                                        fontWeight: '600', 
                                        color: '#374151',
                                        fontSize: '0.9rem'
                                    }}>Prepared By</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ 
                                        borderTop: '1px solid #64748b',
                                        width: '150px',
                                        marginTop: '2.5rem',
                                        marginBottom: '0.5rem',
                                        paddingTop: '0.5rem'
                                    }}></div>
                                    <span style={{ 
                                        fontWeight: '600', 
                                        color: '#374151',
                                        fontSize: '0.9rem'
                                    }}>Approved By</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 15mm;
                    }
                    
                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    .print-content, .print-content * {
                        visibility: visible;
                    }
                    
                    .print-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        max-width: 180mm;
                        margin: 0 auto;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    .print-content table {
                        page-break-inside: auto;
                    }
                    
                    .print-content tr {
                        page-break-inside: avoid;
                        page-break-after: auto;
                    }
                    
                    .print-content thead {
                        display: table-header-group;
                    }
                    
                    .print-content tfoot {
                        display: table-footer-group;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    .print-modal-overlay {
                        position: static !important;
                        background: none !important;
                    }
                    
                    .print-modal-content {
                        box-shadow: none !important;
                        padding: 0 !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }
                }

                .section-container.section-green {
                    border-left: 4px solid #10B981;
                    background-color: #ECFDF5;
                }
                .section-title.green {
                    color: #047857;
                }

                .section-container.section-purple {
                    border-left: 4px solid #8B5CF6;
                    background-color: #F5F3FF;
                }
                .section-title.purple {
                    color: #7C3AED;
                }

                .btn-purple {
                    background-color: #8B5CF6;
                    color: white;
                }
                .btn-purple:hover {
                    background-color: #7C3AED;
                }
            `}</style>
        </div>
    );
};

export default SleeveRequirement;
