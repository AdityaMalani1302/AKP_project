import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import TableSkeleton from './common/TableSkeleton';
import Combobox from './common/Combobox';

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

    const drgNoOptions = useMemo(() => {
        const uniqueDrgNos = [...new Set(allRecords.map(item => item.DrgNo).filter(drg => drg))].sort();
        return uniqueDrgNos.map(drg => ({
            value: drg,
            label: drg
        }));
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
                    Search & Select Drawing No (Drg No):
                </label>
                <div style={{ maxWidth: '350px' }}>
                    <Combobox
                        value={selectedDrgNo}
                        onChange={(value) => setSelectedDrgNo(value || '')}
                        options={drgNoOptions}
                        placeholder="Type to search Drg No..."
                    />
                </div>
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
                            gridTemplateColumns: filteredRecords.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(500px, 1fr))', 
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
                                    
                                    {/* Card Body - Two Column Table Layout */}
                                    <div style={{ padding: '0' }}>
                                        <table style={{ 
                                            width: '100%', 
                                            borderCollapse: 'collapse',
                                            fontSize: '0.875rem'
                                        }}>
                                            <tbody>
                                                {/* Row 1 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '15%' }}>Customer</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', width: '35%' }}>{record.Customer || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '15%' }}> C</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', width: '35%' }}>{record.C || '-'}</td>
                                                </tr>
                                                {/* Row 2 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Drg No</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.DrgNo || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}> Si</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Si || '-'}</td>
                                                </tr>
                                                {/* Row 3 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>Description</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.Description || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}> Mn</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.Mn || '-'}</td>
                                                </tr>
                                                {/* Row 4 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Grade</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Grade || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}> P</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.P || '-'}</td>
                                                </tr>
                                                {/* Row 5 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>CRCA</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.CRCA || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}> S</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.S || '-'}</td>
                                                </tr>
                                                {/* Row 6 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>MS</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.MS || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}> Cr</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Cr || '-'}</td>
                                                </tr>
                                                {/* Row 7 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>PIG</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.PIG || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}> Cu</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.Cu || '-'}</td>
                                                </tr>
                                                {/* Row 8 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>RR</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.RR || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}> CE</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.CE || '-'}</td>
                                                </tr>
                                                {/* Row 9 - Nickel */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#374151', backgroundColor: '#FEF9C3', borderBottom: '1px solid #E5E7EB' }}>Base C</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', backgroundColor: '#FEF9C3' }}>{record.BaseChe_C || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>Nickel</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.Nickel || '-'}</td>
                                                </tr>
                                                {/* Row 10 - Moly */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', color: '#374151', backgroundColor: '#D9F99D', borderBottom: '1px solid #E5E7EB' }}>Base Si</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '600', borderBottom: '1px solid #E5E7EB', backgroundColor: '#D9F99D' }}>{record.BaseChe_Si || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Moly</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Moly || '-'}</td>
                                                </tr>
                                                {/* Row 11 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>Part Weight</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.PartWeight || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>Min/Max Thickness</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.MinMaxThickness || '-'}</td>
                                                </tr>
                                                {/* Row 12 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Thickness Group</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.ThicknessGroup || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Mg Mix</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Mg_Mix || '-'}</td>
                                                </tr>
                                                {/* Row 13 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>Mg</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.Mg_Chem || record.Mg || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>Last Box Temp</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.LastBoxTemp || '-'}</td>
                                                </tr>
                                                {/* Row 14 */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Remarks</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Remarks || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Regular/Critical</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.RegularCritical || '-'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
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
