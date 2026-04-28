import React from 'react';

const Pagination = ({ 
    currentPage = 1, 
    totalPages = 1, 
    totalRecords = 0, 
    pageSize = 20, 
    onPageChange, 
    onPageSizeChange,
    showPageSizeSelector = false,
    maxVisiblePages = 5
}) => {
    const canPrevious = currentPage > 1;
    const canNext = currentPage < totalPages;

    const handlePageChange = (page) => {
        if (page >= 1 && page <= totalPages) {
            onPageChange(page);
        }
    };

    const getVisiblePages = () => {
        const pages = [];
        let start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let end = Math.min(totalPages, start + maxVisiblePages - 1);
        
        if (end - start + 1 < maxVisiblePages) {
            start = Math.max(1, end - maxVisiblePages + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);

    if (totalPages <= 1 && !showPageSizeSelector) {
        return null;
    }

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            borderTop: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB',
            borderRadius: '0 0 6px 6px',
            flexWrap: 'wrap',
            gap: '0.5rem'
        }}
            role="navigation"
            aria-label="Pagination"
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {showPageSizeSelector && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label htmlFor="page-size-select" style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                            Rows per page:
                        </label>
                        <select
                            id="page-size-select"
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            style={{
                                padding: '0.375rem 0.75rem',
                                border: '1px solid #D1D5DB',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                backgroundColor: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                )}
                
                <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                    {totalRecords === 0 ? 'No records' : `${startRecord}-${endRecord} of ${totalRecords}`}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <button
                    onClick={() => handlePageChange(1)}
                    disabled={!canPrevious}
                    style={{
                        padding: '0.375rem 0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: canPrevious ? 'pointer' : 'not-allowed',
                        opacity: canPrevious ? 1 : 0.5,
                        fontSize: '0.875rem'
                    }}
                    aria-label="Go to first page"
                >
                    ««
                </button>
                
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!canPrevious}
                    style={{
                        padding: '0.375rem 0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: canPrevious ? 'pointer' : 'not-allowed',
                        opacity: canPrevious ? 1 : 0.5,
                        fontSize: '0.875rem'
                    }}
                    aria-label="Go to previous page"
                >
                    «
                </button>

                {getVisiblePages().map((page) => (
                    <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        style={{
                            minWidth: '36px',
                            padding: '0.375rem 0.5rem',
                            border: '1px solid',
                            borderColor: page === currentPage ? '#3B82F6' : '#D1D5DB',
                            borderRadius: '6px',
                            backgroundColor: page === currentPage ? '#3B82F6' : 'white',
                            color: page === currentPage ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: page === currentPage ? '600' : '400'
                        }}
                        aria-label={`Go to page ${page}`}
                        aria-current={page === currentPage ? 'page' : undefined}
                    >
                        {page}
                    </button>
                ))}

                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!canNext}
                    style={{
                        padding: '0.375rem 0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: canNext ? 'pointer' : 'not-allowed',
                        opacity: canNext ? 1 : 0.5,
                        fontSize: '0.875rem'
                    }}
                    aria-label="Go to next page"
                >
                    »
                </button>
                
                <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={!canNext}
                    style={{
                        padding: '0.375rem 0.75rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        cursor: canNext ? 'pointer' : 'not-allowed',
                        opacity: canNext ? 1 : 0.5,
                        fontSize: '0.875rem'
                    }}
                    aria-label="Go to last page"
                >
                    »»
                </button>
            </div>
        </div>
    );
};

export default Pagination;