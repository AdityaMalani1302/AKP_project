/**
 * Debounce utility function
 * Delays execution of a function until after a specified delay
 * Useful for search inputs, window resize, scroll events
 */
export function debounce(func, delay = 300) {
    let timeoutId;

    return function debounced(...args) {
        // Clear previous timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Set new timeout
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Throttle utility function  
 * Ensures a function is called at most once per specified interval
 * Useful for continuous events like scrolling
 */
export function throttle(func, limit = 100) {
    let inThrottle;

    return function throttled(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
