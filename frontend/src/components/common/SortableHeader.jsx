import React from 'react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

const SortableHeader = ({
    columnKey,
    label,
    sortKey,
    sortOrder,
    onSort,
    style = {},
    tooltip = null
}) => {
    const isActive = sortKey === columnKey;

    const getIcon = () => {
        if (!isActive) {
            return <span style={{ marginLeft: '4px', opacity: 0.4, fontSize: '12px' }}>↕</span>;
        }
        return sortOrder === 'asc'
            ? <FiChevronUp size={14} style={{ marginLeft: '4px' }} />
            : <FiChevronDown size={14} style={{ marginLeft: '4px' }} />;
    };

    return (
        <th
            style={{
                cursor: 'pointer',
                userSelect: 'none',
                whiteSpace: 'nowrap',
                ...style
            }}
            onClick={() => onSort(columnKey)}
            scope="col"
            title={tooltip || `Click to sort by ${label}`}
            aria-sort={isActive ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
        >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {label}
                {getIcon()}
            </span>
        </th>
    );
};

export default SortableHeader;