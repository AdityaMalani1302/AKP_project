const STORAGE_KEY_PREFIX = 'input_history_';
const MAX_HISTORY_ITEMS = 5;

/**
 * Utility to save multiple field values at once after form submission
 * @param {string} formPrefix - Form identifier (e.g., 'labMaster')
 * @param {Object} formData - Object with field names and values
 * @param {Array} excludeFields - Fields to exclude (e.g., dates, IDs)
 */
export const saveFormHistory = (formPrefix, formData, excludeFields = []) => {
    const excludePatterns = [
        /date/i, /Date/,
        /id$/i, /Id$/,
        /time/i, /Time/,
        ...excludeFields
    ];
    
    Object.entries(formData).forEach(([fieldName, value]) => {
        // Skip excluded fields
        const shouldExclude = excludePatterns.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(fieldName);
            }
            return fieldName === pattern;
        });
        
        if (shouldExclude) return;
        
        // Only save non-empty string values
        if (value && typeof value === 'string' && value.trim() !== '') {
            const storageKey = `${STORAGE_KEY_PREFIX}${formPrefix}_${fieldName}`;
            
            try {
                const stored = localStorage.getItem(storageKey);
                const history = stored ? JSON.parse(stored) : [];
                
                // Remove duplicates
                const filtered = history.filter(
                    item => item.toLowerCase() !== value.trim().toLowerCase()
                );
                
                // Add new value at beginning
                const newHistory = [value.trim(), ...filtered].slice(0, MAX_HISTORY_ITEMS);
                localStorage.setItem(storageKey, JSON.stringify(newHistory));
            } catch (e) {
                console.warn('Failed to save form history:', e);
            }
        }
    });
};

/**
 * Get history for a specific field
 * @param {string} formPrefix - Form identifier
 * @param {string} fieldName - Field name
 * @returns {Array} - History items
 */
export const getFieldHistory = (formPrefix, fieldName) => {
    const storageKey = `${STORAGE_KEY_PREFIX}${formPrefix}_${fieldName}`;
    try {
        const stored = localStorage.getItem(storageKey);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};
