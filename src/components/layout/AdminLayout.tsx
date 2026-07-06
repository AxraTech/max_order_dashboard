import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, Tag } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  ContainerOutlined,
  RollbackOutlined,
  InboxOutlined,
  SwapOutlined,
  FileTextOutlined,
  IdcardOutlined,
  CreditCardOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  SettingOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShopOutlined,
  EnvironmentOutlined,
  CarOutlined,
  AuditOutlined,
  ContactsOutlined,
  ShoppingOutlined,
  GiftOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../store/auth.store';
import { useAdminBranchStore } from '../../store/branch.store';
import { api } from '../../services/api';
import { NotificationBell } from './NotificationBell';
import { useNotificationStore } from '../../store/notification.store';

const { Header, Sider, Content } = Layout;

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { branchCount, setBranchCount } = useAdminBranchStore();
  const { user, logout } = useAuthStore();
  const { initSocket, disconnectSocket, fetchNotifications } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Setup sockets and fetch notifications on mount
  useEffect(() => {
    if (user?.id) {
      initSocket(user.id);
      fetchNotifications();
    }
    return () => {
      disconnectSocket();
    };
  }, [user?.id, initSocket, disconnectSocket, fetchNotifications]);

  useEffect(() => {
    api.get('/branches')
      .then(res => {
        if (res.data.success) {
          setBranchCount(res.data.data.length);
        }
      })
      .catch(() => {});
  }, [setBranchCount]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'My Profile',
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Settings',
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/orders', icon: <ContainerOutlined />, label: 'Orders' },
    { key: '/sales-returns', icon: <RollbackOutlined />, label: 'Sales Returns' },
    { key: '/inventory', icon: <InboxOutlined />, label: 'Inventory' },
    { key: '/inventory/transfers', icon: <SwapOutlined />, label: 'Stock Transfers' },
    { key: '/purchase-orders', icon: <ShoppingOutlined />, label: 'Purchase Orders' },
    { key: '/delivery', icon: <CarOutlined />, label: 'Delivery' },
    { key: '/products', icon: <ShopOutlined />, label: 'Products' },
    { key: '/promotions', icon: <GiftOutlined />, label: 'Promotions' },
    {
      key: '/branches',
      icon: <EnvironmentOutlined />,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Branches</span>
          {branchCount !== null && !collapsed && (
            <Tag
              color="purple"
              style={{
                marginLeft: 8,
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 700,
                padding: '0 6px',
                lineHeight: '18px',
                height: '18px',
                border: 'none',
              }}
            >
              {branchCount}
            </Tag>
          )}
        </span>
      ),
    },
    { key: '/invoices', icon: <FileTextOutlined />, label: 'Invoicing' },
    { key: '/customers', icon: <TeamOutlined />, label: 'Customers' },
    { key: '/suppliers', icon: <ContactsOutlined />, label: 'Suppliers' },
    { key: '/dealers', icon: <AuditOutlined />, label: 'Dealers' },
    { key: '/sales-reps', icon: <IdcardOutlined />, label: 'Sales Representatives' },
    { key: '/sales-teams', icon: <TeamOutlined />, label: 'Sales Teams' },
    { key: '/credit', icon: <CreditCardOutlined />, label: 'Credit Management' },
    { key: '/reports', icon: <BarChartOutlined />, label: 'Reports & Analytics' },
    { key: '/masters', icon: <DatabaseOutlined />, label: 'Masters' },
    { key: '/administration', icon: <SettingOutlined />, label: 'Administration' },
    { key: '/audit-logs', icon: <FileSearchOutlined />, label: 'Audit Logs' },
    { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
  ];

  // Filter sidebar tabs dynamically based on user role permissions
  const filteredMenuItems = menuItems.filter(item => {
    if (!user) return false;
    const role = user.role.name;
    
    // Super Admin and HQ Manager have full visibility
    if (['SUPER_ADMIN', 'HQ_MANAGER'].includes(role)) return true;
    
    switch (item.key) {
      case '/dashboard':
        return true;
      case '/orders':
      case '/sales-returns':
        return ['BRANCH_MANAGER', 'FINANCE_OFFICER', 'VIEWER_AUDITOR'].includes(role);
      case '/inventory':
      case '/inventory/transfers':
        return ['BRANCH_MANAGER', 'INVENTORY_OFFICER', 'VIEWER_AUDITOR'].includes(role);
      case '/purchase-orders':
      case '/delivery':
        return ['BRANCH_MANAGER', 'INVENTORY_OFFICER'].includes(role);
      case '/products':
      case '/promotions':
        return ['BRANCH_MANAGER', 'INVENTORY_OFFICER', 'FINANCE_OFFICER', 'VIEWER_AUDITOR'].includes(role);
      case '/branches':
        return ['BRANCH_MANAGER', 'INVENTORY_OFFICER'].includes(role);
      case '/invoices':
      case '/customers':
      case '/suppliers':
      case '/dealers':
        return ['BRANCH_MANAGER', 'FINANCE_OFFICER', 'VIEWER_AUDITOR'].includes(role);
      case '/sales-reps':
      case '/sales-teams':
        return ['BRANCH_MANAGER', 'FINANCE_OFFICER'].includes(role);
      case '/credit':
      case '/reports':
        return ['BRANCH_MANAGER', 'FINANCE_OFFICER', 'VIEWER_AUDITOR'].includes(role);
      case '/masters':
        return ['BRANCH_MANAGER', 'INVENTORY_OFFICER'].includes(role);
      case '/administration':
      case '/audit-logs':
        return false; // Only Admin/HQ can access
      case '/settings':
        return role === 'SUPER_ADMIN'; // Super Admin only
      default:
        return true;
    }
  });

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', background: 'transparent' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={260}
        className="glass-panel"
        style={{ 
          margin: '16px', 
          borderRadius: 'var(--radius-lg)', 
          overflow: 'hidden',
          border: '1px solid var(--glass-border)',
          height: 'calc(100vh - 32px)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ 
            height: 64, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? 0 : '0 20px',
            color: 'var(--primary-color)',
            fontWeight: 700,
            fontSize: collapsed ? '24px' : '18px',
            letterSpacing: '-0.5px',
            borderBottom: '1px solid var(--border-color)'
          }}>
            {collapsed ? 'M' : (
              <>
                <span>MaxOrder</span>
                <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: '10px' }}>HQ ADMIN</Tag>
              </>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Menu
              theme="light"
              mode="inline"
              selectedKeys={[location.pathname]}
              defaultOpenKeys={['master-data', 'system']}
              items={filteredMenuItems}
              onClick={({ key }) => navigate(key)}
              style={{ border: 'none', background: 'transparent', padding: '8px' }}
            />
          </div>
        </div>
      </Sider>
      
      <Layout style={{ background: 'transparent', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Header 
          className="glass-panel"
          style={{ 
            margin: '16px 16px 16px 0', 
            padding: '0 24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderRadius: 'var(--radius-lg)',
            flexShrink: 0
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 40, height: 40 }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationBell />
            <div style={{ 
              display: collapsed ? 'none' : 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end', 
              justifyContent: 'center',
              lineHeight: 1.2
            }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827', lineHeight: 1.2 }}>
                {user?.firstName && user?.lastName && user.firstName.trim().toLowerCase() === user.lastName.trim().toLowerCase()
                  ? user.firstName
                  : `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
              </div>
              {(() => {
                const displayName = user?.firstName && user?.lastName && user.firstName.trim().toLowerCase() === user.lastName.trim().toLowerCase()
                  ? user.firstName
                  : `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
                return displayName !== user?.role?.displayName && user?.role?.displayName ? (
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px', lineHeight: 1.2 }}>
                    {user.role.displayName}
                  </div>
                ) : null;
              })()}
            </div>
            <Dropdown menu={userMenu} placement="bottomRight" arrow>
              <Avatar style={{ backgroundColor: 'var(--primary-color)', cursor: 'pointer' }}>
                {(() => {
                  const first = user?.firstName?.trim() || '';
                  const last = user?.lastName?.trim() || '';
                  if (!first && !last) return '?';
                  if (first.toLowerCase() === last.toLowerCase()) {
                    const parts = first.split(/\s+/).filter(Boolean);
                    if (parts.length >= 2) {
                      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
                    }
                    return first[0]?.toUpperCase() || '';
                  }
                  return `${first[0] || ''}${last[0] || ''}`.toUpperCase();
                })()}
              </Avatar>
            </Dropdown>
          </div>
        </Header>
        
        <Content style={{ margin: '0 16px 16px 0', overflowY: 'auto', flex: 1 }}>
          <div className="animate-fade-in" style={{ minHeight: '100%' }}>
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
