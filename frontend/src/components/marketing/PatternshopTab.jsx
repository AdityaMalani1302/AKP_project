import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, sectionBlue, sectionGreen, sectionOrange, sectionPurple } from './styles';
import Combobox from '../common/Combobox';
import { FiLoader } from 'react-icons/fi';
import '../../App.css';

const PatternshopTab = () => {
    const [selectedRFQId, setSelectedRFQId] = useState('');
    const [selectedRFQDetails, setSelectedRFQDetails] = useState(null);
    
    const [formData, setFormData] = useState({
        lineBox: '',
        matchPlateSpecial: '',
        matchPlateRegular: '',
        cavity: '',
        shellCoreWt: '',
        coldBoxWt: '',
        coreWt: '',
        customerRequirement: '',
        ourFeasibilityCastingTolerance: '',
        npdFoundryRequirements: ''
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

    // Fetch patternshop data for selected RFQ
    const { data: patternshopData, isLoading: isLoadingPatternData } = useQuery({
        queryKey: ['patternshopData', selectedRFQId],
        queryFn: async () => {
            if (!selectedRFQId) return null;
            const response = await api.get(`/marketing/patternshop/by-rfq/${selectedRFQId}`);
            return response.data;
        },
        enabled: !!selectedRFQId
    });

    // Update form when patternshop data is fetched
    useEffect(() => {
        if (patternshopData) {
            setFormData({
                lineBox: patternshopData.LineBox || '',
                matchPlateSpecial: patternshopData.MatchPlateSpecial || '',
                matchPlateRegular: patternshopData.MatchPlateRegular || '',
                cavity: patternshopData.Cavity || '',
                shellCoreWt: patternshopData.ShellCoreWt || '',
                coldBoxWt: patternshopData.ColdBoxWt || '',
                coreWt: patternshopData.CoreWt || '',
                customerRequirement: patternshopData.CustomerRequirement || '',
                ourFeasibilityCastingTolerance: patternshopData.OurFeasibilityCastingTolerance || '',
                npdFoundryRequirements: patternshopData.NPDFoundryRequirements || ''
            });
        } else if (selectedRFQId) {
            // Clear form when no existing data for selected RFQ
            handleClearForm();
        }
    }, [patternshopData, selectedRFQId]);

    // Update selected RFQ details when selection changes
    useEffect(() => {
        if (selectedRFQId) {
            const rfq = rfqList.find(r => r.RFQId === parseInt(selectedRFQId));
            setSelectedRFQDetails(rfq || null);
        } else {
            setSelectedRFQDetails(null);
        }
    }, [selectedRFQId, rfqList]);

    // Save patternshop data mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            return api.post('/marketing/patternshop', {
                RFQId: parseInt(selectedRFQId),
                LineBox: data.lineBox,
                Cavity: data.cavity,
                CoreWt: data.coreWt,
                MatchPlateSpecial: data.matchPlateSpecial,
                MatchPlateRegular: data.matchPlateRegular,
                ShellCoreWt: data.shellCoreWt,
                ColdBoxWt: data.coldBoxWt,
                CustomerRequirement: data.customerRequirement,
                OurFeasibilityCastingTolerance: data.ourFeasibilityCastingTolerance,
                NPDFoundryRequirements: data.npdFoundryRequirements
            });
        },
        onSuccess: (response) => {
            toast.success(response.data.message || 'Patternshop data saved successfully!');
            queryClient.invalidateQueries(['patternshopData', selectedRFQId]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to save patternshop data');
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
            lineBox: '',
            matchPlateSpecial: '',
            matchPlateRegular: '',
            cavity: '',
            shellCoreWt: '',
            coldBoxWt: '',
            coreWt: '',
            customerRequirement: '',
            ourFeasibilityCastingTolerance: '',
            npdFoundryRequirements: ''
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
                {isLoadingPatternData && selectedRFQId && (
                    <p style={{ marginTop: '0.75rem', color: '#92400E', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiLoader size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        Loading patternshop data...
                    </p>
                )}
            </div>

            {/* Line/Box Field */}
            <div style={sectionBlue}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                    Basic Information
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>Line / Box</label>
                        <input
                            type="text"
                            name="lineBox"
                            value={formData.lineBox}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Line / Box"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Cavity</label>
                        <input
                            type="text"
                            name="cavity"
                            value={formData.cavity}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Cavity"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Core Wt</label>
                        <input
                            type="text"
                            name="coreWt"
                            value={formData.coreWt}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Core Wt"
                            disabled={!selectedRFQId}
                        />
                    </div>
                </div>
            </div>

            {/* Match Plate Section */}
            <div style={sectionGreen}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#15803D', fontWeight: '600' }}>
                    Match Plate
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>Special</label>
                        <input
                            type="text"
                            name="matchPlateSpecial"
                            value={formData.matchPlateSpecial}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Special"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Regular</label>
                        <input
                            type="text"
                            name="matchPlateRegular"
                            value={formData.matchPlateRegular}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Regular"
                            disabled={!selectedRFQId}
                        />
                    </div>
                </div>
            </div>

            {/* Core Type Section */}
            <div style={sectionOrange}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#C2410C', fontWeight: '600' }}>
                    Core Type
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>Shell Core Wt</label>
                        <input
                            type="text"
                            name="shellCoreWt"
                            value={formData.shellCoreWt}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Shell Core Wt"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Cold Box Wt</label>
                        <input
                            type="text"
                            name="coldBoxWt"
                            value={formData.coldBoxWt}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Cold Box Wt"
                            disabled={!selectedRFQId}
                        />
                    </div>
                </div>
            </div>

            {/* Casting Tolerance CGCT Section */}
            <div style={sectionPurple}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#7C3AED', fontWeight: '600' }}>
                    Casting Tolerance CGCT
                </h3>
                <div className="form-grid">
                    <div>
                        <label style={labelStyle}>Customer Requirement</label>
                        <input
                            type="text"
                            name="customerRequirement"
                            value={formData.customerRequirement}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Customer Requirement"
                            disabled={!selectedRFQId}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Our Feasibility Casting Tolerance</label>
                        <input
                            type="text"
                            name="ourFeasibilityCastingTolerance"
                            value={formData.ourFeasibilityCastingTolerance}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="Enter Our Feasibility Casting Tolerance"
                            disabled={!selectedRFQId}
                        />
                    </div>
                </div>
            </div>

            {/* NPD Foundry Requirements - Separate field */}
            <div style={{ marginTop: '1.5rem' }}>
                <label style={labelStyle}>NPD Foundry Requirements</label>
                <textarea
                    name="npdFoundryRequirements"
                    value={formData.npdFoundryRequirements}
                    onChange={handleChange}
                    className="input-field"
                    style={{ minHeight: '100px', resize: 'vertical' }}
                    placeholder="Enter NPD Foundry Requirements"
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

export default PatternshopTab;
