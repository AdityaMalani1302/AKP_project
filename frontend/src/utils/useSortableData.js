import { useState, useMemo, useCallback } from 'react';

const useSortableData = (data = [], { initialSortKey = null, initialSortOrder = 'asc' } = {}) => {
    const [sortKey, setSortKey] = useState(initialSortKey);
    const [sortOrder, setSortOrder] = useState(initialSortOrder);

    const sortedData = useMemo(() => {
        if (!sortKey || !data || data.length === 0) return data;

        return [...data].sort((a, b) => {
            let aVal = a[sortKey];
            let bVal = b[sortKey];

            if (aVal === null || aVal === undefined) aVal = '';
            if (bVal === null || bVal === undefined) bVal = '';

            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortOrder]);

    const handleSort = useCallback((key) => {
        setSortOrder(prev => {
            if (sortKey === key) {
                return prev === 'asc' ? 'desc' : 'asc';
            }
            return 'asc';
        });
        setSortKey(key);
    }, [sortKey]);

    const clearSort = useCallback(() => {
        setSortKey(null);
        setSortOrder('asc');
    }, []);

    return {
        sortedData,
        sortKey,
        sortOrder,
        handleSort,
        clearSort
    };
};

export default useSortableData;