import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle } from './styles';
import { useDebounce } from '../../utils/useDebounce';
import { saveFormHistory } from '../../utils/useInputHistory';
import usePagination from '../../utils/usePagination';
import useSortableData from '../../utils/useSortableData';
import useFormValidation from '../../utils/useFormValidation';
import withOptimisticUpdate from '../../utils/optimisticUpdates';
import useRowSelection from '../../utils/useRowSelection';
import AlertDialog from '../common/AlertDialog';
import FieldError from '../common/FieldError';
import AutocompleteInput from '../common/AutocompleteInput';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';
import CharacterCounter from '../common/CharacterCounter';

const FORM_PREFIX = 'itComplaints';

const ComplaintTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [statusFilter, setStatusFilter] = useState('');
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

    const initialFormData = {
        EmployeeName: '', Department: '', ContactNumber: '', DeviceName: '',
        IssueType: '', ShortIssueTitle: '', ProblemDescription: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const validationRules = {
        EmployeeName: { required: true, requiredMessage: 'Employee Name is required' },
        ShortIssueTitle: { required: true, requiredMessage: 'Issue Title is required' }
    };

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, clearAllErrors } = useFormValidation(validationRules);

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

    const {
        currentPage,
        totalPages,
        pageSize,
        totalRecords,
        goToPage,
        changePageSize,
        resetToFirstPage
    } = usePagination({ data: records, pageSize: 50, autoPaginate: true });

    const { sortKey, sortOrder, handleSort } = useSortableData(records);

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: records, idField: 'TicketId' });

    const displayData = useMemo(() => {
        if (!sortKey || !records.length) {
            const start = (currentPage - 1) * pageSize;
            return records.slice(start, start + pageSize);
        }
        const sorted = [...records].sort((a, b) => {
            let aVal = a[sortKey];
            let bVal = b[sortKey];
            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        const start = (currentPage - 1) * pageSize;
        return sorted.slice(start, start + pageSize);
    }, [records, sortKey, sortOrder, currentPage, pageSize]);

    useEffect(() => {
        resetToFirstPage();
    }, [debouncedSearchTerm, statusFilter, resetToFirstPage]);

    const optimistic = withOptimisticUpdate(queryClient, ['itComplaints'], { idField: 'TicketId' });

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/it-management/complaints', data),
        successMessage: 'Complaint submitted!',
        onSuccess: (response, variables) => {
            saveFormHistory(FORM_PREFIX, variables);
            if (response?.data?.ticketNumber) {
                toast.info(`Ticket: ${response.data.ticketNumber}`);
            }
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/it-management/complaints/${id}`, data),
        successMessage: 'Updated!',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables.data);
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/it-management/complaints/${id}`),
        successMessage: 'Deleted!',
        onSuccess: () => {
            handleClear();
            setShowDeleteDialog(false);
        }
    }));

    const validateField = (name, value) => {
        const rule = validationRules[name];
        if (!rule) return null;
        if (rule.required && (!value || value.trim() === '')) {
            setErrors(prev => ({ ...prev, [name]: rule.requiredMessage }));
            return rule.requiredMessage;
        }
        setErrors(prev => ({ ...prev, [name]: null }));
        return null;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (_touched[name]) {
            validateField(name, value);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const requiredFields = ['EmployeeName', 'ShortIssueTitle'];
        const touchedFields = {};
        requiredFields.forEach(field => { touchedFields[field] = true; });
        setTouched(prev => ({ ...prev, ...touchedFields }));

        let hasErrors = false;
        requiredFields.forEach(field => {
            const value = formData[field];
            const error = validateField(field, value);
            if (error) hasErrors = true;
        });

        if (hasErrors) {
            toast.error('Please fill in all required fields');
            return;
        }
        
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

    const handleClear = () => { setFormData(initialFormData); setSelectedId(null); setIsEditing(false); clearAllErrors(); };

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/it-management/complaints/${r.TicketId}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['itComplaints']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['itComplaints']);
        }
        setShowBulkDeleteDialog(false);
    };

    const sectionStyle = { padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem' };

    return (
        <>
            <form onSubmit={handleSubmit}>
                {/* User Details */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>1. User Details</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>Employee Name <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="EmployeeName" name="EmployeeName" value={formData.EmployeeName} onChange={handleChange}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.EmployeeName && _errors.EmployeeName ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                aria-invalid={_touched.EmployeeName && _errors.EmployeeName ? 'true' : undefined}
                                aria-describedby={_touched.EmployeeName && _errors.EmployeeName ? 'EmployeeName-error' : undefined} />
                            <FieldError error={_touched.EmployeeName && _errors.EmployeeName ? _errors.EmployeeName : null} id="EmployeeName-error" /></div>
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
                            <select name="IssueType" value={formData.IssueType} onChange={handleChange} onBlur={_handleBlur} style={inputStyle}>
                                <option value="">Select</option><option value="Hardware">Hardware</option><option value="Software">Software</option>
                                <option value="Network">Network</option><option value="Email">Email</option><option value="Access">Access</option><option value="Other">Other</option>
                            </select>
                        </div>
                        <div><label style={labelStyle}>Issue Title <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="ShortIssueTitle" value={formData.ShortIssueTitle} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.ShortIssueTitle && _errors.ShortIssueTitle ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                aria-invalid={_touched.ShortIssueTitle && _errors.ShortIssueTitle ? 'true' : undefined}
                                aria-describedby={_touched.ShortIssueTitle && _errors.ShortIssueTitle ? 'ShortIssueTitle-error' : undefined} />
                            <FieldError error={_touched.ShortIssueTitle && _errors.ShortIssueTitle ? _errors.ShortIssueTitle : null} id="ShortIssueTitle-error" /></div>
                        <div><label style={labelStyle}>Problem Description</label><input type="text" name="ProblemDescription" value={formData.ProblemDescription} onChange={handleChange} style={inputStyle} maxLength={500} /><CharacterCounter value={formData.ProblemDescription} maxLength={500} showAt={400} /></div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title gray">Complaints ({totalRecords})</h3>
                    {selectedCount > 0 && (
                        <button onClick={() => setShowBulkDeleteDialog(true)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Delete Selected ({selectedCount})
                        </button>
                    )}
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid #E5E7EB', borderRadius: '6px 6px 0 0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB' }}>
                            <tr>
                                <th style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', width: '40px', textAlign: 'center' }} scope="col">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                                        onChange={() => toggleAll(displayData)}
                                        aria-label="Select all rows"
                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                    />
                                </th>
                                <th style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} scope="col">Sr. No.</th>
                                <SortableHeader columnKey="TicketNumber" label="Ticket #" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="EmployeeName" label="Employee" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="ShortIssueTitle" label="Issue" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="IssueType" label="Type" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="Status" label="Status" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="DateTimeSubmitted" label="Date" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No complaints</td></tr> :
                                displayData.map((r, index) => (
                                    <tr key={r.TicketId} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: isSelected(r.TicketId) ? '#FEF3C7' : selectedId === r.TicketId ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected(r.TicketId)}
                                                onChange={() => toggleRow(r.TicketId)}
                                                aria-label={`Select row ${index + 1}`}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{(currentPage - 1) * pageSize + index + 1}</td>
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
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    pageSize={pageSize}
                    onPageChange={goToPage}
                    onPageSizeChange={changePageSize}
                    showPageSizeSelector
                />
            </div>

            <AlertDialog isOpen={showDeleteDialog} title="Delete Complaint" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default ComplaintTab;
