import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, sectionBlue, sectionGreen } from './styles';
import Combobox from '../common/Combobox';
import { FiLoader } from 'react-icons/fi';
import '../../App.css';

const LaboratoryTab = () => {
    const [selectedRFQId, setSelectedRFQId] = useState('');
    const [selectedRFQDetails, setSelectedRFQDetails] = useState(null);
    
    const [formData, setFormData] = useState({
        fgSg: '',
        alloyAddition: '',
        rt: '',
        ut: '',
        mpi: '',
        ht: '',
        dpTest: '',
        nabl: '',
        impactTest: '',
        millipore: '',
        cutSection: '',
        inducingHardening: '',
        laboratoryRequirements: ''
    });

    const queryClient = useQueryClient();

    // Fetch all RFQs for dropdown
    const { data: rfqList = [] } = useQuery({
        queryKey: ['marketingRFQs'],
        queryFn: async () => {
            const response = await api.get('/marketing/rfq');
            return response.data;
        }
    });

    // Convert RFQ list to combobox options
    const rfqOptions = rfqList.map(rfq => ({
        value: rfq.RFQId,
        label: `${rfq.RFQNo} - ${rfq.PartName || rfq.PartNo || 'No Part Name'}`
    }));

    // Fetch laboratory data for selected RFQ
    const { data: laboratoryData, isLoading: isLoadingLabData } = useQuery({
        queryKey: ['laboratoryData', selectedRFQId],
        queryFn: async () => {
            if (!selectedRFQId) return null;
            const response = await api.get(`/marketing/laboratory/by-rfq/${selectedRFQId}`);
            return response.data;
        },
        enabled: !!selectedRFQId
    });

    // Update form when laboratory data is fetched
    useEffect(() => {
        if (laboratoryData) {
            setFormData({
                fgSg: laboratoryData.FGSG || '',
                alloyAddition: laboratoryData.AlloyAddition || '',
                rt: laboratoryData.RT || '',
                ut: laboratoryData.UT || '',
                mpi: laboratoryData.MPI || '',
                ht: laboratoryData.HT || '',
                dpTest: laboratoryData.DPTest || '',
                nabl: laboratoryData.NABL || '',
                impactTest: laboratoryData.ImpactTest || '',
                millipore: laboratoryData.Millipore || '',
                cutSection: laboratoryData.CutSection || '',
                inducingHardening: laboratoryData.InducingHardening || '',
                laboratoryRequirements: laboratoryData.LaboratoryRequirements || ''
            });
        } else if (selectedRFQId) {
            // Clear form when no existing data for selected RFQ
            handleClearForm();
        }
    }, [laboratoryData, selectedRFQId]);

    // Update selected RFQ details when selection changes
    useEffect(() => {
        if (selectedRFQId) {
            const rfq = rfqList.find(r => r.RFQId === parseInt(selectedRFQId));
            setSelectedRFQDetails(rfq || null);
        } else {
            setSelectedRFQDetails(null);
        }
    }, [selectedRFQId, rfqList]);

    // Save laboratory data mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            return api.post('/marketing/laboratory', {
                RFQId: parseInt(selectedRFQId),
                FGSG: data.fgSg,
                AlloyAddition: data.alloyAddition,
                RT: data.rt,
                UT: data.ut,
                MPI: data.mpi,
                HT: data.ht,
                DPTest: data.dpTest,
                NABL: data.nabl,
                ImpactTest: data.impactTest,
                Millipore: data.millipore,
                CutSection: data.cutSection,
                InducingHardening: data.inducingHardening,
                LaboratoryRequirements: data.laboratoryRequirements
            });
        },
        onSuccess: (response) => {
            toast.success(response.data.message || 'Laboratory data saved successfully!');
            queryClient.invalidateQueries(['laboratoryData', selectedRFQId]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to save laboratory data');
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
        if (!selectedRFQId) {
            toast.error('Please select an RFQ first');
            return;
        }
        saveMutation.mutate(formData);
    };

    const handleClearForm = () => {
        setFormData({
            fgSg: '',
            alloyAddition: '',
            rt: '',
            ut: '',
            mpi: '',
            ht: '',
            dpTest: '',
            nabl: '',
            impactTest: '',
            millipore: '',
            cutSection: '',
            inducingHardening: '',
            laboratoryRequirements: ''
        });
    };

    const handleClear = () => {
        handleClearForm();
        setSelectedRFQId('');
        setSelectedRFQDetails(null);
    };

    const handleRFQChange = (value) => {
        setSelectedRFQId(value);
    };

    return (
        <>
            {/* RFQ Selection Section */}
            <div style={{
                backgroundColor: '#FEF3C7',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
            }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#B45309', fontWeight: '600' }}>
                    Select RFQ
                </h3>
                <div style={{ maxWidth: '400px' }}>
                    <Combobox
                        options={rfqOptions}
                        value={selectedRFQId}
                        onChange={handleRFQChange}
                        placeholder="Select RFQ No..."
                    />
                </div>
                {selectedRFQDetails && (
                    <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.75rem', 
                        backgroundColor: '#FFFBEB', 
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        color: '#92400E'
                    }}>
                        <strong>Part No:</strong> {selectedRFQDetails.PartNo || '-'} | 
                        <strong> Part Name:</strong> {selectedRFQDetails.PartName || '-'} | 
                        <strong> Drawing MAT Grade:</strong> {selectedRFQDetails.DrawingMatGrade || '-'}
                    </div>
                )}
                {rfqOptions.length === 0 && (
                    <p style={{ marginTop: '0.75rem', color: '#92400E', fontSize: '0.875rem' }}>
                        No RFQ entries found. Please create an RFQ first in the RFQ tab.
                    </p>
                )}
                {isLoadingLabData && selectedRFQId && (
                    <p style={{ marginTop: '0.75rem', color: '#92400E', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiLoader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        Loading laboratory data...
                    </p>
                )}
            </div>

            {/* Equivalent AKP Mat Grade Section */}
            <div style={sectionBlue}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                    Equivalent AKP Mat Grade
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>FG / SG</label>
                        <input
                            type="text"
                            name="fgSg"
                            value={formData.fgSg}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter FG / SG"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Alloy Addition</label>
                        <input
                            type="text"
                            name="alloyAddition"
                            value={formData.alloyAddition}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Alloy Addition"
                            disabled={!selectedRFQId}
                        />
                    </div>
                </div>
            </div>

            {/* Special Treatment Section */}
            <div style={sectionGreen}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#15803D', fontWeight: '600' }}>
                    Special Treatment
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>RT</label>
                        <input
                            type="text"
                            name="rt"
                            value={formData.rt}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter RT"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>UT</label>
                        <input
                            type="text"
                            name="ut"
                            value={formData.ut}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter UT"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>MPI</label>
                        <input
                            type="text"
                            name="mpi"
                            value={formData.mpi}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter MPI"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>HT</label>
                        <input
                            type="text"
                            name="ht"
                            value={formData.ht}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter HT"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>DP Test</label>
                        <input
                            type="text"
                            name="dpTest"
                            value={formData.dpTest}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter DP Test"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>NABL</label>
                        <input
                            type="text"
                            name="nabl"
                            value={formData.nabl}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter NABL"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>IMPACT Test</label>
                        <input
                            type="text"
                            name="impactTest"
                            value={formData.impactTest}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter IMPACT Test"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Millipore</label>
                        <input
                            type="text"
                            name="millipore"
                            value={formData.millipore}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Millipore"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Cut Section</label>
                        <input
                            type="text"
                            name="cutSection"
                            value={formData.cutSection}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Cut Section"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Inducing Hardening</label>
                        <input
                            type="text"
                            name="inducingHardening"
                            value={formData.inducingHardening}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Inducing Hardening"
                            disabled={!selectedRFQId}
                        />
                    </div>
                </div>
            </div>

            {/* Laboratory Requirements - Separate field */}
            <div style={{ marginTop: '1.5rem' }}>
                <label style={labelStyle}>Laboratory Requirements</label>
                <textarea
                    name="laboratoryRequirements"
                    value={formData.laboratoryRequirements}
                    onChange={handleChange}
                    className="input-field"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="Enter Laboratory Requirements"
                    disabled={!selectedRFQId}
                />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <button 
                    onClick={handleSubmit} 
                    disabled={!selectedRFQId || saveMutation.isPending}
                    className="btn btn-primary btn-ripple"
                    style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        opacity: (!selectedRFQId || saveMutation.isPending) ? 0.7 : 1
                    }}
                >
                    {saveMutation.isPending && <FiLoader size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                    {saveMutation.isPending ? 'Saving...' : 'SUBMIT'}
                </button>
                <button onClick={handleClear} className="btn btn-secondary">CLEAR</button>
            </div>
        </>
    );
};

export default LaboratoryTab;
