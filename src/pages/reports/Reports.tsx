import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  Row, Col, Card, Typography, Table, Tag, Select, DatePicker,
  Button, Spin, Space, Tabs, Statistic, message
} from 'antd';
import {
  ReloadOutlined, CalendarOutlined, FileTextOutlined,
  BarChartOutlined, DollarOutlined, ShoppingCartOutlined,
  StarOutlined, PercentageOutlined
} from '@ant-design/icons';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { useAuthStore } from '../../store/auth.store';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface BranchInfo {
  id: string;
  code: string;
  name: string;
}

interface SalesRepInfo {
  id: string;
  code: string;
  user: { firstName: string; lastName: string };
}

interface CustomerInfo {
  id: string;
  code: string;
  name: string;
}

interface CategoryInfo {
  id: string;
  name: string;
}

export const Reports: React.FC = () => {
  const { user } = useAuthStore();

  // Scoping & Role checks
  const isBranchManager = user?.role?.name === 'BRANCH_MANAGER';
  const isCustomer = user?.role?.name === 'CUSTOMER';
  const isHQUser = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'HQ_MANAGER';

  // Filters State
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(29, 'days'),
    dayjs()
  ]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Dropdown Lists State
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepInfo[]>([]);
  const [customers, setCustomers] = useState<CustomerInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);

  // Report Data States
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [dailySales, setDailySales] = useState<any[]>([]);
  const [systemSales, setSystemSales] = useState<any[]>([]);
  const [itemSales, setItemSales] = useState<any[]>([]);

  // Fetch dropdown data on mount
  useEffect(() => {
    // If branch manager, lock branch
    if (isBranchManager && user?.branch?.id) {
      setSelectedBranch(user.branch.id);
    }

    api.get('/branches').then(res => {
      if (res.data.success) {
        setBranches(res.data.data.filter((b: any) => b.isActive));
      }
    }).catch(() => {});

    api.get('/sales-reps', { params: { limit: 200 } }).then(res => {
      if (res.data.success) setSalesReps(res.data.data);
    }).catch(() => {});

    api.get('/customers', { params: { limit: 200 } }).then(res => {
      if (res.data.success) setCustomers(res.data.data);
    }).catch(() => {});

    api.get('/products/categories').then(res => {
      if (res.data.success) setCategories(res.data.data);
    }).catch(() => {});
  }, [isBranchManager, user]);

  // Fetch report data based on active tab and filters
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
        dateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
        branchId: selectedBranch !== 'all' ? selectedBranch : undefined,
        salesRepId: selectedRep !== 'all' ? selectedRep : undefined,
        customerId: selectedCustomer !== 'all' ? selectedCustomer : undefined,
        categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      };

      if (activeTab === 'daily') {
        const res = await api.get('/reports/daily-sales', { params });
        if (res.data.success) setDailySales(res.data.data);
      } else if (activeTab === 'system') {
        const res = await api.get('/reports/system-sales', { params });
        if (res.data.success) setSystemSales(res.data.data);
      } else if (activeTab === 'item') {
        const res = await api.get('/reports/item-sales', { params });
        if (res.data.success) setItemSales(res.data.data);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRange, selectedBranch, selectedRep, selectedCustomer, selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Reset Filters
  const handleResetFilters = () => {
    setDateRange([dayjs().subtract(29, 'days'), dayjs()]);
    setSelectedBranch(isBranchManager && user?.branch?.id ? user.branch.id : 'all');
    setSelectedRep('all');
    setSelectedCustomer('all');
    setSelectedCategory('all');
    setSelectedStatus('all');
  };

  // Format currency values for display/charts
  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`;
    if (val >= 1000) return `${(val / 100).toFixed(1)}K`;
    return val.toLocaleString();
  };

  // --- Dynamic KPIs Calculations ---
  
  const dailyKPIs = useMemo(() => {
    const totalRevenue = dailySales.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalOrders = dailySales.reduce((sum, item) => sum + item.orderCount, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const maxSales = dailySales.length > 0 ? Math.max(...dailySales.map(item => item.totalAmount)) : 0;
    return { totalRevenue, totalOrders, avgOrderValue, maxSales };
  }, [dailySales]);

  const systemKPIs = useMemo(() => {
    const totalRevenue = systemSales.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalOrders = systemSales.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const cancelledCount = systemSales.filter(item => item.status === 'CANCELLED').length;
    return { totalRevenue, totalOrders, avgOrderValue, cancelledCount };
  }, [systemSales]);

  const itemKPIs = useMemo(() => {
    const totalQty = itemSales.reduce((sum, item) => sum + item.quantitySold, 0);
    const totalRev = itemSales.reduce((sum, item) => sum + item.totalRevenue, 0);
    const distinctItems = itemSales.length;
    const topItem = itemSales.length > 0 ? itemSales[0] : null; // Sorted desc in backend
    return { totalQty, totalRev, distinctItems, topItem };
  }, [itemSales]);

  // Order status breakdown data for System Sales tab chart
  const orderStatusPieData = useMemo(() => {
    const counts: Record<string, number> = {};
    systemSales.forEach(order => {
      counts[order.status] = (counts[order.status] || 0) + 1;
    });

    const colors: Record<string, string> = {
      'DRAFT': '#9CA3AF',
      'SUBMITTED': '#3B82F6',
      'BRANCH_REVIEW': '#8B5CF6',
      'PENDING': '#F59E0B',
      'APPROVED': '#10B981',
      'READY_FOR_DELIVERY': '#14B8A6',
      'INVOICED': '#06B6D4',
      'COMPLETED': '#6366F1',
      'CANCELLED': '#EF4444'
    };

    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value,
      color: colors[name] || '#cbd5e1'
    }));
  }, [systemSales]);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Reports & Analytics</Title>
          <Text type="secondary">Operational sales performance, order trends, and inventory analysis</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchReportData}>Refresh Data</Button>
      </div>

      {/* Filter Panel */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Space wrap size="middle" align="center">
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Date Range</div>
            <DatePicker.RangePicker
              value={dateRange}
              onChange={(value) => {
                if (value?.[0] && value?.[1]) setDateRange([value[0], value[1]]);
              }}
              style={{ borderRadius: '12px', height: '42px' }}
              allowClear={false}
            />
          </div>

          {/* Branch Filter */}
          {isHQUser && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Branch</div>
              <Select
                value={selectedBranch}
                style={{ width: 180, borderRadius: '12px' }}
                onChange={setSelectedBranch}
              >
                <Select.Option value="all">All Branches</Select.Option>
                {branches.map(b => (
                  <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {/* Sales Representative Filter */}
          {(isHQUser || isBranchManager) && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Sales Rep / MSR</div>
              <Select
                value={selectedRep}
                style={{ width: 180, borderRadius: '12px' }}
                onChange={setSelectedRep}
              >
                <Select.Option value="all">All Reps</Select.Option>
                {salesReps.map(r => (
                  <Select.Option key={r.id} value={r.id}>{r.user.firstName} {r.user.lastName} ({r.code})</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {/* Customer Filter */}
          {!isCustomer && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Customer</div>
              <Select
                value={selectedCustomer}
                style={{ width: 200, borderRadius: '12px' }}
                onChange={setSelectedCustomer}
                showSearch
                optionFilterProp="children"
              >
                <Select.Option value="all">All Customers</Select.Option>
                {customers.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name} ({c.code})</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {/* Category Filter (displayed only on Item Sales tab) */}
          {activeTab === 'item' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Product Category</div>
              <Select
                value={selectedCategory}
                style={{ width: 180, borderRadius: '12px' }}
                onChange={setSelectedCategory}
              >
                <Select.Option value="all">All Categories</Select.Option>
                {categories.map(c => (
                  <Select.Option key={c.id} value={c.id}>{c.name}</Select.Option>
                ))}
              </Select>
            </div>
          )}

          {/* Status Filter (displayed only on System Sales tab) */}
          {activeTab === 'system' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#4b5563', marginBottom: '4px' }}>Order Status</div>
              <Select
                value={selectedStatus}
                style={{ width: 180, borderRadius: '12px' }}
                onChange={setSelectedStatus}
              >
                <Select.Option value="all">All Statuses</Select.Option>
                <Select.Option value="DRAFT">Draft</Select.Option>
                <Select.Option value="SUBMITTED">Submitted</Select.Option>
                <Select.Option value="BRANCH_REVIEW">Branch Review</Select.Option>
                <Select.Option value="PENDING">Pending</Select.Option>
                <Select.Option value="APPROVED">Approved</Select.Option>
                <Select.Option value="READY_FOR_DELIVERY">Ready For Delivery</Select.Option>
                <Select.Option value="INVOICED">Invoiced</Select.Option>
                <Select.Option value="COMPLETED">Completed</Select.Option>
                <Select.Option value="CANCELLED">Cancelled</Select.Option>
              </Select>
            </div>
          )}

          <div>
            <div style={{ height: '22px' }}></div>
            <Button onClick={handleResetFilters} style={{ borderRadius: '12px', height: '42px' }}>Reset</Button>
          </div>
        </Space>
      </Card>

      {/* Tabs Layout */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        style={{ marginTop: 12 }}
        items={[
          // ================= DAILY SALES TAB =================
          {
            key: 'daily',
            label: (
              <span>
                <CalendarOutlined />
                Daily Sales
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                {/* KPI Cards */}
                 <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Total Sales Revenue"
                        value={dailyKPIs.totalRevenue}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<DollarOutlined style={{ color: '#10B981' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Total Orders Count"
                        value={dailyKPIs.totalOrders}
                        prefix={<ShoppingCartOutlined style={{ color: '#3B82F6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Avg. Order Value"
                        value={dailyKPIs.avgOrderValue}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<PercentageOutlined style={{ color: '#8B5CF6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Peak Daily Sales"
                        value={dailyKPIs.maxSales}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<StarOutlined style={{ color: '#F59E0B' }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Trend Chart */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col span={24}>
                    <Card title="Sales Revenue Trend" className="glass-card" variant="borderless">
                      <div style={{ height: 300 }}>
                        {dailySales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={dailySales} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
                              <YAxis tickLine={false} tickFormatter={(v) => formatValue(v)} tick={{ fontSize: 11, fill: '#6b7280' }} />
                              <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ${CURRENCY.symbol}`, 'Sales']} />
                              <Legend />
                              <Line type="monotone" name="Sales Revenue" dataKey="totalAmount" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Text type="secondary">No sales data available for this range</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Data Table */}
                <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
                  <Table
                    dataSource={dailySales.map((item, idx) => ({ ...item, key: idx }))}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    columns={[
                      { title: 'Date', dataIndex: 'date', key: 'date', sorter: (a, b) => a.date.localeCompare(b.date) },
                      { title: 'Orders Count', dataIndex: 'orderCount', key: 'orderCount', sorter: (a, b) => a.orderCount - b.orderCount },
                      { title: 'Subtotal', dataIndex: 'subtotal', key: 'subtotal', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Discount', dataIndex: 'discount', key: 'discount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Tax', dataIndex: 'tax', key: 'tax', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Total Revenue', dataIndex: 'totalAmount', key: 'totalAmount', sorter: (a, b) => a.totalAmount - b.totalAmount, render: (v) => <Text strong style={{ color: '#10B981' }}>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> }
                    ]}
                  />
                </Card>
              </Spin>
            )
          },

          // ================= SYSTEM SALES TAB =================
          {
            key: 'system',
            label: (
              <span>
                <FileTextOutlined />
                System Sales (All Orders)
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                {/* KPI Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Sum Total Amount"
                        value={systemKPIs.totalRevenue}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<DollarOutlined style={{ color: '#3B82F6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="System Orders Listed"
                        value={systemKPIs.totalOrders}
                        prefix={<ShoppingCartOutlined style={{ color: '#6366F1' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="AOV (Avg Order Value)"
                        value={systemKPIs.avgOrderValue}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<PercentageOutlined style={{ color: '#8B5CF6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%', borderLeft: systemKPIs.cancelledCount > 0 ? '3px solid #EF4444' : 'none' }}>
                      <Statistic
                        title="Cancelled Orders"
                        value={systemKPIs.cancelledCount}
                        valueStyle={{ color: systemKPIs.cancelledCount > 0 ? '#EF4444' : 'inherit' }}
                        prefix={<ReloadOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Status Breakdown Charts */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} md={12}>
                    <Card title="Orders by Status (Share)" className="glass-card" variant="borderless" style={{ height: '100%' }}>
                      <div style={{ display: 'flex', height: 260, alignItems: 'center' }}>
                        <div style={{ width: '50%', height: 250, position: 'relative' }}>
                          {orderStatusPieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={250}>
                              <PieChart>
                                <Pie
                                  data={orderStatusPieData}
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={4}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {orderStatusPieData.map((entry, idx) => (
                                    <Cell key={`cell-${idx}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                              <Text type="secondary">No records</Text>
                            </div>
                          )}
                        </div>
                        <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '240px' }}>
                          {orderStatusPieData.map(item => (
                            <div key={item.name} style={{ fontSize: '12px' }}>
                              <Space size={6}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }}></div>
                                <Text type="secondary">{item.name}:</Text>
                                <Text strong>{item.value}</Text>
                              </Space>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  </Col>

                  <Col xs={24} md={12}>
                    <Card title="Order Amount Distribution" className="glass-card" variant="borderless" style={{ height: '100%' }}>
                      <div style={{ height: 260 }}>
                        {systemSales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={systemSales.slice(0, 15)} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="orderNumber" tick={{ fontSize: 9, fill: '#6b7280' }} />
                              <YAxis tickFormatter={(v) => formatValue(v)} tick={{ fontSize: 10, fill: '#6b7280' }} />
                              <Tooltip formatter={(value: any) => [`${Number(value).toLocaleString()} ${CURRENCY.symbol}`, 'Amount']} />
                              <Bar dataKey="totalAmount" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Text type="secondary">No sales transactions available</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Table */}
                <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
                  <Table
                    dataSource={systemSales}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 1100 }}
                    columns={[
                      { title: 'Order No.', dataIndex: 'orderNumber', key: 'orderNumber', sorter: (a, b) => a.orderNumber.localeCompare(b.orderNumber), render: (v) => <Text code strong>{v}</Text> },
                      { title: 'Order Date', dataIndex: 'orderDate', key: 'orderDate', sorter: (a, b) => a.orderDate.localeCompare(b.orderDate), render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm') },
                      { title: 'Customer', key: 'customer', render: (_, r) => <div><Text strong>{r.customerName}</Text><br /><Text type="secondary" style={{ fontSize: 11 }}>{r.customerCode}</Text></div> },
                      { title: 'Sales Rep / MSR', dataIndex: 'salesRepName', key: 'salesRepName' },
                      { title: 'Branch', dataIndex: 'branchName', key: 'branchName' },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => (
                          <Tag style={{ borderRadius: '12px', border: 'none', fontWeight: 500 }} color={
                            status === 'COMPLETED' ? 'green' : status === 'APPROVED' ? 'blue' : status === 'CANCELLED' ? 'red' : 'orange'
                          }>
                            {status.replace(/_/g, ' ')}
                          </Tag>
                        )
                      },
                      { title: 'Subtotal', dataIndex: 'subtotal', key: 'subtotal', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Tax (5%)', dataIndex: 'tax', key: 'tax', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Discount', dataIndex: 'discount', key: 'discount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Total Total', dataIndex: 'totalAmount', key: 'totalAmount', sorter: (a, b) => a.totalAmount - b.totalAmount, render: (v) => <Text strong style={{ color: '#3B82F6' }}>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> }
                    ]}
                  />
                </Card>
              </Spin>
            )
          },

          // ================= ITEM SALES TAB =================
          {
            key: 'item',
            label: (
              <span>
                <BarChartOutlined />
                Item Sales (Products)
              </span>
            ),
            children: (
              <Spin spinning={loading}>
                {/* KPI Cards */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Total Items Volume Sold"
                        value={itemKPIs.totalQty}
                        prefix={<ShoppingCartOutlined style={{ color: '#8B5CF6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Items Revenue Generated"
                        value={itemKPIs.totalRev}
                        precision={2}
                        suffix={CURRENCY.symbol}
                        prefix={<DollarOutlined style={{ color: '#10B981' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Distinct Product SKUs"
                        value={itemKPIs.distinctItems}
                        prefix={<FileTextOutlined style={{ color: '#3B82F6' }} />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6} style={{ display: 'flex' }}>
                    <Card className="glass-card" variant="borderless" style={{ width: '100%', height: '100%' }}>
                      <Statistic
                        title="Top Seller Item"
                        value={itemKPIs.topItem ? itemKPIs.topItem.productName : '—'}
                        valueStyle={{ fontSize: '15px', fontWeight: 700 }}
                        prefix={<StarOutlined style={{ color: '#F59E0B' }} />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* Top Selling Products Chart */}
                <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                  <Col span={24}>
                    <Card title="Top 10 Selling Products by Volume (Qty)" className="glass-card" variant="borderless">
                      <div style={{ height: 300 }}>
                        {itemSales.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={itemSales.slice(0, 10)} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="productName" tick={{ fontSize: 10, fill: '#6b7280' }} />
                              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
                              <Tooltip formatter={(value: any) => [value, 'Quantity Sold']} />
                              <Bar dataKey="quantitySold" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={40}>
                                {itemSales.slice(0, 10).map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 0 ? '#6366F1' : '#8B5CF6'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <Text type="secondary">No product sales records available</Text>
                          </div>
                        )}
                      </div>
                    </Card>
                  </Col>
                </Row>

                {/* Table */}
                <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
                  <Table
                    dataSource={itemSales.map((item, idx) => ({ ...item, key: idx }))}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    columns={[
                      { title: 'Code', dataIndex: 'productCode', key: 'productCode', render: (v) => <Text code>{v}</Text> },
                      { title: 'SKU', dataIndex: 'sku', key: 'sku' },
                      { title: 'Product Name', dataIndex: 'productName', key: 'productName', sorter: (a, b) => a.productName.localeCompare(b.productName) },
                      { title: 'Category', dataIndex: 'categoryName', key: 'categoryName' },
                      { title: 'Quantity Sold', dataIndex: 'quantitySold', key: 'quantitySold', sorter: (a, b) => a.quantitySold - b.quantitySold, render: (v, r) => <Text strong>{v} {r.uom}</Text> },
                      { title: 'Total Discounts Given', dataIndex: 'totalDiscount', key: 'totalDiscount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                      { title: 'Total Revenue', dataIndex: 'totalRevenue', key: 'totalRevenue', sorter: (a, b) => a.totalRevenue - b.totalRevenue, render: (v) => <Text strong style={{ color: '#8B5CF6' }}>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> }
                    ]}
                  />
                </Card>
              </Spin>
            )
          }
        ]}
      />
    </div>
  );
};
export default Reports;
