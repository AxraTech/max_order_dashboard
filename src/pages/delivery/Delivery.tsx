import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Descriptions, Input, message, Modal, Select, Space, Table, Tag, Typography,
} from 'antd';
import { CheckCircleOutlined, EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  PICKING: 'processing',
  PACKING: 'cyan',
  IN_TRANSIT: 'blue',
  DELIVERED: 'green',
  RETURNED: 'red',
};

const NEXT_STATUS: Record<string, string> = {
  PICKING: 'PACKING',
  PACKING: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

interface DeliveryRecord {
  id: string;
  deliveryNumber: string;
  status: string;
  deliveryDate?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    customer: { code: string; name: string };
    branch: { code: string; name: string };
    items: Array<{
      id: string;
      quantity: number;
      focQty?: number;
      sampleQty?: number;
      batchNumber?: string | null;
      product: { sku: string; name: string };
    }>;
  };
}

export const Delivery: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<DeliveryRecord | null>(null);

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/delivery', {
        params: {
          page,
          limit: pageSize,
          status: status || undefined,
          search: search || undefined,
        },
      });
      if (res.data.success) {
        setDeliveries(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status, search]);

  useEffect(() => {
    fetchDeliveries();
    const handleUpdate = () => {
      fetchDeliveries();
    };
    window.addEventListener('api-update:delivery', handleUpdate);
    return () => {
      window.removeEventListener('api-update:delivery', handleUpdate);
    };
  }, [fetchDeliveries]);

  const moveNext = async (record: DeliveryRecord) => {
    const nextStatus = NEXT_STATUS[record.status];
    if (!nextStatus) return;

    try {
      await api.post(`/delivery/${record.id}/transition`, {
        status: nextStatus,
        notes: nextStatus === 'DELIVERED' ? 'Delivered to customer' : `Moved to ${nextStatus.replace(/_/g, ' ')}`,
      });
      message.success(`Delivery moved to ${nextStatus.replace(/_/g, ' ')}`);
      setDetail(null);
      fetchDeliveries();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update delivery');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Delivery Fulfillment</Title>
          <Text type="secondary">Manage picking, packing, dispatch, and delivery confirmation</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchDeliveries}>Refresh</Button>
      </div>

      <Card className="glass-card" variant="borderless" style={{ marginBottom: 20 }}>
        <Space wrap>
          <Input
            placeholder="Search delivery, order, or customer..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
            style={{ width: 300 }}
          />
          <Select value={status || 'all'} style={{ width: 200 }} onChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
            <Select.Option value="all">All Statuses</Select.Option>
            {Object.keys(STATUS_COLOR).map((s) => <Select.Option key={s} value={s}>{s.replace(/_/g, ' ')}</Select.Option>)}
          </Select>
        </Space>
      </Card>

      <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
        <Table
          loading={loading}
          dataSource={deliveries.map((d) => ({ ...d, key: d.id }))}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
          scroll={{ x: 1150 }}
          columns={[
            { title: 'Delivery #', dataIndex: 'deliveryNumber', render: (v) => <Text code strong>{v}</Text> },
            { title: 'Order', render: (_, r) => <Text>{r.order?.orderNumber}</Text> },
            { title: 'Customer', render: (_, r) => <div><Text strong>{r.order?.customer?.name}</Text><br /><Text type="secondary">{r.order?.customer?.code}</Text></div> },
            { title: 'Branch', render: (_, r) => <Text>{r.order?.branch?.name}</Text> },
            { title: 'Delivery Status', dataIndex: 'status', render: (s) => <Tag color={STATUS_COLOR[s]}>{s.replace(/_/g, ' ')}</Tag> },
            { title: 'Order Status', render: (_, r) => <Tag>{r.order?.status?.replace(/_/g, ' ')}</Tag> },
            { title: 'Amount', render: (_, r) => <Text strong>{Number(r.order?.totalAmount || 0).toLocaleString()} {CURRENCY.symbol}</Text> },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Button type="link" icon={<EyeOutlined />} onClick={() => setDetail(r)}>View</Button>
                  {NEXT_STATUS[r.status] && (
                    <Button type="link" icon={<CheckCircleOutlined />} onClick={() => moveNext(r)}>
                      {NEXT_STATUS[r.status].replace(/_/g, ' ')}
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        open={!!detail}
        onCancel={() => setDetail(null)}
        title={detail?.deliveryNumber}
        footer={
          detail ? (
            <Space>
              {NEXT_STATUS[detail.status] && <Button type="primary" onClick={() => moveNext(detail)}>Move to {NEXT_STATUS[detail.status].replace(/_/g, ' ')}</Button>}
              <Button onClick={() => setDetail(null)}>Close</Button>
            </Space>
          ) : null
        }
        width={760}
      >
        {detail && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Order">{detail.order.orderNumber}</Descriptions.Item>
              <Descriptions.Item label="Customer">{detail.order.customer.name}</Descriptions.Item>
              <Descriptions.Item label="Branch">{detail.order.branch.name}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status.replace(/_/g, ' ')}</Tag></Descriptions.Item>
              <Descriptions.Item label="Delivered At">{detail.deliveredAt ? new Date(detail.deliveredAt).toLocaleString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Notes">{detail.notes || '-'}</Descriptions.Item>
            </Descriptions>
            {(() => {
              const splitDeliveryItems: any[] = [];
              if (detail?.order?.items) {
                detail.order.items.forEach((item: any) => {
                  if (item.quantity > 0) {
                    splitDeliveryItems.push({
                      key: `${item.id}-charge`,
                      name: item.product.name,
                      sku: item.product.sku,
                      qty: item.quantity,
                      type: 'Charge',
                      batchNumber: item.batchNumber,
                    });
                  }
                  if (item.focQty && item.focQty > 0) {
                    splitDeliveryItems.push({
                      key: `${item.id}-foc`,
                      name: item.product.name,
                      sku: item.product.sku,
                      qty: item.focQty,
                      type: 'FOC',
                      batchNumber: item.batchNumber,
                    });
                  }
                  if (item.sampleQty && item.sampleQty > 0) {
                    splitDeliveryItems.push({
                      key: `${item.id}-sample`,
                      name: item.product.name,
                      sku: item.product.sku,
                      qty: item.sampleQty,
                      type: 'Sample',
                      batchNumber: item.batchNumber,
                    });
                  }
                });
              }

              return (
                <Table
                  size="small"
                  pagination={false}
                  dataSource={splitDeliveryItems}
                  columns={[
                    { title: 'Product', render: (_, r) => <div><Text strong>{r.name}</Text><br /><Text type="secondary">{r.sku}</Text></div> },
                    { title: 'Type', dataIndex: 'type', key: 'type', width: 90, render: (t: string) => (
                      <Tag color={t === 'Charge' ? 'blue' : t === 'FOC' ? 'pink' : 'purple'} style={{ border: 'none', borderRadius: '6px', fontWeight: 600 }}>
                        {t}
                      </Tag>
                    )},
                    { title: 'Qty', dataIndex: 'qty', width: 80 },
                    { title: 'Batch', dataIndex: 'batchNumber', render: (v) => v || '-' },
                  ]}
                />
              );
            })()}
          </>
        )}
      </Modal>
    </div>
  );
};
