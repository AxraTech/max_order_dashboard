import { api } from './api';

export interface SummaryStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  totalRevenue: number;
}

export interface DashboardFilters {
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TrendData {
  date: string;
  revenue: number;
}

export interface StatusData {
  name: string;
  value: number;
  color: string;
}

export interface RecentOrder {
  key: string;
  orderNo: string;
  sr: string;
  customer: string;
  branch: string;
  status: string;
  amount: number;
  date: string;
}

const filterParams = (filters?: DashboardFilters) => ({
  branchId: filters?.branchId,
  dateFrom: filters?.dateFrom,
  dateTo: filters?.dateTo,
});

export const getDashboardSummary = async (filters?: DashboardFilters): Promise<SummaryStats> => {
  const response = await api.get('/dashboard/summary', { params: filterParams(filters) });
  return response.data.data;
};

export const getDashboardTrends = async (filters?: DashboardFilters): Promise<TrendData[]> => {
  const response = await api.get('/dashboard/trends', { params: filterParams(filters) });
  return response.data.data;
};

export const getDashboardStatus = async (filters?: DashboardFilters): Promise<StatusData[]> => {
  const response = await api.get('/dashboard/status', { params: filterParams(filters) });
  return response.data.data;
};

export const getRecentOrders = async (filters?: DashboardFilters): Promise<RecentOrder[]> => {
  const response = await api.get('/dashboard/recent', { params: filterParams(filters) });
  return response.data.data;
};

export interface ExpiryAlertItem {
  id: string;
  code: string;
  name: string;
  sku: string;
  expiryDate: string;
  category: {
    id: string;
    name: string;
  };
}

export interface ExpiryAlertData {
  expired: ExpiryAlertItem[];
  expiringSoon: ExpiryAlertItem[];
}

export const getExpiryAlerts = async (): Promise<ExpiryAlertData> => {
  const response = await api.get('/dashboard/expiry-alerts');
  return response.data.data;
};

export interface DashboardOperations {
  invoices: {
    totalInvoices: number;
    pendingInvoices: number;
  };
  credit: {
    totalCreditLimit: number;
    totalOutstanding: number;
    overdueAmount: number;
    customersOverLimit: number;
  };
  lowStock: Array<{ key: string; product: string; sku: string; branch: string; onHand: number; reorder: number }>;
  pendingOrders: Array<{ key: string; orderNo: string; customer: string; reason: string; days: number }>;
  branchSales: Array<{ name: string; sales: number; fill: string }>;
  shortcuts: {
    approveOrders: number;
    pendingInvoices: number;
    stockAlerts: number;
    customersOverLimit: number;
  };
}

export const getDashboardOperations = async (filters?: DashboardFilters): Promise<DashboardOperations> => {
  const response = await api.get('/dashboard/operations', { params: filterParams(filters) });
  return response.data.data;
};
