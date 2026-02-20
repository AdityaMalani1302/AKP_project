/**
 * Cookie Configuration Utility
 * Provides consistent cookie settings across the application
 */

/**
 * Check if the request is from a cloud deployment
 * @param {import('express').Request} req - Express request object
 * @returns {boolean}
 */
const isCloudDeployment = (req) => {
    const frontendUrl = process.env.FRONTEND_URL || '';
    const origin = req.get('origin') || '';
    return frontendUrl.includes('vercel.app') || 
           frontendUrl.includes('akpfoundries.com') ||
           origin.includes('akpfoundries.com') ||
           origin.includes('vercel.app') ||
           origin.includes('trycloudflare.com');
};

/**
 * Get cookie configuration options
 * @param {import('express').Request} req - Express request object
 * @param {number|null} maxAge - Max age in milliseconds (null for session cookie)
 * @returns {Object} Cookie options
 */
const getCookieOptions = (req, maxAge = null) => {
    const cloud = isCloudDeployment(req);
    return {
        httpOnly: true,
        secure: cloud || req.secure || req.protocol === 'https',
        sameSite: cloud ? 'none' : 'lax',
        ...(maxAge && { maxAge })
    };
};

module.exports = {
    isCloudDeployment,
    getCookieOptions
};
