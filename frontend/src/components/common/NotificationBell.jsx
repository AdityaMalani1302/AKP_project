import React, { useState, useRef, useEffect } from 'react';
import { FiBell, FiX, FiCheck, FiCheckCircle, FiInfo, FiAlertTriangle, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { useNotifications, NOTIFICATION_TYPES } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

/**
 * NotificationBell - Header notification bell with dropdown
 */
const NotificationBell = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Get icon for notification type
    const getTypeIcon = (type) => {
        switch (type) {
            case NOTIFICATION_TYPES.SUCCESS:
                return <FiCheckCircle size={16} style={{ color: '#10B981' }} />;
            case NOTIFICATION_TYPES.WARNING:
                return <FiAlertTriangle size={16} style={{ color: '#F59E0B' }} />;
            case NOTIFICATION_TYPES.ERROR:
                return <FiAlertCircle size={16} style={{ color: '#EF4444' }} />;
            case NOTIFICATION_TYPES.UPDATE:
                return <FiRefreshCw size={16} style={{ color: '#3B82F6' }} />;
            default:
                return <FiInfo size={16} style={{ color: '#6B7280' }} />;
        }
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
        // Optional: Handle navigation based on notification.action
    };

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    borderRadius: '0.375rem',
                    transition: 'background-color 0.2s'
                }}
                className="btn-hover-scale"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
                <FiBell size={20} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        backgroundColor: '#EF4444',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: '600',
                        borderRadius: '999px',
                        minWidth: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div 
                    className="animate-scale-in"
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: '100%',
                        marginTop: '0.5rem',
                        width: '360px',
                        maxHeight: '480px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                        border: '1px solid #E5E7EB',
                        zIndex: 1000,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '1rem',
                        borderBottom: '1px solid #E5E7EB',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#111827' }}>
                            Notifications
                        </h3>
                        {notifications.length > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#3B82F6',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.25rem'
                                }}
                            >
                                <FiCheck size={14} />
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '360px' }}>
                        {notifications.length === 0 ? (
                            <div style={{
                                padding: '2rem',
                                textAlign: 'center',
                                color: '#9CA3AF'
                            }}>
                                <FiBell size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p style={{ margin: 0, fontSize: '0.875rem' }}>No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notification, index) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className="animate-fade-in"
                                    style={{
                                        padding: '0.875rem 1rem',
                                        borderBottom: index < notifications.length - 1 ? '1px solid #F3F4F6' : 'none',
                                        backgroundColor: notification.read ? 'white' : '#F0F9FF',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.15s',
                                        display: 'flex',
                                        gap: '0.75rem',
                                        alignItems: 'flex-start',
                                        animationDelay: `${index * 0.05}s`
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F9FAFB'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notification.read ? 'white' : '#F0F9FF'}
                                >
                                    <div style={{ marginTop: '2px' }}>
                                        {getTypeIcon(notification.type)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                            fontWeight: notification.read ? '400' : '500',
                                            color: '#111827',
                                            lineHeight: '1.4'
                                        }}>
                                            {notification.title}
                                        </p>
                                        {notification.message && (
                                            <p style={{
                                                margin: '0.25rem 0 0',
                                                fontSize: '0.8rem',
                                                color: '#6B7280',
                                                lineHeight: '1.4'
                                            }}>
                                                {notification.message}
                                            </p>
                                        )}
                                        <p style={{
                                            margin: '0.375rem 0 0',
                                            fontSize: '0.7rem',
                                            color: '#9CA3AF'
                                        }}>
                                            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeNotification(notification.id);
                                        }}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: '#9CA3AF',
                                            cursor: 'pointer',
                                            padding: '0.25rem',
                                            display: 'flex',
                                            opacity: 0.5,
                                            transition: 'opacity 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = 0.5}
                                        aria-label="Remove notification"
                                    >
                                        <FiX size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderTop: '1px solid #E5E7EB',
                            textAlign: 'center'
                        }}>
                            <button
                                onClick={clearAll}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#6B7280',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear all notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
