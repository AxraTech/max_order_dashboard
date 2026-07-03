import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Input, Space, Row, Col, Button, Modal, Form, message, Tooltip, Popconfirm } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { useAdminBranchStore } from '../../store/branch.store';

const { Title, Text } = Typography;

interface BranchItem {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  _count?: {
    users: number;
    warehouses: number;
    orders: number;
  };
}

export const Branches: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [search, setSearch] = useState('');
  const { setBranchCount } = useAdminBranchStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [wiping, setWiping] = useState(false);

  const handleWipeBranches = async () => {
    try {
      setWiping(true);
      const res = await api.delete('/branches/clear');
      if (res.data.success) {
        message.success('All branch records and related system data successfully wiped!');
        fetchBranches();
      }
    } catch (err: any) {
      console.error('Wipe failed:', err);
      message.error(err.response?.data?.message || 'Failed to wipe branches data');
    } finally {
      setWiping(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const res = await api.get('/branches');
      if (res.data.success) {
        setBranches(res.data.data);
        // Keep sidebar badge in sync
        const activeCount = res.data.data.filter((b: BranchItem) => b.isActive).length;
        setBranchCount(activeCount);
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error);
      message.error('Failed to fetch branches data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingBranch(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record: BranchItem) => {
    setEditingBranch(record);
    form.setFieldsValue({
      name: record.name,
      address: record.address,
      phone: record.phone,
      email: record.email,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingBranch) {
        // Edit Branch
        const res = await api.put(`/branches/${editingBranch.id}`, values);
        if (res.data.success) {
          message.success('Branch updated successfully');
          setIsModalOpen(false);
          fetchBranches();
        }
      } else {
        // Add Branch
        const res = await api.post('/branches', values);
        if (res.data.success) {
          message.success('Branch created successfully');
          setIsModalOpen(false);
          fetchBranches();
        }
      }
    } catch (error: any) {
      console.error('Failed to save branch:', error);
      message.error(error.response?.data?.message || 'Failed to save branch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.patch(`/branches/${id}/deactivate`);
      if (res.data.success) {
        message.success('Branch deactivated successfully');
        fetchBranches();
      }
    } catch (error: any) {
      console.error('Failed to deactivate branch:', error);
      message.error(error.response?.data?.message || 'Failed to deactivate branch');
    } finally {
      setLoading(false);
    }
  };

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase()) ||
    (b.address && b.address.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      title: 'Branch Code',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => <Text code style={{ fontWeight: 600 }}>{code}</Text>,
      width: 140,
    },
    {
      title: 'Branch Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EnvironmentOutlined style={{ color: 'var(--primary-color)' }} />
          {name}
        </span>
      ),
    },
    {
      title: 'Contact Details',
      key: 'contact',
      render: (_: any, record: BranchItem) => (
        <Space orientation="vertical" size={2}>
          {record.phone && <Text style={{ fontSize: '13px' }}>📞 {record.phone}</Text>}
          {record.email && <Text type="secondary" style={{ fontSize: '12px' }}>✉️ {record.email}</Text>}
          {!record.phone && !record.email && <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '12px' }}>No contact</Text>}
        </Space>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      render: (address: string | null) => address || <Text type="secondary" style={{ fontStyle: 'italic', fontSize: '12px' }}>No address listed</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'} style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>
          {isActive ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
      width: 120,
    },
    {
      title: 'Assigned Entities',
      key: 'entities',
      render: (_: any, record: BranchItem) => (
        <Space size={12}>
          <Tooltip title="Warehouses">
            <Tag color="blue" style={{ borderRadius: '8px', border: 'none' }}>🏢 WH: {record._count?.warehouses || 0}</Tag>
          </Tooltip>
          <Tooltip title="Branch Staff / Users">
            <Tag color="cyan" style={{ borderRadius: '8px', border: 'none' }}>👥 Users: {record._count?.users || 0}</Tag>
          </Tooltip>
          <Tooltip title="Processed Orders">
            <Tag color="orange" style={{ borderRadius: '8px', border: 'none' }}>📦 Orders: {record._count?.orders || 0}</Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: BranchItem) => (
        <Space>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleOpenEditModal(record)} 
            style={{ color: '#4F46E5' }}
          />
          {record.isActive && (
            <Popconfirm
              title="Deactivate branch?"
              description="Are you sure you want to deactivate this branch? This will hide it from catalogs."
              onConfirm={() => handleDeactivate(record.id)}
              okText="Deactivate"
              cancelText="Cancel"
              okButtonProps={{ danger: true }}
            >
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
              />
            </Popconfirm>
          )}
        </Space>
      ),
      width: 100,
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Branch Management</Title>
        <Space>
          <Popconfirm
            title="Wipe All Branches?"
            description="Warning: Wiping branches resets all branch setups, staff profiles, warehouse records, stock levels, orders, and invoices. Super Admin accounts remain active. This cannot be undone."
            onConfirm={handleWipeBranches}
            okText="Yes, Wipe"
            cancelText="Cancel"
            okButtonProps={{ danger: true, loading: wiping }}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              style={{ borderRadius: '12px' }}
            >
              Wipe Branches
            </Button>
          </Popconfirm>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleOpenAddModal}
            style={{ borderRadius: '12px' }}
          >
            Create Branch
          </Button>
        </Space>
      </div>

      {/* Search Filter */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Row>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search branches by code, name, address..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* Branches Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={filteredBranches.map(b => ({ ...b, key: b.id }))}
          loading={loading}
          pagination={{
            showSizeChanger: true,
            style: { padding: '16px' },
          }}
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>{editingBranch ? 'Edit Branch Details' : 'Create New Branch'}</span>}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={null}
        width={500}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="name"
            label="Branch Name"
            rules={[{ required: true, message: 'Please input branch name!' }]}
          >
            <Input placeholder="e.g. Taunggyi Branch" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[{ type: 'email', message: 'Please input a valid email!' }]}
          >
            <Input placeholder="e.g. taunggyi@maxorder.com" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
          >
            <Input placeholder="e.g. 09-456789012" style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item
            name="address"
            label="Street Address"
          >
            <Input.TextArea rows={3} placeholder="Full address details..." style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Submit</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
