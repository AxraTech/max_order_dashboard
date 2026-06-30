import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Input, Select, Space, Row, Col,
  Button, Modal, Form, Switch, message, Popconfirm, Tooltip, Descriptions,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined,
  DeleteOutlined, PhoneOutlined, MailOutlined, UserOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

interface SupplierRecord {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const Suppliers: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Detail Modal
  const [detailSupplier, setDetailSupplier] = useState<SupplierRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch suppliers
  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/suppliers', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          isActive: activeFilter !== 'all' ? String(activeFilter === 'active') : undefined,
        },
      });
      if (res.data.success) {
        setSuppliers(res.data.data);
        setTotalItems(res.data.meta?.total || 0);
      }
    } catch {
      message.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, activeFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // ---- Create / Edit ----
  const openCreateModal = () => {
    setEditingSupplier(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: SupplierRecord) => {
    setEditingSupplier(record);
    form.setFieldsValue({
      name: record.name,
      contactPerson: record.contactPerson,
      phone: record.phone,
      email: record.email,
      address: record.address,
      isActive: record.isActive,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, values);
        message.success('Supplier updated successfully');
      } else {
        await api.post('/suppliers', values);
        message.success('Supplier created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchSuppliers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/suppliers/${id}`);
      message.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch {
      message.error('Failed to delete supplier');
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/suppliers/${id}`);
      if (res.data.success) {
        setDetailSupplier(res.data.data);
        setDetailOpen(true);
      }
    } catch {
      message.error('Failed to load supplier details');
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (text: string) => <Text code style={{ fontWeight: 600 }}>{text}</Text>,
    },
    {
      title: 'Supplier Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Contact Person',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (text: string | null) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (text: string | null) => text ? (
        <Space>
          <PhoneOutlined style={{ color: 'var(--text-secondary)' }} />
          <span>{text}</span>
        </Space>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (text: string | null) => text ? (
        <Space>
          <MailOutlined style={{ color: 'var(--text-secondary)' }} />
          <a href={`mailto:${text}`} style={{ color: 'inherit' }}>{text}</a>
        </Space>
      ) : <Text type="secondary">-</Text>,
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_: any, record: SupplierRecord) => (
        <Tag color={record.isActive ? 'green' : 'red'} style={{ borderRadius: '8px', border: 'none' }}>
          {record.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: any, record: SupplierRecord) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.id)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this supplier?"
            description="Are you sure you want to delete this supplier?"
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
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Suppliers</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          style={{ borderRadius: '12px' }}
        >
          Add Supplier
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card" style={{ marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={16}>
            <Input
              placeholder="Search by supplier name, code, or contact person..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={activeFilter}
              onChange={(val) => { setActiveFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Statuses</Select.Option>
              <Select.Option value="active">Active Only</Select.Option>
              <Select.Option value="inactive">Inactive Only</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Suppliers Table */}
      <Card className="glass-card" style={{ border: '1px solid var(--glass-border)' }}>
        <Table
          columns={columns}
          dataSource={suppliers.map((item) => ({ ...item, key: item.id }))}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalItems,
            showSizeChanger: true,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            style: { marginTop: '16px' },
          }}
          size="middle"
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnClose
        styles={{ body: { paddingTop: '12px' } }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          initialValues={{ isActive: true }}
        >
          <Form.Item
            name="name"
            label="Supplier Name"
            rules={[{ required: true, message: 'Please enter supplier name' }]}
          >
            <Input placeholder="Enter supplier name" prefix={<UserOutlined style={{ color: 'var(--text-secondary)' }} />} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contactPerson"
                label="Contact Person"
              >
                <Input placeholder="Enter contact name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                label="Phone Number"
              >
                <Input placeholder="Enter phone number" prefix={<PhoneOutlined style={{ color: 'var(--text-secondary)' }} />} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input placeholder="Enter email address" prefix={<MailOutlined style={{ color: 'var(--text-secondary)' }} />} />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
          >
            <Input.TextArea placeholder="Enter office/warehouse address" rows={3} style={{ borderRadius: '12px' }} />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Status"
            valuePropName="checked"
          >
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingSupplier ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        title="Supplier Details"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailOpen(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {detailSupplier && (
          <Descriptions bordered column={1} size="middle" style={{ marginTop: '16px' }}>
            <Descriptions.Item label="Code">
              <Text code style={{ fontWeight: 600 }}>{detailSupplier.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Supplier Name">
              <Text strong>{detailSupplier.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Contact Person">
              {detailSupplier.contactPerson || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Phone Number">
              {detailSupplier.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Email Address">
              {detailSupplier.email ? <a href={`mailto:${detailSupplier.email}`}>{detailSupplier.email}</a> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Address">
              {detailSupplier.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={detailSupplier.isActive ? 'green' : 'red'}>
                {detailSupplier.isActive ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(detailSupplier.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {new Date(detailSupplier.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};
