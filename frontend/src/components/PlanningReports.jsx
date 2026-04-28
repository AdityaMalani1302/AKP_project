import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import Combobox from './common/Combobox';
import DatePicker from './common/DatePicker';
import TableSkeleton from './common/TableSkeleton';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const REPORT_COLUMNS = [
    { key: 'ItemCode', label: 'Product Code' },
    { key: 'RawMatName', label: 'Product Name' },
    { key: 'custname', label: 'Customer Name' },
    { key: 'PurchaseVendor', label: 'Purchase Vendor Name' },
    { key: 'SubconName', label: 'Subcon Name' },
    { key: 'RawMachine', label: 'Process Type' },
    { key: 'Weight', label: 'Product Weight' },
    { key: 'Price', label: 'Price' },
    { key: 'Grade', label: 'Grade' },
    { key: 'cavity', label: 'Cavity' },
    { key: 'Yield', label: 'Yield %' },
    { key: 'ScheduledQty', label: 'Scheduled Quantity' },
    { key: 'ScheduledWt', label: 'Scheduled Weight' },
    { key: 'FixBox', label: 'Fix Boxes' },
    { key: 'INhStock', label: 'Inhouse Stock Qty' },
    { key: 'FetStock', label: 'Subcon Fettling Stock' },
    { key: 'TotalInH', label: 'Total Inhouse Qty' },
    { key: 'InHouseWt', label: 'Inhouse Stock Weight' },
    { key: 'MCSubStockQty', label: 'SubCon M/C Qty' },
    { key: 'MCSubStockWt', label: 'SubCon M/C Weight' },
    { key: 'TobeProductionQty', label: 'To be Produced Qty' },
    { key: 'TobeProductionWt', label: 'To be Produced Weight' },
    { key: 'ProductionQTY', label: 'Poured Qty (OK Qty)' },
    { key: 'BalToPour', label: 'Balance to Poured' },
    { key: 'BoxesReq', label: 'Boxes Required' },
    { key: 'BalBoxReq', label: 'Balance to Boxes' },
    { key: 'DespQty', label: 'Despatch Qty' },
    { key: 'BalWt', label: 'Balance Weight' },
    { key: 'BalValue', label: 'Balance Value' },
];

const NUMERIC_KEYS = new Set([
    'Weight', 'Price', 'cavity', 'Yield',
    'ScheduledQty', 'ScheduledWt', 'FixBox',
    'INhStock', 'FetStock', 'TotalInH', 'InHouseWt',
    'MCSubStockQty', 'MCSubStockWt',
    'TobeProductionQty', 'TobeProductionWt',
    'ProductionQTY', 'BalToPour', 'BoxesReq', 'BalBoxReq',
    'DespQty', 'BalWt', 'BalValue',
]);

const thStyle = {
    padding: '0.75rem 1rem',
    fontWeight: '600',
    textAlign: 'left',
    whiteSpace: 'nowrap',
    borderBottom: '2px solid #E5E7EB',
    backgroundColor: '#F9FAFB',
    fontSize: '0.875rem',
    color: '#374151',
};

const tdStyle = {
    padding: '0.5rem 1rem',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #E5E7EB',
    fontSize: '0.85rem',
    color: '#374151',
};

