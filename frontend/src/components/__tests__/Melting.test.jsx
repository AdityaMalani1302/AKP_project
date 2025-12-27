import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Melting from '../Melting';

// Mock the api module
jest.mock('../../api', () => ({
  get: jest.fn(),
}));

// Mock the Combobox component
jest.mock('../common/Combobox', () => {
  return function MockCombobox({ value, onChange, options = [], placeholder }) {
    return (
      <select
        data-testid="combobox"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{placeholder || 'Select...'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  };
});

// Mock TableSkeleton component
jest.mock('../common/TableSkeleton', () => {
  return function MockTableSkeleton() {
    return <div data-testid="table-skeleton">Loading...</div>;
  };
});

import api from '../../api';

// Create a query client for tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

// Wrapper with React Query provider
const renderWithQueryClient = (ui) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

// Sample test data
const mockRecords = [
  {
    LabMasterId: 1,
    Customer: 'Customer A',
    DrgNo: 'DRG-001',
    BaseChe_C: '3.4',
    BaseChe_Si: '2.0',
  },
  {
    LabMasterId: 2,
    Customer: 'Customer B',
    DrgNo: 'DRG-001',
    BaseChe_C: '3.5',
    BaseChe_Si: '2.1',
  },
  {
    LabMasterId: 3,
    Customer: 'Customer C',
    DrgNo: 'DRG-002',
    BaseChe_C: '3.3',
    BaseChe_Si: '1.9',
  },
];

describe('Melting Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockResolvedValue({ data: mockRecords });
  });

  describe('Rendering', () => {
    test('renders page title', async () => {
      renderWithQueryClient(<Melting />);
      
      // Check for any heading related to melting
      const heading = screen.getByRole('heading') || screen.getByText(/melting/i);
      expect(heading).toBeInTheDocument();
    });

    test('renders combobox for DrgNo selection', async () => {
      renderWithQueryClient(<Melting />);

      expect(screen.getByTestId('combobox')).toBeInTheDocument();
    });
  });

  describe('Data Fetching', () => {
    test('calls API to fetch records on mount', async () => {
      renderWithQueryClient(<Melting />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/lab-master');
      });
    });

    test('populates DrgNo dropdown with options', async () => {
      renderWithQueryClient(<Melting />);

      await waitFor(() => {
        const options = screen.getAllByRole('option');
        expect(options.length).toBeGreaterThan(1);
      });
    });
  });

  describe('Filtering', () => {
    test('shows filtered records when DrgNo is selected', async () => {
      renderWithQueryClient(<Melting />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });

      // Use fireEvent for more reliable select handling
      const combobox = screen.getByTestId('combobox');
      fireEvent.change(combobox, { target: { value: 'DRG-001' } });

      await waitFor(() => {
        // After selection, records should display
        expect(screen.getByText('Customer A')).toBeInTheDocument();
      });
    });
  });

  describe('Record Display', () => {
    test('displays customer names after selection', async () => {
      renderWithQueryClient(<Melting />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalled();
      });

      const combobox = screen.getByTestId('combobox');
      fireEvent.change(combobox, { target: { value: 'DRG-001' } });

      await waitFor(() => {
        expect(screen.getByText('Customer A')).toBeInTheDocument();
        expect(screen.getByText('Customer B')).toBeInTheDocument();
      });
    });
  });
});
