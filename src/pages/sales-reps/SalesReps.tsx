import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Input, message, Select, Space, Table, Tag, Typography,
  Modal, Form, Switch, Row, Col, Popconfirm, Tooltip, Descriptions, Badge
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, EyeOutlined, PhoneOutlined, MailOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

interface BranchInfo {
  id: string;
  code: string;
  name: string;
}

interface TerritoryInfo {
  id: string;
  code: string;
  name: string;
  region: string;
}

interface SalesRepRecord {
  id: string;
  code: string;
  type: 'SR' | 'MSR';
  user: UserInfo;
  branch: BranchInfo;
  territory?: TerritoryInfo | null;
  isActive: boolean;
  _count: { orders: number; customerSalesReps: number };
}

export const SalesReps: React.FC = () => {
  // Loading & Data State
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SalesRepRecord[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [territories, setTerritories] = useState<TerritoryInfo[]>([]);
  
  // Pagination & Filters State
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRepRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Detail Modal State
  const [detailRecord, setDetailRecord] = useState<SalesRepRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch branches & territories once
  useEffect(() => {
    api.get('/branches').then(res => {
      if (res.data.success) setBranches(res.data.data);
    }).catch(() => {});
    
    api.get('/territories').then(res => {
      if (res.data.success) setTerritories(res.data.data);
    }).catch(() => {});
  }, []);

  // Fetch Sales Representatives
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales-reps', {
        params: {
          page,
          limit: pageSize,
          search: search || undefined,
          type: type || undefined,
          isActive: activeFilter !== 'all' ? String(activeFilter === 'active') : 'all',
        }
      });
      if (res.data.success) {
        setItems(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load sales representatives');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, type, activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Open Create Modal ----
  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'SR',
      isActive: true,
    });
    if (branches.length > 0) {
      form.setFieldValue('branchId', branches[0].id);
    }
    setIsModalOpen(true);
  };

  // ---- Open Edit Modal ----
  const handleEdit = (record: SalesRepRecord) => {
    setEditingRecord(record);
    form.setFieldsValue({
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      email: record.user.email,
      phone: record.user.phone || '',
      type: record.type,
      branchId: record.branch?.id || null,
      territoryId: record.territory?.id || null,
      isActive: record.isActive,
      password: '', // Leave blank unless changing
    });
    setIsModalOpen(true);
  };

  // ---- Submit Form ----
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      
      // Clean password field if empty
      const payload = { ...values };
      if (!payload.password) {
        delete payload.password;
      }

      if (editingRecord) {
        await api.put(`/sales-reps/${editingRecord.id}`, payload);
        message.success('Sales representative updated successfully');
      } else {
        await api.post('/sales-reps', payload);
        message.success('Sales representative created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete Sales Rep ----
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/sales-reps/${id}`);
      message.success('Sales representative deleted/deactivated successfully');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ---- View Details ----
  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/sales-reps/${id}`);
      if (res.data.success) {
        setDetailRecord(res.data.data);
        setDetailOpen(true);
      }
    } catch {
      message.error('Failed to load sales representative details');
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Sales Representatives</Title>
          <Text type="secondary">SR/MSR assignments, branch ownership, and activity</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ borderRadius: '12px' }}>
            Add Sales Rep
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: 20 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            placeholder="Search code or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
            style={{ width: 280, borderRadius: '12px' }}
          />
          <Select
            value={type || 'all'}
            style={{ width: 160, borderRadius: '12px' }}
            onChange={(v) => { setType(v === 'all' ? '' : v); setPage(1); }}
          >
            <Select.Option value="all">All Types</Select.Option>
            <Select.Option value="SR">SR</Select.Option>
            <Select.Option value="MSR">MSR</Select.Option>
          </Select>
          <Select
            value={activeFilter}
            style={{ width: 160, borderRadius: '12px' }}
            onChange={(v) => { setActiveFilter(v); setPage(1); }}
          >
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="active">Active Only</Select.Option>
            <Select.Option value="inactive">Inactive Only</Select.Option>
          </Select>
        </Space>
      </Card>

      {/* Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
        <Table
          loading={loading}
          dataSource={items.map((i) => ({ ...i, key: i.id }))}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => { setPage(p); setPageSize(s); },
            style: { padding: '16px' }
          }}
          columns={[
            {
              title: 'Code',
              dataIndex: 'code',
              width: 110,
              render: (v) => <Text code strong>{v}</Text>
            },
            {
              title: 'Name',
              render: (_, r) => (
                <div>
                  <Text strong style={{ color: '#111827' }}>{r.user.firstName} {r.user.lastName}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{r.user.email}</Text>
                </div>
              )
            },
            {
              title: 'Type',
              dataIndex: 'type',
              width: 100,
              render: (v) => <Tag color={v === 'MSR' ? 'purple' : 'blue'} style={{ borderRadius: 8, fontWeight: 600, border: 'none' }}>{v}</Tag>
            },
            {
              title: 'Branch',
              render: (_, r) => <Text>{r.branch?.name || '-'}</Text>
            },
            {
              title: 'Territory',
              render: (_, r) => <Text>{r.territory ? `${r.territory.name} (${r.territory.region})` : '-'}</Text>
            },
            {
              title: 'Customers',
              width: 110,
              render: (_, r) => <Badge count={r._count?.customerSalesReps ?? 0} showZero color="#6366F1" style={{ borderRadius: 6 }} />
            },
            {
              title: 'Orders',
              width: 100,
              render: (_, r) => <Badge count={r._count?.orders ?? 0} showZero color="#10B981" style={{ borderRadius: 6 }} />
            },
            {
              title: 'Status',
              width: 100,
              render: (_, r) => (
                <Tag color={r.isActive ? 'green' : 'red'} style={{ borderRadius: 8, border: 'none' }}>
                  {r.isActive ? 'Active' : 'Inactive'}
                </Tag>
              )
            },
            {
              title: 'Actions',
              width: 140,
              render: (_, r) => (
                <Space size="small">
                  <Tooltip title="View Details">
                    <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(r.id)} />
                  </Tooltip>
                  <Tooltip title="Edit">
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => handleEdit(r)} />
                  </Tooltip>
                  <Popconfirm
                    title="Delete this representative?"
                    description="Assigned orders will not be deleted. If they have active orders, they will be deactivated."
                    onConfirm={() => handleDelete(r.id)}
                    okText="Delete"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Delete">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              )
            }
          ]}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 18 }}>{editingRecord ? 'Edit Sales Representative' : 'Create Sales Representative'}</span>}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Please input first name!' }]}>
                <Input placeholder="e.g. John" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Please input last name!' }]}>
                <Input placeholder="e.g. Doe" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                label="Email (for login)"
                rules={[
                  { required: true, message: 'Please input email!' },
                  { type: 'email', message: 'Please enter a valid email!' }
                ]}
              >
                <Input placeholder="e.g. rep@example.com" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="e.g. 09-12345678" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="password"
                label={editingRecord ? 'Change Password' : 'Password'}
                rules={editingRecord ? [] : [{ required: true, message: 'Password is required!' }, { min: 6, message: 'Password must be at least 6 characters' }]}
              >
                <Input.Password placeholder={editingRecord ? 'Leave empty to keep current password' : 'Login password'} style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select style={{ borderRadius: '8px' }}>
                  <Select.Option value="SR">Sales Representative (SR)</Select.Option>
                  <Select.Option value="MSR">Medical Sales Rep (MSR)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="branchId" label="Branch" rules={[{ required: true, message: 'Please select a branch!' }]}>
                <Select placeholder="Select branch" style={{ borderRadius: '8px' }}>
                  {branches.map(b => (
                    <Select.Option key={b.id} value={b.id}>{b.name} ({b.code})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="territoryId" label="Territory">
                <Select placeholder="Select territory" allowClear style={{ borderRadius: '8px' }}>
                  {territories.map(t => (
                    <Select.Option key={t.id} value={t.id}>{t.name} ({t.region})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {editingRecord && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="isActive" label="Active Status" valuePropName="checked">
                  <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
              </Col>
            </Row>
          )}

          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: 12 }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Details Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: 18 }}>Sales Representative Details</span>}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        {detailRecord && (
          <Space orientation="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Code">
                <Text code strong>{detailRecord.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Type">
                <Tag color={detailRecord.type === 'MSR' ? 'purple' : 'blue'} style={{ borderRadius: 8, fontWeight: 600, border: 'none' }}>
                  {detailRecord.type}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="First Name">{detailRecord.user.firstName}</Descriptions.Item>
              <Descriptions.Item label="Last Name">{detailRecord.user.lastName}</Descriptions.Item>
              <Descriptions.Item label="Email" span={2}>
                <MailOutlined style={{ marginRight: 8, color: 'var(--text-secondary)' }} />
                {detailRecord.user.email}
              </Descriptions.Item>
              <Descriptions.Item label="Phone" span={2}>
                <PhoneOutlined style={{ marginRight: 8, color: 'var(--text-secondary)' }} />
                {detailRecord.user.phone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Branch">{detailRecord.branch?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Territory">
                {detailRecord.territory ? `${detailRecord.territory.name} (${detailRecord.territory.region})` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Total Orders">{detailRecord._count?.orders ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Assigned Customers">{detailRecord._count?.customerSalesReps ?? 0}</Descriptions.Item>
              <Descriptions.Item label="Status" span={2}>
                <Badge status={detailRecord.isActive ? 'success' : 'error'} text={detailRecord.isActive ? 'Active' : 'Inactive'} />
              </Descriptions.Item>
            </Descriptions>

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setDetailOpen(false)}>Close</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setDetailOpen(false);
                    handleEdit(detailRecord);
                  }}
                >
                  Edit Rep
                </Button>
              </Space>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};
