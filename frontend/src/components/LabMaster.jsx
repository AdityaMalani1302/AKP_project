import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import DetailsSection from './lab-master/DetailsSection';
import ChemistryMixSection from './lab-master/ChemistryMixSection';
import OthersSection from './lab-master/OthersSection';
import AlertDialog from './common/AlertDialog';
import TableSkeleton from './common/TableSkeleton';
import TextTooltip from './common/TextTooltip';

const LabMaster = () => {
    const [formData, setFormData] = useState({
        // 1. Details
        Customer: '',
        DrgNo: '',
        Description: '',
        Grade: '',
        PartWeight: '',
        MinMaxThickness: '',
        ThicknessGroup: '',
        BaseChe_C: '',
        BaseChe_Si: '',

        // 2. Final Control Chemistry
        C: '', Si: '', Mn: '', P: '', S: '',
        Cr: '', Cu: '', CE: '',

        // 3. Charge Mix
        CRCA: '', RR: '', PIG: '', MS: '', Mg: '',

        // 4. Others
        RegularCritical: '',
        LastBoxTemp: '',
        Remarks: ''
    });

    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);



    const fetchRecordsFromApi = async (query) => {
        const url = query
            ? `/lab-master?search=${encodeURIComponent(query)}`
            : '/lab-master';
        const response = await api.get(url);
        return response.data;
    };

    const queryClient = useQueryClient();

    const { data: records = [], isError: isQueryError, isLoading: isQueryLoading } = useQuery({
        queryKey: ['labRecords', searchQuery],
        queryFn: () => fetchRecordsFromApi(searchQuery),
        placeholderData: keepPreviousData,
        staleTime: 5000,
    });

    // Mutations
    const addMutation = useMutation({
        mutationFn: (newRecord) => api.post('/lab-master', newRecord),
        onSuccess: () => {
            toast.success('Lab Master record added successfully!');
            queryClient.invalidateQueries(['labRecords']);
            handleClear();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to save record');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/lab-master/${id}`, data),
        onSuccess: () => {
            toast.success('Lab Master record updated successfully!');
            queryClient.invalidateQueries(['labRecords']);
            handleClear();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to update record');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/lab-master/${id}`),
        onSuccess: () => {
            toast.success('Lab Master record deleted successfully!');
            queryClient.invalidateQueries(['labRecords']);
            handleClear();
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete record');
            setShowDeleteDialog(false);
        }
    });

    useEffect(() => {
        if (isQueryError) {
            toast.error('Failed to load lab master records');
        }
    }, [isQueryError]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditing && selectedId) {
                updateMutation.mutate({ id: selectedId, data: formData });
            } else {
                addMutation.mutate(formData);
            }
        } catch (err) {
            console.error('Error saving lab master record:', err);
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setFormData({
            Customer: '', DrgNo: '', Description: '', Grade: '', PartWeight: '',
            MinMaxThickness: '', ThicknessGroup: '', BaseChe_C: '', BaseChe_Si: '',
            C: '', Si: '', Mn: '', P: '', S: '',
            Cr: '', Cu: '', CE: '',
            CRCA: '', RR: '', PIG: '', MS: '', Mg: '',
            RegularCritical: '', LastBoxTemp: '', Remarks: ''
        });
        setSelectedId(null);
        setIsEditing(false);
    };

    const handleRowClick = (record) => {
        setSelectedId(record.LabMasterId);
        setIsEditing(true);
        setFormData({
            Customer: record.Customer || '',
            DrgNo: record.DrgNo || '',
            Description: record.Description || '',
            Grade: record.Grade || '',
            PartWeight: record.PartWeight || '',
            MinMaxThickness: record.MinMaxThickness || '',
            ThicknessGroup: record.ThicknessGroup || '',
            BaseChe_C: record.BaseChe_C || '',
            BaseChe_Si: record.BaseChe_Si || '',
            C: record.C || '',
            Si: record.Si || '',
            Mn: record.Mn || '',
            P: record.P || '',
            S: record.S || '',
            Cr: record.Cr || '',
            Cu: record.Cu || '',
            CE: record.CE || '',
            CRCA: record.CRCA || '',
            RR: record.RR || '',
            PIG: record.PIG || '',
            MS: record.MS || '',
            Mg: record.Mg || '',
            RegularCritical: record.RegularCritical || '',
            LastBoxTemp: record.LastBoxTemp || '',
            Remarks: record.Remarks || ''
        });
    };

    const handleDeleteClick = () => {
        if (!selectedId) {
            toast.error('Please select a record to delete');
            return;
        }
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
        if (selectedId) {
            deleteMutation.mutate(selectedId);
        }
    };

    const handleSearch = () => setSearchQuery(searchTerm);
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value === '') setSearchQuery('');
    };
    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    const handleImportExcel = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            toast.error('Please select a valid Excel file (.xlsx or .xls)');
            return;
        }

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/lab-master/import-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const { successCount, errorCount, errors } = response.data;
            
            if (errorCount > 0) {
                toast.warning(`Import completed with ${successCount} records imported and ${errorCount} errors.`);
                console.log('Import errors:', errors);
            } else {
                toast.success(`Successfully imported ${successCount} records!`);
            }
            
            queryClient.invalidateQueries(['labRecords']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to import Excel file');
        } finally {
            setImporting(false);
            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="card" >
            <h2 style={{ marginBottom: '1.5rem' }}>Lab Master</h2>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <DetailsSection data={formData} onChange={handleChange} />
                <ChemistryMixSection data={formData} onChange={handleChange} />
                <OthersSection data={formData} onChange={handleChange} />

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                        {loading ? 'Saving...' : (isEditing ? 'UPDATE' : 'ADD')}
                    </button>
                    {selectedId && (
                        <button type="button" onClick={handleDeleteClick} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>
                            DELETE
                        </button>
                    )}
                    <button type="button" onClick={handleClear} className="btn btn-secondary">
                        CLEAR
                    </button>
                    
                    {/* Import from Excel */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={importing}
                        className="btn"
                        style={{ backgroundColor: '#059669', color: 'white' }}
                    >
                        {importing ? 'Importing...' : '📥 Import from Excel'}
                    </button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontWeight: '500', whiteSpace: 'nowrap', color: '#374151' }}>Search:</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            onKeyPress={handleSearchKeyPress}
                            placeholder="Search by Customer, Grade..."
                            className="input-field"
                            style={{ minWidth: '250px' }}
                        />
                        <button type="button" onClick={handleSearch} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>🔍</button>
                    </div>
                </div>
            </form>

            {/* Records Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }} >
                <h3 className="section-title gray">Lab Master Records ({records.length})</h3>

                {isQueryLoading ? (
                    <TableSkeleton rows={10} columns={27} />
                ) : (
                    <div style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                        <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB', zIndex: 1 }}>
                                <tr>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>ID</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Customer</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Drg No</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Description</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Grade</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'right', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Part Wt</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Min/Max Thk</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Thk Group</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Base C</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Base Si</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>C</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Si</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Mn</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>P</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>S</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Cr</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Cu</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Mg</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>CE</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>CRCA</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>RR</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>PIG</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>MS</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Mg Mix</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Regular/Critical</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Last Box Temp</th>
                                    <th style={{ padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' }}>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={27} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                            No records found
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((record) => (
                                        <tr
                                            key={record.LabMasterId}
                                            onClick={() => handleRowClick(record)}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: selectedId === record.LabMasterId ? '#DBEAFE' : 'white',
                                                transition: 'background-color 0.15s'
                                            }}
                                            onMouseEnter={(e) => { if (selectedId !== record.LabMasterId) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                                            onMouseLeave={(e) => { if (selectedId !== record.LabMasterId) e.currentTarget.style.backgroundColor = 'white'; }}
                                        >
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.LabMasterId}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
                                                <TextTooltip text={record.Customer} maxLength={20} />
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.DrgNo}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
                                                <TextTooltip text={record.Description} maxLength={25} />
                                            </td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.Grade}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', textAlign: 'right', whiteSpace: 'nowrap' }}>{record.PartWeight}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.MinMaxThickness}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.ThicknessGroup}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.BaseChe_C}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.BaseChe_Si}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.C}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.Si}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.Mn}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.P}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.S}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.Cr}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.Cu}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.Mg_Chem || record.Mg}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.CE}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.CRCA}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.RR}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.PIG}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.MS}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.Mg_Mix}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.RegularCritical}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>{record.LastBoxTemp}</td>
                                            <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' }}>
                                                <TextTooltip text={record.Remarks} maxLength={30} />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedId && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#DBEAFE', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1E40AF' }}>
                        <strong>Editing Record ID: {selectedId}</strong> - Modify values above and click UPDATE to save changes.
                    </div>
                )}
            </div>
            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete Record"
                message="Are you sure you want to delete this record? This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteDialog(false)}
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
};

export default LabMaster;
