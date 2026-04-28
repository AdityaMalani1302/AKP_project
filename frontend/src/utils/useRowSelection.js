import { useState, useCallback, useMemo } from 'react';

const useRowSelection = ({ data = [], idField = 'Id' } = {}) => {
    const [selectedIds, setSelectedIds] = useState(new Set());

    const toggleRow = useCallback((id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback((visibleData) => {
        setSelectedIds(prev => {
            const allSelected = visibleData.every(item => prev.has(item[idField]));
            const next = new Set(prev);
            if (allSelected) {
                visibleData.forEach(item => next.delete(item[idField]));
            } else {
                visibleData.forEach(item => next.add(item[idField]));
            }
            return next;
        });
    }, [idField]);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);

    const isAllSelected = useMemo(() => {
        if (!data.length) return false;
        return data.every(item => selectedIds.has(item[idField]));
    }, [data, selectedIds, idField]);

    const isSomeSelected = useMemo(() => {
        return selectedIds.size > 0 && !isAllSelected;
    }, [selectedIds, isAllSelected]);

    const selectedCount = selectedIds.size;

    const getSelectedRecords = useCallback(() => {
        return data.filter(item => selectedIds.has(item[idField]));
    }, [data, selectedIds, idField]);

    return {
        selectedIds,
        toggleRow,
        toggleAll,
        clearSelection,
        isSelected,
        isAllSelected,
        isSomeSelected,
        selectedCount,
        getSelectedRecords
    };
};

export default useRowSelection;