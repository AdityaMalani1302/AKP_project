import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle } from './styles';
import { useDebounce } from '../../utils/useDebounce';
import AlertDialog from '../common/AlertDialog';
import DatePicker from '../common/DatePicker';
import SearchableSelect from '../common/SearchableSelect';

const SystemUserDetailsTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const initialFormData = {
        AssetId: '',
        AssignedUser: '',
        SystemName: '',
        IPAddress: '',
        AssetOwner: '',
        Descriptions: '',
        IssueDate: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch assets for dropdown
    const { data: assets = [] } = useQuery({
        queryKey: ['itAssets'],
        queryFn: async () => {
            const response = await api.get('/it-management/assets');
            return response.data;
        }
    });

    // Fetch system user details
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['itSystemUsers', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm
                ? `/it-management/system-users?search=${encodeURIComponent(debouncedSearchTerm)}`
                : '/it-management/system-users';
            const response = await api.get(url);
            return response.data;
        }
    });

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/it-management/system-users', data),
        onSuccess: () => {
            toast.success('System user detail added successfully!');
            queryClient.invalidateQueries(['itSystemUsers']);
            handleClear();
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed to add record')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/it-management/system-users/${id}`, data),
        onSuccess: () => {
            toast.success('Record updated successfully!');
            queryClient.invalidateQueries(['itSystemUsers']);
            handleClear();
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed to update record')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/it-management/system-users/${id}`),
        onSuccess: () => {
            toast.success('Record deleted successfully!');
            queryClient.invalidateQueries(['itSystemUsers']);
            handleClear();
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete record');
            setShowDeleteDialog(false);
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.AssetId || !formData.AssignedUser) {
            toast.error('Asset and Assigned User are required');
            return;
        }

        if (isEditing && selectedId) {
            updateMutation.mutate({ id: selectedId, data: formData });
        } else {
            addMutation.mutate(formData);
        }
    };

    const handleRowClick = (record) => {
        setSelectedId(record.Id);
        setIsEditing(true);
        setFormData({
            AssetId: record.AssetId || '',
            AssignedUser: record.AssignedUser || '',
            SystemName: record.SystemName || '',
            IPAddress: record.IPAddress || '',
            AssetOwner: record.AssetOwner || '',
            Descriptions: record.Descriptions || '',
            IssueDate: record.IssueDate ? record.IssueDate.split('T')[0] : ''
        });
    };

    const handleClear = () => {
        setFormData(initialFormData);
        setSelectedId(null);
        setIsEditing(false);
    };

    return (
        <>
            <form onSubmit={handleSubmit}>
                <div style={{ padding: '1.25rem', backgroundColor: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                        System User Details
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Asset <span style={{ color: '#EF4444' }}>*</span></label>
                            <SearchableSelect
                                options={assets.map(a => ({ value: a.AssetId.toString(), label: `${a.AssetTagNumber} - ${a.AssetName}` }))}
                                value={formData.AssetId}
                                onChange={(e) => handleChange(e)}
                                name="AssetId"
                                placeholder="Search asset..."
                                isClearable={true}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Assigned User <span style={{ color: '#EF4444' }}>*</span></label>
                            <input type="text" name="AssignedUser" value={formData.AssignedUser} onChange={handleChange} style={inputStyle} placeholder="User Name" />
                        </div>
                        <div>
                            <label style={labelStyle}>System Name</label>
                            <input type="text" name="SystemName" value={formData.SystemName} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>IP Address</label>
                            <input type="text" name="IPAddress" value={formData.IPAddress} onChange={handleChange} style={inputStyle} placeholder="192.168.1.100" />
                        </div>
                        <div>
                            <label style={labelStyle}>Asset Owner (Dept)</label>
                            <input type="text" name="AssetOwner" value={formData.AssetOwner} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Issue Date</label>
                            <DatePicker name="IssueDate" value={formData.IssueDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Description</label>
                            <input type="text" name="Descriptions" value={formData.Descriptions} onChange={handleChange} style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="submit" disabled={addMutation.isPending || updateMutation.isPending} className="btn btn-primary">
                            {isEditing ? 'UPDATE' : 'ADD'}
                        </button>
                        {selectedId && (
                            <button type="button" onClick={() => setShowDeleteDialog(true)} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>DELETE</button>
                        )}
                        <button type="button" onClick={handleClear} className="btn btn-secondary">CLEAR</button>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <label style={{ fontWeight: '500' }}>Search:</label>
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field" style={{ minWidth: '200px' }} />
                        </div>
                    </div>
                </div>
            </form>

            {/* Records Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
                <h3 className="section-title gray">Records ({records.length})</h3>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                            <tr>
                                {['Sr. No.', 'Asset Tag', 'Assigned User', 'System', 'IP', 'Owner', 'Issue Date'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records</td></tr>
                            ) : (
                                records.map((r, index) => (
                                    <tr key={r.Id} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: selectedId === r.Id ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{index + 1}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.AssetTagNumber}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.AssignedUser}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.SystemName}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.IPAddress}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.AssetOwner}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.IssueDate?.split('T')[0]}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />

            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default SystemUserDetailsTab;
