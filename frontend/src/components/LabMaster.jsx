import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createColumnHelper } from '@tanstack/react-table';
import api from '../api';
import DetailsSection from './lab-master/DetailsSection';
import ChemistryMixSection from './lab-master/ChemistryMixSection';
import OthersSection from './lab-master/OthersSection';
import AlertDialog from './common/AlertDialog';
import DataTable from './common/DataTable';
import TableSkeleton from './common/TableSkeleton'; // Added
import TextTooltip from './common/TextTooltip'; // Added

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

    const columnHelper = createColumnHelper();

    const columns = useMemo(() => [
        columnHelper.accessor('LabMasterId', {
            header: 'ID',
            size: 60,
            minWidth: 60,
        }),
        columnHelper.accessor('Customer', {
            header: 'Customer',
            size: 150,
            minWidth: 150,
            cell: info => <TextTooltip text={info.getValue()} maxLength={20} />
        }),
        columnHelper.accessor('DrgNo', {
            header: 'Drg No',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('Description', {
            header: 'Description',
            size: 200,
            minWidth: 200,
            cell: info => <TextTooltip text={info.getValue()} maxLength={25} />
        }),
        columnHelper.accessor('Grade', {
            header: 'Grade',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('PartWeight', {
            header: 'Part Wt',
            size: 100,
            minWidth: 100,
            cell: info => <div style={{ textAlign: 'right' }}>{info.getValue()}</div>,
        }),
        columnHelper.accessor('MinMaxThickness', {
            header: 'Min/Max Thickness',
            size: 120,
            minWidth: 120,
        }),
        columnHelper.accessor('ThicknessGroup', {
            header: 'Thickness Group',
            size: 120,
            minWidth: 120,
        }),
        columnHelper.accessor('BaseChe_C', {
            header: 'Base C',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('BaseChe_Si', {
            header: 'Base Si',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('C', {
            header: 'C',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('Si', {
            header: 'Si',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('Mn', {
            header: 'Mn',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('P', {
            header: 'P',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('S', {
            header: 'S',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('Cr', {
            header: 'Cr',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('Cu', {
            header: 'Cu',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('Mg_Chem', { // Assuming Mg_Chem based on previous table render logic: record.Mg_Chem || record.Mg
            header: 'Mg',
            size: 80,
            minWidth: 80,
            cell: info => info.getValue() || info.row.original.Mg,
        }),
        columnHelper.accessor('CE', {
            header: 'CE',
            size: 80,
            minWidth: 80,
        }),
        columnHelper.accessor('CRCA', {
            header: 'CRCA',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('RR', {
            header: 'RR',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('PIG', {
            header: 'PIG',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('MS', {
            header: 'MS',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('Mg_Mix', {
            header: 'Mg Mix',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('RegularCritical', {
            header: 'Regular/Critical',
            size: 120,
            minWidth: 120,
        }),
        columnHelper.accessor('LastBoxTemp', {
            header: 'Last Box Temp',
            size: 120,
            minWidth: 120,
        }),
        columnHelper.accessor('Remarks', {
            header: 'Remarks',
            size: 200,
            minWidth: 200,
            cell: info => <TextTooltip text={info.getValue()} maxLength={30} />
        }),
    ], []);

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
                    <TableSkeleton rows={10} columns={15} />
                ) : (
                    <DataTable
                        data={records}
                        columns={columns}
                        onRowClick={handleRowClick}
                        selectedId={selectedId}
                    />
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
