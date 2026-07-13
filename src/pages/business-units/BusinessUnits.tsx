import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Input, Space, Row, Col,
  Button, Modal, Form, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DatabaseOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

interface BusinessUnitRecord {
  id: string;
  name: string;
  description: string | null;
  _count?: {
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const BusinessUnits: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<BusinessUnitRecord[]>([]);
  const [search, setSearch] = useState('');

  // Create/Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<BusinessUnitRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Fetch Business Units
  const fetchUnits = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/business-units');
      if (res.data.success) {
        setUnits(res.data.data);
      }
    } catch {
      message.error('Failed to load business units');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  // Form submit handler
  const handleFormSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingUnit) {
        // Edit Business Unit
        const res = await api.put(`/products/business-units/${editingUnit.id}`, values);
        if (res.data.success) {
          message.success('Business Unit updated successfully');
          setIsModalOpen(false);
          fetchUnits();
        }
      } else {
        // Create Business Unit
        const res = await api.post('/products/business-units', values);
        if (res.data.success) {
          message.success('Business Unit created successfully');
          setIsModalOpen(false);
          fetchUnits();
        }
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save business unit');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingUnit(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (record: BusinessUnitRecord) => {
    setEditingUnit(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/products/business-units/${id}`);
      if (res.data.success) {
        message.success('Business Unit deleted successfully');
        fetchUnits();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete business unit');
    }
  };

  // Filter list locally by search keyword
  const filteredUnits = units.filter(unit => 
    unit.name.toLowerCase().includes(search.toLowerCase()) ||
    (unit.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Business Unit Name',
      dataIndex: 'name',
      key: 'name',
      width: '30%',
      render: (v: string) => <Text strong style={{ color: 'var(--primary-color)' }}>{v}</Text>
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: '40%',
      render: (v: string) => <Text type="secondary">{v || '—'}</Text>
    },
    {
      title: 'Linked Products',
      key: 'productsCount',
      width: '15%',
      render: (_: any, r: BusinessUnitRecord) => (
        <span style={{ fontWeight: 600 }}>{r._count?.products || 0} products</span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (_: any, r: BusinessUnitRecord) => (
        <Space size={12}>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#0284c7' }} />}
            onClick={() => openEditModal(r)}
          />
          <Popconfirm
            title="Delete Business Unit?"
            description="Are you sure you want to delete this business unit? Associated products will have their business unit set to empty."
            onConfirm={() => handleDelete(r.id)}
            okText="Yes, Delete"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Business Units</Title>
          <Text type="secondary">Manage divisions and business units for products mapping</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          style={{ borderRadius: '12px', height: '40px', display: 'flex', alignItems: 'center', fontWeight: 600 }}
        >
          Add Business Unit
        </Button>
      </div>

      {/* Toolbar */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by name or description..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* Main Grid */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={filteredUnits.map((u, idx) => ({ ...u, key: u.id || idx }))}
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DatabaseOutlined style={{ fontSize: '20px', color: 'var(--primary-color)' }} />
            <span style={{ fontWeight: 700 }}>
              {editingUnit ? 'Edit Business Unit' : 'Create Business Unit'}
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText={editingUnit ? 'Save Changes' : 'Create'}
        centered
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="name"
            label="Business Unit Name"
            rules={[
              { required: true, message: 'Please enter a name' },
              { min: 2, message: 'Name must be at least 2 characters' }
            ]}
          >
            <Input placeholder="e.g. CPD, G1, HOVID" style={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea 
              placeholder="Enter unit details or division scope..." 
              rows={3} 
              style={{ borderRadius: '8px' }} 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
