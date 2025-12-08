import React, { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import api from './api';
import Login from './components/Login';

import DatabaseExplorer from './components/DatabaseExplorer';
import PrivateRoute from './components/PrivateRoute';
import AdminDashboard from './components/AdminDashboard';
import PatternMaster from './components/PatternMaster';
import PlanningMaster from './components/PlanningMaster';
import LabMaster from './components/LabMaster';
import Melting from './components/Melting';
import Layout from './components/Layout/Layout';
import './App.css';

import GlobalErrorBoundary from './components/common/GlobalErrorBoundary';

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
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
      <Toaster position="top-right" richColors />
      <GlobalErrorBoundary>
        <Routes>
          <Route path="/login" element={
            user ? <Navigate to="/" /> : <Login setUser={setUser} />
          } />

          {/* Protected Routes Wrapped in Layout */}
          <Route path="/" element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <div className="card">
                  <h1>Welcome, {user?.username}!</h1>
                  <p>Select an option from the sidebar to get started.</p>
                </div>
              </Layout>
            </PrivateRoute>
          } />

          <Route path="/pattern-master" element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <PatternMaster />
              </Layout>
            </PrivateRoute>
          } />

          <Route path="/planning-master" element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <PlanningMaster />
              </Layout>
            </PrivateRoute>
          } />

          <Route path="/lab-master" element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <LabMaster />
              </Layout>
            </PrivateRoute>
          } />

          <Route path="/melting" element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <Melting />
              </Layout>
            </PrivateRoute>
          } />

          <Route path="/database-explorer" element={
            <PrivateRoute user={user}>
              <Layout user={user} onLogout={handleLogout}>
                <DatabaseExplorer />
              </Layout>
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <PrivateRoute user={user} requiredRole="admin">
              <Layout user={user} onLogout={handleLogout}>
                <AdminDashboard />
              </Layout>
            </PrivateRoute>
          } />
        </Routes>
      </GlobalErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;
