import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import Combobox from './common/Combobox';
import DatePicker from './common/DatePicker';
import TableSkeleton from './common/TableSkeleton';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const BOXES_COLUMNS = [
    { key: 'PatternNo', label: 'Pattern No', align: 'left', width: '140px', sum: false },
    { key: 'CustomerName', label: 'Customer Name', align: 'left', width: '180px', sum: false },
    { key: 'ScheduleQty', label: 'Schedule Qty', align: 'right', width: '130px', sum: true },
    { key: 'Cavity', label: 'Cavity', align: 'right', width: '80px', sum: false },
    { key: 'MouldBoxSize', label: 'Box Size', align: 'left', width: '120px', sum: false },
    { key: 'BoxPerHeat', label: 'Box Per Heat', align: 'right', width: '130px', sum: false },
    { key: 'NoOfHeats', label: 'No of Heats', align: 'right', width: '130px', sum: true },
    { key: 'TotalBoxes', label: 'Total Boxes', align: 'right', width: '130px', sum: true },
];

const COL_COUNT = BOXES_COLUMNS.length + 1;
const headerStyle = (align) => ({
    padding: '0.75rem 1rem',
    fontWeight: '600',
    textAlign: align,
    whiteSpace: 'nowrap',
    borderBottom: '2px solid #D1D5DB',
    backgroundColor: '#EFF6FF',
    fontSize: '0.8125rem',
    color: '#1E3A5F',
    letterSpacing: '0.025em',
});

const cellStyle = (align, isEven) => ({
    padding: '0.625rem 1rem',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #E5E7EB',
    fontSize: '0.8125rem',
    color: '#374151',
    textAlign: align,
    backgroundColor: isEven ? '#F9FAFB' : 'white',
});

