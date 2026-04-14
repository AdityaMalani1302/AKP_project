import React from 'react';
import useBreadcrumbs from 'use-react-router-breadcrumbs';
import { Link } from 'react-router-dom';

const routes = [
    { path: '/', breadcrumb: 'Home' },
    { path: '/sales-dashboard', breadcrumb: 'Sales Dashboard' },
    { path: '/finance-dashboard', breadcrumb: 'Finance Dashboard' },
    { path: '/pattern-master', breadcrumb: 'Pattern Master' },
    { path: '/planning-master', breadcrumb: 'Planning' },
    { path: '/lab-master', breadcrumb: 'Lab Master' },
    { path: '/melting', breadcrumb: 'Melting' },
    { path: '/quality-lab', breadcrumb: 'Quality & Lab' },
    { path: '/it-management', breadcrumb: 'IT Management' },
    { path: '/database-explorer', breadcrumb: 'Database Explorer' },
    { path: '/admin', breadcrumb: 'User Management' },
    { path: '/report-builder', breadcrumb: 'Report Builder' },
    { path: '/report-scheduler', breadcrumb: 'Report Scheduler' },
    { path: '/daily-dashboard', breadcrumb: 'Day-wise Dashboard' },
];

const Breadcrumbs = () => {
    const breadcrumbs = useBreadcrumbs(routes);

    if (breadcrumbs.length <= 1) return null; // Don't show if just Home

    return (
        <nav aria-label="breadcrumb" style={{ marginBottom: '1.5rem' }}>
            <ol style={{
                display: 'flex',
                flexWrap: 'wrap',
                listStyle: 'none',
                padding: 0,
                margin: 0,
                fontSize: '0.875rem',
                color: '#6B7280'
            }}>
                {breadcrumbs.map(({ match, breadcrumb }, index) => (
                    <li key={match.pathname} style={{ display: 'flex', alignItems: 'center' }}>
                        {index > 0 && (
                            <span style={{ margin: '0 0.5rem', color: '#9CA3AF' }}>/</span>
                        )}
                        {index === breadcrumbs.length - 1 ? (
                            <span style={{ color: '#111827', fontWeight: '500' }}>
                                {breadcrumb}
                            </span>
                        ) : (
                            <Link to={match.pathname} style={{
                                color: '#6B7280',
                                textDecoration: 'none',
                                transition: 'color 0.2s'
                            }}
                                onMouseEnter={(e) => e.target.style.color = '#3B82F6'}
                                onMouseLeave={(e) => e.target.style.color = '#6B7280'}
                            >
                                {breadcrumb}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default Breadcrumbs;
