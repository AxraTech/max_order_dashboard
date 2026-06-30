import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Input, message, Select, Space, Table, Tag, Typography,
  Modal, Form, Switch, Row, Col, Popconfirm, Tooltip, Descriptions, Badge
} from 'antd';
import {
  ReloadOutlined, SearchOutlined, PlusOutlined, EditOutlined,
  DeleteOutlined, EyeOutlined, TeamOutlined
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

interface SalesRepInfo {
  id: string;
  code: string;
  user: UserInfo;
}

interface SalesTeamRecord {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  branch: { id: string; name: string; code: string };
  leader?: SalesRepInfo | null;
  _count: { members: number };
  createdAt: string;
  updatedAt: string;
}

interface BranchInfo {
  id: string;
  code: string;
  name: string;
}

export const SalesTeams: React.FC = () => {
  // Loading & Data State
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SalesTeamRecord[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRepInfo[]>([]);
  const [repsLoading, setRepsLoading] = useState(false);

  // Pagination & Filters State
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesTeamRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  // Watch branchId selection in form to fetch representative list dynamically
  const selectedBranchId = Form.useWatch('branchId', form);

  // Detail Modal State
  const [detailRecord, setDetailRecord] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch branches once
  useEffect(() => {
    api.get('/branches').then(res => {
      if (res.data.success) setBranches(res.data.data);
    }).catch(() => {});
  }, []);

  // Fetch sales representatives when branch changes in form
  useEffect(() => {
    if (selectedBranchId) {
      setRepsLoading(true);
      api.get('/sales-reps', { params: { branchId: selectedBranchId, limit: 100 } })
        .then(res => {
          if (res.data.success) {
            setSalesReps(res.data.data);
          }
        })
        .catch(() => {
          message.error('Failed to load representatives for selected branch');
        })
        .finally(() => {
          setRepsLoading(false);
        });
    } else {
      setSalesReps([]);
    }
  }, [selectedBranchId]);

  // Fetch Sales Teams
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales-teams', {
        params: {
          page,
          limit: pageSize,
          search: search || undefined,
          branchId: branchFilter || undefined,
          isActive: activeFilter !== 'all' ? String(activeFilter === 'active') : 'all',
        }
      });
      if (res.data.success) {
        setItems(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load sales teams');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, branchFilter, activeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Open Create Modal ----
  const handleCreate = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      memberIds: [],
    });
    if (branches.length > 0) {
      form.setFieldValue('branchId', branches[0].id);
    }
    setIsModalOpen(true);
  };

  // ---- Open Edit Modal ----
  const handleEdit = async (record: SalesTeamRecord) => {
    try {
      setLoading(true);
      // Fetch details to get all member IDs
      const res = await api.get(`/sales-teams/${record.id}`);
      if (res.data.success) {
        const fullDetails = res.data.data;
        setEditingRecord(record);
        form.setFieldsValue({
          name: fullDetails.name,
          description: fullDetails.description || '',
          branchId: fullDetails.branchId || fullDetails.branch?.id,
          leaderId: fullDetails.leaderId || null,
          memberIds: fullDetails.members?.map((m: any) => m.id) || [],
          isActive: fullDetails.isActive,
        });
        setIsModalOpen(true);
      }
    } catch (err: any) {
      message.error('Failed to load team details for edit');
    } finally {
      setLoading(false);
    }
  };

  // ---- Submit Form ----
  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingRecord) {
        await api.put(`/sales-teams/${editingRecord.id}`, values);
        message.success('Sales team updated successfully');
      } else {
        await api.post('/sales-teams', values);
        message.success('Sales team created successfully');
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

  // ---- Delete Sales Team ----
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/sales-teams/${id}`);
      message.success('Sales team disbanded successfully');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete sales team');
    }
  };

  // ---- View Details ----
  const handleViewDetail = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/sales-teams/${id}`);
      if (res.data.success) {
        setDetailRecord(res.data.data);
        setDetailOpen(true);
      }
    } catch {
      message.error('Failed to load sales team details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Sales Teams</Title>
          <Text type="secondary">Organize representatives into teams, assign leaders, and manage branches</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ borderRadius: '12px' }}>
            Add Sales Team
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
            value={branchFilter || 'all'}
            style={{ width: 200, borderRadius: '12px' }}
            onChange={(v) => { setBranchFilter(v === 'all' ? '' : v); setPage(1); }}
          >
            <Select.Option value="all">All Branches</Select.Option>
            {branches.map(b => (
              <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
            ))}
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
              title: 'Team Name',
              dataIndex: 'name',
              render: (v, r) => (
                <div>
                  <Text strong style={{ color: '#111827' }}>{v}</Text>
                  {r.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.description}</div>}
                </div>
              )
            },
            {
              title: 'Branch',
              render: (_, r) => <Text>{r.branch?.name || '-'}</Text>
            },
            {
              title: 'Team Leader',
              render: (_, r) => r.leader ? (
                <Text strong>{r.leader.user.firstName} {r.leader.user.lastName}</Text>
              ) : (
                <Text type="secondary" italic>No Leader</Text>
              )
            },
            {
              title: 'Members Count',
              width: 130,
              render: (_, r) => <Badge count={r._count?.members ?? 0} showZero color="#4F46E5" style={{ borderRadius: 6 }} />
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
                    title="Disband this sales team?"
                    description="All team members will be disassociated. This action cannot be undone."
                    onConfirm={() => handleDelete(r.id)}
                    okText="Disband"
                    okButtonProps={{ danger: true }}
                  >
                    <Tooltip title="Disband">
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
        title={<span style={{ fontWeight: 700, fontSize: 18 }}>{editingRecord ? 'Edit Sales Team' : 'Create Sales Team'}</span>}
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        footer={null}
        width={640}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 20 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="name" label="Team Name" rules={[{ required: true, message: 'Please input team name!' }]}>
                <Input placeholder="e.g. Yangon Alpha Team" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={2} placeholder="Optional team description..." style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item name="branchId" label="Branch" rules={[{ required: true, message: 'Please select a branch!' }]}>
                <Select
                  placeholder="Select branch"
                  style={{ borderRadius: '8px' }}
                  disabled={!!editingRecord}
                  onChange={() => {
                    // Reset leader and members when branch changes
                    form.setFieldsValue({ leaderId: null, memberIds: [] });
                  }}
                >
                  {branches.map(b => (
                    <Select.Option key={b.id} value={b.id}>{b.name} ({b.code})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="leaderId"
                label="Team Leader"
                help={!selectedBranchId ? "Please select a branch first to see available representatives" : undefined}
              >
                <Select
                  placeholder="Select leader (optional)"
                  allowClear
                  style={{ borderRadius: '8px' }}
                  disabled={!selectedBranchId || repsLoading}
                  loading={repsLoading}
                >
                  {salesReps.map(sr => (
                    <Select.Option key={sr.id} value={sr.id}>
                      {sr.user.firstName} {sr.user.lastName} ({sr.code})
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="memberIds"
                label="Team Members"
                help={!selectedBranchId ? "Please select a branch first to see available representatives" : undefined}
              >
                <Select
                  mode="multiple"
                  placeholder="Select team members (optional)"
                  style={{ borderRadius: '8px' }}
                  disabled={!selectedBranchId || repsLoading}
                  loading={repsLoading}
                  optionFilterProp="children"
                >
                  {salesReps.map(sr => (
                    <Select.Option key={sr.id} value={sr.id}>
                      {sr.user.firstName} {sr.user.lastName} ({sr.code})
                    </Select.Option>
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
        title={<span style={{ fontWeight: 700, fontSize: 18 }}>Sales Team Details</span>}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        {detailRecord && (
          <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 16 }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Team Code">
                <Text code strong>{detailRecord.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Team Name">{detailRecord.name}</Descriptions.Item>
              <Descriptions.Item label="Branch">{detailRecord.branch?.name || '—'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={detailRecord.isActive ? 'success' : 'error'} text={detailRecord.isActive ? 'Active' : 'Inactive'} />
              </Descriptions.Item>
              <Descriptions.Item label="Team Leader" span={2}>
                {detailRecord.leader ? (
                  <div>
                    <Text strong>{detailRecord.leader.user.firstName} {detailRecord.leader.user.lastName}</Text>
                    <Text type="secondary" style={{ marginLeft: 8 }}>({detailRecord.leader.code})</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{detailRecord.leader.user.email} {detailRecord.leader.user.phone ? `| ${detailRecord.leader.user.phone}` : ''}</Text>
                  </div>
                ) : (
                  <Text type="secondary" italic>No Leader Assigned</Text>
                )}
              </Descriptions.Item>
              {detailRecord.description && (
                <Descriptions.Item label="Description" span={2}>
                  {detailRecord.description}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div>
              <Title level={5} style={{ margin: '8px 0' }}>
                <TeamOutlined style={{ marginRight: 8 }} />
                Team Members ({detailRecord.members?.length || 0})
              </Title>
              {detailRecord.members && detailRecord.members.length > 0 ? (
                <Table
                  dataSource={detailRecord.members.map((m: any) => ({ ...m, key: m.id }))}
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: 'Code',
                      dataIndex: 'code',
                      render: (v: any) => <Text code>{v}</Text>
                    },
                    {
                      title: 'Name',
                      render: (_, m: any) => <Text strong>{m.user.firstName} {m.user.lastName}</Text>
                    },
                    {
                      title: 'Territory',
                      render: (_, m: any) => m.territory ? `${m.territory.name} (${m.territory.region})` : '—'
                    },
                    {
                      title: 'Phone',
                      render: (_, m: any) => m.user.phone || '—'
                    }
                  ]}
                />
              ) : (
                <Card style={{ textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderStyle: 'dashed' }}>
                  <Text type="secondary" italic>No members in this team yet.</Text>
                </Card>
              )}
            </div>

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
                  Edit Team
                </Button>
              </Space>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};
