import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle } from './styles';
import { useDebounce } from '../../utils/useDebounce';
import usePagination from '../../utils/usePagination';
import useSortableData from '../../utils/useSortableData';
import useFormValidation from '../../utils/useFormValidation';
import withOptimisticUpdate from '../../utils/optimisticUpdates';
import useRowSelection from '../../utils/useRowSelection';
import AlertDialog from '../common/AlertDialog';
import FieldError from '../common/FieldError';
import DatePicker from '../common/DatePicker';
import SearchableSelect from '../common/SearchableSelect';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';

const ITResolvedTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

    const getCurrentDate = () => new Date().toISOString().slice(0, 10);

    const initialFormData = {
        TicketId: '', Date: getCurrentDate(), ShortIssueTitle: '', Description: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const validationRules = {
        ShortIssueTitle: { required: true, requiredMessage: 'Issue Title is required' }
    };

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, clearAllErrors } = useFormValidation(validationRules);

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

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: records, idField: 'ResolvedId' });

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
    }, [debouncedSearchTerm, resetToFirstPage]);

    const optimistic = withOptimisticUpdate(queryClient, ['itResolved'], { idField: 'ResolvedId' });

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/it-management/resolved', data),
        successMessage: 'Resolution added!',
        onSuccess: (response) => {
            queryClient.invalidateQueries(['itComplaints']);
            queryClient.invalidateQueries(['itComplaintsOpen']);
            if (response?.data?.resolvedNumber) {
                toast.info(`ID: ${response.data.resolvedNumber}`);
            }
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/it-management/resolved/${id}`, data),
        successMessage: 'Updated!',
        onSuccess: () => {
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/it-management/resolved/${id}`),
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
        
        const requiredFields = ['ShortIssueTitle'];
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
        setSelectedId(r.ResolvedId);
        setIsEditing(true);
        setFormData({
            TicketId: r.TicketId || '', Date: r.Date?.split('T')[0] || '',
            ShortIssueTitle: r.ShortIssueTitle || '', Description: r.Description || ''
        });
    };

    const handleClear = () => { setFormData({ ...initialFormData, Date: getCurrentDate() }); setSelectedId(null); setIsEditing(false); clearAllErrors(); };

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/it-management/resolved/${r.ResolvedId}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['itResolved']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['itResolved']);
        }
        setShowBulkDeleteDialog(false);
    };

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
                        <div><label style={labelStyle}>Issue Title <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="ShortIssueTitle" value={formData.ShortIssueTitle} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.ShortIssueTitle && _errors.ShortIssueTitle ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                aria-invalid={_touched.ShortIssueTitle && _errors.ShortIssueTitle ? 'true' : undefined}
                                aria-describedby={_touched.ShortIssueTitle && _errors.ShortIssueTitle ? 'ShortIssueTitle-error' : undefined} />
                            <FieldError error={_touched.ShortIssueTitle && _errors.ShortIssueTitle ? _errors.ShortIssueTitle : null} id="ShortIssueTitle-error" /></div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title gray">Resolved Issues ({totalRecords})</h3>
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
                                <SortableHeader columnKey="ResolvedNumber" label="Resolution #" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="TicketNumber" label="Linked Ticket" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="ShortIssueTitle" label="Issue" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="Date" label="Date" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="Description" label="Description" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No resolutions</td></tr> :
                                displayData.map((r, index) => (
                                    <tr key={r.ResolvedId} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: isSelected(r.ResolvedId) ? '#FEF3C7' : selectedId === r.ResolvedId ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected(r.ResolvedId)}
                                                onChange={() => toggleRow(r.ResolvedId)}
                                                aria-label={`Select row ${index + 1}`}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{(currentPage - 1) * pageSize + index + 1}</td>
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

            <AlertDialog isOpen={showDeleteDialog} title="Delete Resolution" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default ITResolvedTab;
