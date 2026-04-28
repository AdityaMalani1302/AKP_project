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
import SearchableSelect from '../common/SearchableSelect';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';

const SoftwareListTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

    const initialFormData = {
        SoftwareName: '', VendorPublisher: '', Category: '', Version: '',
        LicenseType: '', LicenseCountPurchased: '', LicenseCountInUse: '', LicenseStatus: '', LicenseExpiryDate: '',
        InstalledOnAssetId: '', Department: '', SoftwareStatus: '', Owner: '', Notes: '', UpdateDate: '',
        POContractReference: '', Cost: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const validationRules = {
        SoftwareName: { required: true, requiredMessage: 'Software Name is required' }
    };

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, clearAllErrors } = useFormValidation(validationRules);

    // Fetch assets for dropdown
    const { data: assets = [] } = useQuery({
        queryKey: ['itAssets'],
        queryFn: async () => (await api.get('/it-management/assets')).data
    });

    // Fetch software
    const { data: records = [] } = useQuery({
        queryKey: ['itSoftware', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm ? `/it-management/software?search=${encodeURIComponent(debouncedSearchTerm)}` : '/it-management/software';
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

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: records, idField: 'SoftwareId' });

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

    const optimistic = withOptimisticUpdate(queryClient, ['itSoftware'], { idField: 'SoftwareId' });

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/it-management/software', data),
        successMessage: 'Software added!',
        onSuccess: () => {
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/it-management/software/${id}`, data),
        successMessage: 'Updated!',
        onSuccess: () => {
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/it-management/software/${id}`),
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
        
        const requiredFields = ['SoftwareName'];
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

    const handleClear = () => { setFormData(initialFormData); setSelectedId(null); setIsEditing(false); clearAllErrors(); };

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/it-management/software/${r.SoftwareId}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['itSoftware']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['itSoftware']);
        }
        setShowBulkDeleteDialog(false);
    };

    const sectionStyle = { padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem' };

    return (
        <>
            <form onSubmit={handleSubmit}>
                {/* Core Info */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>1. Core Information</h3>
                    <div className="form-grid">
                        <div><label style={labelStyle}>Software Name <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="SoftwareName" value={formData.SoftwareName} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.SoftwareName && _errors.SoftwareName ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                aria-invalid={_touched.SoftwareName && _errors.SoftwareName ? 'true' : undefined}
                                aria-describedby={_touched.SoftwareName && _errors.SoftwareName ? 'SoftwareName-error' : undefined} />
                            <FieldError error={_touched.SoftwareName && _errors.SoftwareName ? _errors.SoftwareName : null} id="SoftwareName-error" /></div>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title gray">Software Records ({totalRecords})</h3>
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
                                <SortableHeader columnKey="SoftwareName" label="Name" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="VendorPublisher" label="Vendor" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="Category" label="Category" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="LicenseStatus" label="License Status" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="LicenseExpiryDate" label="Expiry" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                                <SortableHeader columnKey="SoftwareStatus" label="Status" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {displayData.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records</td></tr> :
                                displayData.map((r, index) => (
                                    <tr key={r.SoftwareId} onClick={() => handleRowClick(r)} style={{ cursor: 'pointer', backgroundColor: isSelected(r.SoftwareId) ? '#FEF3C7' : selectedId === r.SoftwareId ? '#DBEAFE' : 'white' }}>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected(r.SoftwareId)}
                                                onChange={() => toggleRow(r.SoftwareId)}
                                                aria-label={`Select row ${index + 1}`}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{(currentPage - 1) * pageSize + index + 1}</td>
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

            <AlertDialog isOpen={showDeleteDialog} title="Delete Software" message="Are you sure?" onConfirm={() => deleteMutation.mutate(selectedId)} onCancel={() => setShowDeleteDialog(false)} confirmText="Delete" isDanger={true} />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
            <style>{`.form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1.5rem; }`}</style>
        </>
    );
};

export default SoftwareListTab;
