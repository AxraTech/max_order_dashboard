import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Input, Select, Space, Row, Col,
  Button, Modal, Form, DatePicker, InputNumber, message, Tooltip, Descriptions, Popconfirm, Divider
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EyeOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SendOutlined, PlusCircleOutlined, MinusCircleOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface POItem {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  product: {
    id: string;
    code: string;
    name: string;
    sku: string;
    uom: string;
  };
}

interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  status: 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDate: string | null;
  receivedDate: string | null;
  notes: string | null;
  subtotal: number;
  tax: number;
  totalAmount: number;
  supplierId: string;
  supplier: { id: string; name: string; code: string };
  warehouseId: string;
  warehouse: { id: string; name: string; code: string };
  items?: POItem[];
  _count?: { items: number };
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'default',
  ORDERED: 'processing',
  RECEIVED: 'success',
  CANCELLED: 'error',
};

export const PurchaseOrders: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailPo, setDetailPo] = useState<PurchaseOrderRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiveNotes, setReceiveNotes] = useState('');
  
  const [form] = Form.useForm();

  // Load Filters master data
  useEffect(() => {
    api.get('/suppliers').then(res => {
      if (res.data.success) setSuppliers(res.data.data);
    }).catch(() => {});
    
    api.get('/inventory/warehouses').then(res => {
      if (res.data.success) setWarehouses(res.data.data);
    }).catch(() => {});
    
    api.get('/products', { params: { limit: 100 } }).then(res => {
      if (res.data.success) setProducts(res.data.data);
    }).catch(() => {});
  }, []);

  // Fetch Purchase Orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/purchase-orders', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          supplierId: supplierFilter !== 'all' ? supplierFilter : undefined,
          warehouseId: warehouseFilter !== 'all' ? warehouseFilter : undefined,
        },
      });
      if (res.data.success) {
        setOrders(res.data.data);
        setTotalItems(res.data.meta?.total || 0);
      }
    } catch {
      message.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, statusFilter, supplierFilter, warehouseFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const openCreatePoModal = () => {
    form.resetFields();
    const hqWarehouse = warehouses.find(
      (w) => w.code === 'WH-HQ' || w.name?.toLowerCase().includes('hq') || w.name?.toLowerCase().includes('main')
    );
    form.setFieldsValue({
      items: [{}],
      warehouseId: hqWarehouse ? hqWarehouse.id : undefined,
    });
    setIsCreateOpen(true);
  };

  const handleCreatePO = async (values: any) => {
    try {
      setSubmitting(true);
      const payload = {
        ...values,
        expectedDate: values.expectedDate ? dayjs(values.expectedDate).toISOString() : null,
      };
      const res = await api.post('/purchase-orders', payload);
      if (res.data.success) {
        message.success('Purchase order created as draft');
        setIsCreateOpen(false);
        form.resetFields();
        fetchOrders();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/purchase-orders/${id}`);
      if (res.data.success) {
        setDetailPo(res.data.data);
        setIsDetailOpen(true);
      }
    } catch {
      message.error('Failed to load purchase order details');
    }
  };

  const handleStatusTransition = async (id: string, targetStatus: string, poNotes?: string) => {
    try {
      const res = await api.put(`/purchase-orders/${id}/status`, {
        status: targetStatus,
        notes: poNotes,
      });
      if (res.data.success) {
        message.success(`Purchase order transitioned to ${targetStatus}`);
        setIsReceiveOpen(false);
        setReceiveNotes('');
        
        // Refresh details if open, otherwise list
        if (isDetailOpen && detailPo?.id === id) {
          handleViewDetail(id);
        } else {
          fetchOrders();
        }
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to transition order status');
    }
  };

  // Table Columns
  const columns = [
    {
      title: 'PO Number',
      dataIndex: 'poNumber',
      key: 'poNumber',
      render: (text: string) => <Text code style={{ fontWeight: 600 }}>{text}</Text>,
    },
    {
      title: 'Supplier',
      dataIndex: ['supplier', 'name'],
      key: 'supplier',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Target Warehouse',
      dataIndex: ['warehouse', 'name'],
      key: 'warehouse',
    },
    {
      title: 'Order Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      render: (dateStr: string) => new Date(dateStr).toLocaleDateString(),
    },
    {
      title: 'Items',
      dataIndex: ['_count', 'items'],
      key: 'itemsCount',
      render: (count: number) => count || 0,
    },
    {
      title: 'Total (MMK)',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (val: number) => <strong>{val ? val.toLocaleString() : '0'} {CURRENCY.symbol}</strong>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]} style={{ borderRadius: '8px', border: 'none', fontWeight: 600 }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: PurchaseOrderRecord) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.id)}
            />
          </Tooltip>
          {record.status === 'DRAFT' && (
            <Popconfirm
              title="Place this purchase order?"
              description="This will send the order to ordered status."
              onConfirm={() => handleStatusTransition(record.id, 'ORDERED')}
            >
              <Tooltip title="Place Order">
                <Button type="text" size="small" icon={<SendOutlined style={{ color: 'var(--primary-color)' }} />} />
              </Tooltip>
            </Popconfirm>
          )}
          {record.status === 'ORDERED' && (
            <Tooltip title="Receive Goods">
              <Button 
                type="text" 
                size="small" 
                icon={<CheckCircleOutlined style={{ color: '#10B981' }} />} 
                onClick={() => {
                  setDetailPo(record);
                  setIsReceiveOpen(true);
                }}
              />
            </Tooltip>
          )}
          {['DRAFT', 'ORDERED'].includes(record.status) && (
            <Popconfirm
              title="Cancel this order?"
              onConfirm={() => handleStatusTransition(record.id, 'CANCELLED')}
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Cancel Order">
                <Button type="text" size="small" danger icon={<CloseCircleOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '16px',
      }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Supplier Purchase Orders</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreatePoModal}
          style={{ borderRadius: '12px' }}
        >
          Create Purchase Order
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card" style={{ marginBottom: '20px', border: '1px solid var(--glass-border)' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by PO number..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Statuses</Select.Option>
              <Select.Option value="DRAFT">Draft</Select.Option>
              <Select.Option value="ORDERED">Ordered</Select.Option>
              <Select.Option value="RECEIVED">Received</Select.Option>
              <Select.Option value="CANCELLED">Cancelled</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={supplierFilter}
              onChange={(val) => { setSupplierFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Suppliers</Select.Option>
              {suppliers.map((s) => (
                <Select.Option key={s.id} value={s.id}>{s.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={6}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={warehouseFilter}
              onChange={(val) => { setWarehouseFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Warehouses</Select.Option>
              {warehouses.map((w) => (
                <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Orders Table */}
      <Card className="glass-card" style={{ border: '1px solid var(--glass-border)' }}>
        <Table
          columns={columns}
          dataSource={orders.map((item) => ({ ...item, key: item.id }))}
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

      {/* Create Purchase Order Modal */}
      <Modal
        title="Create Purchase Order"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreatePO}
          initialValues={{ items: [{}] }}
          style={{ paddingTop: '12px' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="supplierId"
                label="Supplier"
                rules={[{ required: true, message: 'Please select a supplier' }]}
              >
                <Select placeholder="Select supplier">
                  {suppliers.map((s) => (
                    <Select.Option key={s.id} value={s.id}>{s.name} ({s.code})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="warehouseId"
                label="Destination Warehouse"
                rules={[{ required: true, message: 'Please select target warehouse' }]}
              >
                <Select placeholder="Select target warehouse">
                  {warehouses.map((w) => (
                    <Select.Option key={w.id} value={w.id}>{w.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="expectedDate"
                label="Expected Delivery Date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="notes"
                label="Order Notes / Terms"
              >
                <Input placeholder="E.g., payment on delivery terms" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation={"left" as any} style={{ margin: '12px 0' }}>Ordered Items</Divider>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={16} key={key} align="middle" style={{ marginBottom: 8 }}>
                    <Col span={12}>
                      <Form.Item
                        {...restField}
                        name={[name, 'productId']}
                        rules={[{ required: true, message: 'Select product' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select placeholder="Select medicine product" showSearch optionFilterProp="label">
                          {products.map((p) => (
                            <Select.Option key={p.id} value={p.id} label={`${p.name} (${p.sku})`}>
                              {p.name} - SKU: {p.sku} ({p.uom})
                            </Select.Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[{ required: true, message: 'Enter qty' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={5}>
                      <Form.Item
                        {...restField}
                        name={[name, 'unitCost']}
                        rules={[{ required: true, message: 'Enter unit cost' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber min={0.01} placeholder="Cost Price (MMK)" style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      {fields.length > 1 && (
                        <MinusCircleOutlined
                          style={{ color: '#EF4444', fontSize: '18px', cursor: 'pointer' }}
                          onClick={() => remove(name)}
                        />
                      )}
                    </Col>
                  </Row>
                ))}
                <Form.Item style={{ marginTop: '12px' }}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusCircleOutlined />}>
                    Add Product Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0, marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Save as Draft
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* PO Detail view Drawer / Modal */}
      <Modal
        title="Purchase Order Detail"
        open={isDetailOpen}
        onCancel={() => setIsDetailOpen(false)}
        footer={[
          detailPo?.status === 'DRAFT' && (
            <Popconfirm
              key="place"
              title="Place this purchase order?"
              onConfirm={() => handleStatusTransition(detailPo.id, 'ORDERED')}
            >
              <Button type="primary" icon={<SendOutlined />}>Place Order</Button>
            </Popconfirm>
          ),
          detailPo?.status === 'ORDERED' && (
            <Button 
              key="receive" 
              type="primary" 
              style={{ background: '#10B981', borderColor: '#10B981' }} 
              icon={<CheckCircleOutlined />}
              onClick={() => {
                setIsDetailOpen(false);
                setIsReceiveOpen(true);
              }}
            >
              Receive Goods
            </Button>
          ),
          detailPo && ['DRAFT', 'ORDERED'].includes(detailPo.status) && (
            <Popconfirm
              key="cancel"
              title="Cancel this order?"
              onConfirm={() => handleStatusTransition(detailPo.id, 'CANCELLED')}
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<CloseCircleOutlined />}>Cancel Order</Button>
            </Popconfirm>
          ),
          <Button key="close" onClick={() => setIsDetailOpen(false)}>Close</Button>
        ]}
        width={750}
      >
        {detailPo && (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginTop: '16px', marginBottom: '20px' }}>
              <Descriptions.Item label="PO Number"><Text code>{detailPo.poNumber}</Text></Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[detailPo.status]} style={{ border: 'none', borderRadius: '8px' }}>
                  {detailPo.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Supplier">{detailPo.supplier.name} ({detailPo.supplier.code})</Descriptions.Item>
              <Descriptions.Item label="Target Warehouse">{detailPo.warehouse.name}</Descriptions.Item>
              <Descriptions.Item label="Order Date">{new Date(detailPo.orderDate).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Expected Delivery">{detailPo.expectedDate ? new Date(detailPo.expectedDate).toLocaleDateString() : 'Not specified'}</Descriptions.Item>
              {detailPo.receivedDate && (
                <Descriptions.Item label="Received Date" span={2}>
                  <Text type="success" strong>{new Date(detailPo.receivedDate).toLocaleString()}</Text>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Notes/Terms" span={2}>{detailPo.notes || '-'}</Descriptions.Item>
            </Descriptions>

            <Table
              dataSource={detailPo.items?.map((item) => ({ ...item, key: item.id }))}
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Medicine Product',
                  dataIndex: ['product', 'name'],
                  key: 'name',
                  render: (text: string, r: POItem) => (
                    <div>
                      <Text strong>{text}</Text>
                      <br /><Text type="secondary" style={{ fontSize: '11px' }}>SKU: {r.product.sku}</Text>
                    </div>
                  )
                },
                {
                  title: 'Qty',
                  dataIndex: 'quantity',
                  key: 'qty',
                  render: (val: number, r: POItem) => `${val} ${r.product.uom}`,
                },
                {
                  title: 'Unit Cost',
                  dataIndex: 'unitCost',
                  key: 'unitCost',
                  render: (val: number) => `${val.toLocaleString()} ${CURRENCY.symbol}`,
                },
                {
                  title: 'Total Cost',
                  dataIndex: 'totalCost',
                  key: 'totalCost',
                  render: (val: number) => <strong>{val.toLocaleString()} {CURRENCY.symbol}</strong>,
                },
              ]}
            />

            <Descriptions column={1} size="small" style={{ marginTop: '20px', textAlign: 'right' }}>
              <Descriptions.Item label={<Text strong style={{ fontSize: '14px' }}>Subtotal</Text>}>
                {Number(detailPo.subtotal).toLocaleString()} {CURRENCY.symbol}
              </Descriptions.Item>
              <Descriptions.Item label={<Text strong style={{ fontSize: '14px' }}>Tax (5%)</Text>}>
                {Number(detailPo.tax).toLocaleString()} {CURRENCY.symbol}
              </Descriptions.Item>
              <Descriptions.Item label={<Text strong style={{ fontSize: '16px', color: 'var(--primary-color)' }}>Total Amount</Text>}>
                <Text strong style={{ fontSize: '16px', color: 'var(--primary-color)' }}>{Number(detailPo.totalAmount).toLocaleString()} {CURRENCY.symbol}</Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Goods Receipt Confirmation Modal */}
      <Modal
        title="Confirm Goods Receipt"
        open={isReceiveOpen}
        onCancel={() => setIsReceiveOpen(false)}
        onOk={() => {
          if (detailPo) {
            handleStatusTransition(detailPo.id, 'RECEIVED', receiveNotes);
          }
        }}
        okText="Verify & Receive Stock"
        okButtonProps={{ style: { background: '#10B981', borderColor: '#10B981' } }}
        destroyOnClose
      >
        <div style={{ paddingTop: '12px' }}>
          <Text>You are about to check in products from Purchase Order <Text code>{detailPo?.poNumber}</Text> into warehouse <Text strong>{detailPo?.warehouse.name}</Text>.</Text>
          <br />
          <Text type="secondary">This will automatically increment product stock levels and record batches under FEFO sorting rules.</Text>
          
          <div style={{ marginTop: '16px' }}>
            <Text strong style={{ fontSize: '12px' }}>Receipt Notes / Batch Details:</Text>
            <Input.TextArea 
              placeholder="E.g., Delivered by DHL, temp logs normal." 
              value={receiveNotes} 
              onChange={(e) => setReceiveNotes(e.target.value)} 
              rows={3} 
              style={{ marginTop: '8px', borderRadius: '12px' }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
