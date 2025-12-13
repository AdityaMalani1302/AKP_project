import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import '../App.css';

const PlanningEntry = () => {
    const queryClient = useQueryClient();
    
    // Form state
    const [planDate, setPlanDate] = useState('');
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [patternSearch, setPatternSearch] = useState('');
    const [showPatternDropdown, setShowPatternDropdown] = useState(false);
    const [patterns, setPatterns] = useState([]);
    const [filteredPatterns, setFilteredPatterns] = useState([]);
    
    // Parts state
    const [availableParts, setAvailableParts] = useState([]);
    const [selectedParts, setSelectedParts] = useState([]);
    const [loadingParts, setLoadingParts] = useState(false);
    
    // Configuration state
    const [plateQty, setPlateQty] = useState('');
    const [shift, setShift] = useState('');
    const [mouldBoxSize, setMouldBoxSize] = useState('');
    
    // Records table state
    const [records, setRecords] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const patternDropdownRef = useRef(null);

    // Fetch patterns on mount
    useEffect(() => {
        fetchPatterns();
    }, []);

    const fetchPatterns = async () => {
        try {
            const response = await api.get('/pattern-master/numbers');
            setPatterns(response.data);
            setFilteredPatterns(response.data);
        } catch (err) {
            console.error('Error fetching patterns:', err);
            toast.error('Failed to load patterns');
        }
    };

    // Fetch parts when pattern is selected
    useEffect(() => {
        if (selectedPattern) {
            fetchPartsForPattern(selectedPattern.PatternId);
        } else {
            setAvailableParts([]);
            setSelectedParts([]);
        }
    }, [selectedPattern]);

    const fetchPartsForPattern = async (patternId) => {
        setLoadingParts(true);
        try {
            const response = await api.get(`/pattern-master/parts-by-pattern/${patternId}`);
            setAvailableParts(response.data);
            setSelectedParts([]);
        } catch (err) {
            console.error('Error fetching parts:', err);
            toast.error('Failed to load parts for this pattern');
        } finally {
            setLoadingParts(false);
        }
    };

    const handlePatternSearch = (e) => {
        const value = e.target.value;
        setPatternSearch(value);
        if (value.trim() === '') {
            setFilteredPatterns(patterns);
        } else {
            const filtered = patterns.filter(p => 
                p.PatternNo && p.PatternNo.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredPatterns(filtered);
        }
        setShowPatternDropdown(true);
    };

    const handlePatternSelect = (pattern) => {
        setSelectedPattern(pattern);
        setPatternSearch(pattern.PatternNo || '');
        setShowPatternDropdown(false);
    };

    const handlePartToggle = (part) => {
        setSelectedParts(prev => {
            const exists = prev.find(p => p.PartRowId === part.PartRowId);
            if (exists) {
                return prev.filter(p => p.PartRowId !== part.PartRowId);
            } else {
                return [...prev, part];
            }
        });
    };

    const handleSelectAllParts = () => {
        if (selectedParts.length === availableParts.length) {
            setSelectedParts([]);
        } else {
            setSelectedParts([...availableParts]);
        }
    };

    const handleAddToRecords = () => {
        if (!planDate) {
            toast.error('Please select a Plan Date');
            return;
        }
        if (!selectedPattern) {
            toast.error('Please select a Pattern');
            return;
        }
        if (selectedParts.length === 0) {
            toast.error('Please select at least one part');
            return;
        }
        if (!plateQty || plateQty <= 0) {
            toast.error('Please enter a valid Plate Qty');
            return;
        }
        if (!shift) {
            toast.error('Please select a Shift');
            return;
        }
        if (!mouldBoxSize) {
            toast.error('Please select a Mould Box Size');
            return;
        }

        // Add entries for each selected part
        const newRecords = selectedParts.map(part => ({
            id: Date.now() + Math.random(),
            planDate,
            patternId: selectedPattern.PatternId,
            patternNo: selectedPattern.PatternNo,
            partRowId: part.PartRowId,
            partNo: part.PartNo,
            productName: part.ProductName,
            plateQty: parseInt(plateQty),
            shift: parseInt(shift),
            mouldBoxSize
        }));

        setRecords(prev => [...prev, ...newRecords]);
        
        // Clear selection for next entry
        setSelectedParts([]);
        setPlateQty('');
        setShift('');
        setMouldBoxSize('');
        
        toast.success(`Added ${newRecords.length} record(s)`);
    };

    const handleRemoveRecord = (recordId) => {
        setRecords(prev => prev.filter(r => r.id !== recordId));
    };

    const handleSubmit = async () => {
        if (records.length === 0) {
            toast.error('No records to submit');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post('/planning-entry', { entries: records });
            toast.success('Planning entries submitted successfully!');
            
            // Clear all state
            setRecords([]);
            setPlanDate('');
            setSelectedPattern(null);
            setPatternSearch('');
            setAvailableParts([]);
            setSelectedParts([]);
            setPlateQty('');
            setShift('');
            setMouldBoxSize('');
        } catch (err) {
            console.error('Error submitting entries:', err);
            toast.error(err.response?.data?.error || 'Failed to submit planning entries');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClearAll = () => {
        setRecords([]);
        setPlanDate('');
        setSelectedPattern(null);
        setPatternSearch('');
        setAvailableParts([]);
        setSelectedParts([]);
        setPlateQty('');
        setShift('');
        setMouldBoxSize('');
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const dropdownContainerStyle = {
        position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '300px',
        overflowY: 'auto', backgroundColor: 'white', border: '1px solid #3B82F6',
        borderRadius: '0.5rem', zIndex: 1000, marginTop: '4px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
    };

    const dropdownItemStyle = {
        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #E5E7EB', fontSize: '0.875rem'
    };

    const dropdownHeaderStyle = {
        padding: '8px 14px', backgroundColor: '#F3F4F6', fontWeight: '600',
        fontSize: '0.75rem', color: '#6B7280', textTransform: 'uppercase',
        borderBottom: '1px solid #E5E7EB', position: 'sticky', top: 0
    };

    return (
        <div>
            {/* Form Section */}
            <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title blue">Planning Entry Details</h3>

                <div className="form-grid">
                    {/* Plan Date */}
                    <div className="form-group">
                        <label htmlFor="planDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Plan Date <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                            type="date"
                            id="planDate"
                            value={planDate}
                            onChange={(e) => setPlanDate(e.target.value)}
                            className="input-field"
                        />
                    </div>

                    {/* Pattern No Dropdown */}
                    <div className="form-group" style={{ position: 'relative' }} ref={patternDropdownRef}>
                        <label htmlFor="patternNo" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Plan Part No <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                id="patternNo"
                                value={patternSearch}
                                onChange={handlePatternSearch}
                                onFocus={() => { setFilteredPatterns(patterns); setShowPatternDropdown(true); }}
                                onBlur={() => setTimeout(() => setShowPatternDropdown(false), 200)}
                                className="input-field"
                                placeholder="Select or type Pattern No..."
                                autoComplete="off"
                            />
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}>▼</span>
                        </div>
                        {showPatternDropdown && (
                            <div style={dropdownContainerStyle}>
                                <div style={dropdownHeaderStyle}>Patterns ({filteredPatterns.length} items)</div>
                                {filteredPatterns.length === 0 ? (
                                    <div style={{ padding: '12px 14px', color: '#9CA3AF', textAlign: 'center' }}>No patterns found</div>
                                ) : (
                                    filteredPatterns.map((pattern) => (
                                        <div
                                            key={pattern.PatternId}
                                            onClick={() => handlePatternSelect(pattern)}
                                            style={dropdownItemStyle}
                                            onMouseEnter={(e) => { e.target.style.backgroundColor = '#EFF6FF'; }}
                                            onMouseLeave={(e) => { e.target.style.backgroundColor = 'white'; }}
                                        >
                                            <span style={{ fontWeight: '600', color: '#2563EB' }}>{pattern.PatternNo}</span>
                                            {pattern.CustomerName && (
                                                <span style={{ marginLeft: '8px', color: '#6B7280' }}>- {pattern.CustomerName}</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Parts Selection Section */}
            {selectedPattern && (
                <div className="section-container section-green" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title green">
                        Select Parts for Pattern: {selectedPattern.PatternNo}
                        {loadingParts && <span style={{ marginLeft: '1rem', fontSize: '0.875rem', color: '#6B7280' }}>Loading...</span>}
                    </h3>

                    {availableParts.length === 0 && !loadingParts ? (
                        <p style={{ color: '#6B7280', fontStyle: 'italic' }}>No parts found for this pattern</p>
                    ) : (
                        <>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedParts.length === availableParts.length && availableParts.length > 0}
                                        onChange={handleSelectAllParts}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span style={{ fontWeight: '500' }}>Select All Parts</span>
                                </label>
                            </div>

                            <div style={{ display: 'grid', gap: '0.75rem', maxHeight: '250px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '0.5rem', backgroundColor: '#F9FAFB' }}>
                                {availableParts.map((part) => (
                                    <label
                                        key={part.PartRowId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem',
                                            backgroundColor: selectedParts.find(p => p.PartRowId === part.PartRowId) ? '#DBEAFE' : 'white',
                                            borderRadius: '0.375rem',
                                            border: '1px solid #E5E7EB',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={!!selectedParts.find(p => p.PartRowId === part.PartRowId)}
                                            onChange={() => handlePartToggle(part)}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <div>
                                            <span style={{ fontWeight: '600', color: '#1F2937' }}>Part #{part.PartNo}</span>
                                            {part.ProductName && (
                                                <span style={{ marginLeft: '0.5rem', color: '#6B7280' }}>- {part.ProductName}</span>
                                            )}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Configuration Section - show when parts are selected */}
            {selectedParts.length > 0 && (
                <div className="section-container section-purple" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title purple">Entry Configuration ({selectedParts.length} part(s) selected)</h3>

                    <div className="form-grid">
                        {/* Plate Qty */}
                        <div className="form-group">
                            <label htmlFor="plateQty" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Plate Qty <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <input
                                type="number"
                                id="plateQty"
                                value={plateQty}
                                onChange={(e) => setPlateQty(e.target.value)}
                                className="input-field"
                                placeholder="Enter Plate Qty"
                                min="1"
                            />
                        </div>

                        {/* Shift Dropdown */}
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
                                <option value="1">Shift 1</option>
                                <option value="2">Shift 2</option>
                                <option value="3">Shift 3</option>
                            </select>
                        </div>

                        {/* Mould Box Size Dropdown */}
                        <div className="form-group">
                            <label htmlFor="mouldBoxSize" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Mould Box Size <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <select
                                id="mouldBoxSize"
                                value={mouldBoxSize}
                                onChange={(e) => setMouldBoxSize(e.target.value)}
                                className="input-field"
                                style={{ cursor: 'pointer' }}
                            >
                                <option value="">Select Mould Box Size</option>
                                <option value="24x24">24x24</option>
                                <option value="24x28">24x28</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                        <button onClick={handleAddToRecords} className="btn btn-primary">
                            OK - Add to Records
                        </button>
                    </div>
                </div>
            )}

            {/* Records Table Section */}
            {records.length > 0 && (
                <div className="section-container section-gray">
                    <h3 className="section-title gray">Planning Entry Records ({records.length} records)</h3>

                    <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB', zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Plan Date</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Pattern No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Part No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Product Name</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'right', whiteSpace: 'nowrap' }}>Plate Qty</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap' }}>Shift</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap' }}>Mould Box</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map((record) => (
                                    <tr key={record.id} style={{ backgroundColor: 'white' }}>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{formatDate(record.planDate)}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.patternNo}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.partNo}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.productName || '-'}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', textAlign: 'right', whiteSpace: 'nowrap' }}>{record.plateQty}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap' }}>{record.shift}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap' }}>{record.mouldBoxSize}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                            <button
                                                onClick={() => handleRemoveRecord(record.id)}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    backgroundColor: '#FEE2E2',
                                                    color: '#DC2626',
                                                    border: 'none',
                                                    borderRadius: '0.25rem',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem'
                                                }}
                                            >
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={handleClearAll} className="btn btn-secondary">
                            Clear All
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="btn btn-primary"
                            disabled={isSubmitting}
                            style={{ backgroundColor: '#10B981' }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit All Records'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PlanningEntry;
