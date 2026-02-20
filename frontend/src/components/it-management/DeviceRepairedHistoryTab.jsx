import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle } from './styles';
import { useDebounce } from '../../utils/useDebounce';
import AlertDialog from '../common/AlertDialog';
import DatePicker from '../common/DatePicker';
import SearchableSelect from '../common/SearchableSelect';

const DeviceRepairedHistoryTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const initialFormData = {
        AssetId: '', IssuedUserName: '', IssuedDepartment: '', IssuedBy: '',
        Date: '', IssueVendorName: '', DescriptionOfIssue: '', Remark: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch assets for dropdown
    const { data: assets = [] } = useQuery({
        queryKey: ['itAssets'],
        queryFn: async () => (await api.get('/it-management/assets')).data
    });

    // Fetch repair history
    const { data: records = [] } = useQuery({
        queryKey: ['itRepairHistory', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm ? `/it-management/repair-history?search=${encodeURIComponent(debouncedSearchTerm)}` : '/it-management/repair-history';
            return (await api.get(url)).data;
        }
    });

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/it-management/repair-history', data),
        onSuccess: () => { toast.success('Repair record added!'); queryClient.invalidateQueries(['itRepairHistory']); handleClear(); },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/it-management/repair-history/${id}`, data),
        onSuccess: () => { toast.success('Updated!'); queryClient.invalidateQueries(['itRepairHistory']); handleClear(); },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/it-management/repair-history/${id}`),
        onSuccess: () => { toast.success('Deleted!'); queryClient.invalidateQueries(['itRepairHistory']); handleClear(); setShowDeleteDialog(false); },
        onError: (error) => { toast.error(error.response?.data?.error || 'Failed'); setShowDeleteDialog(false); }
    });

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.AssetId) { toast.error('Asset is required'); return; }
        isEditing && selectedId ? updateMutation.mutate({ id: selectedId, data: formData }) : addMutation.mutate(formData);
    };

    const handleRowClick = (r) => {
        setSelectedId(r.RepairId);
        setIsEditing(true);
        setFormData({
            AssetId: r.AssetId || '', IssuedUserName: r.IssuedUserName || '', IssuedDepartment: r.IssuedDepartment || '',
            IssuedBy: r.IssuedBy || '', Date: r.Date?.split('T')[0] || '', IssueVendorName: r.IssueVendorName || '',
            DescriptionOfIssue: r.DescriptionOfIssue || '', Remark: r.Remark || ''
        });
    };

    const handleClear = () => { setFormData(initialFormData); setSelectedId(null); setIsEditing(false); };

    return (
        <>
            <form onSubmit={handleSubmit}>
                <div style={{ padding: '1.25rem', backgroundColor: '#FAF5FF', borderRadius: '8px', border: '1px solid #E9D5FF' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#7C3AED', fontWeight: '600' }}>Device Repaired History</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>Asset <span style={{ color: '#EF4444' }}>*</span></label>
                            <SearchableSelect
                                options={assets.map(a => ({ value: a.AssetId.toString(), label: `${a.AssetTagNumber} - ${a.AssetName}` }))}
                                value={formData.AssetId}
                                onChange={(e) => handleChange(e)}
                                name="AssetId"
                                placeholder="Search asset..."
                                isClearable={true}
                            />
                        </div>
                        <div><label style={labelStyle}>Issued User Name</label><input type="text" name="IssuedUserName" value={formData.IssuedUserName} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Issued Department</label><input type="text" name="IssuedDepartment" value={formData.IssuedDepartment} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Issued By</label><input type="text" name="IssuedBy" value={formData.IssuedBy} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Date</label><DatePicker name="Date" value={formData.Date} onChange={handleChange} placeholder="Select date..." /></div>
                        <div><label style={labelStyle}>Vendor Name</label><input type="text" name="IssueVendorName" value={formData.IssueVendorName} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Description of Issue</label><input type="text" name="DescriptionOfIssue" value={formData.DescriptionOfIssue} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Remark</label><input type="text" name="Remark" value={formData.Remark} onChange={handleChange} style={inputStyle} /></div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="submit" className="btn btn-primary">{isEditing ? 'UPDATE' : 'ADD'}</button>
                        {selectedId && <button type="button" onClick={() => setShowDeleteDialog(true)} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>DELETE</button>}
                        <button type="button" onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <label style={{ fontWeight: '500' }}>Search:</label>
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field" style={{ minWidth: '200px' }} />
                        </div>
                    </div>
                </div>
            </form>

            <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
                <h3 className="section-title gray">Repair Records ({records.length})</h3>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                            <tr>{['Sr. No.', 'Asset', 'User', 'Dept', 'Date', 'Vendor', 'Issue'].map(h => <th key={h} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records</td></tr> :
                                records.map((r, index) => (
                                    <tr key={r.RepairId} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: selectedId === r.RepairId ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{index + 1}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.AssetTagNumber}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.IssuedUserName}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.IssuedDepartment}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.Date?.split('T')[0]}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.IssueVendorName}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.DescriptionOfIssue?.substring(0, 30)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default DeviceRepairedHistoryTab;
