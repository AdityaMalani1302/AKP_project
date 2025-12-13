import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import TableSkeleton from '../common/TableSkeleton';
import TextTooltip from '../common/TextTooltip';

const SleevesTable = ({ searchQuery, refreshTrigger }) => {
    const { data: sleeves = [], isLoading } = useQuery({
        queryKey: ['pattern-sleeves', searchQuery, refreshTrigger],
        queryFn: async () => {
            const url = searchQuery
                ? `/pattern-master/data/sleeves?search=${encodeURIComponent(searchQuery)}`
                : '/pattern-master/data/sleeves';
            const res = await api.get(url);
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 0 // Ensure fresh data on trigger
    });

    return (
        <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
            <h3 className="section-title gray">Sleeve Master Records</h3>
            
            {isLoading ? (
                <TableSkeleton rows={5} columns={5} />
            ) : (
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB', zIndex: 1 }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>ID</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Pattern No</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Sleeve Name</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Type/Size</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Quantity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sleeves.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No sleeves found</td>
                                </tr>
                            ) : (
                                sleeves.map((sleeve) => (
                                    <tr 
                                        key={sleeve.SleeveRowId} 
                                        style={{ transition: 'background-color 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{sleeve.SleeveRowId}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{sleeve.PatternNo}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>
                                            <TextTooltip text={sleeve.sleeve_name} maxLength={25} />
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{sleeve.sleeve_type_size}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{sleeve.quantity}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SleevesTable;
