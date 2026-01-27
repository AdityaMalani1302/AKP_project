import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle } from './styles';
import { useDebounce } from '../../utils/useDebounce';
import AlertDialog from '../common/AlertDialog';
import DatePicker from '../common/DatePicker';
import NumberInput from '../common/NumberInput';
import SearchableSelect from '../common/SearchableSelect';

const SoftwareListTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const initialFormData = {
        SoftwareName: '', VendorPublisher: '', Category: '', Version: '',
        LicenseType: '', LicenseCountPurchased: '', LicenseCountInUse: '', LicenseStatus: '', LicenseExpiryDate: '',
        InstalledOnAssetId: '', Department: '', SoftwareStatus: '', Owner: '', Notes: '', UpdateDate: '',
        POContractReference: '', Cost: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch assets for dropdown
    const { data: assets = [] } = useQuery({
        queryKey: ['itAssets'],
        queryFn: async () => (await api.get('/it-management/assets')).data
    });

    // Fetch software
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['itSoftware', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm ? `/it-management/software?search=${encodeURIComponent(debouncedSearchTerm)}` : '/it-management/software';
            return (await api.get(url)).data;
        }
    });

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/it-management/software', data),
        onSuccess: () => { toast.success('Software added!'); queryClient.invalidateQueries(['itSoftware']); handleClear(); },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/it-management/software/${id}`, data),
        onSuccess: () => { toast.success('Updated!'); queryClient.invalidateQueries(['itSoftware']); handleClear(); },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/it-management/software/${id}`),
        onSuccess: () => { toast.success('Deleted!'); queryClient.invalidateQueries(['itSoftware']); handleClear(); setShowDeleteDialog(false); },
        onError: (error) => { toast.error(error.response?.data?.error || 'Failed'); setShowDeleteDialog(false); }
    });

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.SoftwareName) { toast.error('Software Name required'); return; }
        isEditing && selectedId ? updateMutation.mutate({ id: selectedId, data: formData }) : addMutation.mutate(formData);
    };

    const handleRowClick = (r) => {
        setSelectedId(r.SoftwareId);
        setIsEditing(true);
        setFormData({
            SoftwareName: r.SoftwareName || '', VendorPublisher: r.VendorPublisher || '', Category: r.Category || '', Version: r.Version || '',
            LicenseType: r.LicenseType || '', LicenseCountPurchased: r.LicenseCountPurchased || '', LicenseCountInUse: r.LicenseCountInUse || '',
            LicenseStatus: r.LicenseStatus || '', LicenseExpiryDate: r.LicenseExpiryDate?.split('T')[0] || '',
            InstalledOnAssetId: r.InstalledOnAssetId || '', Department: r.Department || '', SoftwareStatus: r.SoftwareStatus || '',
            Owner: r.Owner || '', Notes: r.Notes || '', UpdateDate: r.UpdateDate?.split('T')[0] || '',
            POContractReference: r.POContractReference || '', Cost: r.Cost || ''
        });
    };

    const handleClear = () => { setFormData(initialFormData); setSelectedId(null); setIsEditing(false); };

    const sectionStyle = { padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem' };

    return (
        <>
            <form onSubmit={handleSubmit}>
                {/* Core Info */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>1. Core Information</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>Software Name <span style={{ color: '#EF4444' }}>*</span></label><input type="text" name="SoftwareName" value={formData.SoftwareName} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Vendor/Publisher</label><input type="text" name="VendorPublisher" value={formData.VendorPublisher} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Category</label>
                            <select name="Category" value={formData.Category} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option><option value="OS">OS</option><option value="Application">Application</option>
                                <option value="Database">Database</option><option value="Security">Security</option><option value="SaaS">SaaS</option>
                            </select>
                        </div>
                        <div><label style={labelStyle}>Version</label><input type="text" name="Version" value={formData.Version} onChange={handleChange} style={inputStyle} /></div>
                    </div>
                </div>

                {/* Licensing */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#166534', fontWeight: '600' }}>2. Licensing</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>License Type</label>
                            <select name="LicenseType" value={formData.LicenseType} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option><option value="Per User">Per User</option><option value="Per Device">Per Device</option>
                                <option value="Subscription">Subscription</option><option value="Perpetual">Perpetual</option><option value="Free">Free</option>
                            </select>
                        </div>
                        <div><label style={labelStyle}>Licenses Purchased</label><NumberInput name="LicenseCountPurchased" value={formData.LicenseCountPurchased} onChange={handleChange} min={0} placeholder="0" /></div>
                        <div><label style={labelStyle}>Licenses In Use</label><NumberInput name="LicenseCountInUse" value={formData.LicenseCountInUse} onChange={handleChange} min={0} placeholder="0" /></div>
                        <div><label style={labelStyle}>License Status</label>
                            <select name="LicenseStatus" value={formData.LicenseStatus} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option><option value="Active">Active</option><option value="Expired">Expired</option><option value="Pending Renewal">Pending Renewal</option>
                            </select>
                        </div>
                        <div><label style={labelStyle}>Expiry Date</label><DatePicker name="LicenseExpiryDate" value={formData.LicenseExpiryDate} onChange={handleChange} placeholder="Select date..." /></div>
                    </div>
                </div>

                {/* Deployment & Status */}
                <div style={{ ...sectionStyle, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#C2410C', fontWeight: '600' }}>3. Deployment & Status</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>Installed On Asset</label>
                            <select name="InstalledOnAssetId" value={formData.InstalledOnAssetId} onChange={handleChange} style={inputStyle}>
                                <option value="">Select Asset</option>
                                {assets.map(a => <option key={a.AssetId} value={a.AssetId}>{a.AssetTagNumber} - {a.AssetName}</option>)}
                            </select>
                        </div>
                        <div><label style={labelStyle}>Department</label><input type="text" name="Department" value={formData.Department} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Software Status</label>
                            <select name="SoftwareStatus" value={formData.SoftwareStatus} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
                            </select>
                        </div>
                        <div><label style={labelStyle}>Owner</label><input type="text" name="Owner" value={formData.Owner} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Notes</label><input type="text" name="Notes" value={formData.Notes} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Update Date</label><DatePicker name="UpdateDate" value={formData.UpdateDate} onChange={handleChange} placeholder="Select date..." /></div>
                        <div><label style={labelStyle}>PO/Contract Ref</label><input type="text" name="POContractReference" value={formData.POContractReference} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Cost</label><input type="text" name="Cost" value={formData.Cost} onChange={handleChange} style={inputStyle} /></div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="submit" className="btn btn-primary">{isEditing ? 'UPDATE' : 'ADD'}</button>
                    {selectedId && <button type="button" onClick={() => setShowDeleteDialog(true)} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>DELETE</button>}
                    <button type="button" onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontWeight: '500' }}>Search:</label>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field" style={{ minWidth: '200px' }} />
                    </div>
                </div>
            </form>

            {/* Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
                <h3 className="section-title gray">Software Records ({records.length})</h3>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                            <tr>{['Sr. No.', 'Name', 'Vendor', 'Category', 'License Status', 'Expiry', 'Status'].map(h => <th key={h} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records</td></tr> :
                                records.map((r, index) => (
                                    <tr key={r.SoftwareId} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: selectedId === r.SoftwareId ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{index + 1}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.SoftwareName}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.VendorPublisher}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.Category}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.LicenseStatus}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.LicenseExpiryDate?.split('T')[0]}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.SoftwareStatus}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Software" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default SoftwareListTab;
