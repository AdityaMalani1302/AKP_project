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
import NumberInput from '../common/NumberInput';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';
import CharacterCounter from '../common/CharacterCounter';

const IssuedMaterialTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

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

    const validationRules = {
        MaterialName: { required: true, requiredMessage: 'Material Name is required' },
        IssuedTo: { required: true, requiredMessage: 'Issued To is required' }
    };

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, clearAllErrors } = useFormValidation(validationRules);

    // Fetch issued materials
    const { data: records = [] } = useQuery({
        queryKey: ['itIssuedMaterial', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm 
                ? `/it-management/issued-material?search=${encodeURIComponent(debouncedSearchTerm)}` 
                : '/it-management/issued-material';
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

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: records, idField: 'IssuedMaterialId' });

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

const optimistic = withOptimisticUpdate(queryClient, ['itIssuedMaterial'], { idField: 'IssuedMaterialId' });

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/it-management/issued-material', data),
        successMessage: 'Material issued record added!',
        onSuccess: () => {
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/it-management/issued-material/${id}`, data),
        successMessage: 'Record updated!',
        onSuccess: () => {
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/it-management/issued-material/${id}`),
        successMessage: 'Record deleted!',
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
        
        const requiredFields = ['MaterialName', 'IssuedTo'];
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
        clearAllErrors();
    };

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/it-management/issued-material/${r.IssuedMaterialId}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['itIssuedMaterial']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['itIssuedMaterial']);
        }
        setShowBulkDeleteDialog(false);
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
                            <label style={labelStyle}>Material Name <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="MaterialName" value={formData.MaterialName} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.MaterialName && _errors.MaterialName ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                aria-invalid={_touched.MaterialName && _errors.MaterialName ? 'true' : undefined}
                                aria-describedby={_touched.MaterialName && _errors.MaterialName ? 'MaterialName-error' : undefined} />
                            <FieldError error={_touched.MaterialName && _errors.MaterialName ? _errors.MaterialName : null} id="MaterialName-error" />
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
                            <label style={labelStyle}>Issued To <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="IssuedTo" value={formData.IssuedTo} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.IssuedTo && _errors.IssuedTo ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                aria-invalid={_touched.IssuedTo && _errors.IssuedTo ? 'true' : undefined}
                                aria-describedby={_touched.IssuedTo && _errors.IssuedTo ? 'IssuedTo-error' : undefined} />
                            <FieldError error={_touched.IssuedTo && _errors.IssuedTo ? _errors.IssuedTo : null} id="IssuedTo-error" />
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
                            <input type="text" name="Remarks" value={formData.Remarks} onChange={handleChange} style={inputStyle} maxLength={500} />
                            <CharacterCounter value={formData.Remarks} maxLength={500} showAt={400} />
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title gray">Issued Material Records ({totalRecords})</h3>
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
                                <SortableHeader columnKey="MaterialName" label="Material Name" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="MaterialType" label="Type" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="Quantity" label="Qty" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="IssuedTo" label="Issued To" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="IssueDate" label="Issue Date" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="Status" label="Status" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records</td>
                                </tr>
                            ) : (
                                displayData.map((r, index) => (
                                    <tr 
                                        key={r.IssuedMaterialId} 
                                        onClick={() => handleRowClick(r)} 
                                        style={{ cursor: 'pointer', backgroundColor: isSelected(r.IssuedMaterialId) ? '#FEF3C7' : selectedId === r.IssuedMaterialId ? '#DBEAFE' : 'white' }}
                                    >
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected(r.IssuedMaterialId)}
                                                onChange={() => toggleRow(r.IssuedMaterialId)}
                                                aria-label={`Select row ${index + 1}`}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{(currentPage - 1) * pageSize + index + 1}</td>
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

            <AlertDialog 
                isOpen={showDeleteDialog} 
                title="Delete Issued Material Record" 
                message="Are you sure you want to delete this record?" 
                onConfirm={() => deleteMutation.mutate(selectedId)} 
                onCancel={() => setShowDeleteDialog(false)} 
                confirmText="Delete" 
                isDanger={true} 
            />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default IssuedMaterialTab;
