import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { validateUserRegistration } from '../utils/validation';

const AdminDashboard = () => {
    const [formData, setFormData] = useState({ username: '', password: '', fullName: '', role: 'employee' });
    const [errors, setErrors] = useState({});

    const registerMutation = useMutation({
        mutationFn: async (newUser) => {
            const response = await api.post('/auth/register', newUser);
            return response.data;
        },
        onSuccess: () => {
            toast.message('Success', {
                description: 'User registered successfully!',
            });
            setFormData({ username: '', password: '', fullName: '', role: 'employee' });
            setErrors({});
        },
        onError: (error) => {
            const errorMsg = error.response?.data?.error || 'Registration failed';
            toast.error(errorMsg);
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate first
        const validationErrors = validateUserRegistration(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error('Please fix the validation errors.');
            return;
        }
        setErrors({});

        registerMutation.mutate(formData);
    };

    return (
        <div className="card">
            <div className="page-header">
                <h2 className="page-title">Admin Dashboard</h2>
                <p className="page-subtitle">Manage users and system settings.</p>
            </div>

            <div className="form-grid" style={{ gap: '2rem' }}>
                {/* User Registration Card */}
                <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
                    <h3 className="text-lg font-semibold mb-xl flex items-center gap-sm" style={{ color: 'var(--text-primary)' }}>
                        <span>👤</span> Register New User
                    </h3>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
                        <div>
                            <label htmlFor="admin-username" className="text-sm font-medium mb-sm" style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                Username
                            </label>
                            <input
                                id="admin-username"
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                required
                                className="input-field"
                                placeholder="e.g., jdoe"
                                aria-required="true"
                                style={{ borderColor: errors.username ? '#EF4444' : undefined }}
                            />
                            {errors.username && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.username}</span>}
                        </div>
                        <div>
                            <label htmlFor="admin-fullname" className="text-sm font-medium mb-sm" style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                Full Name
                            </label>
                            <input
                                id="admin-fullname"
                                type="text"
                                value={formData.fullName}
                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                required
                                className="input-field"
                                placeholder="e.g., John Doe"
                                aria-required="true"
                                style={{ borderColor: errors.fullName ? '#EF4444' : undefined }}
                            />
                            {errors.fullName && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.fullName}</span>}
                        </div>
                        <div>
                            <label htmlFor="admin-password" className="text-sm font-medium mb-sm" style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                Password
                            </label>
                            <input
                                id="admin-password"
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                                className="input-field"
                                placeholder="••••••••"
                                aria-required="true"
                                style={{ borderColor: errors.password ? '#EF4444' : undefined }}
                            />
                            {errors.password && <span style={{ color: '#EF4444', fontSize: '0.75rem', display: 'block', marginTop: '0.25rem' }}>{errors.password}</span>}
                        </div>
                        <div>
                            <label htmlFor="admin-role" className="text-sm font-medium mb-sm" style={{ display: 'block', color: 'var(--text-secondary)' }}>
                                Role
                            </label>
                            <select
                                id="admin-role"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="input-field"
                                aria-label="Select user role"
                            >
                                <option value="employee">Employee</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ marginTop: '0.5rem' }}
                            disabled={registerMutation.isPending}
                        >
                            {registerMutation.isPending ? 'Creating User...' : 'Create User'}
                        </button>
                    </form>

                    {/* Simple Success Message handled by toast, but keeping error block if needed for persistent errors */}
                    {registerMutation.isError && (
                        <div style={{
                            marginTop: '1rem',
                            padding: '0.75rem',
                            backgroundColor: '#FEF2F2',
                            color: '#991B1B',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            border: '1px solid #FECACA'
                        }}>
                            ⚠️ {registerMutation.error?.response?.data?.error || 'Registration failed'}
                        </div>
                    )}
                </div>

                {/* Placeholder for future admin features */}
                <div style={{
                    backgroundColor: '#F9FAFB',
                    border: '1px dashed #D1D5DB',
                    borderRadius: '0.5rem',
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6B7280',
                    minHeight: '300px'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
                    <p style={{ fontWeight: '500' }}>System Statistics</p>
                    <p style={{ fontSize: '0.875rem' }}>Coming soon...</p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
