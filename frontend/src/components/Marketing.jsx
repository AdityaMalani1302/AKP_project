import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import '../App.css';
import RFQTab from './marketing/RFQTab';
import LaboratoryTab from './marketing/LaboratoryTab';
import PatternshopTab from './marketing/PatternshopTab';
import RFQMasterTab from './marketing/RFQMasterTab';
import AnimatedTabs from './common/AnimatedTabs';

const Marketing = () => {
    // All available tabs
    const allTabs = [
        { id: 'rfq', label: 'RFQ' },
        { id: 'laboratory', label: 'Laboratory' },
        { id: 'patternshop', label: 'Patternshop / Development' },
        { id: 'rfq-master', label: 'RFQ Master' }
    ];

    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read tab from URL, default to first tab
    const urlTab = searchParams.get('tab');
    const activeTab = (urlTab && allTabs.some(t => t.id === urlTab)) ? urlTab : 'rfq';
    
    // Handler to change tab and update URL
    const setActiveTab = useCallback((tab) => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        }, { replace: true });
    }, [setSearchParams]);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'rfq':
                return <RFQTab />;
            case 'laboratory':
                return <LaboratoryTab />;
            case 'patternshop':
                return <PatternshopTab />;
            case 'rfq-master':
                return <RFQMasterTab />;
            default:
                return null;
        }
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Marketing</h2>

            {/* Tab Navigation */}
            <AnimatedTabs
                tabs={allTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
            />

            {/* Tab Content */}
            {renderTabContent()}
        </div>
    );
};

export default Marketing;
