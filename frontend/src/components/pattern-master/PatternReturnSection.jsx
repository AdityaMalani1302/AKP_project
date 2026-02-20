import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import api from '../../api';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TableSkeleton from '../common/TableSkeleton';
import TextTooltip from '../common/TextTooltip';
import DatePicker from '../common/DatePicker';
import { FiEdit2, FiTrash2, FiX, FiSave } from 'react-icons/fi';
import AlertDialog from '../common/AlertDialog';

const PatternReturnSection = () => {
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
        }
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

    // Edit mode state
    const [editingRecord, setEditingRecord] = useState(null);
    const [editFormData, setEditFormData] = useState({
        ReturnChallanNo: '',
        ReturnDate: '',
        Description: ''
    });
    // Delete confirmation state
    const [recordToDelete, setRecordToDelete] = useState(null);

    // Mutation for updating return history
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/pattern-master/return-history/${id}`, data),
        onSuccess: () => {
            toast.success('Pattern return history updated successfully!');
            queryClient.invalidateQueries(['patternReturnHistory']);
            setEditingRecord(null);
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.error || 'Failed to update return history';
            toast.error(errorMsg);
        }
    });

    // Mutation for deleting return history
    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/pattern-master/return-history/${id}`),
        onSuccess: () => {
            toast.success('Pattern return history deleted successfully!');
            queryClient.invalidateQueries(['patternReturnHistory']);
            setRecordToDelete(null);
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.error || 'Failed to delete return history';
            toast.error(errorMsg);
        }
    });

    // Handle edit button click
    const handleEdit = (record) => {
        setEditingRecord(record);
        setEditFormData({
            ReturnChallanNo: record.ReturnChallanNo || '',
            ReturnDate: record.ReturnDate ? record.ReturnDate.split('T')[0] : '',
            Description: record.Description || ''
        });
    };

    // Handle edit form input change
    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({ ...prev, [name]: value }));
    };

    // Handle save edit
    const handleSaveEdit = () => {
        if (!editFormData.ReturnChallanNo || !editFormData.ReturnDate) {
            toast.error('Please fill all required fields');
            return;
        }
        updateMutation.mutate({
            id: editingRecord.ReturnId,
            data: editFormData
        });
    };

    // Handle cancel edit
    const handleCancelEdit = () => {
        setEditingRecord(null);
        setEditFormData({ ReturnChallanNo: '', ReturnDate: '', Description: '' });
    };

    // Handle delete with confirmation
    const handleDelete = (record) => {
        setRecordToDelete(record);
    };

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
        <div className="section-container section-blue" style={{ marginTop: '1rem' }}>
            {/* Header */}
            <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                📋 Pattern Return History
            </h3>

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

                            {/* Customer Dropdown - Auto-populated from pattern, read-only */}
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                    Customer <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <Select
                                    value={selectedCustomer}
                                    onChange={handleCustomerChange}
                                    options={customerOptions}
                                    isDisabled={true}
                                    placeholder="Auto-populated from Pattern"
                                    styles={{
                                        ...selectStyles,
                                        control: (base) => ({
                                            ...base,
                                            minHeight: '38px',
                                            fontSize: '0.875rem',
                                            backgroundColor: '#F3F4F6'
                                        })
                                    }}
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
                                <DatePicker
                                    name="ReturnDate"
                                    value={formData.ReturnDate}
                                    onChange={handleInputChange}
                                    placeholder="Select return date..."
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

            {/* Edit Modal */}
            {editingRecord && (
                <div style={{
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
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '1.5rem',
                        width: '90%',
                        maxWidth: '500px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #E5E7EB', paddingBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                                Edit Return Record
                            </h3>
                            <button
                                onClick={handleCancelEdit}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6B7280',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <p style={{ fontSize: '0.875rem', color: '#4B5563', marginBottom: '0.5rem' }}>
                                Pattern: <span style={{ fontWeight: '600', color: '#111827' }}>{editingRecord.PatternNo}</span>
                            </p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>
                                    Return Challan No <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    name="ReturnChallanNo"
                                    value={editFormData.ReturnChallanNo}
                                    onChange={handleEditInputChange}
                                    className="input-field"
                                    placeholder="Enter Challan No"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>
                                    Return Date <span style={{ color: '#EF4444' }}>*</span>
                                </label>
                                <DatePicker
                                    name="ReturnDate"
                                    value={editFormData.ReturnDate}
                                    onChange={handleEditInputChange}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.375rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>
                                    Description
                                </label>
                                <textarea
                                    name="Description"
                                    value={editFormData.Description}
                                    onChange={handleEditInputChange}
                                    className="input-field"
                                    placeholder="Enter description"
                                    rows="3"
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                className="btn btn-primary"
                                disabled={updateMutation.isPending}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                {updateMutation.isPending ? 'Saving...' : <><FiSave size={16} /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Records Table */}
            <div>
                <h4 style={{ marginBottom: '1rem', color: '#374151', fontWeight: '600' }}>
                    Pattern Return Records ({returnHistory.length} records)
                </h4>
                
                {isHistoryLoading ? (
                    <TableSkeleton rows={5} columns={8} />
                ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ backgroundColor: '#F9FAFB' }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap', color: '#6B7280' }}>Sr. No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', color: '#6B7280' }}>Pattern No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', color: '#6B7280' }}>Pattern Name</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', color: '#6B7280' }}>Customer</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', color: '#6B7280' }}>Challan No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', color: '#6B7280' }}>Return Date</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', color: '#6B7280' }}>Description</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', textAlign: 'center', whiteSpace: 'nowrap', color: '#6B7280' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnHistory.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                            No records found
                                        </td>
                                    </tr>
                                ) : (
                                    returnHistory.map((record, index) => (
                                        <tr key={record.ReturnId} style={{ borderBottom: '1px solid #E5E7EB', transition: 'background-color 0.15s' }} className="hover:bg-gray-50">
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center', color: '#6B7280' }}>{index + 1}</td>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', fontWeight: '500', color: '#1F2937' }}>{record.PatternNo}</td>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#4B5563' }}>
                                                <TextTooltip text={record.PatternName} maxLength={20} />
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#4B5563' }}>
                                                <TextTooltip text={record.CustomerName} maxLength={20} />
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#4B5563' }}>{record.ReturnChallanNo}</td>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#4B5563' }}>
                                                {record.ReturnDate ? record.ReturnDate.split('T')[0] : ''}
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: '#4B5563' }}>
                                                <TextTooltip text={record.Description} maxLength={30} />
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleEdit(record)}
                                                        style={{
                                                            padding: '0.375rem',
                                                            backgroundColor: '#DBEAFE',
                                                            color: '#2563EB',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseOver={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#2563EB';
                                                            e.currentTarget.style.color = 'white';
                                                        }}
                                                        onMouseOut={(e) => {
                                                            e.currentTarget.style.backgroundColor = '#DBEAFE';
                                                            e.currentTarget.style.color = '#2563EB';
                                                        }}
                                                        title="Edit"
                                                    >
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(record)}
                                                        disabled={deleteMutation.isPending}
                                                        style={{
                                                            padding: '0.375rem',
                                                            backgroundColor: '#FEE2E2',
                                                            color: '#DC2626',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.2s',
                                                            opacity: deleteMutation.isPending ? 0.6 : 1
                                                        }}
                                                        onMouseOver={(e) => {
                                                            if (!deleteMutation.isPending) {
                                                                e.currentTarget.style.backgroundColor = '#DC2626';
                                                                e.currentTarget.style.color = 'white';
                                                            }
                                                        }}
                                                        onMouseOut={(e) => {
                                                            if (!deleteMutation.isPending) {
                                                                e.currentTarget.style.backgroundColor = '#FEE2E2';
                                                                e.currentTarget.style.color = '#DC2626';
                                                            }
                                                        }}
                                                        title="Delete"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={!!recordToDelete}
                title="Delete Return Record"
                message={`Are you sure you want to delete this return record for Pattern No: ${recordToDelete?.PatternNo}?`}
                onConfirm={() => deleteMutation.mutate(recordToDelete.ReturnId)}
                onCancel={() => setRecordToDelete(null)}
                confirmText="Delete"
                cancelText="Cancel"
                isDanger={true}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};

export default PatternReturnSection;
