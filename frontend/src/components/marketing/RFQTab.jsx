import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, sectionBlue, sectionGray } from './styles';
import TextTooltip from '../common/TextTooltip';
import AlertDialog from '../common/AlertDialog';
import EmptyState from '../common/EmptyState';
import { FiLoader } from 'react-icons/fi';
import '../../App.css';

const RFQTab = () => {
    const [formData, setFormData] = useState({
        rfqNo: '',
        partNo: '',
        machiningDrawingNo: '',
        partName: '',
        drawingMatGrade: '',
        bomQty: '',
        fy2026: '',
        drgWt: '',
        castingPartWt: ''
    });
    
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const queryClient = useQueryClient();

    // Fetch all RFQs
    const { data: rfqList = [], isLoading } = useQuery({
        queryKey: ['marketingRFQs'],
        queryFn: async () => {
            const response = await api.get('/marketing/rfq');
            return response.data;
        }
    });

    // Fetch next RFQ number
    const { data: nextNumberData, refetch: refetchNextNumber } = useQuery({
        queryKey: ['nextRFQNumber'],
        queryFn: async () => {
            const response = await api.get('/marketing/rfq/next-number');
            return response.data;
        }
    });

    // Set next RFQ number when available and not editing
    useEffect(() => {
        if (nextNumberData && !isEditing) {
            setFormData(prev => ({
                ...prev,
                rfqNo: nextNumberData.rfqNo
            }));
        }
    }, [nextNumberData, isEditing]);

    // Create RFQ mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            return api.post('/marketing/rfq', {
                RFQNo: data.rfqNo,
                PartNo: data.partNo,
                MachiningDrawingNo: data.machiningDrawingNo,
                PartName: data.partName,
                DrawingMatGrade: data.drawingMatGrade,
                BOMQty: data.bomQty || null,
                FY2026: data.fy2026,
                DrgWt: data.drgWt || null,
                CastingPartWt: data.castingPartWt || null
            });
        },
        onSuccess: () => {
            toast.success('RFQ created successfully!');
            queryClient.invalidateQueries(['marketingRFQs']);
            refetchNextNumber();
            handleClear();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to create RFQ');
        }
    });

    // Update RFQ mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return api.put(`/marketing/rfq/${id}`, {
                PartNo: data.partNo,
                MachiningDrawingNo: data.machiningDrawingNo,
                PartName: data.partName,
                DrawingMatGrade: data.drawingMatGrade,
                BOMQty: data.bomQty || null,
                FY2026: data.fy2026,
                DrgWt: data.drgWt || null,
                CastingPartWt: data.castingPartWt || null
            });
        },
        onSuccess: () => {
            toast.success('RFQ updated successfully!');
            queryClient.invalidateQueries(['marketingRFQs']);
            handleClear();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to update RFQ');
        }
    });

    // Delete RFQ mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return api.delete(`/marketing/rfq/${id}`);
        },
        onSuccess: () => {
            toast.success('RFQ deleted successfully!');
            queryClient.invalidateQueries(['marketingRFQs']);
            refetchNextNumber();
            handleClear();
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete RFQ');
            setShowDeleteDialog(false);
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.rfqNo) {
            toast.error('RFQ No is required');
            return;
        }

        if (isEditing && selectedId) {
            updateMutation.mutate({ id: selectedId, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleClear = () => {
        setFormData({
            rfqNo: nextNumberData?.rfqNo || '',
            partNo: '',
            machiningDrawingNo: '',
            partName: '',
            drawingMatGrade: '',
            bomQty: '',
            fy2026: '',
            drgWt: '',
            castingPartWt: ''
        });
        setSelectedId(null);
        setIsEditing(false);
    };

    const handleRowClick = (record) => {
        setSelectedId(record.RFQId);
        setIsEditing(true);
        setFormData({
            rfqNo: record.RFQNo || '',
            partNo: record.PartNo || '',
            machiningDrawingNo: record.MachiningDrawingNo || '',
            partName: record.PartName || '',
            drawingMatGrade: record.DrawingMatGrade || '',
            bomQty: record.BOMQty || '',
            fy2026: record.FY2026 || '',
            drgWt: record.DrgWt || '',
            castingPartWt: record.CastingPartWt || ''
        });
    };

    const handleDeleteClick = () => {
        if (!selectedId) {
            toast.error('Please select an RFQ to delete');
            return;
        }
        setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
        if (selectedId) {
            deleteMutation.mutate(selectedId);
        }
    };

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            {/* Form Section */}
            <div style={sectionBlue}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                    {isEditing ? `Editing: ${formData.rfqNo}` : 'RFQ Entry'}
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>RFQ No <span style={{ color: '#059669', fontSize: '0.75rem' }}>(Auto-generated)</span></label>
                        <input
                            type="text"
                            name="rfqNo"
                            value={formData.rfqNo}
                            readOnly
                            className="input-field"
                            style={{ backgroundColor: '#F0FDF4', color: '#166534', fontWeight: '600' }}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Part No</label>
                        <input
                            type="text"
                            name="partNo"
                            value={formData.partNo}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Part No"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Machining Drawing No</label>
                        <input
                            type="text"
                            name="machiningDrawingNo"
                            value={formData.machiningDrawingNo}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Machining Drawing No"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Part Name</label>
                        <input
                            type="text"
                            name="partName"
                            value={formData.partName}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Part Name"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Drawing MAT Grade</label>
                        <input
                            type="text"
                            name="drawingMatGrade"
                            value={formData.drawingMatGrade}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Drawing MAT Grade"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>BOM Qty</label>
                        <input
                            type="number"
                            name="bomQty"
                            value={formData.bomQty}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter BOM Qty"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>FY 2026</label>
                        <input
                            type="text"
                            name="fy2026"
                            value={formData.fy2026}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter FY 2026"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Drg. Wt.</label>
                        <input
                            type="number"
                            name="drgWt"
                            value={formData.drgWt}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Drg. Wt."
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Casting Part Wt</label>
                        <input
                            type="number"
                            name="castingPartWt"
                            value={formData.castingPartWt}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Casting Part Wt"
                            step="0.01"
                        />
                    </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting}
                        className="btn btn-primary btn-ripple"
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            opacity: isSubmitting ? 0.7 : 1
                        }}
                    >
                        {isSubmitting && <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                        {isSubmitting ? 'Saving...' : (isEditing ? 'UPDATE' : 'SUBMIT')}
                    </button>
                    {selectedId && (
                        <button 
                            type="button" 
                            onClick={handleDeleteClick}
                            disabled={deleteMutation.isPending}
                            className="btn btn-ripple" 
                            style={{ 
                                backgroundColor: '#EF4444', 
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {deleteMutation.isPending && <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                            DELETE
                        </button>
                    )}
                    <button onClick={handleClear} className="btn btn-secondary">CLEAR</button>
                </div>
            </div>

            {/* Records Table */}
            <div style={{ ...sectionGray, marginTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#374151', fontWeight: '600' }}>
                    RFQ Records ({rfqList.length})
                </h3>
                
                <div style={{ 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '6px', 
                    overflow: 'auto',
                    maxHeight: '400px'
                }}>
                    {isLoading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                            Loading records...
                        </div>
                    ) : rfqList.length > 0 ? (
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
                                    {['RFQ No', 'Part No', 'Part Name', 'Drawing MAT Grade', 'BOM Qty', 'Drg. Wt.', 'Casting Part Wt', 'Created At'].map(header => (
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
                                {rfqList.map((record) => (
                                    <tr 
                                        key={record.RFQId}
                                        onClick={() => handleRowClick(record)}
                                        style={{
                                            borderBottom: '1px solid #E5E7EB',
                                            backgroundColor: selectedId === record.RFQId ? '#DBEAFE' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: '500', color: '#0369A1' }}>
                                            {record.RFQNo}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.PartNo || '-'}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            <TextTooltip text={record.PartName} maxLength={25} />
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.DrawingMatGrade || '-'}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.BOMQty || '-'}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.DrgWt || '-'}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.CastingPartWt || '-'}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6B7280' }}>
                                            {record.CreatedAt ? new Date(record.CreatedAt).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <EmptyState 
                            icon="file"
                            title="No RFQ records found"
                            description="Create your first RFQ to get started."
                        />
                    )}
                </div>
            </div>

            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete RFQ"
                message="Are you sure you want to delete this RFQ? This will also delete associated Laboratory and Patternshop data. This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteDialog(false)}
                confirmText="Delete"
                isDanger={true}
            />
        </>
    );
};

export default RFQTab;
