import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Input, Select, Space, Row, Col, Tooltip, Button, Modal, Form, InputNumber, Switch, message, DatePicker } from 'antd';
import { SearchOutlined, SafetyCertificateOutlined, ExperimentOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import dayjs from 'dayjs';

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
  genericName: string | null;
  brandName: string | null;
  dosageForm: string | null;
  isScheduled: boolean;
  isControlled: boolean;
  storageConditions: string | null;
  category: CategoryInfo;
  expiryDate?: string | null;
  expiryAlertThreshold: number;
}

export const Products: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory, currentPage, pageSize]);

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
      const { expiryDate, ...restValues } = values;

      const postData = {
        ...restValues,
        expiryDate: expiryDate ? dayjs(expiryDate).toISOString() : null
      };

      const res = await api.post('/products', postData);
      if (res.data.success) {
        message.success('Product created successfully');
        setIsModalOpen(false);
        form.resetFields();
        fetchProducts();
      }
    } catch (error: any) {
      console.error('Failed to create product:', error);
      message.error(error.response?.data?.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
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
      title: 'Category & Form',
      key: 'category_form',
      render: (_: any, record: ProductItem) => (
        <Space orientation="vertical" size={2}>
          <Tag color="purple" style={{ border: 'none', borderRadius: '8px', margin: 0 }}>
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
      title: 'Base Price',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price: number) => (
        <strong style={{ color: 'var(--primary-color)' }}>
          {price.toLocaleString()} {CURRENCY.symbol}
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
      title: 'Expiry Status',
      key: 'expiry',
      render: (_: any, record: ProductItem) => {
        if (!record.expiryDate) {
          return <Tag style={{ border: 'none', borderRadius: '8px' }}>No Expiry</Tag>;
        }
        const expiry = dayjs(record.expiryDate);
        const today = dayjs();
        const diffDays = expiry.diff(today, 'day');
        const threshold = record.expiryAlertThreshold || 30;
        
        if (diffDays < 0) {
          return (
            <Space orientation="vertical" size={2}>
              <Tag color="red" style={{ border: 'none', borderRadius: '8px', margin: 0 }}>Expired</Tag>
              <Text type="danger" style={{ fontSize: '11px' }}>{expiry.format('YYYY-MM-DD')}</Text>
            </Space>
          );
        } else if (diffDays <= threshold) {
          return (
            <Space orientation="vertical" size={2}>
              <Tag color="orange" style={{ border: 'none', borderRadius: '8px', margin: 0 }}>Expiring ({diffDays}d)</Tag>
              <Text style={{ fontSize: '11px', color: '#d46b08' }}>{expiry.format('YYYY-MM-DD')}</Text>
            </Space>
          );
        } else {
          return (
            <Space orientation="vertical" size={2}>
              <Tag color="green" style={{ border: 'none', borderRadius: '8px', margin: 0 }}>Healthy</Tag>
              <Text style={{ fontSize: '11px', color: '#389e0d' }}>{expiry.format('YYYY-MM-DD')}</Text>
            </Space>
          );
        }
      }
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
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Product Catalog</Title>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={() => setIsModalOpen(true)}
          style={{ borderRadius: '12px' }}
        >
          Add Product
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
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
          <Col xs={24} sm={12} md={6}>
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
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>Create New Medicine Product</span>}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
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
            expiryAlertThreshold: 30
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
                name="dosageForm"
                label="Dosage Form"
                rules={[{ required: true, message: 'Please input dosage form!' }]}
              >
                <Input placeholder="e.g. Tablet, Capsule, Gel" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="basePrice"
                label="Base Unit Price (MMK)"
                rules={[{ required: true, message: 'Please input base price!' }]}
              >
                <InputNumber min={0} style={{ width: '100%', borderRadius: '8px' }} placeholder="Base price in MMK" />
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
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="Expiry Date"
              >
                <DatePicker style={{ width: '100%', borderRadius: '8px' }} placeholder="Select product expiry date (optional)" />
              </Form.Item>
              <div style={{ marginTop: '-12px', marginBottom: '16px' }}>
                <Space size={8} wrap>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Quick Presets:</Text>
                  <Button size="small" type="dashed" onClick={() => form.setFieldsValue({ expiryDate: dayjs().add(1, 'month') })}>+1 Month</Button>
                  <Button size="small" type="dashed" onClick={() => form.setFieldsValue({ expiryDate: dayjs().add(2, 'month') })}>+2 Months</Button>
                  <Button size="small" type="dashed" onClick={() => form.setFieldsValue({ expiryDate: dayjs().add(3, 'month') })}>+3 Months</Button>
                  <Button size="small" type="dashed" onClick={() => form.setFieldsValue({ expiryDate: dayjs().add(6, 'month') })}>+6 Months</Button>
                  <Button size="small" danger type="text" onClick={() => form.setFieldsValue({ expiryDate: null })}>Clear</Button>
                </Space>
              </div>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryAlertThreshold"
                label="Expiry Alert Threshold"
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
              <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Submit</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
