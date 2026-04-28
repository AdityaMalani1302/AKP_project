import { useState, useMemo, useCallback } from 'react';

const usePagination = ({ data = [], pageSize: defaultPageSize = 20, autoPaginate = false }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);

    const totalPages = useMemo(() => {
        return Math.ceil(data.length / pageSize) || 1;
    }, [data.length, pageSize]);

    const paginatedData = useMemo(() => {
        if (!autoPaginate) return data;
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        return data.slice(start, end);
    }, [data, currentPage, pageSize, autoPaginate]);

    const goToPage = useCallback((page) => {
        const pageNumber = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(pageNumber);
    }, [totalPages]);

    const nextPage = useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const previousPage = useCallback(() => {
        goToPage(currentPage - 1);
    }, [currentPage, goToPage]);

    const resetToFirstPage = useCallback(() => {
        setCurrentPage(1);
    }, []);

    const changePageSize = useCallback((newSize) => {
        setPageSize(newSize);
        setCurrentPage(1);
    }, []);

    return {
        currentPage,
        totalPages,
        pageSize,
        totalRecords: data.length,
        paginatedData,
        goToPage,
        nextPage,
        previousPage,
        resetToFirstPage,
        changePageSize,
        canPrevious: currentPage > 1,
        canNext: currentPage < totalPages
    };
};

export default usePagination;