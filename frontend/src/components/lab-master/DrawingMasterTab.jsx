import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { useDebounce } from '../../utils/useDebounce';
import TextTooltip from '../common/TextTooltip';
import AlertDialog from '../common/AlertDialog';
import EmptyState from '../common/EmptyState';
import { FiLoader, FiPaperclip, FiEye, FiX } from 'react-icons/fi';

const DrawingMasterTab = () => {
    const [formData, setFormData] = useState({
        No: '',
        Customer: '',
        DrawingNo: '',
        RevNo: '',
        Description: '',
        CustomerGrade: '',
        AKPGrade: '',
        Remarks: '',
        Comments: ''
    });

    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    
    // File attachment state
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [existingAttachment, setExistingAttachment] = useState(null);
    const [removeAttachment, setRemoveAttachment] = useState(false);
    
    const fileInputRef = useRef(null);
    const excelInputRef = useRef(null);

    const queryClient = useQueryClient();

    // Fetch records
    const fetchRecords = async (query) => {
        const url = query
            ? `/drawing-master?search=${encodeURIComponent(query)}`
            : '/drawing-master';
        const response = await api.get(url);
        return response.data;
    };

    const { data: records = [], isError, isLoading } = useQuery({
        queryKey: ['drawingMasterRecords', debouncedSearchTerm],
        queryFn: () => fetchRecords(debouncedSearchTerm),
        placeholderData: keepPreviousData,
    });

    useEffect(() => {
        if (isError) {
            toast.error('Failed to load drawing master records');
        }
    }, [isError]);

    // Mutations
    const addMutation = useMutation({
        mutationFn: async (data) => {
            const formDataToSend = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined) {
                    formDataToSend.append(key, data[key]);
                }
            });
            if (attachmentFile) {
                formDataToSend.append('attachment', attachmentFile);
            }
            return api.post('/drawing-master', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            toast.success('Drawing master record added successfully!');
            queryClient.invalidateQueries(['drawingMasterRecords']);
            handleClear();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to add record');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const formDataToSend = new FormData();
            Object.keys(data).forEach(key => {
                if (data[key] !== null && data[key] !== undefined) {
                    formDataToSend.append(key, data[key]);
                }
            });
            if (attachmentFile) {
                formDataToSend.append('attachment', attachmentFile);
            }
            if (removeAttachment) {
                formDataToSend.append('removeAttachment', 'true');
            }
            return api.put(`/drawing-master/${id}`, formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            toast.success('Drawing master record updated successfully!');
            queryClient.invalidateQueries(['drawingMasterRecords']);
            handleClear();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to update record');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/drawing-master/${id}`),
        onSuccess: () => {
            toast.success('Drawing master record deleted successfully!');
            queryClient.invalidateQueries(['drawingMasterRecords']);
            handleClear();
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete record');
            setShowDeleteDialog(false);
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClear = () => {
        setFormData({
            No: '',
            Customer: '',
            DrawingNo: '',
            RevNo: '',
            Description: '',
            CustomerGrade: '',
            AKPGrade: '',
            Remarks: '',
            Comments: ''
        });
        setSelectedId(null);
        setIsEditing(false);
        setAttachmentFile(null);
        setExistingAttachment(null);
        setRemoveAttachment(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const validateForm = () => {
        if (!formData.Customer || formData.Customer.trim() === '') {
            toast.error('Customer is required');
            return false;
        }
        if (!formData.DrawingNo || formData.DrawingNo.trim() === '') {
            toast.error('Drawing No is required');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            if (isEditing && selectedId) {
                updateMutation.mutate({ id: selectedId, data: formData });
            } else {
                addMutation.mutate(formData);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRowClick = (record) => {
        setSelectedId(record.DrawingMasterId);
        setIsEditing(true);
        setFormData({
            No: record.No || '',
            Customer: record.Customer || '',
            DrawingNo: record.DrawingNo || '',
            RevNo: record.RevNo || '',
            Description: record.Description || '',
            CustomerGrade: record.CustomerGrade || '',
            AKPGrade: record.AKPGrade || '',
            Remarks: record.Remarks || '',
            Comments: record.Comments || ''
        });
        setExistingAttachment(record.AttachmentName ? {
            name: record.AttachmentName,
            path: record.AttachmentPath
        } : null);
        setAttachmentFile(null);
        setRemoveAttachment(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleDeleteClick = () => {
        if (!selectedId) {
            toast.error('Please select a record to delete');
            return;
        }
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
        if (selectedId) {
            deleteMutation.mutate(selectedId);
        }
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size (50MB limit)
            if (file.size > 50 * 1024 * 1024) {
                toast.error('File size must be less than 50MB');
                return;
            }
            setAttachmentFile(file);
            setRemoveAttachment(false);
        }
    };

    const handleRemoveAttachment = () => {
        setAttachmentFile(null);
        setExistingAttachment(null);
        setRemoveAttachment(true);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleViewAttachment = (recordId) => {
        // Open attachment in new tab for viewing
        const baseUrl = api.defaults.baseURL || '';
        const viewUrl = `${baseUrl}/drawing-master/attachment/${recordId}`;
        window.open(viewUrl, '_blank');
    };

    const handleImportExcel = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
            toast.error('Please select a valid Excel file (.xlsx or .xls)');
            return;
        }

        setImporting(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/drawing-master/import-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const { successCount, skippedCount = 0, errorCount } = response.data;
            
            if (errorCount > 0) {
                toast.warning(`Import completed with ${successCount} records imported, ${skippedCount} duplicates skipped, and ${errorCount} errors.`);
            } else if (skippedCount > 0) {
                toast.info(`Imported ${successCount} new records. ${skippedCount} duplicates were skipped.`);
            } else {
                toast.success(`Successfully imported ${successCount} records!`);
            }
            
            queryClient.invalidateQueries(['drawingMasterRecords']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to import Excel file');
        } finally {
            setImporting(false);
            if (excelInputRef.current) {
                excelInputRef.current.value = '';
            }
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit}>
                {/* Drawing Master Form */}
                <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                    <h3 className="section-title blue">
                        {isEditing ? `Editing Record ID: ${selectedId}` : 'Drawing Master Details'}
                    </h3>

                    <div className="form-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                        gap: '1rem' 
                    }}>
                        {/* Serial No */}
                        <div className="form-group">
                            <label htmlFor="No" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Serial No
                            </label>
                            <input
                                type="text"
                                id="No"
                                name="No"
                                value={formData.No}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter No"
                            />
                        </div>

                        {/* Customer */}
                        <div className="form-group">
                            <label htmlFor="Customer" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Customer <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                id="Customer"
                                name="Customer"
                                value={formData.Customer}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter Customer"
                            />
                        </div>

                        {/* Drawing No */}
                        <div className="form-group">
                            <label htmlFor="DrawingNo" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Drawing No <span style={{ color: '#EF4444' }}>*</span>
                            </label>
                            <input
                                type="text"
                                id="DrawingNo"
                                name="DrawingNo"
                                value={formData.DrawingNo}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter Drawing No"
                            />
                        </div>

                        {/* Rev No */}
                        <div className="form-group">
                            <label htmlFor="RevNo" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Rev No
                            </label>
                            <input
                                type="text"
                                id="RevNo"
                                name="RevNo"
                                value={formData.RevNo}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter Rev No"
                            />
                        </div>

                        {/* Description */}
                        <div className="form-group">
                            <label htmlFor="Description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Description
                            </label>
                            <input
                                type="text"
                                id="Description"
                                name="Description"
                                value={formData.Description}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter Description"
                            />
                        </div>

                        {/* Customer Grade */}
                        <div className="form-group">
                            <label htmlFor="CustomerGrade" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Customer Grade
                            </label>
                            <input
                                type="text"
                                id="CustomerGrade"
                                name="CustomerGrade"
                                value={formData.CustomerGrade}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter Customer Grade"
                            />
                        </div>

                        {/* AKP Grade */}
                        <div className="form-group">
                            <label htmlFor="AKPGrade" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                AKP Grade
                            </label>
                            <input
                                type="text"
                                id="AKPGrade"
                                name="AKPGrade"
                                value={formData.AKPGrade}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter AKP Grade"
                            />
                        </div>

                        {/* Remarks */}
                        <div className="form-group">
                            <label htmlFor="Remarks" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Remarks
                            </label>
                            <input
                                type="text"
                                id="Remarks"
                                name="Remarks"
                                value={formData.Remarks}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter Remarks"
                            />
                        </div>

                        {/* Comments - Full width */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label htmlFor="Comments" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Comments
                            </label>
                            <textarea
                                id="Comments"
                                name="Comments"
                                value={formData.Comments}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter Comments"
                                rows={3}
                                style={{ resize: 'vertical', minHeight: '80px' }}
                            />
                        </div>

                        {/* Drawing Attachment - Full width */}
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                                Drawing Attachment
                            </label>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip,.dwg,.dxf"
                                    style={{ display: 'none' }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="btn"
                                    style={{ 
                                        backgroundColor: '#6366F1', 
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <FiPaperclip size={16} />
                                    {attachmentFile || existingAttachment ? 'Change File' : 'Attach File'}
                                </button>
                                
                                {/* Show selected file or existing attachment */}
                                {(attachmentFile || (existingAttachment && !removeAttachment)) && (
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '0.5rem',
                                        padding: '0.5rem 0.75rem',
                                        backgroundColor: '#F3F4F6',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.875rem'
                                    }}>
                                        <FiPaperclip size={14} style={{ color: '#6B7280' }} />
                                        <span style={{ color: '#374151' }}>
                                            {attachmentFile ? attachmentFile.name : existingAttachment?.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleRemoveAttachment}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                padding: '0.25rem',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <FiX size={16} style={{ color: '#EF4444' }} />
                                        </button>
                                    </div>
                                )}
                                
                                <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                    Allowed: PDF, Word, Excel, Images, DWG, DXF, ZIP, TXT (Max 50MB)
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button 
                            type="submit" 
                            disabled={loading || addMutation.isPending || updateMutation.isPending}
                            className="btn btn-primary btn-ripple btn-hover-scale"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                opacity: (loading || addMutation.isPending || updateMutation.isPending) ? 0.7 : 1
                            }}
                        >
                            {(loading || addMutation.isPending || updateMutation.isPending) && (
                                <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            )}
                            {loading || addMutation.isPending || updateMutation.isPending 
                                ? 'Saving...' 
                                : (isEditing ? 'UPDATE' : 'ADD')}
                        </button>
                        {selectedId && (
                            <button 
                                type="button" 
                                onClick={handleDeleteClick}
                                disabled={deleteMutation.isPending}
                                className="btn btn-ripple btn-hover-scale" 
                                style={{ 
                                    backgroundColor: '#EF4444', 
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    opacity: deleteMutation.isPending ? 0.7 : 1
                                }}
                            >
                                {deleteMutation.isPending && (
                                    <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                )}
                                {deleteMutation.isPending ? 'Deleting...' : 'DELETE'}
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={handleClear} 
                            disabled={loading || addMutation.isPending || updateMutation.isPending}
                            className="btn btn-secondary btn-hover-scale"
                        >
                            CLEAR
                        </button>

                        {/* Import from Excel */}
                        <input
                            type="file"
                            ref={excelInputRef}
                            onChange={handleImportExcel}
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => excelInputRef.current?.click()}
                            disabled={importing}
                            className="btn"
                            style={{ 
                                backgroundColor: '#059669', 
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: importing ? 0.7 : 1
                            }}
                        >
                            {importing && (
                                <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                            )}
                            {importing ? 'Importing...' : '📥 Import from Excel'}
                        </button>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <label style={{ fontWeight: '500', whiteSpace: 'nowrap', color: '#374151' }}>Search:</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                placeholder="Type to search..."
                                className="input-field"
                                style={{ minWidth: '250px' }}
                            />
                            {searchTerm && (
                                <button 
                                    type="button" 
                                    onClick={() => setSearchTerm('')} 
                                    className="btn btn-secondary" 
                                    style={{ padding: '0.5rem 0.75rem' }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </form>

            {/* Records Table */}
            <div className="section-container section-gray">
                <h3 className="section-title gray">Drawing Master Records ({records.length})</h3>
                
                <div style={{ 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '6px', 
                    overflow: 'auto',
                    maxHeight: '500px'
                }}>
                    {isLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                            Loading records...
                        </div>
                    ) : records && records.length > 0 ? (
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'collapse',
                            minWidth: 'max-content'
                        }}>
                            <thead style={{ 
                                position: 'sticky', 
                                top: 0, 
                                backgroundColor: '#F9FAFB',
                                zIndex: 10
                            }}>
                                <tr>
                                    {['Customer', 'Drawing Serial No', 'Drawing No', 'Rev No', 'Description', 'Customer Grade', 'AKP Grade', 'Remarks', 'Comments', 'Attachment'].map(header => (
                                        <th key={header} style={{
                                            padding: '0.75rem 1rem',
                                            fontWeight: '600',
                                            textAlign: 'left',
                                            whiteSpace: 'nowrap',
                                            borderBottom: '2px solid #E5E7EB',
                                            backgroundColor: '#F9FAFB',
                                            fontSize: '0.875rem',
                                            color: '#374151'
                                        }}>
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(records) && [...records].sort((a, b) => {
                                    // First sort by Customer name (alphabetically)
                                    const customerCompare = (a.Customer || '').localeCompare(b.Customer || '');
                                    if (customerCompare !== 0) return customerCompare;
                                    // Same Customer, sort by Serial No (ascending)
                                    const noA = a.No ? parseInt(a.No, 10) : 0;
                                    const noB = b.No ? parseInt(b.No, 10) : 0;
                                    if (isNaN(noA) && isNaN(noB)) return 0;
                                    if (isNaN(noA)) return 1;
                                    if (isNaN(noB)) return -1;
                                    return noA - noB;
                                }).map((record, index) => (
                                    <tr 
                                        key={record.DrawingMasterId}
                                        onClick={() => handleRowClick(record)}
                                        style={{
                                            borderBottom: '1px solid #E5E7EB',
                                            backgroundColor: selectedId === record.DrawingMasterId ? '#DBEAFE' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={record.Customer} maxLength={30} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.No || '-'}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.DrawingNo}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.RevNo}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={record.Description} maxLength={35} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.CustomerGrade}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.AKPGrade}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={record.Remarks} maxLength={30} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={record.Comments} maxLength={40} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.AttachmentName ? (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewAttachment(record.DrawingMasterId);
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '0.25rem',
                                                        color: '#3B82F6',
                                                        fontSize: '0.875rem'
                                                    }}
                                                    title={`View: ${record.AttachmentName}`}
                                                >
                                                    <FiEye size={14} />
                                                    <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        View
                                                    </span>
                                                </button>
                                            ) : (
                                                <span style={{ color: '#9CA3AF' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState 
                            icon="search"
                            title="No records found"
                            description={searchTerm ? `No results for "${searchTerm}". Try a different search term.` : 'Add your first Drawing Master record to get started.'}
                            actionLabel={searchTerm ? 'Clear Search' : undefined}
                            onAction={searchTerm ? () => setSearchTerm('') : undefined}
                        />
                    )}
                </div>
                
                {/* Row count footer */}
                <div style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.75rem',
                    color: '#6B7280',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '0 0 6px 6px',
                    border: '1px solid #E5E7EB',
                    borderTop: 'none'
                }}>
                    Showing {records?.length || 0} rows
                </div>

                {selectedId && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#DBEAFE', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1E40AF' }}>
                        <strong>Editing Record ID: {selectedId}</strong> - Modify values above and click UPDATE to save changes.
                    </div>
                )}
            </div>

            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete Record"
                message="Are you sure you want to delete this record? This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteDialog(false)}
                confirmText="Delete"
                isDanger={true}
            />
        </div>
    );
};

export default DrawingMasterTab;
