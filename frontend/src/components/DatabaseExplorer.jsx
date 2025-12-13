import React, { useState, useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Select from 'react-select';
import { toast } from 'sonner';
import api from '../api';
import TableSkeleton from './common/TableSkeleton';

const fetchTables = async () => {
    const res = await api.get('/tables');
    return res.data.sort((a, b) => a.localeCompare(b));
};

const fetchTableData = async (tableName, page, limit) => {
    if (!tableName) return { data: [], total: 0 };
    const res = await api.get(`/tables/${tableName}?page=${page}&limit=${limit}`);
    return res.data;
};

const DatabaseExplorer = () => {
    const [selectedTable, setSelectedTable] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);

    // Fetch Tables List
    const { data: tables = [], isError: isTablesError } = useQuery({
        queryKey: ['dbTables'],
        queryFn: fetchTables,
        staleTime: 10 * 60 * 1000,
    });

    // Fetch Table Data
    const {
        data: tableDataResponse = { data: [], total: 0 },
        isLoading: isDataLoading,
        isError: isDataError,
        isFetching: isDataFetching
    } = useQuery({
        queryKey: ['tableData', selectedTable, page, limit],
        queryFn: () => fetchTableData(selectedTable, page, limit),
        placeholderData: keepPreviousData,
        enabled: !!selectedTable,
    });

    const { data: rows, total } = tableDataResponse;

    // Derived State
    const totalPages = Math.ceil(total / limit);
    const tableOptions = tables.map(t => ({ value: t, label: t }));

    // Dynamic Columns from data
    const columnKeys = useMemo(() => {
        if (!rows || rows.length === 0) return [];
        return Object.keys(rows[0]);
    }, [rows]);

    const handleTableChange = (selectedOption) => {
        setSelectedTable(selectedOption ? selectedOption.value : '');
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setPage(newPage);
    };

    const thStyle = { padding: '0.75rem 1rem', fontWeight: '600', borderBottom: '2px solid #E5E7EB', textAlign: 'left', whiteSpace: 'nowrap', backgroundColor: '#F9FAFB' };
    const tdStyle = { padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB', whiteSpace: 'nowrap' };

    return (
        <div className="card">
            <div className="page-header">
                <h2 className="page-title">
                    Database Explorer
                    {selectedTable === 'ICSOFT' && (
                        <span className="text-xs font-medium" style={{
                            backgroundColor: '#ECFDF5',
                            color: '#059669',
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            marginLeft: '0.75rem',
                            verticalAlign: 'middle',
                            border: '1px solid #A7F3D0'
                        }}>
                            ● Live Sync
                        </span>
                    )}
                </h2>
                <p className="page-subtitle">View and analyze data from your connected databases.</p>
            </div>

            <div className="flex items-center gap-lg mb-xl p-lg" style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-100)'
            }}>
                <div style={{ flex: 1, maxWidth: '400px' }}>
                    <label className="text-sm font-medium mb-sm" style={{ display: 'block', color: 'var(--text-secondary)' }}>
                        Select Table
                    </label>
                    <Select
                        value={selectedTable ? { value: selectedTable, label: selectedTable } : null}
                        onChange={handleTableChange}
                        options={tableOptions}
                        placeholder="Search & Select Table..."
                        isClearable
                        styles={{
                            control: (base, state) => ({
                                ...base,
                                borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
                                minHeight: '42px',
                                fontSize: '0.875rem',
                                boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
                                '&:hover': { borderColor: state.isFocused ? '#3B82F6' : '#9CA3AF' }
                            }),
                            menu: (base) => ({ ...base, zIndex: 9999 }),
                            option: (base, state) => ({
                                ...base,
                                fontSize: '0.875rem',
                                backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#EFF6FF' : 'white',
                                color: state.isSelected ? 'white' : '#374151'
                            })
                        }}
                    />
                </div>
            </div>

            {isDataError && (
                <div className="p-lg mb-lg" style={{
                    backgroundColor: 'var(--color-red-50)',
                    border: '1px solid var(--color-red-200)',
                    color: 'var(--color-red-800)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    Failed to fetch table data. Please try again.
                </div>
            )}

            {selectedTable && (
                <div>
                    <div className="flex justify-between items-center mb-lg">
                        <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)', margin: 0 }}>
                            Data in <span style={{ color: 'var(--color-blue-600)' }}>{selectedTable}</span>
                            <span className="text-sm text-secondary font-medium" style={{ marginLeft: '0.5rem' }}>
                                ({total} records)
                            </span>
                        </h3>

                        {/* Pagination Controls */}
                        <div className="flex gap-sm items-center pagination-controls" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1 || isDataFetching}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                            >
                                Previous
                            </button>
                            <span style={{ fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap' }}>
                                Page {page} of {totalPages || 1}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages || totalPages === 0 || isDataFetching}
                                className="btn btn-secondary"
                                style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                            >
                                Next
                            </button>
                        </div>
                    </div>

                    {isDataLoading ? (
                        <TableSkeleton rows={10} columns={5} />
                    ) : rows.length === 0 ? (
                        <div style={{
                            textAlign: 'center',
                            padding: '3rem',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '0.5rem',
                            border: '1px dashed #D1D5DB',
                            color: '#6B7280'
                        }}>
                            No data found in this table.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid #E5E7EB', borderRadius: '6px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                        {columnKeys.map(key => (
                                            <th key={key} style={thStyle}>{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} style={{ backgroundColor: 'white' }}>
                                            {columnKeys.map(key => {
                                                const val = row[key];
                                                let displayVal;
                                                if (val === null) {
                                                    displayVal = <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>null</span>;
                                                } else if (typeof val === 'object') {
                                                    displayVal = JSON.stringify(val);
                                                } else {
                                                    displayVal = String(val);
                                                }
                                                return <td key={key} style={tdStyle}>{displayVal}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {!selectedTable && !isDataLoading && (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem 2rem',
                    color: '#9CA3AF'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🗄️</div>
                    <p>Select a table from the dropdown above to view its data.</p>
                </div>
            )}
        </div>
    );
};

export default DatabaseExplorer;
