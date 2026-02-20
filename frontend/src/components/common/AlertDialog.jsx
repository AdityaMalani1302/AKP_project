import React, { useEffect, useRef } from 'react';
import { FiAlertTriangle, FiTrash2, FiX } from 'react-icons/fi';

/**
 * AlertDialog - A confirmation dialog with animations and accessibility
 * @param {boolean} isOpen - Whether the dialog is visible
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {function} onConfirm - Callback when confirmed
 * @param {function} onCancel - Callback when cancelled
 * @param {string} confirmText - Text for confirm button
 * @param {string} cancelText - Text for cancel button
 * @param {boolean} isDanger - Use danger styling
 * @param {boolean} isLoading - Show loading state on confirm button
 */
const AlertDialog = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onCancel, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    isDanger = false,
    isLoading = false 
}) => {
    const confirmButtonRef = useRef(null);

    // Handle escape key and focus management
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen && !isLoading) {
                onCancel();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Focus confirm button when dialog opens
            setTimeout(() => confirmButtonRef.current?.focus(), 100);
            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onCancel, isLoading]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !isLoading) {
            onCancel();
        }
    };

    return (
        <div 
            onClick={handleBackdropClick}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem',
                animation: 'fadeIn 0.2s ease-out'
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-dialog-title"
        >
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                animation: 'scaleIn 0.2s ease-out'
            }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '1.5rem 1.5rem 0 1.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: isDanger ? '#FEE2E2' : '#FEF3C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {isDanger ? (
                                <FiTrash2 size={20} color="#DC2626" />
                            ) : (
                                <FiAlertTriangle size={20} color="#D97706" />
                            )}
                        </div>
                        <h3
                            id="alert-dialog-title"
                            style={{
                                fontSize: '1.125rem',
                                fontWeight: '600',
                                color: '#111827',
                                margin: 0
                            }}
                        >
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '0.5rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#6B7280',
                            transition: 'all 0.15s ease',
                            opacity: isLoading ? 0.5 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.backgroundColor = '#F3F4F6';
                                e.currentTarget.style.color = '#111827';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#6B7280';
                        }}
                        aria-label="Close dialog"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '1rem 1.5rem' }}>
                    <p style={{
                        color: '#4B5563',
                        fontSize: '0.938rem',
                        lineHeight: '1.6',
                        margin: 0
                    }}>
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem',
                    padding: '1rem 1.5rem 1.5rem 1.5rem',
                    borderTop: '1px solid #F3F4F6'
                }}>
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        style={{
                            padding: '0.625rem 1.25rem',
                            backgroundColor: 'white',
                            color: '#374151',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            opacity: isLoading ? 0.6 : 1
                        }}
                        onMouseEnter={e => {
                            if (!isLoading) e.currentTarget.style.backgroundColor = '#F9FAFB';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = 'white';
                        }}
                    >
                        {cancelText}
                    </button>

                    <button
                        ref={confirmButtonRef}
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="btn-ripple"
                        style={{
                            padding: '0.625rem 1.25rem',
                            backgroundColor: isDanger ? '#DC2626' : '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            opacity: isLoading ? 0.8 : 1
                        }}
                        onMouseEnter={e => {
                            if (!isLoading) {
                                e.currentTarget.style.backgroundColor = isDanger ? '#B91C1C' : '#1D4ED8';
                            }
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = isDanger ? '#DC2626' : '#3B82F6';
                        }}
                    >
                        {isLoading && (
                            <span style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#FFFFFF',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }} />
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertDialog;

