import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Space, Button, Modal, Dropdown,
  Descriptions, Timeline, Empty, Input, Select, message, Popconfirm,
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, CloseCircleOutlined,
  CheckCircleOutlined, MoreOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import type { OrderStatus } from '../../types/index';
import { useAuthStore } from '../../store/auth.store';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default', SUBMITTED: 'processing', BRANCH_REVIEW: 'blue',
  PENDING: 'warning', APPROVED: 'cyan', READY_FOR_DELIVERY: 'geekblue',
  INVOICED: 'purple', COMPLETED: 'green', CANCELLED: 'error',
};

interface OrderItem {
  id: string; quantity: number; unitPrice: number; totalPrice: number;
  focQty?: number;
  sampleQty?: number;
  promoQty?: number;
  product: { name: string; sku: string };
}
interface OrderRecord {
  id: string; orderNumber: string; status: OrderStatus;
  orderDate: string; totalAmount: number; subtotal: number; tax: number;
  discount: number; notes: string | null;
  manualDiscount?: number | null;
  cashDownDiscount?: number | null;
  cashback?: number | null;
  partnerCommission?: number | null;
  paymentAmount?: number | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paymentNotes?: string | null;
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
  const { user } = useAuthStore();

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
      render: (amt: number) => <Text strong style={{ color: 'var(--primary-color)' }}>{Math.round(Number(amt)).toLocaleString()} {CURRENCY.symbol}</Text>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, r: OrderRecord) => {
        const items: Array<{ key: string; label: React.ReactNode; icon?: React.ReactNode; danger?: boolean }> = [];
        items.push({ key: 'view', icon: <EyeOutlined />, label: 'View Details' });
        
        if (['SUBMITTED', 'PENDING'].includes(r.status)) {
          if (user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'HQ_MANAGER' || user?.role?.name === 'PURCHASE_ORDER') {
            items.push({ key: 'po_accept', icon: <CheckCircleOutlined />, label: 'Action By PO' });
          }
          if (user?.role?.name === 'BRANCH_MANAGER') {
            items.push({ key: 'bm_accept', icon: <CheckCircleOutlined />, label: 'Action By Branch Manager' });
          }
        }
        
        if (r.status === 'FINANCE_REVIEW') {
          if (user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'FINANCE_OFFICER' || user?.role?.name === 'HQ_MANAGER' || user?.role?.name === 'BRANCH_MANAGER') {
            items.push({ key: 'finance_approve', icon: <CheckCircleOutlined />, label: 'Action By Finance' });
          }
        }
        
        if (['SUBMITTED', 'DRAFT', 'PENDING'].includes(r.status)) {
          items.push({ key: 'cancel', icon: <CloseCircleOutlined />, label: 'Cancel Order', danger: true });
        }

        const onMenuClick = ({ key }: { key: string }) => {
          switch (key) {
            case 'view':
              handleViewDetail(r.id);
              break;
            case 'po_accept':
            case 'bm_accept':
              Modal.confirm({
                title: 'Accept order and send to Finance?',
                content: 'This will move the order to finance review.',
                okText: 'Accept',
                cancelText: 'Cancel',
                onOk: () => handleStatusTransition(r.id, 'FINANCE_REVIEW', 'Accepted, pending Finance'),
              });
              break;
            case 'finance_approve':
              Modal.confirm({
                title: 'Approve order and generate Invoice?',
                content: 'This will finalize the order and generate an invoice.',
                okText: 'Approve',
                cancelText: 'Cancel',
                onOk: () => handleStatusTransition(r.id, 'APPROVED', 'Approved by Finance'),
              });
              break;
            case 'cancel':
              Modal.confirm({
                title: 'Cancel this order?',
                content: 'Are you sure you want to cancel this order?',
                okText: 'Yes, Cancel',
                okType: 'danger',
                cancelText: 'No',
                onOk: () => handleStatusTransition(r.id, 'CANCELLED', 'Cancelled by admin'),
              });
              break;
          }
        };

        return (
          <Dropdown menu={{ items, onClick: onMenuClick }} trigger={['click']}>
            <Button icon={<MoreOutlined />} style={{ borderRadius: '10px', fontSize: '13px' }}>
              Actions
            </Button>
          </Dropdown>
        );
      },
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
              {['SUBMITTED', 'PENDING'].includes(detailOrder.status) &&
               ['SUPER_ADMIN', 'HQ_MANAGER', 'PURCHASE_ORDER'].includes(user?.role?.name || '') && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={actionLoading}
                  onClick={() => handleStatusTransition(detailOrder.id, 'FINANCE_REVIEW', 'Accepted, pending Finance')}
                >
                  Accept Order (PO)
                </Button>
              )}
              {['SUBMITTED', 'PENDING'].includes(detailOrder.status) &&
               user?.role?.name === 'BRANCH_MANAGER' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={actionLoading}
                  onClick={() => handleStatusTransition(detailOrder.id, 'FINANCE_REVIEW', 'Accepted, pending Finance')}
                >
                  Accept Order (BM)
                </Button>
              )}
              {detailOrder.status === 'FINANCE_REVIEW' &&
               ['SUPER_ADMIN', 'HQ_MANAGER', 'FINANCE_OFFICER', 'BRANCH_MANAGER'].includes(user?.role?.name || '') && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={actionLoading}
                  onClick={() => handleStatusTransition(detailOrder.id, 'APPROVED', 'Approved by Finance')}
                >
                  Approve Order (Finance)
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
              <Descriptions.Item label="Subtotal">{Math.round(Number(detailOrder.subtotal)).toLocaleString()} {CURRENCY.symbol}</Descriptions.Item>
              {Number(detailOrder.discount) - Number(detailOrder.manualDiscount || 0) > 0 && (
                <Descriptions.Item label="Promo Discount">
                  -{Math.round(Number(detailOrder.discount) - Number(detailOrder.manualDiscount || 0)).toLocaleString()} {CURRENCY.symbol}
                </Descriptions.Item>
              )}
              {Number(detailOrder.manualDiscount || 0) > 0 && (
                <Descriptions.Item label="Manual Discount">
                  -{Math.round(Number(detailOrder.manualDiscount)).toLocaleString()} {CURRENCY.symbol}
                </Descriptions.Item>
              )}
              {Number(detailOrder.cashDownDiscount || 0) > 0 && (
                <Descriptions.Item label="Cash Down Discount">
                  -{Math.round(Number(detailOrder.cashDownDiscount)).toLocaleString()} {CURRENCY.symbol}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Tax">{Math.round(Number(detailOrder.tax)).toLocaleString()} {CURRENCY.symbol}</Descriptions.Item>
              {Number(detailOrder.cashback || 0) > 0 && (
                <Descriptions.Item label="Cashback">
                  -{Math.round(Number(detailOrder.cashback)).toLocaleString()} {CURRENCY.symbol}
                </Descriptions.Item>
              )}
              {Number(detailOrder.partnerCommission || 0) > 0 && (
                <Descriptions.Item label="Partner Coms">
                  -{Math.round(Number(detailOrder.partnerCommission)).toLocaleString()} {CURRENCY.symbol}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Total">
                <strong style={{ color: 'var(--primary-color)', fontSize: '16px' }}>
                  {Math.round(Number(detailOrder.totalAmount)).toLocaleString()} {CURRENCY.symbol}
                </strong>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[detailOrder.status]}>{detailOrder.status.replace(/_/g, ' ')}</Tag>
              </Descriptions.Item>

              {detailOrder.notes && <Descriptions.Item label="Notes" span={2}>{detailOrder.notes}</Descriptions.Item>}
            </Descriptions>

            <Title level={5} style={{ marginBottom: '10px' }}>Order Items</Title>
            {(() => {
              const splitItems: any[] = [];
              if (detailOrder?.items) {
                detailOrder.items.forEach((item: any) => {
                  const chargeQty = item.quantity - (item.promoQty || 0);
                  if (chargeQty > 0) {
                    splitItems.push({
                      key: `${item.id}-charge`,
                      name: item.product.name,
                      sku: item.product.sku,
                      qty: chargeQty,
                      type: 'Charge',
                      unitPrice: item.unitPrice,
                      totalPrice: item.totalPrice,
                    });
                  }
                  if (item.promoQty && item.promoQty > 0) {
                    splitItems.push({
                      key: `${item.id}-promo`,
                      name: item.product.name,
                      sku: item.product.sku,
                      qty: item.promoQty,
                      type: 'Promo',
                      unitPrice: 0,
                      totalPrice: 0,
                    });
                  }
                  if (item.focQty && item.focQty > 0) {
                    splitItems.push({
                      key: `${item.id}-foc`,
                      name: item.product.name,
                      sku: item.product.sku,
                      qty: item.focQty,
                      type: 'FOC',
                      unitPrice: 0,
                      totalPrice: 0,
                    });
                  }
                  if (item.sampleQty && item.sampleQty > 0) {
                    splitItems.push({
                      key: `${item.id}-sample`,
                      name: item.product.name,
                      sku: item.product.sku,
                      qty: item.sampleQty,
                      type: 'Sample',
                      unitPrice: 0,
                      totalPrice: 0,
                    });
                  }
                });
              }

              return (
                <Table
                  size="small"
                  dataSource={splitItems}
                  columns={[
                    { title: 'Product', key: 'product', render: (_a: any, r: any) => <div><Text strong>{r.name}</Text><br/><Text type="secondary" style={{fontSize:'11px'}}>SKU: {r.sku}</Text></div> },
                    { title: 'Type', dataIndex: 'type', key: 'type', width: 90, render: (t: string) => (
                      <Tag color={t === 'Charge' ? 'blue' : t === 'Promo' ? 'green' : t === 'FOC' ? 'pink' : 'purple'} style={{ border: 'none', borderRadius: '6px', fontWeight: 600 }}>
                        {t === 'Promo' ? 'Promo Free' : t}
                      </Tag>
                    )},
                    { title: 'Qty', dataIndex: 'qty', key: 'qty', width: 80, render: (v: number) => <Text>{v}</Text> },
                    { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 110, render: (v: number) => `${Math.round(Number(v)).toLocaleString()} ${CURRENCY.symbol}` },
                    { title: 'Total', dataIndex: 'totalPrice', key: 'totalPrice', width: 120, render: (v: number) => <Text strong>{Math.round(Number(v)).toLocaleString()} {CURRENCY.symbol}</Text> },
                  ]}
                  pagination={false} style={{ marginBottom: '20px' }}
                />
              );
            })()}

            {detailOrder.paymentAmount && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ fontSize: '14px', color: '#065f46' }}>Recorded Payment</Text>
                  <Text strong style={{ fontSize: '16px', color: '#059669' }}>
                    {Number(detailOrder.paymentAmount).toLocaleString()} {CURRENCY.symbol}
                  </Text>
                </div>
                {detailOrder.paymentMethod && (
                  <div style={{ marginTop: '4px' }}>
                    <Text type="secondary">Method: {detailOrder.paymentMethod.replace(/_/g, ' ')}</Text>
                    {detailOrder.paymentReference && <Text type="secondary"> · Ref: {detailOrder.paymentReference}</Text>}
                  </div>
                )}
                {detailOrder.paymentNotes && (
                  <div style={{ fontSize: '13px', color: '#065f46', marginTop: '8px', padding: '6px 8px', background: '#d1fae5', borderRadius: '4px' }}>
                    <Text strong style={{ marginRight: '4px' }}>Notes:</Text> {detailOrder.paymentNotes}
                  </div>
                )}
              </div>
            )}

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
