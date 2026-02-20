import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle } from './styles';
import { useDebounce } from '../../utils/useDebounce';
import AlertDialog from '../common/AlertDialog';
import DatePicker from '../common/DatePicker';
import SearchableSelect from '../common/SearchableSelect';

const ITResolvedTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const getCurrentDate = () => new Date().toISOString().slice(0, 10);

    const initialFormData = {
        TicketId: '', Date: getCurrentDate(), ShortIssueTitle: '', Description: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch open complaints for linking
    const { data: openComplaints = [] } = useQuery({
        queryKey: ['itComplaintsOpen'],
        queryFn: async () => (await api.get('/it-management/complaints?status=Open')).data
    });

    // Fetch resolved records
    const { data: records = [] } = useQuery({
        queryKey: ['itResolved', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm ? `/it-management/resolved?search=${encodeURIComponent(debouncedSearchTerm)}` : '/it-management/resolved';
            return (await api.get(url)).data;
        }
    });

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/it-management/resolved', data),
        onSuccess: (response) => {
            toast.success(`Resolution added! ID: ${response.data.resolvedNumber}`);
            queryClient.invalidateQueries(['itResolved']);
            queryClient.invalidateQueries(['itComplaints']);
            queryClient.invalidateQueries(['itComplaintsOpen']);
            handleClear();
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/it-management/resolved/${id}`, data),
        onSuccess: () => { toast.success('Updated!'); queryClient.invalidateQueries(['itResolved']); handleClear(); },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/it-management/resolved/${id}`),
        onSuccess: () => { toast.success('Deleted!'); queryClient.invalidateQueries(['itResolved']); handleClear(); setShowDeleteDialog(false); },
        onError: (error) => { toast.error(error.response?.data?.error || 'Failed'); setShowDeleteDialog(false); }
    });

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.ShortIssueTitle) { toast.error('Issue Title required'); return; }
        isEditing && selectedId ? updateMutation.mutate({ id: selectedId, data: formData }) : addMutation.mutate(formData);
    };

    const handleRowClick = (r) => {
        setSelectedId(r.ResolvedId);
        setIsEditing(true);
        setFormData({
            TicketId: r.TicketId || '', Date: r.Date?.split('T')[0] || '',
            ShortIssueTitle: r.ShortIssueTitle || '', Description: r.Description || ''
        });
    };

    const handleClear = () => { setFormData({ ...initialFormData, Date: getCurrentDate() }); setSelectedId(null); setIsEditing(false); };

    // When selecting a complaint, auto-fill the issue title
    const handleComplaintSelect = (e) => {
        const ticketId = e.target.value;
        setFormData(prev => ({ ...prev, TicketId: ticketId }));
        if (ticketId) {
            const complaint = openComplaints.find(c => c.TicketId === parseInt(ticketId));
            if (complaint) {
                setFormData(prev => ({ ...prev, ShortIssueTitle: complaint.ShortIssueTitle }));
            }
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit}>
                <div style={{ padding: '1.25rem', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#166534', fontWeight: '600' }}>IT Resolved</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>Link to Complaint (Optional)</label>
                            <SearchableSelect
                                options={[{ value: '', label: 'No Link / Standalone' }, ...openComplaints.map(c => ({ value: c.TicketId.toString(), label: `${c.TicketNumber} - ${c.ShortIssueTitle}` }))]}
                                value={formData.TicketId}
                                onChange={(e) => handleComplaintSelect(e)}
                                name="TicketId"
                                placeholder="Search complaint..."
                                isClearable={true}
                            />
                        </div>
                        <div><label style={labelStyle}>Date</label><DatePicker name="Date" value={formData.Date} onChange={handleChange} placeholder="Select date..." /></div>
                        <div><label style={labelStyle}>Issue Title <span style={{ color: '#EF4444' }}>*</span></label><input type="text" name="ShortIssueTitle" value={formData.ShortIssueTitle} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Resolution Description</label><input type="text" name="Description" value={formData.Description} onChange={handleChange} style={inputStyle} placeholder="How was issue resolved" /></div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button type="submit" className="btn btn-primary">{isEditing ? 'UPDATE' : 'ADD RESOLUTION'}</button>
                        {selectedId && <button type="button" onClick={() => setShowDeleteDialog(true)} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>DELETE</button>}
                        <button type="button" onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <label style={{ fontWeight: '500' }}>Search:</label>
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field" style={{ minWidth: '200px' }} />
                        </div>
                    </div>
                </div>
            </form>

            {/* Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
                <h3 className="section-title gray">Resolved Issues ({records.length})</h3>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                            <tr>{['Sr. No.', 'Resolution #', 'Linked Ticket', 'Issue', 'Date', 'Description'].map(h => <th key={h} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No resolutions</td></tr> :
                                records.map((r, index) => (
                                    <tr key={r.ResolvedId} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: selectedId === r.ResolvedId ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{index + 1}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', fontWeight: '500', color: '#059669' }}>{r.ResolvedNumber}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.TicketNumber || '-'}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.ShortIssueTitle}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.Date?.split('T')[0]}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.Description?.substring(0, 40)}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Resolution" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default ITResolvedTab;
