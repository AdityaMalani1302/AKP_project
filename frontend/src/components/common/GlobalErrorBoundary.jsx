import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useLocation } from 'react-router-dom';

const ErrorFallback = ({ error, resetErrorBoundary }) => {
    return (
        <div role="alert" style={{
            padding: '2rem',
            margin: '2rem auto',
            maxWidth: '600px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '0.5rem',
            color: '#991B1B',
            fontFamily: 'Inter, sans-serif'
        }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Something went wrong</h2>
            <p style={{ marginBottom: '1rem' }}>The application encountered an unexpected error.</p>
            <pre style={{
                backgroundColor: '#FFF1F2',
                padding: '1rem',
                borderRadius: '0.25rem',
                overflowX: 'auto',
                fontSize: '0.875rem',
                color: '#EF4444',
                marginBottom: '1.5rem'
            }}>
                {error.message}
            </pre>
            <button
                onClick={resetErrorBoundary}
                className="btn btn-primary"
                style={{
                    backgroundColor: '#DC2626',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    border: 'none',
                    borderRadius: '0.375rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                }}
            >
                Try again
            </button>
        </div>
    );
};

const GlobalErrorBoundary = ({ children }) => {
    const location = useLocation();

    return (
        <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onReset={() => {
                // Reset the state of your app so the error doesn't happen again
                window.location.reload();
            }}
            resetKeys={[location.pathname]}
        >
            {children}
        </ErrorBoundary>
    );
};

export default GlobalErrorBoundary;
