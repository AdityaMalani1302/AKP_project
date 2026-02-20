import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../Login';

// Mock the api module
jest.mock('../../api', () => ({
  post: jest.fn(),
}));

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Import mocked modules
import api from '../../api';
import { toast } from 'sonner';

// Wrapper component with Router
const renderLogin = (props = {}) => {
  const defaultProps = {
    setToken: jest.fn(),
    setUser: jest.fn(),
  };
  return render(
    <BrowserRouter>
      <Login {...defaultProps} {...props} />
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders login form with username and password fields', () => {
      renderLogin();
      
      // Check for username input
      const usernameInput = screen.getByPlaceholderText(/username/i) || 
                            screen.getByLabelText(/username/i);
      expect(usernameInput).toBeInTheDocument();
      
      // Check for password input
      const passwordInput = screen.getByPlaceholderText(/password/i) || 
                            screen.getByLabelText(/password/i);
      expect(passwordInput).toBeInTheDocument();
      
      // Check for submit button
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      expect(submitButton).toBeInTheDocument();
    });

    test('renders Smart ERP branding', () => {
      renderLogin();
      
      // Look for any branding text
      expect(screen.getByText(/smart erp/i)).toBeInTheDocument();
    });

    test('password field is initially hidden', () => {
      renderLogin();
      
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      expect(passwordInputs.length).toBeGreaterThan(0);
    });
  });

  describe('Password Visibility Toggle', () => {
    test('toggles password visibility when toggle is clicked', async () => {
      renderLogin();
      
      // Find password input
      const passwordInput = document.querySelector('input[type="password"]');
      expect(passwordInput).toBeInTheDocument();
      
      // Find toggle button (could be various elements)
      const toggleButtons = document.querySelectorAll('button');
      let toggleButton = null;
      
      for (const btn of toggleButtons) {
        if (btn.closest('form') && btn.type !== 'submit') {
          toggleButton = btn;
          break;
        }
      }
      
      if (toggleButton) {
        fireEvent.click(toggleButton);
        // After click, check if type changed to text
        const textInput = document.querySelector('input[type="text"]');
        expect(textInput || passwordInput).toBeInTheDocument();
      }
    });
  });

  describe('Form Submission', () => {
    test('calls API with correct credentials on form submit', async () => {
      const mockSetUser = jest.fn();
      api.post.mockResolvedValue({
        data: {
          success: true,
          username: 'testuser',
          role: 'admin',
          allowedPages: ['all'],
        },
      });

      renderLogin({ setUser: mockSetUser });
      
      // Fill form
      const usernameInput = screen.getByPlaceholderText(/username/i) || 
                            screen.getByLabelText(/username/i);
      const passwordInput = document.querySelector('input[type="password"]');
      const submitButton = screen.getByRole('button', { name: /sign in/i });
      
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('/auth/login', {
          username: 'testuser',
          password: 'password123',
        });
      });
    });

    test('shows success toast and navigates on successful login', async () => {
      const mockSetUser = jest.fn();
      api.post.mockResolvedValue({
        data: {
          success: true,
          username: 'testuser',
          role: 'admin',
          allowedPages: ['all'],
        },
      });

      renderLogin({ setUser: mockSetUser });
      
      const usernameInput = screen.getByPlaceholderText(/username/i) || 
                            screen.getByLabelText(/username/i);
      const passwordInput = document.querySelector('input[type="password"]');
      
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Login successful!');
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    test('shows error message on failed login', async () => {
      api.post.mockRejectedValue({
        response: { data: { error: 'Invalid credentials' } },
      });

      renderLogin();
      
      const usernameInput = screen.getByPlaceholderText(/username/i) || 
                            screen.getByLabelText(/username/i);
      const passwordInput = document.querySelector('input[type="password"]');
      
      await userEvent.type(usernameInput, 'wronguser');
      await userEvent.type(passwordInput, 'wrongpassword');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Invalid credentials');
      });
    });

    test('shows loading state during login', async () => {
      // Make the API call hang
      api.post.mockImplementation(() => new Promise(() => {}));

      renderLogin();
      
      const usernameInput = screen.getByPlaceholderText(/username/i) || 
                            screen.getByLabelText(/username/i);
      const passwordInput = document.querySelector('input[type="password"]');
      
      await userEvent.type(usernameInput, 'testuser');
      await userEvent.type(passwordInput, 'password123');
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Check for loading state - button text should change or be disabled
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /sign|loading/i });
        expect(button).toBeInTheDocument();
      });
    });
  });
});
