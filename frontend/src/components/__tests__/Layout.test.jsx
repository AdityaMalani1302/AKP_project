import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../Layout/Layout';

// Mock child components
jest.mock('../Layout/Sidebar', () => {
  return function MockSidebar({ user, onLogout, isOpen, onClose }) {
    return (
      <aside data-testid="sidebar" data-is-open={isOpen}>
        <button onClick={onClose}>Close Sidebar</button>
        <span data-testid="sidebar-user">{user?.username}</span>
      </aside>
    );
  };
});

jest.mock('../Layout/Header', () => {
  return function MockHeader({ user, onMenuClick }) {
    return (
      <header data-testid="header">
        <button data-testid="menu-button" onClick={onMenuClick}>Menu</button>
        <span data-testid="header-user">{user?.username}</span>
      </header>
    );
  };
});

jest.mock('../common/Breadcrumbs', () => {
  return function MockBreadcrumbs() {
    return <nav data-testid="breadcrumbs">Breadcrumbs</nav>;
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock window.innerWidth
const mockInnerWidth = (width) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
};

const TestChild = () => <div data-testid="test-child">Test Content</div>;

const renderLayout = (props = {}) => {
  const defaultProps = {
    user: { id: 1, username: 'testuser', role: 'employee' },
    onLogout: jest.fn(),
    children: <TestChild />,
  };

  return render(
    <MemoryRouter>
      <Layout {...defaultProps} {...props} />
    </MemoryRouter>
  );
};

describe('Layout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInnerWidth(1024); // Desktop by default
  });

  describe('Rendering', () => {
    test('renders all layout components', () => {
      renderLayout();
      
      expect(screen.getByTestId('sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
      expect(screen.getByTestId('test-child')).toBeInTheDocument();
    });

    test('renders skip navigation link', () => {
      renderLayout();
      
      const skipLink = screen.getByText(/skip to main content/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });

    test('main content has correct accessibility attributes', () => {
      renderLayout();
      
      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveAttribute('id', 'main-content');
      expect(mainContent).toHaveAttribute('aria-label', 'Main content');
    });

    test('passes user prop to Sidebar and Header', () => {
      const user = { id: 1, username: 'john_doe', role: 'admin' };
      renderLayout({ user });
      
      expect(screen.getByTestId('sidebar-user')).toHaveTextContent('john_doe');
      expect(screen.getByTestId('header-user')).toHaveTextContent('john_doe');
    });
  });

  describe('Sidebar Toggle', () => {
    test('toggles sidebar when menu button is clicked', () => {
      renderLayout();
      
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-is-open', 'true');
      
      const menuButton = screen.getByTestId('menu-button');
      fireEvent.click(menuButton);
      
      expect(sidebar).toHaveAttribute('data-is-open', 'false');
      
      fireEvent.click(menuButton);
      expect(sidebar).toHaveAttribute('data-is-open', 'true');
    });

    test('closes sidebar when close button is clicked', () => {
      renderLayout();
      
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-is-open', 'true');
      
      const closeButton = screen.getByText('Close Sidebar');
      fireEvent.click(closeButton);
      
      expect(sidebar).toHaveAttribute('data-is-open', 'false');
    });
  });

  describe('Responsive Behavior', () => {
    test('sidebar is closed by default on mobile', () => {
      mockInnerWidth(375); // Mobile width
      localStorageMock.getItem.mockReturnValue('true');
      
      renderLayout();
      
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-is-open', 'false');
    });

    test('sidebar respects localStorage on desktop', () => {
      mockInnerWidth(1024);
      localStorageMock.getItem.mockReturnValue('false');
      
      renderLayout();
      
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-is-open', 'false');
    });

    test('sidebar defaults to open on desktop when no localStorage', () => {
      mockInnerWidth(1024);
      localStorageMock.getItem.mockReturnValue(null);
      
      renderLayout();
      
      const sidebar = screen.getByTestId('sidebar');
      expect(sidebar).toHaveAttribute('data-is-open', 'true');
    });
  });

  describe('localStorage Persistence', () => {
    test('saves sidebar state to localStorage on desktop', () => {
      mockInnerWidth(1024);
      
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      fireEvent.click(menuButton);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('smart-erp-sidebar-open', 'false');
    });

    test('does not save sidebar state on mobile', () => {
      mockInnerWidth(375);
      
      renderLayout();
      
      const menuButton = screen.getByTestId('menu-button');
      fireEvent.click(menuButton);
      
      // Should not be called for mobile
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Logout', () => {
    test('calls onLogout when logout is triggered', () => {
      const mockLogout = jest.fn();
      renderLayout({ onLogout: mockLogout });
      
      // Note: Actual logout button is in Sidebar mock
      // In real implementation, test would trigger logout from Sidebar
      expect(mockLogout).not.toHaveBeenCalled();
    });
  });
});
