import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Input, Select, Space, Row, Col,
  Button, Modal, Form, Switch, message, Popconfirm, Descriptions,
  DatePicker, InputNumber,
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined,
  DeleteOutlined, CalendarOutlined, GiftOutlined, PercentageOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface ProductItem {
  id: string;
  name: string;
  sku: string;
}

interface PromotionRecord {
  id: string;
  name: string;
  description: string | null;
  type: 'BUY_N_GET_M' | 'ORDER_THRESHOLD_DISCOUNT';
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  productId: string | null;
  product: ProductItem | null;
  buyQty: number | null;
  freeQty: number | null;
  tiers: Array<{ buyQty: number; freeQty: number }> | null;
  minOrderAmount: number | null;
  discountAmount: number | null;
  discountPercentage: number | null;
  createdAt: string;
  updatedAt: string;
}

export const Promotions: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState<PromotionRecord[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  
  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [promoType, setPromoType] = useState<'BUY_N_GET_M' | 'ORDER_THRESHOLD_DISCOUNT'>('BUY_N_GET_M');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [form] = Form.useForm();

  // Detail Modal
  const [detailPromo, setDetailPromo] = useState<PromotionRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Fetch Promotions
  const fetchPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/promotions');
      if (res.data.success) {
        setPromotions(res.data.data);
      }
    } catch {
      message.error('Failed to load promotion campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Products for selection
  const fetchProducts = async () => {
    try {
      const res = await api.get('/products', { params: { limit: 100 } });
      if (res.data.success) {
        setProducts(res.data.data);
      }
    } catch {}
  };

  useEffect(() => {
    fetchPromotions();
    fetchProducts();
  }, [fetchPromotions]);

  // ---- Open Modals ----
  const openCreateModal = () => {
    setEditingPromo(null);
    setPromoType('BUY_N_GET_M');
    setDiscountType('FLAT');
    form.resetFields();
    form.setFieldsValue({
      type: 'BUY_N_GET_M',
      discountType: 'FLAT',
      startDate: dayjs(),
      isActive: true,
      tiers: [{ buyQty: 10, freeQty: 1 }],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (record: PromotionRecord) => {
    setEditingPromo(record);
    setPromoType(record.type);
    const calculatedType = record.discountPercentage ? 'PERCENTAGE' : 'FLAT';
    setDiscountType(calculatedType);
    form.resetFields();
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      type: record.type,
      discountType: calculatedType,
      startDate: dayjs(record.startDate),
      endDate: record.endDate ? dayjs(record.endDate) : null,
      productId: record.productId,
      tiers: record.tiers && record.tiers.length > 0 ? record.tiers : [{ buyQty: record.buyQty, freeQty: record.freeQty }],
      minOrderAmount: record.minOrderAmount,
      discountAmount: record.discountAmount,
      discountPercentage: record.discountPercentage,
      isActive: record.isActive,
    });
    setIsModalOpen(true);
  };

  const handleTypeChange = (value: 'BUY_N_GET_M' | 'ORDER_THRESHOLD_DISCOUNT') => {
    setPromoType(value);
  };

  // ---- Save Campaign ----
  const handleSave = async (values: any) => {
    try {
      setSubmitting(true);
      const payload = {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate ? values.endDate.toISOString() : null,
        discountAmount: values.type === 'ORDER_THRESHOLD_DISCOUNT' && values.discountType === 'FLAT' ? values.discountAmount : null,
        discountPercentage: values.type === 'ORDER_THRESHOLD_DISCOUNT' && values.discountType === 'PERCENTAGE' ? values.discountPercentage : null,
      };

      if (editingPromo) {
        const res = await api.put(`/promotions/${editingPromo.id}`, payload);
        if (res.data.success) {
          message.success('Promotion campaign updated successfully');
          setIsModalOpen(false);
          fetchPromotions();
        }
      } else {
        const res = await api.post('/promotions', payload);
        if (res.data.success) {
          message.success('Promotion campaign created successfully');
          setIsModalOpen(false);
          fetchPromotions();
        }
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Failed to save promotion campaign');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete/Deactivate Campaign ----
  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/promotions/${id}`);
      if (res.data.success) {
        message.success('Promotion campaign deactivated successfully');
        fetchPromotions();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to deactivate promotion campaign');
    }
  };

  // Status Badge Logic
  const getStatusTag = (record: PromotionRecord) => {
    if (!record.isActive) {
      return <Tag color="default">Paused</Tag>;
    }
    const now = dayjs();
    const start = dayjs(record.startDate);
    const end = record.endDate ? dayjs(record.endDate) : null;

    if (now.isBefore(start)) {
      return <Tag color="blue">Scheduled</Tag>;
    }
    if (end && now.isAfter(end)) {
      return <Tag color="red">Expired</Tag>;
    }
    return <Tag color="green">Active</Tag>;
  };

  // Filter & Search Logic
  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.name.toLowerCase().includes(search.toLowerCase()) || 
      (promo.description && promo.description.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || promo.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const columns = [
    {
      title: 'Campaign Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PromotionRecord) => (
        <div>
          <strong style={{ color: 'var(--primary-color)' }}>{name}</strong>
          {record.description && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
              {record.description}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 220,
      render: (type: string) => {
        if (type === 'BUY_N_GET_M') {
          return <Tag color="purple" icon={<GiftOutlined />}>Quantity Promotion (10+1)</Tag>;
        }
        return <Tag color="orange" icon={<PercentageOutlined />}>Order Value Discount</Tag>;
      },
    },
    {
      title: 'Details / Rules',
      key: 'rules',
      render: (_: any, record: PromotionRecord) => {
        if (record.type === 'BUY_N_GET_M') {
          return (
            <div>
              <Text strong>{record.product?.name || 'Any product'}</Text>
              <br />
              {record.tiers && record.tiers.length > 0 ? (
                <div style={{ marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {record.tiers.map((t, idx) => (
                    <Tag color="blue" key={idx} style={{ margin: 0 }}>
                      {t.buyQty} + {t.freeQty}
                    </Tag>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Buy {record.buyQty} get {record.freeQty} free
                </Text>
              )}
            </div>
          );
        }
        return (
          <div>
            <Text strong>Min Purchase: {record.minOrderAmount?.toLocaleString()} MMK</Text>
            <br />
            {record.discountPercentage !== null && record.discountPercentage !== undefined ? (
              <Text type="secondary" style={{ fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
                Discount: -{record.discountPercentage}%
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px', color: '#10B981' }}>
                Discount: -{record.discountAmount?.toLocaleString()} MMK
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Duration',
      key: 'duration',
      width: 200,
      render: (_: any, record: PromotionRecord) => (
        <div>
          <span style={{ fontSize: '13px' }}>
            <CalendarOutlined style={{ marginRight: '4px', color: '#9ca3af' }} />
            {dayjs(record.startDate).format('DD MMM YYYY')}
          </span>
          <br />
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            to {record.endDate ? dayjs(record.endDate).format('DD MMM YYYY') : 'Ongoing'}
          </span>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: any, record: PromotionRecord) => getStatusTag(record),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_: any, record: PromotionRecord) => (
        <Space>
          <Button
            size="small"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => {
              setDetailPromo(record);
              setDetailOpen(true);
            }}
          >
            View
          </Button>
          <Button
            size="small"
            type="link"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Deactivate this promotion?"
            description="This will set the status of this campaign to inactive."
            onConfirm={() => handleDelete(record.id)}
            okText="Deactivate"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>
              Pause
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ paddingBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Promotion Campaigns</Title>
          <Text type="secondary">Manage customer incentive rules, quantity packages, and threshold discounts</Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          style={{ borderRadius: '12px' }}
        >
          Create Campaign
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by name, description..."
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v)}
            >
              <Select.Option value="all">All Promotion Types</Select.Option>
              <Select.Option value="BUY_N_GET_M">Quantity-based (Buy N Get M)</Select.Option>
              <Select.Option value="ORDER_THRESHOLD_DISCOUNT">Order-value-based</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={filteredPromotions.map(p => ({ ...p, key: p.id }))}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={<Space><GiftOutlined style={{ color: 'var(--primary-color)' }} /> <Text strong style={{ fontSize: '16px' }}>Campaign Detail</Text></Space>}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={[
          <Button key="close" onClick={() => setDetailOpen(false)} style={{ borderRadius: '12px' }}>
            Close
          </Button>
        ]}
        width={550}
      >
        {detailPromo && (
          <Descriptions bordered column={1} size="small" style={{ marginTop: '16px' }}>
            <Descriptions.Item label="Campaign Name">{detailPromo.name}</Descriptions.Item>
            <Descriptions.Item label="Description">{detailPromo.description || '—'}</Descriptions.Item>
            <Descriptions.Item label="Type">
              {detailPromo.type === 'BUY_N_GET_M' ? 'Quantity Discount (10+1)' : 'Order Value Discount'}
            </Descriptions.Item>
            <Descriptions.Item label="Status">{getStatusTag(detailPromo)}</Descriptions.Item>
            <Descriptions.Item label="Start Date">{dayjs(detailPromo.startDate).format('DD MMMM YYYY HH:mm A')}</Descriptions.Item>
            <Descriptions.Item label="End Date">{detailPromo.endDate ? dayjs(detailPromo.endDate).format('DD MMMM YYYY HH:mm A') : 'Ongoing'}</Descriptions.Item>
            
            {detailPromo.type === 'BUY_N_GET_M' ? (
              <>
                 <Descriptions.Item label="Target Product">{detailPromo.product?.name || '—'}</Descriptions.Item>
                 {detailPromo.tiers && detailPromo.tiers.length > 0 ? (
                   <Descriptions.Item label="Promotion Tiers">
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                       {detailPromo.tiers.map((t, idx) => (
                         <div key={idx}>
                           <Text strong>Buy {t.buyQty}</Text> → <Text type="success">Get {t.freeQty} Free</Text>
                         </div>
                       ))}
                     </div>
                   </Descriptions.Item>
                 ) : (
                   <>
                     <Descriptions.Item label="Buy Quantity">{detailPromo.buyQty}</Descriptions.Item>
                     <Descriptions.Item label="Free Quantity">{detailPromo.freeQty}</Descriptions.Item>
                   </>
                 )}
              </>
            ) : (
              <>
                <Descriptions.Item label="Min Order Value">{detailPromo.minOrderAmount?.toLocaleString()} MMK</Descriptions.Item>
                {detailPromo.discountPercentage !== null && detailPromo.discountPercentage !== undefined ? (
                  <Descriptions.Item label="Discount Percentage">{detailPromo.discountPercentage}%</Descriptions.Item>
                ) : (
                  <Descriptions.Item label="Discount Amount">{detailPromo.discountAmount?.toLocaleString()} MMK</Descriptions.Item>
                )}
              </>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Create/Edit Modal */}
      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: 'var(--primary-color)' }} />
            <Text strong style={{ fontSize: '16px' }}>{editingPromo ? 'Edit Promotion Campaign' : 'Create Promotion Campaign'}</Text>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={submitting}
        okText={editingPromo ? 'Update' : 'Create'}
        onOk={() => form.submit()}
        width={600}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          style={{ marginTop: '16px' }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="Campaign Name"
                rules={[{ required: true, message: 'Please enter campaign name' }]}
              >
                <Input placeholder="e.g. Paracetamol 10+1 Promotion" style={{ borderRadius: '12px' }} />
              </Form.Item>
            </Col>
            
            <Col span={24}>
              <Form.Item
                name="description"
                label="Description"
              >
                <Input.TextArea rows={2} placeholder="Explain the details or conditions of the promotion..." style={{ borderRadius: '12px' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="type"
                label="Promotion Type"
                rules={[{ required: true }]}
              >
                <Select onChange={handleTypeChange}>
                  <Select.Option value="BUY_N_GET_M">Quantity-based (Buy N Get M)</Select.Option>
                  <Select.Option value="ORDER_THRESHOLD_DISCOUNT">Order-value-based</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Active Status"
                valuePropName="checked"
              >
                <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="startDate"
                label="Start Date"
                rules={[{ required: true, message: 'Please select start date' }]}
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%', borderRadius: '12px' }} />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="endDate"
                label="End Date"
              >
                <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%', borderRadius: '12px' }} placeholder="No expiry (ongoing)" allowClear />
              </Form.Item>
            </Col>

            {/* Type-conditional fields */}
            {promoType === 'BUY_N_GET_M' ? (
              <>
                <Col span={24}>
                  <Form.Item
                    name="productId"
                    label="Target Product"
                    rules={[{ required: true, message: 'Please select product' }]}
                  >
                    <Select
                      showSearch
                      placeholder="Select a product"
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={products.map(p => ({
                        value: p.id,
                        label: `${p.name} (${p.sku})`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                
                <Col span={24}>
                  <div style={{ marginBottom: '8px', fontWeight: 600 }}>Promotion Tiers</div>
                  <Form.List name="tiers">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                            <Form.Item
                              {...restField}
                              name={[name, 'buyQty']}
                              rules={[{ required: true, message: 'Required' }]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={1} style={{ width: 180, borderRadius: '8px' }} placeholder="Buy Qty (e.g. 10)" />
                            </Form.Item>
                            
                            <span style={{ color: '#8c8c8c' }}>get</span>
                            
                            <Form.Item
                              {...restField}
                              name={[name, 'freeQty']}
                              rules={[{ required: true, message: 'Required' }]}
                              style={{ marginBottom: 0 }}
                            >
                              <InputNumber min={1} style={{ width: 180, borderRadius: '8px' }} placeholder="Free Qty (e.g. 1)" />
                            </Form.Item>
                            
                            <span style={{ color: '#8c8c8c' }}>free</span>

                            {fields.length > 1 && (
                              <Button type="link" danger onClick={() => remove(name)}>
                                Remove
                              </Button>
                            )}
                          </Space>
                        ))}
                        <Form.Item style={{ marginTop: 8 }}>
                          <Button type="dashed" onClick={() => add({ buyQty: undefined, freeQty: undefined })} block icon={<PlusOutlined />} style={{ borderRadius: '12px' }}>
                            Add Promotion Tier
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Col>
              </>
            ) : (
              <>
                <Col span={24}>
                  <Form.Item
                    name="discountType"
                    label="Discount Method"
                    rules={[{ required: true }]}
                  >
                    <Select onChange={(value: 'FLAT' | 'PERCENTAGE') => setDiscountType(value)}>
                      <Select.Option value="FLAT">Flat Amount (MMK)</Select.Option>
                      <Select.Option value="PERCENTAGE">Percentage (%)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item
                    name="minOrderAmount"
                    label="Min Order Amount (MMK)"
                    rules={[{ required: true, message: 'Please specify minimum amount' }]}
                  >
                    <InputNumber
                      min={1}
                      style={{ width: '100%', borderRadius: '12px' }}
                      placeholder="e.g. 100,000"
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                    />
                  </Form.Item>
                </Col>
                
                {discountType === 'FLAT' ? (
                  <Col span={12}>
                    <Form.Item
                      name="discountAmount"
                      label="Discount Amount (MMK)"
                      rules={[{ required: true, message: 'Please specify discount amount' }]}
                    >
                      <InputNumber
                        min={1}
                        style={{ width: '100%', borderRadius: '12px' }}
                        placeholder="e.g. 10,000"
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={value => value!.replace(/\$\s?|(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                ) : (
                  <Col span={12}>
                    <Form.Item
                      name="discountPercentage"
                      label="Discount Percentage (%)"
                      rules={[
                        { required: true, message: 'Please specify discount percentage' },
                        { type: 'number', min: 0.01, max: 100, message: 'Percentage must be between 0.01 and 100' }
                      ]}
                    >
                      <InputNumber
                        min={0.01}
                        max={100}
                        step={0.1}
                        style={{ width: '100%', borderRadius: '12px' }}
                        placeholder="e.g. 10"
                      />
                    </Form.Item>
                  </Col>
                )}
              </>
            )}
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

