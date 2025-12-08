import React, { useState, useEffect } from 'react';

const DatabaseSelector = () => {
    const [selectedDb, setSelectedDb] = useState('IcSoftVer3');

    const databases = [
        { id: 'IcSoftVer3', name: 'IcSoft Ver3' },
        { id: 'IcSoftReportVer3', name: 'IcSoft Report Ver3' },
        { id: 'IcSoftLedgerVer3', name: 'IcSoft Ledger Ver3' },
        { id: 'BizSpot', name: 'BizSpot' }
    ];

    useEffect(() => {
        const savedDb = localStorage.getItem('selectedDatabase');
        if (savedDb) {
            setSelectedDb(savedDb);
        } else {
            // Set default if not set
            localStorage.setItem('selectedDatabase', 'IcSoftVer3');
        }
    }, []);

    const handleChange = (e) => {
        const newDb = e.target.value;
        setSelectedDb(newDb);
        localStorage.setItem('selectedDatabase', newDb);
        window.location.reload(); // Reload to refresh data from new DB
    };

    return (
        <div style={{ marginRight: '1rem' }}>
            <select
                value={selectedDb}
                onChange={handleChange}
                style={{
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #E5E7EB',
                    backgroundColor: '#F9FAFB',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    fontWeight: '500'
                }}
            >
                {databases.map(db => (
                    <option key={db.id} value={db.id}>
                        {db.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default DatabaseSelector;
