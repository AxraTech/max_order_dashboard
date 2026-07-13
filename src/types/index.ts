// MaxOrder Shared Types
// Used across backend and all 3 frontends

// Auth Types
export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface LoginResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  role: RoleSummary;
  branch: BranchSummary | null;
}

// Role & Permission Types
export interface RoleSummary {
  id: string;
  name: string;
  displayName: string;
}

export type RoleName =
  | 'SUPER_ADMIN'
  | 'HQ_MANAGER'
  | 'BRANCH_MANAGER'
  | 'SALES_REP'
  | 'MSR'
  | 'INVENTORY_OFFICER'
  | 'FINANCE_OFFICER'
  | 'VIEWER_AUDITOR';

export type PermissionModule =
  | 'DASHBOARD'
  | 'MASTER_DATA'
  | 'ORDERS'
  | 'INVENTORY'
  | 'CREDIT'
  | 'INVOICING'
  | 'REPORTS'
  | 'ADMIN';

export type PermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'EXPORT';
export type PermissionScope = 'ALL' | 'BRANCH' | 'OWN';

// Master Data Types
export interface BranchSummary {
  id: string;
  code: string;
  name: string;
}

export type CustomerCategory = 'REGULAR' | 'VIP' | 'WHOLESALE' | 'DEALER';
export type SalesRepType = 'SR' | 'MSR';
export type PriceListType = 'BRANCH' | 'DEALER' | 'PROMOTION';

// Order Types
export type OrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'BRANCH_REVIEW'
  | 'PENDING'
  | 'APPROVED'
  | 'READY_FOR_DELIVERY'
  | 'INVOICED'
  | 'COMPLETED'
  | 'CANCELLED';

// Credit Types
export type CreditStatus = 'GOOD_STANDING' | 'OVERDUE' | 'OVER_LIMIT' | 'CREDIT_HOLD';

// Invoice Types
export type InvoiceType = 'TAX_INVOICE' | 'DEBIT_NOTE' | 'CREDIT_NOTE';
export type InvoiceStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'SENT'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

// Delivery Types
export type DeliveryStatus = 'PICKING' | 'PACKING' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Currency
export const CURRENCY = {
  code: 'MMK',
  symbol: 'K',
  name: 'Myanmar Kyat',
  locale: 'my-MM',
};

export const updateCurrencySymbol = (symbol: string) => {
  if (symbol) {
    (CURRENCY as any).symbol = symbol;
  }
};
