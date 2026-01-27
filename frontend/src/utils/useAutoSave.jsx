import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAutoSave - Custom hook for auto-saving form drafts to localStorage
 * 
 * @param {string} key - Unique key for localStorage (e.g., 'pattern-master-draft')
 * @param {Object} data - The form data to save
 * @param {number} delay - Debounce delay in ms (default: 2000ms)
 * @param {boolean} enabled - Whether auto-save is active (default: true)
 * 
 * @returns {Object} { hasDraft, loadDraft, clearDraft, lastSaved }
 * 
 * @example
 * const { hasDraft, loadDraft, clearDraft, lastSaved } = useAutoSave(
 *   'pattern-master-draft',
 *   formData,
 *   2000
 * );
 */
const useAutoSave = (key, data, delay = 2000, enabled = true) => {
    const [lastSaved, setLastSaved] = useState(null);
    const [hasDraft, setHasDraft] = useState(false);
    const timeoutRef = useRef(null);
    const isFirstMount = useRef(true);

    // Check if draft exists on mount
    useEffect(() => {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.data && parsed.timestamp) {
                    setHasDraft(true);
                    setLastSaved(new Date(parsed.timestamp));
                }
            } catch {
                // Invalid stored data, ignore
            }
        }
    }, [key]);

    // Auto-save with debounce
    useEffect(() => {
        // Skip on first mount to avoid saving initial empty state
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        if (!enabled) return;

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            // Only save if data has meaningful content
            const hasContent = data && Object.values(data).some(val => 
                val !== null && val !== undefined && val !== '' && 
                (typeof val !== 'object' || Object.keys(val).length > 0)
            );

            if (hasContent) {
                const saveData = {
                    data,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem(key, JSON.stringify(saveData));
                setLastSaved(new Date());
                setHasDraft(true);
            }
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [key, data, delay, enabled]);

    // Load draft from localStorage
    const loadDraft = useCallback(() => {
        const stored = localStorage.getItem(key);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                return parsed.data || null;
            } catch {
                return null;
            }
        }
        return null;
    }, [key]);

    // Clear draft from localStorage
    const clearDraft = useCallback(() => {
        localStorage.removeItem(key);
        setHasDraft(false);
        setLastSaved(null);
    }, [key]);

    // Format last saved time as relative string
    const getLastSavedText = useCallback(() => {
        if (!lastSaved) return null;
        
        const now = new Date();
        const diff = Math.floor((now - lastSaved) / 1000);
        
        if (diff < 5) return 'Just now';
        if (diff < 60) return `${diff} seconds ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        return lastSaved.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }, [lastSaved]);

    return {
        hasDraft,
        loadDraft,
        clearDraft,
        lastSaved,
        getLastSavedText
    };
};

/**
 * DraftRecoveryBanner - Component to show when a draft is available
 */
export const DraftRecoveryBanner = ({ 
    onRecover, 
    onDiscard, 
    lastSavedText = 'recently' 
}) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
        borderRadius: '8px',
        marginBottom: '1rem',
        border: '1px solid #F59E0B'
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>💾</span>
            <span style={{ fontSize: '0.875rem', color: '#92400E' }}>
                You have an unsaved draft from {lastSavedText}
            </span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
                onClick={onRecover}
                style={{
                    padding: '0.375rem 0.75rem',
                    background: '#F59E0B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                }}
            >
                Recover
            </button>
            <button
                onClick={onDiscard}
                style={{
                    padding: '0.375rem 0.75rem',
                    background: 'transparent',
                    color: '#92400E',
                    border: '1px solid #D97706',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '500',
                    cursor: 'pointer'
                }}
            >
                Discard
            </button>
        </div>
    </div>
);

/**
 * AutoSaveIndicator - Small indicator showing auto-save status
 */
export const AutoSaveIndicator = ({ lastSavedText, saving = false }) => (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
        fontSize: '0.75rem',
        color: '#6B7280'
    }}>
        {saving ? (
            <>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#F59E0B',
                    animation: 'pulse 1s infinite'
                }} />
                <span>Saving...</span>
            </>
        ) : lastSavedText ? (
            <>
                <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#10B981'
                }} />
                <span>Saved {lastSavedText}</span>
            </>
        ) : null}
    </div>
);

export default useAutoSave;
