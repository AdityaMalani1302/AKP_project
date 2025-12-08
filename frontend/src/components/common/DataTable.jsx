import React, { useState, useRef, useEffect } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import './DataTable.css';

const DataTable = ({ data, columns, onRowClick, selectedId, maxHeight = '500px' }) => {
    const [sorting, setSorting] = useState([]);
    const parentRef = useRef(null);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
        },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const { rows } = table.getRowModel();

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 45, // Approximate row height in pixels
        overscan: 10,
    });

    return (
        <div
            ref={parentRef}
            className="data-table-container"
            style={{
                height: maxHeight, // Explicit height for virtualizer
                overflow: 'auto'
            }}
        >
            <table className="tanstack-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: '#F9FAFB' }}>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => (
                                <th
                                    key={header.id}
                                    onClick={header.column.getToggleSortingHandler()}
                                    className={header.column.getCanSort() ? 'sortable' : ''}
                                    style={{
                                        width: header.getSize(),
                                        minWidth: header.column.columnDef.minWidth,
                                        maxWidth: header.column.columnDef.maxWidth,
                                    }}
                                >
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                    {{
                                        asc: ' 🔼',
                                        desc: ' 🔽',
                                    }[header.column.getIsSorted()] ?? null}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody
                    style={{
                        display: 'grid',
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        position: 'relative'
                    }}
                >
                    {rows.length === 0 ? (
                        <tr style={{ display: 'flex', width: '100%' }}>
                            <td colSpan={columns.length} className="no-data" style={{ width: '100%' }}>
                                No records found
                            </td>
                        </tr>
                    ) : (
                        rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const row = rows[virtualRow.index];
                            return (
                                <tr
                                    key={row.id}
                                    data-index={virtualRow.index}
                                    onClick={() => onRowClick && onRowClick(row.original)}
                                    className={`
                                        ${onRowClick ? 'clickable' : ''} 
                                        ${selectedId && row.original.PatternId === selectedId ? 'selected-row' : ''}
                                    `}
                                    style={{
                                        display: 'flex',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: `${virtualRow.size}px`,
                                        transform: `translateY(${virtualRow.start}px)`,
                                    }}
                                >
                                    {row.getVisibleCells().map(cell => (
                                        <td
                                            key={cell.id}
                                            style={{
                                                width: cell.column.getSize(),
                                                minWidth: cell.column.columnDef.minWidth,
                                                maxWidth: cell.column.columnDef.maxWidth,
                                                display: 'flex',
                                                alignItems: 'center',
                                                overflow: 'hidden'
                                            }}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
