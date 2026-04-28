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
import { labelStyle, inputStyle, sectionGray, tableHeaderStyle, tableCellStyle, formatDate, formatDateForInput, getYesterdayDate } from './styles';
import AlertDialog from '../common/AlertDialog';
import TableSkeleton from '../common/TableSkeleton';
import FieldError from '../common/FieldError';
import Combobox from '../common/Combobox';
import AutocompleteInput from '../common/AutocompleteInput';
import DatePicker from '../common/DatePicker';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';

const FORM_PREFIX = 'mouldHardness';

const MouldHardnessTab = () => {
    const initialFormData = {
        Date: getYesterdayDate(), HeatNo: '', PartNo: '',
        ...Object.fromEntries([...Array(25)].map((_, i) => [`BoxNo${i + 1}`, '0']))
    };
    
    const [formData, setFormData] = useState(initialFormData);
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
        queryKey: ['mouldHardness', debouncedSearchTerm, shouldFilter, filterHeatNo, filterPartNo],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
            if (shouldFilter && filterHeatNo) params.append('heatNo', filterHeatNo);
            if (shouldFilter && filterPartNo) params.append('partNo', filterPartNo);
            if (shouldFilter && (filterHeatNo || filterPartNo)) params.append('allTime', 'true');
            const url = `/quality-lab/mould-hardness${params.toString() ? '?' + params.toString() : ''}`;
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
        queryKey: ['qualityLab-heatNos', 'mouldHardness'],
        queryFn: async () => {
            const res = await api.get('/quality-lab/heat-nos?type=mould');
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

    const optimistic = withOptimisticUpdate(queryClient, ['mouldHardness']);

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/quality-lab/mould-hardness', data),
        successMessage: 'Record added successfully',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables);
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/quality-lab/mould-hardness/${id}`, data),
        successMessage: 'Record updated successfully',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables.data);
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/quality-lab/mould-hardness/${id}`),
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
        setFormData(initialFormData);
        setSelectedId(null);
        setIsEditing(false);
        clearAllErrors();
    };

    const handleRowClick = (record) => {
        setSelectedId(record.Id);
        setIsEditing(true);
        const newFormData = {
            Date: formatDateForInput(record.Date),
            HeatNo: record.HeatNo || '',
            PartNo: record.PartNo || ''
        };
        for (let i = 1; i <= 25; i++) {
            newFormData[`BoxNo${i}`] = record[`BoxNo${i}`] || '';
        }
        setFormData(newFormData);
    };

    const handleSearchChange = (e) => setSearchTerm(e.target.value);

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/quality-lab/mould-hardness/${r.Id}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['mouldHardness']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['mouldHardness']);
        }
        setShowBulkDeleteDialog(false);
    };

    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/quality-lab/mould-hardness/import-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message);
            if (res.data.skippedRows?.length > 0) toast.info(`Skipped: ${res.data.skippedRows.slice(0, 3).join(', ')}`);
            queryClient.invalidateQueries(['mouldHardness']);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to import Excel file'); }
        finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    // Calculate summary stats
    const getBoxStats = () => {
        const values = [];
        for (let i = 1; i <= 25; i++) {
            const val = parseFloat(formData[`BoxNo${i}`]);
            if (!isNaN(val)) values.push(val);
        }
        if (values.length === 0) return { count: 0, avg: '-', min: '-', max: '-' };
        const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
        const min = Math.min(...values).toFixed(1);
        const max = Math.max(...values).toFixed(1);
        return { count: values.length, avg, min, max };
    };

    const stats = getBoxStats();

    return (
        <>
            <div style={{ ...sectionGray, backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#475569', fontWeight: '600' }}>
                    {isEditing ? `Editing Record ID: ${selectedId}` : 'Mould Hardness Entry'}
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
                    <div><label style={labelStyle}>Part No</label>
                        <Combobox
                            options={partNoOptions}
                            value={formData.PartNo}
                            onChange={(value) => setFormData(prev => ({ ...prev, PartNo: value }))}
                            placeholder="Select Part No..."
                        /></div>
                </div>

                {/* Box Numbers Grid */}
                <h4 style={{ margin: '1rem 0 0.75rem', fontSize: '0.9rem', color: '#64748B' }}>Box Hardness Values (1-25)</h4>
                <div className="box-grid">
                    {[...Array(25)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748B', minWidth: '40px' }}>Box {i + 1}</label>
                            <input type="text" name={`BoxNo${i + 1}`} value={formData[`BoxNo${i + 1}`]} onChange={handleChange}
                                style={{ ...inputStyle, padding: '0.4rem 0.5rem', fontSize: '0.8rem' }} placeholder="-" />
                        </div>
                    ))}
                </div>

                {/* Stats Summary */}
                {stats.count > 0 && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#E0F2FE', borderRadius: '6px', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.85rem', color: '#0369A1' }}><strong>Entries:</strong> {stats.count}</span>
                        <span style={{ fontSize: '0.85rem', color: '#0369A1' }}><strong>Average:</strong> {stats.avg}</span>
                        <span style={{ fontSize: '0.85rem', color: '#0369A1' }}><strong>Min:</strong> {stats.min}</span>
                        <span style={{ fontSize: '0.85rem', color: '#0369A1' }}><strong>Max:</strong> {stats.max}</span>
                    </div>
                )}

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
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#374151', fontWeight: 'bold' }}>Mould Hardness Records ({totalRecords})</h3>
                    {selectedCount > 0 && (
                        <button onClick={() => setShowBulkDeleteDialog(true)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Delete Selected ({selectedCount})
                        </button>
                    )}
                </div>
                {isLoading ? <TableSkeleton rows={8} columns={28} /> : (
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
                                        <SortableHeader columnKey="PartNoDisplay" label="Part No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={tableHeaderStyle} />
                                        {[...Array(25)].map((_, i) => (
                                            <th key={i} style={tableHeaderStyle} scope="col">Box {i + 1}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.length === 0 ? (
                                        <tr><td colSpan={30} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records found</td></tr>
                                    ) : displayData.map((record, index) => (
                                        <tr key={record.Id} onClick={() => handleRowClick(record)}
                                            style={{ cursor: 'pointer', backgroundColor: isSelected(record.Id) ? '#FEF3C7' : selectedId === record.Id ? '#E2E8F0' : 'white', transition: 'background-color 0.15s' }}
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
                                            <td style={tableCellStyle}>{record.PartNoDisplay}</td>
                                            {[...Array(25)].map((_, i) => (
                                                <td key={i} style={tableCellStyle}>{record[`BoxNo${i + 1}`]}</td>
                                            ))}
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

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure you want to delete this mould hardness record?"
                onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
            <style>{`
                .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
                .box-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.5rem; }
                @media (max-width: 900px) { .box-grid { grid-template-columns: repeat(4, 1fr); } }
                @media (max-width: 600px) { .box-grid { grid-template-columns: repeat(2, 1fr); } }
            `}</style>
        </>
    );
};

export default MouldHardnessTab;
