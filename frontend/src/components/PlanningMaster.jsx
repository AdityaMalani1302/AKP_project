import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import api from '../api';
import { validatePlanningMaster } from '../utils/validation';
import '../App.css';
import AlertDialog from './common/AlertDialog';
import DataTable from './common/DataTable';
import TableSkeleton from './common/TableSkeleton'; // Added
import TextTooltip from './common/TextTooltip'; // Added

const PlanningMaster = () => {
    const [formData, setFormData] = useState({
        ItemCode: '',
        CustomerName: '',
        ScheduleQty: '',
        PlanDate: ''
    });

    const [selectedId, setSelectedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    // Frozen date - using ref for immediate access (persists until page refresh)
    const frozenDateRef = useRef(null);

    // Dropdown data
    const [customers, setCustomers] = useState([]);
    const [filteredCustomers, setFilteredCustomers] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    const [rawMaterials, setRawMaterials] = useState([]);
    const [filteredRawMaterials, setFilteredRawMaterials] = useState([]);
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    const itemDropdownRef = useRef(null);
    const customerDropdownRef = useRef(null);

    const columnHelper = createColumnHelper();

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const columns = useMemo(() => [
        columnHelper.accessor('ID', {
            header: 'ID',
            size: 60,
            minWidth: 60,
        }),
        columnHelper.accessor('ItemCode', {
            header: 'Item Code',
            size: 150,
            minWidth: 150,
            cell: info => <TextTooltip text={info.getValue()} maxLength={20} />
        }),
        columnHelper.accessor('CustomerName', {
            header: 'Customer Name',
            size: 200,
            minWidth: 200,
            cell: info => <TextTooltip text={info.getValue()} maxLength={25} />
        }),
        columnHelper.accessor('ScheduleQty', {
            header: 'Qty',
            size: 100,
            minWidth: 100,
            cell: info => <div style={{ textAlign: 'right' }}>{info.getValue()}</div>,
        }),
        columnHelper.accessor('PlanDate', {
            header: 'Plan Date',
            size: 120,
            minWidth: 120,
            cell: info => <div style={{ textAlign: 'center' }}>{formatDate(info.getValue())}</div>,
        }),
    ], []);

    useEffect(() => {
        fetchCustomers();
        fetchRawMaterials();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
            setFilteredCustomers(response.data);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const fetchRawMaterials = async () => {
        try {
            const response = await api.get('/raw-materials');
            setRawMaterials(response.data);
            setFilteredRawMaterials(response.data);
        } catch (err) {
            console.error('Error fetching raw materials:', err);
        }
    };

    const fetchSchedulesFromApi = async (query) => {
        const url = query ? `/planning-master?search=${encodeURIComponent(query)}` : '/planning-master';
        const response = await api.get(url);
        return response.data;
    };

    const queryClient = useQueryClient();

    const { data: schedules = [], isError: isQueryError, isLoading: isQueryLoading } = useQuery({
        queryKey: ['planningSchedules', searchQuery],
        queryFn: () => fetchSchedulesFromApi(searchQuery),
        placeholderData: keepPreviousData,
        staleTime: 5000,
    });

    // Mutations
    const addMutation = useMutation({
        mutationFn: (newSchedule) => api.post('/planning-master', newSchedule),
        onSuccess: () => {
            toast.success('Planning schedule added successfully');
            // Freeze date
            if (!frozenDateRef.current) {
                frozenDateRef.current = formData.PlanDate;
            }
            // Clear form but keep frozen date
            setFormData(prev => ({
                ItemCode: '',
                CustomerName: '',
                ScheduleQty: '',
                PlanDate: frozenDateRef.current || prev.PlanDate
            }));
            setSelectedId(null);
            setIsEditing(false);
            queryClient.invalidateQueries(['planningSchedules']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to add planning schedule');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/planning-master/${id}`, data),
        onSuccess: () => {
            toast.success('Planning schedule updated successfully');
            handleClear();
            queryClient.invalidateQueries(['planningSchedules']);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to update planning schedule');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/planning-master/${id}`),
        onSuccess: () => {
            toast.success('Planning schedule deleted successfully!');
            handleClear();
            queryClient.invalidateQueries(['planningSchedules']);
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete planning schedule');
            setShowDeleteDialog(false);
        }
    });

    useEffect(() => {
        if (isQueryError) {
            toast.error('Failed to load planning schedules');
        }
    }, [isQueryError]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'CustomerName') {
            if (value.trim() === '') {
                setFilteredCustomers(customers);
            } else {
                const filtered = customers.filter(c => c.CustName.toLowerCase().includes(value.toLowerCase()));
                setFilteredCustomers(filtered);
            }
            setShowCustomerDropdown(true);
        }

        if (name === 'ItemCode') {
            if (value.trim() === '') {
                setFilteredRawMaterials(rawMaterials);
            } else {
                const filtered = rawMaterials.filter(r =>
                    (r.RawMatCode && r.RawMatCode.toLowerCase().includes(value.toLowerCase())) ||
                    (r.RawMatName && r.RawMatName.toLowerCase().includes(value.toLowerCase()))
                );
                setFilteredRawMaterials(filtered);
            }
            setShowItemDropdown(true);
        }
    };

    const handleItemFocus = () => {
        setFilteredRawMaterials(rawMaterials);
        setShowItemDropdown(true);
    };

    const handleCustomerFocus = () => {
        setFilteredCustomers(customers);
        setShowCustomerDropdown(true);
    };

    const handleItemSelect = (item) => {
        setFormData(prev => ({ ...prev, ItemCode: item.RawMatCode || '' }));
        setShowItemDropdown(false);
    };

    const handleCustomerSelect = (customer) => {
        setFormData(prev => ({ ...prev, CustomerName: customer.CustName }));
        setShowCustomerDropdown(false);
    };

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const handleAdd = () => {
        // Validate first
        const validationErrors = validatePlanningMaster(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});

        addMutation.mutate(formData);
    };

    const handleEdit = () => {
        if (!selectedId) {
            toast.error('Please select a row from the table to edit');
            return;
        }
        // Validate
        const validationErrors = validatePlanningMaster(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});

        updateMutation.mutate({ id: selectedId, data: formData });
    };

    const handleDeleteClick = () => {
        if (!selectedId) {
            toast.error('Please select a row from the table to delete');
            return;
        }
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
        if (selectedId) {
            deleteMutation.mutate(selectedId);
        }
    };

    const handleClear = () => {
        // Keep the frozen date when clearing the form
        setFormData({
            ItemCode: '',
            CustomerName: '',
            ScheduleQty: '',
            PlanDate: frozenDateRef.current || ''
        });
        setSelectedId(null);
        setIsEditing(false);
        setErrors({});
    };

    const handleRowClick = (schedule) => {
        setSelectedId(schedule.ID);
        setIsEditing(true);
        setFormData({
            ItemCode: schedule.ItemCode || '',
            CustomerName: schedule.CustomerName || '',
            ScheduleQty: schedule.ScheduleQty || '',
            PlanDate: formatDateForInput(schedule.PlanDate)
        });
        setErrors({});
    };

    const handleSearch = () => setSearchQuery(searchTerm);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value === '') setSearchQuery('');
    };

    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') handleSearch();
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
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Planning Schedule Qty</h2>

            <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title blue">
                    {isEditing ? `Editing Schedule ID: ${selectedId}` : 'Schedule Details'}
                    {frozenDateRef.current && <span style={{ marginLeft: '1rem', fontSize: '0.75rem', color: '#059669' }}>🔒 Date Frozen</span>}
                </h3>

                <div className="form-grid">
                    {/* Item Code */}
                    <div className="form-group" style={{ position: 'relative' }} ref={itemDropdownRef}>
                        <label htmlFor="ItemCode" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Item Code <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input type="text" id="ItemCode" name="ItemCode" value={formData.ItemCode}
                                onChange={handleChange} onFocus={handleItemFocus}
                                onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                                className="input-field" placeholder="Select or type Item Code..." autoComplete="off"
                                style={{ borderColor: errors.ItemCode ? '#EF4444' : undefined }} />
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}>▼</span>
                        </div>
                        {errors.ItemCode && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.ItemCode}</span>}
                        {showItemDropdown && (
                            <div style={dropdownContainerStyle}>
                                <div style={dropdownHeaderStyle}>Raw Materials ({filteredRawMaterials.length} items)</div>
                                {filteredRawMaterials.length === 0 ? (
                                    <div style={{ padding: '12px 14px', color: '#9CA3AF', textAlign: 'center' }}>No items found</div>
                                ) : (
                                    filteredRawMaterials.map((item, index) => (
                                        <div key={item.RawMatCode || index} onClick={() => handleItemSelect(item)} style={dropdownItemStyle}
                                            onMouseEnter={(e) => { e.target.style.backgroundColor = '#EFF6FF'; }}
                                            onMouseLeave={(e) => { e.target.style.backgroundColor = 'white'; }}>
                                            <span style={{ fontWeight: '600', color: '#2563EB' }}>{item.RawMatCode}</span>
                                            <span style={{ marginLeft: '8px', color: '#6B7280' }}>{item.RawMatName || ''}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Customer Name */}
                    <div className="form-group" style={{ position: 'relative' }} ref={customerDropdownRef}>
                        <label htmlFor="CustomerName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Customer Name <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input type="text" id="CustomerName" name="CustomerName" value={formData.CustomerName}
                                onChange={handleChange} onFocus={handleCustomerFocus}
                                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                className="input-field" placeholder="Select or type Customer Name..." autoComplete="off"
                                style={{ borderColor: errors.CustomerName ? '#EF4444' : undefined }} />
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }}>▼</span>
                        </div>
                        {errors.CustomerName && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.CustomerName}</span>}
                        {showCustomerDropdown && (
                            <div style={dropdownContainerStyle}>
                                <div style={dropdownHeaderStyle}>Customers ({filteredCustomers.length} items)</div>
                                {filteredCustomers.length === 0 ? (
                                    <div style={{ padding: '12px 14px', color: '#9CA3AF', textAlign: 'center' }}>No customers found</div>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <div key={customer.CustId} onClick={() => handleCustomerSelect(customer)} style={dropdownItemStyle}
                                            onMouseEnter={(e) => { e.target.style.backgroundColor = '#EFF6FF'; }}
                                            onMouseLeave={(e) => { e.target.style.backgroundColor = 'white'; }}>
                                            {customer.CustName}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Schedule Qty */}
                    <div className="form-group">
                        <label htmlFor="ScheduleQty" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Schedule Qty <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input type="number" id="ScheduleQty" name="ScheduleQty" value={formData.ScheduleQty}
                            onChange={handleChange} className="input-field" placeholder="Enter Quantity" min="1"
                            style={{ borderColor: errors.ScheduleQty ? '#EF4444' : undefined }} />
                        {errors.ScheduleQty && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.ScheduleQty}</span>}
                    </div>

                    {/* Date */}
                    <div className="form-group">
                        <label htmlFor="PlanDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Date <span style={{ color: '#EF4444' }}>*</span>
                            {frozenDateRef.current && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#059669' }}>🔒</span>}
                        </label>
                        <input type="date" id="PlanDate" name="PlanDate" value={formData.PlanDate}
                            onChange={handleChange} className="input-field"
                            style={{ borderColor: errors.PlanDate ? '#EF4444' : undefined }} />
                        {errors.PlanDate && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.PlanDate}</span>}
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={handleAdd} className="btn btn-primary">ADD</button>
                    <button onClick={handleEdit} className="btn" style={{ backgroundColor: '#10B981', color: 'white' }}>EDIT</button>
                    <button onClick={handleDeleteClick} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>DELETE</button>
                    <button onClick={handleClear} className="btn btn-secondary">CLEAR</button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontWeight: '500', whiteSpace: 'nowrap', color: '#374151' }}>Search:</label>
                        <input type="text" value={searchTerm} onChange={handleSearchChange} onKeyPress={handleSearchKeyPress}
                            placeholder="Search by Item Code or Customer..." className="input-field" style={{ minWidth: '250px' }} />
                        <button onClick={handleSearch} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>🔍</button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="section-container section-gray">
                <h3 className="section-title gray">Planning Schedules ({schedules.length} records)</h3>

                {isQueryLoading ? (
                    <TableSkeleton rows={10} columns={5} />
                ) : (
                    <DataTable
                        data={schedules}
                        columns={columns}
                        onRowClick={handleRowClick}
                        selectedId={selectedId}
                    />
                )}

                {selectedId && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#DBEAFE', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1E40AF' }}>
                        <strong>Selected Row ID: {selectedId}</strong> - Click EDIT to modify or DELETE to remove this record.
                    </div>
                )}
            </div>
            {/* AlertDialog Component */}
            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete Schedule"
                message="Are you sure you want to delete this planning schedule? This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteDialog(false)}
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
};

export default PlanningMaster;
