import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { FiCalendar, FiClock, FiPlay, FiPause, FiTrash2, FiPlus, FiX, FiRefreshCw } from 'react-icons/fi';
import { format, parseISO, isValid } from 'date-fns';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ReportScheduler = () => {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        ReportId: '',
        ScheduleName: '',
        Frequency: 'daily',
        DayOfWeek: 1,
        DayOfMonth: 1,
        TimeOfDay: '08:00'
    });

    // Fetch reports for dropdown
    const { data: reports = [] } = useQuery({
        queryKey: ['reports'],
        queryFn: async () => {
            const response = await api.get('/reports');
            return response.data;
        }
    });

    // Fetch schedules
    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ['schedules'],
        queryFn: async () => {
            const response = await api.get('/schedules');
            return response.data;
        }
    });

    // Fetch scheduler status
    const { data: schedulerStatus } = useQuery({
        queryKey: ['schedulerStatus'],
        queryFn: async () => {
            const response = await api.get('/schedules/status/info');
            return response.data;
        },
        refetchInterval: 60000 // Refresh every 60 seconds (increased for performance)
    });

    // Create schedule
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/schedules', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Schedule created!');
            setShowForm(false);
            setFormData({ ReportId: '', ScheduleName: '', Frequency: 'daily', DayOfWeek: 1, DayOfMonth: 1, TimeOfDay: '08:00' });
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            queryClient.invalidateQueries({ queryKey: ['schedulerStatus'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to create schedule');
        }
    });

    // Toggle schedule
    const toggleMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.post(`/schedules/${id}/toggle`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Schedule toggled!');
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            queryClient.invalidateQueries({ queryKey: ['schedulerStatus'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to toggle schedule');
        }
    });

    // Delete schedule
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.delete(`/schedules/${id}`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Schedule deleted!');
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            queryClient.invalidateQueries({ queryKey: ['schedulerStatus'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete schedule');
        }
    });

    // Reload schedules
    const reloadMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post('/schedules/reload');
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(`Schedules reloaded! ${data.activeJobs} active jobs`);
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            queryClient.invalidateQueries({ queryKey: ['schedulerStatus'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to reload schedules');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.ReportId) {
            toast.error('Please select a report');
            return;
        }
        createMutation.mutate(formData);
    };

    const formatFrequency = (schedule) => {
        switch (schedule.Frequency) {
            case 'daily':
                return `Daily at ${schedule.TimeOfDay?.substring(0, 5)}`;
            case 'weekly':
                return `Weekly on ${DAYS_OF_WEEK[schedule.DayOfWeek || 0]} at ${schedule.TimeOfDay?.substring(0, 5)}`;
            case 'monthly':
                return `Monthly on day ${schedule.DayOfMonth || 1} at ${schedule.TimeOfDay?.substring(0, 5)}`;
            default:
                return schedule.Frequency;
        }
    };

    // Format datetime for display using date-fns (locale-independent)
    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = parseISO(dateStr);
        if (!isValid(date)) return '-';
        return format(date, 'dd MMM yyyy, HH:mm');
    };

    return (
        <div className="card">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="page-title">⏰ Report Scheduler</h2>
                    <p className="page-subtitle">Schedule automatic report generation</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => reloadMutation.mutate()}
                        disabled={reloadMutation.isPending}
                        title="Reload Schedules"
                        style={{ 
                            padding: '0.5rem', 
                            backgroundColor: '#F3F4F6', 
                            border: '1px solid #D1D5DB', 
                            borderRadius: '0.375rem', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <FiRefreshCw size={16} className={reloadMutation.isPending ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => setShowForm(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        <FiPlus size={16} /> New Schedule
                    </button>
                </div>
            </div>

            {/* Scheduler Status */}
            <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginBottom: '1.5rem', 
                padding: '1rem', 
                backgroundColor: '#F0FDF4', 
                borderRadius: '0.5rem',
                border: '1px solid #BBF7D0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ 
                        width: '10px', 
                        height: '10px', 
                        backgroundColor: '#22C55E', 
                        borderRadius: '50%',
                        animation: 'pulse 2s infinite'
                    }} />
                    <span style={{ fontWeight: '500' }}>Scheduler Active</span>
                </div>
                <div style={{ color: '#6B7280' }}>
                    {schedulerStatus?.activeJobs || 0} active job(s)
                </div>
            </div>

            {/* Schedule Form Modal */}
            {showForm && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.5)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    zIndex: 1000 
                }}>
                    <div style={{ 
                        backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', 
                        width: '100%', maxWidth: '500px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Create Schedule</h3>
                            <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Report *
                                </label>
                                <select 
                                    value={formData.ReportId}
                                    onChange={(e) => setFormData({ ...formData, ReportId: e.target.value })}
                                    className="input-field"
                                    required
                                >
                                    <option value="">Select a report...</option>
                                    {reports.map((r) => (
                                        <option key={r.ReportId} value={r.ReportId}>{r.ReportName}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Schedule Name
                                </label>
                                <input 
                                    type="text"
                                    value={formData.ScheduleName}
                                    onChange={(e) => setFormData({ ...formData, ScheduleName: e.target.value })}
                                    className="input-field"
                                    placeholder="e.g., Morning Sales Report"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                        Frequency *
                                    </label>
                                    <select 
                                        value={formData.Frequency}
                                        onChange={(e) => setFormData({ ...formData, Frequency: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="daily">Daily</option>
                                        <option value="weekly">Weekly</option>
                                        <option value="monthly">Monthly</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                        Time *
                                    </label>
                                    <input 
                                        type="time"
                                        value={formData.TimeOfDay}
                                        onChange={(e) => setFormData({ ...formData, TimeOfDay: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                            </div>

                            {formData.Frequency === 'weekly' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                        Day of Week
                                    </label>
                                    <select 
                                        value={formData.DayOfWeek}
                                        onChange={(e) => setFormData({ ...formData, DayOfWeek: parseInt(e.target.value) })}
                                        className="input-field"
                                    >
                                        {DAYS_OF_WEEK.map((day, i) => (
                                            <option key={i} value={i}>{day}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.Frequency === 'monthly' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                        Day of Month
                                    </label>
                                    <select 
                                        value={formData.DayOfMonth}
                                        onChange={(e) => setFormData({ ...formData, DayOfMonth: parseInt(e.target.value) })}
                                        className="input-field"
                                    >
                                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                            <option key={day} value={day}>{day}</option>
                                        ))}
                                    </select>
                                    <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                        Note: Days 29-31 may be skipped in shorter months
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={createMutation.isPending}>
                                    {createMutation.isPending ? 'Creating...' : 'Create Schedule'}
                                </button>
                                <button type="button" onClick={() => setShowForm(false)} style={{ 
                                    flex: 1, padding: '0.5rem', backgroundColor: '#F3F4F6', 
                                    border: '1px solid #D1D5DB', borderRadius: '0.375rem', cursor: 'pointer' 
                                }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Schedules Table */}
            <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiCalendar size={18} /> Scheduled Reports ({schedules.length})
                </h3>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Loading schedules...</div>
                ) : schedules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
                        <FiClock size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <p>No schedules created yet</p>
                        <p style={{ fontSize: '0.875rem' }}>Click "New Schedule" to automate report generation</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Report</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Schedule</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Last Run</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schedules.map((schedule) => (
                                    <tr key={schedule.ScheduleId} style={{ borderBottom: '1px solid #E5E7EB', opacity: schedule.IsActive ? 1 : 0.5 }}>
                                        <td style={{ padding: '0.75rem 0.5rem' }}>
                                            {schedule.IsActive ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#22C55E' }}>
                                                    <FiPlay size={14} /> Active
                                                </span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6B7280' }}>
                                                    <FiPause size={14} /> Paused
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem' }}>
                                            <div style={{ fontWeight: '500' }}>{schedule.ReportName}</div>
                                            {schedule.ScheduleName && (
                                                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{schedule.ScheduleName}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem' }}>
                                            <span style={{ 
                                                padding: '0.25rem 0.5rem', 
                                                backgroundColor: '#E0E7FF', 
                                                color: '#3730A3', 
                                                borderRadius: '0.25rem', 
                                                fontSize: '0.75rem' 
                                            }}>
                                                {formatFrequency(schedule)}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#6B7280' }}>
                                            {formatDate(schedule.LastRun)}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                <button 
                                                    onClick={() => toggleMutation.mutate(schedule.ScheduleId)}
                                                    disabled={toggleMutation.isPending}
                                                    title={schedule.IsActive ? 'FiPause' : 'Resume'}
                                                    style={{ 
                                                        padding: '0.375rem', 
                                                        backgroundColor: schedule.IsActive ? '#FEF3C7' : '#DCFCE7', 
                                                        border: 'none', 
                                                        borderRadius: '0.25rem', 
                                                        cursor: 'pointer' 
                                                    }}
                                                >
                                                    {schedule.IsActive ? <FiPause size={14} color="#D97706" /> : <FiPlay size={14} color="#16A34A" />}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm(`Delete this schedule for "${schedule.ReportName}"?`)) {
                                                            deleteMutation.mutate(schedule.ScheduleId);
                                                        }
                                                    }}
                                                    title="Delete"
                                                    style={{ padding: '0.375rem', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                >
                                                    <FiTrash2 size={14} color="#DC2626" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportScheduler;
