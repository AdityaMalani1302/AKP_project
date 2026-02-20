import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { useDebounce } from '../../utils/useDebounce';
import { saveFormHistory } from '../../utils/useInputHistory';
import { labelStyle, inputStyle, sectionGreen, sectionGray, tableHeaderStyle, tableCellStyle, formatDate, formatDateForInput, getYesterdayDate } from './styles';
import AlertDialog from '../common/AlertDialog';
import TableSkeleton from '../common/TableSkeleton';
import Combobox from '../common/Combobox';
import AutocompleteInput from '../common/AutocompleteInput';
import DatePicker from '../common/DatePicker';

const FORM_PREFIX = 'microstructure';

const MicrostructureTab = () => {
    const [formData, setFormData] = useState({
        Date: getYesterdayDate(), HeatNo: '', Grade: '', PartNo: '',
        Nodularity: '', Graphitetype: '', NodularityCount: '', GraphiteSize: '',
        Pearlite: '', Ferrite: '', Carbide: '', CastingHardness: ''
    });
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
        queryKey: ['microstructure', debouncedSearchTerm, shouldFilter, filterHeatNo, filterPartNo],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
            if (shouldFilter && filterHeatNo) params.append('heatNo', filterHeatNo);
            if (shouldFilter && filterPartNo) params.append('partNo', filterPartNo);
            if (shouldFilter && (filterHeatNo || filterPartNo)) params.append('allTime', 'true');
            const url = `/quality-lab/microstructure${params.toString() ? '?' + params.toString() : ''}`;
            const res = await api.get(url);
            return res.data;
        },
        placeholderData: keepPreviousData,
    });

    // Fetch Heat Nos for filter dropdown
    const { data: heatNos = [], isLoading: heatNosLoading } = useQuery({
        queryKey: ['qualityLab-heatNos', 'microstructure'],
        queryFn: async () => {
            const res = await api.get('/quality-lab/heat-nos?type=microstructure');
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

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/quality-lab/microstructure', data),
        onSuccess: (_, variables) => { toast.success('Record added successfully'); saveFormHistory(FORM_PREFIX, variables); handleClear(); queryClient.invalidateQueries(['microstructure']); },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to add record')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/quality-lab/microstructure/${id}`, data),
        onSuccess: (_, variables) => { toast.success('Record updated successfully'); saveFormHistory(FORM_PREFIX, variables.data); handleClear(); queryClient.invalidateQueries(['microstructure']); },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to update record')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/quality-lab/microstructure/${id}`),
        onSuccess: () => { toast.success('Record deleted successfully'); handleClear(); queryClient.invalidateQueries(['microstructure']); setShowDeleteDialog(false); },
        onError: (err) => { toast.error(err.response?.data?.error || 'Failed to delete record'); setShowDeleteDialog(false); }
    });

    useEffect(() => { if (isError) toast.error('Failed to load records'); }, [isError]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleAdd = () => {
        if (!formData.Date || !formData.HeatNo) { toast.error('Date and Heat No are required'); return; }
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
        setFormData({ Date: getYesterdayDate(), HeatNo: '', Grade: '', PartNo: '', Nodularity: '', Graphitetype: '', NodularityCount: '', GraphiteSize: '', Pearlite: '', Ferrite: '', Carbide: '', CastingHardness: '' });
        setSelectedId(null);
        setIsEditing(false);
    };

    const handleRowClick = (record) => {
        setSelectedId(record.ID);
        setIsEditing(true);
        setFormData({
            Date: formatDateForInput(record.Date), HeatNo: record.HeatNo || '', Grade: record.Grade || '', PartNo: record.PartNo || '',
            Nodularity: record.Nodularity || '', Graphitetype: record.Graphitetype || '', NodularityCount: record.NodularityCount || '',
            GraphiteSize: record.GraphiteSize || '', Pearlite: record.Pearlite || '', Ferrite: record.Ferrite || '',
            Carbide: record.Carbide || '', CastingHardness: record.CastingHardness || ''
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
            const res = await api.post('/quality-lab/microstructure/import-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success(res.data.message);
            if (res.data.skippedRows?.length > 0) toast.info(`Skipped: ${res.data.skippedRows.slice(0, 3).join(', ')}`);
            queryClient.invalidateQueries(['microstructure']);
        } catch (err) { toast.error(err.response?.data?.error || 'Failed to import Excel file'); }
        finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    };

    return (
        <>
            <div style={sectionGreen}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#15803D', fontWeight: '600' }}>
                    {isEditing ? `Editing Record ID: ${selectedId}` : 'Microstructure & Hardness Entry'}
                </h3>
                <div className="form-grid">
                    <div><label style={labelStyle}>Date <span style={{ color: '#EF4444' }}>*</span></label>
                        <DatePicker name="Date" value={formData.Date} onChange={handleChange} placeholder="Select date..." /></div>
                    <div><label style={labelStyle}>Heat No <span style={{ color: '#EF4444' }}>*</span></label>
                        <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="HeatNo" name="HeatNo" value={formData.HeatNo} onChange={handleChange} style={inputStyle} placeholder="Heat No" /></div>
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
                    <div><label style={labelStyle}>Nodularity</label>
                        <input type="text" name="Nodularity" value={formData.Nodularity} onChange={handleChange} style={inputStyle} placeholder="Nodularity" /></div>
                    <div><label style={labelStyle}>Graphite Type</label>
                        <input type="text" name="Graphitetype" value={formData.Graphitetype} onChange={handleChange} style={inputStyle} placeholder="Graphite Type" /></div>
                    <div><label style={labelStyle}>Nodularity Count</label>
                        <input type="text" name="NodularityCount" value={formData.NodularityCount} onChange={handleChange} style={inputStyle} placeholder="Nodularity Count" /></div>
                    <div><label style={labelStyle}>Graphite Size</label>
                        <input type="text" name="GraphiteSize" value={formData.GraphiteSize} onChange={handleChange} style={inputStyle} placeholder="Graphite Size" /></div>
                    <div><label style={labelStyle}>Pearlite</label>
                        <input type="text" name="Pearlite" value={formData.Pearlite} onChange={handleChange} style={inputStyle} placeholder="Pearlite %" /></div>
                    <div><label style={labelStyle}>Ferrite</label>
                        <input type="text" name="Ferrite" value={formData.Ferrite} onChange={handleChange} style={inputStyle} placeholder="Ferrite %" /></div>
                    <div><label style={labelStyle}>Carbide</label>
                        <input type="text" name="Carbide" value={formData.Carbide} onChange={handleChange} style={inputStyle} placeholder="Carbide %" /></div>
                    <div><label style={labelStyle}>Casting Hardness</label>
                        <input type="text" name="CastingHardness" value={formData.CastingHardness} onChange={handleChange} style={inputStyle} placeholder="Casting Hardness" /></div>
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

                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#374151', fontWeight: '600' }}>
                    Microstructure & Hardness Records ({records.length})
                </h3>
            {isLoading ? <TableSkeleton rows={8} columns={13} /> : (
                    <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={tableHeaderStyle}>Sr. No</th>
                                    <th style={tableHeaderStyle}>Date</th>
                                    <th style={tableHeaderStyle}>Heat No</th>
                                    <th style={tableHeaderStyle}>Grade</th>
                                    <th style={tableHeaderStyle}>Part No</th>
                                    <th style={tableHeaderStyle}>Nodularity</th>
                                    <th style={tableHeaderStyle}>Graphite Type</th>
                                    <th style={tableHeaderStyle}>Nodularity Count</th>
                                    <th style={tableHeaderStyle}>Graphite Size</th>
                                    <th style={tableHeaderStyle}>Pearlite</th>
                                    <th style={tableHeaderStyle}>Ferrite</th>
                                    <th style={tableHeaderStyle}>Carbide</th>
                                    <th style={tableHeaderStyle}>Hardness</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 ? (
                                    <tr><td colSpan={13} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records found</td></tr>
                                ) : records.map((record, index) => (
                                    <tr key={record.ID} onClick={() => handleRowClick(record)}
                                        style={{ cursor: 'pointer', backgroundColor: selectedId === record.ID ? '#DCFCE7' : 'white', transition: 'background-color 0.15s' }}
                                        onMouseEnter={(e) => { if (selectedId !== record.ID) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                                        onMouseLeave={(e) => { if (selectedId !== record.ID) e.currentTarget.style.backgroundColor = 'white'; }}>
                                        <td style={tableCellStyle}>{index + 1}</td>
                                        <td style={tableCellStyle}>{formatDate(record.Date)}</td>
                                        <td style={tableCellStyle}>{record.HeatNo}</td>
                                        <td style={tableCellStyle}>{record.Grade}</td>
                                        <td style={tableCellStyle}>{record.PartNo}</td>
                                        <td style={tableCellStyle}>{record.Nodularity}</td>
                                        <td style={tableCellStyle}>{record.Graphitetype}</td>
                                        <td style={tableCellStyle}>{record.NodularityCount}</td>
                                        <td style={tableCellStyle}>{record.GraphiteSize}</td>
                                        <td style={tableCellStyle}>{record.Pearlite}</td>
                                        <td style={tableCellStyle}>{record.Ferrite}</td>
                                        <td style={tableCellStyle}>{record.Carbide}</td>
                                        <td style={tableCellStyle}>{record.CastingHardness}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure you want to delete this record?"
                onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }`}</style>
        </>
    );
};

export default MicrostructureTab;