function formatCell(key, value, isNumeric) {
    if (value == null || value === '') return '-';
    if (!isNumeric) return String(value);
    const n = Number(value);
    if (isNaN(n)) return String(value);
    return Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const BoxesCalculationReport = () => {
    const [patternNo, setPatternNo] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [filters, setFilters] = useState({ fromDate: '', toDate: '', patternNo: '' });

    const { data: patterns = [] } = useQuery({
        queryKey: ['pattern-numbers'],
        queryFn: async () => {
            const res = await api.get('/pattern-master/numbers');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const patternNoOptions = useMemo(() => {
        if (!Array.isArray(patterns)) return [];
        const options = patterns.map((p) => ({
            value: p.PatternNo,
            label: p.PatternNo ? `${p.PatternNo} - ${p.CustomerName || ''}` : '',
        }));
        return [{ value: 'ALL', label: 'ALL Patterns' }, ...options.filter(o => o.label)];
    }, [patterns]);

    const { data: records = [], isLoading, isError } = useQuery({
        queryKey: ['boxes-calculation-report', filters.fromDate, filters.toDate, filters.patternNo],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('fromDate', filters.fromDate);
            params.append('toDate', filters.toDate);
            if (filters.patternNo && filters.patternNo !== 'ALL') {
                params.append('patternNo', filters.patternNo);
            }
            const res = await api.get(`/planning/boxes-calculation?${params.toString()}`);
            return res.data;
        },
        enabled: submitted && !!filters.fromDate && !!filters.toDate,
        staleTime: 2 * 60 * 1000,
    });

    useEffect(() => {
        if (isError && submitted) {
            toast.error('Failed to load boxes calculation report');
        }
    }, [isError, submitted]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        if (!fromDate || !toDate) {
            toast.warning('Please select both From and To dates');
            return;
        }
        if (fromDate > toDate) {
            toast.warning('From Date must be before or equal to To Date');
            return;
        }
        setFilters({ fromDate, toDate, patternNo });
        setSubmitted(true);
    }, [fromDate, toDate, patternNo]);

    const handleClear = useCallback(() => {
        setFromDate('');
        setToDate('');
        setPatternNo('');
        setSubmitted(false);
    }, []);

    const handleExport = useCallback(async () => {
        if (records.length === 0) {
            toast.warning('No records to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Boxes Calculation Report');

        worksheet.columns = [
            { header: 'Sr. No', key: '_srNo', width: 8 },
            ...BOXES_COLUMNS.map((c) => ({
                header: c.label,
                key: c.key,
                width: Math.min(Math.max(c.label.length + 4, 12), 28),
            })),
        ];

        records.forEach((record, index) => {
            const row = { _srNo: index + 1 };
            BOXES_COLUMNS.forEach(({ key }) => {
                const v = record[key];
                row[key] = v == null ? '' : v;
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
                    top: { style: 'thin' }, left: { style: 'thin' },
                    bottom: { style: 'thin' }, right: { style: 'thin' },
                };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
            if (rowNumber > 1 && rowNumber % 2 === 0) {
                row.eachCell((cell) => {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F7FF' } };
                });
            }
        });

        const filename = `Boxes_Calculation_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`;
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
        toast.success('Excel report downloaded');
    }, [records, filters]);

    return (
        <>
            <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title blue">Boxes Calculation Report</h3>
                <form onSubmit={handleSubmit} className="form-grid">
                    <div className="form-group">
                        <Combobox
                            label="Pattern No"
                            options={patternNoOptions}
                            value={patternNo}
                            onChange={setPatternNo}
                            placeholder="Select Pattern No..."
                        />
                    </div>
                    <div className="form-group">
                        <label
                            htmlFor="boxes-from-date"
                            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}
                        >
                            From date
                        </label>
                        <DatePicker
                            id="boxes-from-date"
                            name="fromDate"
                            value={fromDate}
                            onChange={(ev) => setFromDate(ev.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label
                            htmlFor="boxes-to-date"
                            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}
                        >
                            To date
                        </label>
                        <DatePicker
                            id="boxes-to-date"
                            name="toDate"
                            value={toDate}
                            onChange={(ev) => setToDate(ev.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Loading...' : 'Submit'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={handleClear}>
                            Clear
                        </button>
                        {submitted && records.length > 0 && (
                            <button type="button" className="btn btn-success" onClick={handleExport}>
                                Excel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="section-container section-gray">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="section-title gray" style={{ margin: 0 }}>
                        Records {submitted && !isLoading ? `(${records.length})` : ''}
                    </h3>
                </div>

                {isLoading ? (
                    <TableSkeleton rows={10} columns={COL_COUNT} />
                ) : (
                    <div
                        style={{
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            overflow: 'auto',
                            maxHeight: '600px',
                        }}
                    >
                        <table
                            style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                minWidth: 'max-content',
                                tableLayout: 'auto',
                            }}
                        >
                            <colgroup>
                                <col style={{ width: '50px' }} />
                                {BOXES_COLUMNS.map((col) => (
                                    <col key={col.key} style={{ width: col.width }} />
                                ))}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th style={headerStyle('center')}>#</th>
                                    {BOXES_COLUMNS.map((col) => (
                                        <th key={col.key} style={headerStyle(col.align)}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!submitted ? (
                                    <tr>
                                        <td
                                            colSpan={COL_COUNT}
                                            style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.875rem' }}
                                        >
                                            Select date range and click Submit to view report
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={COL_COUNT}
                                            style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.875rem' }}
                                        >
                                            No records found for the selected criteria
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((row, idx) => (
                                        <tr key={idx}>
                                            <td style={cellStyle('center', idx % 2 !== 0)}>{idx + 1}</td>
                                            {BOXES_COLUMNS.map((col) => (
                                                <td
                                                    key={col.key}
                                                    style={cellStyle(col.align, idx % 2 !== 0)}
                                                    title={row[col.key] != null ? String(row[col.key]) : ''}
                                                >
                                                    {formatCell(col.key, row[col.key], col.sum)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {submitted && records.length > 0 && (
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid #6B7280' }}>
                                        <td style={{ ...cellStyle('center', false), fontWeight: '700', backgroundColor: '#EFF6FF', borderTop: '2px solid #6B7280' }}>Total</td>
                                        {BOXES_COLUMNS.map((col) => (
                                            <td
                                                key={col.key}
                                                style={{
                                                    ...cellStyle(col.align, false),
                                                    fontWeight: '700',
                                                    backgroundColor: '#EFF6FF',
                                                    borderTop: '2px solid #6B7280',
                                                }}
                                            >
                                                {col.sum
                                                    ? formatCell(col.key, records.reduce((sum, r) => sum + (Number(r[col.key]) || 0), 0), true)
                                                    : ''}
                                            </td>
                                        ))}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default BoxesCalculationReport;