function formatCell(key, value) {
    if (value == null || value === '') return '';
    if (NUMERIC_KEYS.has(key)) {
        const n = Number(value);
        if (isNaN(n)) return String(value);
        return Number.isInteger(n) ? n.toLocaleString('en-IN') : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
}

const PlanningReports = () => {
    const [partNo, setPartNo] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [filters, setFilters] = useState({ fromDate: '', toDate: '', partNo: '' });

    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const res = await api.get('/products?search=');
            return res.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const partNoOptions = useMemo(() => {
        if (!Array.isArray(products)) return [];
        const options = products
            .filter((p) => p.InternalPartNo && p.InternalPartNo.trim() !== '')
            .map((p) => ({
                value: p.InternalPartNo,
                label: p.InternalPartNo,
            }));
        return [{ value: 'ALL', label: 'ALL' }, ...options];
    }, [products]);

    const { data: records = [], isLoading, isError } = useQuery({
        queryKey: ['planning-reports', filters.fromDate, filters.toDate, filters.partNo],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.append('fromDate', filters.fromDate);
            params.append('toDate', filters.toDate);
            if (filters.partNo && filters.partNo !== 'ALL') {
                params.append('partNo', filters.partNo);
            }
            const res = await api.get(`/planning/reports?${params.toString()}`);
            return res.data;
        },
        enabled: submitted && !!filters.fromDate && !!filters.toDate,
        staleTime: 2 * 60 * 1000,
    });

    useEffect(() => {
        if (isError && submitted) {
            toast.error('Failed to load planning report');
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
        setFilters({ fromDate, toDate, partNo });
        setSubmitted(true);
    }, [fromDate, toDate, partNo]);

    const handleClear = useCallback(() => {
        setFromDate('');
        setToDate('');
        setPartNo('');
        setSubmitted(false);
    }, []);

    const handleExport = useCallback(async () => {
        if (records.length === 0) {
            toast.warning('No records to export');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Planning Report');

        worksheet.columns = [
            { header: 'Sr. No', key: '_srNo', width: 8 },
            ...REPORT_COLUMNS.map((c) => ({
                header: c.label,
                key: c.key,
                width: Math.min(Math.max(c.label.length + 4, 12), 28),
            })),
        ];

        records.forEach((record, index) => {
            const row = { _srNo: index + 1 };
            REPORT_COLUMNS.forEach(({ key }) => {
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

        const filename = `Planning_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`;
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, filename);
        toast.success('Excel report downloaded');
    }, [records, filters]);

    return (
        <>
            <div className="section-container section-blue" style={{ marginBottom: '1.5rem' }}>
                <h3 className="section-title blue">Reports</h3>
                <form onSubmit={handleSubmit} className="form-grid">
                    <div className="form-group">
                        <Combobox
                            label="Part No"
                            options={partNoOptions}
                            value={partNo}
                            onChange={setPartNo}
                            placeholder="All Parts (optional)"
                        />
                    </div>
                    <div className="form-group">
                        <label
                            htmlFor="reports-from-date"
                            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}
                        >
                            From date
                        </label>
                        <DatePicker
                            id="reports-from-date"
                            name="fromDate"
                            value={fromDate}
                            onChange={(ev) => setFromDate(ev.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label
                            htmlFor="reports-to-date"
                            style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}
                        >
                            To date
                        </label>
                        <DatePicker
                            id="reports-to-date"
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
                                📥 Excel
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
                    <TableSkeleton rows={10} columns={REPORT_COLUMNS.length + 1} />
                ) : (
                    <div
                        style={{
                            border: '1px solid #E5E7EB',
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
                            }}
                        >
                            <thead
                                style={{
                                    position: 'sticky',
                                    top: 0,
                                    backgroundColor: '#F9FAFB',
                                    zIndex: 10,
                                }}
                            >
                                <tr>
                                    <th style={thStyle}>#</th>
                                    {REPORT_COLUMNS.map((col) => (
                                        <th key={col.key} style={thStyle}>
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!submitted ? (
                                    <tr>
                                        <td
                                            colSpan={REPORT_COLUMNS.length + 1}
                                            style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.875rem' }}
                                        >
                                            Select date range and click Submit to view report
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={REPORT_COLUMNS.length + 1}
                                            style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.875rem' }}
                                        >
                                            No records found for the selected criteria
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            style={{
                                                backgroundColor: idx % 2 === 0 ? 'white' : '#F9FAFB',
                                                borderBottom: '1px solid #E5E7EB',
                                            }}
                                        >
                                            <td style={tdStyle}>{idx + 1}</td>
                                            {REPORT_COLUMNS.map((col) => (
                                                <td
                                                    key={col.key}
                                                    style={{
                                                        ...tdStyle,
                                                        textAlign: NUMERIC_KEYS.has(col.key) ? 'right' : 'left',
                                                    }}
                                                    title={row[col.key] != null ? String(row[col.key]) : ''}
                                                >
                                                    {formatCell(col.key, row[col.key])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default PlanningReports;
