import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import withOptimisticUpdate from '../../utils/optimisticUpdates';
import TextTooltip from '../common/TextTooltip';
import EmptyState from '../common/EmptyState';
import AlertDialog from '../common/AlertDialog';
import FieldError from '../common/FieldError';
import CharacterCounter from '../common/CharacterCounter';
import useFormValidation from '../../utils/useFormValidation';
import { labelStyle, textareaStyle, inputStyle } from './styles';
import { FiPaperclip, FiFile, FiTrash2, FiEye, FiX, FiLoader } from 'react-icons/fi';
import usePagination from '../../utils/usePagination';
import useSortableData from '../../utils/useSortableData';
import useRowSelection from '../../utils/useRowSelection';
import Pagination from '../common/Pagination';
import SortableHeader from '../common/SortableHeader';

/**
 * DrawingMasterTab Component
 * Manages Drawing Master records with multi-file attachment support.
 */
const DrawingMasterTab = () => {
    // ─── State ───────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        No: '', Customer: '', DrawingNo: '', RevNo: '',
        Description: '', CustomerGrade: '', AKPGrade: '',
        Remarks: '', Comments: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
    const [importing, setImporting] = useState(false);

    const validationRules = useMemo(() => ({
        Customer: { required: true, requiredMessage: 'Customer is required' },
        DrawingNo: { required: true, requiredMessage: 'Drawing No is required' }
    }), []);

    const { errors: _errors, touched: _touched, setErrors, setTouched, handleBlur: _handleBlur, clearAllErrors } = useFormValidation(validationRules);

    // Multi-file state
    const [newFiles, setNewFiles] = useState([]);              // Files to upload (File objects)
    const [existingAttachments, setExistingAttachments] = useState([]); // Already-saved attachments
    const [removedAttachmentIds, setRemovedAttachmentIds] = useState([]); // IDs marked for removal on save

    const fileInputRef = useRef(null);
    const importFileInputRef = useRef(null);
    const queryClient = useQueryClient();

    // ─── Queries ──────────────────────────────────────────────────
    const { data: drawings = [], isLoading } = useQuery({
        queryKey: ['drawings', searchTerm],
        queryFn: async () => {
            const url = searchTerm ? `/drawing-master?search=${encodeURIComponent(searchTerm)}` : '/drawing-master';
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
    } = usePagination({ data: drawings, pageSize: 50, autoPaginate: true });

    const { sortKey, sortOrder, handleSort } = useSortableData(drawings);

    const { toggleRow, toggleAll, clearSelection, isSelected, isAllSelected, isSomeSelected, selectedCount, getSelectedRecords } = useRowSelection({ data: drawings, idField: 'DrawingMasterId' });

    const displayData = useMemo(() => {
        if (!sortKey || !drawings.length) {
            const start = (currentPage - 1) * pageSize;
            return drawings.slice(start, start + pageSize);
        }
        const sorted = [...drawings].sort((a, b) => {
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
    }, [drawings, sortKey, sortOrder, currentPage, pageSize]);

    useEffect(() => {
        resetToFirstPage();
    }, [searchTerm, resetToFirstPage]);

    // ─── Mutations ────────────────────────────────────────────────
    const optimistic = withOptimisticUpdate(queryClient, ['drawings'], { idField: 'DrawingMasterId' });

    const createMutation = useMutation(optimistic.add({
        apiFn: ({ _plainData, formDataToSend }) => {
            return api.post('/drawing-master', formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        successMessage: 'Drawing master record added successfully',
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drawingMasterRecords'] });
            resetForm();
        }
    }));

    const updateMutation = useMutation(optimistic.update({
        apiFn: ({ id, _plainData, formDataToSend }) => {
            return api.put(`/drawing-master/${id}`, formDataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        successMessage: 'Drawing master record updated successfully',
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drawingMasterRecords'] });
            resetForm();
        }
    }));

    const deleteMutation = useMutation(optimistic.remove({
        apiFn: (id) => api.delete(`/drawing-master/${id}`),
        successMessage: 'Drawing master record deleted successfully',
        onSuccess: () => {
            setShowDeleteDialog(false);
            setDeleteTargetId(null);
            if (editingId === deleteTargetId) resetForm();
        }
    }));

    // ─── Handlers ──────────────────────────────────────────────────
    const resetForm = useCallback(() => {
        setFormData({
            No: '', Customer: '', DrawingNo: '', RevNo: '',
            Description: '', CustomerGrade: '', AKPGrade: '',
            Remarks: '', Comments: ''
        });
        setEditingId(null);
        setNewFiles([]);
        setExistingAttachments([]);
        setRemovedAttachmentIds([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        clearAllErrors();
    }, [clearAllErrors]);

    const validateField = useCallback((name, value) => {
        const rule = validationRules[name];
        if (!rule) return null;
        if (rule.required && (!value || value.trim() === '')) {
            setErrors(prev => ({ ...prev, [name]: rule.requiredMessage }));
            return rule.requiredMessage;
        }
        setErrors(prev => ({ ...prev, [name]: null }));
        return null;
    }, [setErrors, validationRules]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (_touched[name]) {
            validateField(name, value);
        }
    }, [_touched, validateField]);

    // Handle multi-file selection
    const handleFileChange = useCallback((e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length > 0) {
            setNewFiles(prev => [...prev, ...selectedFiles]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const handleRemoveNewFile = useCallback((index) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleRemoveExistingAttachment = useCallback((attachmentId) => {
        setRemovedAttachmentIds(prev => [...prev, attachmentId]);
        setExistingAttachments(prev => prev.filter(a => a.AttachmentId !== attachmentId));
    }, []);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();

        const requiredFields = ['Customer', 'DrawingNo'];
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

        const formDataToSend = new FormData();
        Object.entries(formData).forEach(([key, value]) => {
            formDataToSend.append(key, value || '');
        });

        // Append all new files
        newFiles.forEach((file) => {
            formDataToSend.append('attachments', file);
        });

        if (editingId) {
            if (removedAttachmentIds.length > 0) {
                formDataToSend.append('removeAttachmentIds', JSON.stringify(removedAttachmentIds));
            }
            updateMutation.mutate({ id: editingId, plainData: { ...formData }, formDataToSend });
        } else {
            createMutation.mutate({ plainData: { ...formData }, formDataToSend });
        }
    }, [formData, editingId, newFiles, removedAttachmentIds, createMutation, updateMutation, setTouched, validateField]);

    const handleRowClick = useCallback((row) => {
        setFormData({
            No: row.No || '',
            Customer: row.Customer || '',
            DrawingNo: row.DrawingNo || '',
            RevNo: row.RevNo || '',
            Description: row.Description || '',
            CustomerGrade: row.CustomerGrade || '',
            AKPGrade: row.AKPGrade || '',
            Remarks: row.Remarks || '',
            Comments: row.Comments || ''
        });
        setEditingId(row.DrawingMasterId);
        setExistingAttachments(row.Attachments || []);
        setNewFiles([]);
        setRemovedAttachmentIds([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, []);

    const handleDeleteClick = useCallback((id) => {
        setDeleteTargetId(id);
        setShowDeleteDialog(true);
    }, []);

    const handleConfirmDelete = useCallback(() => {
        if (deleteTargetId) {
            deleteMutation.mutate(deleteTargetId);
        }
    }, [deleteTargetId, deleteMutation]);

    const handleBulkDelete = async () => {
        const selected = getSelectedRecords();
        try {
            await Promise.all(selected.map(r => api.delete(`/drawing-master/${r.DrawingMasterId}`)));
            toast.success(`${selected.length} records deleted successfully`);
            clearSelection();
            queryClient.invalidateQueries({ queryKey: ['drawings'] });
            queryClient.invalidateQueries({ queryKey: ['drawingMasterRecords'] });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete some records');
            queryClient.invalidateQueries({ queryKey: ['drawings'] });
            queryClient.invalidateQueries({ queryKey: ['drawingMasterRecords'] });
        }
        setShowBulkDeleteDialog(false);
    };

    const handleViewAttachment = useCallback((attachmentId) => {
        const baseUrl = api.defaults.baseURL || '';
        window.open(`${baseUrl}/drawing-master/attachment/${attachmentId}`, '_blank');
    }, []);

    // Excel import
    const handleImportExcel = useCallback(async (event) => {
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
        const fd = new FormData();
        fd.append('file', file);

        try {
            const response = await api.post('/drawing-master/import-excel', fd, {
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

            queryClient.invalidateQueries({ queryKey: ['drawings'] });
            queryClient.invalidateQueries({ queryKey: ['drawingMasterRecords'] });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to import Excel file');
        } finally {
            setImporting(false);
            if (importFileInputRef.current) importFileInputRef.current.value = '';
        }
    }, [queryClient]);

    const thStyle = {
        padding: '0.75rem 1rem',
        fontWeight: '600',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid #E5E7EB',
        backgroundColor: '#F9FAFB',
        fontSize: '0.875rem',
        color: '#374151'
    };

    const tdStyle = {
        padding: '0.625rem 1rem',
        whiteSpace: 'nowrap',
        fontSize: '0.875rem'
    };

    const _totalAttachments = existingAttachments.length + newFiles.length;
    const isSaving = createMutation.isPending || updateMutation.isPending;

    const formRowGrid = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
        gap: '1rem',
        marginBottom: '1rem'
    };

    // ─── Render ────────────────────────────────────────────────────
    return (
        <div>
            <form onSubmit={handleSubmit}>
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{
                        margin: '0 0 1.25rem 0',
                        fontSize: '1.1rem',
                        color: '#0369A1',
                        fontWeight: 600
                    }}>
                        Drawing Master Details
                    </h3>

                    <div style={formRowGrid}>
                        <div>
                            <label style={labelStyle}>Serial No</label>
                            <input type="text" name="No" value={formData.No} onChange={handleChange} placeholder="Enter No" className="input-field" />
                        </div>
                        <div>
                            <label style={labelStyle}>Customer <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="Customer" value={formData.Customer} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.Customer && _errors.Customer ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                placeholder="Enter Customer"
                                aria-invalid={_touched.Customer && _errors.Customer ? 'true' : undefined}
                                aria-describedby={_touched.Customer && _errors.Customer ? 'Customer-error' : undefined} />
                            <FieldError error={_touched.Customer && _errors.Customer ? _errors.Customer : null} id="Customer-error" />
                        </div>
                        <div>
                            <label style={labelStyle}>Drawing No <span style={{ color: '#EF4444' }} aria-hidden="true">*</span></label>
                            <input type="text" name="DrawingNo" value={formData.DrawingNo} onChange={handleChange} onBlur={_handleBlur}
                                style={{
                                    ...inputStyle,
                                    ...(_touched.DrawingNo && _errors.DrawingNo ? { borderColor: '#EF4444', boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)' } : {})
                                }}
                                placeholder="Enter Drawing No"
                                aria-invalid={_touched.DrawingNo && _errors.DrawingNo ? 'true' : undefined}
                                aria-describedby={_touched.DrawingNo && _errors.DrawingNo ? 'DrawingNo-error' : undefined} />
                            <FieldError error={_touched.DrawingNo && _errors.DrawingNo ? _errors.DrawingNo : null} id="DrawingNo-error" />
                        </div>
                        <div>
                            <label style={labelStyle}>Rev No</label>
                            <input type="text" name="RevNo" value={formData.RevNo} onChange={handleChange} placeholder="Enter Rev No" className="input-field" />
                        </div>
                    </div>

                    <div style={formRowGrid}>
                        <div>
                            <label style={labelStyle}>Description</label>
                            <input type="text" name="Description" value={formData.Description} onChange={handleChange} placeholder="Enter Description" className="input-field" />
                        </div>
                        <div>
                            <label style={labelStyle}>Customer Grade</label>
                            <input type="text" name="CustomerGrade" value={formData.CustomerGrade} onChange={handleChange} placeholder="Enter Customer Grade" className="input-field" />
                        </div>
                        <div>
                            <label style={labelStyle}>AKP Grade</label>
                            <input type="text" name="AKPGrade" value={formData.AKPGrade} onChange={handleChange} placeholder="Enter AKP Grade" className="input-field" />
                        </div>
                        <div>
                            <label style={labelStyle}>Remarks</label>
                            <input type="text" name="Remarks" value={formData.Remarks} onChange={handleChange} placeholder="Enter Remarks" className="input-field" maxLength={500} />
                            <CharacterCounter value={formData.Remarks} maxLength={500} showAt={400} />
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.25rem' }}>
                        <label style={labelStyle}>Comments</label>
                        <textarea
                            name="Comments"
                            value={formData.Comments}
                            onChange={handleChange}
                            placeholder="Enter Comments"
                            className="input-field"
                            rows={4}
                            maxLength={500}
                            style={{ ...textareaStyle, width: '100%', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }}
                        />
                        <CharacterCounter value={formData.Comments} maxLength={500} showAt={400} />
                    </div>

                    {/* Drawing attachment — multiple files, original inline layout */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Drawing Attachment</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="btn"
                                style={{
                                    backgroundColor: '#2563EB',
                                    color: 'white',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <FiPaperclip size={16} />
                                Attach File
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.zip,.dwg,.dxf"
                                style={{ display: 'none' }}
                            />
                            <span style={{ fontSize: '0.8125rem', color: '#6B7280' }}>
                                Allowed: PDF, Word, Excel, Images, DWG, DXF, ZIP, TXT (Max 50MB). You can attach multiple files.
                            </span>
                        </div>

                        {existingAttachments.length > 0 && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.35rem', fontWeight: 500 }}>Saved files</div>
                                {existingAttachments.map((att) => (
                                    <div
                                        key={att.AttachmentId}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.375rem 0.75rem',
                                            backgroundColor: '#F8FAFC',
                                            borderRadius: '0.375rem',
                                            marginBottom: '0.25rem',
                                            fontSize: '0.85rem',
                                            border: '1px solid #E5E7EB'
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                            <FiFile style={{ color: '#2563EB', flexShrink: 0 }} size={14} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {att.AttachmentName}
                                            </span>
                                        </span>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                                            <button
                                                type="button"
                                                onClick={() => handleViewAttachment(att.AttachmentId)}
                                                title="View"
                                                style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', padding: '0.125rem', display: 'flex' }}
                                            >
                                                <FiEye size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExistingAttachment(att.AttachmentId)}
                                                title="Remove"
                                                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.125rem', display: 'flex' }}
                                            >
                                                <FiX size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {newFiles.length > 0 && (
                            <div>
                                <div style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.35rem', fontWeight: 500 }}>New files to upload</div>
                                {newFiles.map((file, index) => (
                                    <div
                                        key={`new-${index}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.375rem 0.75rem',
                                            backgroundColor: '#F0FDF4',
                                            borderRadius: '0.375rem',
                                            marginBottom: '0.25rem',
                                            fontSize: '0.85rem',
                                            border: '1px solid #BBF7D0'
                                        }}
                                    >
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                            <FiPaperclip style={{ color: '#16A34A', flexShrink: 0 }} size={14} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                                            <span style={{ color: '#9CA3AF', fontSize: '0.75rem', flexShrink: 0 }}>
                                                ({(file.size / 1024).toFixed(1)} KB)
                                            </span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveNewFile(index)}
                                            title="Remove"
                                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.125rem', flexShrink: 0, display: 'flex' }}
                                        >
                                            <FiX size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '0.75rem',
                        paddingTop: '0.25rem',
                        borderTop: '1px solid #F3F4F6'
                    }}>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn btn-ripple btn-hover-scale"
                            style={{
                                backgroundColor: '#1E293B',
                                color: 'white',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: isSaving ? 0.7 : 1
                            }}
                        >
                            {isSaving && <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                            {isSaving ? 'Saving...' : (editingId ? 'UPDATE' : 'ADD')}
                        </button>
                        {editingId && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!formData.Customer?.trim() || !formData.DrawingNo?.trim()) {
                                            toast.error('Customer and Drawing No are required');
                                            return;
                                        }
                                        const formDataToSend = new FormData();
                                        Object.entries(formData).forEach(([key, value]) => {
                                            formDataToSend.append(key, value || '');
                                        });
                                        newFiles.forEach((file) => {
                                            formDataToSend.append('attachments', file);
                                        });
                                        createMutation.mutate(formDataToSend);
                                    }}
                                    className="btn"
                                    style={{ backgroundColor: '#0D9488', color: 'white' }}
                                    disabled={isSaving}
                                >
                                    ADD AS NEW
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteClick(editingId)}
                                    disabled={deleteMutation.isPending}
                                    className="btn btn-ripple btn-hover-scale"
                                    style={{
                                        backgroundColor: '#EF4444',
                                        color: 'white',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        opacity: deleteMutation.isPending ? 0.7 : 1
                                    }}
                                >
                                    {deleteMutation.isPending && <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                                    {deleteMutation.isPending ? 'Deleting...' : 'DELETE'}
                                </button>
                            </>
                        )}
                        <button
                            type="button"
                            onClick={resetForm}
                            disabled={isSaving}
                            className="btn btn-ripple btn-hover-scale"
                            style={{
                                backgroundColor: '#FFFFFF',
                                color: '#2563EB',
                                border: '1px solid #93C5FD'
                            }}
                        >
                            CLEAR
                        </button>

                        <input
                            type="file"
                            ref={importFileInputRef}
                            onChange={handleImportExcel}
                            accept=".xlsx,.xls"
                            style={{ display: 'none' }}
                        />
                        <button
                            type="button"
                            onClick={() => importFileInputRef.current?.click()}
                            disabled={importing}
                            className="btn"
                            style={{
                                backgroundColor: '#0D9488',
                                color: 'white',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: importing ? 0.7 : 1
                            }}
                        >
                            {importing && <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                            {importing ? 'Importing...' : 'Import from Excel'}
                        </button>
                        <span style={{ color: '#DC2626', fontSize: '0.8125rem', fontWeight: 500 }}>
                            Do not change column name and structure in excel sheet
                        </span>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ fontWeight: 500, whiteSpace: 'nowrap', color: '#374151', fontSize: '0.875rem' }}>Search:</label>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Type to search..."
                                className="input-field"
                                style={{ minWidth: '220px', maxWidth: '280px' }}
                            />
                            {searchTerm && (
                                <button type="button" onClick={() => setSearchTerm('')} className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem' }}>
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </form>

            {/* Records Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 className="section-title gray">Drawing Master Records ({totalRecords})</h3>
                    {selectedCount > 0 && (
                        <button onClick={() => setShowBulkDeleteDialog(true)} className="btn btn-danger" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                            Delete Selected ({selectedCount})
                        </button>
                    )}
                </div>

                <div style={{ border: '1px solid #E5E7EB', borderRadius: '6px 6px 0 0', overflow: 'auto', maxHeight: '500px' }}>
                    {isLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                            Loading records...
                        </div>
                    ) : displayData && displayData.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 'max-content' }}>
                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB', zIndex: 10 }}>
<tr>
                                        <th style={{ ...thStyle, width: '40px', textAlign: 'center' }} scope="col">
                                            <input
                                                type="checkbox"
                                                checked={isAllSelected}
                                                ref={el => { if (el) el.indeterminate = isSomeSelected; }}
                                                onChange={() => toggleAll(displayData)}
                                                aria-label="Select all rows"
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </th>
                                        <SortableHeader columnKey="No" label="No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <SortableHeader columnKey="Customer" label="Customer" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <SortableHeader columnKey="DrawingNo" label="Drg No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <SortableHeader columnKey="RevNo" label="Rev No" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <SortableHeader columnKey="Description" label="Description" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <SortableHeader columnKey="CustomerGrade" label="Customer Grade" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <SortableHeader columnKey="AKPGrade" label="AKP Grade" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <SortableHeader columnKey="Remarks" label="Remarks" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <SortableHeader columnKey="Comments" label="Comments" sortKey={sortKey} sortOrder={sortOrder} onSort={handleSort} style={thStyle} />
                                    <th key="Attachments" style={thStyle} scope="col">Attachments</th>
                                    <th key="Actions" style={thStyle} scope="col">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayData.map((record) => (
                                    <tr
                                        key={record.DrawingMasterId}
                                        onClick={() => handleRowClick(record)}
                                        style={{
                                            borderBottom: '1px solid #E5E7EB',
                                            backgroundColor: isSelected(record.DrawingMasterId) ? '#FEF3C7' : editingId === record.DrawingMasterId ? '#DBEAFE' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <td style={{ ...tdStyle, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected(record.DrawingMasterId)}
                                                onChange={() => toggleRow(record.DrawingMasterId)}
                                                aria-label={`Select row`}
                                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                            />
                                        </td>
                                        <td style={tdStyle}>{record.No}</td>
                                        <td style={tdStyle}><TextTooltip text={record.Customer} maxLength={25} /></td>
                                        <td style={tdStyle}>{record.DrawingNo}</td>
                                        <td style={tdStyle}>{record.RevNo}</td>
                                        <td style={tdStyle}><TextTooltip text={record.Description} maxLength={30} /></td>
                                        <td style={tdStyle}>{record.CustomerGrade}</td>
                                        <td style={tdStyle}>{record.AKPGrade}</td>
                                        <td style={tdStyle}><TextTooltip text={record.Remarks} maxLength={25} /></td>
                                        <td style={tdStyle}><TextTooltip text={record.Comments} maxLength={25} /></td>
                                        <td style={{ ...tdStyle, whiteSpace: 'normal', minWidth: '140px' }}>
                                            {(record.Attachments && record.Attachments.length > 0) ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    {record.Attachments.map((att) => (
                                                        <button
                                                            key={att.AttachmentId}
                                                            onClick={(e) => { e.stopPropagation(); handleViewAttachment(att.AttachmentId); }}
                                                            style={{
                                                                background: 'none', border: 'none', color: '#2563EB',
                                                                cursor: 'pointer', padding: '1px 0', fontSize: '0.8rem',
                                                                textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px',
                                                                textDecoration: 'underline', overflow: 'hidden'
                                                            }}
                                                            title={att.AttachmentName}
                                                        >
                                                            <FiFile style={{ flexShrink: 0 }} size={12} />
                                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                                                                {att.AttachmentName}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.8rem' }}>No files</span>
                                            )}
                                        </td>
                                        <td style={tdStyle}>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(record.DrawingMasterId); }}
                                                className="btn"
                                                style={{ backgroundColor: '#EF4444', color: 'white', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                title="Delete"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
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

                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalRecords={totalRecords}
                    pageSize={pageSize}
                    onPageChange={goToPage}
                    onPageSizeChange={changePageSize}
                    showPageSizeSelector
                />

                {editingId && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#DBEAFE', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1E40AF' }}>
                        <strong>Editing Record ID: {editingId}</strong> - Modify values above and click UPDATE to save changes.
                    </div>
                )}
            </div>

            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete Record"
                message="Are you sure you want to delete this drawing master record? This will also delete all associated attachments. This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => { setShowDeleteDialog(false); setDeleteTargetId(null); }}
                confirmText="Delete"
                isDanger={true}
            />
            <AlertDialog isOpen={showBulkDeleteDialog} title={`Delete ${selectedCount} Records`} message={`Are you sure you want to delete ${selectedCount} selected records? This action cannot be undone.`}
                onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteDialog(false)} confirmText="Delete All" isDanger={true} />
        </div>
    );
};

export default DrawingMasterTab;
