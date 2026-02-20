import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle } from './styles';
import { useDebounce } from '../../utils/useDebounce';
import { saveFormHistory } from '../../utils/useInputHistory';
import AlertDialog from '../common/AlertDialog';
import AutocompleteInput from '../common/AutocompleteInput';

const FORM_PREFIX = 'itComplaints';

const ComplaintTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');

    const initialFormData = {
        EmployeeName: '', Department: '', ContactNumber: '', DeviceName: '',
        IssueType: '', ShortIssueTitle: '', ProblemDescription: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch complaints
    const { data: records = [] } = useQuery({
        queryKey: ['itComplaints', debouncedSearchTerm, statusFilter],
        queryFn: async () => {
            let url = '/it-management/complaints';
            const params = [];
            if (debouncedSearchTerm) params.push(`search=${encodeURIComponent(debouncedSearchTerm)}`);
            if (statusFilter) params.push(`status=${encodeURIComponent(statusFilter)}`);
            if (params.length) url += '?' + params.join('&');
            return (await api.get(url)).data;
        }
    });

    const addMutation = useMutation({
        mutationFn: (data) => api.post('/it-management/complaints', data),
        onSuccess: (response, variables) => {
            toast.success(`Complaint submitted! Ticket: ${response.data.ticketNumber}`);
            saveFormHistory(FORM_PREFIX, variables);
            queryClient.invalidateQueries(['itComplaints']);
            handleClear();
        },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => api.put(`/it-management/complaints/${id}`, data),
        onSuccess: (_, variables) => { toast.success('Updated!'); saveFormHistory(FORM_PREFIX, variables.data); queryClient.invalidateQueries(['itComplaints']); handleClear(); },
        onError: (error) => toast.error(error.response?.data?.error || 'Failed')
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/it-management/complaints/${id}`),
        onSuccess: () => { toast.success('Deleted!'); queryClient.invalidateQueries(['itComplaints']); handleClear(); setShowDeleteDialog(false); },
        onError: (error) => { toast.error(error.response?.data?.error || 'Failed'); setShowDeleteDialog(false); }
    });

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.EmployeeName || !formData.ShortIssueTitle) { toast.error('Employee Name and Issue Title required'); return; }
        isEditing && selectedId ? updateMutation.mutate({ id: selectedId, data: formData }) : addMutation.mutate(formData);
    };

    const handleRowClick = (r) => {
        setSelectedId(r.TicketId);
        setIsEditing(true);
        setFormData({
            EmployeeName: r.EmployeeName || '', Department: r.Department || '', ContactNumber: r.ContactNumber || '',
            DeviceName: r.DeviceName || '', IssueType: r.IssueType || '', ShortIssueTitle: r.ShortIssueTitle || '',
            ProblemDescription: r.ProblemDescription || '', Status: r.Status || ''
        });
    };

    const handleClear = () => { setFormData(initialFormData); setSelectedId(null); setIsEditing(false); };

    const sectionStyle = { padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem' };

    return (
        <>
            <form onSubmit={handleSubmit}>
                {/* User Details */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>1. User Details</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>Employee Name <span style={{ color: '#EF4444' }}>*</span></label><AutocompleteInput formPrefix={FORM_PREFIX} fieldName="EmployeeName" name="EmployeeName" value={formData.EmployeeName} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Department</label><AutocompleteInput formPrefix={FORM_PREFIX} fieldName="Department" name="Department" value={formData.Department} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Contact</label><input type="text" name="ContactNumber" value={formData.ContactNumber} onChange={handleChange} style={inputStyle} placeholder="Phone/Email" /></div>
                        <div><label style={labelStyle}>Device Name</label><AutocompleteInput formPrefix={FORM_PREFIX} fieldName="DeviceName" name="DeviceName" value={formData.DeviceName} onChange={handleChange} style={inputStyle} /></div>
                    </div>
                </div>

                {/* Issue Details */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#166534', fontWeight: '600' }}>2. Issue Details</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>Issue Type</label>
                            <select name="IssueType" value={formData.IssueType} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option><option value="Hardware">Hardware</option><option value="Software">Software</option>
                                <option value="Network">Network</option><option value="Email">Email</option><option value="Access">Access</option><option value="Other">Other</option>
                            </select>
                        </div>
                        <div><label style={labelStyle}>Issue Title <span style={{ color: '#EF4444' }}>*</span></label><input type="text" name="ShortIssueTitle" value={formData.ShortIssueTitle} onChange={handleChange} style={inputStyle} /></div>
                        <div><label style={labelStyle}>Problem Description</label><input type="text" name="ProblemDescription" value={formData.ProblemDescription} onChange={handleChange} style={inputStyle} /></div>
                        {isEditing && (
                            <div><label style={labelStyle}>Status</label>
                                <select name="Status" value={formData.Status || ''} onChange={handleChange} style={inputStyle}>
                                    <option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="submit" className="btn btn-primary">{isEditing ? 'UPDATE' : 'SUBMIT COMPLAINT'}</button>
                    {selectedId && <button type="button" onClick={() => setShowDeleteDialog(true)} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>DELETE</button>}
                    <button type="button" onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field" style={{ width: '120px' }}>
                            <option value="">All Status</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option>
                        </select>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search..." className="input-field" style={{ minWidth: '150px' }} />
                    </div>
                </div>
            </form>

            {/* Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
                <h3 className="section-title gray">Complaints ({records.length})</h3>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                            <tr>{['Sr. No.', 'Ticket #', 'Employee', 'Issue', 'Type', 'Status', 'Date'].map(h => <th key={h} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                            {records.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No complaints</td></tr> :
                                records.map((r, index) => (
                                    <tr key={r.TicketId} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: selectedId === r.TicketId ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{index + 1}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', fontWeight: '500', color: '#2563EB' }}>{r.TicketNumber}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.EmployeeName}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.ShortIssueTitle}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.IssueType}</td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500',
                                                backgroundColor: r.Status === 'Open' ? '#FEE2E2' : r.Status === 'Resolved' ? '#D1FAE5' : r.Status === 'In Progress' ? '#FEF3C7' : '#E5E7EB',
                                                color: r.Status === 'Open' ? '#DC2626' : r.Status === 'Resolved' ? '#059669' : r.Status === 'In Progress' ? '#D97706' : '#6B7280'
                                            }}>{r.Status}</span>
                                        </td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{r.DateTimeSubmitted?.split('T')[0]}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Complaint" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default ComplaintTab;
