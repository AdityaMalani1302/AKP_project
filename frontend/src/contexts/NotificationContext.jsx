import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'smart-erp-notifications';
const MAX_NOTIFICATIONS = 50;

// Notification types
export const NOTIFICATION_TYPES = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    UPDATE: 'update'
};

// Create context
const NotificationContext = createContext(null);

// Initial notifications (can be pre-populated from server or localStorage)
const getInitialNotifications = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Failed to load notifications:', error);
    }
    return [];
};

/**
 * NotificationProvider - Provides notification state and actions to the app
 */
export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState(getInitialNotifications);

    // Persist to localStorage when notifications change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
        } catch (error) {
            console.error('Failed to save notifications:', error);
        }
    }, [notifications]);

    // Add a new notification
    const addNotification = useCallback((notification) => {
        const newNotification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            read: false,
            type: NOTIFICATION_TYPES.INFO,
            ...notification
        };

        setNotifications(prev => {
            const updated = [newNotification, ...prev];
            // Keep only the latest MAX_NOTIFICATIONS
            return updated.slice(0, MAX_NOTIFICATIONS);
        });

        return newNotification.id;
    }, []);

    // Mark a notification as read
    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev => 
            prev.map(n => 
                n.id === notificationId ? { ...n, read: true } : n
            )
        );
    }, []);

    // Mark all notifications as read
    const markAllAsRead = useCallback(() => {
        setNotifications(prev => 
            prev.map(n => ({ ...n, read: true }))
        );
    }, []);

    // Remove a notification
    const removeNotification = useCallback((notificationId) => {
        setNotifications(prev => 
            prev.filter(n => n.id !== notificationId)
        );
    }, []);

    // Clear all notifications
    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    // Get unread count
    const unreadCount = notifications.filter(n => !n.read).length;

    const value = {
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

/**
 * useNotifications - Hook to access notification context
 */
export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationContext;
