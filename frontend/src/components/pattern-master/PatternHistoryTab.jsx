import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api';
import TableSkeleton from '../common/TableSkeleton';
import Combobox from '../common/Combobox';

const fetchPatterns = async () => {
    const response = await api.get('/pattern-master/unified-data');
    return response.data;
};

const PatternHistoryTab = () => {
    const [selectedPatternNo, setSelectedPatternNo] = useState('');
    const printRef = useRef(null);

    const { data: allRecords = [], isLoading: isQueryLoading } = useQuery({
        queryKey: ['patternHistoryRecords'],
        queryFn: fetchPatterns,
        staleTime: 5 * 60 * 1000,
    });

    const patternNoOptions = useMemo(() => {
        const uniquePatternNos = [...new Set(allRecords.map(item => item.PatternNo).filter(p => p))].sort();
        return uniquePatternNos.map(patternNo => ({
            value: patternNo,
            label: patternNo
        }));
    }, [allRecords]);

    const filteredRecords = useMemo(() => {
        if (!selectedPatternNo) return [];
        return allRecords.filter(record => record.PatternNo === selectedPatternNo);
    }, [allRecords, selectedPatternNo]);

    const cellStyle = (isLabel, isAlt) => ({
        padding: '0.5rem 0.75rem',
        fontWeight: isLabel ? '500' : 'normal',
        color: '#374151',
        backgroundColor: isAlt ? '#F9FAFB' : 'white',
        borderBottom: '1px solid #E5E7EB',
        width: isLabel ? '15%' : '35%'
    });

    const handlePrint = () => {
        if (!printRef.current) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow pop-ups to print');
            return;
        }

        const printContent = printRef.current.innerHTML;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Pattern No: ${selectedPatternNo}</title>
                <style>
                    @page { 
                        size: A4; 
                        margin: 1mm; 
                    }
                    * { box-sizing: border-box; }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 0; 
                        margin: 0;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    h2 { 
                        margin: 0 0 1px 0; 
                        font-size: 7px; 
                        color: #1F2937; 
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        font-size: 3.5px; 
                        table-layout: fixed;
                    }
                    td { 
                        padding: 0px 1px; 
                        border: 0.3px solid #E5E7EB; 
                        line-height: 0.9;
                        height: 6px;
                        overflow: hidden;
                        white-space: nowrap;
                        text-overflow: ellipsis;
                    }
                    tr:nth-child(odd) td { background-color: #F9FAFB !important; }
                    tr:nth-child(even) td { background-color: white !important; }
                    td:nth-child(1), td:nth-child(3) { 
                        font-weight: 500; 
                        color: #374151;
                        width: 12%;
                    }
                    td:nth-child(2), td:nth-child(4) { 
                        width: 38%;
                    }
                    .card-header { 
                        background-color: #3B82F6 !important; 
                        color: white !important; 
                        padding: 0px 2px; 
                        font-weight: 600; 
                        font-size: 5px;
                        margin-bottom: 0; 
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        height: 8px;
                        line-height: 8px;
                    }
                    .record-card { 
                        border: 0.3px solid #E5E7EB; 
                        border-radius: 1px; 
                        overflow: visible;
                        margin-bottom: 1px;
                        page-break-inside: auto; 
                        break-inside: auto;
                    }
                    @media print {
                        body { 
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            background-color: white;
                        }
                        .card-header { 
                            background-color: #3B82F6 !important; 
                            color: white !important; 
                        }
                        tr:nth-child(odd) td { background-color: #F9FAFB !important; }
                        .print-btn { display: none !important; }
                        .preview-container { padding: 0 !important; box-shadow: none !important; }
                        tr { page-break-inside: auto; height: 6px; }
                        td { height: 6px; }
                    }
                </style>
            </head>
            <body>
                <h2>Pattern No: ${selectedPatternNo}</h2>
                ${printContent}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const getPrintStyles = () => `
        @page { 
            size: A4; 
            margin: 1mm; 
        }
        * { box-sizing: border-box; }
        body { 
            font-family: Arial, sans-serif; 
            padding: 0; 
            margin: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }
        h2 { 
            margin: 0 0 1px 0; 
            font-size: 7px; 
            color: #1F2937; 
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            font-size: 3.5px; 
            table-layout: fixed;
        }
        td { 
            padding: 0px 1px; 
            border: 0.3px solid #E5E7EB; 
            line-height: 0.9;
            height: 6px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
        tr:nth-child(odd) td { background-color: #F9FAFB !important; }
        tr:nth-child(even) td { background-color: white !important; }
        td:nth-child(1), td:nth-child(3) { 
            font-weight: 500; 
            color: #374151;
            width: 12%;
        }
        td:nth-child(2), td:nth-child(4) { 
            width: 38%;
        }
        .card-header { 
            background-color: #3B82F6 !important; 
            color: white !important; 
            padding: 0px 2px; 
            font-weight: 600; 
            font-size: 5px;
            margin-bottom: 0; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            height: 8px;
            line-height: 8px;
        }
        .record-card { 
            border: 0.3px solid #E5E7EB; 
            border-radius: 1px; 
            overflow: visible;
            margin-bottom: 1px;
            page-break-inside: auto; 
            break-inside: auto;
        }
        @media print {
            body { 
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background-color: white;
            }
            .card-header { 
                background-color: #3B82F6 !important; 
                color: white !important; 
            }
            tr:nth-child(odd) td { background-color: #F9FAFB !important; }
            .print-btn { display: none !important; }
            .preview-container { padding: 0 !important; box-shadow: none !important; }
            tr { page-break-inside: auto; height: 6px; }
            td { height: 6px; }
        }
    `;

    const handlePreview = () => {
        if (!printRef.current) return;

        const previewWindow = window.open('', '_blank');
        if (!previewWindow) {
            alert('Please allow pop-ups to preview');
            return;
        }

        const printContent = printRef.current.innerHTML;

        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Preview - Pattern No: ${selectedPatternNo}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
                    .preview-container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    table { width: 100%; border-collapse: collapse; font-size: 13px; }
                    td { padding: 8px 12px; border: 1px solid #E5E7EB; }
                    tr:nth-child(odd) td { background-color: #F9FAFB; }
                    tr:nth-child(even) td { background-color: white; }
                    td:nth-child(1), td:nth-child(3) { font-weight: 500; color: #374151; }
                    .card-header { background-color: #3B82F6; color: white; padding: 12px 16px; font-weight: 600; font-size: 14px; }
                    .record-card { margin-bottom: 30px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
                    h2 { margin-bottom: 20px; color: #1F2937; }
                    .print-btn { position: fixed; top: 20px; right: 20px; padding: 10px 20px; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
                    .print-btn:hover { background: #2563EB; }
                    ${getPrintStyles()}
                </style>
            </head>
            <body>
                <button class="print-btn" onclick="window.print()">Print</button>
                <div class="preview-container">
                    <h2>Pattern No: ${selectedPatternNo}</h2>
                    ${printContent}
                </div>
            </body>
            </html>
        `);
        previewWindow.document.close();
    };

    return (
        <div>
            <div style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Search & Select Pattern No:
                </label>
                <div style={{ maxWidth: '350px' }}>
                    <Combobox
                        value={selectedPatternNo}
                        onChange={(value) => setSelectedPatternNo(value || '')}
                        options={patternNoOptions}
                        placeholder="Type to search Pattern No..."
                    />
                </div>
            </div>

            {selectedPatternNo && (
                <div className="section-container section-gray">
                    <h3 className="section-title gray">Records for Pattern No: {selectedPatternNo} ({filteredRecords.length})</h3>

                    {isQueryLoading ? (
                        <TableSkeleton rows={5} columns={4} />
                    ) : filteredRecords.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF', fontStyle: 'italic' }}>
                            No records found
                        </div>
                    ) : (
                        <>
                        <div 
                            ref={printRef}
                            style={{ 
                                display: 'grid', 
                                gridTemplateColumns: filteredRecords.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(600px, 1fr))', 
                                gap: '1.5rem',
                                maxHeight: '700px',
                                overflowY: 'auto',
                                padding: '0.5rem'
                            }}
                        >
                            {filteredRecords.map((record) => (
                                <div 
                                    key={record.PatternId} 
                                    className="record-card"
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #E5E7EB',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Card Header */}
                                    <div 
                                        className="card-header"
                                        style={{
                                            backgroundColor: '#3B82F6',
                                            color: 'white',
                                            padding: '0.75rem 1rem',
                                            fontWeight: '600',
                                            fontSize: '0.95rem'
                                        }}
                                    >
                                        Pattern #{record.PatternId} - {record.PatternNo}
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
                                                    <td style={cellStyle(true, true)}>Customer</td>
                                                    <td style={cellStyle(false, true)}>{record.CustomerName || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Serial No</td>
                                                    <td style={cellStyle(false, true)}>{record.Serial_No || '-'}</td>
                                                </tr>
                                                {/* Row 2 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Asset No</td>
                                                    <td style={cellStyle(false, false)}>{record.Asset_No || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Rack Location</td>
                                                    <td style={cellStyle(false, false)}>{record.Rack_Location || '-'}</td>
                                                </tr>
                                                {/* Row 3 */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Customer PO No</td>
                                                    <td style={cellStyle(false, true)}>{record.Customer_Po_No || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Tooling PO Date</td>
                                                    <td style={cellStyle(false, true)}>{record.Tooling_PO_Date || '-'}</td>
                                                </tr>
                                                {/* Row 4 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Purchase No</td>
                                                    <td style={cellStyle(false, false)}>{record.Purchase_No || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Purchase Date</td>
                                                    <td style={cellStyle(false, false)}>{record.Purchase_Date || '-'}</td>
                                                </tr>
                                                {/* Row 5 - Pattern Details */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Pattern Maker</td>
                                                    <td style={cellStyle(false, true)}>{record.Pattern_Maker_Name || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Pattern Material</td>
                                                    <td style={cellStyle(false, true)}>{record.Pattern_Material_Details || '-'}</td>
                                                </tr>
                                                {/* Row 6 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>No. of Pattern Sets</td>
                                                    <td style={cellStyle(false, false)}>{record.No_Of_Patterns_Set || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Pattern Pieces</td>
                                                    <td style={cellStyle(false, false)}>{record.Pattern_Pieces || '-'}</td>
                                                </tr>
                                                {/* Row 7 */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Box Per Heat</td>
                                                    <td style={cellStyle(false, true)}>{record.Box_Per_Heat || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Quoted Est. Weight</td>
                                                    <td style={cellStyle(false, true)}>{record.Quoted_Estimated_Weight || '-'}</td>
                                                </tr>
                                                {/* Row 8 - Core Box */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Core Box Material</td>
                                                    <td style={cellStyle(false, false)}>{record.Core_Box_Material_Details || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Core Box Location</td>
                                                    <td style={cellStyle(false, false)}>{record.Core_Box_Location || '-'}</td>
                                                </tr>
                                                {/* Row 9 */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Core Box S7/F4 No</td>
                                                    <td style={cellStyle(false, true)}>{record.Core_Box_S7_F4_No || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Core Box S7/F4 Date</td>
                                                    <td style={cellStyle(false, true)}>{record.Core_Box_S7_F4_Date || '-'}</td>
                                                </tr>
                                                {/* Row 10 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>No. of Core Box Sets</td>
                                                    <td style={cellStyle(false, false)}>{record.No_Of_Core_Box_Set || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Core Box Pieces</td>
                                                    <td style={cellStyle(false, false)}>{record.Core_Box_Pieces || '-'}</td>
                                                </tr>
                                                {/* Row 11 - Casting */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Total Weight</td>
                                                    <td style={cellStyle(false, true)}>{record.Total_Weight || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Moulding Box Size</td>
                                                    <td style={cellStyle(false, true)}>{record.Moulding_Box_Size || '-'}</td>
                                                </tr>
                                                {/* Row 12 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Bunch Weight</td>
                                                    <td style={cellStyle(false, false)}>{record.Bunch_Wt || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Yield %</td>
                                                    <td style={cellStyle(false, false)}>{record.YieldPercent || '-'}</td>
                                                </tr>
                                                {/* Row 13 - Core Details */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Core Weight</td>
                                                    <td style={cellStyle(false, true)}>{record.Core_Wt || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Core Type</td>
                                                    <td style={cellStyle(false, true)}>{record.Core_Type || '-'}</td>
                                                </tr>
                                                {/* Row 14 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Shell Qty</td>
                                                    <td style={cellStyle(false, false)}>{record.shell_qty || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Cold Box Qty</td>
                                                    <td style={cellStyle(false, false)}>{record.coldBox_qty || '-'}</td>
                                                </tr>
                                                {/* Row 15 */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>No-Bake Qty</td>
                                                    <td style={cellStyle(false, true)}>{record.noBake_qty || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Main Core</td>
                                                    <td style={cellStyle(false, true)}>{record.Main_Core || '-'} {record.mainCore_qty ? `(${record.mainCore_qty})` : ''}</td>
                                                </tr>
                                                {/* Row 16 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Side Core</td>
                                                    <td style={cellStyle(false, false)}>{record.Side_Core || '-'} {record.sideCore_qty ? `(${record.sideCore_qty})` : ''}</td>
                                                    <td style={cellStyle(true, false)}>Loose Core</td>
                                                    <td style={cellStyle(false, false)}>{record.Loose_Core || '-'} {record.looseCore_qty ? `(${record.looseCore_qty})` : ''}</td>
                                                </tr>
                                                {/* Row 17 - Chaplets & Chills */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Chaplets COPE</td>
                                                    <td style={cellStyle(false, true)}>{record.Chaplets_COPE || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Chaplets DRAG</td>
                                                    <td style={cellStyle(false, true)}>{record.Chaplets_DRAG || '-'}</td>
                                                </tr>
                                                {/* Row 18 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Chills COPE</td>
                                                    <td style={cellStyle(false, false)}>{record.Chills_COPE || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Chills DRAG</td>
                                                    <td style={cellStyle(false, false)}>{record.Chills_DRAG || '-'}</td>
                                                </tr>
                                                {/* Row 19 - Moulding */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Mould Vents Size</td>
                                                    <td style={cellStyle(false, true)}>{record.Mould_Vents_Size || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Mould Vents No</td>
                                                    <td style={cellStyle(false, true)}>{record.Mould_Vents_No || '-'}</td>
                                                </tr>
                                                {/* Row 20 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Breaker Core Size</td>
                                                    <td style={cellStyle(false, false)}>{record.breaker_core_size || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Down Sprue Size</td>
                                                    <td style={cellStyle(false, false)}>{record.down_sprue_size || '-'}</td>
                                                </tr>
                                                {/* Row 21 */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Foam Filter Size</td>
                                                    <td style={cellStyle(false, true)}>{record.foam_filter_size || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Sand Riser Size</td>
                                                    <td style={cellStyle(false, true)}>{record.sand_riser_size || '-'}</td>
                                                </tr>
                                                {/* Row 22 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>No. of Sand Riser</td>
                                                    <td style={cellStyle(false, false)}>{record.no_of_sand_riser || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Ingate Size</td>
                                                    <td style={cellStyle(false, false)}>{record.ingate_size || '-'}</td>
                                                </tr>
                                                {/* Row 23 */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>No. of Ingate</td>
                                                    <td style={cellStyle(false, true)}>{record.no_of_ingate || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Runner Bar Size</td>
                                                    <td style={cellStyle(false, true)}>{record.runner_bar_size || '-'}</td>
                                                </tr>
                                                {/* Row 24 */}
                                                <tr>
                                                    <td style={cellStyle(true, false)}>Runner Bar No</td>
                                                    <td style={cellStyle(false, false)}>{record.runner_bar_no || '-'}</td>
                                                    <td style={cellStyle(true, false)}>Pattern Received</td>
                                                    <td style={cellStyle(false, false)}>{record.Pattern_Received_Date || '-'}</td>
                                                </tr>
                                                {/* Row 25 - Additional */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Rev No Status</td>
                                                    <td style={cellStyle(false, true)}>{record.rev_no_status || '-'}</td>
                                                    <td style={cellStyle(true, true)}>Date</td>
                                                    <td style={cellStyle(false, true)}>{record.date || '-'}</td>
                                                </tr>
                                                {/* Row 26 - Parts Details */}
                                                {record.parts && record.parts.length > 0 ? (
                                                    <tr>
                                                        <td style={cellStyle(true, false)}>Parts</td>
                                                        <td colSpan="3" style={{ ...cellStyle(false, false), width: '85%' }}>
                                                            {record.parts.map((part, idx) => (
                                                                <span key={idx} style={{ 
                                                                    display: 'inline-block',
                                                                    backgroundColor: '#EEF2FF',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    marginRight: '8px',
                                                                    marginBottom: '4px',
                                                                    fontSize: '0.85rem'
                                                                }}>
                                                                    <strong>{part.partNo || part.productName || `Part ${idx + 1}`}</strong>
                                                                    {' '}(Qty: {part.qty || 0}{part.weight ? `, Wt: ${part.weight}` : ''})
                                                                </span>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr>
                                                        <td style={cellStyle(true, false)}>Parts</td>
                                                        <td colSpan="3" style={{ ...cellStyle(false, false), width: '85%' }}>-</td>
                                                    </tr>
                                                )}
                                                {/* Row 27 - Sleeves Details */}
                                                {record.sleeves && record.sleeves.length > 0 ? (
                                                    <tr>
                                                        <td style={cellStyle(true, true)}>Sleeves</td>
                                                        <td colSpan="3" style={{ ...cellStyle(false, true), width: '85%' }}>
                                                            {record.sleeves.map((sleeve, idx) => (
                                                                <span key={idx} style={{ 
                                                                    display: 'inline-block',
                                                                    backgroundColor: '#FEF3C7',
                                                                    padding: '2px 8px',
                                                                    borderRadius: '4px',
                                                                    marginRight: '8px',
                                                                    marginBottom: '4px',
                                                                    fontSize: '0.85rem'
                                                                }}>
                                                                    <strong>{sleeve.sleeveName || sleeve.sleeveType || `Sleeve ${idx + 1}`}</strong>
                                                                    {sleeve.sleeveType && sleeve.sleeveName ? ` (${sleeve.sleeveType})` : ''}
                                                                    {' '}Qty: {sleeve.quantity || 0}
                                                                </span>
                                                            ))}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr>
                                                        <td style={cellStyle(true, true)}>Sleeves</td>
                                                        <td colSpan="3" style={{ ...cellStyle(false, true), width: '85%' }}>-</td>
                                                    </tr>
                                                )}
                                                {/* Row 27 - Comments */}
                                                <tr>
                                                    <td style={cellStyle(true, true)}>Comments</td>
                                                    <td colSpan="3" style={{ ...cellStyle(false, true), width: '85%' }}>{record.comment || '-'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Preview and Print Buttons */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '0.75rem', 
                            marginTop: '1.5rem',
                            paddingTop: '1rem',
                            borderTop: '1px solid #E5E7EB'
                        }}>
                            <button 
                                type="button"
                                onClick={handlePreview}
                                className="btn btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                👁️ Preview
                            </button>
                            <button 
                                type="button"
                                onClick={handlePrint}
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                🖨️ Print
                            </button>
                        </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default PatternHistoryTab;
