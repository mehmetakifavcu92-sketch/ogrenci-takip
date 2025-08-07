// Common types used across the application

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface FileUpload {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  url?: string;
  error?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  isVisible: boolean;
}

export interface Breadcrumb {
  label: string;
  path?: string;
  active?: boolean;
}

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ComponentType;
  disabled?: boolean;
  badge?: number | string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType;
  path?: string;
  children?: MenuItem[];
  disabled?: boolean;
  badge?: number | string;
}

export interface FilterOption {
  key: string;
  label: string;
  value: string | number | boolean;
  type: 'text' | 'select' | 'date' | 'boolean';
  options?: SelectOption[];
}

export interface SortOption {
  key: string;
  label: string;
  direction: 'asc' | 'desc';
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: ChartDataPoint[];
  options?: Record<string, unknown>;
}

export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  filename?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
}

export interface ImportOptions {
  format: 'csv' | 'excel';
  requiredFields: string[];
  optionalFields?: string[];
  maxRows?: number;
}

export interface SearchParams {
  query: string;
  filters?: FilterOption[];
  sort?: SortOption;
  pagination?: PaginationParams;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemConfig {
  version: string;
  environment: 'development' | 'staging' | 'production';
  features: Record<string, boolean>;
  limits: Record<string, number>;
  settings: Record<string, unknown>;
}

