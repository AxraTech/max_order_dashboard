import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Input, Select, Space, Row, Col, Tooltip, Button, Modal, Form, InputNumber, Switch, message, Popconfirm } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined, ExperimentOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx-js-style';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import { useAuthStore } from '../../store/auth.store';

const { Title, Text } = Typography;

interface CategoryInfo {
  id: string;
  name: string;
}

interface ProductItem {
  id: string;
  code: string;
  name: string;
  sku: string;
  uom: string;
  basePrice: number;
  sellingPrice: number;
  dealerPrice: number;
  genericName: string | null;
  brandName: string | null;
  dosageForm: string | null;
  isScheduled: boolean;
  isControlled: boolean;
  storageConditions: string | null;
  category: CategoryInfo;
  team: string | null;
  expiryAlertThreshold: number;
}

export const Products: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role?.name === 'SUPER_ADMIN';
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const handleExportProducts = async () => {
    try {
      message.loading({ content: 'Exporting products...', key: 'exportProducts' });
      const res = await api.get('/products', {
        params: {
          page: 1,
          limit: 5000,
          search: search || undefined,
          categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
          team: selectedTeam === 'all' ? undefined : selectedTeam,
        },
      });
      if (!res.data.success || res.data.data.length === 0) {
        message.warning({ content: 'No products to export', key: 'exportProducts' });
        return;
      }
      
      const list = res.data.data;
      const data = list.map((p: any) => ({
        'Product Code': p.code,
        'SKU': p.sku,
        'Product Name': p.name,
        'Brand Name': p.brandName || '—',
        'Generic Name': p.genericName || '—',
        'Category': p.category.name,
        'Team': p.team || '—',
        'Dosage Form': p.dosageForm || '—',
        'Selling Price (MMK)': Number(p.sellingPrice),
        'Dealer Price (MMK)': Number(p.dealerPrice),
        'Base Price (MMK)': Number(p.basePrice),
        'Unit (UOM)': p.uom,
        'Storage Conditions': p.storageConditions || '—',
        'Scheduled Drug': p.isScheduled ? 'Yes' : 'No',
        'Controlled Drug': p.isControlled ? 'Yes' : 'No',
      }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Products');
      XLSX.writeFile(wb, 'Product_List.xlsx');
      message.success({ content: 'Products exported successfully!', key: 'exportProducts' });
    } catch (err) {
      console.error('Export failed:', err);
      message.error({ content: 'Failed to export products', key: 'exportProducts' });
    }
  };

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, selectedTeam, currentPage, pageSize]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/products', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          categoryId: selectedCategory === 'all' ? undefined : selectedCategory,
          team: selectedTeam === 'all' ? undefined : selectedTeam,
        },
      });
      if (res.data.success) {
        setProducts(res.data.data);
        setTotalItems(res.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (values: any) => {
    try {
      setSubmitting(true);
      const postData = { ...values };

      let res;
      if (editingProduct) {
        res = await api.put(`/products/${editingProduct.id}`, postData);
        message.success('Product updated successfully');
      } else {
        res = await api.post('/products', postData);
        message.success('Product created successfully');
      }

      if (res.data.success) {
        setIsModalOpen(false);
        setEditingProduct(null);
        form.resetFields();
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Failed to save product:', error);
      message.error(error.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (record: ProductItem) => {
    setEditingProduct(record);
    form.setFieldsValue({
      name: record.name,
      sku: record.sku,
      brandName: record.brandName,
      genericName: record.genericName,
      categoryId: record.category.id,
      team: record.team || null,
      dosageForm: record.dosageForm,
      basePrice: record.basePrice,
      sellingPrice: record.sellingPrice,
      dealerPrice: record.dealerPrice,
      uom: record.uom,
      storageConditions: record.storageConditions,
      isScheduled: record.isScheduled,
      isControlled: record.isControlled,
      expiryAlertThreshold: record.expiryAlertThreshold,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      message.success('Product deleted');
      fetchProducts();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const columns = [
    {
      title: 'Code & SKU',
      key: 'code_sku',
      render: (_: any, record: ProductItem) => (
        <Space orientation="vertical" size={2}>
          <Text code style={{ fontWeight: 600 }}>{record.code}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>SKU: {record.sku}</Text>
        </Space>
      ),
    },
    {
      title: 'Product Name',
      key: 'name',
      render: (_: any, record: ProductItem) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>
            {record.name}
            {record.brandName && <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: '6px' }}>({record.brandName})</span>}
          </div>
          {record.genericName && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Generic: {record.genericName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      key: 'category',
      render: (_: any, record: ProductItem) => (
        <Space orientation="vertical" size={2}>
          <Tag color="blue" style={{ border: 'none', borderRadius: '8px', margin: 0 }}>
            {record.category.name}
          </Tag>
          {record.dosageForm && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Form: {record.dosageForm}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Team',
      key: 'team',
      render: (_: any, record: ProductItem) => (
        record.team ? (
          <Tag color="purple" style={{ border: 'none', borderRadius: '8px', margin: 0 }}>
            {record.team}
          </Tag>
        ) : <Text type="secondary">—</Text>
      ),
    },
    ...(isSuperAdmin ? [{
      title: 'Base Price',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price: number) => (
        <strong style={{ color: 'var(--primary-color)' }}>
          {price.toLocaleString()} {CURRENCY.symbol}
        </strong>
      ),
    }] : []),
    {
      title: 'Selling Price',
      dataIndex: 'sellingPrice',
      key: 'sellingPrice',
      render: (price: number) => (
        <strong style={{ color: '#10B981' }}>
          {price ? price.toLocaleString() : '0'} {CURRENCY.symbol}
        </strong>
      ),
    },
    {
      title: 'Dealer Price',
      dataIndex: 'dealerPrice',
      key: 'dealerPrice',
      render: (price: number) => (
        <strong style={{ color: '#D97706' }}>
          {price ? price.toLocaleString() : '0'} {CURRENCY.symbol}
        </strong>
      ),
    },
    {
      title: 'Unit (UOM)',
      dataIndex: 'uom',
      key: 'uom',
      render: (uom: string) => <Tag style={{ borderRadius: '8px' }}>{uom}</Tag>,
    },
    {
      title: 'Storage & Control',
      key: 'conditions',
      render: (_: any, record: ProductItem) => (
        <Space size={4} wrap>
          {record.storageConditions && (
            <Tag color={record.storageConditions.toLowerCase().includes('cold') ? 'blue' : 'default'} style={{ border: 'none', borderRadius: '8px' }}>
              {record.storageConditions}
            </Tag>
          )}
          {record.isScheduled && (
            <Tooltip title="Scheduled drug (prescription required)">
              <Tag color="orange" icon={<SafetyCertificateOutlined />} style={{ border: 'none', borderRadius: '8px' }}>
                Scheduled
              </Tag>
            </Tooltip>
          )}
          {record.isControlled && (
            <Tooltip title="Controlled pharmaceutical substance">
              <Tag color="red" icon={<ExperimentOutlined />} style={{ border: 'none', borderRadius: '8px' }}>
                Controlled
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 130,
      render: (_: any, record: ProductItem) => (
        <Space size="small">
          <Tooltip title="Edit Product">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm title="Delete this product?" onConfirm={() => handleDelete(record.id)} okText="Yes" okButtonProps={{ danger: true }}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Product Catalog</Title>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportProducts}
            style={{ borderRadius: '12px' }}
          >
            Export Excel
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={() => { setEditingProduct(null); form.resetFields(); setIsModalOpen(true); }}
            style={{ borderRadius: '12px' }}
          >
            Add Product
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless">
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} md={12}>
            <Input
              placeholder="Search by code, SKU, name, brand or generic..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={selectedCategory}
              onChange={(val) => {
                setSelectedCategory(val);
                setCurrentPage(1);
              }}
            >
              <Select.Option value="all">All Categories</Select.Option>
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={selectedTeam}
              onChange={(val) => {
                setSelectedTeam(val);
                setCurrentPage(1);
              }}
            >
              <Select.Option value="all">All Teams</Select.Option>
              {['CPD', 'G1', 'G2', 'G3', 'HOVID', 'PC'].map((t) => (
                <Select.Option key={t} value={t}>
                  {t}
                </Select.Option>
              ))}
              <Select.Option value="none">No Team</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={products.map((item, idx) => ({ ...item, key: item.id || idx }))}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalItems,
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            style: { padding: '16px' },
          }}
        />
      </Card>

      {/* Add Product Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>{editingProduct ? 'Edit Medicine Product' : 'Create New Medicine Product'}</span>}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateProduct}
          initialValues={{
            isScheduled: false,
            isControlled: false,
            uom: 'Box',
            expiryAlertThreshold: 30,
            basePrice: 0,
            sellingPrice: 0,
            dealerPrice: 0
          }}
          style={{ marginTop: '20px' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Product Name"
                rules={[{ required: true, message: 'Please input product name!' }]}
              >
                <Input placeholder="e.g. Paracetamol 500mg" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="sku"
                label="SKU Code"
                rules={[{ required: true, message: 'Please input SKU code!' }]}
              >
                <Input placeholder="e.g. PARA-500" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="brandName" label="Brand Name">
                <Input placeholder="e.g. Biogesic" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="genericName" label="Generic Name (Active Ingredient)">
                <Input placeholder="e.g. Paracetamol" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="categoryId"
                label="Product Category"
                rules={[{ required: true, message: 'Please select a category!' }]}
              >
                <Select placeholder="Select category" style={{ borderRadius: '8px' }}>
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.id}>{cat.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="team"
                label="Sales Team / Division"
                rules={[{ required: true, message: 'Please select a team!' }]}
              >
                <Select placeholder="Select team" style={{ borderRadius: '8px' }} allowClear>
                  {['CPD', 'G1', 'G2', 'G3', 'HOVID', 'PC'].map(t => (
                    <Select.Option key={t} value={t}>{t}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dosageForm"
                label="Dosage Form (Optional)"
              >
                <Input placeholder="e.g. Tablet, Capsule, Gel" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {isSuperAdmin && (
              <Col span={12}>
                <Form.Item
                  name="basePrice"
                  label="Base Price (MMK)"
                  rules={[{ required: true, message: 'Please input base price!' }]}
                >
                  <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="Base price" />
                </Form.Item>
              </Col>
            )}
            <Col span={isSuperAdmin ? 12 : 24}>
              <Form.Item
                name="sellingPrice"
                label="Selling Price (MMK)"
                rules={[{ required: true, message: 'Please input selling price!' }]}
              >
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="Selling price" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="dealerPrice"
                label="Dealer Price (MMK)"
                rules={[{ required: true, message: 'Please input dealer price!' }]}
              >
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="Dealer price" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="uom"
                label="Unit of Measure (UOM)"
                rules={[{ required: true, message: 'Please input UOM!' }]}
              >
                <Input placeholder="e.g. Box, Bottle, Ampoule" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="storageConditions" label="Storage Conditions">
                <Input placeholder="e.g. Cold Chain (2°C - 8°C)" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isScheduled" label="Scheduled Drug" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="isControlled" label="Controlled Drug" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="expiryAlertThreshold"
                label="Expiry Alert Threshold (Default for Batches)"
                rules={[{ required: true, message: 'Please select expiry alert threshold!' }]}
              >
                <Select placeholder="Select alert threshold" style={{ borderRadius: '8px' }}>
                  <Select.Option value={30}>1 Month (30 Days)</Select.Option>
                  <Select.Option value={60}>2 Months (60 Days)</Select.Option>
                  <Select.Option value={90}>3 Months (90 Days)</Select.Option>
                  <Select.Option value={180}>6 Months (180 Days)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Additional product notes..." style={{ borderRadius: '8px' }} />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); setEditingProduct(null); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>{editingProduct ? 'Update' : 'Create'}</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
