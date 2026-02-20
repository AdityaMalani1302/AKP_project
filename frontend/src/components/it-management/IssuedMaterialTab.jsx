import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle } from './styles';
import { useDebounce } from '../../utils/useDebounce';
import AlertDialog from '../common/AlertDialog';
import DatePicker from '../common/DatePicker';
import NumberInput from '../common/NumberInput';

const IssuedMaterialTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const initialFormData = {
        MaterialName: '',
        MaterialType: '',
        Quantity: '',
        Unit: '',
        IssuedTo: '',
        IssuedBy: '',
        IssueDate: '',
        Department: '',
        Purpose: '',
        ReturnDate: '',
        Status: '',
        Remarks: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch issued materials
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['itIssuedMaterial', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm 
                ? `/it-management/issued-material?search=${encodeURIComponent(debouncedSearchTerm)}` 
                : '/it-management/issued-material';
            return (await api.get(url)).data;
        }
    });

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/it-management/issued-material', data),
        onSuccess: () => { 
            toast.success('Material issued record added!'); 
            queryClient.invalidateQueries(['itIssuedMaterial']); 
            handleClear(); 
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed to add record')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/it-management/issued-material/${id}`, data),
        onSuccess: () => { 
            toast.success('Record updated!'); 
            queryClient.invalidateQueries(['itIssuedMaterial']); 
            handleClear(); 
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed to update')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/it-management/issued-material/${id}`),
        onSuccess: () => { 
            toast.success('Record deleted!'); 
            queryClient.invalidateQueries(['itIssuedMaterial']); 
            handleClear(); 
            setShowDeleteDialog(false); 
        },
        onError: (error) => { 
            toast.error(error.response?.data?.error || 'Failed to delete'); 
            setShowDeleteDialog(false); 
        }
    });

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.MaterialName) { 
            toast.error('Material Name is required'); 
            return; 
        }
        if (!formData.IssuedTo) { 
            toast.error('Issued To is required'); 
            return; 
        }
        isEditing && selectedId 
            ? updateMutation.mutate({ id: selectedId, data: formData }) 
            : addMutation.mutate(formData);
    };

    const handleRowClick = (r) => {
        setSelectedId(r.IssuedMaterialId);
        setIsEditing(true);
        setFormData({
            MaterialName: r.MaterialName || '',
            MaterialType: r.MaterialType || '',
            Quantity: r.Quantity || '',
            Unit: r.Unit || '',
            IssuedTo: r.IssuedTo || '',
            IssuedBy: r.IssuedBy || '',
            IssueDate: r.IssueDate?.split('T')[0] || '',
            Department: r.Department || '',
            Purpose: r.Purpose || '',
            ReturnDate: r.ReturnDate?.split('T')[0] || '',
            Status: r.Status || '',
            Remarks: r.Remarks || ''
        });
    };

    const handleClear = () => { 
        setFormData(initialFormData); 
        setSelectedId(null); 
        setIsEditing(false); 
    };

    const sectionStyle = { padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem' };

    return (
        <>
            <form onSubmit={handleSubmit}>
                {/* Material Details */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                        1. Material Details
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Material Name <span style={{ color: '#EF4444' }}>*</span></label>
                            <input type="text" name="MaterialName" value={formData.MaterialName} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Material Type</label>
                            <select name="MaterialType" value={formData.MaterialType} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option>
                                <option value="Hardware">Hardware</option>
                                <option value="Peripheral">Peripheral</option>
                                <option value="Accessory">Accessory</option>
                                <option value="Cable">Cable</option>
                                <option value="Component">Component</option>
                                <option value="Consumable">Consumable</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Quantity</label>
                            <NumberInput name="Quantity" value={formData.Quantity} onChange={handleChange} min={0} placeholder="0" />
                        </div>
                        <div>
                            <label style={labelStyle}>Unit</label>
                            <select name="Unit" value={formData.Unit} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option>
                                <option value="Nos">Nos</option>
                                <option value="Pcs">Pcs</option>
                                <option value="Set">Set</option>
                                <option value="Meter">Meter</option>
                                <option value="Box">Box</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Issue Details */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#166534', fontWeight: '600' }}>
                        2. Issue Details
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Issued To <span style={{ color: '#EF4444' }}>*</span></label>
                            <input type="text" name="IssuedTo" value={formData.IssuedTo} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Issued By</label>
                            <input type="text" name="IssuedBy" value={formData.IssuedBy} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Issue Date</label>
                            <DatePicker name="IssueDate" value={formData.IssueDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Department</label>
                            <input type="text" name="Department" value={formData.Department} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Purpose</label>
                            <input type="text" name="Purpose" value={formData.Purpose} onChange={handleChange} style={inputStyle} />
                        </div>
                    </div>
                </div>

                {/* Return & Status */}
                <div style={{ ...sectionStyle, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#C2410C', fontWeight: '600' }}>
                        3. Return & Status
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Return Date</label>
                            <DatePicker name="ReturnDate" value={formData.ReturnDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Status</label>
                            <select name="Status" value={formData.Status} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option>
                                <option value="Issued">Issued</option>
                                <option value="Returned">Returned</option>
                                <option value="Pending Return">Pending Return</option>
                                <option value="Lost">Lost</option>
                                <option value="Damaged">Damaged</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={labelStyle}>Remarks</label>
                            <input type="text" name="Remarks" value={formData.Remarks} onChange={handleChange} style={inputStyle} />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="submit" className="btn btn-primary">{isEditing ? 'UPDATE' : 'ADD'}</button>
                    {selectedId && (
                        <button type="button" onClick={() => setShowDeleteDialog(true)} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>
                            DELETE
                        </button>
                    )}
                    <button type="button" onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontWeight: '500' }}>Search:</label>
                        <input 
                            type="text" 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="input-field" 
                            style={{ minWidth: '200px' }} 
                        />
                    </div>
                </div>
            </form>

            {/* Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
                <h3 className="section-title gray">Issued Material Records ({records.length})</h3>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                            <tr>
                                {['Sr. No.', 'Material Name', 'Type', 'Qty', 'Issued To', 'Issue Date', 'Status'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records</td>
                                </tr>
                            ) : (
                                records.map((r, index) => (
                                    <tr 
                                        key={r.IssuedMaterialId} 
                                        onClick={() => handleRowClick(r)} 
                                        style={{ cursor: 'pointer', backgroundColor: selectedId === r.IssuedMaterialId ? '#DBEAFE' : 'white' }}
                                    >
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{index + 1}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.MaterialName}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.MaterialType}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.Quantity} {r.Unit}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.IssuedTo}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.IssueDate?.split('T')[0]}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '500',
                                                backgroundColor: r.Status === 'Returned' ? '#D1FAE5' : 
                                                               r.Status === 'Issued' ? '#DBEAFE' : 
                                                               r.Status === 'Lost' || r.Status === 'Damaged' ? '#FEE2E2' : '#FEF3C7',
                                                color: r.Status === 'Returned' ? '#065F46' : 
                                                       r.Status === 'Issued' ? '#1E40AF' : 
                                                       r.Status === 'Lost' || r.Status === 'Damaged' ? '#991B1B' : '#92400E'
                                            }}>
                                                {r.Status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AlertDialog 
                isOpen={showDeleteDialog} 
                title="Delete Issued Material Record" 
                message="Are you sure you want to delete this record?" 
                onConfirm={() => deleteMutation.mutate(selectedId)} 
                onCancel={() => setShowDeleteDialog(false)} 
                confirmText="Delete" 
                isDanger={true} 
            />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default IssuedMaterialTab;
