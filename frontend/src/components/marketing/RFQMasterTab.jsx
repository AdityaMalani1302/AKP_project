import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, sectionBlue, sectionGray, sectionGreen, sectionOrange, formatDateForInput } from './styles';
import TextTooltip from '../common/TextTooltip';
import AlertDialog from '../common/AlertDialog';
import EmptyState from '../common/EmptyState';
import DatePicker from '../common/DatePicker';
import { FiLoader } from 'react-icons/fi';
import '../../App.css';

const STATUS_OPTIONS = [
    { value: 'Active', label: 'Active' },
    { value: 'Pending', label: 'Pending' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Quoted', label: 'Quoted' },
    { value: 'Won', label: 'Won' },
    { value: 'Lost', label: 'Lost' },
    { value: 'On Hold', label: 'On Hold' },
    { value: 'Closed', label: 'Closed' }
];

const RFQMasterTab = () => {
    const [formData, setFormData] = useState({
        srNo: '',
        akpRfqNo: '',
        rfqId: '',
        status: 'Active',
        customerName: '',
        rfqDate: '',
        projectReference: '',
        rfqParts: '',
        annualVolume: '',
        weight: '',
        monthlyTonnage: '',
        patternQuoteDate: '',
        machiningQuoteDate: '',
        quoteSentDate: '',
        revisedQuoteSentDate: '',
        goAheadConfirmDate: '',
        partPODate: '',
        partNo: '',
        toolingPODate: '',
        toolingNo: '',
        amortizationDate: '',
        gaaToolingDate: '',
        gaaMachiningDate: '',
        sampleSubmittedDate: '',
        remarks: ''
    });
    
    const [selectedId, setSelectedId] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const queryClient = useQueryClient();

    // Fetch all RFQ Master records
    const { data: rfqMasterList = [], isLoading } = useQuery({
        queryKey: ['rfqMasterRecords', searchTerm],
        queryFn: async () => {
            const params = searchTerm ? { search: searchTerm } : {};
            const response = await api.get('/marketing/rfq-master', { params });
            return response.data;
        }
    });

    // Fetch RFQs from the RFQ tab for the dropdown
    const { data: rfqList = [] } = useQuery({
        queryKey: ['marketingRFQs'],
        queryFn: async () => {
            const response = await api.get('/marketing/rfq');
            return response.data;
        }
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            return api.post('/marketing/rfq-master', {
                SrNo: data.srNo,
                AKPRFQNo: data.akpRfqNo,
                RFQId: data.rfqId || null,
                Status: data.status,
                CustomerName: data.customerName,
                RFQDate: data.rfqDate || null,
                ProjectReference: data.projectReference,
                RFQParts: data.rfqParts,
                AnnualVolume: data.annualVolume || null,
                Weight: data.weight || null,
                MonthlyTonnage: data.monthlyTonnage || null,
                PatternQuoteDate: data.patternQuoteDate || null,
                MachiningQuoteDate: data.machiningQuoteDate || null,
                QuoteSentDate: data.quoteSentDate || null,
                RevisedQuoteSentDate: data.revisedQuoteSentDate || null,
                GoAheadConfirmDate: data.goAheadConfirmDate || null,
                PartPODate: data.partPODate || null,
                PartNo: data.partNo,
                ToolingPODate: data.toolingPODate || null,
                ToolingNo: data.toolingNo,
                AmortizationDate: data.amortizationDate || null,
                GAAToolingDate: data.gaaToolingDate || null,
                GAAMachiningDate: data.gaaMachiningDate || null,
                SampleSubmittedDate: data.sampleSubmittedDate || null,
                Remarks: data.remarks
            });
        },
        onSuccess: () => {
            toast.success('RFQ Master record created successfully!');
            queryClient.invalidateQueries(['rfqMasterRecords']);
            handleClear();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to create RFQ Master record');
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            return api.put(`/marketing/rfq-master/${id}`, {
                SrNo: data.srNo,
                AKPRFQNo: data.akpRfqNo,
                RFQId: data.rfqId || null,
                Status: data.status,
                CustomerName: data.customerName,
                RFQDate: data.rfqDate || null,
                ProjectReference: data.projectReference,
                RFQParts: data.rfqParts,
                AnnualVolume: data.annualVolume || null,
                Weight: data.weight || null,
                MonthlyTonnage: data.monthlyTonnage || null,
                PatternQuoteDate: data.patternQuoteDate || null,
                MachiningQuoteDate: data.machiningQuoteDate || null,
                QuoteSentDate: data.quoteSentDate || null,
                RevisedQuoteSentDate: data.revisedQuoteSentDate || null,
                GoAheadConfirmDate: data.goAheadConfirmDate || null,
                PartPODate: data.partPODate || null,
                PartNo: data.partNo,
                ToolingPODate: data.toolingPODate || null,
                ToolingNo: data.toolingNo,
                AmortizationDate: data.amortizationDate || null,
                GAAToolingDate: data.gaaToolingDate || null,
                GAAMachiningDate: data.gaaMachiningDate || null,
                SampleSubmittedDate: data.sampleSubmittedDate || null,
                Remarks: data.remarks
            });
        },
        onSuccess: () => {
            toast.success('RFQ Master record updated successfully!');
            queryClient.invalidateQueries(['rfqMasterRecords']);
            handleClear();
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to update RFQ Master record');
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            return api.delete(`/marketing/rfq-master/${id}`);
        },
        onSuccess: () => {
            toast.success('RFQ Master record deleted successfully!');
            queryClient.invalidateQueries(['rfqMasterRecords']);
            handleClear();
            setShowDeleteDialog(false);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete RFQ Master record');
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

    // Handle RFQ selection from dropdown
    const handleRFQChange = (e) => {
        const selectedRFQId = e.target.value;
        const selectedRFQ = rfqList.find(r => r.RFQId === parseInt(selectedRFQId));
        
        setFormData(prev => ({
            ...prev,
            rfqId: selectedRFQId,
            akpRfqNo: selectedRFQ?.RFQNo || ''
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.akpRfqNo) {
            toast.error('Please select an AKP RFQ No');
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
            srNo: '',
            akpRfqNo: '',
            rfqId: '',
            status: 'Active',
            customerName: '',
            rfqDate: '',
            projectReference: '',
            rfqParts: '',
            annualVolume: '',
            weight: '',
            monthlyTonnage: '',
            patternQuoteDate: '',
            machiningQuoteDate: '',
            quoteSentDate: '',
            revisedQuoteSentDate: '',
            goAheadConfirmDate: '',
            partPODate: '',
            partNo: '',
            toolingPODate: '',
            toolingNo: '',
            amortizationDate: '',
            gaaToolingDate: '',
            gaaMachiningDate: '',
            sampleSubmittedDate: '',
            remarks: ''
        });
        setSelectedId(null);
        setIsEditing(false);
    };

    const handleRowClick = (record) => {
        setSelectedId(record.RFQMasterId);
        setIsEditing(true);
        setFormData({
            srNo: record.SrNo || '',
            akpRfqNo: record.AKPRFQNo || '',
            rfqId: record.RFQId || '',
            status: record.Status || 'Active',
            customerName: record.CustomerName || '',
            rfqDate: formatDateForInput(record.RFQDate) || '',
            projectReference: record.ProjectReference || '',
            rfqParts: record.RFQParts || '',
            annualVolume: record.AnnualVolume || '',
            weight: record.Weight || '',
            monthlyTonnage: record.MonthlyTonnage || '',
            patternQuoteDate: formatDateForInput(record.PatternQuoteDate) || '',
            machiningQuoteDate: formatDateForInput(record.MachiningQuoteDate) || '',
            quoteSentDate: formatDateForInput(record.QuoteSentDate) || '',
            revisedQuoteSentDate: formatDateForInput(record.RevisedQuoteSentDate) || '',
            goAheadConfirmDate: formatDateForInput(record.GoAheadConfirmDate) || '',
            partPODate: formatDateForInput(record.PartPODate) || '',
            partNo: record.PartNo || '',
            toolingPODate: formatDateForInput(record.ToolingPODate) || '',
            toolingNo: record.ToolingNo || '',
            amortizationDate: formatDateForInput(record.AmortizationDate) || '',
            gaaToolingDate: formatDateForInput(record.GAAToolingDate) || '',
            gaaMachiningDate: formatDateForInput(record.GAAMachiningDate) || '',
            sampleSubmittedDate: formatDateForInput(record.SampleSubmittedDate) || '',
            remarks: record.Remarks || ''
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

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    return (
        <>
            {/* Basic Info Section */}
            <div style={sectionBlue}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                    {isEditing ? `Editing: ${formData.akpRfqNo}` : 'RFQ Master Entry'}
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>Sr. No.</label>
                        <input
                            type="text"
                            name="srNo"
                            value={formData.srNo}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Sr. No."
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="input-field"
                        >
                            {STATUS_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>AKP RFQ No <span style={{ color: '#DC2626', fontSize: '0.75rem' }}>(Select from RFQ)</span></label>
                        <select
                            name="rfqId"
                            value={formData.rfqId}
                            onChange={handleRFQChange}
                            className="input-field"
                        >
                            <option value="">-- Select RFQ --</option>
                            {rfqList.map(rfq => (
                                <option key={rfq.RFQId} value={rfq.RFQId}>
                                    {rfq.RFQNo} {rfq.PartName ? `- ${rfq.PartName}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Name of Customer</label>
                        <input
                            type="text"
                            name="customerName"
                            value={formData.customerName}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Customer Name"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>RFQ Date</label>
                        <DatePicker
                            name="rfqDate"
                            value={formData.rfqDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Project Reference</label>
                        <input
                            type="text"
                            name="projectReference"
                            value={formData.projectReference}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Project Reference"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>RFQ Parts</label>
                        <input
                            type="text"
                            name="rfqParts"
                            value={formData.rfqParts}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter RFQ Parts"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Annual Volume</label>
                        <input
                            type="number"
                            name="annualVolume"
                            value={formData.annualVolume}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Annual Volume"
                            step="0.01"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Weight</label>
                        <input
                            type="number"
                            name="weight"
                            value={formData.weight}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Weight"
                            step="0.0001"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Monthly Tonnage</label>
                        <input
                            type="number"
                            name="monthlyTonnage"
                            value={formData.monthlyTonnage}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Monthly Tonnage"
                            step="0.0001"
                        />
                    </div>
                </div>
            </div>

            {/* Quotation Dates Section */}
            <div style={{ ...sectionGreen, marginTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#166534', fontWeight: '600' }}>
                    Quotation Dates
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>Pattern Quote (Date)</label>
                        <DatePicker
                            name="patternQuoteDate"
                            value={formData.patternQuoteDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Machining Quote (Date)</label>
                        <DatePicker
                            name="machiningQuoteDate"
                            value={formData.machiningQuoteDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Quote Sent to Customer (Date)</label>
                        <DatePicker
                            name="quoteSentDate"
                            value={formData.quoteSentDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Revised Quote Sent (Date)</label>
                        <DatePicker
                            name="revisedQuoteSentDate"
                            value={formData.revisedQuoteSentDate}
                            onChange={handleChange}
                        />
                    </div>
                </div>
            </div>

            {/* Order & Tooling Section */}
            <div style={{ ...sectionOrange, marginTop: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#C2410C', fontWeight: '600' }}>
                    Order & Tooling Details
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>Go Ahead Confirmation (Date)</label>
                        <DatePicker
                            name="goAheadConfirmDate"
                            value={formData.goAheadConfirmDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Part PO (Date)</label>
                        <DatePicker
                            name="partPODate"
                            value={formData.partPODate}
                            onChange={handleChange}
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
                        <label style={labelStyle}>Tooling PO (Date)</label>
                        <DatePicker
                            name="toolingPODate"
                            value={formData.toolingPODate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Tooling No</label>
                        <input
                            type="text"
                            name="toolingNo"
                            value={formData.toolingNo}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Tooling No"
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Amortization (Date)</label>
                        <DatePicker
                            name="amortizationDate"
                            value={formData.amortizationDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>GAA for Tooling (Date)</label>
                        <DatePicker
                            name="gaaToolingDate"
                            value={formData.gaaToolingDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>GAA for Machining (Date)</label>
                        <DatePicker
                            name="gaaMachiningDate"
                            value={formData.gaaMachiningDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Sample Submitted to Customer (Date)</label>
                        <DatePicker
                            name="sampleSubmittedDate"
                            value={formData.sampleSubmittedDate}
                            onChange={handleChange}
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Remarks</label>
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Remarks"
                            rows={3}
                            style={{ resize: 'vertical', minHeight: '80px' }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#374151', fontWeight: '600' }}>
                        RFQ Master Records ({rfqMasterList.length})
                    </h3>
                    <input
                        type="text"
                        placeholder="Search by RFQ No, Customer, Part No..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-field"
                        style={{ maxWidth: '300px' }}
                    />
                </div>
                
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
                    ) : rfqMasterList.length > 0 ? (
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
                                    {['Sr. No', 'AKP RFQ No', 'Status', 'Customer', 'RFQ Date', 'Part No', 'Tooling No', 'Created At'].map(header => (
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
                                {rfqMasterList.map((record) => (
                                    <tr 
                                        key={record.RFQMasterId}
                                        onClick={() => handleRowClick(record)}
                                        style={{
                                            borderBottom: '1px solid #E5E7EB',
                                            backgroundColor: selectedId === record.RFQMasterId ? '#DBEAFE' : 'white',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: '500' }}>
                                            {record.SrNo || '-'}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: '500', color: '#0369A1' }}>
                                            {record.AKPRFQNo}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                fontSize: '0.75rem',
                                                fontWeight: '500',
                                                backgroundColor: record.Status === 'Won' ? '#D1FAE5' : 
                                                                 record.Status === 'Lost' ? '#FEE2E2' : 
                                                                 record.Status === 'Active' ? '#DBEAFE' : '#F3F4F6',
                                                color: record.Status === 'Won' ? '#065F46' : 
                                                       record.Status === 'Lost' ? '#991B1B' : 
                                                       record.Status === 'Active' ? '#1E40AF' : '#374151'
                                            }}>
                                                {record.Status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            <TextTooltip text={record.CustomerName} maxLength={20} />
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.RFQDate ? new Date(record.RFQDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.PartNo || '-'}
                                        </td>
                                        <td style={{ padding: '0.625rem 1rem', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>
                                            {record.ToolingNo || '-'}
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
                            title="No RFQ Master records found"
                            description="Create your first RFQ Master entry to get started."
                        />
                    )}
                </div>
            </div>

            <AlertDialog
                isOpen={showDeleteDialog}
                title="Delete RFQ Master Record"
                message="Are you sure you want to delete this RFQ Master record? This action cannot be undone."
                onConfirm={handleConfirmDelete}
                onCancel={() => setShowDeleteDialog(false)}
                confirmText="Delete"
                isDanger={true}
            />
        </>
    );
};

export default RFQMasterTab;
