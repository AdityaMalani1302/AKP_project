import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { validateUserRegistration } from '../utils/validation';
import { AlertDialog } from './common';
import { AVAILABLE_PAGES } from '../config/constants';
import './UserManagement.css';

const UserManagement = () => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        role: 'employee',
        allowedPages: ['homepage']
    });
    const [errors, setErrors] = useState({});

    // Edit modal state
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({
        username: '',
        fullName: '',
        password: '',
        allowedPages: []
    });

    // Delete confirmation state
    const [userToDelete, setUserToDelete] = useState(null);

    // Activity Log state
    const [selectedActivityUser, setSelectedActivityUser] = useState(null);

    // Fetch all users
    const { data: users = [], isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data;
        }
    });

    // Fetch users for activity log dropdown
    const { data: activityUsers = [] } = useQuery({
        queryKey: ['activity-log-users'],
        queryFn: async () => {
            const response = await api.get('/activity-logs/users');
            return response.data;
        }
    });

    // Fetch activity logs for selected user
    const { data: activityLogsData, isLoading: activityLogsLoading } = useQuery({
        queryKey: ['activity-logs', selectedActivityUser],
        queryFn: async () => {
            const response = await api.get(`/activity-logs/${selectedActivityUser}`);
            return response.data;
        },
        enabled: !!selectedActivityUser
    });

    const registerMutation = useMutation({
        mutationFn: async (newUser) => {
            const response = await api.post('/auth/register', newUser);
            return response.data;
        },
        onSuccess: () => {
            toast.message('Success', { description: 'User registered successfully!' });
            setFormData({ username: '', password: '', fullName: '', role: 'employee', allowedPages: ['homepage'] });
            setErrors({});
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Registration failed');
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await api.put(`/users/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('User updated successfully!');
            setEditingUser(null);
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Update failed');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.delete(`/users/${id}`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('User deleted successfully!');
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Delete failed');
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateUserRegistration(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error('Please complete all required fields before submitting.');
            return;
        }
        setErrors({});
        registerMutation.mutate(formData);
    };

    const handlePageToggle = (pageId, isEdit = false) => {
        const page = AVAILABLE_PAGES.find(p => p.id === pageId);
        
        // Don't allow toggling locked pages (Homepage)
        if (page?.isLocked) return;
        
        const setter = isEdit ? setEditFormData : setFormData;
        setter(prev => {
            const currentPages = prev.allowedPages || [];
            
            // If toggling a parent page (like quality-lab)
            const subTabs = AVAILABLE_PAGES.filter(p => p.parent === pageId);
            
            if (currentPages.includes(pageId)) {
                // Unchecking parent - also remove all its sub-tabs
                const subTabIds = subTabs.map(s => s.id);
                return { ...prev, allowedPages: currentPages.filter(p => p !== pageId && !subTabIds.includes(p)) };
            } else {
                // Checking parent - just add the parent, user can select sub-tabs manually
                return { ...prev, allowedPages: [...currentPages, pageId] };
            }
        });
    };

    const handleSelectAll = (isEdit = false) => {
        const setter = isEdit ? setEditFormData : setFormData;
        setter(prev => ({ ...prev, allowedPages: AVAILABLE_PAGES.map(p => p.id) }));
    };

    const handleDeselectAll = (isEdit = false) => {
        const setter = isEdit ? setEditFormData : setFormData;
        setter(prev => ({ ...prev, allowedPages: ['homepage'] }));
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setEditFormData({
            username: user.Username,
            fullName: user.FullName,
            password: '',
            allowedPages: user.AllowedPages ? user.AllowedPages.split(',') : []
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const updateData = {};
        if (editFormData.username !== editingUser.Username) updateData.username = editFormData.username;
        if (editFormData.fullName !== editingUser.FullName) updateData.fullName = editFormData.fullName;
        if (editFormData.password) updateData.password = editFormData.password;
        updateData.allowedPages = editFormData.allowedPages;

        updateMutation.mutate({ id: editingUser.Id, data: updateData });
    };

    const getAccessBadges = (allowedPages) => {
        if (!allowedPages || allowedPages === 'all') {
            return <span className="access-badge access-full">Full Access</span>;
        }
        const pages = allowedPages.split(',').filter(p => p);
        if (pages.length === 0) return <span className="access-badge access-none">No access</span>;
        if (pages.length > 3) {
            return <span className="access-badge access-count">{pages.length} pages</span>;
        }
        return pages.map(p => {
            const page = AVAILABLE_PAGES.find(ap => ap.id === p);
            return page ? (
                <span key={p} className="access-item">
                    {page.label}
                </span>
            ) : null;
        });
    };

    // Activity Log Helper Functions
    const getActivityIcon = (type) => {
        switch (type) {
            case 'LOGIN': return { icon: '🔓', color: '#10B981', bg: '#D1FAE5' };
            case 'LOGOUT': return { icon: '🔒', color: '#3B82F6', bg: '#DBEAFE' };
            case 'LOGIN_FAILED': return { icon: '⚠️', color: '#EF4444', bg: '#FEE2E2' };
            case 'CREATE': return { icon: '➕', color: '#10B981', bg: '#D1FAE5' };
            case 'UPDATE': return { icon: '✏️', color: '#F59E0B', bg: '#FEF3C7' };
            case 'DELETE': return { icon: '🗑️', color: '#EF4444', bg: '#FEE2E2' };
            default: return { icon: '📋', color: '#6B7280', bg: '#F3F4F6' };
        }
    };

    const formatDateTime = (dateString) => {
        // Remove trailing 'Z' to prevent UTC interpretation - DB stores local time (IST)
        const localDateString = String(dateString).replace('Z', '');
        const date = new Date(localDateString);
        return {
            date: date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        };
    };

    // Group activities by type for better display
    const groupActivitiesBySession = (logs) => {
        if (!logs || logs.length === 0) return [];
        return logs;
    };

    return (
        <div className="card">
            <div className="page-header">
                <h2 className="page-title">User Management</h2>
                <p className="page-subtitle">Manage users and access permissions.</p>
            </div>

            <div className="user-management-grid">
                {/* User Registration Card */}
                <div className="card registration-card">
                    <h3 className="section-title">
                        👤 Register New User
                    </h3>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required className="input-field" placeholder="e.g., jdoe" style={{ borderColor: errors.username ? '#EF4444' : undefined }} />
                            {errors.username && <span className="error-text">{errors.username}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Full Name</label>
                            <input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required className="input-field" placeholder="e.g., John Doe" style={{ borderColor: errors.fullName ? '#EF4444' : undefined }} />
                            {errors.fullName && <span className="error-text">{errors.fullName}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required className="input-field" placeholder="••••••••" style={{ borderColor: errors.password ? '#EF4444' : undefined }} />
                            {errors.password && <span className="error-text">{errors.password}</span>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-field">
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {formData.role === 'employee' && (
                            <div className="page-access-container">
                                <div className="page-access-header">
                                    <span className="page-access-title">🔐 Page Access</span>
                                    <div>
                                        <button type="button" onClick={() => handleSelectAll(false)} className="action-btn-xs btn-primary-xs">All</button>
                                        <button type="button" onClick={() => handleDeselectAll(false)} className="action-btn-xs btn-secondary-xs">Clear</button>
                                    </div>
                                </div>
                                <div className="page-checkbox-grid">
                                    {AVAILABLE_PAGES.filter(page => !page.isSubTab).map(page => (
                                        <React.Fragment key={page.id}>
                                            <label className="checkbox-label" style={{ 
                                                cursor: page.isLocked ? 'not-allowed' : 'pointer',
                                                opacity: page.isLocked ? 0.7 : 1
                                            }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={formData.allowedPages?.includes(page.id)} 
                                                    onChange={() => handlePageToggle(page.id, false)} 
                                                    disabled={page.isLocked}
                                                />
                                                {page.label}
                                                {page.isLocked && <span className="required-mark">(required)</span>}
                                            </label>
                                            
                                            {/* Subtabs - Pattern Master */}
                                            {page.id === 'pattern-master' && formData.allowedPages?.includes('pattern-master') && (
                                                <div className="sub-tabs-container sub-tabs-purple">
                                                    <div className="sub-tabs-title text-purple">Pattern Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'pattern-master').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={formData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, false)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Planning Master */}
                                            {page.id === 'planning-master' && formData.allowedPages?.includes('planning-master') && (
                                                <div className="sub-tabs-container sub-tabs-yellow">
                                                    <div className="sub-tabs-title text-yellow">Planning Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'planning-master').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={formData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, false)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Lab Master */}
                                            {page.id === 'lab-master' && formData.allowedPages?.includes('lab-master') && (
                                                <div className="sub-tabs-container sub-tabs-green">
                                                    <div className="sub-tabs-title text-green">Lab Master Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'lab-master').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={formData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, false)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Quality Lab */}
                                            {page.id === 'quality-lab' && formData.allowedPages?.includes('quality-lab') && (
                                                <div className="sub-tabs-container sub-tabs-blue">
                                                    <div className="sub-tabs-title text-blue">Department Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'quality-lab').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={formData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, false)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Quality Management System */}
                                            {page.id === 'quality-management-system' && formData.allowedPages?.includes('quality-management-system') && (
                                                <div className="sub-tabs-container sub-tabs-blue">
                                                    <div className="sub-tabs-title text-blue">QMS Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'quality-management-system').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={formData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, false)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Marketing */}
                                            {page.id === 'marketing' && formData.allowedPages?.includes('marketing') && (
                                                <div className="sub-tabs-container sub-tabs-purple">
                                                    <div className="sub-tabs-title text-purple">Marketing Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'marketing').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={formData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, false)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }} disabled={registerMutation.isPending}>
                            {registerMutation.isPending ? 'Creating...' : 'Create User'}
                        </button>
                    </form>
                </div>

                {/* Employee List */}
                <div className="card registration-card">
                    <h3 className="section-title">
                        👤 Registered Users ({users.length})
                    </h3>

                    {usersLoading ? (
                        <div className="loading-text">Loading users...</div>
                    ) : users.length === 0 ? (
                        <div className="loading-text">No users registered yet</div>
                    ) : (
                        <div className="users-table-container">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Full Name</th>
                                        <th>Role</th>
                                        <th>Access</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.Id}>
                                            <td>{user.Username}</td>
                                            <td>{user.FullName}</td>
                                            <td>
                                                <span className={`role-badge role-${user.Role}`}>
                                                    {user.Role}
                                                </span>
                                            </td>
                                            <td>{getAccessBadges(user.AllowedPages)}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                {user.Role !== 'admin' && (
                                                    <div className="action-buttons">
                                                        <button onClick={() => openEditModal(user)} className="btn-edit">
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => setUserToDelete(user)} 
                                                            className="btn-delete"
                                                            disabled={deleteMutation.isPending}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Activity Log Section */}
            <div className="card activity-log-section">
                <h3 className="section-title">
                    📊 Activity Log
                </h3>
                
                <div className="activity-log-header">
                    <div className="form-group" style={{ marginBottom: 0, flex: 1, maxWidth: '300px' }}>
                        <label className="form-label">Select User</label>
                        <select 
                            value={selectedActivityUser || ''} 
                            onChange={(e) => setSelectedActivityUser(e.target.value || null)}
                            className="input-field"
                        >
                            <option value="">-- Select a user --</option>
                            {activityUsers.map(user => (
                                <option key={user.Id} value={user.Id}>
                                    {user.FullName} ({user.Username})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {!selectedActivityUser ? (
                    <div className="activity-log-empty">
                        <span className="activity-log-empty-icon">👤</span>
                        <p>Select a user to view their activity log</p>
                    </div>
                ) : activityLogsLoading ? (
                    <div className="loading-text">Loading activity logs...</div>
                ) : !activityLogsData?.logs || activityLogsData.logs.length === 0 ? (
                    <div className="activity-log-empty">
                        <span className="activity-log-empty-icon">📭</span>
                        <p>No activity logs found for this user</p>
                    </div>
                ) : (
                    <div className="activity-timeline">
                        {groupActivitiesBySession(activityLogsData.logs).map((log, index) => {
                            const { icon, color, bg } = getActivityIcon(log.ActivityType);
                            const { date, time } = formatDateTime(log.CreatedAt);
                            return (
                                <div key={log.Id} className="timeline-item">
                                    <div className="timeline-date">
                                        <span className="date">{date}</span>
                                        <span className="time">{time}</span>
                                    </div>
                                    <div className="timeline-connector">
                                        <div 
                                            className="timeline-node" 
                                            style={{ backgroundColor: bg, borderColor: color }}
                                        >
                                            <span>{icon}</span>
                                        </div>
                                        {index < activityLogsData.logs.length - 1 && (
                                            <div className="timeline-line"></div>
                                        )}
                                    </div>
                                    <div className="timeline-content">
                                        <div className="timeline-title">
                                            {log.ActivityType.replace('_', ' ')}
                                        </div>
                                        <div className="timeline-description">
                                            <span 
                                                className="status-indicator" 
                                                style={{ backgroundColor: log.Status === 'SUCCESS' ? '#10B981' : '#EF4444' }}
                                            ></span>
                                            {log.ActivityDescription}
                                        </div>
                                        {log.IPAddress && (
                                            <div className="timeline-meta">
                                                IP: {log.IPAddress}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="modal-title">Edit User: {editingUser.Username}</h3>

                        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input type="text" value={editFormData.username} onChange={e => setEditFormData({ ...editFormData, username: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input type="text" value={editFormData.fullName} onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">New Password (leave blank to keep current)</label>
                                <input type="password" value={editFormData.password} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })} className="input-field" placeholder="••••••••" />
                            </div>

                            <div className="page-access-container">
                                <div className="page-access-header">
                                    <span className="page-access-title">🔐 Page Access</span>
                                    <div>
                                        <button type="button" onClick={() => handleSelectAll(true)} className="action-btn-xs btn-primary-xs">All</button>
                                        <button type="button" onClick={() => handleDeselectAll(true)} className="action-btn-xs btn-secondary-xs">Clear</button>
                                    </div>
                                </div>
                                <div className="page-checkbox-grid">
                                    {AVAILABLE_PAGES.filter(page => !page.isSubTab).map(page => (
                                        <React.Fragment key={page.id}>
                                            <label className="checkbox-label" style={{ 
                                                cursor: page.isLocked ? 'not-allowed' : 'pointer',
                                                opacity: page.isLocked ? 0.7 : 1
                                            }}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={editFormData.allowedPages?.includes(page.id)} 
                                                    onChange={() => handlePageToggle(page.id, true)} 
                                                    disabled={page.isLocked}
                                                />
                                                {page.label}
                                                {page.isLocked && <span className="required-mark">(required)</span>}
                                            </label>

                                            {/* Subtabs - Pattern Master */}
                                            {page.id === 'pattern-master' && editFormData.allowedPages?.includes('pattern-master') && (
                                                <div className="sub-tabs-container sub-tabs-purple">
                                                    <div className="sub-tabs-title text-purple">Pattern Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'pattern-master').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={editFormData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, true)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Planning Master */}
                                            {page.id === 'planning-master' && editFormData.allowedPages?.includes('planning-master') && (
                                                <div className="sub-tabs-container sub-tabs-yellow">
                                                    <div className="sub-tabs-title text-yellow">Planning Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'planning-master').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={editFormData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, true)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Lab Master */}
                                            {page.id === 'lab-master' && editFormData.allowedPages?.includes('lab-master') && (
                                                <div className="sub-tabs-container sub-tabs-green">
                                                    <div className="sub-tabs-title text-green">Lab Master Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'lab-master').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={editFormData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, true)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Quality Lab */}
                                            {page.id === 'quality-lab' && editFormData.allowedPages?.includes('quality-lab') && (
                                                <div className="sub-tabs-container sub-tabs-blue">
                                                    <div className="sub-tabs-title text-blue">Department Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'quality-lab').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={editFormData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, true)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Quality Management System */}
                                            {page.id === 'quality-management-system' && editFormData.allowedPages?.includes('quality-management-system') && (
                                                <div className="sub-tabs-container sub-tabs-blue">
                                                    <div className="sub-tabs-title text-blue">QMS Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'quality-management-system').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={editFormData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, true)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Subtabs - Marketing */}
                                            {page.id === 'marketing' && editFormData.allowedPages?.includes('marketing') && (
                                                <div className="sub-tabs-container sub-tabs-purple">
                                                    <div className="sub-tabs-title text-purple">Marketing Tabs:</div>
                                                    <div className="page-checkbox-grid">
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'marketing').map(subTab => (
                                                            <label key={subTab.id} className="checkbox-label">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={editFormData.allowedPages?.includes(subTab.id)} 
                                                                    onChange={() => handlePageToggle(subTab.id, true)} 
                                                                />
                                                                {subTab.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={() => setEditingUser(null)} className="btn-cancel">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog
                isOpen={!!userToDelete}
                title="Delete User"
                message={`Are you sure you want to delete the user "${userToDelete?.Username}"? This action cannot be undone.`}
                onConfirm={() => {
                    deleteMutation.mutate(userToDelete.Id);
                    setUserToDelete(null);
                }}
                onCancel={() => setUserToDelete(null)}
                confirmText="Delete"
                cancelText="Cancel"
                isDanger={true}
                isLoading={deleteMutation.isPending}
            />
        </div>
    );
};

export default UserManagement;
