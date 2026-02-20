import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { useDebounce } from '../utils/useDebounce';
import { saveFormHistory } from '../utils/useInputHistory';
import DetailsSection from './lab-master/DetailsSection';
import ChemistryMixSection from './lab-master/ChemistryMixSection';
import OthersSection from './lab-master/OthersSection';
import DrawingMasterTab from './lab-master/DrawingMasterTab';
import DrawingDetailsTab from './lab-master/DrawingDetailsTab';
import AlertDialog from './common/AlertDialog';
import TextTooltip from './common/TextTooltip';
import EmptyState from './common/EmptyState';
import AnimatedTabs from './common/AnimatedTabs';
import { FiLoader } from 'react-icons/fi';

const LabMaster = ({ user }) => {
    // Tab navigation with URL persistence
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Define tabs with their permission IDs
    const allTabs = [
        { id: 'labMaster', label: 'Lab Master', pageId: 'lab-master' },
        { id: 'drawingMaster', label: 'Drawing Master', pageId: 'drawing-master' },
        { id: 'drawingDetails', label: 'Drawing Details', pageId: 'drawing-details' }
    ];

    // Filter tabs based on permissions
    const getVisibleTabs = () => {
        if (!user) return allTabs;
        
        // Admins see all tabs
        if (user.role === 'admin') return allTabs;
        
        const allowedPages = user.allowedPages || [];
        
        // If user has 'all' access, show all tabs
        if (allowedPages.includes('all')) return allTabs;
        
        // If user has access to lab-master but no sub-tabs defined, show everything (legacy/default behavior)
        // OR we can enforce that they must have specific sub-tab access. 
        // Let's stick to the pattern: if specific sub-tabs are used, filter by them.
        
        // Check if user has ANY sub-tab permissions explicitly assigned
        const hasSpecificSubTabs = allTabs.some(tab => 
            tab.pageId !== 'lab-master' && allowedPages.includes(tab.pageId)
        );
        
        if (!hasSpecificSubTabs) {
             // If no specific sub-tabs are assigned, only show the main Lab Master tab
             return allTabs.filter(tab => tab.pageId === 'lab-master');
        }

        // Return only allowed tabs. 
        // Note: We always include the tab that matches the 'lab-master' permission if they have it, 
        // which gives them access to the page loop.
        return allTabs.filter(tab => allowedPages.includes(tab.pageId));
    };

    const tabs = getVisibleTabs();
    
    // Read tab from URL, default to 'labMaster'
    const activeTab = searchParams.get('tab') || 'labMaster';
    
    // Handler to change tab and update URL
    const setActiveTab = useCallback((tab) => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);
    const [formData, setFormData] = useState({
        // 1. Details
        Customer: '',
        DrgNo: '',
        Description: '',
        Grade: '',
        PartWeight: '',
        MinMaxThickness: '',
        ThicknessGroup: '',
        BaseChe_C: '',
        BaseChe_Si: '',

        // 2. Final Control Chemistry
        C: '', Si: '', Mn: '', P: '', S: '',
        Cr: '', Cu: '', Mg_Chem: '', CE: '', Nickel: '', Moly: '',

        // 3. Charge Mix
        CRCA: '', RR: '', PIG: '', MS: '', Mg_Mix: '',

        // 4. Others
        RegularCritical: '',
        LastBoxTemp: '',
        Remarks: ''
    });

    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    // Use debounced search - auto-search 300ms after user stops typing
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [importing, setImporting] = useState(false);
    const fileInputRef = useRef(null);



    const fetchRecordsFromApi = async (query) => {
        const url = query
            ? `/lab-master?search=${encodeURIComponent(query)}`
            : '/lab-master';
        const response = await api.get(url);
        return response.data;
    };

    const queryClient = useQueryClient();

    // Use debounced search term for query
    const { data: records = [], isError: isQueryError, isLoading: isQueryLoading } = useQuery({
        queryKey: ['labRecords', debouncedSearchTerm],
        queryFn: () => fetchRecordsFromApi(debouncedSearchTerm),
        placeholderData: keepPreviousData,
    });

    // Mutations
    // Store form data temporarily for saving to history on success
    const pendingFormDataRef = React.useRef(null);

    const addMutation = useMutation({
        mutationFn: (newRecord) => {
            pendingFormDataRef.current = newRecord;
            return api.post('/lab-master', newRecord);
        },
        onSuccess: () => {
            toast.success('Lab Master record added successfully!');
            // Save form values to history for autocomplete
            if (pendingFormDataRef.current) {
                saveFormHistory('labMaster', pendingFormDataRef.current);
                pendingFormDataRef.current = null;
            }
            queryClient.invalidateQueries(['labRecords']);
            handleClear();
        },
        onError: (error) => {
            pendingFormDataRef.current = null;
            toast.error(error.response?.data?.error || 'Failed to save record');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => {
            pendingFormDataRef.current = data;
            return api.put(`/lab-master/${id}`, data);
        },
        onSuccess: () => {
            toast.success('Lab Master record updated successfully!');
            // Save form values to history for autocomplete
            if (pendingFormDataRef.current) {
                saveFormHistory('labMaster', pendingFormDataRef.current);
                pendingFormDataRef.current = null;
            }
            queryClient.invalidateQueries(['labRecords']);
            handleClear();
        },
        onError: (error) => {
            pendingFormDataRef.current = null;
            toast.error(error.response?.data?.error || 'Failed to update record');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => api.delete(`/lab-master/${id}`),
        onSuccess: () => {
            toast.success('Lab Master record deleted successfully!');
            queryClient.invalidateQueries(['labRecords']);
            handleClear();
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete record');
            setShowDeleteDialog(false);
        }
    });

    useEffect(() => {
        if (isQueryError) {
            toast.error('Failed to load lab master records');
        }
    }, [isQueryError]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Validation function for required fields
    const validateForm = () => {
        if (!formData.Customer || formData.Customer.trim() === '') {
            toast.error('Customer is required');
            return false;
        }
        if (!formData.DrgNo || formData.DrgNo.trim() === '') {
            toast.error('Drg. No. is required');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
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
        } catch (err) {
            console.error('Error saving lab master record:', err);
            toast.error('An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setFormData({
            Customer: '', DrgNo: '', Description: '', Grade: '', PartWeight: '',
            MinMaxThickness: '', ThicknessGroup: '', BaseChe_C: '', BaseChe_Si: '',
            C: '', Si: '', Mn: '', P: '', S: '',
            Cr: '', Cu: '', Mg_Chem: '', CE: '', Nickel: '', Moly: '',
            CRCA: '', RR: '', PIG: '', MS: '', Mg_Mix: '',
            RegularCritical: '', LastBoxTemp: '', Remarks: ''
        });
        setSelectedId(null);
        setIsEditing(false);
    };

    const handleRowClick = (record) => {
        setSelectedId(record.LabMasterId);
        setIsEditing(true);
        setFormData({
            Customer: record.Customer || '',
            DrgNo: record.DrgNo || '',
            Description: record.Description || '',
            Grade: record.Grade || '',
            PartWeight: record.PartWeight || '',
            MinMaxThickness: record.MinMaxThickness || '',
            ThicknessGroup: record.ThicknessGroup || '',
            BaseChe_C: record.BaseChe_C || '',
            BaseChe_Si: record.BaseChe_Si || '',
            C: record.C || '',
            Si: record.Si || '',
            Mn: record.Mn || '',
            P: record.P || '',
            S: record.S || '',
            Cr: record.Cr || '',
            Cu: record.Cu || '',
            Mg_Chem: record.Mg_Chem || '',
            CE: record.CE || '',
            Nickel: record.Nickel || '',
            Moly: record.Moly || '',
            CRCA: record.CRCA || '',
            RR: record.RR || '',
            PIG: record.PIG || '',
            MS: record.MS || '',
            Mg_Mix: record.Mg_Mix || '',
            RegularCritical: record.RegularCritical || '',
            LastBoxTemp: record.LastBoxTemp || '',
            Remarks: record.Remarks || ''
        });
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

    // Search is now auto-triggered by debounce, just update the search term
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleImportExcel = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
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
            const response = await api.post('/lab-master/import-excel', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const { successCount, skippedCount = 0, errorCount, errors } = response.data;
            
            if (errorCount > 0) {
                toast.warning(`Import completed with ${successCount} records imported, ${skippedCount} duplicates skipped, and ${errorCount} errors.`);
            } else if (skippedCount > 0) {
                toast.info(`Imported ${successCount} new records. ${skippedCount} duplicates were skipped.`);
            } else {
                toast.success(`Successfully imported ${successCount} records!`);
            }
            
            queryClient.invalidateQueries(['labRecords']);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to import Excel file');
        } finally {
            setImporting(false);
            // Reset the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="card" >
            <h2 style={{ marginBottom: '1.5rem' }}>Lab Master</h2>

            {/* Tab Navigation */}
            <AnimatedTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {activeTab === 'drawingMaster' ? (
                <DrawingMasterTab />
            ) : activeTab === 'drawingDetails' ? (
                <DrawingDetailsTab />
            ) : (
                <>
                    {/* Lab Master Tab Content */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                        {selectedId && (
                            <button 
                                type="button" 
                                onClick={() => {
                                    // Validate before adding as new
                                    if (!validateForm()) {
                                        return;
                                    }
                                    // Add the current form data as a new entry
                                    addMutation.mutate(formData);
                                }} 
                                className="btn" 
                                style={{ backgroundColor: '#059669', color: 'white' }}
                                disabled={loading || addMutation.isPending}
                            >
                                {addMutation.isPending ? 'Adding...' : '➕ ADD AS NEW'}
                            </button>
                        )}
                    </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <DetailsSection data={formData} onChange={handleChange} />
                <ChemistryMixSection data={formData} onChange={handleChange} />
                <OthersSection data={formData} onChange={handleChange} />

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                        ref={fileInputRef}
                        onChange={handleImportExcel}
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
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
                    <span style={{ color: '#DC2626', fontSize: '0.9rem', fontWeight: '500' }}>
                        ⚠️ Do not change column name and structure in excel sheet
                    </span>

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
            </form>

            {/* Records Table */}
            <div className="section-container section-gray" style={{ marginTop: '2rem' }} >
                <h3 className="section-title gray">Lab Master Records ({records.length})</h3>

                {/* Standard HTML Table with scroll */}
                <div style={{ 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '6px', 
                    overflow: 'auto',
                    maxHeight: '500px'
                }}>
                    {isQueryLoading ? (
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
                                    {['Sr. No', 'Customer', 'Drg No', 'Description', 'Grade', 'Part Weight', 'Min/Max Thickness', 'Thickness Group', 'Base C', 'Base Si', 'C', 'Si', 'Mn', 'P', 'S', 'Cr', 'Cu', 'Mg', 'CE', 'Nickel', 'Moly', 'CRCA', 'RR', 'PIG', 'MS', 'Mg Mix', 'Regular/Critical', 'Last Box Temp', 'Remarks'].map((header, idx) => (
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
                                {records.map((record, index) => (
                                    <tr 
                                        key={record.LabMasterId} 
                                        onClick={() => handleRowClick(record)}
                                        style={{
                                            borderBottom: '1px solid #E5E7EB',
                                            backgroundColor: selectedId === record.LabMasterId ? '#DBEAFE' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{index + 1}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={record.Customer} maxLength={30} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.DrgNo}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={record.Description} maxLength={35} /></td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.Grade}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'right' }}>{record.PartWeight}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.MinMaxThickness}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.ThicknessGroup}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.BaseChe_C}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.BaseChe_Si}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.C}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.Si}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.Mn}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.P}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.S}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.Cr}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.Cu}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.Mg_Chem || record.Mg || ''}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.CE}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.Nickel}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.Moly}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.CRCA}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.RR}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.PIG}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.MS}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', textAlign: 'center' }}>{record.Mg_Mix}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.RegularCritical}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{record.LastBoxTemp}</td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}><TextTooltip text={record.Remarks} maxLength={40} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState 
                            icon="search"
                            title="No records found"
                            description={searchTerm ? `No results for "${searchTerm}". Try a different search term.` : 'Add your first Lab Master record to get started.'}
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
            </>
            )}
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

export default LabMaster;
