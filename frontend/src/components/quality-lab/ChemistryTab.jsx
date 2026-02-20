import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { useDebounce } from '../../utils/useDebounce';
import { saveFormHistory } from '../../utils/useInputHistory';
import { labelStyle, inputStyle, sectionPurple, sectionGray, tableHeaderStyle, tableCellStyle, formatDate, formatDateForInput, getYesterdayDate } from './styles';
import AlertDialog from '../common/AlertDialog';
import TableSkeleton from '../common/TableSkeleton';
import Combobox from '../common/Combobox';
import AutocompleteInput from '../common/AutocompleteInput';
import DatePicker from '../common/DatePicker';

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
    const fileInputRef = useRef(null);

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

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/quality-lab/chemistry', data),
        onSuccess: (_, variables) => { 
            toast.success('Record added successfully'); 
            saveFormHistory(FORM_PREFIX, variables);
            handleClear(); 
            queryClient.invalidateQueries(['chemistry']); 
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to add record')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/quality-lab/chemistry/${id}`, data),
        onSuccess: (_, variables) => { 
            toast.success('Record updated successfully'); 
            saveFormHistory(FORM_PREFIX, variables.data);
            handleClear(); 
            queryClient.invalidateQueries(['chemistry']); 
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Failed to update record')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/quality-lab/chemistry/${id}`),
        onSuccess: () => { toast.success('Record deleted successfully'); handleClear(); queryClient.invalidateQueries(['chemistry']); setShowDeleteDialog(false); },
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
        setFormData({ Date: getYesterdayDate(), HeatNo: '', Grade: '', PartNo: '', CE: '', C: '', Si: '', Mn: '', P: '', S: '', Cu: '', Cr: '', Al: '', Pb: '', Sn: '', Ti: '', Mg: '', Mo: '', MeltingSupervisor: '', LabSupervisor: '' });
        setSelectedId(null);
        setIsEditing(false);
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

                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: '#374151', fontWeight: '600' }}>Chemistry Records ({records.length})</h3>
                {isLoading ? <TableSkeleton rows={8} columns={21} /> : (
                    <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr>
                                    <th style={tableHeaderStyle}>Sr. No</th>
                                    <th style={tableHeaderStyle}>Date</th>
                                    <th style={tableHeaderStyle}>Heat No</th>
                                    <th style={tableHeaderStyle}>Grade</th>
                                    <th style={tableHeaderStyle}>Part No</th>
                                    <th style={tableHeaderStyle}>CE</th>
                                    <th style={tableHeaderStyle}>C</th>
                                    <th style={tableHeaderStyle}>Si</th>
                                    <th style={tableHeaderStyle}>Mn</th>
                                    <th style={tableHeaderStyle}>P</th>
                                    <th style={tableHeaderStyle}>S</th>
                                    <th style={tableHeaderStyle}>Cu</th>
                                    <th style={tableHeaderStyle}>Cr</th>
                                    <th style={tableHeaderStyle}>Al</th>
                                    <th style={tableHeaderStyle}>Pb</th>
                                    <th style={tableHeaderStyle}>Sn</th>
                                    <th style={tableHeaderStyle}>Ti</th>
                                    <th style={tableHeaderStyle}>Mg</th>
                                    <th style={tableHeaderStyle}>Mo</th>
                                    <th style={tableHeaderStyle}>Melting Sup.</th>
                                    <th style={tableHeaderStyle}>Lab Sup.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 ? (
                                    <tr><td colSpan={21} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records found</td></tr>
                                ) : records.map((record, index) => (
                                    <tr key={record.Id} onClick={() => handleRowClick(record)}
                                        style={{ cursor: 'pointer', backgroundColor: selectedId === record.Id ? '#E9D5FF' : 'white', transition: 'background-color 0.15s' }}
                                        onMouseEnter={(e) => { if (selectedId !== record.Id) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                                        onMouseLeave={(e) => { if (selectedId !== record.Id) e.currentTarget.style.backgroundColor = 'white'; }}>
                                        <td style={tableCellStyle}>{index + 1}</td>
                                        <td style={tableCellStyle}>{formatDate(record.Date)}</td>
                                        <td style={tableCellStyle}>{record.HeatNo}</td>
                                        <td style={tableCellStyle}>{record.Grade}</td>
                                        <td style={tableCellStyle}>{record.PartNo}</td>
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
                )}
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure you want to delete this chemistry record?"
                onConfirm={handleConfirmDelete} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
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
