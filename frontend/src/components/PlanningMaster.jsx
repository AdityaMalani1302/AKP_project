import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { useDebounce } from '../utils/useDebounce';
import withOptimisticUpdate from '../utils/optimisticUpdates';
import { validatePlanningMaster } from '../utils/validation';
import '../App.css';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import AlertDialog from './common/AlertDialog';
import TextTooltip from './common/TextTooltip';
import Combobox from './common/Combobox';
import DatePicker from './common/DatePicker';
import AnimatedTabs from './common/AnimatedTabs';
import NumberInput from './common/NumberInput';
import PlanningEntry from './PlanningEntry';
import SleeveRequirement from './SleeveRequirement';
import SleeveIndent from './SleeveIndent';
import PlanningReports from './PlanningReports';
import BoxesCalculationReport from './BoxesCalculationReport';
import CoreCalculationReport from './CoreCalculationReport';
import SleeveCalculationReport from './SleeveCalculationReport';
import { formatDate, formatDateForInput } from '../styles/sharedStyles';
import usePagination from '../utils/usePagination';
import useSortableData from '../utils/useSortableData';
import useRowSelection from '../utils/useRowSelection';
import Pagination from './common/Pagination';
import SortableHeader from './common/SortableHeader';

const PlanningMaster = ({ user }) => {
    // All available tabs with their permission pageId
    const allTabs = [
        { id: 'schedule', label: 'Planning Schedule Qty', pageId: 'planning-schedule' },
        { id: 'entry', label: 'Planning Entry', pageId: 'planning-entry' },
        { id: 'sleeve', label: 'Sleeve Requirement', pageId: 'planning-sleeve' },
        { id: 'sleeveIndent', label: 'Sleeve Indent', pageId: 'planning-sleeve-indent' },
        { id: 'reports', label: 'Reports', pageId: 'planning-reports' },
        { id: 'boxesCalc', label: 'Boxes Calculation Report', pageId: 'planning-boxes-calc' },
        { id: 'coreCalc', label: 'Core Calculation Report', pageId: 'planning-core-calc' },
        { id: 'sleeveCalc', label: 'Sleeve Calculation Report', pageId: 'planning-sleeve-calc' }
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
        PlanDate: '',
        DeliveryDate: ''
    });

    const [selectedId, setSelectedId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [isEditing, setIsEditing] = useState(false);
    const [errors, setErrors] = useState({});
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [importing, setImporting] = useState(false);
    const importFileInputRef = useRef(null);
    
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

    // Frozen date and customer state (persists until page refresh)
    const [frozenDate, setFrozenDate] = useState(null);
    const [frozenCustomer, setFrozenCustomer] = useState(null);

    // Dropdown data
    const { data: customers = [] } = useQuery({
        queryKey: ['customers'],
        queryFn: async () => {
            const response = await api.get('/customers');
            return response.data;
        },
    });

    const { data: rawMaterials = [] } = useQuery({
        queryKey: ['rawMaterials'],
        queryFn: async () => {
            const response = await api.get('/raw-materials');
            return response.data;
        },
    });


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

    const {
        currentPage,
        totalPages,
        pageSize,
        totalRecords,
        goToPage,
        changePageSize,
        resetToFirstPage
    } = usePagination({ data: schedules, pageSize: 50, autoPaginate: true });

    const { sortKey, sortOrder, handleSort } = useSortableData(schedules);

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: schedules, idField: 'ID' });

    const displayData = useMemo(() => {
        if (!sortKey || !schedules.length) {
            const start = (currentPage - 1) * pageSize;
            return schedules.slice(start, start + pageSize);
        }
        const sorted = [...schedules].sort((a, b) => {
            let aVal = a[sortKey];
            let bVal = b[sortKey];
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        const start = (currentPage - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [schedules, sortKey, sortOrder, currentPage, pageSize]);

    useEffect(() => {
        resetToFirstPage();
    }, [debouncedSearchTerm, resetToFirstPage]);

    // Mutations
    const optimistic = withOptimisticUpdate(queryClient, ['planningSchedules'], { idField: 'ID' });

    const addMutation = useMutation(optimistic.add({
        apiFn: (newSchedule) => api.post('/planning-master', newSchedule),
        successMessage: 'Planning schedule added successfully',
        onSuccess: () => {
            const newFrozenDate = formData.PlanDate;
            const newFrozenCustomer = formData.CustomerName;
            
            setFrozenDate(newFrozenDate);
            setFrozenCustomer(newFrozenCustomer);
            setFormData(prev => ({
                ItemCode: '',
                CustomerName: newFrozenCustomer || prev.CustomerName,
                ScheduleQty: '',
                PlanDate: newFrozenDate || prev.PlanDate,
                DeliveryDate: ''
            }));
            setSelectedId(null);
            setIsEditing(false);
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/planning-master/${id}`, data),
        successMessage: 'Planning schedule updated successfully',
        onSuccess: () => {
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/planning-master/${id}`),
        successMessage: 'Planning schedule deleted successfully!',
        onSuccess: () => {
            handleClear();
            setShowDeleteDialog(false);
        }
    }));

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
        
        if (formData.ItemCode && formData.ItemCode.trim() && rawMaterials.length > 0) {
            const isValidItemCode = rawMaterials.some(item => item.RawMatCode === formData.ItemCode.trim());
            if (!isValidItemCode) {
                validationErrors.ItemCode = 'Please select a valid Item Code from the dropdown';
            }
        }
        
        if (formData.CustomerName && formData.CustomerName.trim() && customers.length > 0) {
            const isValidCustomer = customers.some(c => c.CustName === formData.CustomerName.trim());
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
        
        if (formData.ItemCode && formData.ItemCode.trim() && rawMaterials.length > 0) {
            const isValidItemCode = rawMaterials.some(item => item.RawMatCode === formData.ItemCode.trim());
            if (!isValidItemCode) {
                validationErrors.ItemCode = 'Please select a valid Item Code from the dropdown';
            }
        }
        
        if (formData.CustomerName && formData.CustomerName.trim() && customers.length > 0) {
            const isValidCustomer = customers.some(c => c.CustName === formData.CustomerName.trim());
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

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        const results = await Promise.allSettled(selected.map(r => api.delete(`/planning-master/${r.ID}`)));
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        if (failed === 0) {
            toast.success(`${succeeded} records deleted successfully`);
        } else {
            toast.error(`${succeeded} deleted, ${failed} failed`);
        }
        clearSelection();
        queryClient.invalidateQueries(['planningSchedules']);
        setShowBulkDeleteDialog(false);
    };

    const handleClear = () => {
        // Keep the frozen date and customer when clearing the form
        setFormData({
            ItemCode: '',
            CustomerName: frozenCustomer || '',
            ScheduleQty: '',
            PlanDate: frozenDate || '',
            DeliveryDate: ''
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
            PlanDate: formatDateForInput(schedule.PlanDate),
            DeliveryDate: schedule.DeliveryDate ? formatDateForInput(schedule.DeliveryDate) : ''
        });
        setErrors({});
    };

    // Search is now auto-triggered by debounce
    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    // Handle Excel import
    const handleImportExcel = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
            toast.error('Please select a valid Excel file (.xlsx or .xls)');
            return;
        }

        setImporting(true);
        const fd = new FormData();
        fd.append('file', file);

        try {
            const response = await api.post('/planning-master/import-excel', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const { successCount, errorCount } = response.data;

            if (errorCount > 0) {
                toast.warning(`Import completed with ${successCount} records imported and ${errorCount} errors.`);
            } else {
                toast.success(`Successfully imported ${successCount} records!`);
            }

            queryClient.invalidateQueries({ queryKey: ['planningSchedules'] });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to import Excel file');
        } finally {
            setImporting(false);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
        }
    }, [queryClient]);

    // Handle Excel export
    const handleExportExcel = useCallback(async () => {
        if (!displayData || displayData.length === 0) {
            toast.warning('No data to export');
            return;
        }

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Planning Schedules');

            worksheet.columns = [
                { header: 'Sr. No', key: '_srNo', width: 8 },
                { header: 'Item Code', key: 'ItemCode', width: 20 },
                { header: 'Customer Name', key: 'CustomerName', width: 25 },
                { header: 'Schedule Qty', key: 'ScheduleQty', width: 15 },
                { header: 'Plan Date', key: 'PlanDate', width: 15 },
                { header: 'Delivery Date', key: 'DeliveryDate', width: 15 },
            ];

            displayData.forEach((record, index) => {
                const row = {
                    _srNo: index + 1,
                    ItemCode: record.ItemCode || '',
                    CustomerName: record.CustomerName || '',
                    ScheduleQty: record.ScheduleQty || 0,
                    PlanDate: record.PlanDate ? new Date(record.PlanDate).toLocaleDateString('en-GB') : '',
                    DeliveryDate: record.DeliveryDate ? new Date(record.DeliveryDate).toLocaleDateString('en-GB') : '',
                };
                worksheet.addRow(row);
            });

            const headerRow = worksheet.getRow(1);
            headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
            headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
            headerRow.height = 24;

            worksheet.eachRow((row, rowNumber) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin' }, left: { style: 'thin' },
                        bottom: { style: 'thin' }, right: { style: 'thin' },
                    };
                    cell.alignment = { horizontal: 'center', vertical: 'middle' };
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `PlanningSchedules_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success('Excel file exported successfully!');
        } catch (err) {
            console.error('Export error:', err);
            toast.error('Failed to export Excel file');
        }
    }, [displayData]);

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
            ) : activeTab === 'reports' ? (
                <PlanningReports />
            ) : activeTab === 'boxesCalc' ? (
                <BoxesCalculationReport />
            ) : activeTab === 'coreCalc' ? (
                <CoreCalculationReport />
            ) : activeTab === 'sleeveCalc' ? (
                <SleeveCalculationReport />
            ) : (
                <>
            <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title blue">
                    {isEditing ? `Editing Schedule ID: ${selectedId}` : 'Schedule Details'}
                    {(frozenDate || frozenCustomer) && <span style={{ marginLeft: '1rem', fontSize: '0.75rem', color: '#059669' }}>🔒 Set Fields Frozen</span>}
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
                            label={<>Customer Name {frozenCustomer && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#059669' }}>🔒</span>}</>}
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
                            Plan Date <span style={{ color: '#EF4444' }}>*</span>
                            {frozenDate && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#059669' }}>🔒</span>}
                        </label>
                        <DatePicker
                            id="PlanDate"
                            name="PlanDate"
                            value={formData.PlanDate}
                            onChange={handleChange}
                            placeholder="Select plan date..."
                        />
                        {errors.PlanDate && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.PlanDate}</span>}
                    </div>

                    {/* Delivery Date */}
                    <div className="form-group">
                        <label htmlFor="DeliveryDate" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                            Delivery Date
                        </label>
                        <DatePicker
                            id="DeliveryDate"
                            name="DeliveryDate"
                            value={formData.DeliveryDate}
                            onChange={handleChange}
                            placeholder="Select delivery date..."
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={handleAdd} disabled={addMutation.isPending || updateMutation.isPending} className="btn btn-primary">{addMutation.isPending ? 'Adding...' : 'ADD'}</button>
                    <button onClick={handleEdit} disabled={addMutation.isPending || updateMutation.isPending} className="btn" style={{ backgroundColor: '#10B981', color: 'white' }}>{updateMutation.isPending ? 'Updating...' : 'EDIT'}</button>
                    <button onClick={handleDeleteClick} disabled={deleteMutation.isPending} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>DELETE</button>
                    <button onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                    <input
                        type="file"
                        ref={importFileInputRef}
                        onChange={handleImportExcel}
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                    />
<button
                        onClick={() => importFileInputRef.current?.click()}
                        disabled={importing}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {importing ? 'Importing...' : '📥 Import Excel'}
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="btn btn-success"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        📤 Export Excel
                    </button>

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title gray">Planning Schedules ({totalRecords} records)</h3>
                    {selectedCount > 0 && (
                        <button onClick={() => setShowBulkDeleteDialog(true)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Delete Selected ({selectedCount})
                        </button>
                    )}
                </div>

                {/* Standard HTML Table with scroll */}
                <div style={{ 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '6px 6px 0 0', 
                    overflow: 'auto',
                    maxHeight: '500px'
                }}>
                    {isQueryLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                            Loading schedules...
                        </div>
                    ) : displayData && displayData.length > 0 ? (
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
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151', width: '40px' }} scope="col">
                                        <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                                            onChange={() => toggleAll(displayData)}
                                            aria-label="Select all rows on this page"
                                            title="Select all on this page"
                                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                        />
                                    </th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }} scope="col">Sr. No</th>
                                    <SortableHeader columnKey="ItemCode" label="Item Code" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }} />
                                    <SortableHeader columnKey="CustomerName" label="Customer Name" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }} />
                                    <SortableHeader columnKey="ScheduleQty" label="Qty" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }} />
                                    <SortableHeader columnKey="PlanDate" label="Plan Date" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }} />
                                    <SortableHeader columnKey="DeliveryDate" label="Delivery Date" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem 1rem', fontWeight: '600', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB', fontSize: '0.875rem', color: '#374151' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {displayData.map((schedule, index) => (
                                    <tr 
                                        key={schedule.ID} 
                                        onClick={() => handleRowClick(schedule)}
                                        style={{
                                            borderBottom: '1px solid #E5E7EB',
                                            backgroundColor: isSelected(schedule.ID) ? '#FEF3C7' : selectedId === schedule.ID ? '#DBEAFE' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected(schedule.ID)}
                                                onChange={() => toggleRow(schedule.ID)}
                                                aria-label={`Select row ${index + 1}`}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{(currentPage - 1) * pageSize + index + 1}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={schedule.ItemCode} maxLength={20} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={schedule.CustomerName} maxLength={25} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'right' }}>{schedule.ScheduleQty}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{formatDate(schedule.PlanDate)}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{schedule.DeliveryDate ? formatDate(schedule.DeliveryDate) : '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : isQueryError ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#EF4444' }}>
                            <p style={{ fontWeight: '500' }}>Failed to load schedules</p>
                            <button onClick={() => queryClient.invalidateQueries(['planningSchedules'])} className="btn btn-secondary" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>Retry</button>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                            No records found
                        </div>
                    )}
                </div>
                
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    pageSize={pageSize}
                    onPageChange={goToPage}
                    onPageSizeChange={changePageSize}
                    showPageSizeSelector
                />

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
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
            </>
            )}
        </div>
    );
};

export default PlanningMaster;

