import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, inputStyle, sectionBlue, sectionGray, tableHeaderStyle, tableCellStyle, formatDate } from './styles';
import TableSkeleton from '../common/TableSkeleton';
import Combobox from '../common/Combobox';
import DatePicker from '../common/DatePicker';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ReportsTab = () => {
    const [reportType, setReportType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Options for Report Type
    const reportTypeOptions = [
        { value: 'physical', label: 'Physical Properties' },
        { value: 'microstructure', label: 'Microstructure & Hardness' },
        { value: 'sand', label: 'Sand Properties' },
        { value: 'chemistry', label: 'Chemistry (Spectro)' },
        { value: 'mould', label: 'Mould Hardness' }
    ];

    const endpoints = {
        physical: '/quality-lab/physical-properties',
        microstructure: '/quality-lab/microstructure',
        sand: '/quality-lab/sand',
        chemistry: '/quality-lab/chemistry',
        mould: '/quality-lab/mould-hardness'
    };

    // Column definitions per report type for Excel export
    const columnDefs = {
        physical: [
            { header: 'Sr. No', key: '_srNo', width: 8 },
            { header: 'Date', key: 'Date', width: 14 },
            { header: 'Heat No', key: 'HeatNo', width: 15 },
            { header: 'Grade', key: 'Grade', width: 12 },
            { header: 'Part No', key: 'PartNo', width: 18 },
            { header: 'UTS (N/mm²)', key: 'UTS N/mm²', width: 14 },
            { header: 'Yield Stress (N/mm²)', key: 'Yield Stress N/mm²', width: 20 },
            { header: 'Elongation (%)', key: 'Elongation %', width: 15 },
            { header: 'Impact (Joule)', key: 'Impact In Joule(J)', width: 15 },
        ],
        microstructure: [
            { header: 'Sr. No', key: '_srNo', width: 8 },
            { header: 'Date', key: 'Date', width: 14 },
            { header: 'Heat No', key: 'HeatNo', width: 15 },
            { header: 'Grade', key: 'Grade', width: 12 },
            { header: 'Part No', key: 'PartNo', width: 18 },
            { header: 'Nodularity', key: 'Nodularity', width: 12 },
            { header: 'Graphite Type', key: 'Graphitetype', width: 14 },
            { header: 'Nodularity Count', key: 'NodularityCount', width: 16 },
            { header: 'Graphite Size', key: 'GraphiteSize', width: 14 },
            { header: 'Pearlite', key: 'Pearlite', width: 10 },
            { header: 'Ferrite', key: 'Ferrite', width: 10 },
            { header: 'Carbide', key: 'Carbide', width: 10 },
            { header: 'Casting Hardness', key: 'CastingHardness', width: 16 },
        ],
        sand: [
            { header: 'Sr. No', key: '_srNo', width: 8 },
            { header: 'Date', key: 'Date', width: 14 },
            { header: 'Shift', key: 'Shift', width: 10 },
            { header: 'Time', key: 'InspectionTime', width: 10 },
            { header: 'Heat/Batch No', key: 'HeatNo', width: 15 },
            { header: 'Part No', key: 'PartNo', width: 18 },
            { header: 'Moisture (%)', key: 'Moisture In %', width: 14 },
            { header: 'Compactability (%)', key: 'Compactability In %', width: 18 },
            { header: 'Permeability', key: 'Permeability In No', width: 14 },
            { header: 'GCS', key: 'Green Compression Strength', width: 10 },
            { header: 'Active Clay', key: 'ACTIVE CLAY 7.0 - 9.0%', width: 14 },
            { header: 'Dead Clay', key: 'DEAD CLAY 3.0 - 4.50%', width: 14 },
        ],
        chemistry: [
            { header: 'Sr. No', key: '_srNo', width: 8 },
            { header: 'Date', key: 'Date', width: 14 },
            { header: 'Heat No', key: 'HeatNo', width: 15 },
            { header: 'Grade', key: 'Grade', width: 12 },
            { header: 'Part No', key: 'PartNo', width: 18 },
            { header: 'C', key: 'C', width: 8 },
            { header: 'Si', key: 'Si', width: 8 },
            { header: 'Mn', key: 'Mn', width: 8 },
            { header: 'P', key: 'P', width: 8 },
            { header: 'S', key: 'S', width: 8 },
            { header: 'Mg', key: 'Mg', width: 8 },
            { header: 'Cr', key: 'Cr', width: 8 },
            { header: 'Cu', key: 'Cu', width: 8 },
        ],
        mould: [
            { header: 'Sr. No', key: '_srNo', width: 8 },
            { header: 'Date', key: 'Date', width: 14 },
            { header: 'Heat No', key: 'HeatNo', width: 15 },
            { header: 'Part No', key: 'PartNo', width: 18 },
            { header: 'Box 1', key: 'BoxNo1', width: 10 },
            { header: 'Box 2', key: 'BoxNo2', width: 10 },
            { header: 'Box 3', key: 'BoxNo3', width: 10 },
            { header: 'Box 4', key: 'BoxNo4', width: 10 },
            { header: 'Box 5', key: 'BoxNo5', width: 10 },
        ],
    };

    // Fetch Records - when report type is selected, fetch records with date filters
    const { data: records = [], isLoading, isError } = useQuery({
        queryKey: ['qualityLab-reports', reportType, startDate, endDate],
        queryFn: async () => {
            const endpoint = endpoints[reportType];
            if (!endpoint) return [];
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (!startDate && !endDate) params.append('allTime', 'true');
            const res = await api.get(`${endpoint}?${params.toString()}`);
            return res.data;
        },
        enabled: !!reportType
    });

    if (isError) {
        toast.error('Failed to load report data');
    }

    const getReportLabel = () => {
        const opt = reportTypeOptions.find(o => o.value === reportType);
        return opt ? opt.label : 'Report';
    };

    const handleExport = async () => {
        if (records.length === 0) {
            toast.warning('No records to export');
            return;
        }

        const cols = columnDefs[reportType];
        if (!cols) {
            toast.error('Unknown report type');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const reportLabel = getReportLabel();
        const worksheet = workbook.addWorksheet(reportLabel);

        // Set columns from definitions
        worksheet.columns = cols;

        // Add rows with sr no and formatted date
        records.forEach((record, index) => {
            const row = {};
            cols.forEach(col => {
                if (col.key === '_srNo') {
                    row._srNo = index + 1;
                } else if (col.key === 'Date') {
                    const d = record.Date ? new Date(record.Date) : null;
                    row.Date = d && !isNaN(d.getTime()) ? d : '';
                } else {
                    row[col.key] = record[col.key] ?? '';
                }
            });
            worksheet.addRow(row);
        });

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 24;

        // Format date column and add borders
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
            if (rowNumber > 1) {
                const dateCell = row.getCell('Date');
                if (dateCell && dateCell.value instanceof Date) {
                    dateCell.numFmt = 'dd/mm/yyyy';
                }
                // Alternate row color
                if (rowNumber % 2 === 0) {
                    row.eachCell((cell) => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FF' } };
                    });
                }
            }
        });

        // Build filename
        const datePart = startDate && endDate ? `_${startDate}_to_${endDate}` : startDate ? `_from_${startDate}` : endDate ? `_to_${endDate}` : '';
        const filename = `${reportLabel.replace(/[^a-zA-Z0-9]/g, '_')}${datePart}.xlsx`;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
        toast.success('Excel report downloaded');
    };

    // Helper to render table headers dynamically
    const renderTableHeaders = () => {
        switch (reportType) {
            case 'physical':
                return (
                    <>
                        <th style={tableHeaderStyle}>Date</th>
                        <th style={tableHeaderStyle}>Heat No</th>
                        <th style={tableHeaderStyle}>Grade</th>
                        <th style={tableHeaderStyle}>Part No</th>
                        <th style={tableHeaderStyle}>UTS</th>
                        <th style={tableHeaderStyle}>Yield Stress</th>
                        <th style={tableHeaderStyle}>Elongation</th>
                        <th style={tableHeaderStyle}>Impact</th>
                    </>
                );
            case 'microstructure':
                return (
                    <>
                        <th style={tableHeaderStyle}>Date</th>
                        <th style={tableHeaderStyle}>Heat No</th>
                        <th style={tableHeaderStyle}>Grade</th>
                        <th style={tableHeaderStyle}>Part No</th>
                        <th style={tableHeaderStyle}>Nodul.</th>
                        <th style={tableHeaderStyle}>Graph. Type</th>
                        <th style={tableHeaderStyle}>Nodul. Count</th>
                        <th style={tableHeaderStyle}>Graph. Size</th>
                        <th style={tableHeaderStyle}>Pearlite</th>
                        <th style={tableHeaderStyle}>Ferrite</th>
                        <th style={tableHeaderStyle}>Carbide</th>
                        <th style={tableHeaderStyle}>Hardness</th>
                    </>
                );
            case 'sand':
                return (
                    <>
                        <th style={tableHeaderStyle}>Date</th>
                        <th style={tableHeaderStyle}>Shift</th>
                        <th style={tableHeaderStyle}>Time</th>
                        <th style={tableHeaderStyle}>Heat/Batch</th>
                        <th style={tableHeaderStyle}>Part No</th>
                        <th style={tableHeaderStyle}>Moisture</th>
                        <th style={tableHeaderStyle}>Compact.</th>
                        <th style={tableHeaderStyle}>Perm.</th>
                        <th style={tableHeaderStyle}>GCS</th>
                        <th style={tableHeaderStyle}>Active Clay</th>
                        <th style={tableHeaderStyle}>Dead Clay</th>
                    </>
                );
            case 'chemistry':
                return (
                    <>
                        <th style={tableHeaderStyle}>Date</th>
                        <th style={tableHeaderStyle}>Heat No</th>
                        <th style={tableHeaderStyle}>Grade</th>
                        <th style={tableHeaderStyle}>Part No</th>
                        <th style={tableHeaderStyle}>C</th>
                        <th style={tableHeaderStyle}>Si</th>
                        <th style={tableHeaderStyle}>Mn</th>
                        <th style={tableHeaderStyle}>P</th>
                        <th style={tableHeaderStyle}>S</th>
                        <th style={tableHeaderStyle}>Mg</th>
                        <th style={tableHeaderStyle}>Cr</th>
                        <th style={tableHeaderStyle}>Cu</th>
                    </>
                );
            case 'mould':
                return (
                    <>
                        <th style={tableHeaderStyle}>Date</th>
                        <th style={tableHeaderStyle}>Heat No</th>
                        <th style={tableHeaderStyle}>Part No</th>
                        <th style={tableHeaderStyle}>Box 1</th>
                        <th style={tableHeaderStyle}>Box 2</th>
                        <th style={tableHeaderStyle}>Box 3</th>
                        <th style={tableHeaderStyle}>Box 4</th>
                        <th style={tableHeaderStyle}>Box 5</th>
                    </>
                );
            default:
                return null;
        }
    };

    // Helper to render table rows dynamically
    const renderTableRows = (record, index) => {
        const commonStyle = { ...tableCellStyle, whiteSpace: 'nowrap' };
        switch (reportType) {
            case 'physical':
                return (
                    <>
                        <td style={commonStyle}>{formatDate(record.Date)}</td>
                        <td style={commonStyle}>{record.HeatNo}</td>
                        <td style={commonStyle}>{record.Grade}</td>
                        <td style={commonStyle}>{record.PartNo}</td>
                        <td style={commonStyle}>{record['UTS N/mm²']}</td>
                        <td style={commonStyle}>{record['Yield Stress N/mm²']}</td>
                        <td style={commonStyle}>{record['Elongation %']}</td>
                        <td style={commonStyle}>{record['Impact In Joule(J)']}</td>
                    </>
                );
            case 'microstructure':
                return (
                    <>
                        <td style={commonStyle}>{formatDate(record.Date)}</td>
                        <td style={commonStyle}>{record.HeatNo}</td>
                        <td style={commonStyle}>{record.Grade}</td>
                        <td style={commonStyle}>{record.PartNo}</td>
                        <td style={commonStyle}>{record.Nodularity}</td>
                        <td style={commonStyle}>{record.Graphitetype}</td>
                        <td style={commonStyle}>{record.NodularityCount}</td>
                        <td style={commonStyle}>{record.GraphiteSize}</td>
                        <td style={commonStyle}>{record.Pearlite}</td>
                        <td style={commonStyle}>{record.Ferrite}</td>
                        <td style={commonStyle}>{record.Carbide}</td>
                        <td style={commonStyle}>{record.CastingHardness}</td>
                    </>
                );
            case 'sand':
                return (
                    <>
                        <td style={commonStyle}>{formatDate(record.Date)}</td>
                        <td style={commonStyle}>{record.Shift}</td>
                        <td style={commonStyle}>{record.InspectionTime}</td>
                        <td style={commonStyle}>{record.HeatNo}</td>
                        <td style={commonStyle}>{record.PartNo}</td>
                        <td style={commonStyle}>{record['Moisture In %']}</td>
                        <td style={commonStyle}>{record['Compactability In %']}</td>
                        <td style={commonStyle}>{record['Permeability In No']}</td>
                        <td style={commonStyle}>{record['Green Compression Strength']}</td>
                        <td style={commonStyle}>{record['ACTIVE CLAY 7.0 - 9.0%']}</td>
                        <td style={commonStyle}>{record['DEAD CLAY 3.0 - 4.50%']}</td>
                    </>
                );
            case 'chemistry':
                return (
                    <>
                        <td style={commonStyle}>{formatDate(record.Date)}</td>
                        <td style={commonStyle}>{record.HeatNo}</td>
                        <td style={commonStyle}>{record.Grade}</td>
                        <td style={commonStyle}>{record.PartNo}</td>
                        <td style={commonStyle}>{record.C}</td>
                        <td style={commonStyle}>{record.Si}</td>
                        <td style={commonStyle}>{record.Mn}</td>
                        <td style={commonStyle}>{record.P}</td>
                        <td style={commonStyle}>{record.S}</td>
                        <td style={commonStyle}>{record.Mg}</td>
                        <td style={commonStyle}>{record.Cr}</td>
                        <td style={commonStyle}>{record.Cu}</td>
                    </>
                );
            case 'mould':
                return (
                    <>
                        <td style={commonStyle}>{formatDate(record.Date)}</td>
                        <td style={commonStyle}>{record.HeatNo}</td>
                        <td style={commonStyle}>{record.PartNo}</td>
                        <td style={commonStyle}>{record.BoxNo1}</td>
                        <td style={commonStyle}>{record.BoxNo2}</td>
                        <td style={commonStyle}>{record.BoxNo3}</td>
                        <td style={commonStyle}>{record.BoxNo4}</td>
                        <td style={commonStyle}>{record.BoxNo5}</td>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ padding: '1rem' }}>
            {/* Report Type Selector + Date Filters */}
            <div style={sectionBlue}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem', color: '#0369A1', fontWeight: '600' }}>
                    Select Report
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                    <div>
                        <label style={labelStyle}>Report Type</label>
                        <Combobox
                            options={reportTypeOptions}
                            value={reportType}
                            onChange={(val) => setReportType(val)}
                            placeholder="Select Report Type"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Start Date</label>
                        <DatePicker
                            name="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>End Date</label>
                        <DatePicker
                            name="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <button
                            onClick={handleExport}
                            disabled={!reportType || records.length === 0 || isLoading}
                            className="btn btn-success btn-ripple"
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                        >
                            📥 Download Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Records Section */}
            <div style={{ ...sectionGray, marginTop: '1.5rem' }}>

                {/* Data Display Logic */}
                {!reportType ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                        <div>
                            <p style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '0.5rem' }}>
                                Please select a Report Type to view records
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#374151', fontWeight: '600' }}>
                                    {getReportLabel()} — Records Found: {records.length}
                                    {startDate && endDate && (
                                        <span style={{ fontWeight: '400', color: '#6B7280', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                                            ({startDate} to {endDate})
                                        </span>
                                    )}
                                </h3>
                                {records.length > 500 && (
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#B45309' }}>
                                        Showing first 500 records. Use date filters to narrow down.
                                    </p>
                                )}
                            </div>
                        </div>

                        {isLoading ? (
                            <TableSkeleton rows={10} columns={8} />
                        ) : (
                            <div style={{ overflowX: 'auto', maxHeight: '600px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#F9FAFB' }}>
                                        <tr>
                                            <th style={tableHeaderStyle}>#</th>
                                            {renderTableHeaders()}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.length === 0 ? (
                                            <tr>
                                                <td colSpan="15" style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                                                    No records found matching criteria
                                                </td>
                                            </tr>
                                        ) : (
                                            records.slice(0, 500).map((record, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                    <td style={tableCellStyle}>{index + 1}</td>
                                                    {renderTableRows(record, index)}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ReportsTab;
