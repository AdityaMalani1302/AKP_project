import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { useDebounce } from '../../utils/useDebounce';
import { saveFormHistory } from '../../utils/useInputHistory';
import { labelStyle, inputStyle, sectionGray, tableHeaderStyle, tableCellStyle, formatDate, formatDateForInput, getYesterdayDate } from './styles';
import AlertDialog from '../common/AlertDialog';
import TableSkeleton from '../common/TableSkeleton';
import Combobox from '../common/Combobox';
import AutocompleteInput from '../common/AutocompleteInput';
import DatePicker from '../common/DatePicker';

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
    const fileInputRef = useRef(null);

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
                value: p.InternalPartNo,
                label: p.InternalPartNo
            }));
    }, [products]);

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/quality-lab/mould-hardness', data),
        onSuccess: (_, variables) => { toast.success('Record added successfully'); saveFormHistory(FORM_PREFIX, variables); handleClear(); queryClient.invalidateQueries(['mouldHardness']); },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to add record')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/quality-lab/mould-hardness/${id}`, data),
        onSuccess: (_, variables) => { toast.success('Record updated successfully'); saveFormHistory(FORM_PREFIX, variables.data); handleClear(); queryClient.invalidateQueries(['mouldHardness']); },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to update record')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/quality-lab/mould-hardness/${id}`),
        onSuccess: () => { toast.success('Record deleted successfully'); handleClear(); queryClient.invalidateQueries(['mouldHardness']); setShowDeleteDialog(false); },
        onError: (err) => { toast.error(err.response?.data?.error || 'Failed to delete record'); setShowDeleteDialog(false); }
    });

    useEffect(() => { if (isError) toast.error('Failed to load records'); }, [isError]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAdd = () => {
        if (!formData.Date) { toast.error('Date is required'); return; }
        if (!formData.HeatNo) { toast.error('Heat No is required'); return; }
        // Validate Part No is from dropdown if provided
        if (formData.PartNo && formData.PartNo.trim()) {
            const isValidPartNo = partNoOptions.some(opt => opt.value === formData.PartNo);
            if (!isValidPartNo) { toast.error('Please select a valid Part No from the dropdown'); return; }
        }
        addMutation.mutate(formData);
    };

    const handleEdit = () => {
        if (!selectedId) { toast.error('Please select a record to edit'); return; }
        // Validate Part No is from dropdown if provided
        if (formData.PartNo && formData.PartNo.trim()) {
            const isValidPartNo = partNoOptions.some(opt => opt.value === formData.PartNo);
            if (!isValidPartNo) { toast.error('Please select a valid Part No from the dropdown'); return; }
        }
        updateMutation.mutate({ id: selectedId, data: formData });
    };

    const handleDeleteClick = () => { if (!selectedId) { toast.error('Please select a record to delete'); return; } setShowDeleteDialog(true); };
    const handleConfirmDelete = () => { if (selectedId) deleteMutation.mutate(selectedId); };

    const handleClear = () => {
        setFormData(initialFormData);
        setSelectedId(null);
        setIsEditing(false);
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
                    <div><label style={labelStyle}>Date <span style={{ color: '#EF4444' }}>*</span></label>
                        <DatePicker name="Date" value={formData.Date} onChange={handleChange} placeholder="Select date..." /></div>
                    <div><label style={labelStyle}>Heat No <span style={{ color: '#EF4444' }}>*</span></label>
                        <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="HeatNo" name="HeatNo" value={formData.HeatNo} onChange={handleChange} style={inputStyle} placeholder="Heat No" /></div>
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

                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#374151', fontWeight: '600' }}>Mould Hardness Records ({records.length})</h3>
                {isLoading ? <TableSkeleton rows={8} columns={28} /> : (
                    <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={tableHeaderStyle}>Sr. No</th>
                                    <th style={tableHeaderStyle}>Date</th>
                                    <th style={tableHeaderStyle}>Heat No</th>
                                    <th style={tableHeaderStyle}>Part No</th>
                                    {[...Array(25)].map((_, i) => (
                                        <th key={i} style={tableHeaderStyle}>Box {i + 1}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 ? (
                                    <tr><td colSpan={29} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records found</td></tr>
                                ) : records.map((record, index) => (
                                    <tr key={record.Id} onClick={() => handleRowClick(record)}
                                        style={{ cursor: 'pointer', backgroundColor: selectedId === record.Id ? '#E2E8F0' : 'white', transition: 'background-color 0.15s' }}
                                        onMouseEnter={(e) => { if (selectedId !== record.Id) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                                        onMouseLeave={(e) => { if (selectedId !== record.Id) e.currentTarget.style.backgroundColor = 'white'; }}>
                                        <td style={tableCellStyle}>{index + 1}</td>
                                        <td style={tableCellStyle}>{formatDate(record.Date)}</td>
                                        <td style={tableCellStyle}>{record.HeatNo}</td>
                                        <td style={tableCellStyle}>{record.PartNo}</td>
                                        {[...Array(25)].map((_, i) => (
                                            <td key={i} style={tableCellStyle}>{record[`BoxNo${i + 1}`]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure you want to delete this mould hardness record?"
                onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
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
