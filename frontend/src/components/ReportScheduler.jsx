import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { FiCalendar, FiClock, FiPlay, FiPause, FiTrash2, FiPlus, FiX, FiRefreshCw, FiSend, FiUsers, FiFileText, FiMessageSquare, FiCheck, FiAlertCircle, FiEdit2 } from 'react-icons/fi';
import { format, parseISO, isValid } from 'date-fns';
import CharacterCounter from './common/CharacterCounter';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ReportScheduler = () => {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'whatsapp' | 'send' | 'logs'
    const [formData, setFormData] = useState({
        ReportId: '',
        ScheduleName: '',
        Frequency: 'daily',
        DayOfWeek: 1,
        DayOfMonth: 1,
        TimeOfDay: '08:00',
        WhatsAppEnabled: false,
        ReportFormat: 'pdf',
        WhatsAppContactIds: []
    });

    // Contact form state
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactFormData, setContactFormData] = useState({ Name: '', PhoneNumber: '', Department: '' });

    // Edit contact state
    const [editingContactId, setEditingContactId] = useState(null);
    const [editContactData, setEditContactData] = useState({ Name: '', PhoneNumber: '', Department: '' });

    // Send Now form state
    const [sendForm, setSendForm] = useState({
        type: 'report', // 'report' | 'text'
        ReportId: '',
        Format: 'pdf',
        ContactIds: [],
        Message: ''
    });

    // ==========================================
    // EXISTING QUERIES (Reports, Schedules, Status)
    // ==========================================

    const { data: reports = [] } = useQuery({
        queryKey: ['reports'],
        queryFn: async () => {
            const response = await api.get('/reports');
            return response.data;
        }
    });

    const { data: schedules = [], isLoading } = useQuery({
        queryKey: ['schedules'],
        queryFn: async () => {
            const response = await api.get('/schedules');
            return response.data;
        }
    });

    const { data: schedulerStatus } = useQuery({
        queryKey: ['schedulerStatus'],
        queryFn: async () => {
            const response = await api.get('/schedules/status/info');
            return response.data;
        },
        refetchInterval: 60000
    });

    // ==========================================
    // WHATSAPP QUERIES
    // ==========================================

    const { data: waContacts = [] } = useQuery({
        queryKey: ['whatsappContacts'],
        queryFn: async () => {
            const response = await api.get('/whatsapp/contacts');
            return response.data;
        }
    });

    const { data: waConfig } = useQuery({
        queryKey: ['whatsappConfig'],
        queryFn: async () => {
            const response = await api.get('/whatsapp/config');
            return response.data;
        }
    });

    const { data: waLogs = [] } = useQuery({
        queryKey: ['whatsappLogs'],
        queryFn: async () => {
            const response = await api.get('/whatsapp/logs');
            return response.data;
        },
        enabled: activeTab === 'logs'
    });

    // ==========================================
    // EXISTING MUTATIONS
    // ==========================================

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/schedules', data);
            return response.data;
        },
        onSuccess: async (data, variables) => {
            // If WhatsApp is enabled, update schedule contacts
            if (variables.WhatsAppEnabled && variables.WhatsAppContactIds?.length > 0) {
                try {
                    await api.put(`/whatsapp/schedule-contacts/${data.scheduleId}`, {
                        ContactIds: variables.WhatsAppContactIds,
                        WhatsAppEnabled: true,
                        ReportFormat: variables.ReportFormat
                    });
                } catch (err) {
                    console.error('Failed to link WhatsApp contacts:', err);
                }
            }
            toast.success('Schedule created!');
            setShowForm(false);
            setFormData({ ReportId: '', ScheduleName: '', Frequency: 'daily', DayOfWeek: 1, DayOfMonth: 1, TimeOfDay: '08:00', WhatsAppEnabled: false, ReportFormat: 'pdf', WhatsAppContactIds: [] });
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            queryClient.invalidateQueries({ queryKey: ['schedulerStatus'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to create schedule');
        }
    });

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

    // ==========================================
    // WHATSAPP MUTATIONS
    // ==========================================

    const addContactMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/whatsapp/contacts', data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Contact added!');
            setShowContactForm(false);
            setContactFormData({ Name: '', PhoneNumber: '', Department: '' });
            queryClient.invalidateQueries({ queryKey: ['whatsappContacts'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || error.response?.data?.details?.[0]?.message || 'Failed to add contact');
        }
    });

    const deleteContactMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.delete(`/whatsapp/contacts/${id}`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Contact deleted!');
            queryClient.invalidateQueries({ queryKey: ['whatsappContacts'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete contact');
        }
    });

    const editContactMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            const response = await api.put(`/whatsapp/contacts/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Contact updated!');
            setEditingContactId(null);
            queryClient.invalidateQueries({ queryKey: ['whatsappContacts'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || error.response?.data?.details?.[0]?.message || 'Failed to update contact');
        }
    });

    const sendTextMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/whatsapp/send-text', data);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['whatsappLogs'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to send message');
        }
    });

    const sendReportMutation = useMutation({
        mutationFn: async (data) => {
            const response = await api.post('/whatsapp/send-report', data);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['whatsappLogs'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to send report');
        }
    });

    // ==========================================
    // HELPER FUNCTIONS
    // ==========================================

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.ReportId) {
            toast.error('Please select a report');
            return;
        }
        createMutation.mutate(formData);
    };

    const getTimeDisplay = (timeValue) => {
        if (!timeValue) return '00:00';
        const str = String(timeValue);
        // Handle ISO date string like "1970-01-01T14:50:00.000Z"
        // Use getUTCHours/Minutes because MSSQL stores raw TIME values as UTC
        if (str.includes('T')) {
            const d = new Date(str);
            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
        }
        // Handle plain "HH:MM" or "HH:MM:SS"
        return str.substring(0, 5);
    };

    const formatFrequency = (schedule) => {
        const time = getTimeDisplay(schedule.TimeOfDay);
        switch (schedule.Frequency) {
            case 'daily':
                return `Daily at ${time}`;
            case 'weekly':
                return `Weekly on ${DAYS_OF_WEEK[schedule.DayOfWeek || 0]} at ${time}`;
            case 'monthly':
                return `Monthly on day ${schedule.DayOfMonth || 1} at ${time}`;
            default:
                return schedule.Frequency;
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        // Strip trailing 'Z' so parseISO treats the timestamp as local time
        // (the DB stores IST times but marks them as UTC)
        const cleanedStr = String(dateStr).replace(/Z$/i, '');
        const date = parseISO(cleanedStr);
        if (!isValid(date)) return '-';
        return format(date, 'dd MMM yyyy, HH:mm');
    };

    const handleSendNow = () => {
        if (sendForm.ContactIds.length === 0) {
            toast.error('Please select at least one contact');
            return;
        }
        if (sendForm.type === 'text') {
            if (!sendForm.Message.trim()) {
                toast.error('Please enter a message');
                return;
            }
            sendTextMutation.mutate({
                ContactIds: sendForm.ContactIds,
                Message: sendForm.Message
            });
        } else {
            if (!sendForm.ReportId) {
                toast.error('Please select a report');
                return;
            }
            sendReportMutation.mutate({
                ReportId: sendForm.ReportId,
                ContactIds: sendForm.ContactIds,
                Format: sendForm.Format
            });
        }
    };

    // ==========================================
    // STYLES
    // ==========================================

    const tabStyle = (isActive) => ({
        padding: '0.625rem 1.25rem',
        backgroundColor: isActive ? '#0081A7' : 'transparent',
        color: isActive ? 'white' : '#4B5563',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        fontWeight: isActive ? '600' : '500',
        fontSize: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s ease'
    });

    const cardStyle = {
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        border: '1px solid #E5E7EB',
        marginBottom: '1.5rem'
    };

    const badgeStyle = (color) => ({
        padding: '0.2rem 0.6rem',
        borderRadius: '9999px',
        fontSize: '0.7rem',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        ...(color === 'green' && { backgroundColor: '#DCFCE7', color: '#166534' }),
        ...(color === 'red' && { backgroundColor: '#FEE2E2', color: '#991B1B' }),
        ...(color === 'blue' && { backgroundColor: '#DBEAFE', color: '#1E40AF' }),
        ...(color === 'gray' && { backgroundColor: '#F3F4F6', color: '#374151' }),
        ...(color === 'amber' && { backgroundColor: '#FEF3C7', color: '#92400E' }),
    });

    // ==========================================
    // RENDER
    // ==========================================

    return (
        <div>
            {/* Page Header */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="page-title">⏰ Report Scheduler</h2>
                        <p className="page-subtitle">Schedule automatic report generation & WhatsApp delivery</p>
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

                {/* Status Bar */}
                <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    flexWrap: 'wrap',
                    marginTop: '1rem',
                    padding: '0.75rem 1rem', 
                    backgroundColor: '#F0FDF4', 
                    borderRadius: '0.5rem',
                    border: '1px solid #BBF7D0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                            width: '10px', height: '10px', 
                            backgroundColor: '#22C55E', borderRadius: '50%',
                            animation: 'pulse 2s infinite'
                        }} />
                        <span style={{ fontWeight: '500', fontSize: '0.875rem' }}>Scheduler Active</span>
                    </div>
                    <div style={{ color: '#6B7280', fontSize: '0.875rem' }}>
                        {schedulerStatus?.activeJobs || 0} active job(s)
                    </div>
                    {waConfig && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={badgeStyle(waConfig.configured ? 'green' : 'amber')}>
                                {waConfig.configured ? '✓ WhatsApp Connected' : '⚠ WhatsApp Not Configured'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div style={{ 
                display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', 
                padding: '0.375rem', backgroundColor: '#F3F4F6', borderRadius: '0.75rem',
                flexWrap: 'wrap'
            }}>
                <button onClick={() => setActiveTab('schedules')} style={tabStyle(activeTab === 'schedules')}>
                    <FiCalendar size={16} /> Schedules
                </button>
                <button onClick={() => setActiveTab('whatsapp')} style={tabStyle(activeTab === 'whatsapp')}>
                    <FiUsers size={16} /> WhatsApp Contacts
                </button>
                <button onClick={() => setActiveTab('send')} style={tabStyle(activeTab === 'send')}>
                    <FiSend size={16} /> Send Now
                </button>
                <button onClick={() => setActiveTab('logs')} style={tabStyle(activeTab === 'logs')}>
                    <FiFileText size={16} /> Delivery Logs
                </button>
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
                        backgroundColor: 'white', borderRadius: '0.75rem', padding: '1.5rem', 
                        width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto'
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
                                    className="input-field" required
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
                                        className="input-field" required
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

                            {/* Report Format */}
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Report Format
                                </label>
                                <select
                                    value={formData.ReportFormat}
                                    onChange={(e) => setFormData({ ...formData, ReportFormat: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="excel">Excel</option>
                                </select>
                            </div>

                            {/* WhatsApp Toggle */}
                            <div style={{ 
                                padding: '1rem', 
                                backgroundColor: '#F0FDF4', 
                                borderRadius: '0.5rem', 
                                border: '1px solid #BBF7D0' 
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500', fontSize: '0.875rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.WhatsAppEnabled}
                                        onChange={(e) => setFormData({ ...formData, WhatsAppEnabled: e.target.checked })}
                                        style={{ width: '1.1rem', height: '1.1rem', accentColor: '#25D366' }}
                                    />
                                    📱 Send via WhatsApp
                                </label>

                                {formData.WhatsAppEnabled && (
                                    <div style={{ marginTop: '0.75rem' }}>
                                        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.5rem' }}>
                                            Select contacts to receive this report:
                                        </p>
                                        {waContacts.length === 0 ? (
                                            <p style={{ fontSize: '0.8rem', color: '#EF4444' }}>
                                                No contacts added yet. Add contacts in the WhatsApp Contacts tab.
                                            </p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                                {waContacts.filter(c => c.IsActive).map(contact => (
                                                    <label key={contact.ContactId} style={{ 
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                                        cursor: 'pointer', fontSize: '0.85rem',
                                                        padding: '0.375rem 0.5rem', borderRadius: '0.375rem',
                                                        backgroundColor: formData.WhatsAppContactIds.includes(contact.ContactId) ? '#DCFCE7' : 'transparent'
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.WhatsAppContactIds.includes(contact.ContactId)}
                                                            onChange={() => {
                                                                const ids = formData.WhatsAppContactIds;
                                                                setFormData({
                                                                    ...formData,
                                                                    WhatsAppContactIds: ids.includes(contact.ContactId)
                                                                        ? ids.filter(id => id !== contact.ContactId)
                                                                        : [...ids, contact.ContactId]
                                                                });
                                                            }}
                                                            style={{ accentColor: '#25D366' }}
                                                        />
                                                        <span>{contact.Name}</span>
                                                        <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>+{contact.PhoneNumber}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

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

            {/* ==========================================
                TAB: Schedules
               ========================================== */}
            {activeTab === 'schedules' && (
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Format</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>WhatsApp</th>
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
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <span style={badgeStyle('blue')}>
                                                    {(schedule.ReportFormat || 'pdf').toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                {schedule.WhatsAppEnabled ? (
                                                    <span style={badgeStyle('green')}>📱 Enabled</span>
                                                ) : (
                                                    <span style={badgeStyle('gray')}>Off</span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#6B7280' }}>
                                                {formatDate(schedule.LastRun)}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                    <button 
                                                        onClick={() => toggleMutation.mutate(schedule.ScheduleId)}
                                                        disabled={toggleMutation.isPending}
                                                        title={schedule.IsActive ? 'Pause' : 'Resume'}
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
            )}

            {/* ==========================================
                TAB: WhatsApp Contacts
               ========================================== */}
            {activeTab === 'whatsapp' && (
                <div style={cardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FiUsers size={18} /> WhatsApp Contacts ({waContacts.length})
                        </h3>
                        <button 
                            className="btn btn-primary"
                            onClick={() => setShowContactForm(!showContactForm)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.875rem' }}
                        >
                            <FiPlus size={14} /> Add Contact
                        </button>
                    </div>

                    {/* Add Contact Form */}
                    {showContactForm && (
                        <div style={{ 
                            padding: '1rem', 
                            backgroundColor: '#F9FAFB', 
                            borderRadius: '0.5rem', 
                            marginBottom: '1rem',
                            border: '1px solid #E5E7EB'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: '500' }}>
                                        Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={contactFormData.Name}
                                        onChange={(e) => setContactFormData({ ...contactFormData, Name: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g., John Doe"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: '500' }}>
                                        Phone Number * <span style={{ color: '#9CA3AF', fontWeight: '400' }}>(with country code)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={contactFormData.PhoneNumber}
                                        onChange={(e) => setContactFormData({ ...contactFormData, PhoneNumber: e.target.value.replace(/\D/g, '') })}
                                        className="input-field"
                                        placeholder="e.g., 919876543210"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.8rem', fontWeight: '500' }}>
                                        Department
                                    </label>
                                    <input
                                        type="text"
                                        value={contactFormData.Department}
                                        onChange={(e) => setContactFormData({ ...contactFormData, Department: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g., Sales"
                                    />
                                </div>
                                <button
                                    onClick={() => {
                                        if (!contactFormData.Name || !contactFormData.PhoneNumber) {
                                            toast.error('Name and Phone Number are required');
                                            return;
                                        }
                                        addContactMutation.mutate(contactFormData);
                                    }}
                                    disabled={addContactMutation.isPending}
                                    className="btn btn-primary"
                                    style={{ height: '2.5rem', fontSize: '0.875rem' }}
                                >
                                    {addContactMutation.isPending ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Contacts Table */}
                    {waContacts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
                            <FiUsers size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p>No contacts added yet</p>
                            <p style={{ fontSize: '0.875rem' }}>Add team members' WhatsApp numbers to send them reports</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Name</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Phone Number</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Department</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Added</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waContacts.map((contact) => (
                                        <tr key={contact.ContactId} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                            {editingContactId === contact.ContactId ? (
                                                /* Inline Edit Mode */
                                                <>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            value={editContactData.Name}
                                                            onChange={(e) => setEditContactData({ ...editContactData, Name: e.target.value })}
                                                            className="input-field"
                                                            style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            value={editContactData.PhoneNumber}
                                                            onChange={(e) => setEditContactData({ ...editContactData, PhoneNumber: e.target.value.replace(/\D/g, '') })}
                                                            className="input-field"
                                                            style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem', fontFamily: 'monospace' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.5rem' }}>
                                                        <input
                                                            type="text"
                                                            value={editContactData.Department}
                                                            onChange={(e) => setEditContactData({ ...editContactData, Department: e.target.value })}
                                                            className="input-field"
                                                            style={{ fontSize: '0.85rem', padding: '0.375rem 0.5rem' }}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#6B7280' }}>{formatDate(contact.CreatedAt)}</td>
                                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => {
                                                                    if (!editContactData.Name || !editContactData.PhoneNumber) {
                                                                        toast.error('Name and Phone Number are required');
                                                                        return;
                                                                    }
                                                                    editContactMutation.mutate({ id: contact.ContactId, data: editContactData });
                                                                }}
                                                                disabled={editContactMutation.isPending}
                                                                title="Save"
                                                                style={{ padding: '0.375rem', backgroundColor: '#DCFCE7', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                            >
                                                                <FiCheck size={14} color="#16A34A" />
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingContactId(null)}
                                                                title="Cancel"
                                                                style={{ padding: '0.375rem', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                            >
                                                                <FiX size={14} color="#6B7280" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                /* Display Mode */
                                                <>
                                                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{contact.Name}</td>
                                                    <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', color: '#4B5563' }}>+{contact.PhoneNumber}</td>
                                                    <td style={{ padding: '0.75rem 0.5rem', color: '#6B7280' }}>{contact.Department || '-'}</td>
                                                    <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#6B7280' }}>{formatDate(contact.CreatedAt)}</td>
                                                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setEditingContactId(contact.ContactId);
                                                                    setEditContactData({
                                                                        Name: contact.Name,
                                                                        PhoneNumber: contact.PhoneNumber,
                                                                        Department: contact.Department || ''
                                                                    });
                                                                }}
                                                                title="Edit"
                                                                style={{ padding: '0.375rem', backgroundColor: '#DBEAFE', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                            >
                                                                <FiEdit2 size={14} color="#2563EB" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    if (window.confirm(`Delete contact "${contact.Name}"?`)) {
                                                                        deleteContactMutation.mutate(contact.ContactId);
                                                                    }
                                                                }}
                                                                title="Delete"
                                                                style={{ padding: '0.375rem', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                            >
                                                                <FiTrash2 size={14} color="#DC2626" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ==========================================
                TAB: Send Now
               ========================================== */}
            {activeTab === 'send' && (
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiSend size={18} /> Send via WhatsApp
                    </h3>

                    {!waConfig?.configured && (
                        <div style={{ 
                            padding: '1rem', marginBottom: '1rem',
                            backgroundColor: '#FEF3C7', borderRadius: '0.5rem', border: '1px solid #FCD34D',
                            fontSize: '0.875rem', color: '#92400E'
                        }}>
                            ⚠ WhatsApp API is not configured. Add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to your .env file.
                        </div>
                    )}

                    {/* Template info */}
                    {waConfig?.configured && (
                        <div style={{ 
                            padding: '0.75rem 1rem', marginBottom: '1rem',
                            backgroundColor: '#F0FDF4', borderRadius: '0.5rem', border: '1px solid #BBF7D0',
                            fontSize: '0.8rem', color: '#166534',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}>
                            ✅ Using template: <strong>{waConfig.templateName || 'scheduled_data_export'}</strong> — Reports are sent as template messages and will be delivered even to first-time contacts.
                        </div>
                    )}

                    {/* Message Type Selector */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                        <button
                            onClick={() => setSendForm({ ...sendForm, type: 'report' })}
                            style={{
                                ...tabStyle(sendForm.type === 'report'),
                                borderRadius: '0.375rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            <FiFileText size={14} /> Send Report
                        </button>
                        <button
                            onClick={() => setSendForm({ ...sendForm, type: 'text' })}
                            style={{
                                ...tabStyle(sendForm.type === 'text'),
                                borderRadius: '0.375rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            <FiMessageSquare size={14} /> Send Text
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {/* Left: Configuration */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {sendForm.type === 'report' ? (
                                <>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                            Report *
                                        </label>
                                        <select
                                            value={sendForm.ReportId}
                                            onChange={(e) => setSendForm({ ...sendForm, ReportId: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="">Select a report...</option>
                                            {reports.map((r) => (
                                                <option key={r.ReportId} value={r.ReportId}>{r.ReportName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                            Format
                                        </label>
                                        <select
                                            value={sendForm.Format}
                                            onChange={(e) => setSendForm({ ...sendForm, Format: e.target.value })}
                                            className="input-field"
                                        >
                                            <option value="pdf">PDF</option>
                                            <option value="excel">Excel (.xlsx)</option>
                                        </select>
                                    </div>
                                    <div style={{ 
                                        padding: '0.75rem', backgroundColor: '#EFF6FF', borderRadius: '0.5rem', 
                                        border: '1px solid #BFDBFE', fontSize: '0.8rem', color: '#1E40AF' 
                                    }}>
                                        📋 The report will be sent using the <strong>scheduled_data_export</strong> template with the report file attached. Recipients will see: <em>"Your scheduled data export [Report Name] is ready."</em>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                        Message *
                                    </label>
                                    <textarea
                                        value={sendForm.Message}
                                        onChange={(e) => setSendForm({ ...sendForm, Message: e.target.value })}
                                        className="input-field"
                                        rows={4}
                                        placeholder="Type your message here..."
                                        style={{ resize: 'vertical' }}
                                        maxLength={500}
                                    />
                                    <CharacterCounter value={sendForm.Message} maxLength={500} showAt={400} />
                                    <div style={{ 
                                        padding: '0.75rem', backgroundColor: '#FEF3C7', borderRadius: '0.5rem', 
                                        border: '1px solid #FCD34D', fontSize: '0.8rem', color: '#92400E',
                                        marginTop: '0.5rem'
                                    }}>
                                        ⚠ <strong>Note:</strong> Free-form text messages only work if the recipient has messaged your business number within the last 24 hours. For first-time contacts, use <strong>Send Report</strong> (template message) instead.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: Contact Selection */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                Recipients *
                            </label>
                            {waContacts.length === 0 ? (
                                <p style={{ fontSize: '0.85rem', color: '#EF4444' }}>
                                    No contacts. Add contacts in the WhatsApp Contacts tab first.
                                </p>
                            ) : (
                                <div style={{ 
                                    border: '1px solid #E5E7EB', borderRadius: '0.5rem', 
                                    padding: '0.5rem', maxHeight: '200px', overflowY: 'auto'
                                }}>
                                    {waContacts.filter(c => c.IsActive).map(contact => (
                                        <label key={contact.ContactId} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.5rem', borderRadius: '0.375rem', cursor: 'pointer',
                                            backgroundColor: sendForm.ContactIds.includes(contact.ContactId) ? '#DCFCE7' : 'transparent',
                                            transition: 'background-color 0.15s'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={sendForm.ContactIds.includes(contact.ContactId)}
                                                onChange={() => {
                                                    const ids = sendForm.ContactIds;
                                                    setSendForm({
                                                        ...sendForm,
                                                        ContactIds: ids.includes(contact.ContactId)
                                                            ? ids.filter(id => id !== contact.ContactId)
                                                            : [...ids, contact.ContactId]
                                                    });
                                                }}
                                                style={{ accentColor: '#25D366' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: '500', fontSize: '0.875rem' }}>{contact.Name}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>+{contact.PhoneNumber}{contact.Department ? ` · ${contact.Department}` : ''}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Send Button */}
                    <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={handleSendNow}
                            disabled={sendTextMutation.isPending || sendReportMutation.isPending || !waConfig?.configured}
                            className="btn btn-primary"
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                backgroundColor: '#25D366',
                                opacity: (!waConfig?.configured) ? 0.5 : 1
                            }}
                        >
                            <FiSend size={14} />
                            {(sendTextMutation.isPending || sendReportMutation.isPending) 
                                ? 'Sending...' 
                                : sendForm.type === 'report' ? 'Send Report (Template)' : 'Send Message'
                            }
                        </button>
                        <span style={{ fontSize: '0.8rem', color: '#9CA3AF', alignSelf: 'center' }}>
                            {sendForm.ContactIds.length} contact(s) selected
                        </span>
                    </div>
                </div>
            )}

            {/* ==========================================
                TAB: Delivery Logs
               ========================================== */}
            {activeTab === 'logs' && (
                <div style={cardStyle}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiFileText size={18} /> WhatsApp Delivery Logs
                    </h3>

                    {waLogs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
                            <FiFileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                            <p>No delivery logs yet</p>
                            <p style={{ fontSize: '0.875rem' }}>Send a message or report to see logs here</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Status</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Contact</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Type</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>File</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Sent At</th>
                                        <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Error</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waLogs.map((log) => (
                                        <tr key={log.LogId} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                {log.Status === 'sent' ? (
                                                    <span style={badgeStyle('green')}>
                                                        <FiCheck size={12} /> Sent
                                                    </span>
                                                ) : (
                                                    <span style={badgeStyle('red')}>
                                                        <FiAlertCircle size={12} /> Failed
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <div style={{ fontWeight: '500' }}>{log.ContactName || 'Unknown'}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#9CA3AF', fontFamily: 'monospace' }}>+{log.PhoneNumber}</div>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem' }}>
                                                <span style={badgeStyle('blue')}>
                                                    {log.MessageType === 'template' ? '📄 Template' : log.MessageType === 'document' ? '📄 Document' : '💬 Text'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#6B7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.FileName || '-'}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#6B7280' }}>
                                                {formatDate(log.SentAt)}
                                            </td>
                                            <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#EF4444', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {log.ErrorMessage || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ReportScheduler;
