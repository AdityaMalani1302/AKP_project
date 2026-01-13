import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { validateUserRegistration } from '../utils/validation';
import { AlertDialog } from './common';

// Available pages for permission assignment
const AVAILABLE_PAGES = [
    { id: 'homepage', label: 'Homepage', path: '/', isLocked: true },
    { id: 'sales-dashboard', label: 'Sales Dashboard', path: '/sales-dashboard' },
    { id: 'finance-dashboard', label: 'Finance Dashboard', path: '/finance-dashboard' },
    { id: 'ar-ap-dashboard', label: 'AR Dashboard', path: '/ar-ap-dashboard' },
    { id: 'production-dashboard', label: 'Production Dashboard', path: '/production-dashboard' },
    { id: 'pattern-master', label: 'Pattern Master', path: '/pattern-master' },
    { id: 'pattern-history', label: 'Pattern History', path: '/pattern-master', isSubTab: true, parent: 'pattern-master' },
    { id: 'planning-master', label: 'Planning', path: '/planning-master' },
    { id: 'planning-schedule', label: 'Planning Schedule Qty', path: '/planning-master', isSubTab: true, parent: 'planning-master' },
    { id: 'planning-entry', label: 'Planning Entry', path: '/planning-master', isSubTab: true, parent: 'planning-master' },
    { id: 'planning-sleeve', label: 'Sleeve Requirement', path: '/planning-master', isSubTab: true, parent: 'planning-master' },
    { id: 'planning-sleeve-indent', label: 'Sleeve Indent', path: '/planning-master', isSubTab: true, parent: 'planning-master' },
    { id: 'lab-master', label: 'Lab Master', path: '/lab-master' },
    { id: 'drawing-master', label: 'Drawing Master', path: '/lab-master', isSubTab: true, parent: 'lab-master' },
    { id: 'drawing-details', label: 'Drawing Details', path: '/lab-master', isSubTab: true, parent: 'lab-master' },
    { id: 'melting', label: 'Melting', path: '/melting' },
    { id: 'quality-lab', label: 'Quality & Lab', path: '/quality-lab' },
    { id: 'quality-lab-physical', label: 'Physical Properties', path: '/quality-lab', isSubTab: true, parent: 'quality-lab' },
    { id: 'quality-lab-micro', label: 'Microstructure & Hardness', path: '/quality-lab', isSubTab: true, parent: 'quality-lab' },
    { id: 'quality-lab-sand', label: 'Sand Properties', path: '/quality-lab', isSubTab: true, parent: 'quality-lab' },
    { id: 'quality-lab-chemistry', label: 'Chemistry (Spectro)', path: '/quality-lab', isSubTab: true, parent: 'quality-lab' },
    { id: 'quality-lab-mould', label: 'Mould Hardness', path: '/quality-lab', isSubTab: true, parent: 'quality-lab' },
    { id: 'it-management', label: 'IT Management', path: '/it-management' },
    { id: 'database-explorer', label: 'Database Explorer', path: '/database-explorer' },
];


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

    // Fetch all users
    const { data: users = [], isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data;
        }
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
            return <span style={{ padding: '0.25rem 0.5rem', backgroundColor: '#DCFCE7', color: '#166534', borderRadius: '0.25rem', fontSize: '0.75rem' }}>Full Access</span>;
        }
        const pages = allowedPages.split(',').filter(p => p);
        if (pages.length === 0) return <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>No access</span>;
        if (pages.length > 3) {
            return <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{pages.length} pages</span>;
        }
        return pages.map(p => {
            const page = AVAILABLE_PAGES.find(ap => ap.id === p);
            return page ? (
                <span key={p} style={{ padding: '0.125rem 0.375rem', backgroundColor: '#DBEAFE', color: '#1E40AF', borderRadius: '0.25rem', fontSize: '0.7rem', marginRight: '0.25rem' }}>
                    {page.label}
                </span>
            ) : null;
        });
    };

    return (
        <div className="card">
            <div className="page-header">
                <h2 className="page-title">User Management</h2>
                <p className="page-subtitle">Manage users and access permissions.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                {/* User Registration Card */}
                <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                        👤 Register New User
                    </h3>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>Username</label>
                            <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required className="input-field" placeholder="e.g., jdoe" style={{ borderColor: errors.username ? '#EF4444' : undefined }} />
                            {errors.username && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{errors.username}</span>}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>Full Name</label>
                            <input type="text" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required className="input-field" placeholder="e.g., John Doe" style={{ borderColor: errors.fullName ? '#EF4444' : undefined }} />
                            {errors.fullName && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{errors.fullName}</span>}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>Password</label>
                            <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required className="input-field" placeholder="••••••••" style={{ borderColor: errors.password ? '#EF4444' : undefined }} />
                            {errors.password && <span style={{ color: '#EF4444', fontSize: '0.75rem' }}>{errors.password}</span>}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#374151' }}>Role</label>
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-field">
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        {formData.role === 'employee' && (
                            <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '0.375rem', border: '1px solid #E5E7EB' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>🔐 Page Access</span>
                                    <div>
                                        <button type="button" onClick={() => handleSelectAll(false)} style={{ fontSize: '0.7rem', padding: '0.125rem 0.375rem', marginRight: '0.25rem', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>All</button>
                                        <button type="button" onClick={() => handleDeselectAll(false)} style={{ fontSize: '0.7rem', padding: '0.125rem 0.375rem', backgroundColor: '#6B7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Clear</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                    {AVAILABLE_PAGES.filter(page => !page.isSubTab).map(page => (
                                        <React.Fragment key={page.id}>
                                            <label style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.25rem', 
                                                fontSize: '0.75rem', 
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
                                                {page.isLocked && <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>(required)</span>}
                                            </label>
                                            {/* Show sub-tabs if parent is checked */}
                                            {page.id === 'pattern-master' && formData.allowedPages?.includes('pattern-master') && (
                                                <div style={{ 
                                                    gridColumn: '1 / -1', 
                                                    marginLeft: '1.5rem', 
                                                    padding: '0.5rem', 
                                                    backgroundColor: '#F5F3FF', 
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid #C4B5FD',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#7C3AED', fontWeight: '500', marginBottom: '0.25rem' }}>Pattern Tabs:</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'pattern-master').map(subTab => (
                                                            <label key={subTab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>
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
                                            {page.id === 'planning-master' && formData.allowedPages?.includes('planning-master') && (
                                                <div style={{ 
                                                    gridColumn: '1 / -1', 
                                                    marginLeft: '1.5rem', 
                                                    padding: '0.5rem', 
                                                    backgroundColor: '#FEF3C7', 
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid #FCD34D',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#D97706', fontWeight: '500', marginBottom: '0.25rem' }}>Planning Tabs:</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'planning-master').map(subTab => (
                                                            <label key={subTab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>
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
                                            {page.id === 'lab-master' && formData.allowedPages?.includes('lab-master') && (
                                                <div style={{ 
                                                    gridColumn: '1 / -1', 
                                                    marginLeft: '1.5rem', 
                                                    padding: '0.5rem', 
                                                    backgroundColor: '#ECFDF5', 
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid #A7F3D0',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: '500', marginBottom: '0.25rem' }}>Lab Master Tabs:</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'lab-master').map(subTab => (
                                                            <label key={subTab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>
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
                                            {page.id === 'quality-lab' && formData.allowedPages?.includes('quality-lab') && (
                                                <div style={{ 
                                                    gridColumn: '1 / -1', 
                                                    marginLeft: '1.5rem', 
                                                    padding: '0.5rem', 
                                                    backgroundColor: '#F0F9FF', 
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid #BFDBFE',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#3B82F6', fontWeight: '500', marginBottom: '0.25rem' }}>Department Tabs:</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'quality-lab').map(subTab => (
                                                            <label key={subTab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>
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
                <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                        👥 Registered Users ({users.length})
                    </h3>

                    {usersLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Loading users...</div>
                    ) : users.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>No users registered yet</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Username</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Full Name</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Role</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Access</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(user => (
                                        <tr key={user.Id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>{user.Username}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>{user.FullName}</td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <span style={{ padding: '0.125rem 0.5rem', backgroundColor: user.Role === 'admin' ? '#FEF3C7' : '#E0E7FF', color: user.Role === 'admin' ? '#92400E' : '#3730A3', borderRadius: '0.25rem', fontSize: '0.75rem', textTransform: 'capitalize' }}>
                                                    {user.Role}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>{getAccessBadges(user.AllowedPages)}</td>
                                            <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                {user.Role !== 'admin' && (
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                        <button onClick={() => openEditModal(user)} style={{ padding: '0.25rem 0.75rem', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                            Edit
                                                        </button>
                                                        <button 
                                                            onClick={() => setUserToDelete(user)} 
                                                            style={{ padding: '0.25rem 0.75rem', backgroundColor: '#EF4444', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}
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

            {/* Edit Modal */}
            {editingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', width: '100%', maxWidth: '450px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem', fontWeight: '600' }}>Edit User: {editingUser.Username}</h3>

                        <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Username</label>
                                <input type="text" value={editFormData.username} onChange={e => setEditFormData({ ...editFormData, username: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Full Name</label>
                                <input type="text" value={editFormData.fullName} onChange={e => setEditFormData({ ...editFormData, fullName: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>New Password (leave blank to keep current)</label>
                                <input type="password" value={editFormData.password} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })} className="input-field" placeholder="••••••••" />
                            </div>

                            <div style={{ padding: '0.75rem', backgroundColor: '#F9FAFB', borderRadius: '0.375rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>🔐 Page Access</span>
                                    <div>
                                        <button type="button" onClick={() => handleSelectAll(true)} style={{ fontSize: '0.7rem', padding: '0.125rem 0.375rem', marginRight: '0.25rem', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>All</button>
                                        <button type="button" onClick={() => handleDeselectAll(true)} style={{ fontSize: '0.7rem', padding: '0.125rem 0.375rem', backgroundColor: '#6B7280', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>Clear</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                    {AVAILABLE_PAGES.filter(page => !page.isSubTab).map(page => (
                                        <React.Fragment key={page.id}>
                                            <label style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.25rem', 
                                                fontSize: '0.8rem', 
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
                                                {page.isLocked && <span style={{ fontSize: '0.6rem', color: '#9CA3AF' }}>(required)</span>}
                                            </label>
                                            {/* Show sub-tabs if parent is checked */}
                                            {page.id === 'pattern-master' && editFormData.allowedPages?.includes('pattern-master') && (
                                                <div style={{ 
                                                    gridColumn: '1 / -1', 
                                                    marginLeft: '1.5rem', 
                                                    padding: '0.5rem', 
                                                    backgroundColor: '#F5F3FF', 
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid #C4B5FD',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#7C3AED', fontWeight: '500', marginBottom: '0.25rem' }}>Pattern Tabs:</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'pattern-master').map(subTab => (
                                                            <label key={subTab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>
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
                                            {page.id === 'planning-master' && editFormData.allowedPages?.includes('planning-master') && (
                                                <div style={{ 
                                                    gridColumn: '1 / -1', 
                                                    marginLeft: '1.5rem', 
                                                    padding: '0.5rem', 
                                                    backgroundColor: '#FEF3C7', 
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid #FCD34D',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#D97706', fontWeight: '500', marginBottom: '0.25rem' }}>Planning Tabs:</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'planning-master').map(subTab => (
                                                            <label key={subTab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>
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
                                            {page.id === 'lab-master' && editFormData.allowedPages?.includes('lab-master') && (
                                                <div style={{ 
                                                    gridColumn: '1 / -1', 
                                                    marginLeft: '1.5rem', 
                                                    padding: '0.5rem', 
                                                    backgroundColor: '#ECFDF5', 
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid #A7F3D0',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#059669', fontWeight: '500', marginBottom: '0.25rem' }}>Lab Master Tabs:</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'lab-master').map(subTab => (
                                                            <label key={subTab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>
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
                                            {page.id === 'quality-lab' && editFormData.allowedPages?.includes('quality-lab') && (
                                                <div style={{ 
                                                    gridColumn: '1 / -1', 
                                                    marginLeft: '1.5rem', 
                                                    padding: '0.5rem', 
                                                    backgroundColor: '#F0F9FF', 
                                                    borderRadius: '0.25rem',
                                                    border: '1px solid #BFDBFE',
                                                    marginBottom: '0.25rem'
                                                }}>
                                                    <div style={{ fontSize: '0.65rem', color: '#3B82F6', fontWeight: '500', marginBottom: '0.25rem' }}>Department Tabs:</div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem' }}>
                                                        {AVAILABLE_PAGES.filter(p => p.parent === 'quality-lab').map(subTab => (
                                                            <label key={subTab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>
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

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button type="button" onClick={() => setEditingUser(null)} style={{ flex: 1, padding: '0.5rem', backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB', borderRadius: '0.375rem', cursor: 'pointer' }}>
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
