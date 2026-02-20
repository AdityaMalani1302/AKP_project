import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../App.css';
import PhysicalPropertiesTab from './quality-lab/PhysicalPropertiesTab';
import MicrostructureTab from './quality-lab/MicrostructureTab';
import SandPropertiesTab from './quality-lab/SandPropertiesTab';
import ChemistryTab from './quality-lab/ChemistryTab';
import MouldHardnessTab from './quality-lab/MouldHardnessTab';
import ReportsTab from './quality-lab/ReportsTab';
import AnimatedTabs from './common/AnimatedTabs';

const QualityLab = ({ user }) => {
    // All available tabs with their permission pageId
    const allTabs = [
        { id: 'physical', label: 'Physical Properties', pageId: 'quality-lab-physical' },
        { id: 'microstructure', label: 'Microstructure & Hardness', pageId: 'quality-lab-micro' },
        { id: 'sand', label: 'Sand Properties', pageId: 'quality-lab-sand' },
        { id: 'chemistry', label: 'Chemistry (Spectro)', pageId: 'quality-lab-chemistry' },
        { id: 'mould', label: 'Mould Hardness', pageId: 'quality-lab-mould' },
        { id: 'reports', label: 'Reports', pageId: 'quality-lab-reports' }
    ];

    // Filter tabs based on user permissions
    const getVisibleTabs = () => {
        if (!user) return allTabs;
        
        // Admins see all tabs
        if (user.role === 'admin') return allTabs;
        
        const allowedPages = user.allowedPages || [];
        
        // If user has 'all' access, show all tabs
        if (allowedPages.includes('all')) return allTabs;
        
        // If no specific sub-tabs are assigned, show no tabs (user has parent access but no sub-tab access)
        const hasAnySubTab = allTabs.some(tab => allowedPages.includes(tab.pageId));
        if (!hasAnySubTab) return [];
        
        // Filter to only allowed tabs
        return allTabs.filter(tab => allowedPages.includes(tab.pageId));
    };

    const visibleTabs = getVisibleTabs();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read tab from URL, default to first visible tab
    const urlTab = searchParams.get('tab');
    const activeTab = (urlTab && visibleTabs.some(t => t.id === urlTab)) ? urlTab : (visibleTabs[0]?.id || 'physical');
    
    // Handler to change tab and update URL
    const setActiveTab = useCallback((tab) => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'physical':
                return <PhysicalPropertiesTab />;
            case 'microstructure':
                return <MicrostructureTab />;
            case 'sand':
                return <SandPropertiesTab />;
            case 'chemistry':
                return <ChemistryTab />;
            case 'mould':
                return <MouldHardnessTab />;
            case 'reports':
                return <ReportsTab />;
            default:
                return null;
        }
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Quality & Lab</h2>

            {/* Tab Navigation */}
            <AnimatedTabs
                tabs={visibleTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {renderTabContent()}
        </div>
    );
};

export default QualityLab;
