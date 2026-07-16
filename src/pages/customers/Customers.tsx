import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Input, Select, Space, Row, Col,
  Button, Modal, Form, InputNumber, Switch, message, Popconfirm, Tooltip, Descriptions, Badge,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined,
  DeleteOutlined, PhoneOutlined, MailOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY, CustomerCategory } from '../../types/index';

const { Title, Text } = Typography;

interface TerritoryInfo {
  id: string;
  code: string;
  name: string;
  region: string;
}

interface BranchInfo {
  id: string;
  code: string;
  name: string;
  city: string;
}

interface CreditLimitInfo {
  creditLimit: number;
  outstandingBalance: number;
  overdueAmount: number;
  status: string;
}

interface CustomerSalesRepRecord {
  salesRep: {
    code: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  isPrimary: boolean;
}

interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  township: string | null;
  region: string | null;
  district: string | null;
  category: CustomerCategory;
  mainChannel: { id: string, name: string } | null;
  subChannel: { id: string, name: string } | null;
  paymentTermDays: number;
  isActive: boolean;
  territory: TerritoryInfo | null;
  branch: BranchInfo | null;
  creditLimit: CreditLimitInfo | null;
  customerSalesReps?: CustomerSalesRepRecord[];
  _count: { orders: number };
}



const CREDIT_STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'processing'> = {
  GOOD_STANDING: 'success',
  OVERDUE: 'warning',
  OVER_LIMIT: 'error',
  CREDIT_HOLD: 'error',
};

