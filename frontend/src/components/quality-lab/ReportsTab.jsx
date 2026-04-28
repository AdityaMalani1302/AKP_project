import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../../api';
import { labelStyle, sectionBlue, sectionGray, tableHeaderStyle, tableCellStyle, formatDate } from './styles';
import TableSkeleton from '../common/TableSkeleton';
import Combobox from '../common/Combobox';
import DatePicker from '../common/DatePicker';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ID_KEYS = new Set(['Id', 'ID', 'id']);

/** Preferred column order (any other keys from the API sort alphabetically after these). */
const COLUMN_PRIORITY = [
    'Date',
    'Shift',
    'InspectionTime',
    'HeatNo',
    'Grade',
    'PartNo',
    'PartName',
    'CE',
    'C',
    'Si',
    'Mn',
    'P',
    'S',
    'Cu',
    'Cr',
    'Al',
    'Pb',
    'Sn',
    'Ti',
    'Mg',
    'Mo',
    'MeltingSupervisor',
    'LabSupervisor',
    'Nodularity',
    'Graphitetype',
    'NodularityCount',
    'GraphiteSize',
    'Pearlite',
    'Ferrite',
    'Carbide',
    'CastingHardness',
    'Moisture In %',
    'Compactability In %',
    'Permeability In No',
    'Green Compression Strength',
    'Return Sand Temp',
    'TOTAL CLAY 11.0 - 14.50%',
    'ACTIVE CLAY 7.0 - 9.0%',
    'DEAD CLAY 3.0 - 4.50%',
    'VOLATILE MATTER 2.30 - 3.50%',
    'LOSS ON IGNITION 4.0 - 7.0%',
    'AFS No  45 - 55',
    'UTS N/mm²',
    'Yield Stress N/mm²',
    'Elongation %',
    'Impact In Joule(J)',
];

function sortColumnKeys(keys) {
    const pri = (k) => COLUMN_PRIORITY.indexOf(k);
    const boxNum = (k) => {
        const m = /^BoxNo(\d+)$/i.exec(k);
        return m ? parseInt(m[1], 10) : null;
    };
    return [...keys].sort((a, b) => {
        const ba = boxNum(a);
        const bb = boxNum(b);
        if (ba != null && bb != null) return ba - bb;
        if (ba != null) return 1;
        if (bb != null) return -1;
        const ia = pri(a);
        const ib = pri(b);
        const aPri = ia === -1 ? 9999 : ia;
        const bPri = ib === -1 ? 9999 : ib;
        if (aPri !== bPri) return aPri - bPri;
        return a.localeCompare(b);
    });
}

function collectColumnKeys(recordList) {
    const keySet = new Set();
    (recordList || []).forEach((r) => {
        if (!r || typeof r !== 'object') return;
        Object.keys(r).forEach((k) => {
            if (!ID_KEYS.has(k)) keySet.add(k);
        });
    });
    return sortColumnKeys([...keySet]);
}

function formatReportCell(key, value) {
    if (value == null || value === '') return '';
    if (key === 'Date') return formatDate(value);
    if (value instanceof Date) return formatDate(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

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

    const displayColumnKeys = useMemo(() => collectColumnKeys(records), [records]);

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

        const keys = collectColumnKeys(records);
        if (keys.length === 0) {
            toast.error('No columns to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const reportLabel = getReportLabel();
        const worksheet = workbook.addWorksheet(reportLabel);

        worksheet.columns = [
            { header: 'Sr. No', key: '_srNo', width: 8 },
            ...keys.map((k) => ({
                header: k,
                key: k,
                width: Math.min(Math.max(String(k).length + 2, 10), 36)
            }))
        ];

        records.forEach((record, index) => {
            const row = { _srNo: index + 1 };
            keys.forEach((key) => {
                if (key === 'Date') {
                    const d = record.Date ? new Date(record.Date) : null;
                    row[key] = d && !isNaN(d.getTime()) ? d : '';
                } else {
                    const v = record[key];
                    row[key] = v == null ? '' : v;
                }
            });
            worksheet.addRow(row);
        });

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
        headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
        headerRow.height = 24;

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
                if (rowNumber % 2 === 0) {
                    row.eachCell((cell) => {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FF' } };
                    });
                }
            }
        });

        const datePart = startDate && endDate ? `_${startDate}_to_${endDate}` : startDate ? `_from_${startDate}` : endDate ? `_to_${endDate}` : '';
        const filename = `${reportLabel.replace(/[^a-zA-Z0-9]/g, '_')}${datePart}.xlsx`;

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
        toast.success('Excel report downloaded');
    };

    const emptyColSpan = Math.max(displayColumnKeys.length + 1, 8);
    const skeletonCols = Math.min(Math.max(displayColumnKeys.length + 1, 12), 32);

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
                                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#374151', fontWeight: 'bold' }}>
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
                            <TableSkeleton rows={10} columns={skeletonCols} />
                        ) : (
                            <div style={{ overflowX: 'auto', maxHeight: '600px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#F9FAFB' }}>
                                        <tr>
                                            <th style={tableHeaderStyle}>#</th>
                                            {displayColumnKeys.map((key) => (
                                                <th
                                                    key={key}
                                                    style={tableHeaderStyle}
                                                    title={key}
                                                >
                                                    {key}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.length === 0 ? (
                                            <tr>
                                                <td colSpan={emptyColSpan} style={{ textAlign: 'center', padding: '2rem', color: '#9CA3AF' }}>
                                                    No records found matching criteria
                                                </td>
                                            </tr>
                                        ) : (
                                            records.slice(0, 500).map((record, index) => (
                                                <tr key={index} style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: index % 2 === 0 ? 'white' : '#F9FAFB' }}>
                                                    <td style={tableCellStyle}>{index + 1}</td>
                                                    {displayColumnKeys.map((key) => (
                                                        <td
                                                            key={key}
                                                            style={{ ...tableCellStyle, whiteSpace: 'nowrap', maxWidth: '12rem', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                            title={formatReportCell(key, record[key])}
                                                        >
                                                            {formatReportCell(key, record[key])}
                                                        </td>
                                                    ))}
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
