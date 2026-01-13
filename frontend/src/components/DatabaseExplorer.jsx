import React, { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import Select from 'react-select';
import { toast } from 'sonner';
import api from '../api';

// Database options
const databases = [
    { id: 'IcSoftVer3', name: 'IcSoft Ver3' },
    { id: 'IcSoftReportVer3', name: 'IcSoft Report Ver3' },
    { id: 'IcSoftLedgerVer3', name: 'IcSoft Ledger Ver3' }
];

const fetchTables = async (database) => {
    const res = await api.get(`/tables?database=${database}`);
    return res.data.sort((a, b) => a.localeCompare(b));
};

const fetchTableData = async (tableName, page, limit, database) => {
    if (!tableName) return { data: [], total: 0 };
    const res = await api.get(`/tables/${tableName}?page=${page}&limit=${limit}&database=${database}`);
    return res.data;
};

const DatabaseExplorer = () => {
    const [selectedDatabase, setSelectedDatabase] = useState('IcSoftVer3');
    const [selectedTable, setSelectedTable] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);

    // Fetch Tables List for selected database
    const { data: tables = [], isError: isTablesError, isLoading: isTablesLoading } = useQuery({
        queryKey: ['dbTables', selectedDatabase],
        queryFn: () => fetchTables(selectedDatabase),
        staleTime: 10 * 60 * 1000,
    });

    // Fetch Table Data
    const {
        data: tableDataResponse = { data: [], total: 0 },
        isLoading: isDataLoading,
        isError: isDataError,
        isFetching: isDataFetching
    } = useQuery({
        queryKey: ['tableData', selectedTable, page, limit, selectedDatabase],
        queryFn: () => fetchTableData(selectedTable, page, limit, selectedDatabase),
        placeholderData: keepPreviousData,
        enabled: !!selectedTable,
    });

    const { data: rows, total } = tableDataResponse;

    // Derived State
    const totalPages = Math.ceil(total / limit);
    const tableOptions = tables.map(t => ({ value: t, label: t }));

    const handleDatabaseChange = (e) => {
        const newDb = e.target.value;
        setSelectedDatabase(newDb);
        setSelectedTable(''); // Clear table selection when database changes
        setPage(1);
    };

    const handleTableChange = (selectedOption) => {
        setSelectedTable(selectedOption ? selectedOption.value : '');
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > totalPages) return;
        setPage(newPage);
    };

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

            {/* Database and Table Selection */}
            <div className="flex items-center gap-lg mb-xl p-lg" style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-gray-100)',
                flexWrap: 'wrap'
            }}>
                {/* Database Selector */}
                <div style={{ minWidth: '200px' }}>
                    <label className="text-sm font-medium mb-sm" style={{ display: 'block', color: 'var(--text-secondary)' }}>
                        Select Database
                    </label>
                    <select
                        value={selectedDatabase}
                        onChange={handleDatabaseChange}
                        style={{
                            padding: '0.625rem 1rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #D1D5DB',
                            backgroundColor: '#FFFFFF',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            fontWeight: '500',
                            width: '100%',
                            minHeight: '42px'
                        }}
                    >
                        {databases.map(db => (
                            <option key={db.id} value={db.id}>
                                {db.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Table Selector */}
                <div style={{ flex: 1, minWidth: '250px', maxWidth: '400px' }}>
                    <label className="text-sm font-medium mb-sm" style={{ display: 'block', color: 'var(--text-secondary)' }}>
                        Select Table
                    </label>
                    <Select
                        value={selectedTable ? { value: selectedTable, label: selectedTable } : null}
                        onChange={handleTableChange}
                        options={tableOptions}
                        placeholder={isTablesLoading ? "Loading tables..." : "Search & Select Table..."}
                        isClearable
                        isLoading={isTablesLoading}
                        isDisabled={isTablesLoading}
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

                    {/* Simple HTML Table with scroll */}
                    <div style={{ 
                        border: '1px solid #E5E7EB', 
                        borderRadius: '6px', 
                        overflow: 'auto',
                        maxHeight: '500px'
                    }}>
                        {isDataLoading ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
                                Loading data...
                            </div>
                        ) : rows && rows.length > 0 ? (
                            <table style={{ 
                                width: '100%', 
                                borderCollapse: 'collapse',
                                minWidth: 'max-content'
                            }}>
                                <thead style={{ 
                                    position: 'sticky', 
                                    top: 0, 
                                    backgroundColor: '#F9FAFB',
                                    zIndex: 10
                                }}>
                                    <tr>
                                        {Object.keys(rows[0]).map(key => (
                                            <th key={key} style={{
                                                padding: '0.75rem 1rem',
                                                fontWeight: '600',
                                                textAlign: 'left',
                                                whiteSpace: 'nowrap',
                                                borderBottom: '2px solid #E5E7EB',
                                                backgroundColor: '#F9FAFB',
                                                fontSize: '0.875rem',
                                                color: '#374151'
                                            }}>
                                                {key}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, rowIndex) => (
                                        <tr key={rowIndex} style={{
                                            borderBottom: '1px solid #E5E7EB',
                                            backgroundColor: rowIndex % 2 === 0 ? 'white' : '#FAFAFA'
                                        }}>
                                            {Object.entries(row).map(([key, value]) => (
                                                <td key={key} style={{
                                                    padding: '0.625rem 1rem',
                                                    whiteSpace: 'nowrap',
                                                    fontSize: '0.875rem',
                                                    color: '#374151'
                                                }}>
                                                    {value === null ? (
                                                        <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>null</span>
                                                    ) : typeof value === 'object' ? (
                                                        JSON.stringify(value)
                                                    ) : (
                                                        String(value)
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{
                                textAlign: 'center',
                                padding: '3rem',
                                backgroundColor: '#F9FAFB',
                                color: '#6B7280'
                            }}>
                                No data found in this table.
                            </div>
                        )}
                    </div>

                    {/* Row count footer */}
                    <div style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.75rem',
                        color: '#6B7280',
                        backgroundColor: '#F9FAFB',
                        borderRadius: '0 0 6px 6px',
                        border: '1px solid #E5E7EB',
                        borderTop: 'none'
                    }}>
                        Showing {rows?.length || 0} rows
                    </div>
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
