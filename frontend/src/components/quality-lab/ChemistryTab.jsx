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
import { labelStyle, inputStyle, sectionPurple, sectionGray, tableHeaderStyle, tableCellStyle, formatDate, formatDateForInput, getYesterdayDate } from './styles';
import AlertDialog from '../common/AlertDialog';
import TableSkeleton from '../common/TableSkeleton';
import FieldError from '../common/FieldError';
import Combobox from '../common/Combobox';
import AutocompleteInput from '../common/AutocompleteInput';
import DatePicker from '../common/DatePicker';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';

const FORM_PREFIX = 'chemistry';

const ChemistryTab = () => {
    const [formData, setFormData] = useState({
        Date: getYesterdayDate(), HeatNo: '', Grade: '', PartNo: '',
        CE: '', C: '', Si: '', Mn: '', P: '', S: '',
        Cu: '', Cr: '', Al: '', Pb: '', Sn: '', Ti: '', Mg: '', Mo: '',
        MeltingSupervisor: '', LabSupervisor: ''
    });
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const fileInputRef = useRef(null);

    const validationRules = {
        Date: { required: true, requiredMessage: 'Date is required' },
        HeatNo: { required: true, requiredMessage: 'Heat No is required' }
    };

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, clearAllErrors } = useFormValidation(validationRules);

    // Filter state for records table
    const [filterHeatNo, setFilterHeatNo] = useState('');
    const [filterPartNo, setFilterPartNo] = useState('');
    const [shouldFilter, setShouldFilter] = useState(false);

    const queryClient = useQueryClient();

    const { data: records = [], isLoading, isError } = useQuery({
        queryKey: ['chemistry', debouncedSearchTerm, shouldFilter, filterHeatNo, filterPartNo],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
            if (shouldFilter && filterHeatNo) params.append('heatNo', filterHeatNo);
            if (shouldFilter && filterPartNo) params.append('partNo', filterPartNo);
            if (shouldFilter && (filterHeatNo || filterPartNo)) params.append('allTime', 'true');
            const url = `/quality-lab/chemistry${params.toString() ? '?' + params.toString() : ''}`;
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
    } = usePagination({ data: records, pageSize: 50, autoPaginate: true });

    const { sortKey, sortOrder, handleSort } = useSortableData(records);

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: records });

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
        queryKey: ['qualityLab-heatNos', 'chemistry'],
        queryFn: async () => {
            const res = await api.get('/quality-lab/heat-nos?type=chemistry');
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

    // Create Part No options for Combobox
    const partNoOptions = useMemo(() => {
        if (!Array.isArray(products)) return [];
        return products
            .filter(p => p.InternalPartNo && p.InternalPartNo.trim() !== '')
            .map(p => ({
                value: p.ProdId,
                label: p.InternalPartNo
            }));
    }, [products]);

    // Fetch unique grades for dropdown
    const { data: grades = [] } = useQuery({
        queryKey: ['qualityLabGrades'],
        queryFn: async () => {
            const res = await api.get('/quality-lab/grades');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Create Grade options for Combobox
    const gradeOptions = useMemo(() => {
        return grades.map(g => ({ value: g, label: g }));
    }, [grades]);

    // Fetch unique melting supervisors for dropdown
    const { data: meltingSupervisors = [] } = useQuery({
        queryKey: ['meltingSupervisors'],
        queryFn: async () => {
            const res = await api.get('/quality-lab/melting-supervisors');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Fetch unique lab supervisors for dropdown
    const { data: labSupervisors = [] } = useQuery({
        queryKey: ['labSupervisors'],
        queryFn: async () => {
            const res = await api.get('/quality-lab/lab-supervisors');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Create supervisor options for Combobox
    const meltingSupervisorOptions = useMemo(() => {
        return meltingSupervisors.map(s => ({ value: s, label: s }));
    }, [meltingSupervisors]);

    const labSupervisorOptions = useMemo(() => {
        return labSupervisors.map(s => ({ value: s, label: s }));
    }, [labSupervisors]);

    const optimistic = withOptimisticUpdate(queryClient, ['chemistry']);

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/quality-lab/chemistry', data),
        successMessage: 'Record added successfully',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables);
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/quality-lab/chemistry/${id}`, data),
        successMessage: 'Record updated successfully',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables.data);
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/quality-lab/chemistry/${id}`),
        successMessage: 'Record deleted successfully',
        onSuccess: () => {
            handleClear();
            setShowDeleteDialog(false);
        }
    }));

    useEffect(() => { if (isError) toast.error('Failed to load records'); }, [isError]);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (_touched[name]) {
            validateField(name, value);
        }
    };

    const handleAdd = () => {
        const requiredFields = ['Date', 'HeatNo'];
        const touchedFields = {};
        requiredFields.forEach(field => { touchedFields[field] = true; });
        setTouched(prev => ({ ...prev, ...touchedFields }));

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
        setFormData({ Date: getYesterdayDate(), HeatNo: '', Grade: '', PartNo: '', CE: '', C: '', Si: '', Mn: '', P: '', S: '', Cu: '', Cr: '', Al: '', Pb: '', Sn: '', Ti: '', Mg: '', Mo: '', MeltingSupervisor: '', LabSupervisor: '' });
        setSelectedId(null);
        setIsEditing(false);
        clearAllErrors();
    };

    const handleRowClick = (record) => {
        setSelectedId(record.Id);
        setIsEditing(true);
        setFormData({
            Date: formatDateForInput(record.Date), HeatNo: record.HeatNo || '', Grade: record.Grade || '', PartNo: record.PartNo || '',
            CE: record.CE || '', C: record.C || '', Si: record.Si || '', Mn: record.Mn || '', P: record.P || '', S: record.S || '',
            Cu: record.Cu || '', Cr: record.Cr || '', Al: record.Al || '', Pb: record.Pb || '', Sn: record.Sn || '', Ti: record.Ti || '',
            Mg: record.Mg || '', Mo: record.Mo || '', MeltingSupervisor: record.MeltingSupervisor || '', LabSupervisor: record.LabSupervisor || ''
        });
    };

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/quality-lab/chemistry/${r.Id}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['chemistry']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['chemistry']);
        }
        setShowBulkDeleteDialog(false);
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
            const res = await api.post('/quality-lab/chemistry/import-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message);
            if (res.data.skippedRows?.length > 0) toast.info(`Skipped: ${res.data.skippedRows.slice(0, 3).join(', ')}`);
            queryClient.invalidateQueries(['chemistry']);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to import Excel file'); }
        finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    return (
        <>
            <div style={sectionPurple}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#7C3AED', fontWeight: '600' }}>
                    {isEditing ? `Editing Record ID: ${selectedId}` : 'Chemistry (Spectro) Entry'}
                </h3>
                
                {/* Basic Info */}
                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                    <div><label style={labelStyle}>Date <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                        <DatePicker name="Date" value={formData.Date} onChange={handleChange} placeholder="Select date..."
                            style={{
                                ...inputStyle,
                                ...(_touched.Date && _errors.Date ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                            }}
                            aria-invalid={_touched.Date && _errors.Date ? 'true' : undefined}
                            aria-describedby={_touched.Date && _errors.Date ? 'Date-error' : undefined} />
                        <FieldError error={_touched.Date && _errors.Date ? _errors.Date : null} id="Date-error" /></div>
                    <div><label style={labelStyle}>Heat No <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                        <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="HeatNo" name="HeatNo" value={formData.HeatNo} onChange={handleChange}
                            style={{
                                ...inputStyle,
                                ...(_touched.HeatNo && _errors.HeatNo ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                            }}
                            placeholder="Heat No"
                            aria-invalid={_touched.HeatNo && _errors.HeatNo ? 'true' : undefined}
                            aria-describedby={_touched.HeatNo && _errors.HeatNo ? 'HeatNo-error' : undefined} />
                        <FieldError error={_touched.HeatNo && _errors.HeatNo ? _errors.HeatNo : null} id="HeatNo-error" /></div>
                    <div><label style={labelStyle}>Grade</label>
                        <Combobox
                            options={gradeOptions}
                            value={formData.Grade}
                            onChange={(value) => setFormData(prev => ({ ...prev, Grade: value }))}
                            placeholder="Select or type Grade..."
                        /></div>
                    <div><label style={labelStyle}>Part No</label>
                        <Combobox
                            options={partNoOptions}
                            value={formData.PartNo}
                            onChange={(value) => setFormData(prev => ({ ...prev, PartNo: value }))}
                            placeholder="Select Part No..."
                        /></div>
                </div>

                {/* Chemical Elements */}
                <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#6D28D9' }}>Chemical Composition</h4>
                <div className="form-grid-chem">
                    <div><label style={labelStyle}>CE</label><input type="text" name="CE" value={formData.CE} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>C</label><input type="text" name="C" value={formData.C} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Si</label><input type="text" name="Si" value={formData.Si} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Mn</label><input type="text" name="Mn" value={formData.Mn} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>P</label><input type="text" name="P" value={formData.P} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>S</label><input type="text" name="S" value={formData.S} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Cu</label><input type="text" name="Cu" value={formData.Cu} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Cr</label><input type="text" name="Cr" value={formData.Cr} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Al</label><input type="text" name="Al" value={formData.Al} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Pb</label><input type="text" name="Pb" value={formData.Pb} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Sn</label><input type="text" name="Sn" value={formData.Sn} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Ti</label><input type="text" name="Ti" value={formData.Ti} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Mg</label><input type="text" name="Mg" value={formData.Mg} onChange={handleChange} style={inputStyle} /></div>
                    <div><label style={labelStyle}>Mo</label><input type="text" name="Mo" value={formData.Mo} onChange={handleChange} style={inputStyle} /></div>
                </div>

                {/* Supervisors */}
                <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#6D28D9' }}>Supervisors</h4>
                <div className="form-grid">
                    <div><label style={labelStyle}>Melting Supervisor</label>
                        <Combobox
                            options={meltingSupervisorOptions}
                            value={formData.MeltingSupervisor}
                            onChange={(value) => setFormData(prev => ({ ...prev, MeltingSupervisor: value }))}
                            placeholder="Select or type Supervisor..."
                        /></div>
                    <div><label style={labelStyle}>Lab Supervisor</label>
                        <Combobox
                            options={labSupervisorOptions}
                            value={formData.LabSupervisor}
                            onChange={(value) => setFormData(prev => ({ ...prev, LabSupervisor: value }))}
                            placeholder="Select or type Supervisor..."
                        /></div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {!isEditing && <button onClick={handleAdd} className="btn btn-primary btn-ripple">ADD</button>}
                    <button onClick={handleEdit} className="btn btn-success btn-ripple">{isEditing ? 'UPDATE' : 'EDIT'}</button>
                    <button onClick={handleDeleteClick} className="btn btn-danger btn-ripple">DELETE</button>
                    <button onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                    
                    {!isEditing && (
                        <>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" style={{ display: 'none' }} />
                            <button onClick={handleImportClick} disabled={isImporting} className="btn btn-purple btn-ripple">
                                {isImporting ? 'Importing...' : '📥 Import from Excel'}
                            </button>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-red-700, #DC2626)', fontWeight: '500' }}>⚠️ Do not change column name and structure in excel sheet</span>
                        </>
                    )}
                    
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input type="text" value={searchTerm} onChange={handleSearchChange}
                            placeholder="Type to search..." className="input-field" style={{ minWidth: '200px' }} />
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>✕</button>}
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
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#374151', fontWeight: 'bold' }}>Chemistry Records ({totalRecords})</h3>
                    {selectedCount > 0 && (
                        <button onClick={() => setShowBulkDeleteDialog(true)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Delete Selected ({selectedCount})
                        </button>
                    )}
                </div>
                {isLoading ? <TableSkeleton rows={8} columns={21} /> : (
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
                                        <SortableHeader columnKey="HeatNo" label="Heat No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Grade" label="Grade" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="PartNoDisplay" label="Part No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="CE" label="CE" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="C" label="C" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Si" label="Si" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Mn" label="Mn" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="P" label="P" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="S" label="S" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Cu" label="Cu" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Cr" label="Cr" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Al" label="Al" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Pb" label="Pb" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Sn" label="Sn" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Ti" label="Ti" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Mg" label="Mg" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="Mo" label="Mo" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="MeltingSupervisor" label="Melting Sup." sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        <SortableHeader columnKey="LabSupervisor" label="Lab Sup." sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.length === 0 ? (
                                        <tr><td colSpan={22} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records found</td></tr>
                                    ) : displayData.map((record, index) => (
                                        <tr key={record.Id} onClick={() => handleRowClick(record)}
                                            style={{ cursor: 'pointer', backgroundColor: isSelected(record.Id) ? '#FEF3C7' : selectedId === record.Id ? '#E9D5FF' : 'white', transition: 'background-color 0.15s' }}
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
                                            <td style={tableCellStyle}>{(currentPage - 1) * pageSize + index + 1}</td>
                                            <td style={tableCellStyle}>{formatDate(record.Date)}</td>
                                            <td style={tableCellStyle}>{record.HeatNo}</td>
                                            <td style={tableCellStyle}>{record.Grade}</td>
                                            <td style={tableCellStyle}>{record.PartNoDisplay}</td>
                                            <td style={tableCellStyle}>{record.CE}</td>
                                            <td style={tableCellStyle}>{record.C}</td>
                                            <td style={tableCellStyle}>{record.Si}</td>
                                            <td style={tableCellStyle}>{record.Mn}</td>
                                            <td style={tableCellStyle}>{record.P}</td>
                                            <td style={tableCellStyle}>{record.S}</td>
                                            <td style={tableCellStyle}>{record.Cu}</td>
                                            <td style={tableCellStyle}>{record.Cr}</td>
                                            <td style={tableCellStyle}>{record.Al}</td>
                                            <td style={tableCellStyle}>{record.Pb}</td>
                                            <td style={tableCellStyle}>{record.Sn}</td>
                                            <td style={tableCellStyle}>{record.Ti}</td>
                                            <td style={tableCellStyle}>{record.Mg}</td>
                                            <td style={tableCellStyle}>{record.Mo}</td>
                                            <td style={tableCellStyle}>{record.MeltingSupervisor}</td>
                                            <td style={tableCellStyle}>{record.LabSupervisor}</td>
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

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure you want to delete this chemistry record?"
                onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
            <style>{`
                .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
                .form-grid-chem { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.75rem; }
                @media (max-width: 900px) { .form-grid-chem { grid-template-columns: repeat(4, 1fr); } }
                @media (max-width: 600px) { .form-grid-chem { grid-template-columns: repeat(2, 1fr); } }
            `}</style>
        </>
    );
};

export default ChemistryTab;
