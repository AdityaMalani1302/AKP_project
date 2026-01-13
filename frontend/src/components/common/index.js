// Common UI Components - Barrel Export
// Use: import { AlertDialog, Badge, Card } from './common';

// Dialog & Overlay Components
export { default as AlertDialog } from './AlertDialog';
// Note: ConfirmDialog removed - use AlertDialog instead (same functionality)
// Note: LoadingOverlay and SpinnerInline removed - not currently used in codebase

// Form & Input Components
// Note: FormField removed - not currently used in codebase
// Note: SearchInput removed - not currently used in codebase
export { default as Combobox } from './Combobox';
export { default as SearchableSelect } from './SearchableSelect';
export { default as DatePicker } from './DatePicker';
export { default as NumberInput } from './NumberInput';
export { default as AutocompleteInput } from './AutocompleteInput';
// Note: FileUpload removed - not currently used in codebase
export { default as AnimatedTabs } from './AnimatedTabs';

// Table & Data Display Components
// Note: SortableTable removed - not currently used in codebase
export { default as TableSkeleton } from './TableSkeleton';
export { default as EmptyState } from './EmptyState';
export { default as ExportButtons } from './ExportButtons';

// Feedback & Typography Components
export { default as Badge } from './Badge';
export { default as TextTooltip } from './TextTooltip';

// Layout & Container Components
export { default as Card, CardHeader, CardBody, CardFooter } from './Card';
export { default as Breadcrumbs } from './Breadcrumbs';

// Notification Components
export { default as NotificationBell } from './NotificationBell';

// Error Handling
export { default as GlobalErrorBoundary } from './GlobalErrorBoundary';

// Skeletons (used by SalesDashboard)
export { DashboardSkeleton, CardSkeleton, ChartSkeleton, FormSkeleton, PageSkeleton } from './Skeletons';
