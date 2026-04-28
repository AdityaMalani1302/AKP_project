import React, { useState, useMemo } from 'react';
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
import DatePicker from '../common/DatePicker';
import NumberInput from '../common/NumberInput';
import CharacterCounter from '../common/CharacterCounter';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';

const FORM_PREFIX = 'itAssets';

const AssetTab = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

    const initialFormData = {
        AssetTagNumber: '', AssetName: '', AssetType: '', Category: '', Manufacturer: '',
        Model: '', SerialNumber: '', Hostname: '', Location: '',
        Processor: '', RAM: '', StorageTypeCapacity: '', OperatingSystem: '', OSVersion: '',
        MACAddress: '', FirmwareVersion: '', NetworkSegmentVLAN: '', ServerType: '',
        PurchaseDate: '', VendorName: '', PONumber: '', InvoiceNumber: '', PurchaseCost: '',
        WarrantyStartDate: '', WarrantyEndDate: '', AMCDetails: '',
        AssetStatus: '', DeploymentDate: '', RetirementDate: '', DisposalMethod: '',
        SupportVendor: '', SupportContactDetails: '', Remark: '',
        LicenseDetails: '', AdditionalRemarks: '',
        CreatedBy: '', CreatedDate: '', ApprovedBy: '', ApprovalDate: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);

    const validationRules = {
        AssetTagNumber: { required: true, requiredMessage: 'Asset Tag Number is required' },
        AssetName: { required: true, requiredMessage: 'Asset Name is required' }
    };

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, clearAllErrors } = useFormValidation(validationRules);

    // Fetch assets
    const { data: assets = [], isLoading } = useQuery({
        queryKey: ['itAssets', debouncedSearchTerm],
        queryFn: async () => {
            const url = debouncedSearchTerm
                ? `/it-management/assets?search=${encodeURIComponent(debouncedSearchTerm)}`
                : '/it-management/assets';
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
        changePageSize
    } = usePagination({ data: assets, pageSize: 50, autoPaginate: true });

    const { sortKey, sortOrder, handleSort } = useSortableData(assets);

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: assets, idField: 'AssetId' });

    const displayData = useMemo(() => {
        if (!sortKey || !assets.length) {
            const start = (currentPage - 1) * pageSize;
            return assets.slice(start, start + pageSize);
        }
        const sorted = [...assets].sort((a, b) => {
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
    }, [assets, sortKey, sortOrder, currentPage, pageSize]);

    const optimistic = withOptimisticUpdate(queryClient, ['itAssets'], { idField: 'AssetId' });

    const addMutation = useMutation(optimistic.add({
        apiFn: (data) => api.post('/it-management/assets', data),
        successMessage: 'Asset added successfully!',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables);
            handleClear();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, data }) => api.put(`/it-management/assets/${id}`, data),
        successMessage: 'Asset updated successfully!',
        onSuccess: (_, variables) => {
            saveFormHistory(FORM_PREFIX, variables.data);
            handleClear();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/it-management/assets/${id}`),
        successMessage: 'Asset deleted successfully!',
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
        
        // When PurchaseDate is changed, sync related date fields if they are empty
        if (name === 'PurchaseDate' && value) {
            setFormData(prev => ({
                ...prev,
                [name]: value,
                // Only auto-fill if the fields are currently empty
                WarrantyStartDate: prev.WarrantyStartDate || value,
                DeploymentDate: prev.DeploymentDate || value,
                CreatedDate: prev.CreatedDate || value,
                ApprovalDate: prev.ApprovalDate || value
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        
        if (_touched[name]) {
            validateField(name, value);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const requiredFields = ['AssetTagNumber', 'AssetName'];
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

        if (isEditing && selectedId) {
            updateMutation.mutate({ id: selectedId, data: formData });
        } else {
            addMutation.mutate(formData);
        }
    };

    const handleRowClick = (asset) => {
        setSelectedId(asset.AssetId);
        setIsEditing(true);
        setFormData({
            AssetTagNumber: asset.AssetTagNumber || '',
            AssetName: asset.AssetName || '',
            AssetType: asset.AssetType || '',
            Category: asset.Category || '',
            Manufacturer: asset.Manufacturer || '',
            Model: asset.Model || '',
            SerialNumber: asset.SerialNumber || '',
            Hostname: asset.Hostname || '',
            Location: asset.Location || '',
            Processor: asset.Processor || '',
            RAM: asset.RAM || '',
            StorageTypeCapacity: asset.StorageTypeCapacity || '',
            OperatingSystem: asset.OperatingSystem || '',
            OSVersion: asset.OSVersion || '',
            MACAddress: asset.MACAddress || '',
            FirmwareVersion: asset.FirmwareVersion || '',
            NetworkSegmentVLAN: asset.NetworkSegmentVLAN || '',
            ServerType: asset.ServerType || '',
            PurchaseDate: asset.PurchaseDate ? asset.PurchaseDate.split('T')[0] : '',
            VendorName: asset.VendorName || '',
            PONumber: asset.PONumber || '',
            InvoiceNumber: asset.InvoiceNumber || '',
            PurchaseCost: asset.PurchaseCost || '',
            WarrantyStartDate: asset.WarrantyStartDate ? asset.WarrantyStartDate.split('T')[0] : '',
            WarrantyEndDate: asset.WarrantyEndDate ? asset.WarrantyEndDate.split('T')[0] : '',
            AMCDetails: asset.AMCDetails || '',
            AssetStatus: asset.AssetStatus || '',
            DeploymentDate: asset.DeploymentDate ? asset.DeploymentDate.split('T')[0] : '',
            RetirementDate: asset.RetirementDate ? asset.RetirementDate.split('T')[0] : '',
            DisposalMethod: asset.DisposalMethod || '',
            SupportVendor: asset.SupportVendor || '',
            SupportContactDetails: asset.SupportContactDetails || '',
            Remark: asset.Remark || '',
            LicenseDetails: asset.LicenseDetails || '',
            AdditionalRemarks: asset.AdditionalRemarks || '',
            CreatedBy: asset.CreatedBy || '',
            CreatedDate: asset.CreatedDate ? asset.CreatedDate.split('T')[0] : '',
            ApprovedBy: asset.ApprovedBy || '',
            ApprovalDate: asset.ApprovalDate ? asset.ApprovalDate.split('T')[0] : ''
        });
    };

    const handleClear = () => {
        setFormData(initialFormData);
        setSelectedId(null);
        setIsEditing(false);
        clearAllErrors();
    };

    const handleDeleteClick = () => {
        if (!selectedId) {
            toast.error('Please select a record to delete');
            return;
        }
        setShowDeleteDialog(true);
    };

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/it-management/assets/${r.AssetId}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries(['itAssets']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries(['itAssets']);
        }
        setShowBulkDeleteDialog(false);
    };

    const sectionStyle = { padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem' };

    return (
        <>
            <form onSubmit={handleSubmit}>
                {/* Section 1: Asset Identification */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                        1. Asset Identification
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Asset Tag Number <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="AssetTagNumber" value={formData.AssetTagNumber} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.AssetTagNumber && _errors.AssetTagNumber ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                placeholder="Enter Asset Tag"
                                aria-invalid={_touched.AssetTagNumber && _errors.AssetTagNumber ? 'true' : undefined}
                                aria-describedby={_touched.AssetTagNumber && _errors.AssetTagNumber ? 'AssetTagNumber-error' : undefined} />
                            <FieldError error={_touched.AssetTagNumber && _errors.AssetTagNumber ? _errors.AssetTagNumber : null} id="AssetTagNumber-error" />
                        </div>
                        <div>
                            <label style={labelStyle}>Asset Name <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="AssetName" value={formData.AssetName} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.AssetName && _errors.AssetName ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                placeholder="Enter Asset Name"
                                aria-invalid={_touched.AssetName && _errors.AssetName ? 'true' : undefined}
                                aria-describedby={_touched.AssetName && _errors.AssetName ? 'AssetName-error' : undefined} />
                            <FieldError error={_touched.AssetName && _errors.AssetName ? _errors.AssetName : null} id="AssetName-error" />
                        </div>
                        <div>
                            <label style={labelStyle}>Asset Type</label>
                            <select name="AssetType" value={formData.AssetType} onChange={handleChange} style={inputStyle}>
                                <option value="">Select Type</option>
                                <option value="Server">Server</option>
                                <option value="Laptop">Laptop</option>
                                <option value="Desktop">Desktop</option>
                                <option value="Network Device">Network Device</option>
                                <option value="Printer">Printer</option>
                                <option value="Storage">Storage</option>
                                <option value="Firewall">Firewall</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Category</label>
                            <select name="Category" value={formData.Category} onChange={handleChange} style={inputStyle}>
                                <option value="">Select Category</option>
                                <option value="Hardware">Hardware</option>
                                <option value="Software">Software</option>
                                <option value="Network">Network</option>
                                <option value="Cloud">Cloud</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Manufacturer</label>
                            <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="Manufacturer" name="Manufacturer" value={formData.Manufacturer} onChange={handleChange} style={inputStyle} placeholder="e.g., Dell, HP" />
                        </div>
                        <div>
                            <label style={labelStyle}>Model</label>
                            <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="Model" name="Model" value={formData.Model} onChange={handleChange} style={inputStyle} placeholder="Enter Model" />
                        </div>
                        <div>
                            <label style={labelStyle}>Serial Number</label>
                            <input type="text" name="SerialNumber" value={formData.SerialNumber} onChange={handleChange} style={inputStyle} placeholder="Enter Serial Number" />
                        </div>
                        <div>
                            <label style={labelStyle}>Hostname</label>
                            <input type="text" name="Hostname" value={formData.Hostname} onChange={handleChange} style={inputStyle} placeholder="Enter Hostname" />
                        </div>
                        <div>
                            <label style={labelStyle}>Location</label>
                            <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="Location" name="Location" value={formData.Location} onChange={handleChange} style={inputStyle} placeholder="Building/Floor/Rack" />
                        </div>
                    </div>
                </div>

                {/* Section 2: Technical Specifications */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#166534', fontWeight: '600' }}>
                        2. Technical Specifications
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Processor</label>
                            <input type="text" name="Processor" value={formData.Processor} onChange={handleChange} style={inputStyle} placeholder="Intel i7-12700" />
                        </div>
                        <div>
                            <label style={labelStyle}>RAM</label>
                            <input type="text" name="RAM" value={formData.RAM} onChange={handleChange} style={inputStyle} placeholder="16 GB DDR4" />
                        </div>
                        <div>
                            <label style={labelStyle}>Storage</label>
                            <input type="text" name="StorageTypeCapacity" value={formData.StorageTypeCapacity} onChange={handleChange} style={inputStyle} placeholder="SSD 512 GB" />
                        </div>
                        <div>
                            <label style={labelStyle}>Operating System</label>
                            <input type="text" name="OperatingSystem" value={formData.OperatingSystem} onChange={handleChange} style={inputStyle} placeholder="Windows 11 Pro" />
                        </div>
                        <div>
                            <label style={labelStyle}>OS Version</label>
                            <input type="text" name="OSVersion" value={formData.OSVersion} onChange={handleChange} style={inputStyle} placeholder="22H2" />
                        </div>
                        <div>
                            <label style={labelStyle}>MAC Address</label>
                            <input type="text" name="MACAddress" value={formData.MACAddress} onChange={handleChange} style={inputStyle} placeholder="XX:XX:XX:XX:XX:XX" />
                        </div>
                        <div>
                            <label style={labelStyle}>Firmware Version</label>
                            <input type="text" name="FirmwareVersion" value={formData.FirmwareVersion} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Network/VLAN</label>
                            <input type="text" name="NetworkSegmentVLAN" value={formData.NetworkSegmentVLAN} onChange={handleChange} style={inputStyle} placeholder="VLAN 100" />
                        </div>
                        <div>
                            <label style={labelStyle}>Server Type</label>
                            <select name="ServerType" value={formData.ServerType} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option>
                                <option value="Physical">Physical</option>
                                <option value="Virtual">Virtual</option>
                                <option value="Cloud">Cloud</option>
                                <option value="N/A">N/A</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 3: Procurement */}
                <div style={{ ...sectionStyle, backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#C2410C', fontWeight: '600' }}>
                        3. Procurement & Financial
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Purchase Date</label>
                            <DatePicker name="PurchaseDate" value={formData.PurchaseDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Vendor Name</label>
                            <AutocompleteInput formPrefix={FORM_PREFIX} fieldName="VendorName" name="VendorName" value={formData.VendorName} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>PO Number</label>
                            <input type="text" name="PONumber" value={formData.PONumber} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Invoice Number</label>
                            <input type="text" name="InvoiceNumber" value={formData.InvoiceNumber} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Purchase Cost (₹)</label>
                            <NumberInput name="PurchaseCost" value={formData.PurchaseCost} onChange={handleChange} min={0} formatNumber={true} placeholder="0" />
                        </div>
                        <div>
                            <label style={labelStyle}>Warranty Start</label>
                            <DatePicker name="WarrantyStartDate" value={formData.WarrantyStartDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Warranty End</label>
                            <DatePicker name="WarrantyEndDate" value={formData.WarrantyEndDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>AMC Details</label>
                            <input type="text" name="AMCDetails" value={formData.AMCDetails} onChange={handleChange} style={inputStyle} />
                        </div>
                    </div>
                </div>

                {/* Section 4: Lifecycle */}
                <div style={{ ...sectionStyle, backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#7C3AED', fontWeight: '600' }}>
                        4. Lifecycle & Status
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Asset Status</label>
                            <select name="AssetStatus" value={formData.AssetStatus} onChange={handleChange} style={inputStyle}>
                                <option value="">Select Status</option>
                                <option value="In Use">In Use</option>
                                <option value="In Stock">In Stock</option>
                                <option value="Under Repair">Under Repair</option>
                                <option value="Disposed">Disposed</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Deployment Date</label>
                            <DatePicker name="DeploymentDate" value={formData.DeploymentDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Retirement Date</label>
                            <DatePicker name="RetirementDate" value={formData.RetirementDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Disposal Method</label>
                            <select name="DisposalMethod" value={formData.DisposalMethod} onChange={handleChange} style={inputStyle}>
                                <option value="">Select</option>
                                <option value="Resale">Resale</option>
                                <option value="Scrap">Scrap</option>
                                <option value="Return">Return</option>
                                <option value="Secure Wipe">Secure Wipe</option>
                                <option value="N/A">N/A</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section 5 & 6: Support & Notes */}
                <div style={{ ...sectionStyle, backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#374151', fontWeight: '600' }}>
                        5. Support & Notes
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Support Vendor</label>
                            <input type="text" name="SupportVendor" value={formData.SupportVendor} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Support Contact</label>
                            <input type="text" name="SupportContactDetails" value={formData.SupportContactDetails} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Remark</label>
                            <input type="text" name="Remark" value={formData.Remark} onChange={handleChange} style={inputStyle} maxLength={500} />
                            <CharacterCounter value={formData.Remark} maxLength={500} showAt={400} />
                        </div>
                        <div>
                            <label style={labelStyle}>License Details</label>
                            <input type="text" name="LicenseDetails" value={formData.LicenseDetails} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Additional Remarks</label>
                            <input type="text" name="AdditionalRemarks" value={formData.AdditionalRemarks} onChange={handleChange} style={inputStyle} maxLength={500} />
                            <CharacterCounter value={formData.AdditionalRemarks} maxLength={500} showAt={400} />
                        </div>
                    </div>
                </div>

                {/* Section 7: Approval */}
                <div style={{ ...sectionStyle, backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#166534', fontWeight: '600' }}>
                        6. Approval & Audit
                    </h3>
                    <div className="form-grid">
                        <div>
                            <label style={labelStyle}>Created By</label>
                            <input type="text" name="CreatedBy" value={formData.CreatedBy} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Created Date</label>
                            <DatePicker name="CreatedDate" value={formData.CreatedDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                        <div>
                            <label style={labelStyle}>Approved By</label>
                            <input type="text" name="ApprovedBy" value={formData.ApprovedBy} onChange={handleChange} style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Approval Date</label>
                            <DatePicker name="ApprovalDate" value={formData.ApprovalDate} onChange={handleChange} placeholder="Select date..." />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button type="submit" disabled={addMutation.isPending || updateMutation.isPending} className="btn btn-primary">
                        {addMutation.isPending || updateMutation.isPending ? 'Saving...' : (isEditing ? 'UPDATE' : 'ADD')}
                    </button>
                    {selectedId && (
                        <button type="button" onClick={handleDeleteClick} className="btn" style={{ backgroundColor: '#EF4444', color: 'white' }}>
                            DELETE
                        </button>
                    )}
                    <button type="button" onClick={handleClear} className="btn btn-secondary">CLEAR</button>

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <label style={{ fontWeight: '500', whiteSpace: 'nowrap' }}>Search:</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search assets..."
                            className="input-field"
                            style={{ minWidth: '200px' }}
                        />
                    </div>
                </div>
            </form>

            {/* Records Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title gray">Asset Records ({totalRecords})</h3>
                    {selectedCount > 0 && (
                        <button onClick={() => setShowBulkDeleteDialog(true)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Delete Selected ({selectedCount})
                        </button>
                    )}
                </div>
                {isLoading ? (
                    <p>Loading...</p>
                ) : (
                    <>
                        <div style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid #E5E7EB', borderRadius: '6px 6px 0 0' }}>
                            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB', zIndex: 1 }}>
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
                                        <th style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }} scope="col">Sr. No.</th>
                                        <SortableHeader columnKey="AssetTagNumber" label="Tag" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }} />
                                        <SortableHeader columnKey="AssetName" label="Name" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }} />
                                        <SortableHeader columnKey="AssetType" label="Type" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }} />
                                        <SortableHeader columnKey="AssetStatus" label="Status" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }} />
                                        <SortableHeader columnKey="Location" label="Location" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }} />
                                        <SortableHeader columnKey="Manufacturer" label="Manufacturer" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }} />
                                        <SortableHeader columnKey="SerialNumber" label="Serial No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={{ padding: '0.75rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap' }} />
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.length === 0 ? (
                                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No records found</td></tr>
                                    ) : (
                                        displayData.map((a, index) => (
                                            <tr
                                                key={a.AssetId}
                                                onClick={() => handleRowClick(a)}
                                                style={{
                                                    cursor: 'pointer',
                                                    backgroundColor: isSelected(a.AssetId) ? '#FEF3C7' : selectedId === a.AssetId ? '#DBEAFE' : 'white'
                                                }}
                                            >
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected(a.AssetId)}
                                                        onChange={() => toggleRow(a.AssetId)}
                                                        aria-label={`Select row ${index + 1}`}
                                                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                    />
                                                </td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{(currentPage - 1) * pageSize + index + 1}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{a.AssetTagNumber}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{a.AssetName}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{a.AssetType}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{a.AssetStatus}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{a.Location}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{a.Manufacturer}</td>
                                                <td style={{ padding: '0.75rem', borderBottom: '1px solid #E5E7EB' }}>{a.SerialNumber}</td>
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
                    </>
                )}

                {selectedId && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: '#DBEAFE', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1E40AF' }}>
                        <strong>Editing Asset ID: {selectedId}</strong> - Modify values above and click UPDATE.
                    </div>
                )}
            </div>

            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete Asset"
                message="Are you sure you want to delete this asset? This action cannot be undone."
                onConfirm={() => deleteMutation.mutate(selectedId)}
                onCancel={() => setShowDeleteDialog(false)}
                confirmText="Delete"
                isDanger={true}
            />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />

            <style>{`
                .form-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1.5rem;
                }
            `}</style>
        </>
    );
};

export default AssetTab;
