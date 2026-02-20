import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import TableSkeleton from '../common/TableSkeleton';
import TextTooltip from '../common/TextTooltip';
import { formatDate } from '../../styles/sharedStyles';

const UnifiedRecordsTable = ({ searchQuery, refreshTrigger, onRowClick, selectedId }) => {
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [expandedData, setExpandedData] = useState({});
    const [loadingExpand, setLoadingExpand] = useState({});

    // Fetch unified pattern data with aggregated parts/sleeves counts
    const { data: patterns = [], isLoading } = useQuery({
        queryKey: ['unified-patterns', searchQuery, refreshTrigger],
        queryFn: async () => {
            const url = searchQuery
                ? `/pattern-master/unified-data?search=${encodeURIComponent(searchQuery)}`
                : '/pattern-master/unified-data';
            const res = await api.get(url);
            return Array.isArray(res.data) ? res.data : [];
        },
        staleTime: 0
    });

    // Toggle row expansion and fetch parts/sleeves data
    const handleExpandClick = useCallback(async (e, patternId) => {
        e.stopPropagation(); // Prevent row click from firing

        if (expandedRows.has(patternId)) {
            // Collapse
            const newExpanded = new Set(expandedRows);
            newExpanded.delete(patternId);
            setExpandedRows(newExpanded);
        } else {
            // Expand - fetch parts and sleeves
            setLoadingExpand(prev => ({ ...prev, [patternId]: true }));

            try {
                const [partsRes, sleevesRes] = await Promise.all([
                    api.get(`/pattern-master/parts-by-pattern/${patternId}`),
                    api.get(`/pattern-master/sleeves-by-pattern/${patternId}`)
                ]);

                setExpandedData(prev => ({
                    ...prev,
                    [patternId]: {
                        parts: Array.isArray(partsRes.data) ? partsRes.data : [],
                        sleeves: Array.isArray(sleevesRes.data) ? sleevesRes.data : []
                    }
                }));

                const newExpanded = new Set(expandedRows);
                newExpanded.add(patternId);
                setExpandedRows(newExpanded);
            } catch (err) {
                console.error('Error fetching expanded data:', err);
            } finally {
                setLoadingExpand(prev => ({ ...prev, [patternId]: false }));
            }
        }
    }, [expandedRows]);

    // Render expanded content (parts and sleeves sub-tables)
    const renderExpandedContent = (patternId) => {
        const data = expandedData[patternId];
        if (!data) return null;

        const { parts, sleeves } = data;

        return (
            <tr>
                <td colSpan={55} style={{ padding: 0, backgroundColor: '#F8FAFC' }}>
                    <div style={{ 
                        padding: '0.75rem', 
                        display: 'flex', 
                        gap: '1.5rem', 
                        maxWidth: '1200px'
                    }}>
                        {/* Parts Sub-Table */}
                        <div style={{ flex: '1', maxWidth: '650px' }}>
                            <h4 style={{ 
                                margin: '0 0 0.5rem 0', 
                                fontSize: '0.8rem', 
                                fontWeight: '600', 
                                color: '#4F46E5',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}>
                                <span style={{ 
                                    width: '5px', 
                                    height: '5px', 
                                    backgroundColor: '#4F46E5', 
                                    borderRadius: '50%',
                                    display: 'inline-block'
                                }}></span>
                                Parts ({parts.length})
                            </h4>
                            {parts.length === 0 ? (
                                <div style={{ padding: '0.25rem', color: '#9CA3AF', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                    No parts
                                </div>
                            ) : (
                                <table style={{ 
                                    width: '100%', 
                                    borderCollapse: 'collapse', 
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                                }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#EEF2FF' }}>
                                            <th style={{ padding: '0.35rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Part No</th>
                                            <th style={{ padding: '0.35rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Product</th>
                                            <th style={{ padding: '0.35rem', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Qty</th>
                                            <th style={{ padding: '0.35rem', textAlign: 'right', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Wt</th>
                                            <th style={{ padding: '0.35rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Grade</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parts.map((part, idx) => (
                                            <tr key={part.PartRowId || idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                                                <td style={{ padding: '0.35rem', borderBottom: '1px solid #F3F4F6' }}>{part.InternalPartNo || part.PartNo}</td>
                                                <td style={{ padding: '0.35rem', borderBottom: '1px solid #F3F4F6' }}>
                                                    <TextTooltip text={part.ProdName || part.ProductName} maxLength={25} />
                                                </td>
                                                <td style={{ padding: '0.35rem', borderBottom: '1px solid #F3F4F6', textAlign: 'center' }}>{part.Qty}</td>
                                                <td style={{ padding: '0.35rem', borderBottom: '1px solid #F3F4F6', textAlign: 'right' }}>{part.Weight}</td>
                                                <td style={{ padding: '0.35rem', borderBottom: '1px solid #F3F4F6' }}>
                                                    <TextTooltip text={part.GradeName || part.MaterialGrade} maxLength={15} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Sleeves Sub-Table */}
                        <div style={{ flex: '0 0 380px' }}>
                            <h4 style={{ 
                                margin: '0 0 0.5rem 0', 
                                fontSize: '0.8rem', 
                                fontWeight: '600', 
                                color: '#0891B2',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}>
                                <span style={{ 
                                    width: '5px', 
                                    height: '5px', 
                                    backgroundColor: '#0891B2', 
                                    borderRadius: '50%',
                                    display: 'inline-block'
                                }}></span>
                                Sleeves ({sleeves.length})
                            </h4>
                            {sleeves.length === 0 ? (
                                <div style={{ padding: '0.25rem', color: '#9CA3AF', fontSize: '0.75rem', fontStyle: 'italic' }}>
                                    No sleeves
                                </div>
                            ) : (
                                <table style={{ 
                                    width: '100%', 
                                    borderCollapse: 'collapse', 
                                    fontSize: '0.75rem',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)'
                                }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#ECFEFF' }}>
                                            <th style={{ padding: '0.35rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Sleeve</th>
                                            <th style={{ padding: '0.35rem', textAlign: 'left', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Type/Size</th>
                                            <th style={{ padding: '0.35rem', textAlign: 'center', fontWeight: '600', borderBottom: '1px solid #E5E7EB' }}>Qty</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sleeves.map((sleeve, idx) => (
                                            <tr key={sleeve.SleeveRowId || idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                                                <td style={{ padding: '0.35rem', borderBottom: '1px solid #F3F4F6' }}>
                                                    <TextTooltip text={sleeve.sleeve_name} maxLength={18} />
                                                </td>
                                                <td style={{ padding: '0.35rem', borderBottom: '1px solid #F3F4F6' }}>
                                                    <TextTooltip text={sleeve.sleeve_type_size_name || sleeve.sleeve_type_size || '-'} maxLength={18} />
                                                </td>
                                                <td style={{ padding: '0.35rem', borderBottom: '1px solid #F3F4F6', textAlign: 'center' }}>{sleeve.quantity || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    // Common header cell style
    const headerCellStyle = { 
        padding: '0.75rem 0.75rem', 
        fontWeight: '600', 
        borderBottom: '2px solid #E5E7EB', 
        textAlign: 'left', 
        whiteSpace: 'nowrap', 
        backgroundColor: '#F9FAFB',
        position: 'sticky',
        top: 0,
        zIndex: 1
    };

    // Colored header style for grouped sections
    const partsHeaderStyle = { ...headerCellStyle, backgroundColor: '#EEF2FF', color: '#4F46E5' };
    const sleevesHeaderStyle = { ...headerCellStyle, backgroundColor: '#ECFEFF', color: '#0891B2' };
    const coreHeaderStyle = { ...headerCellStyle, backgroundColor: '#FEF3C7', color: '#92400E' };
    const mouldingHeaderStyle = { ...headerCellStyle, backgroundColor: '#F0FDF4', color: '#166534' };
    const chapletsHeaderStyle = { ...headerCellStyle, backgroundColor: '#FDF4FF', color: '#86198F' };

    // Common data cell style
    const cellStyle = { 
        padding: '0.5rem 0.75rem', 
        borderBottom: '1px solid #E5E7EB', 
        whiteSpace: 'nowrap' 
    };

    return (
        <div className="section-container section-gray" style={{ marginTop: '2rem' }}>
            <h3 className="section-title gray">
                Unified Pattern Records ({patterns.length} patterns) - All Columns
            </h3>

            {isLoading ? (
                <TableSkeleton rows={10} columns={20} />
            ) : (
                <div style={{ 
                    overflowX: 'auto', 
                    maxHeight: '600px', 
                    border: '1px solid #E5E7EB', 
                    borderRadius: '6px',
                    scrollBehavior: 'smooth'
                }}>
                    <table style={{ 
                        width: 'max-content', 
                        minWidth: '100%', 
                        borderCollapse: 'collapse', 
                        fontSize: '0.8rem' 
                    }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                            <tr>
                                {/* Expand Button */}
                                <th style={{ ...headerCellStyle, width: '40px', textAlign: 'center' }}></th>
                                
                                {/* Sr. No */}
                                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Sr. No</th>
                                
                                {/* Basic Info */}
                                <th style={headerCellStyle}>Pattern No</th>
                                <th style={headerCellStyle}>Customer</th>
                                <th style={headerCellStyle}>Serial No</th>
                                <th style={headerCellStyle}>Pattern Maker</th>
                                <th style={headerCellStyle}>Asset No</th>
                                <th style={headerCellStyle}>Customer PO No</th>
                                <th style={headerCellStyle}>Tooling PO Date</th>
                                <th style={headerCellStyle}>Purchase No</th>
                                <th style={headerCellStyle}>Purchase Date</th>
                                
                                {/* Parts Info (Purple) */}
                                <th style={{ ...partsHeaderStyle, textAlign: 'center' }}>Parts</th>
                                <th style={{ ...partsHeaderStyle, textAlign: 'right' }}>Part Wt (kg)</th>
                                
                                {/* Sleeves Info (Cyan) */}
                                <th style={{ ...sleevesHeaderStyle, textAlign: 'center' }}>Sleeves</th>
                                
                                {/* Pattern Details */}
                                <th style={headerCellStyle}>Quoted Est. Wt</th>
                                <th style={headerCellStyle}>Pattern Material</th>
                                <th style={headerCellStyle}>Pattern Set</th>
                                <th style={headerCellStyle}>Pattern Pieces</th>
                                <th style={headerCellStyle}>Rack Location</th>
                                <th style={headerCellStyle}>Box/Heat</th>
                                
                                {/* Core Box Details (Amber) */}
                                <th style={coreHeaderStyle}>Core Box Material</th>
                                <th style={coreHeaderStyle}>Core Box Location</th>
                                <th style={coreHeaderStyle}>CB S7F4 No</th>
                                <th style={coreHeaderStyle}>CB S7F4 Date</th>
                                <th style={coreHeaderStyle}>Core Box Set</th>
                                <th style={coreHeaderStyle}>Core Box Pieces</th>
                                
                                {/* Core Details (Amber) */}
                                <th style={coreHeaderStyle}>Core Wt</th>
                                <th style={coreHeaderStyle}>Shell Qty</th>
                                <th style={coreHeaderStyle}>Cold Box Qty</th>
                                <th style={coreHeaderStyle}>No Bake Qty</th>
                                <th style={coreHeaderStyle}>Core Type</th>
                                <th style={coreHeaderStyle}>Main Core</th>
                                <th style={coreHeaderStyle}>Side Core</th>
                                <th style={coreHeaderStyle}>Loose Core</th>
                                <th style={coreHeaderStyle}>Main Core Qty</th>
                                <th style={coreHeaderStyle}>Side Core Qty</th>
                                <th style={coreHeaderStyle}>Loose Core Qty</th>
                                
                                {/* Casting Details */}
                                <th style={headerCellStyle}>Box Size</th>
                                <th style={headerCellStyle}>Total Wt</th>
                                <th style={headerCellStyle}>Bunch Wt</th>
                                <th style={headerCellStyle}>Yield %</th>
                                
                                {/* Chaplets & Chills (Pink) */}
                                <th style={chapletsHeaderStyle}>Chaplets COPE</th>
                                <th style={chapletsHeaderStyle}>Chaplets DRAG</th>
                                <th style={chapletsHeaderStyle}>Chills COPE</th>
                                <th style={chapletsHeaderStyle}>Chills DRAG</th>
                                
                                {/* Moulding Details (Green) */}
                                <th style={mouldingHeaderStyle}>Mould Vents Size</th>
                                <th style={mouldingHeaderStyle}>Mould Vents No</th>
                                <th style={mouldingHeaderStyle}>Breaker Core Size</th>
                                <th style={mouldingHeaderStyle}>Down Sprue Size</th>
                                <th style={mouldingHeaderStyle}>Foam Filter Size</th>
                                <th style={mouldingHeaderStyle}>Sand Riser Size</th>
                                <th style={mouldingHeaderStyle}>No of Sand Riser</th>
                                <th style={mouldingHeaderStyle}>Ingate Size</th>
                                <th style={mouldingHeaderStyle}>No of Ingate</th>
                                <th style={mouldingHeaderStyle}>Runner Bar Size</th>
                                <th style={mouldingHeaderStyle}>Runner Bar No</th>
                                
                                {/* Additional Info */}
                                <th style={headerCellStyle}>Rev No/Status</th>
                                <th style={headerCellStyle}>Date</th>
                                <th style={headerCellStyle}>Comment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {patterns.length === 0 ? (
                                <tr>
                                    <td colSpan={55} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                                        No records found
                                    </td>
                                </tr>
                            ) : (
                                patterns.map((pattern, index) => (
                                    <React.Fragment key={pattern.PatternId}>
                                        <tr
                                            onClick={() => onRowClick && onRowClick(pattern)}
                                            style={{
                                                cursor: 'pointer',
                                                backgroundColor: selectedId === pattern.PatternId ? '#DBEAFE' : 'white',
                                                transition: 'background-color 0.15s'
                                            }}
                                            onMouseEnter={(e) => { if (selectedId !== pattern.PatternId) e.currentTarget.style.backgroundColor = '#F3F4F6'; }}
                                            onMouseLeave={(e) => { if (selectedId !== pattern.PatternId) e.currentTarget.style.backgroundColor = expandedRows.has(pattern.PatternId) ? '#F0FDF4' : 'white'; }}
                                        >
                                            {/* Expand/Collapse Button */}
                                            <td style={{ ...cellStyle, textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => handleExpandClick(e, pattern.PatternId)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '0.25rem',
                                                        borderRadius: '4px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s',
                                                        color: expandedRows.has(pattern.PatternId) ? '#059669' : '#6B7280',
                                                        transform: expandedRows.has(pattern.PatternId) ? 'rotate(90deg)' : 'rotate(0deg)'
                                                    }}
                                                    title={expandedRows.has(pattern.PatternId) ? 'Collapse' : 'Expand to see parts & sleeves'}
                                                >
                                                    {loadingExpand[pattern.PatternId] ? (
                                                        <span style={{ fontSize: '0.75rem' }}>⏳</span>
                                                    ) : (
                                                        <span style={{ fontSize: '1rem' }}>▶</span>
                                                    )}
                                                </button>
                                            </td>
                                            
                                            {/* Sr. No */}
                                            <td style={{ ...cellStyle, textAlign: 'center', fontWeight: '500' }}>{index + 1}</td>
                                            
                                            {/* Basic Info */}
                                            <td style={{ ...cellStyle, fontWeight: '500' }}>{pattern.PatternNo}</td>
                                            <td style={cellStyle}><TextTooltip text={pattern.CustomerName} maxLength={20} /></td>
                                            <td style={cellStyle}>{pattern.Serial_No || '-'}</td>
                                            <td style={cellStyle}><TextTooltip text={pattern.Pattern_Maker_Name} maxLength={18} /></td>
                                            <td style={cellStyle}>{pattern.Asset_No || '-'}</td>
                                            <td style={cellStyle}>{pattern.Customer_Po_No || '-'}</td>
                                            <td style={cellStyle}>{formatDate(pattern.Tooling_PO_Date)}</td>
                                            <td style={cellStyle}>{pattern.Purchase_No || '-'}</td>
                                            <td style={cellStyle}>{formatDate(pattern.Purchase_Date)}</td>
                                            
                                            {/* Parts Count - Highlighted */}
                                            <td style={{ 
                                                ...cellStyle, 
                                                textAlign: 'center',
                                                backgroundColor: pattern.TotalParts > 0 ? '#EEF2FF' : 'transparent'
                                            }}>
                                                <span style={{ 
                                                    fontWeight: pattern.TotalParts > 0 ? '600' : '400',
                                                    color: pattern.TotalParts > 0 ? '#4F46E5' : '#9CA3AF'
                                                }}>
                                                    {pattern.TotalParts || 0}
                                                </span>
                                            </td>
                                            <td style={{ 
                                                ...cellStyle, 
                                                textAlign: 'right',
                                                backgroundColor: pattern.TotalPartWeight > 0 ? '#EEF2FF' : 'transparent',
                                                color: pattern.TotalPartWeight > 0 ? '#4F46E5' : '#9CA3AF'
                                            }}>
                                                {pattern.TotalPartWeight ? parseFloat(pattern.TotalPartWeight).toFixed(2) : '-'}
                                            </td>
                                            
                                            {/* Sleeves Count - Highlighted */}
                                            <td style={{ 
                                                ...cellStyle, 
                                                textAlign: 'center',
                                                backgroundColor: pattern.TotalSleeveTypes > 0 ? '#ECFEFF' : 'transparent'
                                            }}>
                                                <span style={{ 
                                                    fontWeight: pattern.TotalSleeveTypes > 0 ? '600' : '400',
                                                    color: pattern.TotalSleeveTypes > 0 ? '#0891B2' : '#9CA3AF'
                                                }}>
                                                    {pattern.TotalSleeveTypes || 0}
                                                </span>
                                            </td>
                                            
                                            {/* Pattern Details */}
                                            <td style={cellStyle}>{pattern.Quoted_Estimated_Weight || '-'}</td>
                                            <td style={cellStyle}><TextTooltip text={pattern.Pattern_Material_Details} maxLength={15} /></td>
                                            <td style={cellStyle}>{pattern.No_Of_Patterns_Set || '-'}</td>
                                            <td style={cellStyle}>{pattern.Pattern_Pieces || '-'}</td>
                                            <td style={cellStyle}>{pattern.Rack_Location || '-'}</td>
                                            <td style={cellStyle}>{pattern.Box_Per_Heat || '-'}</td>
                                            
                                            {/* Core Box Details */}
                                            <td style={cellStyle}><TextTooltip text={pattern.Core_Box_Material_Details} maxLength={15} /></td>
                                            <td style={cellStyle}>{pattern.Core_Box_Location || '-'}</td>
                                            <td style={cellStyle}>{pattern.Core_Box_S7_F4_No || '-'}</td>
                                            <td style={cellStyle}>{formatDate(pattern.Core_Box_S7_F4_Date)}</td>
                                            <td style={cellStyle}>{pattern.No_Of_Core_Box_Set || '-'}</td>
                                            <td style={cellStyle}>{pattern.Core_Box_Pieces || '-'}</td>
                                            
                                            {/* Core Details */}
                                            <td style={cellStyle}>{pattern.Core_Wt || '-'}</td>
                                            <td style={cellStyle}>{pattern.shell_qty || '-'}</td>
                                            <td style={cellStyle}>{pattern.coldBox_qty || '-'}</td>
                                            <td style={cellStyle}>{pattern.noBake_qty || '-'}</td>
                                            <td style={cellStyle}><TextTooltip text={pattern.Core_Type} maxLength={15} /></td>
                                            <td style={cellStyle}>{pattern.Main_Core || '-'}</td>
                                            <td style={cellStyle}>{pattern.Side_Core || '-'}</td>
                                            <td style={cellStyle}>{pattern.Loose_Core || '-'}</td>
                                            <td style={cellStyle}>{pattern.mainCore_qty || '-'}</td>
                                            <td style={cellStyle}>{pattern.sideCore_qty || '-'}</td>
                                            <td style={cellStyle}>{pattern.looseCore_qty || '-'}</td>
                                            
                                            {/* Casting Details */}
                                            <td style={cellStyle}>{pattern.Moulding_Box_Size || '-'}</td>
                                            <td style={cellStyle}>{pattern.Total_Weight || '-'}</td>
                                            <td style={cellStyle}>{pattern.Bunch_Wt || '-'}</td>
                                            <td style={cellStyle}>{pattern.YieldPercent || '-'}</td>
                                            
                                            {/* Chaplets & Chills */}
                                            <td style={cellStyle}>{pattern.Chaplets_COPE || '-'}</td>
                                            <td style={cellStyle}>{pattern.Chaplets_DRAG || '-'}</td>
                                            <td style={cellStyle}>{pattern.Chills_COPE || '-'}</td>
                                            <td style={cellStyle}>{pattern.Chills_DRAG || '-'}</td>
                                            
                                            {/* Moulding Details */}
                                            <td style={cellStyle}>{pattern.Mould_Vents_Size || '-'}</td>
                                            <td style={cellStyle}>{pattern.Mould_Vents_No || '-'}</td>
                                            <td style={cellStyle}>{pattern.breaker_core_size || '-'}</td>
                                            <td style={cellStyle}>{pattern.down_sprue_size || '-'}</td>
                                            <td style={cellStyle}>{pattern.foam_filter_size || '-'}</td>
                                            <td style={cellStyle}>{pattern.sand_riser_size || '-'}</td>
                                            <td style={cellStyle}>{pattern.no_of_sand_riser || '-'}</td>
                                            <td style={cellStyle}>{pattern.ingate_size || '-'}</td>
                                            <td style={cellStyle}>{pattern.no_of_ingate || '-'}</td>
                                            <td style={cellStyle}>{pattern.runner_bar_size || '-'}</td>
                                            <td style={cellStyle}>{pattern.runner_bar_no || '-'}</td>
                                            
                                            {/* Additional Info */}
                                            <td style={cellStyle}>{pattern.rev_no_status || '-'}</td>
                                            <td style={cellStyle}>{formatDate(pattern.date)}</td>
                                            <td style={cellStyle}><TextTooltip text={pattern.comment} maxLength={20} /></td>
                                        </tr>
                                        {/* Expanded Row Content */}
                                        {expandedRows.has(pattern.PatternId) && renderExpandedContent(pattern.PatternId)}
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {selectedId && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#DBEAFE', borderRadius: '0.375rem', fontSize: '0.875rem', color: '#1E40AF' }}>
                    <strong>Selected Pattern ID: {selectedId}</strong> - Click DELETE to remove or CLEAR to deselect.
                </div>
            )}
        </div>
    );
};

export default UnifiedRecordsTable;
