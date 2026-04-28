import { useEffect, useCallback } from 'react';

/**
 * useKeyboardShortcuts - Custom hook for adding keyboard shortcuts to forms and pages
 * 
 * @param {Object} shortcuts - Object mapping shortcut keys to handler functions
 * @param {boolean} enabled - Whether shortcuts are active (default: true)
 */
const useKeyboardShortcuts = (shortcuts, enabled = true) => {
    const handleKeyDown = useCallback((event) => {
        if (!enabled) return;

        // Build the key combination string
        const keys = [];
        if (event.ctrlKey || event.metaKey) keys.push('ctrl');
        if (event.altKey) keys.push('alt');
        if (event.shiftKey) keys.push('shift');
        
        // Add the main key (lowercase)
        const key = event.key.toLowerCase();
        if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
            keys.push(key);
        }

        const combo = keys.join('+');

        // Check if this combo matches any registered shortcut
        if (shortcuts[combo]) {
            shortcuts[combo](event);
        }

        // Also check for simple keys like 'escape'
        if (shortcuts[key] && keys.length === 1) {
            shortcuts[key](event);
        }
    }, [shortcuts, enabled]);

    useEffect(() => {
        if (enabled) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [handleKeyDown, enabled]);
};

/**
 * Common keyboard shortcut presets for forms
 */
export const useFormShortcuts = ({
    onSave,
    onCancel,
    onNew,
    onDelete,
    enabled = true
}) => {
    useKeyboardShortcuts({
        // Ctrl+S to save
        'ctrl+s': (e) => {
            e.preventDefault();
            if (onSave) onSave();
        },
        // Escape to cancel/close
        'escape': () => {
            if (onCancel) onCancel();
        },
        // Ctrl+N for new entry
        'ctrl+n': (e) => {
            e.preventDefault();
            if (onNew) onNew();
        },
        // Ctrl+D to delete (with confirmation in handler)
        'ctrl+d': (e) => {
            e.preventDefault();
            if (onDelete) onDelete();
        }
    }, enabled);
};
