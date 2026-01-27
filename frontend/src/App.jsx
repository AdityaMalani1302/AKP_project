import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from './api';
import Login from './components/Login';

// Lazy load heavy components for better initial load time
const DatabaseExplorer = lazy(() => import('./components/DatabaseExplorer'));
const PatternMaster = lazy(() => import('./components/PatternMaster'));
const PlanningMaster = lazy(() => import('./components/PlanningMaster'));
const LabMaster = lazy(() => import('./components/LabMaster'));
const Melting = lazy(() => import('./components/Melting'));
const QualityLab = lazy(() => import('./components/QualityLab'));
const ITManagement = lazy(() => import('./components/ITManagement'));
const ReportBuilder = lazy(() => import('./components/ReportBuilder'));
const ReportScheduler = lazy(() => import('./components/ReportScheduler'));
const UserManagement = lazy(() => import('./components/UserManagement'));
const SalesDashboard = lazy(() => import('./components/SalesDashboard'));
const FinanceDashboard = lazy(() => import('./components/FinanceDashboard'));
const ARAPDashboard = lazy(() => import('./components/ARAPDashboard'));
const ProductionDashboard = lazy(() => import('./components/ProductionDashboard'));
const HomePage = lazy(() => import('./components/HomePage'));
const Marketing = lazy(() => import('./components/Marketing'));

import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout/Layout';
import './App.css';

import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';
import { NotificationProvider } from './contexts/NotificationContext';

// Loading component for Suspense - Animated spinner with branding
const PageLoader = () => (
  <div style={{ 
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '50vh',
    gap: '1rem'
  }}>
    {/* Animated Spinner */}
    <div style={{
      width: '48px',
      height: '48px',
      border: '4px solid #E5E7EB',
      borderTop: '4px solid #8B5CF6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <span style={{ 
      fontSize: '0.875rem', 
      color: '#6B7280',
      fontWeight: '500'
    }}>
      Loading...
    </span>
    {/* Inline keyframes for spinner animation */}
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

// Configure React Query with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Prefetch commonly used data to reduce perceived latency
// Called after successful authentication
const prefetchCriticalData = async () => {
  // Prefetch customers and products data used across multiple components
  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ['customers'],
      queryFn: async () => {
        const res = await api.get('/customers?search=');
        return res.data;
      },
      staleTime: 10 * 60 * 1000, // Cache for 10 mins
    }),
    queryClient.prefetchQuery({
      queryKey: ['products'],
      queryFn: async () => {
        const res = await api.get('/products?search=');
        return res.data;
      },
      staleTime: 10 * 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['dbTables', 'IcSoftVer3'],
      queryFn: async () => {
        const res = await api.get('/tables?database=IcSoftVer3');
        return res.data.sort((a, b) => a.localeCompare(b));
      },
      staleTime: 10 * 60 * 1000,
    }),
  ]);
};

// Reusable ProtectedRoute component - encapsulates Layout + Suspense + PrivateRoute
const ProtectedRoute = ({ user, onLogout, requiredPage, requiredRole, children }) => (
  <PrivateRoute user={user} requiredPage={requiredPage} requiredRole={requiredRole}>
    <Layout user={user} onLogout={onLogout}>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </Layout>
  </PrivateRoute>
);

// Route configuration array - defines all protected routes
const routeConfig = [
  { path: '/', component: HomePage, requiredPage: 'homepage', passUser: true },
  { path: '/sales-dashboard', component: SalesDashboard, requiredPage: 'sales-dashboard' },
  { path: '/finance-dashboard', component: FinanceDashboard, requiredPage: 'finance-dashboard' },
  { path: '/ar-ap-dashboard', component: ARAPDashboard, requiredPage: 'ar-ap-dashboard' },
  { path: '/production-dashboard', component: ProductionDashboard, requiredPage: 'production-dashboard' },
  { path: '/pattern-master', component: PatternMaster, requiredPage: 'pattern-master', passUser: true },
  { path: '/planning-master', component: PlanningMaster, requiredPage: 'planning-master', passUser: true },
  { path: '/lab-master', component: LabMaster, requiredPage: 'lab-master', passUser: true },
  { path: '/melting', component: Melting, requiredPage: 'melting' },
  { path: '/quality-lab', component: QualityLab, requiredPage: 'quality-lab', passUser: true },
  { path: '/it-management', component: ITManagement, requiredPage: 'it-management' },
  { path: '/database-explorer', component: DatabaseExplorer, requiredPage: 'database-explorer' },
  { path: '/admin', component: UserManagement, requiredRole: 'admin' },
  { path: '/report-builder', component: ReportBuilder, requiredRole: 'admin' },
  { path: '/report-scheduler', component: ReportScheduler, requiredRole: 'admin' },
  { path: '/marketing', component: Marketing, requiredPage: 'marketing' },
];

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        
        // Prefetch critical data after successful auth (non-blocking)
        prefetchCriticalData();
      } catch (err) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>
        <Toaster position="top-right" richColors />
        <GlobalErrorBoundary>
          <Routes>
            {/* Login route - not protected */}
            <Route path="/login" element={
              user ? <Navigate to="/" /> : <Login setUser={setUser} />
            } />

            {/* Protected routes - generated from config */}
            {routeConfig.map(({ path, component: Component, requiredPage, requiredRole, passUser }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute
                    user={user}
                    onLogout={handleLogout}
                    requiredPage={requiredPage}
                    requiredRole={requiredRole}
                  >
                    <Component {...(passUser ? { user } : {})} />
                  </ProtectedRoute>
                }
              />
            ))}
          </Routes>
        </GlobalErrorBoundary>
      </NotificationProvider>
    </QueryClientProvider>
  );
};

export default App;
