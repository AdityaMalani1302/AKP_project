import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import Combobox from '../common/Combobox';
import TableSkeleton from '../common/TableSkeleton';
import { FiPaperclip, FiExternalLink } from 'react-icons/fi';

const DrawingDetailsTab = () => {
    const [selectedDrawingNo, setSelectedDrawingNo] = useState('');

    // Fetch all drawing master records
    const { data: allRecords = [], isLoading: isQueryLoading } = useQuery({
        queryKey: ['drawingMasterRecords'],
        queryFn: async () => {
            const response = await api.get('/drawing-master');
            return response.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    // Create options for Combobox (unique drawing numbers)
    const drawingNoOptions = useMemo(() => {
        if (!Array.isArray(allRecords)) return [];
        const uniqueDrawingNos = [...new Set(allRecords.map(item => item.DrawingNo).filter(drg => drg))].sort();
        return uniqueDrawingNos.map(drg => {
            const record = allRecords.find(r => r.DrawingNo === drg);
            return {
                value: drg,
                label: `${drg} - ${record?.Customer || ''}`
            };
        });
    }, [allRecords]);

    // Filter records based on selected drawing number
    const filteredRecords = useMemo(() => {
        if (!selectedDrawingNo || !Array.isArray(allRecords)) return [];
        return allRecords.filter(record => record.DrawingNo === selectedDrawingNo);
    }, [allRecords, selectedDrawingNo]);

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Drawing Details</h2>

            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Search & Select Drawing No (Drg No):
                </label>
                <div style={{ maxWidth: '350px' }}>
                    <Combobox
                        value={selectedDrawingNo}
                        onChange={(value) => setSelectedDrawingNo(value || '')}
                        options={drawingNoOptions}
                        placeholder="Type to search Drg No..."
                    />
                </div>
            </div>

            {selectedDrawingNo && (
                <div className="section-container section-gray">
                    <h3 className="section-title gray">Records for Drg No: {selectedDrawingNo} ({filteredRecords.length})</h3>

                    {isQueryLoading ? (
                        <TableSkeleton rows={3} columns={4} />
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
                                    key={record.DrawingMasterId} 
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
                                        Drawing #{record.DrawingMasterId} - {record.DrawingNo}
                                    </div>
                                    
                                    {/* Card Body - Two Column Table Layout */}
                                    <div style={{ padding: '0' }}>
                                        <table style={{ 
                                            width: '100%', 
                                            borderCollapse: 'collapse',
                                            fontSize: '0.875rem'
                                        }}>
                                            <tbody>
                                                {/* Row 1 - Serial No & Customer */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '20%' }}>Serial No</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', width: '30%' }}>{record.No || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB', width: '20%' }}>Customer</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', width: '30%' }}>{record.Customer || '-'}</td>
                                                </tr>
                                                {/* Row 2 - Rev No & Description */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Rev No</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.RevNo || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Description</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Description || '-'}</td>
                                                </tr>
                                                {/* Row 3 - Customer Grade & AKP Grade */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>Customer Grade</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.CustomerGrade || '-'}</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>AKP Grade</td>
                                                    <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>{record.AKPGrade || '-'}</td>
                                                </tr>
                                                {/* Row 4 - Remarks */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Remarks</td>
                                                    <td colSpan="3" style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Remarks || '-'}</td>
                                                </tr>
                                                {/* Row 4 - Comments (full width) */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: 'white', borderBottom: '1px solid #E5E7EB' }}>Comments</td>
                                                    <td colSpan="3" style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: 'white' }}>{record.Comments || '-'}</td>
                                                </tr>
                                                {/* Row 5 - Attachment */}
                                                <tr>
                                                    <td style={{ padding: '0.5rem 0.75rem', fontWeight: '500', color: '#374151', backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <FiPaperclip /> Attachment
                                                        </span>
                                                    </td>
                                                    <td colSpan="3" style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                                                        {record.AttachmentName ? (
                                                            <a 
                                                                href={`${api.defaults.baseURL}/drawing-master/attachment/${record.DrawingMasterId}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '0.5rem',
                                                                    color: '#2563EB',
                                                                    textDecoration: 'none',
                                                                    fontWeight: '500',
                                                                    padding: '0.25rem 0.5rem',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: '#EFF6FF',
                                                                    border: '1px solid #BFDBFE',
                                                                    transition: 'all 0.2s ease'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.target.style.backgroundColor = '#DBEAFE';
                                                                    e.target.style.borderColor = '#93C5FD';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.target.style.backgroundColor = '#EFF6FF';
                                                                    e.target.style.borderColor = '#BFDBFE';
                                                                }}
                                                            >
                                                                <FiExternalLink size={14} />
                                                                {record.AttachmentName}
                                                            </a>
                                                        ) : (
                                                            <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No attachment</span>
                                                        )}
                                                    </td>
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

export default DrawingDetailsTab;
