import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { useDebounce } from '../../utils/useDebounce';
import { saveFormHistory } from '../../utils/useInputHistory';
import usePagination from '../../utils/usePagination';
import useSortableData from '../../utils/useSortableData';
import useFormValidation from '../../utils/useFormValidation';
import withOptimisticUpdate from '../../utils/optimisticUpdates';
import useRowSelection from '../../utils/useRowSelection';
import { labelStyle, inputStyle, sectionOrange, sectionGray, tableHeaderStyle, tableCellStyle, formatDate, formatDateForInput, getYesterdayDate } from './styles';
import AlertDialog from '../common/AlertDialog';
import TableSkeleton from '../common/TableSkeleton';
import FieldError from '../common/FieldError';
import Combobox from '../common/Combobox';
import AutocompleteInput from '../common/AutocompleteInput';
import DatePicker from '../common/DatePicker';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';

const FORM_PREFIX = 'sandProperties';

const SandPropertiesTab = () => {
    const [formData, setFormData] = useState({
        Date: getYesterdayDate(), Shift: '', InspectionTime: '', HeatNo: '', PartNo: '', PartName: '',
        Moisture: '', Compactability: '', Permeability: '', GreenCompressionStrength: '', ReturnSandTemp: '',
        TotalClay: '', ActiveClay: '', DeadClay: '', VolatileMatter: '', LossOnIgnition: '', AFSNo: ''
    });
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const validationRules = {
        Date: { required: true, requiredMessage: 'Date is required' },
        Shift: { required: true, requiredMessage: 'Shift is required' },
        HeatNo: { required: true, requiredMessage: 'Heat No is required' }
    };

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, getFieldProps: _getFieldProps, getInputStyle: _getInputStyle, clearAllErrors } = useFormValidation(validationRules);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);

    // Filter state for records table
    const [filterHeatNo, setFilterHeatNo] = useState('');
    const [filterPartNo, setFilterPartNo] = useState('');
    const [shouldFilter, setShouldFilter] = useState(false);

    const queryClient = useQueryClient();

    const { data: records = [], isLoading, isError } = useQuery({
        queryKey: ['sandProperties', debouncedSearchTerm, shouldFilter, filterHeatNo, filterPartNo],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
            if (shouldFilter && filterHeatNo) params.append('heatNo', filterHeatNo);
            if (shouldFilter && filterPartNo) params.append('partNo', filterPartNo);
            if (shouldFilter && (filterHeatNo || filterPartNo)) params.append('allTime', 'true');
            const url = `/quality-lab/sand${params.toString() ? '?' + params.toString() : ''}`;
            const res = await api.get(url);
            return res.data;
        },
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
    } = usePagination({ data: records, pageSize: 50, autoPaginate: false });

    const { sortKey, sortOrder, handleSort } = useSortableData(records);

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: records });

    const optimistic = withOptimisticUpdate(queryClient, ['sandProperties']);

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/quality-lab/sand', data),
        successMessage: 'Record added successfully',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables);
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/quality-lab/sand/${id}`, data),
        successMessage: 'Record updated successfully',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables.data);
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/quality-lab/sand/${id}`),
        successMessage: 'Record deleted successfully',
        onSuccess: () => {
            handleClear();
            setShowDeleteDialog(false);
        }
    }));

    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/quality-lab/sand/${r.Id}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['sandProperties']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['sandProperties']);
        }
        setShowBulkDeleteDialog(false);
    };

    const displayData = useMemo(() => {
        if (!sortKey || !records.length) {
            const start = (currentPage - 1) * pageSize;
            return records.slice(start, start + pageSize);
        }
        const sorted = [...records].sort((a, b) => {
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
         
    }, [records, sortKey, sortOrder, currentPage, pageSize]);

    useEffect(() => {
        resetToFirstPage();
    }, [debouncedSearchTerm, shouldFilter, filterHeatNo, filterPartNo, resetToFirstPage]);

    // Fetch Heat Nos for filter dropdown
    const { data: heatNos = [], isLoading: heatNosLoading } = useQuery({
        queryKey: ['qualityLab-heatNos', 'sand'],
        queryFn: async () => {
            const res = await api.get('/quality-lab/heat-nos?type=sand');
            return res.data;
        },
        staleTime: 2 * 60 * 1000,
    });
    const heatNoFilterOptions = useMemo(() => heatNos.map(h => ({ value: h, label: h })), [heatNos]);

    // Fetch products for Part No dropdown
    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await api.get('/products?search=');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Create Part No options for Combobox (include ProdName for auto-fill)
    const partNoOptions = useMemo(() => {
        if (!Array.isArray(products)) return [];
        return products
            .filter(p => p.InternalPartNo && p.InternalPartNo.trim() !== '')
            .map(p => ({
                value: p.ProdId,
                label: p.InternalPartNo,
                prodName: p.ProdName || ''
            }));
    }, [products]);

    // Generate time options with 5-minute intervals for Inspection Time
    const timeOptions = useMemo(() => {
        const options = [];
        for (let hour = 0; hour < 24; hour++) {
            for (let minute = 0; minute < 60; minute += 5) {
                const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                const ampm = hour < 12 ? 'AM' : 'PM';
                const timeStr = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
                options.push({ value: timeStr, label: timeStr });
            }
        }
        return options;
    }, []);

    // Handler for Part No selection - auto-fill Part Name
    const handlePartNoChange = (value) => {
        const selectedPart = partNoOptions.find(p => p.value === value);
        setFormData(prev => ({
            ...prev,
            PartNo: value,
            PartName: selectedPart?.prodName || prev.PartName
        }));
    };

    useEffect(() => { if (isError) toast.error('Failed to load records'); }, [isError]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (_touched[name]) {
            validateField(name, value);
        }
    };

    const validateField = (name, value) => {
        const rule = validationRules[name];
        if (!rule) return null;
        if (rule.required && (!value || value.trim() === '')) {
            setErrors(prev => ({ ...prev, [name]: rule.requiredMessage }));
            return rule.requiredMessage;
        }
        setErrors(prev => ({ ...prev, [name]: null }));
        return null;
    };

    const handleAdd = () => {
        // Mark all required fields as touched
        const requiredFields = ['Date', 'Shift', 'HeatNo'];
        const touchedFields = {};
        requiredFields.forEach(field => { touchedFields[field] = true; });
        setTouched(prev => ({ ...prev, ...touchedFields }));

        // Validate all required fields
        let hasErrors = false;
        requiredFields.forEach(field => {
            const value = formData[field];
            const error = validateField(field, value);
            if (error) hasErrors = true;
        });

        if (hasErrors) {
            toast.error('Please fill in all required fields');
            return;
        }
        // Validate Part No is from dropdown if provided
        if (formData.PartNo) {
            const isValidPartNo = partNoOptions.some(opt => opt.value === formData.PartNo);
            if (!isValidPartNo) { toast.error('Please select a valid Part No from the dropdown'); return; }
        }
        addMutation.mutate(formData);
    };

    const handleEdit = () => {
        if (!selectedId) { toast.error('Please select a record to edit'); return; }
        // Skip PartNo validation for editing - existing records may have old string values
        updateMutation.mutate({ id: selectedId, data: formData });
    };

    const handleDeleteClick = () => { if (!selectedId) { toast.error('Please select a record to delete'); return; } setShowDeleteDialog(true); };
    const handleConfirmDelete = () => { if (selectedId) deleteMutation.mutate(selectedId); };

    const handleClear = () => {
        setFormData({ Date: getYesterdayDate(), Shift: '', InspectionTime: '', HeatNo: '', PartNo: '', PartName: '', Moisture: '', Compactability: '', Permeability: '', GreenCompressionStrength: '', ReturnSandTemp: '', TotalClay: '', ActiveClay: '', DeadClay: '', VolatileMatter: '', LossOnIgnition: '', AFSNo: '' });
        setSelectedId(null);
        setIsEditing(false);
        clearAllErrors();
    };

    const handleRowClick = (record) => {
        setSelectedId(record.Id);
        setIsEditing(true);
        setFormData({
            Date: formatDateForInput(record.Date), Shift: record.Shift || '', InspectionTime: record.InspectionTime || '',
            HeatNo: record.HeatNo || '', PartNo: record.PartNo || '', PartName: record.PartName || '',
            Moisture: record['Moisture In %'] || '', Compactability: record['Compactability In %'] || '',
            Permeability: record['Permeability In No'] || '', GreenCompressionStrength: record['Green Compression Strength'] || '',
            ReturnSandTemp: record['Return Sand Temp'] || '', TotalClay: record['TOTAL CLAY 11.0 - 14.50%'] || '',
            ActiveClay: record['ACTIVE CLAY 7.0 - 9.0%'] || '', DeadClay: record['DEAD CLAY 3.0 - 4.50%'] || '',
            VolatileMatter: record['VOLATILE MATTER 2.30 - 3.50%'] || '', LossOnIgnition: record['LOSS ON IGNITION 4.0 - 7.0%'] || '',
            AFSNo: record['AFS No  45 - 55'] || ''
        });
    };

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/quality-lab/sand/import-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message);
            if (res.data.skippedRows?.length > 0) toast.info(`Skipped: ${res.data.skippedRows.slice(0, 3).join(', ')}`);
            queryClient.invalidateQueries(['sandProperties']);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to import Excel file'); }
        finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    return (
        <>
            <div style={sectionOrange}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#C2410C', fontWeight: '600' }}>
                    {isEditing ? `Editing Record ID: ${selectedId}` : 'Sand Properties Entry'}
                </h3>
                
                {/* Basic Info */}
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    <div><label style={labelStyle}>Date <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                        <DatePicker name="Date" value={formData.Date} onChange={handleChange} placeholder="Select date..." aria-required="true" /></div>
                    <div><label style={labelStyle}>Shift <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                        <select name="Shift" value={formData.Shift} onChange={handleChange} style={inputStyle} aria-required="true">
                            <option value="">Select Shift</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select></div>
                    <div><label style={labelStyle}>Inspection Time</label>
                        <Combobox
                            options={timeOptions}
                            value={formData.InspectionTime}
                            onChange={(value) => setFormData(prev => ({ ...prev, InspectionTime: value }))}
                            placeholder="Select or type time..."
                        /></div>
                    <div><label style={labelStyle}>Heat No <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                        <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="HeatNo" name="HeatNo" value={formData.HeatNo} onChange={handleChange} style={inputStyle} placeholder="Heat No" aria-required="true" /></div>
                    <div><label style={labelStyle}>Part No</label>
                        <Combobox
                            options={partNoOptions}
                            value={formData.PartNo}
                            onChange={handlePartNoChange}
                            placeholder="Select Part No..."
                        /></div>
                    <div><label style={labelStyle}>Part Name</label>
                        <input type="text" name="PartName" value={formData.PartName} style={{ ...inputStyle, backgroundColor: '#F3F4F6', cursor: 'not-allowed' }} disabled placeholder="Auto-filled from Part No" /></div>
                </div>

                {/* Sand Testing */}
                <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#92400E' }}>Sand Testing Parameters</h4>
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    <div><label style={labelStyle}>Moisture (%)</label>
                        <input type="number" step="0.01" name="Moisture" value={formData.Moisture} onChange={handleChange} style={inputStyle} placeholder="Moisture %" /></div>
                    <div><label style={labelStyle}>Compactability (%)</label>
                        <input type="number" step="0.01" name="Compactability" value={formData.Compactability} onChange={handleChange} style={inputStyle} placeholder="Compactability %" /></div>
                    <div><label style={labelStyle}>Permeability (No)</label>
                        <input type="text" name="Permeability" value={formData.Permeability} onChange={handleChange} style={inputStyle} placeholder="Permeability" /></div>
                    <div><label style={labelStyle}>Green Compression Strength</label>
                        <input type="text" name="GreenCompressionStrength" value={formData.GreenCompressionStrength} onChange={handleChange} style={inputStyle} placeholder="GCS" /></div>
                    <div><label style={labelStyle}>Return Sand Temp</label>
                        <input type="number" name="ReturnSandTemp" value={formData.ReturnSandTemp} onChange={handleChange} style={inputStyle} placeholder="Temp" /></div>
                </div>

                {/* Clay Analysis */}
                <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#92400E' }}>Clay & Volatiles Analysis</h4>
                <div className="form-grid">
                    <div><label style={labelStyle}>Total Clay (11-14.5%)</label>
                        <input type="number" step="0.01" name="TotalClay" value={formData.TotalClay} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Active Clay (7-9%)</label>
                        <input type="number" step="0.01" name="ActiveClay" value={formData.ActiveClay} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Dead Clay (3-4.5%)</label>
                        <input type="number" step="0.01" name="DeadClay" value={formData.DeadClay} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Volatile Matter (2.3-3.5%)</label>
                        <input type="number" step="0.01" name="VolatileMatter" value={formData.VolatileMatter} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Loss on Ignition (4-7%)</label>
                        <input type="number" step="0.01" name="LossOnIgnition" value={formData.LossOnIgnition} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>AFS No (45-55)</label>
                        <input type="number" step="0.01" name="AFSNo" value={formData.AFSNo} onChange={handleChange} style={inputStyle} /></div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {!isEditing && <button onClick={handleAdd} className="btn btn-primary btn-ripple">ADD</button>}
                    <button onClick={handleEdit} className="btn btn-success btn-ripple">{isEditing ? 'UPDATE' : 'EDIT'}</button>
                    <button onClick={handleDeleteClick} className="btn btn-danger btn-ripple">DELETE</button>
                    <button onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                    
                    {!isEditing && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" style={{ display: 'none' }} />
                            <button onClick={handleImportClick} disabled={isImporting} className="btn btn-purple btn-ripple" aria-label={isImporting ? 'Importing...' : 'Import from Excel'}>
                                {isImporting ? 'Importing...' : '📥 Import from Excel'}
                            </button>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-red-700, #DC2626)', fontWeight: '500' }}>⚠️ Do not change column name and structure in excel sheet</span>
                        </>
                    )}
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="text" value={searchTerm} onChange={handleSearchChange}
                            placeholder="Type to search..." className="input-field" style={{ minWidth: '200px' }} aria-label="Search records" />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }} aria-label="Clear search">✕</button>}
                    </div>
                </div>
            </div>

            <div style={sectionGray}>
                {/* Filter Toolbar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid #E5E7EB' }}>
                    <div>
                        <label style={labelStyle}>Heat No</label>
                        <Combobox
                            options={heatNoFilterOptions}
                            value={filterHeatNo}
                            onChange={(val) => { setFilterHeatNo(val); setShouldFilter(false); }}
                            placeholder={heatNosLoading ? 'Loading...' : 'All Heat Nos'}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Part No</label>
                        <Combobox
                            options={partNoOptions}
                            value={filterPartNo}
                            onChange={(val) => { setFilterPartNo(val); setShouldFilter(false); }}
                            placeholder="All Part Nos"
                        />
                    </div>
                    <div>
                        <button onClick={() => setShouldFilter(true)} className="btn btn-primary" style={{ height: '38px', width: '80px' }} disabled={!filterHeatNo && !filterPartNo}>OK</button>
                    </div>
                    <div>
                        <button onClick={() => { setFilterHeatNo(''); setFilterPartNo(''); setShouldFilter(false); }} className="btn btn-secondary" style={{ height: '38px', width: '100%' }}>Reset Filters</button>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#374151', fontWeight: 'bold' }}>Sand Properties Records ({totalRecords})</h3>
                    {selectedCount > 0 && (
                        <button onClick={() => setShowBulkDeleteDialog(true)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Delete Selected ({selectedCount})
                        </button>
                    )}
                </div>
                {isLoading ? <TableSkeleton rows={8} columns={18} /> : (
                    <>
                        <div style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid #E5E7EB', borderRadius: '6px 6px 0 0' }}>
                            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                        <th style={{ ...tableHeaderStyle, width: '40px', textAlign: 'center' }} scope="col">
                                            <input
                                                type="checkbox"
                                                checked={isAllSelected}
                                                ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                                                onChange={() => toggleAll(displayData)}
                                                aria-label="Select all rows"
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </th>
                                        <SortableHeader columnKey="Id" label="Sr. No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Date" label="Date" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Shift" label="Shift" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="InspectionTime" label="Insp. Time" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="HeatNo" label="Heat No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="PartNoDisplay" label="Part No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="PartName" label="Part Name" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Moisture" label="Moisture" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Compactability" label="Compact." sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Permeability" label="Permeab." sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="GCS" label="GCS" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="SandTemp" label="Sand Temp" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="TotalClay" label="Total Clay" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="ActiveClay" label="Active Clay" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="DeadClay" label="Dead Clay" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Volatile" label="Volatile" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="LOI" label="LOI" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="AFSNo" label="AFS No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.length === 0 ? (
                                        <tr><td colSpan={19} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records found</td></tr>
                                    ) : displayData.map((record, index) => (
                                        <tr key={record.Id}
                                            onClick={() => handleRowClick(record)}
                                            style={{ cursor: 'pointer', backgroundColor: isSelected(record.Id) ? '#FEF3C7' : selectedId === record.Id ? '#FED7AA' : 'white', transition: 'background-color 0.15s' }}
                                            onMouseEnter={(e) => { if (!isSelected(record.Id) && selectedId !== record.Id) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                                            onMouseLeave={(e) => { if (!isSelected(record.Id) && selectedId !== record.Id) e.currentTarget.style.backgroundColor = 'white'; }}>
                                            <td style={{ ...tableCellStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected(record.Id)}
                                                    onChange={() => toggleRow(record.Id)}
                                                    aria-label={`Select row ${index + 1}`}
                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                />
                                            </td>
                                            <td style={tableCellStyle}>{formatDate(record.Date)}</td>
                                            <td style={tableCellStyle}>{record.Shift}</td>
                                            <td style={tableCellStyle}>{record.InspectionTime}</td>
                                            <td style={tableCellStyle}>{record.HeatNo}</td>
                                            <td style={tableCellStyle}>{record.PartNoDisplay}</td>
                                            <td style={tableCellStyle}>{record.PartName}</td>
                                            <td style={tableCellStyle}>{record['Moisture In %']}</td>
                                            <td style={tableCellStyle}>{record['Compactability In %']}</td>
                                            <td style={tableCellStyle}>{record['Permeability In No']}</td>
                                            <td style={tableCellStyle}>{record['Green Compression Strength']}</td>
                                            <td style={tableCellStyle}>{record['Return Sand Temp']}</td>
                                            <td style={tableCellStyle}>{record['TOTAL CLAY 11.0 - 14.50%']}</td>
                                            <td style={tableCellStyle}>{record['ACTIVE CLAY 7.0 - 9.0%']}</td>
                                            <td style={tableCellStyle}>{record['DEAD CLAY 3.0 - 4.50%']}</td>
                                            <td style={tableCellStyle}>{record['VOLATILE MATTER 2.30 - 3.50%']}</td>
                                            <td style={tableCellStyle}>{record['LOSS ON IGNITION 4.0 - 7.0%']}</td>
                                            <td style={tableCellStyle}>{record['AFS No  45 - 55']}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                    </>
                )}
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure you want to delete this record?"
                onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 1rem; }`}</style>
        </>
    );
};

export default SandPropertiesTab;
