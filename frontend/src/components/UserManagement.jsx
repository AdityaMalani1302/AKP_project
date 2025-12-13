import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { validateUserRegistration } from '../utils/validation';

// Available pages for permission assignment
const AVAILABLE_PAGES = [
    { id: 'dashboard', label: 'Dashboard', path: '/' },
    { id: 'pattern-master', label: 'Pattern Master', path: '/pattern-master' },
    { id: 'planning-master', label: 'Planning', path: '/planning-master' },
    { id: 'lab-master', label: 'Lab Master', path: '/lab-master' },
    { id: 'melting', label: 'Melting', path: '/melting' },
    { id: 'database-explorer', label: 'Database Explorer', path: '/database-explorer' },
];

const UserManagement = () => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({ 
        username: '', 
        password: '', 
        fullName: '', 
        role: 'employee',
        allowedPages: ['dashboard']
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
            setFormData({ username: '', password: '', fullName: '', role: 'employee', allowedPages: ['dashboard'] });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validateUserRegistration(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error('Please fix the validation errors.');
            return;
        }
        setErrors({});
        registerMutation.mutate(formData);
    };

    const handlePageToggle = (pageId, isEdit = false) => {
        const setter = isEdit ? setEditFormData : setFormData;
        setter(prev => {
            const currentPages = prev.allowedPages || [];
            if (currentPages.includes(pageId)) {
                if (pageId === 'dashboard') return prev;
                return { ...prev, allowedPages: currentPages.filter(p => p !== pageId) };
            } else {
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
        setter(prev => ({ ...prev, allowedPages: ['dashboard'] }));
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
                                    {AVAILABLE_PAGES.map(page => (
                                        <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', cursor: page.id === 'dashboard' ? 'not-allowed' : 'pointer' }}>
                                            <input type="checkbox" checked={formData.allowedPages?.includes(page.id)} onChange={() => handlePageToggle(page.id, false)} disabled={page.id === 'dashboard'} />
                                            {page.label}
                                        </label>
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
                                                    <button onClick={() => openEditModal(user)} style={{ padding: '0.25rem 0.75rem', backgroundColor: '#3B82F6', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                                                        Edit
                                                    </button>
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
                                    {AVAILABLE_PAGES.map(page => (
                                        <label key={page.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', cursor: page.id === 'dashboard' ? 'not-allowed' : 'pointer' }}>
                                            <input type="checkbox" checked={editFormData.allowedPages?.includes(page.id)} onChange={() => handlePageToggle(page.id, true)} disabled={page.id === 'dashboard'} />
                                            {page.label}
                                        </label>
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
        </div>
    );
};

export default UserManagement;
