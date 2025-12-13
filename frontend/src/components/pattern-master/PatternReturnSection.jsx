import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import api from '../../api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TableSkeleton from '../common/TableSkeleton';
import TextTooltip from '../common/TextTooltip';

const PatternReturnSection = () => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        PatternId: null,
        PatternNo: '',
        PatternName: '',
        Customer: null,
        ReturnChallanNo: '',
        ReturnDate: '',
        Description: ''
    });
    const [patternOptions, setPatternOptions] = useState([]);
    const [customerOptions, setCustomerOptions] = useState([]);
    const [selectedPattern, setSelectedPattern] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    
    // Parts state
    const [patternParts, setPatternParts] = useState([]);
    const [selectedParts, setSelectedParts] = useState([]); // Array of selected part objects
    const [loadingParts, setLoadingParts] = useState(false);

    const queryClient = useQueryClient();

    // Fetch pattern numbers for dropdown
    useEffect(() => {
        const fetchPatternNumbers = async () => {
            try {
                const response = await api.get('/pattern-master/numbers');
                const options = response.data.map(p => ({
                    value: p.PatternId,
                    label: p.PatternNo || `Pattern ${p.PatternId}`,
                    patternName: p.ProductName || '',
                    customerId: p.CustomerId,
                    customerName: p.CustomerName
                }));
                setPatternOptions(options);
            } catch (error) {
                console.error('Error fetching pattern numbers:', error);
            }
        };
        fetchPatternNumbers();
    }, []);

    // Fetch customers for dropdown
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await api.get('/customers');
                const options = response.data.map(c => ({
                    value: c.CustId,
                    label: c.CustName
                }));
                setCustomerOptions(options);
            } catch (error) {
                console.error('Error fetching customers:', error);
            }
        };
        fetchCustomers();
    }, []);

    // React Query for fetching return history
    const { data: returnHistory = [], isLoading: isHistoryLoading } = useQuery({
        queryKey: ['patternReturnHistory'],
        queryFn: async () => {
            const response = await api.get('/pattern-master/return-history');
            return response.data;
        },
        enabled: showForm
    });

    // Mutation for adding return history
    const addMutation = useMutation({
        mutationFn: (data) => api.post('/pattern-master/return-history', data),
        onSuccess: () => {
            toast.success('Pattern return history added successfully!');
            queryClient.invalidateQueries(['patternReturnHistory']);
            handleClear();
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.error || 'Failed to add return history';
            toast.error(errorMsg);
        }
    });

    // Fetch parts when pattern is selected
    const fetchPartsForPattern = async (patternId) => {
        if (!patternId) {
            setPatternParts([]);
            setSelectedParts([]);
            return;
        }
        
        setLoadingParts(true);
        try {
            const response = await api.get(`/pattern-master/parts-by-pattern/${patternId}`);
            setPatternParts(response.data);
            setSelectedParts([]); // Clear selected parts when pattern changes
        } catch (error) {
            console.error('Error fetching parts for pattern:', error);
            toast.error('Failed to load parts for this pattern');
            setPatternParts([]);
        } finally {
            setLoadingParts(false);
        }
    };

    // Handle pattern selection - auto-populate pattern name, customer, and fetch parts
    const handlePatternChange = (option) => {
        setSelectedPattern(option);
        if (option) {
            setFormData(prev => ({
                ...prev,
                PatternId: option.value,
                PatternNo: option.label,
                PatternName: option.patternName || ''
            }));
            // Auto-select customer if available
            if (option.customerId) {
                const customerOption = customerOptions.find(c => c.value === option.customerId);
                if (customerOption) {
                    setSelectedCustomer(customerOption);
                    setFormData(prev => ({
                        ...prev,
                        Customer: customerOption.value
                    }));
                }
            }
            // Fetch parts for this pattern
            fetchPartsForPattern(option.value);
        } else {
            setFormData(prev => ({
                ...prev,
                PatternId: null,
                PatternNo: '',
                PatternName: ''
            }));
            setPatternParts([]);
            setSelectedParts([]);
        }
    };

    // Handle part checkbox toggle
    const handlePartToggle = (part) => {
        setSelectedParts(prev => {
            const isSelected = prev.some(p => p.PartRowId === part.PartRowId);
            if (isSelected) {
                return prev.filter(p => p.PartRowId !== part.PartRowId);
            } else {
                return [...prev, {
                    PartRowId: part.PartRowId,
                    PartNo: part.PartNo,
                    ProductName: part.ProductName
                }];
            }
        });
    };

    // Select/Deselect all parts
    const handleSelectAllParts = () => {
        if (selectedParts.length === patternParts.length) {
            setSelectedParts([]);
        } else {
            setSelectedParts(patternParts.map(part => ({
                PartRowId: part.PartRowId,
                PartNo: part.PartNo,
                ProductName: part.ProductName
            })));
        }
    };

    // Update PatternName when selected parts change
    useEffect(() => {
        if (selectedParts.length > 0) {
            const partNames = selectedParts
                .map(p => p.ProductName || `Part ${p.PartNo}`)
                .filter(name => name)
                .join(', ');
            setFormData(prev => ({
                ...prev,
                PatternName: partNames
            }));
        } else if (selectedPattern?.patternName) {
            setFormData(prev => ({
                ...prev,
                PatternName: selectedPattern.patternName
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                PatternName: ''
            }));
        }
    }, [selectedParts, selectedPattern]);

    const handleCustomerChange = (option) => {
        setSelectedCustomer(option);
        setFormData(prev => ({
            ...prev,
            Customer: option ? option.value : null
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClear = () => {
        setFormData({
            PatternId: null,
            PatternNo: '',
            PatternName: '',
            Customer: null,
            ReturnChallanNo: '',
            ReturnDate: '',
            Description: ''
        });
        setSelectedPattern(null);
        setSelectedCustomer(null);
        setPatternParts([]);
        setSelectedParts([]);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.PatternId) {
            toast.error('Please select a Pattern No');
            return;
        }

        if (selectedParts.length === 0) {
            toast.error('Please select at least one part to return');
            return;
        }

        if (!formData.Customer || !formData.ReturnChallanNo || !formData.ReturnDate) {
            toast.error('Please fill all required fields');
            return;
        }

        addMutation.mutate({
            ...formData,
            SelectedParts: selectedParts
        });
    };

    const selectStyles = {
        control: (base) => ({
            ...base,
            minHeight: '38px',
            fontSize: '0.875rem'
        }),
        menu: (base) => ({
            ...base,
            zIndex: 100
        })
    };

    // Check if form fields should be shown (after pattern selected and parts checked)
    const showFormFields = selectedPattern && selectedParts.length > 0;

    return (
        <div className="section-container section-blue" style={{ marginTop: '2rem' }}>
            {/* Checkbox Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: showForm ? '1.5rem' : 0 }}>
                <input
                    type="checkbox"
                    id="patternReturnHistoryCheckbox"
                    checked={showForm}
                    onChange={(e) => setShowForm(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label 
                    htmlFor="patternReturnHistoryCheckbox" 
                    style={{ 
                        fontWeight: '600', 
                        fontSize: '1rem', 
                        color: '#1E40AF',
                        cursor: 'pointer'
                    }}
                >
                    Pattern Return History
                </label>
            </div>

            {/* Form (visible when checkbox is checked) */}
            {showForm && (
                <>
                    <form onSubmit={handleSubmit}>
                        {/* Step 1: Pattern No Selection */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div style={{ maxWidth: '300px' }}>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                    Pattern No <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <Select
                                    value={selectedPattern}
                                    onChange={handlePatternChange}
                                    options={patternOptions}
                                    isClearable
                                    isSearchable
                                    placeholder="Select Pattern No..."
                                    styles={selectStyles}
                                />
                            </div>
                        </div>

                        {/* Step 2: Parts Checkboxes (shown after pattern selection) */}
                        {selectedPattern && (
                            <div style={{ 
                                marginBottom: '1.5rem',
                                padding: '1rem',
                                backgroundColor: '#F9FAFB',
                                borderRadius: '8px',
                                border: '1px solid #E5E7EB'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <label style={{ fontWeight: '600', fontSize: '0.875rem', color: '#374151' }}>
                                        Select Parts to Return <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    {patternParts.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleSelectAllParts}
                                            style={{
                                                fontSize: '0.75rem',
                                                color: '#2563EB',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            {selectedParts.length === patternParts.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                    )}
                                </div>
                                
                                {loadingParts ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: '#6B7280' }}>
                                        Loading parts...
                                    </div>
                                ) : patternParts.length === 0 ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic' }}>
                                        No parts found for this pattern
                                    </div>
                                ) : (
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                                        gap: '0.5rem' 
                                    }}>
                                        {patternParts.map(part => (
                                            <label
                                                key={part.PartRowId}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    padding: '0.5rem 0.75rem',
                                                    backgroundColor: selectedParts.some(p => p.PartRowId === part.PartRowId) ? '#DBEAFE' : 'white',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${selectedParts.some(p => p.PartRowId === part.PartRowId) ? '#3B82F6' : '#D1D5DB'}`,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s'
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedParts.some(p => p.PartRowId === part.PartRowId)}
                                                    onChange={() => handlePartToggle(part)}
                                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: '500', fontSize: '0.875rem', color: '#1F2937' }}>
                                                        Part No: {part.PartNo}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {part.ProductName || 'N/A'} {part.Qty ? `(Qty: ${part.Qty})` : ''}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                
                                {selectedParts.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#059669', fontWeight: '500' }}>
                                        ✓ {selectedParts.length} part(s) selected
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Remaining Form Fields (shown after parts selected) */}
                        {showFormFields && (
                            <>
                                <div className="form-grid" style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                    gap: '1rem',
                                    marginBottom: '1.5rem'
                                }}>
                                    {/* Pattern Name (Auto-populated, read-only) */}
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                            Pattern Name
                                        </label>
                                        <input
                                            type="text"
                                            name="PatternName"
                                            value={formData.PatternName}
                                            readOnly
                                            className="input-field"
                                            placeholder="Auto-populated from Pattern No"
                                            style={{ backgroundColor: '#F3F4F6' }}
                                        />
                                    </div>

                                    {/* Customer Dropdown */}
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                            Customer <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <Select
                                            value={selectedCustomer}
                                            onChange={handleCustomerChange}
                                            options={customerOptions}
                                            isClearable
                                            isSearchable
                                            placeholder="Select Customer..."
                                            styles={selectStyles}
                                        />
                                    </div>

                                    {/* Return Challan No */}
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                            Return Challan No <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="ReturnChallanNo"
                                            value={formData.ReturnChallanNo}
                                            onChange={handleInputChange}
                                            className="input-field"
                                            placeholder="Enter Challan No"
                                        />
                                    </div>

                                    {/* Return Date */}
                                    <div className="form-group">
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                            Return Date <span style={{ color: '#EF4444' }}>*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="ReturnDate"
                                            value={formData.ReturnDate}
                                            onChange={handleInputChange}
                                            className="input-field"
                                        />
                                    </div>

                                    {/* Description (Optional) */}
                                    <div className="form-group" style={{ gridColumn: 'span 1' }}>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                            Description <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="Description"
                                            value={formData.Description}
                                            onChange={handleInputChange}
                                            className="input-field"
                                            placeholder="Enter description"
                                        />
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                        disabled={addMutation.isPending}
                                    >
                                        {addMutation.isPending ? 'Saving...' : 'SUBMIT'}
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={handleClear} 
                                        className="btn btn-secondary"
                                    >
                                        CLEAR
                                    </button>
                                </div>
                            </>
                        )}
                    </form>

                    {/* Records Table */}
                    <div>
                        <h4 style={{ marginBottom: '1rem', color: '#374151', fontWeight: '600' }}>
                            Pattern Return Records ({returnHistory.length} records)
                        </h4>
                        
                        {isHistoryLoading ? (
                            <TableSkeleton rows={5} columns={7} />
                        ) : (
                            <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                    <thead style={{ backgroundColor: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>ID</th>
                                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Pattern No</th>
                                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Pattern Name</th>
                                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Customer</th>
                                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Challan No</th>
                                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Return Date</th>
                                            <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }}>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {returnHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                                    No records found
                                                </td>
                                            </tr>
                                        ) : (
                                            returnHistory.map((record) => (
                                                <tr key={record.ReturnId} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{record.ReturnId}</td>
                                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{record.PatternNo}</td>
                                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                                                        <TextTooltip text={record.PatternName} maxLength={20} />
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                                                        <TextTooltip text={record.CustomerName} maxLength={20} />
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{record.ReturnChallanNo}</td>
                                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                                                        {record.ReturnDate ? record.ReturnDate.split('T')[0] : ''}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>
                                                        <TextTooltip text={record.Description} maxLength={30} />
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default PatternReturnSection;
