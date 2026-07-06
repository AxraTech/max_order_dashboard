import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Space, Button, Modal,
  Descriptions, Timeline, Empty, Input, Select, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import type { OrderStatus } from '../../types/index';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', SUBMITTED: 'processing', BRANCH_REVIEW: 'blue',
  PENDING: 'warning', APPROVED: 'cyan', READY_FOR_DELIVERY: 'geekblue',
  INVOICED: 'purple', COMPLETED: 'green', CANCELLED: 'error',
};

interface OrderItem {
  id: string; quantity: number; unitPrice: number; totalPrice: number;
  product: { name: string; sku: string };
}
interface OrderRecord {
  id: string; orderNumber: string; status: OrderStatus;
  orderDate: string; totalAmount: number; subtotal: number; tax: number;
  discount: number; notes: string | null;
  branch: { name: string; code: string };
  customer: { name: string; code: string };
  salesRep: { code: string; user: { firstName: string; lastName: string } };
  items: OrderItem[];
  statusHistory: Array<{ fromStatus: string | null; toStatus: string; reason: string | null; createdAt: string }>;
}

export const Orders: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detailOrder, setDetailOrder] = useState<OrderRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders', {
        params: {
          page, limit: pageSize,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      if (res.data.success) {
        setOrders(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch { } finally { setLoading(false); }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
    const handleUpdate = () => {
      fetchOrders();
    };
    window.addEventListener('api-update:order', handleUpdate);
    return () => {
      window.removeEventListener('api-update:order', handleUpdate);
    };
  }, [fetchOrders]);

  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/orders/${id}`);
      if (res.data.success) { setDetailOrder(res.data.data); setDetailOpen(true); }
    } catch { message.error('Failed to load order details'); }
  };

  const handleStatusTransition = async (id: string, newStatus: OrderStatus, reason?: string) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/orders/${id}/transition`, { status: newStatus, reason });
      if (res.data.success) {
        const actualStatus = res.data.data?.status || newStatus;
        const statusText = actualStatus.replace(/_/g, ' ');
        if (actualStatus !== newStatus) {
          message.warning(`Order moved to ${statusText}. Check the status history for the hold reason.`);
        } else {
          message.success(`Order ${statusText}`);
        }
        fetchOrders();
        if (detailOpen) { setDetailOpen(false); }
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update order');
    } finally { setActionLoading(false); }
  };

  const columns = [
    {
      title: 'Order #',
      dataIndex: 'orderNumber',
      key: 'orderNumber',
      width: 130,
      render: (num: string) => <Text code style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{num}</Text>,
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 150,
      render: (_: any, r: OrderRecord) => (
        <Space orientation="vertical" size={0}>
          <Text strong style={{ fontSize: '13px' }}>{r.customer?.name || '—'}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }}>{r.customer?.code}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s] || 'default'} style={{ border: 'none', borderRadius: '10px', fontWeight: 600 }}>
          {s.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Branch',
      key: 'branch',
      width: 120,
      render: (_: any, r: OrderRecord) => <Text>{r.branch?.name || '—'}</Text>,
    },
    {
      title: 'Sales Rep',
      key: 'rep',
      width: 130,
      render: (_: any, r: OrderRecord) => {
        const s = r.salesRep;
        if (!s) return <Text type="secondary">—</Text>;
        return <Text>{s.user?.firstName} {s.user?.lastName}</Text>;
      },
    },
    {
      title: 'Date',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 110,
      render: (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 130,
      render: (amt: number) => <Text strong style={{ color: 'var(--primary-color)' }}>{Number(amt).toLocaleString()} {CURRENCY.symbol}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: any, r: OrderRecord) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(r.id)} style={{ padding: 0 }}>
            View
          </Button>
          {['SUBMITTED', 'PENDING'].includes(r.status) && (
            <Popconfirm
              title="Approve this order?"
              onConfirm={() => handleStatusTransition(r.id, 'APPROVED', 'Approved by admin')}
              okText="Approve"
            >
              <Button type="link" icon={<CheckCircleOutlined />} style={{ padding: 0, color: '#10B981' }}>
                Approve
              </Button>
            </Popconfirm>
          )}
          {['SUBMITTED', 'DRAFT', 'PENDING'].includes(r.status) && (
            <Popconfirm
              title="Cancel this order?"
              onConfirm={() => handleStatusTransition(r.id, 'CANCELLED', 'Cancelled by admin')}
              okText="Yes" okButtonProps={{ danger: true }}
            >
              <Button type="link" danger icon={<CloseCircleOutlined />} style={{ padding: 0 }}>Cancel</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>All Orders</Title>
          <Text type="secondary">View and manage all orders across branches</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchOrders} style={{ borderRadius: '12px' }}>Refresh</Button>
      </div>

      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Space wrap>
          <Input
            placeholder="Search by order number or customer..."
            prefix={<SearchOutlined />}
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 280, borderRadius: '12px' }} allowClear
          />
          <Select
            value={statusFilter || 'all'} style={{ width: 180 }}
            onChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            {Object.keys(STATUS_COLOR).map((s) => (
              <Select.Option key={s} value={s}>{s.replace(/_/g, ' ')}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        {orders.length === 0 && !loading ? (
          <Empty
            image={<CheckCircleOutlined style={{ fontSize: '64px', color: '#d1d5db' }} />}
            description="No orders found."
            style={{ padding: '60px 0' }}
          />
        ) : (
          <Table
            columns={columns}
            dataSource={orders.map((o) => ({ ...o, key: o.id }))}
            loading={loading}
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              onChange: (p, s) => { setPage(p); setPageSize(s); },
              style: { padding: '16px' },
            }}
            scroll={{ x: 1100 }}
          />
        )}
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <Text strong style={{ fontSize: '18px' }}>Order {detailOrder?.orderNumber}</Text>
            {detailOrder && (
              <Tag color={STATUS_COLOR[detailOrder.status]} style={{ border: 'none', borderRadius: '10px', fontWeight: 600 }}>
                {detailOrder.status.replace(/_/g, ' ')}
              </Tag>
            )}
          </Space>
        }
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={
          detailOrder ? (
            <Space>
              {['SUBMITTED', 'PENDING'].includes(detailOrder.status) && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={actionLoading}
                  onClick={() => handleStatusTransition(detailOrder.id, 'APPROVED', 'Approved by admin')}
                >
                  Approve Order
                </Button>
              )}
              {['SUBMITTED', 'DRAFT', 'PENDING'].includes(detailOrder.status) && (
                <Popconfirm
                  title="Cancel this order?"
                  onConfirm={() => handleStatusTransition(detailOrder.id, 'CANCELLED', 'Cancelled by admin')}
                  okText="Yes, Cancel" okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>Cancel Order</Button>
                </Popconfirm>
              )}
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
            </Space>
          ) : null
        }
        width={720} destroyOnHidden
      >
        {detailOrder && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: '20px' }}>
              <Descriptions.Item label="Customer">{detailOrder.customer?.name}</Descriptions.Item>
              <Descriptions.Item label="Branch">{detailOrder.branch?.name}</Descriptions.Item>
              <Descriptions.Item label="Sales Rep">
                {detailOrder.salesRep ? `${detailOrder.salesRep.user?.firstName} ${detailOrder.salesRep.user?.lastName}` : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Date">{new Date(detailOrder.orderDate).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Subtotal">{Number(detailOrder.subtotal).toLocaleString()} {CURRENCY.symbol}</Descriptions.Item>
              <Descriptions.Item label="Discount">{Number(detailOrder.discount).toLocaleString()} {CURRENCY.symbol}</Descriptions.Item>
              <Descriptions.Item label="Total">
                <strong style={{ color: 'var(--primary-color)', fontSize: '16px' }}>
                  {Number(detailOrder.totalAmount).toLocaleString()} {CURRENCY.symbol}
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[detailOrder.status]}>{detailOrder.status.replace(/_/g, ' ')}</Tag>
              </Descriptions.Item>
              {detailOrder.notes && <Descriptions.Item label="Notes" span={2}>{detailOrder.notes}</Descriptions.Item>}
            </Descriptions>

            <Title level={5} style={{ marginBottom: '10px' }}>Order Items</Title>
            <Table
              size="small"
              dataSource={detailOrder.items.map((i) => ({ ...i, key: i.id }))}
              columns={[
                { title: 'Product', key: 'product', render: (_a: any, r: OrderItem) => <div><Text strong>{r.product.name}</Text><br/><Text type="secondary" style={{fontSize:'11px'}}>SKU: {r.product.sku}</Text></div> },
                { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60 },
                { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 110, render: (v: number) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                { title: 'Total', dataIndex: 'totalPrice', key: 'totalPrice', width: 120, render: (v: number) => <Text strong>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> },
              ]}
              pagination={false} style={{ marginBottom: '20px' }}
            />

            {detailOrder.statusHistory?.length > 0 && (
              <>
                <Title level={5} style={{ marginBottom: '10px' }}>Status History</Title>
                <Timeline
                  items={detailOrder.statusHistory.map((h) => ({
                    color: h.toStatus === 'CANCELLED' ? 'red' : h.toStatus === 'COMPLETED' ? 'green' : 'blue',
                    children: (
                      <div>
                        <Text strong>{h.toStatus.replace(/_/g, ' ')}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>{h.reason || '—'}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '11px' }}>{new Date(h.createdAt).toLocaleString()}</Text>
                      </div>
                    ),
                  }))}
                />
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
};
