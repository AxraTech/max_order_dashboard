import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Tag, Input, Select, Space, Row, Col, Tooltip, Button, Modal, Form, InputNumber, DatePicker, Checkbox, Tabs, message } from 'antd';
import { SearchOutlined, CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface BatchInfo {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  reservedQty: number;
  costPrice: number;
  manufacturingDate?: string | null;
  notes?: string | null;
  expiryAlertThreshold: number;
}

interface StockItem {
  id: string;
  warehouseId: string;
  productId: string;
  quantity: number;
  reservedQty: number;
  damagedQty: number;
  reorderLevel: number;
  safetyStock: number;
  minStockLevel: number;
  product: {
    id: string;
    code: string;
    name: string;
    sku: string;
    uom: string;
    genericName: string | null;
    brandName: string | null;
    storageConditions: string | null;
    basePrice: number;
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
    branch: {
      id: string;
      name: string;
    };
  };
  batches: BatchInfo[];
}

interface WarehouseSummary {
  id: string;
  code: string;
  name: string;
  branch: {
    name: string;
  };
}

export const Inventory: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseSummary[]>([]);
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [branchesList, setBranchesList] = useState<any[]>([]);
  const [form] = Form.useForm();

  // Tabs & Filters state
  const [activeTab, setActiveTab] = useState<string>('all'); // 'all' or 'expired'
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchWarehouses();
    fetchProductsList();
    fetchBranchesList();
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [search, selectedWarehouse, currentPage, pageSize]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/inventory/warehouses');
      if (res.data.success) {
        setWarehouses(res.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch warehouses:', error);
    }
  };

  const fetchProductsList = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 100 } });
      if (res.data.success) {
        setProductsList(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchBranchesList = async () => {
    try {
      const res = await api.get('/branches');
      if (res.data.success) {
        // Only assign active branches
        setBranchesList(res.data.data.filter((b: any) => b.isActive));
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          warehouseId: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
        },
      });
      if (res.data.success) {
        setStocks(res.data.data);
        setTotalItems(res.data.meta?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch stock levels:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventory = async (values: any) => {
    try {
      setSubmitting(true);
      const { manufacturingDate, expiryDate, ...rest } = values;
      
      const payload = {
        ...rest,
        manufacturingDate: manufacturingDate ? dayjs(manufacturingDate).toISOString() : null,
        expiryDate: dayjs(expiryDate).toISOString(),
      };

      const res = await api.post('/inventory', payload);
      if (res.data.success) {
        message.success('Inventory batches created successfully');
        setIsModalOpen(false);
        form.resetFields();
        fetchStocks();
      }
    } catch (err: any) {
      console.error('Failed to add inventory:', err);
      message.error(err.response?.data?.message || 'Failed to create inventory records');
    } finally {
      setSubmitting(false);
    }
  };

  const getStockStatusTag = (stock: StockItem) => {
    const available = stock.quantity - stock.reservedQty;
    if (available <= stock.minStockLevel) {
      return <Tag color="red" style={{ fontWeight: 600, border: 'none', borderRadius: '12px' }}>CRITICAL STOCK</Tag>;
    }
    if (available <= stock.safetyStock) {
      return <Tag color="orange" style={{ fontWeight: 600, border: 'none', borderRadius: '12px' }}>LOW STOCK</Tag>;
    }
    return <Tag color="green" style={{ fontWeight: 600, border: 'none', borderRadius: '12px' }}>HEALTHY</Tag>;
  };

  const getBatchStatusTag = (expiryStr: string, qty: number, reserved: number) => {
    const expiry = new Date(expiryStr);
    const now = new Date();
    const available = qty - reserved;

    if (expiry < now) {
      return <Tag color="red" style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>EXPIRED (DO NOT USE)</Tag>;
    }

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    if (expiry <= thirtyDaysFromNow) {
      return <Tag color="orange" style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>NEAR EXPIRY</Tag>;
    }

    if (available <= 0) {
      return <Tag color="default" style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>RESERVED</Tag>;
    }

    return <Tag color="green" style={{ border: 'none', borderRadius: '12px', fontWeight: 500 }}>ACTIVE</Tag>;
  };

  // Expanded row render for Batch detailed list
  const expandedRowRender = (record: StockItem) => {
    // Filter batches if activeTab is 'expired'
    const batchesToShow = activeTab === 'expired' 
      ? record.batches.filter(b => new Date(b.expiryDate) < new Date())
      : record.batches;

    const columns = [
      {
        title: 'Batch Number',
        dataIndex: 'batchNumber',
        key: 'batchNumber',
        render: (text: string) => <Text code style={{ fontWeight: 500 }}>{text}</Text>,
      },
      {
        title: 'Expiry Date',
        dataIndex: 'expiryDate',
        key: 'expiryDate',
        render: (dateStr: string) => {
          const isExpired = new Date(dateStr) < new Date();
          return (
            <Space style={{ color: isExpired ? '#EF4444' : 'inherit' }}>
              <CalendarOutlined />
              <span>{new Date(dateStr).toLocaleDateString()}</span>
            </Space>
          );
        },
      },
      {
        title: 'Mfg Date',
        dataIndex: 'manufacturingDate',
        key: 'manufacturingDate',
        render: (dateStr: string | null) => dateStr ? new Date(dateStr).toLocaleDateString() : <Text type="secondary">-</Text>,
      },
      {
        title: 'Physical Qty',
        dataIndex: 'quantity',
        key: 'quantity',
        render: (val: number) => <strong>{val}</strong>,
      },
      {
        title: 'Reserved Qty',
        dataIndex: 'reservedQty',
        key: 'reservedQty',
        render: (val: number) => <span style={{ color: val > 0 ? 'var(--warning-color)' : 'inherit' }}>{val}</span>,
      },
      {
        title: 'Available Qty',
        key: 'available',
        render: (_: any, batch: BatchInfo) => (
          <strong style={{ color: (batch.quantity - batch.reservedQty) > 0 ? '#10B981' : '#9CA3AF' }}>
            {batch.quantity - batch.reservedQty}
          </strong>
        ),
      },
      {
        title: 'Cost Price (MMK)',
        dataIndex: 'costPrice',
        key: 'costPrice',
        render: (val: number) => <span>{val ? val.toLocaleString() : '0'}</span>,
      },
      {
        title: 'Regulatory Status',
        key: 'status',
        render: (_: any, batch: BatchInfo) => getBatchStatusTag(batch.expiryDate, batch.quantity, batch.reservedQty),
      },
      {
        title: 'Notes',
        dataIndex: 'notes',
        key: 'notes',
        render: (text: string | null) => text || '-',
      }
    ];

    return (
      <Card 
        styles={{ body: { padding: '16px' } }}
        style={{ margin: '8px 0', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', background: 'rgba(249, 250, 251, 0.5)' }}
      >
        <div style={{ marginBottom: '12px', fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>
          FEFO Batch Queue Allocation:
        </div>
        <Table
          columns={columns}
          dataSource={batchesToShow.map((b, idx) => ({ ...b, key: b.id || idx }))}
          pagination={false}
          size="small"
        />
      </Card>
    );
  };

  const columns = [
    {
      title: 'Product (Medicine)',
      key: 'product',
      render: (_: any, record: StockItem) => (
        <div>
          <div style={{ fontWeight: 600, color: '#111827' }}>{record.product.name}</div>
          {record.product.genericName && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Generic: {record.product.genericName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'SKU',
      dataIndex: ['product', 'sku'],
      key: 'sku',
      render: (sku: string) => <Text code>{sku}</Text>,
    },
    {
      title: 'Warehouse',
      key: 'warehouse',
      render: (_: any, record: StockItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.warehouse.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.warehouse.branch.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Storage',
      dataIndex: ['product', 'storageConditions'],
      key: 'storage',
      render: (cond: string | null) => {
        if (!cond) return <Text type="secondary">-</Text>;
        const isColdChain = cond.toLowerCase().includes('cold') || cond.toLowerCase().includes('2-8');
        return (
          <Tooltip title={cond}>
            <Tag color={isColdChain ? 'blue' : 'default'} style={{ border: 'none', borderRadius: '8px' }}>
              {isColdChain ? '❄️ Cold Chain' : 'Room Temp'}
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Physical Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty: number, record: StockItem) => (
        <span>{qty} {record.product.uom}</span>
      ),
    },
    {
      title: 'Reserved Qty',
      dataIndex: 'reservedQty',
      key: 'reservedQty',
      render: (val: number, record: StockItem) => (
        <span style={{ color: val > 0 ? '#F59E0B' : 'inherit' }}>{val} {record.product.uom}</span>
      ),
    },
    {
      title: 'Available Qty',
      key: 'available',
      render: (_: any, record: StockItem) => {
        const available = record.quantity - record.reservedQty;
        return (
          <strong style={{ color: available > record.safetyStock ? '#10B981' : '#EF4444' }}>
            {available} {record.product.uom}
          </strong>
        );
      },
    },
    {
      title: 'Stock Status',
      key: 'status',
      render: (_: any, record: StockItem) => getStockStatusTag(record),
    },
  ];

  // Filter stocks depending on tab selection (Expired vs All)
  const filteredStocks = activeTab === 'expired'
    ? stocks.filter(stock => 
        stock.batches && stock.batches.some(batch => new Date(batch.expiryDate) < new Date())
      )
    : stocks;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Inventory Control & FEFO Batches</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
          style={{ borderRadius: '12px' }}
        >
          Add Inventory
        </Button>
      </div>

      {/* Tabs for All Stock vs Expired */}
      <Tabs 
        activeKey={activeTab} 
        onChange={(key) => setActiveTab(key)}
        style={{ marginBottom: '20px' }}
        items={[
          { key: 'all', label: 'All Inventory Stock' },
          { key: 'expired', label: 'Expired Inventory Only' }
        ]}
      />

      {/* Filter controls */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search products by SKU, Name, Generic..."
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
              value={selectedWarehouse}
              onChange={(val) => {
                setSelectedWarehouse(val);
                setCurrentPage(1);
              }}
            >
              <Select.Option value="all">All Warehouses</Select.Option>
              {warehouses.map((wh) => (
                <Select.Option key={wh.id} value={wh.id}>
                  {wh.name} ({wh.branch.name})
                </Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table listing */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={filteredStocks.map((item, idx) => ({ ...item, key: item.id || idx }))}
          expandable={{
            expandedRowRender,
            rowExpandable: (record) => record.batches && record.batches.length > 0,
          }}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: activeTab === 'expired' ? filteredStocks.length : totalItems,
            showSizeChanger: true,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
            style: { padding: '16px' },
          }}
        />
      </Card>

      {/* Add Inventory Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>Add Inventory Stock Batch</span>}
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
          onFinish={handleAddInventory}
          initialValues={{
            expiryAlertThreshold: 30,
            quantity: 100,
            costPrice: 0
          }}
          style={{ marginTop: '20px' }}
        >
          <Form.Item
            name="productId"
            label="Product Selection"
            rules={[{ required: true, message: 'Please select a product!' }]}
          >
            <Select
              showSearch
              placeholder="Select medicine product to add stock"
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={productsList.map(p => ({
                value: p.id,
                label: `${p.name} (${p.sku})`
              }))}
              style={{ borderRadius: '8px' }}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="Physical Stock Qty"
                rules={[
                  { required: true, message: 'Please input quantity!' },
                  { type: 'number', min: 1, message: 'Qty must be at least 1' }
                ]}
              >
                <InputNumber style={{ width: '100%', borderRadius: '8px' }} placeholder="Total units" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="costPrice"
                label="Unit Cost Price (MMK)"
                rules={[
                  { required: true, message: 'Please input cost price!' },
                  { type: 'number', min: 0, message: 'Cost must be positive' }
                ]}
              >
                <InputNumber style={{ width: '100%', borderRadius: '8px' }} placeholder="Buying price per unit" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="batchNumber"
                label="Batch Number (Optional)"
              >
                <Input placeholder="e.g. BATCH-A99 (autogenerated if blank)" style={{ borderRadius: '8px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryAlertThreshold"
                label="Expiry Alert Configuration"
                rules={[{ required: true, message: 'Please select alert setting!' }]}
              >
                <Select placeholder="Alert threshold" style={{ borderRadius: '8px' }}>
                  <Select.Option value={30}>30 Days before expiry</Select.Option>
                  <Select.Option value={60}>60 Days before expiry</Select.Option>
                  <Select.Option value={90}>90 Days before expiry</Select.Option>
                  <Select.Option value={180}>180 Days before expiry</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="manufacturingDate"
                label="Manufacturing Date (Optional)"
              >
                <DatePicker style={{ width: '100%', borderRadius: '8px' }} placeholder="Select Mfg date" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="expiryDate"
                label="Expiry Date"
                rules={[{ required: true, message: 'Please select expiry date!' }]}
              >
                <DatePicker style={{ width: '100%', borderRadius: '8px' }} placeholder="Select expiry date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="branchIds"
            label="Branch Assignment (Inventory belongs to one or multiple branches)"
            rules={[{ required: true, message: 'Please select at least one branch!' }]}
          >
            <Checkbox.Group style={{ width: '100%' }}>
              <Row gutter={[8, 12]}>
                {branchesList.map(b => (
                  <Col span={12} key={b.id}>
                    <Checkbox value={b.id}>{b.name} ({b.code})</Checkbox>
                  </Col>
                ))}
              </Row>
            </Checkbox.Group>
          </Form.Item>

          <Form.Item name="notes" label="Cost Notes / Details">
            <Input.TextArea rows={3} placeholder="Write inventory batch details..." style={{ borderRadius: '8px' }} />
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
