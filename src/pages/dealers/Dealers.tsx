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

interface DealerRecord {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  region: string | null;
  city: string | null;
  township: string | null;
  channel: string | null;
  channelDescription: string | null;
  groupName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const Dealers: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dealers, setDealers] = useState<DealerRecord[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<DealerRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Detail Modal
  const [detailDealer, setDetailDealer] = useState<DealerRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch dealers
  const fetchDealers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/dealers', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          isActive: activeFilter !== 'all' ? String(activeFilter === 'active') : undefined,
        },
      });
      if (res.data.success) {
        // Dealers backend route might return raw list, let's paginate safely
        const rawData = res.data.data;
        if (Array.isArray(rawData)) {
          setDealers(rawData);
          setTotalItems(rawData.length);
        } else {
          setDealers(rawData.data || []);
          setTotalItems(res.data.meta?.total || rawData.data?.length || 0);
        }
      }
    } catch {
      message.error('Failed to load dealers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, activeFilter]);

  useEffect(() => {
    fetchDealers();
  }, [fetchDealers]);

  // ---- Create / Edit ----
  const openCreateModal = () => {
    setEditingDealer(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: DealerRecord) => {
    setEditingDealer(record);
    form.setFieldsValue({
      name: record.name,
      contactPerson: record.contactPerson,
      phone: record.phone,
      email: record.email,
      address: record.address,
      region: record.region,
      city: record.city,
      township: record.township,
      channel: record.channel,
      channelDescription: record.channelDescription,
      groupName: record.groupName,
      isActive: record.isActive,
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingDealer) {
        await api.put(`/dealers/${editingDealer.id}`, values);
        message.success('Dealer updated successfully');
      } else {
        await api.post('/dealers', values);
        message.success('Dealer created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchDealers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save dealer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/dealers/${id}`);
      message.success('Dealer deleted successfully');
      fetchDealers();
    } catch {
      message.error('Failed to delete dealer');
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/dealers/${id}`);
      if (res.data.success) {
        setDetailDealer(res.data.data);
        setDetailOpen(true);
      }
    } catch {
      message.error('Failed to load dealer details');
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
      title: 'Dealer Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Region',
      dataIndex: 'region',
      key: 'region',
      render: (text: string | null) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'City',
      dataIndex: 'city',
      key: 'city',
      render: (text: string | null) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Township',
      dataIndex: 'township',
      key: 'township',
      render: (text: string | null) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (text: string | null) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Channel Description',
      dataIndex: 'channelDescription',
      key: 'channelDescription',
      render: (text: string | null) => text || <Text type="secondary">-</Text>,
    },
    {
      title: 'Customer Group Name',
      dataIndex: 'groupName',
      key: 'groupName',
      render: (text: string | null) => text || <Text type="secondary">-</Text>,
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
      render: (_: any, record: DealerRecord) => (
        <Tag color={record.isActive ? 'green' : 'red'} style={{ borderRadius: '8px', border: 'none' }}>
          {record.isActive ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: any, record: DealerRecord) => (
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
            title="Delete this dealer?"
            description="Are you sure you want to delete this dealer?"
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
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Dealers</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          style={{ borderRadius: '12px' }}
        >
          Add Dealer
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card" style={{ marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={16}>
            <Input
              placeholder="Search by dealer name, code, or contact person..."
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

      {/* Dealers Table */}
      <Card className="glass-card" style={{ border: '1px solid var(--glass-border)' }}>
        <Table
          columns={columns}
          dataSource={dealers.map((item) => ({ ...item, key: item.id }))}
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
        title={editingDealer ? 'Edit Dealer' : 'Add Dealer'}
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
            label="Dealer Name"
            rules={[{ required: true, message: 'Please enter dealer name' }]}
          >
            <Input placeholder="Enter dealer name" prefix={<UserOutlined style={{ color: 'var(--text-secondary)' }} />} />
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="region"
                label="Region"
              >
                <Input placeholder="e.g. Lower" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="city"
                label="City"
              >
                <Input placeholder="e.g. Bago" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="township"
                label="Township"
              >
                <Input placeholder="e.g. Bago" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="groupName"
                label="Group Name"
              >
                <Input placeholder="e.g. Partner Channel" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="channel"
                label="Channel"
              >
                <Input placeholder="e.g. Partner Channel" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="channelDescription"
                label="Channel Description"
              >
                <Input placeholder="e.g. Partner Channel" />
              </Form.Item>
            </Col>
          </Row>

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
                {editingDealer ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail View Modal */}
      <Modal
        title="Dealer Details"
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailOpen(false)}>
            Close
          </Button>
        ]}
        width={600}
      >
        {detailDealer && (
          <Descriptions bordered column={1} size="middle" style={{ marginTop: '16px' }}>
            <Descriptions.Item label="Code">
              <Text code style={{ fontWeight: 600 }}>{detailDealer.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Dealer Name">
              <Text strong>{detailDealer.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Contact Person">
              {detailDealer.contactPerson || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Phone Number">
              {detailDealer.phone || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Email Address">
              {detailDealer.email ? <a href={`mailto:${detailDealer.email}`}>{detailDealer.email}</a> : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Address">
              {detailDealer.address || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Region">
              {detailDealer.region || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="City">
              {detailDealer.city || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Township">
              {detailDealer.township || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Channel">
              {detailDealer.channel || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Channel Description">
              {detailDealer.channelDescription || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Group Name">
              {detailDealer.groupName || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={detailDealer.isActive ? 'green' : 'red'}>
                {detailDealer.isActive ? 'Active' : 'Inactive'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Created At">
              {new Date(detailDealer.createdAt).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Last Updated">
              {new Date(detailDealer.updatedAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};
