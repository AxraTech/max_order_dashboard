import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Input, Space, Row, Col,
  Button, Modal, Form, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

interface CategoryRecord {
  id: string;
  name: string;
  description: string | null;
  _count?: {
    products: number;
  };
  createdAt: string;
  updatedAt: string;
}

export const Categories: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [search, setSearch] = useState('');

  // Create/Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/products/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch {
      message.error('Failed to load product categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Form submit handler
  const handleFormSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      if (editingCategory) {
        // Edit Category
        const res = await api.put(`/products/categories/${editingCategory.id}`, values);
        if (res.data.success) {
          message.success('Category updated successfully');
          setIsModalOpen(false);
          fetchCategories();
        }
      } else {
        // Create Category
        const res = await api.post('/products/categories', values);
        if (res.data.success) {
          message.success('Category created successfully');
          setIsModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (record: CategoryRecord) => {
    setEditingCategory(record);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/products/categories/${id}`);
      if (res.data.success) {
        message.success('Category deleted successfully');
        fetchCategories();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  // Filter list locally by search keyword
  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase()) ||
    (cat.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Category Name',
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
      render: (_: any, r: CategoryRecord) => (
        <span style={{ fontWeight: 600 }}>{r._count?.products || 0} products</span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (_: any, r: CategoryRecord) => (
        <Space size={12}>
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#0284c7' }} />}
            onClick={() => openEditModal(r)}
          />
          <Popconfirm
            title="Delete Category?"
            description="Are you sure you want to delete this category? Associated products must be re-categorized first."
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
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Product Categories</Title>
          <Text type="secondary">Manage medicine classifications and categories for products mapping</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          style={{ borderRadius: '12px', height: '40px', display: 'flex', alignItems: 'center', fontWeight: 600 }}
        >
          Add Category
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
          dataSource={filteredCategories.map((c, idx) => ({ ...c, key: c.id || idx }))}
          loading={loading}
          pagination={{ pageSize: 15 }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AppstoreOutlined style={{ fontSize: '20px', color: 'var(--primary-color)' }} />
            <span style={{ fontWeight: 700 }}>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText={editingCategory ? 'Save Changes' : 'Create'}
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
            label="Category Name"
            rules={[
              { required: true, message: 'Please enter a name' },
              { min: 2, message: 'Name must be at least 2 characters' }
            ]}
          >
            <Input placeholder="e.g. Pharmaceuticals, Medical Devices" style={{ borderRadius: '8px' }} />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description (Optional)"
          >
            <Input.TextArea 
              placeholder="Enter category details..." 
              rows={3} 
              style={{ borderRadius: '8px' }} 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
