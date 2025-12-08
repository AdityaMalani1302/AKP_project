import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import api from '../api';
import DataTable from './common/DataTable';
import TableSkeleton from './common/TableSkeleton';
import TextTooltip from './common/TextTooltip';

const fetchRecords = async () => {
    const response = await api.get('/lab-master');
    return response.data;
};

const columnHelper = createColumnHelper();

const Melting = () => {
    const [selectedDrgNo, setSelectedDrgNo] = useState('');

    const { data: allRecords = [], isLoading: isQueryLoading } = useQuery({
        queryKey: ['meltingRecords'],
        queryFn: fetchRecords,
        staleTime: 5 * 60 * 1000,
    });

    const drgNos = useMemo(() => {
        return [...new Set(allRecords.map(item => item.DrgNo).filter(drg => drg))].sort();
    }, [allRecords]);

    const filteredRecords = useMemo(() => {
        if (!selectedDrgNo) return [];
        return allRecords.filter(record => record.DrgNo === selectedDrgNo);
    }, [allRecords, selectedDrgNo]);

    const columns = useMemo(() => [
        columnHelper.accessor('LabMasterId', {
            header: 'ID',
            size: 60,
            minWidth: 60,
        }),
        columnHelper.accessor('Customer', {
            header: 'Customer',
            size: 150,
            minWidth: 150,
            cell: info => <TextTooltip text={info.getValue()} maxLength={15} />
        }),
        columnHelper.accessor('DrgNo', {
            header: 'Drg No',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('Description', {
            header: 'Description',
            size: 200,
            minWidth: 200,
            cell: info => <TextTooltip text={info.getValue()} maxLength={20} />
        }),
        columnHelper.accessor('Grade', {
            header: 'Grade',
            size: 100,
            minWidth: 100,
        }),
        columnHelper.accessor('PartWeight', {
            header: 'Part Wt',
            size: 100,
            minWidth: 100,
            meta: { isNumeric: true }
        }),
        columnHelper.accessor('MinMaxThickness', {
            header: 'Min/Max Thk',
            size: 120,
            minWidth: 120,
        }),
        columnHelper.accessor('ThicknessGroup', {
            header: 'Thk Group',
            size: 120,
            minWidth: 120,
        }),
        columnHelper.accessor('BaseChe_C', { header: 'Base C', size: 80, minWidth: 80 }),
        columnHelper.accessor('BaseChe_Si', { header: 'Base Si', size: 80, minWidth: 80 }),
        columnHelper.accessor('C', { header: 'C', size: 80, minWidth: 80 }),
        columnHelper.accessor('Si', { header: 'Si', size: 80, minWidth: 80 }),
        columnHelper.accessor('Mn', { header: 'Mn', size: 80, minWidth: 80 }),
        columnHelper.accessor('P', { header: 'P', size: 80, minWidth: 80 }),
        columnHelper.accessor('S', { header: 'S', size: 80, minWidth: 80 }),
        columnHelper.accessor('Cr', { header: 'Cr', size: 80, minWidth: 80 }),
        columnHelper.accessor('Cu', { header: 'Cu', size: 80, minWidth: 80 }),
        columnHelper.accessor('Mg_Chem', {
            header: 'Mg',
            size: 80,
            minWidth: 80,
            cell: info => info.getValue() || info.row.original.Mg // Fallback
        }),
        columnHelper.accessor('CE', { header: 'CE', size: 80, minWidth: 80 }),
        columnHelper.accessor('CRCA', { header: 'CRCA', size: 100, minWidth: 100 }),
        columnHelper.accessor('RR', { header: 'RR', size: 100, minWidth: 100 }),
        columnHelper.accessor('PIG', { header: 'PIG', size: 100, minWidth: 100 }),
        columnHelper.accessor('MS', { header: 'MS', size: 100, minWidth: 100 }),
        columnHelper.accessor('Mg_Mix', { header: 'Mg Mix', size: 100, minWidth: 100 }),
        columnHelper.accessor('RegularCritical', { header: 'Reg/Crit', size: 120, minWidth: 120 }),
        columnHelper.accessor('LastBoxTemp', { header: 'Last Box Temp', size: 120, minWidth: 120 }),
        columnHelper.accessor('Remarks', {
            header: 'Remarks',
            size: 200,
            minWidth: 200,
            cell: info => <TextTooltip text={info.getValue()} maxLength={25} />
        }),
    ], []);

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Melting Records</h2>

            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
                    Select Drawing No (Drg No):
                </label>
                <select
                    value={selectedDrgNo}
                    onChange={(e) => setSelectedDrgNo(e.target.value)}
                    className="input-field"
                    style={{ maxWidth: '300px' }}
                >
                    <option value="">-- Select Drg No --</option>
                    {drgNos.map((drg, index) => (
                        <option key={index} value={drg}>
                            {drg}
                        </option>
                    ))}
                </select>
            </div>

            {selectedDrgNo && (
                <div className="section-container section-gray">
                    <h3 className="section-title gray">Records for Drg No: {selectedDrgNo} ({filteredRecords.length})</h3>

                    {isQueryLoading ? (
                        <TableSkeleton rows={5} columns={20} />
                    ) : (
                        <DataTable
                            data={filteredRecords}
                            columns={columns}
                            maxHeight="600px" // Pass specific height if needed
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default Melting;
