import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { useDebounce } from '../utils/useDebounce';
import { validatePlanningMaster } from '../utils/validation';
import '../App.css';
import AlertDialog from './common/AlertDialog';
import TextTooltip from './common/TextTooltip';
import Combobox from './common/Combobox';
import DatePicker from './common/DatePicker';
import AnimatedTabs from './common/AnimatedTabs';
import NumberInput from './common/NumberInput';
import PlanningEntry from './PlanningEntry';
import SleeveRequirement from './SleeveRequirement';
import SleeveIndent from './SleeveIndent';
import { formatDate, formatDateForInput } from '../styles/sharedStyles';

const PlanningMaster = ({ user }) => {
    // All available tabs with their permission pageId
    const allTabs = [
        { id: 'schedule', label: 'Planning Schedule Qty', pageId: 'planning-schedule' },
        { id: 'entry', label: 'Planning Entry', pageId: 'planning-entry' },
        { id: 'sleeve', label: 'Sleeve Requirement', pageId: 'planning-sleeve' },
        { id: 'sleeveIndent', label: 'Sleeve Indent', pageId: 'planning-sleeve-indent' }
    ];

    // Filter tabs based on user permissions
    const getVisibleTabs = () => {
        if (!user) return allTabs;
        
        // Admins see all tabs
        if (user.role === 'admin') return allTabs;
        
        const allowedPages = user.allowedPages || [];
        
        // If user has 'all' access, show all tabs
        if (allowedPages.includes('all')) return allTabs;
        
        // If no specific sub-tabs are assigned, show no tabs (user has parent access but no sub-tab access)
        const hasAnySubTab = allTabs.some(tab => allowedPages.includes(tab.pageId));
        if (!hasAnySubTab) return [];
        
        // Filter to only allowed tabs
        return allTabs.filter(tab => allowedPages.includes(tab.pageId));
    };

    const visibleTabs = getVisibleTabs();

    const [formData, setFormData] = useState({
        ItemCode: '',
        CustomerName: '',
        ScheduleQty: '',
        PlanDate: ''
    });

    const [selectedId, setSelectedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    
    // Tab state with URL persistence
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read tab from URL, default to first visible tab
    const urlTab = searchParams.get('tab');
    const activeTab = (urlTab && visibleTabs.some(t => t.id === urlTab)) ? urlTab : (visibleTabs[0]?.id || 'schedule');
    
    // Handler to change tab and update URL
    const setActiveTab = useCallback((tab) => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    // Frozen date - using ref for immediate access (persists until page refresh)
    const frozenDateRef = useRef(null);

    // Dropdown data
    const [customers, setCustomers] = useState([]);
    const [rawMaterials, setRawMaterials] = useState([]);

    useEffect(() => {
        fetchCustomers();
        fetchRawMaterials();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
        } catch (err) {
            console.error('Error fetching customers:', err);
        }
    };

    const fetchRawMaterials = async () => {
        try {
            const response = await api.get('/raw-materials');
            setRawMaterials(response.data);
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
        queryKey: ['planningSchedules', debouncedSearchTerm],
        queryFn: () => fetchSchedulesFromApi(debouncedSearchTerm),
        placeholderData: keepPreviousData,
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
    };

    const handleAdd = () => {
        // Validate first using standard validation
        const validationErrors = validatePlanningMaster(formData);
        
        // Additional validation: Check if ItemCode is from the dropdown
        if (formData.ItemCode && formData.ItemCode.trim()) {
            const isValidItemCode = rawMaterials.some(item => item.RawMatCode === formData.ItemCode);
            if (!isValidItemCode) {
                validationErrors.ItemCode = 'Please select a valid Item Code from the dropdown';
            }
        }
        
        // Additional validation: Check if CustomerName is from the dropdown
        if (formData.CustomerName && formData.CustomerName.trim()) {
            const isValidCustomer = customers.some(c => c.CustName === formData.CustomerName);
            if (!isValidCustomer) {
                validationErrors.CustomerName = 'Please select a valid Customer from the dropdown';
            }
        }
        
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
        // Validate using standard validation
        const validationErrors = validatePlanningMaster(formData);
        
        // Additional validation: Check if ItemCode is from the dropdown
        if (formData.ItemCode && formData.ItemCode.trim()) {
            const isValidItemCode = rawMaterials.some(item => item.RawMatCode === formData.ItemCode);
            if (!isValidItemCode) {
                validationErrors.ItemCode = 'Please select a valid Item Code from the dropdown';
            }
        }
        
        // Additional validation: Check if CustomerName is from the dropdown
        if (formData.CustomerName && formData.CustomerName.trim()) {
            const isValidCustomer = customers.some(c => c.CustName === formData.CustomerName);
            if (!isValidCustomer) {
                validationErrors.CustomerName = 'Please select a valid Customer from the dropdown';
            }
        }
        
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

    // Search is now auto-triggered by debounce
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    // Prepare options for Combobox
    const rawMaterialOptions = rawMaterials.map(item => ({
        value: item.RawMatCode,
        label: `${item.RawMatCode} - ${item.RawMatName || ''}`
    }));

    const customerOptions = customers.map(c => ({
        value: c.CustName,
        label: c.CustName
    }));

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Planning</h2>

            {/* Tab Navigation */}
            <AnimatedTabs
                tabs={visibleTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {activeTab === 'entry' ? (
                <PlanningEntry />
            ) : activeTab === 'sleeve' ? (
                <SleeveRequirement />
            ) : activeTab === 'sleeveIndent' ? (
                <SleeveIndent />
            ) : (
                <>
            <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title blue">
                    {isEditing ? `Editing Schedule ID: ${selectedId}` : 'Schedule Details'}
                    {frozenDateRef.current && <span style={{ marginLeft: '1rem', fontSize: '0.75rem', color: '#059669' }}>🔒 Date Frozen</span>}
                </h3>

                <div className="form-grid">
                    {/* Item Code */}
                    <div className="form-group">
                        <Combobox
                            label="Item Code"
                            options={rawMaterialOptions}
                            value={formData.ItemCode}
                            onChange={(val) => setFormData(prev => ({ ...prev, ItemCode: val }))}
                            placeholder="Select or type Item Code..."
                        />
                        {errors.ItemCode && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.ItemCode}</span>}
                    </div>

                    {/* Customer Name */}
                    <div className="form-group">
                        <Combobox
                            label="Customer Name"
                            options={customerOptions}
                            value={formData.CustomerName}
                            onChange={(val) => setFormData(prev => ({ ...prev, CustomerName: val }))}
                            placeholder="Select or type Customer Name..."
                        />
                        {errors.CustomerName && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.CustomerName}</span>}
                    </div>

                    {/* Schedule Qty */}
                    <div className="form-group">
                        <label htmlFor="ScheduleQty" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Schedule Qty <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <NumberInput
                            id="ScheduleQty"
                            name="ScheduleQty"
                            value={formData.ScheduleQty}
                            onChange={handleChange}
                            min={1}
                            placeholder="Enter Quantity"
                            style={{ borderColor: errors.ScheduleQty ? '#EF4444' : undefined }}
                        />
                        {errors.ScheduleQty && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.ScheduleQty}</span>}
                    </div>

                    {/* Date */}
                    <div className="form-group">
                        <label htmlFor="PlanDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Date <span style={{ color: '#EF4444' }}>*</span>
                            {frozenDateRef.current && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#059669' }}>🔒</span>}
                        </label>
                        <DatePicker
                            id="PlanDate"
                            name="PlanDate"
                            value={formData.PlanDate}
                            onChange={handleChange}
                            placeholder="Select date..."
                        />
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
                        <input type="text" value={searchTerm} onChange={handleSearchChange}
                            placeholder="Type to search..." className="input-field" style={{ minWidth: '250px' }} />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>✕</button>}
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="section-container section-gray">
                <h3 className="section-title gray">Planning Schedules ({schedules.length} records)</h3>

                {/* Standard HTML Table with scroll */}
                <div style={{ 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '6px', 
                    overflow: 'auto',
                    maxHeight: '500px'
                }}>
                    {isQueryLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                            Loading schedules...
                        </div>
                    ) : schedules && schedules.length > 0 ? (
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            minWidth: 'max-content'
                        }}>
                            <thead style={{ 
                                position: 'sticky', 
                                top: 0, 
                                backgroundColor: '#F9FAFB',
                                zIndex: 10
                            }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }}>Sr. No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }}>Item Code</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }}>Customer Name</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }}>Qty</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }}>Plan Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map((schedule, index) => (
                                    <tr 
                                        key={schedule.ID} 
                                        onClick={() => handleRowClick(schedule)}
                                        style={{
                                            borderBottom: '1px solid #E5E7EB',
                                            backgroundColor: selectedId === schedule.ID ? '#DBEAFE' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{index + 1}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={schedule.ItemCode} maxLength={20} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={schedule.CustomerName} maxLength={25} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'right' }}>{schedule.ScheduleQty}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{formatDate(schedule.PlanDate)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                            No records found
                        </div>
                    )}
                </div>
                
                {/* Row count footer */}
                <div style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '0 0 6px 6px',
                    border: '1px solid #E5E7EB',
                    borderTop: 'none'
                }}>
                    Showing {schedules?.length || 0} rows
                </div>

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
            </>
            )}
        </div>
    );
};

export default PlanningMaster;
