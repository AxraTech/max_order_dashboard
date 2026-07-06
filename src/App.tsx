import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { useAuthStore } from './store/auth.store';

// Layouts
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Pages
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Orders } from './pages/orders/Orders';
import { Invoices } from './pages/invoices/Invoices';
import { Customers } from './pages/customers/Customers';
import { Products } from './pages/products/Products';
import { Branches } from './pages/branches/Branches';
import { Users } from './pages/users/Users';
import { Roles } from './pages/roles/Roles';
import { Inventory } from './pages/inventory/Inventory';
import { Transfers } from './pages/inventory/Transfers';
import { Delivery } from './pages/delivery/Delivery';
import { SalesReps } from './pages/sales-reps/SalesReps';
import { Credit } from './pages/credit/Credit';
import { Reports } from './pages/reports/Reports';
import { SalesReturns } from './pages/sales-returns/SalesReturns';
import { Masters } from './pages/masters/Masters';
import { Administration } from './pages/administration/Administration';
import { AuditLogs } from './pages/audit-logs/AuditLogs';
import { Suppliers } from './pages/suppliers/Suppliers';
import { Dealers } from './pages/dealers/Dealers';
import { PurchaseOrders } from './pages/purchase-orders/PurchaseOrders';
import { SalesTeams } from './pages/sales-teams/SalesTeams';
import { Promotions } from './pages/promotions/Promotions';
import { Settings } from './pages/settings/Settings';

export const App: React.FC = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#4F46E5',
          colorSuccess: '#10B981',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          colorInfo: '#3B82F6',
          fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          borderRadius: 8,
          wireframe: false,
        },
        components: {
          Card: {
            borderRadius: 12,
          },
          Button: {
            borderRadius: 12,
            controlHeight: 42,
          },
          Input: {
            borderRadius: 12,
            controlHeight: 42,
          },
          Select: {
            borderRadius: 12,
            controlHeight: 42,
          },
          DatePicker: {
            borderRadius: 12,
            controlHeight: 42,
          },
          InputNumber: {
            borderRadius: 12,
            controlHeight: 42,
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER', 'INVENTORY_OFFICER', 'FINANCE_OFFICER', 'VIEWER_AUDITOR']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                
                <Route path="/orders" element={<Orders />} />
                <Route path="/sales-returns" element={<SalesReturns />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/products" element={<Products />} />
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/branches" element={<Branches />} />
                <Route path="/users" element={<Users />} />
                <Route path="/roles" element={<Roles />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/inventory/transfers" element={<Transfers />} />
                <Route path="/delivery" element={<Delivery />} />
                
                <Route path="/sales-reps" element={<SalesReps />} />
                <Route path="/sales-teams" element={<SalesTeams />} />
                <Route path="/credit" element={<Credit />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/masters" element={<Masters />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/dealers" element={<Dealers />} />
                <Route path="/purchase-orders" element={<PurchaseOrders />} />
                <Route path="/administration" element={<Administration />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
