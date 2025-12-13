import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import TableSkeleton from './common/TableSkeleton';

const fetchRecords = async () => {
    const response = await api.get('/lab-master');
    return response.data;
};

const Melting = () => {
    const [selectedDrgNo, setSelectedDrgNo] = useState('');

    const { data: allRecords = [], isLoading: isQueryLoading } = useQuery({
        queryKey: ['meltingRecords'],
        queryFn: fetchRecords,
        staleTime: 5 * 60 * 1000,
    });

    const drgNos = useMemo(() => {
        return [...new Set(allRecords.map(item => item.DrgNo).filter(drg => drg))].sort();
    }, [allRecords]);

    const filteredRecords = useMemo(() => {
        if (!selectedDrgNo) return [];
        return allRecords.filter(record => record.DrgNo === selectedDrgNo);
    }, [allRecords, selectedDrgNo]);

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Melting Records</h2>

            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Select Drawing No (Drg No):
                </label>
                <select
                    value={selectedDrgNo}
                    onChange={(e) => setSelectedDrgNo(e.target.value)}
                    className="input-field"
                    style={{ maxWidth: '300px' }}
                >
                    <option value="">-- Select Drg No --</option>
                    {drgNos.map((drg, index) => (
                        <option key={index} value={drg}>
                            {drg}
                        </option>
                    ))}
                </select>
            </div>

            {selectedDrgNo && (
                <div className="section-container section-gray">
                    <h3 className="section-title gray">Records for Drg No: {selectedDrgNo} ({filteredRecords.length})</h3>

                    {isQueryLoading ? (
                        <TableSkeleton rows={5} columns={4} />
                    ) : filteredRecords.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                            No records found
                        </div>
                    ) : (
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
                            gap: '1.5rem',
                            maxHeight: '700px',
                            overflowY: 'auto',
                            padding: '0.5rem'
                        }}>
                            {filteredRecords.map((record) => (
                                <div 
                                    key={record.LabMasterId} 
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #E5E7EB',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Card Header */}
                                    <div style={{
                                        backgroundColor: '#3B82F6',
                                        color: 'white',
                                        padding: '0.75rem 1rem',
                                        fontWeight: '600',
                                        fontSize: '0.95rem'
                                    }}>
                                        Record #{record.LabMasterId}
                                    </div>
                                    
                                    {/* Card Body - Vertical Layout */}
                                    <div style={{ padding: '0.5rem 0' }}>
                                        {[
                                            { label: 'Customer', value: record.Customer },
                                            { label: 'Drg No', value: record.DrgNo },
                                            { label: 'Description', value: record.Description },
                                            { label: 'Grade', value: record.Grade },
                                            { label: 'Part Weight', value: record.PartWeight },
                                            { label: 'Min/Max Thickness', value: record.MinMaxThickness },
                                            { label: 'Thickness Group', value: record.ThicknessGroup },
                                            { label: 'Base C', value: record.BaseChe_C },
                                            { label: 'Base Si', value: record.BaseChe_Si },
                                            { label: 'C', value: record.C },
                                            { label: 'Si', value: record.Si },
                                            { label: 'Mn', value: record.Mn },
                                            { label: 'P', value: record.P },
                                            { label: 'S', value: record.S },
                                            { label: 'Cr', value: record.Cr },
                                            { label: 'Cu', value: record.Cu },
                                            { label: 'Mg', value: record.Mg_Chem || record.Mg },
                                            { label: 'CE', value: record.CE },
                                            { label: 'CRCA', value: record.CRCA },
                                            { label: 'RR', value: record.RR },
                                            { label: 'PIG', value: record.PIG },
                                            { label: 'MS', value: record.MS },
                                            { label: 'Mg Mix', value: record.Mg_Mix },
                                            { label: 'Regular/Critical', value: record.RegularCritical },
                                            { label: 'Last Box Temp', value: record.LastBoxTemp },
                                            { label: 'Remarks', value: record.Remarks },
                                        ].map((item, idx) => (
                                            <div 
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    padding: '0.5rem 1rem',
                                                    backgroundColor: idx % 2 === 0 ? '#F9FAFB' : 'white',
                                                    borderBottom: '1px solid #F3F4F6',
                                                    fontSize: '0.875rem'
                                                }}
                                            >
                                                <span style={{ 
                                                    fontWeight: '500', 
                                                    color: '#374151',
                                                    minWidth: '120px'
                                                }}>
                                                    {item.label}
                                                </span>
                                                <span style={{ 
                                                    color: '#1F2937',
                                                    textAlign: 'right',
                                                    maxWidth: '200px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {item.value || '-'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Melting;
