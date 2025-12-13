import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import TableSkeleton from '../common/TableSkeleton';
import TextTooltip from '../common/TextTooltip';

const PartsTable = ({ searchQuery, refreshTrigger }) => {
    const { data: parts = [], isLoading } = useQuery({
        queryKey: ['pattern-parts', searchQuery, refreshTrigger],
        queryFn: async () => {
            const url = searchQuery
                ? `/pattern-master/data/parts?search=${encodeURIComponent(searchQuery)}`
                : '/pattern-master/data/parts';
            const res = await api.get(url);
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 0 // Ensure fresh data on trigger
    });

    return (
        <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
            <h3 className="section-title gray">Pattern Part Records</h3>
            
            {isLoading ? (
                <TableSkeleton rows={5} columns={7} />
            ) : (
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#F9FAFB', zIndex: 1 }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>ID</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Pattern No</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Part No</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Product Name</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Qty</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Weight</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', borderBottom: '2px solid #E5E7EB' }}>Material Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>No parts found</td>
                                </tr>
                            ) : (
                                parts.map((part) => (
                                    <tr 
                                        key={part.PartRowId} 
                                        style={{ transition: 'background-color 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                                    >
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{part.PartRowId}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{part.PatternNo}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{part.PartNo}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>
                                            <TextTooltip text={part.ProductName} maxLength={25} />
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{part.Qty}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{part.Weight}</td>
                                        <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>{part.MaterialGrade}</td>
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

export default PartsTable;
