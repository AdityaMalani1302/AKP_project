import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api';
import { FiFileText, FiPlay, FiEye, FiDownload, FiTrash2, FiPlus, FiX, FiClock, FiCalendar, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { format, parseISO, isValid } from 'date-fns';

const ReportBuilder = () => {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingReport, setEditingReport] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [formData, setFormData] = useState({
        ReportName: '',
        Description: '',
        SqlQuery: '',
        DatabaseName: 'IcSoftVer3'
    });

    // Fetch all reports
    const { data: reports = [], isLoading } = useQuery({
        queryKey: ['reports'],
        queryFn: async () => {
            const response = await api.get('/reports');
            return response.data;
        }
    });

    // Fetch report logs
    const { data: logs = [] } = useQuery({
        queryKey: ['reportLogs'],
        queryFn: async () => {
            const response = await api.get('/reports/logs/all');
            return response.data;
        }
    });

    // Create/Update report mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (editingReport) {
                const response = await api.put(`/reports/${editingReport.ReportId}`, data);
                return response.data;
            } else {
                const response = await api.post('/reports', data);
                return response.data;
            }
        },
        onSuccess: () => {
            toast.success(editingReport ? 'Report updated!' : 'Report created!');
            resetForm();
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to save report');
        }
    });

    // Delete report mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.delete(`/reports/${id}`);
            return response.data;
        },
        onSuccess: () => {
            toast.success('Report deleted!');
            queryClient.invalidateQueries({ queryKey: ['reports'] });
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete report');
        }
    });

    // Preview report mutation
    const previewMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.post(`/reports/${id}/preview`);
            return response.data;
        },
        onSuccess: (data) => {
            setPreviewData(data);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Preview failed');
        }
    });

    // Execute report mutation
    const executeMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.post(`/reports/${id}/execute`);
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(`PDF generated! ${data.rowCount} rows, ${data.executionTime}`);
            queryClient.invalidateQueries({ queryKey: ['reportLogs'] });
            // Trigger FiDownload - use direct path since downloadUrl already includes /api
            window.open(data.downloadUrl, '_blank');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Execution failed');
            queryClient.invalidateQueries({ queryKey: ['reportLogs'] });
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.ReportName || !formData.SqlQuery) {
            toast.error('Report Name and SQL Query are required');
            return;
        }
        saveMutation.mutate(formData);
    };

    const resetForm = () => {
        setFormData({ ReportName: '', Description: '', SqlQuery: '', DatabaseName: 'IcSoftVer3' });
        setEditingReport(null);
        setShowForm(false);
    };

    const openEdit = (report) => {
        setEditingReport(report);
        setFormData({
            ReportName: report.ReportName,
            Description: report.Description || '',
            SqlQuery: report.SqlQuery,
            DatabaseName: report.DatabaseName || 'IcSoftVer3'
        });
        setShowForm(true);
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success': return <FiCheckCircle size={14} color="#22C55E" />;
            case 'failed': return <FiXCircle size={14} color="#EF4444" />;
            default: return <FiClock size={14} color="#F59E0B" />;
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
                    <h2 className="page-title">📊 Report Builder</h2>
                    <p className="page-subtitle">Create and manage SQL report templates</p>
                </div>
                <button 
                    className="btn btn-primary" 
                    onClick={() => { resetForm(); setShowForm(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <FiPlus size={16} /> New Report
                </button>
            </div>

            {/* Report Form Modal */}
            {showForm && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.5)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    zIndex: 1000 
                }}>
                    <div style={{ 
                        backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', 
                        width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                                {editingReport ? 'Edit Report' : 'Create New Report'}
                            </h3>
                            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                        Report Name *
                                    </label>
                                    <input 
                                        type="text" 
                                        value={formData.ReportName}
                                        onChange={(e) => setFormData({ ...formData, ReportName: e.target.value })}
                                        className="input-field"
                                        placeholder="e.g., Daily Sales Report"
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                        Database
                                    </label>
                                    <select 
                                        value={formData.DatabaseName}
                                        onChange={(e) => setFormData({ ...formData, DatabaseName: e.target.value })}
                                        className="input-field"
                                    >
                                        <option value="IcSoftVer3">IcSoftVer3</option>
                                        <option value="IcSoftReportVer3">IcSoftReportVer3</option>
                                        <option value="IcSoftLedgerVer3">IcSoftLedgerVer3</option>
                                        <option value="BizSpot">BizSpot</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    Description
                                </label>
                                <input 
                                    type="text" 
                                    value={formData.Description}
                                    onChange={(e) => setFormData({ ...formData, Description: e.target.value })}
                                    className="input-field"
                                    placeholder="Brief description of this report"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    SQL Query *
                                </label>
                                <textarea 
                                    value={formData.SqlQuery}
                                    onChange={(e) => setFormData({ ...formData, SqlQuery: e.target.value })}
                                    className="input-field"
                                    placeholder="SELECT * FROM YourTable WHERE ..."
                                    required
                                    style={{ 
                                        minHeight: '200px', 
                                        fontFamily: 'Consolas, Monaco, monospace',
                                        fontSize: '0.875rem',
                                        lineHeight: '1.5'
                                    }}
                                />
                                <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                    💡 Use date functions like GETDATE() for dynamic reports
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saveMutation.isPending}>
                                    {saveMutation.isPending ? 'Saving...' : (editingReport ? 'Update Report' : 'Create Report')}
                                </button>
                                <button type="button" onClick={resetForm} style={{ 
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

            {/* Preview Modal */}
            {previewData && (
                <div style={{ 
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.5)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    zIndex: 1000 
                }}>
                    <div style={{ 
                        backgroundColor: 'white', borderRadius: '0.5rem', padding: '1.5rem', 
                        width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto' 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>{previewData.reportName}</h3>
                                <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                    {previewData.rowCount} rows {previewData.rowCount > 100 && '(showing first 100)'}
                                </p>
                            </div>
                            <button onClick={() => setPreviewData(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <FiX size={20} />
                            </button>
                        </div>

                        <div style={{ overflowX: 'auto', maxHeight: '60vh' }}>
                            {previewData.data.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>No data returned</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#1F2937', color: 'white' }}>
                                            {previewData.columns.map((col, i) => (
                                                <th key={i} style={{ padding: '0.5rem', textAlign: 'left', whiteSpace: 'nowrap' }}>{col}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.data.map((row, rowIdx) => (
                                            <tr key={rowIdx} style={{ backgroundColor: rowIdx % 2 === 0 ? '#F9FAFB' : 'white', borderBottom: '1px solid #E5E7EB' }}>
                                                {previewData.columns.map((col, colIdx) => (
                                                    <td key={colIdx} style={{ padding: '0.5rem', whiteSpace: 'nowrap' }}>
                                                        {row[col] !== null && row[col] !== undefined ? String(row[col]).substring(0, 50) : '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Reports Table */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiFileText size={18} /> Report Templates ({reports.length})
                </h3>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>Loading reports...</div>
                ) : reports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280', backgroundColor: '#F9FAFB', borderRadius: '0.5rem' }}>
                        <FiFileText size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <p>No reports created yet</p>
                        <p style={{ fontSize: '0.875rem' }}>Click "New Report" to create your first report template</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Report Name</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Description</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Database</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'left', fontWeight: '600' }}>Created</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: '600' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map((report) => (
                                    <tr key={report.ReportId} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                        <td style={{ padding: '0.75rem 0.5rem', fontWeight: '500' }}>{report.ReportName}</td>
                                        <td style={{ padding: '0.75rem 0.5rem', color: '#6B7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {report.Description || '-'}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem' }}>
                                            <span style={{ padding: '0.125rem 0.5rem', backgroundColor: '#E0E7FF', color: '#3730A3', borderRadius: '0.25rem', fontSize: '0.75rem' }}>
                                                {report.DatabaseName}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.8rem', color: '#6B7280' }}>
                                            {formatDate(report.CreatedAt)}
                                        </td>
                                        <td style={{ padding: '0.75rem 0.5rem' }}>
                                            <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                                <button 
                                                    onClick={() => previewMutation.mutate(report.ReportId)}
                                                    disabled={previewMutation.isPending}
                                                    title="Preview Data"
                                                    style={{ padding: '0.375rem', backgroundColor: '#DBEAFE', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                >
                                                    <FiEye size={14} color="#2563EB" />
                                                </button>
                                                <button 
                                                    onClick={() => executeMutation.mutate(report.ReportId)}
                                                    disabled={executeMutation.isPending}
                                                    title="Generate PDF"
                                                    style={{ padding: '0.375rem', backgroundColor: '#DCFCE7', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                >
                                                    <FiDownload size={14} color="#16A34A" />
                                                </button>
                                                <button 
                                                    onClick={() => openEdit(report)}
                                                    title="Edit"
                                                    style={{ padding: '0.375rem', backgroundColor: '#FEF3C7', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                                                >
                                                    <FiFileText size={14} color="#D97706" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        if (window.confirm(`Delete "${report.ReportName}"?`)) {
                                                            deleteMutation.mutate(report.ReportId);
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

            {/* Execution Logs */}
            <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FiClock size={18} /> Recent Executions
                </h3>

                {logs.length === 0 ? (
                    <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>No execution logs yet</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Report</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Executed At</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Rows</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>Time</th>
                                    <th style={{ padding: '0.5rem', textAlign: 'left' }}>File</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.slice(0, 10).map((log) => (
                                    <tr key={log.LogId} style={{ borderBottom: '1px solid #E5E7EB' }}>
                                        <td style={{ padding: '0.5rem' }}>{getStatusIcon(log.Status)}</td>
                                        <td style={{ padding: '0.5rem' }}>{log.ReportName}</td>
                                        <td style={{ padding: '0.5rem', color: '#6B7280' }}>{formatDate(log.ExecutedAt)}</td>
                                        <td style={{ padding: '0.5rem' }}>{log.RecordCount ?? '-'}</td>
                                        <td style={{ padding: '0.5rem' }}>{log.ExecutionTimeMs ? `${log.ExecutionTimeMs}ms` : '-'}</td>
                                        <td style={{ padding: '0.5rem' }}>
                                            {log.PdfFileName ? (
                                                <a 
                                                    href={`/api/reports/FiDownload/${log.PdfFileName}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#2563EB', textDecoration: 'underline' }}
                                                >
                                                    FiDownload
                                                </a>
                                            ) : log.ErrorMessage ? (
                                                <span style={{ color: '#EF4444', fontSize: '0.75rem' }} title={log.ErrorMessage}>
                                                    Error
                                                </span>
                                            ) : '-'}
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

export default ReportBuilder;
