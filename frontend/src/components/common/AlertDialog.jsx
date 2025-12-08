import React from 'react';

const AlertDialog = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDanger = false }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }} onClick={e => e.stopPropagation()}>
                <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '0.5rem'
                }}>
                    {title}
                </h3>

                <p style={{
                    color: '#4B5563',
                    marginBottom: '1.5rem',
                    fontSize: '0.95rem',
                    lineHeight: '1.5'
                }}>
                    {message}
                </p>

                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.75rem'
                }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'white',
                            color: '#374151',
                            border: '1px solid #D1D5DB',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                        onMouseOver={e => e.target.style.backgroundColor = '#F9FAFB'}
                        onMouseOut={e => e.target.style.backgroundColor = 'white'}
                    >
                        {cancelText}
                    </button>

                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: isDanger ? '#EF4444' : '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                        onMouseOver={e => e.target.style.backgroundColor = isDanger ? '#DC2626' : '#2563EB'}
                        onMouseOut={e => e.target.style.backgroundColor = isDanger ? '#EF4444' : '#3B82F6'}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertDialog;
