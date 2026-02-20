import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../PrivateRoute';

// Test component to render inside PrivateRoute
const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

// Helper to render PrivateRoute with router context
const renderPrivateRoute = (props = {}, initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
        <Route 
          path="/" 
          element={
            <PrivateRoute {...props}>
              <TestComponent />
            </PrivateRoute>
          } 
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('PrivateRoute Component', () => {
  describe('Authentication', () => {
    test('redirects to login when user is not authenticated', () => {
      renderPrivateRoute({ user: null });
      
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('renders protected content when user is authenticated', () => {
      const user = { id: 1, username: 'testuser', role: 'employee' };
      renderPrivateRoute({ user });
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
  });

  describe('Role-based Access Control', () => {
    test('allows access for admin users to admin-only pages', () => {
      const user = { id: 1, username: 'admin', role: 'admin' };
      renderPrivateRoute({ user, requiredRole: 'admin' });
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('denies access for non-admin users to admin-only pages', () => {
      const user = { id: 1, username: 'employee', role: 'employee' };
      renderPrivateRoute({ user, requiredRole: 'admin' });
      
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    test('denies access when user role does not match required role', () => {
      const user = { id: 1, username: 'user', role: 'user' };
      renderPrivateRoute({ user, requiredRole: 'admin' });
      
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });
  });

  describe('Page-based Access Control', () => {
    test('allows access when user has specific page permission', () => {
      const user = { 
        id: 1, 
        username: 'employee', 
        role: 'employee',
        allowedPages: ['pattern-master', 'lab-master']
      };
      renderPrivateRoute({ user, requiredPage: 'pattern-master' });
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('allows access when user has "all" permission', () => {
      const user = { 
        id: 1, 
        username: 'employee', 
        role: 'employee',
        allowedPages: ['all']
      };
      renderPrivateRoute({ user, requiredPage: 'pattern-master' });
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    test('denies access when user does not have page permission', () => {
      const user = { 
        id: 1, 
        username: 'employee', 
        role: 'employee',
        allowedPages: ['lab-master']
      };
      renderPrivateRoute({ user, requiredPage: 'pattern-master' });
      
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.getByText(/🔒/)).toBeInTheDocument();
    });

    test('denies access when user has empty allowedPages', () => {
      const user = { 
        id: 1, 
        username: 'employee', 
        role: 'employee',
        allowedPages: []
      };
      renderPrivateRoute({ user, requiredPage: 'pattern-master' });
      
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    test('allows admin users to access any page regardless of allowedPages', () => {
      const user = { 
        id: 1, 
        username: 'admin', 
        role: 'admin',
        allowedPages: []
      };
      renderPrivateRoute({ user, requiredPage: 'pattern-master' });
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Combined Role and Page Access', () => {
    test('requires both role and page permissions when both are specified', () => {
      const user = { 
        id: 1, 
        username: 'employee', 
        role: 'employee',
        allowedPages: ['pattern-master']
      };
      // User has page access but not admin role
      renderPrivateRoute({ user, requiredRole: 'admin', requiredPage: 'pattern-master' });
      
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    test('allows access when both role and page requirements are met', () => {
      const user = { 
        id: 1, 
        username: 'admin', 
        role: 'admin',
        allowedPages: ['all']
      };
      renderPrivateRoute({ user, requiredRole: 'admin', requiredPage: 'pattern-master' });
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    test('handles undefined allowedPages gracefully', () => {
      const user = { 
        id: 1, 
        username: 'employee', 
        role: 'employee'
        // allowedPages is undefined
      };
      renderPrivateRoute({ user, requiredPage: 'pattern-master' });
      
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    test('renders Outlet when no children provided', () => {
      const user = { id: 1, username: 'testuser', role: 'employee' };
      
      render(
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
            <Route element={<PrivateRoute user={user} />}>
              <Route path="/" element={<TestComponent />} />
            </Route>
          </Routes>
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});
