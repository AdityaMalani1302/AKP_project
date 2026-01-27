import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../api';
import '../App.css';
import AssetTab from './it-management/AssetTab';
import SoftwareListTab from './it-management/SoftwareListTab';
import SystemUserDetailsTab from './it-management/SystemUserDetailsTab';
import DeviceRepairedHistoryTab from './it-management/DeviceRepairedHistoryTab';
import ComplaintTab from './it-management/ComplaintTab';
import ITResolvedTab from './it-management/ITResolvedTab';
import IssuedMaterialTab from './it-management/IssuedMaterialTab';
import AnimatedTabs from './common/AnimatedTabs';

const ITManagement = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read tab from URL, default to 'asset'
    const activeTab = searchParams.get('tab') || 'asset';
    
    // Handler to change tab and update URL
    const setActiveTab = useCallback((tab) => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    // Fetch IT stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['it-management', 'stats'],
        queryFn: async () => {
            const res = await api.get('/it-management/stats');
            return res.data;
        },
        staleTime: 60000, // 1 minute
        refetchInterval: 60000 // Auto-refresh every 1 minute
    });

    const tabs = [
        { id: 'asset', label: 'Asset' },
        { id: 'software', label: 'Software List' },
        { id: 'systemuser', label: 'System User Details' },
        { id: 'repaired', label: 'Device Repaired History' },
        { id: 'complaint', label: 'Complaint' },
        { id: 'resolved', label: 'IT Resolved' },
        { id: 'issuedmaterial', label: 'Issued Material' }
    ];

    const renderTabContent = () => {
        switch (activeTab) {
            case 'asset':
                return <AssetTab />;
            case 'software':
                return <SoftwareListTab />;
            case 'systemuser':
                return <SystemUserDetailsTab />;
            case 'repaired':
                return <DeviceRepairedHistoryTab />;
            case 'complaint':
                return <ComplaintTab />;
            case 'resolved':
                return <ITResolvedTab />;
            case 'issuedmaterial':
                return <IssuedMaterialTab />;
            default:
                return null;
        }
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>IT Management</h2>

            {/* Stats Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                <div style={{
                    background: 'linear-gradient(135deg, #EBF5FF 0%, #DBEAFE 100%)',
                    borderLeft: '4px solid #3B82F6',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <span style={{ fontSize: '1.75rem' }}>💻</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#1E40AF' }}>
                            {statsLoading ? '...' : stats?.TotalAssets || 0}
                        </h3>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>Total Assets</p>
                    </div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
                    borderLeft: '4px solid #10B981',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <span style={{ fontSize: '1.75rem' }}>✅</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#047857' }}>
                            {statsLoading ? '...' : stats?.AssetsInUse || 0}
                        </h3>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>Assets In Use</p>
                    </div>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                    borderLeft: '4px solid #F59E0B',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem'
                }}>
                    <span style={{ fontSize: '1.75rem' }}>🎫</span>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#B45309' }}>
                            {statsLoading ? '...' : stats?.OpenComplaints || 0}
                        </h3>
                        <p style={{ margin: 0, color: '#6B7280', fontSize: '0.85rem' }}>Open Tickets</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <AnimatedTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {renderTabContent()}
        </div>
    );
};

export default ITManagement;

