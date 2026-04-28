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

const SystemUserDetailsTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

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

    const validationRules = {
        AssetId: { required: true, requiredMessage: 'Asset is required' },
        AssignedUser: { required: true, requiredMessage: 'Assigned User is required' }
    };

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, clearAllErrors } = useFormValidation(validationRules);

    // Fetch assets for dropdown
    const { data: assets = [] } = useQuery({
        queryKey: ['itAssets'],
        queryFn: async () => {
            const response = await api.get('/it-management/assets');
            return response.data;
        }
    });

    // Fetch system user details
    const { data: records = [] } = useQuery({
        queryKey: ['itSystemUsers', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm
                ? `/it-management/system-users?search=${encodeURIComponent(debouncedSearchTerm)}`
                : '/it-management/system-users';
            const response = await api.get(url);
            return response.data;
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

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: records, idField: 'Id' });

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

    const optimistic = withOptimisticUpdate(queryClient, ['itSystemUsers'], { idField: 'Id' });

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/it-management/system-users', data),
        successMessage: 'System user detail added successfully!',
        onSuccess: () => {
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/it-management/system-users/${id}`, data),
        successMessage: 'Record updated successfully!',
        onSuccess: () => {
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/it-management/system-users/${id}`),
        successMessage: 'Record deleted successfully!',
        onSuccess: () => {
            handleClear();
            setShowDeleteDialog(false);
        }
    }));

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (_touched[name]) {
            const rule = validationRules[name];
            if (rule?.required && (!value || value.trim() === '')) {
                setErrors(prev => ({ ...prev, [name]: rule.requiredMessage }));
            } else {
                setErrors(prev => ({ ...prev, [name]: null }));
            }
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const requiredFields = ['AssetId', 'AssignedUser'];
        const touchedFields = {};
        requiredFields.forEach(field => { touchedFields[field] = true; });
        setTouched(prev => ({ ...prev, ...touchedFields }));

        let hasErrors = false;
        requiredFields.forEach(field => {
            const value = formData[field];
            const rule = validationRules[field];
            if (rule.required && (!value || value.trim() === '')) {
                setErrors(prev => ({ ...prev, [field]: rule.requiredMessage }));
                hasErrors = true;
            }
        });

        if (hasErrors) {
            toast.error('Please fill in all required fields');
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
        clearAllErrors();
    };

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/it-management/system-users/${r.Id}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['itSystemUsers']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['itSystemUsers']);
        }
        setShowBulkDeleteDialog(false);
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
                            <label style={labelStyle}>Asset <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <SearchableSelect
                                options={assets.map(a => ({ value: a.AssetId.toString(), label: `${a.AssetTagNumber} - ${a.AssetName}` }))}
                                value={formData.AssetId}
                                onChange={(e) => handleChange(e)}
                                name="AssetId"
                                placeholder="Search asset..."
                                isClearable={true}
                            />
                            <FieldError error={_touched.AssetId && _errors.AssetId ? _errors.AssetId : null} id="AssetId-error" />
                        </div>
                        <div>
                            <label style={labelStyle}>Assigned User <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="AssignedUser" value={formData.AssignedUser} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.AssignedUser && _errors.AssignedUser ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                placeholder="User Name"
                                aria-invalid={_touched.AssignedUser && _errors.AssignedUser ? 'true' : undefined}
                                aria-describedby={_touched.AssignedUser && _errors.AssignedUser ? 'AssignedUser-error' : undefined} />
                            <FieldError error={_touched.AssignedUser && _errors.AssignedUser ? _errors.AssignedUser : null} id="AssignedUser-error" />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title gray">Records ({totalRecords})</h3>
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
                                <SortableHeader columnKey="AssetTagNumber" label="Asset Tag" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="AssignedUser" label="Assigned User" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="SystemName" label="System" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="IPAddress" label="IP" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="AssetOwner" label="Owner" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="IssueDate" label="Issue Date" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.length === 0 ? (
                                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records</td></tr>
                            ) : (
                                displayData.map((r, index) => (
                                    <tr key={r.Id} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: isSelected(r.Id) ? '#FEF3C7' : selectedId === r.Id ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected(r.Id)}
                                                onChange={() => toggleRow(r.Id)}
                                                aria-label={`Select row ${index + 1}`}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{(currentPage - 1) * pageSize + index + 1}</td>
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

            <AlertDialog isOpen={showDeleteDialog} title="Delete Record" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />

            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default SystemUserDetailsTab;
