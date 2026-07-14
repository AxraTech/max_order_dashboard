import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Typography, Table, Tag, Badge, Select, DatePicker, Button, Spin, Space } from 'antd';
import { 
  FileTextOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  DollarOutlined,
  PlusOutlined,
  FileDoneOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  BarChartOutlined,
  BankOutlined
} from '@ant-design/icons';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { useAuthStore } from '../../store/auth.store';
import * as dashboardApi from '../../services/dashboard.service';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';

const { Title } = Typography;

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<dashboardApi.SummaryStats | null>(null);
  const [trends, setTrends] = useState<dashboardApi.TrendData[]>([]);
  const [statusData, setStatusData] = useState<dashboardApi.StatusData[]>([]);
  const [recentOrders, setRecentOrders] = useState<dashboardApi.RecentOrder[]>([]);
  const [expiryAlerts, setExpiryAlerts] = useState<dashboardApi.ExpiryAlertData | null>(null);
  const [operations, setOperations] = useState<dashboardApi.DashboardOperations | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await api.get('/branches');
        if (res.data.success) {
          setBranches(res.data.data.filter((b: any) => b.isActive));
        }
      } catch (err) {
        console.error('Failed to load branches for dashboard:', err);
      }
    };
    fetchBranches();
  }, []);

  const dashboardFilters = useMemo(() => ({
    branchId: selectedBranchId === 'all' ? undefined : selectedBranchId,
    dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
    dateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
  }), [selectedBranchId, dateRange]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, trendsRes, statusRes, recentRes, alertsRes, operationsRes] = await Promise.all([
        dashboardApi.getDashboardSummary(dashboardFilters),
        dashboardApi.getDashboardTrends(dashboardFilters),
        dashboardApi.getDashboardStatus(dashboardFilters),
        dashboardApi.getRecentOrders(dashboardFilters),
        dashboardApi.getExpiryAlerts(),
        dashboardApi.getDashboardOperations(dashboardFilters),
      ]);
      setSummary(sumRes);
      setTrends(trendsRes);
      setStatusData(statusRes);
      setRecentOrders(recentRes);
      setExpiryAlerts(alertsRes);
      setOperations(operationsRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [dashboardFilters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('api-update:order', handleUpdate);
    window.addEventListener('api-update:delivery', handleUpdate);
    window.addEventListener('api-update:payment', handleUpdate);
    window.addEventListener('api-update:invoice', handleUpdate);
    return () => {
      window.removeEventListener('api-update:order', handleUpdate);
      window.removeEventListener('api-update:delivery', handleUpdate);
      window.removeEventListener('api-update:payment', handleUpdate);
      window.removeEventListener('api-update:invoice', handleUpdate);
    };
  }, [fetchDashboardData]);

  const getStatusColor = (status: string) => {
    return status === 'APPROVED' ? 'success' : status === 'COMPLETED' ? 'processing' : 'warning';
  };

  const StatCard = ({ title, value, icon, iconBg, iconColor, trendLabel }: any) => (
    <Card className="glass-card" variant="borderless" styles={{ body: { padding: '20px' } }} style={{ width: '100%', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: '#4b5563', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>{title}</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>{value}</div>
        </div>
        <div style={{ fontSize: '28px', color: iconColor, background: iconBg, width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
          {icon}
        </div>
      </div>
      {trendLabel && (
        <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '16px', fontWeight: 500 }}>
          {trendLabel}
        </div>
      )}
    </Card>
  );

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      const millions = amount / 1000000;
      return `${millions % 1 === 0 ? millions : millions.toFixed(1)}M ${CURRENCY.symbol}`;
    }
    if (amount >= 1000) {
      const thousands = amount / 1000;
      return `${thousands % 1 === 0 ? thousands : thousands.toFixed(1)}K ${CURRENCY.symbol}`;
    }
    return `${amount} ${CURRENCY.symbol}`;
  };

  const currentPeriodLabel = `${dateRange[0].format('DD MMM')} - ${dateRange[1].format('DD MMM')}`;
  const branchSales = operations?.branchSales || [];
  const lowStock = operations?.lowStock || [];
  const pendingOrders = operations?.pendingOrders || [];
  const credit = operations?.credit || {
    totalCreditLimit: 0,
    totalOutstanding: 0,
    overdueAmount: 0,
    customersOverLimit: 0,
  };
  const creditUtilization = credit.totalCreditLimit > 0
    ? Math.min(100, (credit.totalOutstanding / credit.totalCreditLimit) * 100)
    : 0;
  const shortcuts = operations?.shortcuts || {
    approveOrders: 0,
    pendingInvoices: 0,
    stockAlerts: 0,
    customersOverLimit: 0,
  };
  const shortcutItems = [
    { label: 'Approve Orders', count: shortcuts.approveOrders, icon: <CheckCircleOutlined style={{ color: '#6b7280' }} />, color: '#F97316', path: '/orders' },
    { label: 'Pending Invoices', count: shortcuts.pendingInvoices, icon: <FileTextOutlined style={{ color: '#6b7280' }} />, color: '#0EA5E9', path: '/invoicing' },
    { label: 'Stock Alerts', count: shortcuts.stockAlerts, icon: <SwapOutlined style={{ color: '#6b7280' }} />, color: '#0EA5E9', path: '/inventory' },
    { label: 'Customers Over Limit', count: shortcuts.customersOverLimit, icon: <TeamOutlined style={{ color: '#6b7280' }} />, color: '#0EA5E9', path: '/credit' },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Dashboard</Title>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Select value={selectedBranchId} style={{ width: 180 }} onChange={setSelectedBranchId}>
            <Select.Option value="all">
              <Space size={6}>
                <BankOutlined />
                <span>All Branches</span>
              </Space>
            </Select.Option>
            {branches.map(b => (
              <Select.Option key={b.id} value={b.id}>
                <Space size={6}>
                  <BankOutlined />
                  <span>{b.name}</span>
                </Space>
              </Select.Option>
            ))}
          </Select>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(value) => {
              if (value?.[0] && value?.[1]) setDateRange([value[0], value[1]]);
            }}
          />
          <Button onClick={fetchDashboardData}>Apply</Button>
        </div>
      </div>

      {/* --- Top Stat Cards --- */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={5} style={{ display: 'flex' }}>
          <StatCard 
            title="Total Orders" value={summary?.totalOrders.toLocaleString()} 
            icon={<FileTextOutlined />} iconColor="#3B82F6" iconBg="#EFF6FF"
            trendLabel={currentPeriodLabel}
          />
        </Col>
        <Col xs={24} sm={12} lg={5} style={{ display: 'flex' }}>
          <StatCard 
            title="Pending Orders" value={summary?.pendingOrders.toLocaleString()} 
            icon={<ClockCircleOutlined />} iconColor="#F59E0B" iconBg="#FEF3C7"
            trendLabel={currentPeriodLabel}
          />
        </Col>
        <Col xs={24} sm={12} lg={5} style={{ display: 'flex' }}>
          <StatCard 
            title="Approved Orders" value={summary?.approvedOrders.toLocaleString()} 
            icon={<CheckCircleOutlined />} iconColor="#10B981" iconBg="#D1FAE5"
            trendLabel={currentPeriodLabel}
          />
        </Col>
        <Col xs={24} sm={12} lg={5} style={{ display: 'flex' }}>
          <StatCard 
            title="Total Invoices" value={(operations?.invoices.totalInvoices || 0).toLocaleString()} 
            icon={<FileDoneOutlined />} iconColor="#8B5CF6" iconBg="#EDE9FE"
            trendLabel={currentPeriodLabel}
          />
        </Col>
        <Col xs={24} sm={12} lg={4} style={{ display: 'flex' }}>
          <StatCard 
            title="Total Sales " value={summary ? formatCurrency(summary.totalRevenue) : '0'} 
            icon={<DollarOutlined />} iconColor="#3B82F6" iconBg="#EFF6FF"
            trendLabel={currentPeriodLabel}
          />
        </Col>
      </Row>

      {/* --- Charts Row --- */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={10}>
          <Card title={<span style={{ fontWeight: 600 }}>Revenue Trend</span>} className="glass-card" variant="borderless" style={{ height: '100%' }}>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickFormatter={(val) => formatCurrency(val)} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} formatter={(val: any) => Number(val).toLocaleString()} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" name="Revenue" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={7}>
          <Card title={<span style={{ fontWeight: 600 }}>Orders by Status</span>} className="glass-card" variant="borderless" style={{ height: '100%' }}>
            <div style={{ display: 'flex', height: 250, alignItems: 'center' }}>
              <div style={{ width: '55%', height: 250, position: 'relative' }}>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>{summary?.totalOrders.toLocaleString()}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Total</div>
                </div>
              </div>
              
              <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '16px' }}>
                {statusData.map(status => (
                  <div key={status.name}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '4px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: status.color }}></div>
                      <span style={{ color: '#6b7280' }}>{status.name}</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>{status.value} <span style={{ color: '#6b7280', fontSize: '12px', fontWeight: 400 }}>({((status.value / (summary?.totalOrders || 1)) * 100).toFixed(1)}%)</span></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={7}>
          <Card title={<span style={{ fontWeight: 600 }}>Top Branches by Sales</span>} className="glass-card" variant="borderless" style={{ height: '100%' }}>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={branchSales} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} tickFormatter={(val) => formatCurrency(Number(val))} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#4b5563' }} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} formatter={(val: any) => Number(val).toLocaleString()} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={20}>
                    {branchSales.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Expiry Alerts Banner */}
      {expiryAlerts && (expiryAlerts.expired.length > 0 || expiryAlerts.expiringSoon.length > 0) && (
        <Card className="glass-card animate-fade-in" variant="borderless" style={{ marginBottom: '24px', borderLeft: '4px solid #EF4444' }}>
          <Space orientation="vertical" style={{ width: '100%' }} size={16}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ClockCircleOutlined style={{ color: '#EF4444', fontSize: '20px' }} />
                <strong style={{ fontSize: '16px', color: '#111827' }}>Product Expiry Alerts</strong>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                  ({expiryAlerts.expired.length} expired, {expiryAlerts.expiringSoon.length} expiring soon)
                </span>
              </div>
              <Button type="link" onClick={() => navigate('/products')} style={{ padding: 0, height: 'auto', fontWeight: 600, color: 'var(--primary-color)' }}>
                View All Catalog →
              </Button>
            </div>
            
            <Row gutter={[16, 16]}>
              {expiryAlerts.expired.length > 0 && (
                <Col xs={24} md={expiryAlerts.expiringSoon.length > 0 ? 12 : 24}>
                  <div style={{ background: '#FEF2F2', padding: '12px 16px', borderRadius: '12px', border: '1px solid #FEE2E2' }}>
                    <div style={{ color: '#991B1B', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Expired Products (Action Required)</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {expiryAlerts.expired.slice(0, 5).map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ color: '#111827', fontWeight: 500 }}>{item.name} <span style={{ fontSize: '11px', color: '#6b7280' }}>({item.sku})</span></span>
                          <Tag color="red" style={{ border: 'none', borderRadius: '6px' }}>Expired {dayjs(item.expiryDate).format('YYYY-MM-DD')}</Tag>
                        </div>
                      ))}
                      {expiryAlerts.expired.length > 5 && (
                        <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
                          + {expiryAlerts.expired.length - 5} more expired items. Click "View All" to see them.
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              )}
              {expiryAlerts.expiringSoon.length > 0 && (
                <Col xs={24} md={expiryAlerts.expired.length > 0 ? 12 : 24}>
                  <div style={{ background: '#FFFBEB', padding: '12px 16px', borderRadius: '12px', border: '1px solid #FEF3C7' }}>
                    <div style={{ color: '#92400E', fontWeight: 600, marginBottom: '8px', fontSize: '13px' }}>Expiring Within 30 Days</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {expiryAlerts.expiringSoon.slice(0, 5).map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ color: '#111827', fontWeight: 500 }}>{item.name} <span style={{ fontSize: '11px', color: '#6b7280' }}>({item.sku})</span></span>
                          <Tag color="orange" style={{ border: 'none', borderRadius: '6px' }}>Expires {dayjs(item.expiryDate).format('YYYY-MM-DD')}</Tag>
                        </div>
                      ))}
                      {expiryAlerts.expiringSoon.length > 5 && (
                        <div style={{ fontSize: '12px', color: '#6b7280', fontStyle: 'italic', marginTop: '4px' }}>
                          + {expiryAlerts.expiringSoon.length - 5} more expiring items. Click "View All" to see them.
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </Space>
        </Card>
      )}

      {/* --- Middle Row --- */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={14}>
          <Card title={<span style={{ fontWeight: 600 }}>Recent Orders</span>} className="glass-card" variant="borderless" style={{ height: '100%' }}>
            <Table 
              dataSource={recentOrders} 
              pagination={false} 
              size="small"
              columns={[
                { title: 'Order No.', dataIndex: 'orderNo', key: 'orderNo', render: (text) => <a style={{ fontWeight: 500, color: '#3B82F6' }}>{text}</a> },
                { title: 'Customer', dataIndex: 'customer', key: 'customer', render: (t) => <span style={{ color: '#4b5563' }}>{t}</span> },
                { title: 'Branch', dataIndex: 'branch', key: 'branch', render: (t) => <span style={{ color: '#4b5563' }}>{t}</span> },
                { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={getStatusColor(s)} style={{ borderRadius: '12px', fontWeight: 500, border: 'none' }}>{s}</Tag> },
                { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (v) => <span style={{ fontWeight: 500 }}>{v.toLocaleString()}</span> },
                { title: 'Date', dataIndex: 'date', key: 'date', render: (t) => <span style={{ color: '#6b7280', fontSize: '13px' }}>{t}</span> },
              ]}
            />
            <div style={{ marginTop: '16px' }}>
              <a onClick={() => navigate('/orders')} style={{ color: '#3B82F6', fontWeight: 500, cursor: 'pointer' }}>View all orders →</a>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={5}>
          <Card title={<span style={{ fontWeight: 600 }}>Credit Overview</span>} className="glass-card" variant="borderless" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
              <span style={{ color: '#6b7280' }}>Total Credit Limit</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(credit.totalCreditLimit)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
              <span style={{ color: '#6b7280' }}>Total Outstanding</span>
              <span style={{ fontWeight: 500 }}>{formatCurrency(credit.totalOutstanding)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px' }}>
              <span style={{ color: '#6b7280' }}>Overdue Amount</span>
              <span style={{ fontWeight: 500, color: '#EF4444' }}>{formatCurrency(credit.overdueAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '13px' }}>
              <span style={{ color: '#6b7280' }}>Customers Over Limit</span>
              <span style={{ fontWeight: 500, color: '#F59E0B' }}>{credit.customersOverLimit}</span>
            </div>
            
            <div style={{ height: 120, position: 'relative', marginTop: '24px' }}>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={[{value: creditUtilization, fill: '#3B82F6'}, {value: Math.max(0, 100 - creditUtilization), fill: '#f3f4f6'}]} innerRadius={40} outerRadius={55} dataKey="value" startAngle={90} endAngle={-270} stroke="none" />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>{creditUtilization.toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '-12px', fontWeight: 500 }}>
                Credit Utilization
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={5}>
          <Card title={<span style={{ fontWeight: 600 }}>My Role & Access</span>} className="glass-card" variant="borderless" style={{ height: '100%', background: 'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(243,244,246,0.5) 100%)' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>You are logged in as</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>{user?.role?.displayName || 'HQ Manager'}</div>
            </div>
            
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px' }}>Role Permissions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                'Dashboard (All)', 'Orders (All)', 'Inventory (All)', 'Invoicing (All)', 'Reports (All)', 'Administration (Read)'
              ].map(item => (
                <div key={item} style={{ padding: '4px 0', color: '#4b5563', fontSize: '13px', display: 'flex', alignItems: 'center' }}>
                  <CheckCircleOutlined style={{ color: '#3B82F6', marginRight: '8px' }} /> {item}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px' }}>
              <a onClick={() => navigate('/roles')} style={{ color: '#3B82F6', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}>View role details →</a>
            </div>
          </Card>
        </Col>
      </Row>

      {/* --- Bottom Row --- */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title={<span style={{ fontWeight: 600 }}>Low Stock Alerts</span>} className="glass-card" variant="borderless" style={{ height: '100%' }}>
            <Table 
              dataSource={lowStock} 
              pagination={false} 
              size="small"
              columns={[
                { title: 'Product', dataIndex: 'product', key: 'product', render: (t) => <span style={{ color: '#4b5563', fontSize: '13px', fontWeight: 500 }}>{t}</span> },
                { title: 'Branch', dataIndex: 'branch', key: 'branch', render: (t) => <span style={{ color: '#6b7280', fontSize: '12px' }}>{t}</span> },
                { title: 'On Hand', dataIndex: 'onHand', key: 'onHand', render: (v) => <span style={{ fontWeight: 600, color: '#EF4444' }}>{v}</span> },
                { title: 'Reorder Level', dataIndex: 'reorder', key: 'reorder', render: (v) => <span style={{ color: '#6b7280', fontSize: '12px' }}>{v}</span> },
              ]}
            />
            <div style={{ marginTop: '16px' }}>
              <a onClick={() => navigate('/inventory')} style={{ color: '#3B82F6', fontWeight: 500, cursor: 'pointer' }}>View all →</a>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card title={<span style={{ fontWeight: 600 }}>Pending Orders (Requires Action)</span>} className="glass-card" variant="borderless" style={{ height: '100%' }}>
            <Table 
              dataSource={pendingOrders} 
              pagination={false} 
              size="small"
              columns={[
                { title: 'Order No.', dataIndex: 'orderNo', key: 'orderNo', render: (t) => <a style={{ fontWeight: 500, color: '#3B82F6' }}>{t}</a> },
                { title: 'Customer', dataIndex: 'customer', key: 'customer', render: (t) => <span style={{ color: '#4b5563', fontSize: '13px' }}>{t}</span> },
                { title: 'Reason', dataIndex: 'reason', key: 'reason', render: (t) => <span style={{ color: '#6b7280', fontSize: '13px' }}>{t}</span> },
                { title: 'Days', dataIndex: 'days', key: 'days', render: (v) => <span style={{ fontWeight: 600, color: '#F59E0B' }}>{v}</span> },
              ]}
            />
            <div style={{ marginTop: '16px' }}>
              <a onClick={() => navigate('/orders')} style={{ color: '#3B82F6', fontWeight: 500, cursor: 'pointer' }}>View all →</a>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={7}>
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card title={<span style={{ fontWeight: 600 }}>Quick Actions</span>} className="glass-card" variant="borderless">
                <Row gutter={[12, 12]}>
                  <Col span={8}>
                    <Button onClick={() => navigate('/orders')} style={{ height: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <PlusOutlined style={{ fontSize: '20px', marginBottom: '8px', color: '#4b5563' }} />
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>Create Order</span>
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button onClick={() => navigate('/invoicing')} style={{ height: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <FileDoneOutlined style={{ fontSize: '20px', marginBottom: '8px', color: '#4b5563' }} />
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>Create Invoice</span>
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button onClick={() => navigate('/inventory')} style={{ height: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <SwapOutlined style={{ fontSize: '20px', marginBottom: '8px', color: '#4b5563' }} />
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>Stock Transfer</span>
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button onClick={() => navigate('/credit')} style={{ height: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <SafetyCertificateOutlined style={{ fontSize: '20px', marginBottom: '8px', color: '#4b5563' }} />
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>Check Credit</span>
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button onClick={() => navigate('/customers')} style={{ height: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <FileTextOutlined style={{ fontSize: '20px', marginBottom: '8px', color: '#4b5563' }} />
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>Customer Statement</span>
                    </Button>
                  </Col>
                  <Col span={8}>
                    <Button onClick={() => navigate('/reports')} style={{ height: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <BarChartOutlined style={{ fontSize: '20px', marginBottom: '8px', color: '#4b5563' }} />
                      <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 500 }}>Reports</span>
                    </Button>
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24}>
              <Card title={<span style={{ fontWeight: 600 }}>Shortcuts</span>} className="glass-card" variant="borderless">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {shortcutItems.map((item) => (
                  <div key={item.label} onClick={() => navigate(item.path)} style={{ padding: '8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ color: '#4b5563', fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '12px', display: 'flex' }}>{item.icon}</span>
                      {item.label}
                    </span>
                    <Badge count={item.count} style={{ backgroundColor: item.color, border: 'none', borderRadius: '4px' }} />
                  </div>
                ))}
              </div>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

    </div>
  );
};