export const Customers: React.FC = () => {
  // Data State
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [territories, setTerritories] = useState<TerritoryInfo[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [mainChannels, setMainChannels] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Detail Modal
  const [detailCustomer, setDetailCustomer] = useState<CustomerRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch territories for filter/form dropdowns
  useEffect(() => {
    api.get('/territories').then(res => {
      if (res.data.success) setTerritories(res.data.data);
    }).catch(() => {});
    api.get('/branches').then(res => {
      if (res.data.success) setBranches(res.data.data);
    }).catch(() => {});
    api.get('/channels/main').then(res => {
      if (res.data.success) setMainChannels(res.data.data);
    }).catch(() => {});
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          branchId: branchFilter !== 'all' ? branchFilter : undefined,
          territoryId: territoryFilter !== 'all' ? territoryFilter : undefined,
          isActive: activeFilter !== 'all' ? String(activeFilter === 'active') : undefined,
        },
      });
      if (res.data.success) {
        setCustomers(res.data.data);
        setTotalItems(res.data.meta?.total || 0);
      }
    } catch {
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, categoryFilter, branchFilter, territoryFilter, activeFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  
  useEffect(() => {
    const handleUpdate = () => {
      fetchCustomers();
    };
    window.addEventListener('api-update:customer', handleUpdate);
    return () => {
      window.removeEventListener('api-update:customer', handleUpdate);
    };
  }, [fetchCustomers]);

  // ---- Create / Edit ----
  const openCreateModal = () => {
    setEditingCustomer(null);
    form.resetFields();
    form.setFieldsValue({
      category: 'REGULAR',
      paymentTermDays: 30,
      isActive: true,
    });
    // Auto-select first branch as default if available
    if (branches.length > 0) {
      form.setFieldValue('branchId', branches[0].id);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (record: CustomerRecord) => {
    setEditingCustomer(record);
    form.setFieldsValue({
      name: record.name,
      contactPerson: record.contactPerson,
      phone: record.phone,
      email: record.email,
      address: record.address,
      city: record.city,
      township: record.township,
      region: record.region,
      district: record.district,
      category: record.category,
      mainChannelId: record.mainChannel?.id,
      subChannelId: record.subChannel?.id,
      paymentTermDays: record.paymentTermDays,
      territoryId: record.territory?.id || null,
      branchId: record.branch?.id || null,
      creditLimit: record.creditLimit?.creditLimit ? Number(record.creditLimit.creditLimit) : undefined,
      isActive: record.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, values);
        message.success('Customer updated successfully');
      } else {
        await api.post('/customers', values);
        message.success('Customer created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      message.success('Customer deleted');
      fetchCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ---- Approve / Activate Customer ----
  const handleApproveCustomer = async (id: string) => {
    try {
      await api.put(`/customers/${id}`, { isActive: true });
      message.success('Customer approved and activated successfully');
      fetchCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to approve customer');
    }
  };

  // ---- View Detail ----
  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/customers/${id}`);
      if (res.data.success) {
        setDetailCustomer(res.data.data);
        setDetailOpen(true);
      }
    } catch {
      message.error('Failed to load customer details');
    }
  };

  // ---- Table Columns ----
  const columns: ColumnsType<CustomerRecord> = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (code: string) => <Text code style={{ fontWeight: 600 }}>{code}</Text>,
    },
    {
      title: 'Customer Name',
      key: 'name',
      render: (_: any, record: CustomerRecord) => (
        <Space orientation="vertical" size={2}>
          <Text strong style={{ color: '#111827' }}>{record.name}</Text>
          {record.contactPerson && (
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.contactPerson}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 180,
      render: (_: any, record: CustomerRecord) => (
        <Space orientation="vertical" size={2}>
          {record.phone && (
            <Text style={{ fontSize: '13px' }}>
              <PhoneOutlined style={{ marginRight: 6, color: 'var(--text-secondary)' }} />
              {record.phone}
            </Text>
          )}
          {record.email && (
            <Text style={{ fontSize: '13px' }} type="secondary">
              <MailOutlined style={{ marginRight: 6 }} />
              {record.email}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      responsive: ['lg'],
    },
    {
      title: 'Township',
      dataIndex: 'township',
      key: 'township',
      responsive: ['lg'],
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      responsive: ['xl'],
    },
    {
      title: 'District',
      dataIndex: 'district',
      key: 'district',
      responsive: ['xl'],
    },
    {
      title: 'Channel',
      key: 'channel',
      width: 110,
      render: (_: any, record: CustomerRecord) => record.mainChannel ? (
        <Tag color="geekblue" style={{ borderRadius: '8px', border: 'none', fontWeight: 600 }}>{record.mainChannel.name}</Tag>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Territory',
      key: 'territory',
      width: 130,
      render: (_: any, record: CustomerRecord) => (
        record.territory ? (
          <Space orientation="vertical" size={0}>
            <Text style={{ fontSize: '13px' }}>{record.territory.name}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>{record.territory.region}</Text>
          </Space>
        ) : <Text type="secondary">—</Text>
      ),
    },
    {
      title: 'Branch',
      key: 'branch',
      width: 130,
      render: (_: any, record: CustomerRecord) => (
        record.branch ? (
          <Space orientation="vertical" size={0}>
            <Text style={{ fontSize: '13px' }}>{record.branch.name}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>{record.branch.code}</Text>
          </Space>
        ) : <Text type="secondary">All Branches</Text>
      ),
    },
    {
      title: 'Credit',
      key: 'credit',
      width: 150,
      render: (_: any, record: CustomerRecord) => {
        const cl = record.creditLimit;
        if (!cl) return <Text type="secondary">No limit set</Text>;
        return (
          <Space orientation="vertical" size={2}>
            <Text style={{ fontSize: '13px' }}>
              <Text strong>{cl.creditLimit.toLocaleString()}</Text> {CURRENCY.symbol}
            </Text>
            <Space size={4}>
              <Badge status={CREDIT_STATUS_COLORS[cl.status] || 'default'} />
              <Text style={{ fontSize: '11px' }} type="secondary">
                {cl.status.replace('_', ' ')}
              </Text>
            </Space>
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 125,
      render: (_: any, record: CustomerRecord) => (
        <Tag color={record.isActive ? 'green' : 'orange'} style={{ borderRadius: '8px', border: 'none', fontWeight: 600 }}>
          {record.isActive ? 'Active' : 'Pending Activation'}
        </Tag>
      ),
    },
    {
      title: 'Submitted By / SR',
      key: 'salesRep',
      width: 155,
      render: (_: any, record: CustomerRecord) => {
        const primarySR = record.customerSalesReps?.find(csr => csr.isPrimary)?.salesRep || record.customerSalesReps?.[0]?.salesRep;
        if (!primarySR) return <Text type="secondary">—</Text>;
        return (
          <Space orientation="vertical" size={0}>
            <Text style={{ fontSize: '13px' }}>{primarySR.user.firstName} {primarySR.user.lastName}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>{primarySR.code}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: any, record: CustomerRecord) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.id)}
            />
          </Tooltip>
          {!record.isActive && (
            <Popconfirm
              title="Approve and activate this customer?"
              onConfirm={() => handleApproveCustomer(record.id)}
              okText="Approve"
            >
              <Tooltip title="Approve Customer">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckCircleOutlined style={{ color: '#10B981' }} />}
                />
              </Tooltip>
            </Popconfirm>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this customer?"
            description="Customers with orders will be deactivated instead."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '16px',
      }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Customers</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          style={{ borderRadius: '12px' }}
        >
          Add Customer
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by name, code, contact or phone..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={categoryFilter}
              onChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Categories</Select.Option>
              <Select.Option value="REGULAR">Regular</Select.Option>
              <Select.Option value="VIP">VIP</Select.Option>
              <Select.Option value="WHOLESALE">Wholesale</Select.Option>
              <Select.Option value="DEALER">Dealer</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={branchFilter}
              onChange={(val) => { setBranchFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Branches</Select.Option>
              {branches.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={territoryFilter}
              onChange={(val) => { setTerritoryFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Territories</Select.Option>
              {territories.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={activeFilter}
              onChange={(val) => { setActiveFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={customers.map((item) => ({ ...item, key: item.id }))}
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalItems,
            showSizeChanger: true,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            style: { padding: '16px' },
          }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: '18px' }}>
            {editingCustomer ? 'Edit Customer' : 'Create New Customer'}
          </span>
        }
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        footer={null}
        width={640}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: '20px' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Customer Name"
                rules={[{ required: true, message: 'Please input customer name!' }]}
              >
                <Input placeholder="e.g. City Pharmacy" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactPerson" label="Contact Person">
                <Input placeholder="e.g. U Mya" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="e.g. 09-123456789" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email (optional)"
                rules={[
                  { type: 'email', message: 'Please enter a valid email!' },
                ]}
              >
                <Input placeholder="e.g. pharmacy@example.com" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          {!editingCustomer && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="Password (optional)"
                  rules={[
                    { min: 6, message: 'Password must be at least 6 characters' },
                  ]}
                  extra="Leave blank if customer portal login is not needed"
                >
                  <Input.Password placeholder="Customer login password" style={{ borderRadius: '8px' }} />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="city" label="City">
                <Input placeholder="e.g. Yangon" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="township" label="Township">
                <Input placeholder="e.g. Kamayut" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="region" label="Region">
                <Input placeholder="e.g. Yangon Region" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="district" label="District">
                <Input placeholder="e.g. West District" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="address" label="Address">
                <Input.TextArea placeholder="Full address" style={{ borderRadius: '8px' }} rows={2} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                <Select style={{ borderRadius: '8px' }}>
                  <Select.Option value="REGULAR">Regular</Select.Option>
                  <Select.Option value="VIP">VIP</Select.Option>
                  <Select.Option value="WHOLESALE">Wholesale</Select.Option>
                  <Select.Option value="DEALER">Dealer</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="mainChannelId" label="Main Channel">
                <Select
                  allowClear
                  placeholder="Select main channel"
                  style={{ borderRadius: '8px' }}
                  onChange={() => form.setFieldValue('subChannelId', undefined)}
                >
                  {mainChannels.map(mc => (
                    <Select.Option key={mc.id} value={mc.id}>{mc.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                noStyle
                shouldUpdate={(prev, curr) => prev.mainChannelId !== curr.mainChannelId}
              >
                {() => {
                  const selectedMainId = form.getFieldValue('mainChannelId');
                  const selectedMain = mainChannels.find(mc => mc.id === selectedMainId);
                  const subChannels = selectedMain ? selectedMain.subChannels : [];
                  return (
                    <Form.Item name="subChannelId" label="Sub Channel">
                      <Select
                        allowClear
                        placeholder="Select sub channel"
                        style={{ borderRadius: '8px' }}
                        disabled={!selectedMainId}
                      >
                        {subChannels.map((sc: any) => (
                          <Select.Option key={sc.id} value={sc.id}>{sc.name}</Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="territoryId" label="Territory">
                <Select
                  placeholder="Select territory"
                  allowClear
                  style={{ borderRadius: '8px' }}
                >
                  {territories.map((t) => (
                    <Select.Option key={t.id} value={t.id}>{t.name} ({t.region})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="branchId" label="Assigned Branch" tooltip="Limit this customer to orders from this branch">
                <Select
                  placeholder="All branches"
                  allowClear
                  style={{ borderRadius: '8px' }}
                >
                  {branches.map((b) => (
                    <Select.Option key={b.id} value={b.id}>{b.name} ({b.code})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="paymentTermDays" label="Payment Terms (Days)" normalize={(v) => v === '' ? undefined : Number(v)}>
                <InputNumber min={0} max={365} style={{ width: '100%', borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="creditLimit" label={`Credit Limit (${CURRENCY.symbol})`} normalize={(v) => v === '' ? undefined : Number(v)}>
                <InputNumber
                  min={0}
                  style={{ width: '100%', borderRadius: '8px' }}
                  placeholder="Credit limit amount"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="isActive" label="Active Status" valuePropName="checked">
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>Customer Details</span>}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={640}
        destroyOnHidden
      >
        {detailCustomer && (
          <Space orientation="vertical" size="middle" style={{ width: '100%', marginTop: '16px' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Code">
                <Text code strong>{detailCustomer.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Main Channel">
                {detailCustomer.mainChannel
                  ? <Tag color="geekblue" style={{ borderRadius: '8px', border: 'none' }}>{detailCustomer.mainChannel.name}</Tag>
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Name">{detailCustomer.name}</Descriptions.Item>
              <Descriptions.Item label="Contact Person">{detailCustomer.contactPerson || '—'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{detailCustomer.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailCustomer.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="City">{detailCustomer.city || '—'}</Descriptions.Item>
              <Descriptions.Item label="Township">{detailCustomer.township || '—'}</Descriptions.Item>
              <Descriptions.Item label="Region">{detailCustomer.region || '—'}</Descriptions.Item>
              <Descriptions.Item label="District">{detailCustomer.district || '—'}</Descriptions.Item>
              <Descriptions.Item label="Address" span={2}>{detailCustomer.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Badge status={detailCustomer.isActive ? 'success' : 'warning'} text={detailCustomer.isActive ? 'Active' : 'Pending Activation'} />
              </Descriptions.Item>
              <Descriptions.Item label="Submitted By / SR">
                {(() => {
                  const primarySR = detailCustomer.customerSalesReps?.find(csr => csr.isPrimary)?.salesRep || detailCustomer.customerSalesReps?.[0]?.salesRep;
                  if (!primarySR) return '—';
                  return `${primarySR.user?.firstName} ${primarySR.user?.lastName} (${primarySR.code})`;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Territory">
                {detailCustomer.territory
                  ? `${detailCustomer.territory.name} (${detailCustomer.territory.region})`
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Branch">
                {detailCustomer.branch
                  ? `${detailCustomer.branch.name} (${detailCustomer.branch.code})`
                  : 'All Branches'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Orders">{detailCustomer._count?.orders ?? 0}</Descriptions.Item>
            </Descriptions>

            {detailCustomer.creditLimit && (
              <Card size="small" title="Credit Information" style={{ borderRadius: '12px' }}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Credit Limit">
                    <Text strong>{detailCustomer.creditLimit.creditLimit.toLocaleString()} {CURRENCY.symbol}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Badge status={CREDIT_STATUS_COLORS[detailCustomer.creditLimit.status] || 'default'} />
                    <Text style={{ marginLeft: 6 }}>{detailCustomer.creditLimit.status.replace('_', ' ')}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Outstanding">
                    {detailCustomer.creditLimit.outstandingBalance.toLocaleString()} {CURRENCY.symbol}
                  </Descriptions.Item>
                  <Descriptions.Item label="Overdue">
                    <Text type="danger">
                      {detailCustomer.creditLimit.overdueAmount.toLocaleString()} {CURRENCY.symbol}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setDetailOpen(false)}>Close</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setDetailOpen(false);
                    openEditModal(detailCustomer);
                  }}
                >
                  Edit Customer
                </Button>
              </Space>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};
