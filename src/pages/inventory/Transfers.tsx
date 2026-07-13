import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Space, Button, Modal,
  Descriptions, Input, Select, message, Popconfirm,
  Form, InputNumber, Row, Col, Divider
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, CloseCircleOutlined,
  CheckCircleOutlined, PlusOutlined, ArrowRightOutlined,
  SendOutlined, InboxOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'default',
  APPROVED: 'blue',
  IN_TRANSIT: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'error',
};

interface TransferItem {
  id: string;
  productId: string;
  quantity: number;
  batchNumber: string | null;
  product: { name: string; sku: string; uom: string };
}

interface WarehouseInfo {
  id: string;
  code: string;
  name: string;
  branchId: string;
  branch: { id: string; name: string };
}

interface TransferRecord {
  id: string;
  transferNumber: string;
  status: 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  sourceWarehouse: WarehouseInfo;
  destinationWarehouse: WarehouseInfo;
  creator: { firstName: string; lastName: string; email: string };
  approver: { firstName: string; lastName: string } | null;
  items: TransferItem[];
  createdAt: string;
}

export const Transfers: React.FC = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals & form state
  const [detailTransfer, setDetailTransfer] = useState<TransferRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [sourceWarehouses, setSourceWarehouses] = useState<WarehouseInfo[]>([]);
  const [destWarehouses, setDestWarehouses] = useState<WarehouseInfo[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchTransfers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/transfers', {
        params: {
          page,
          limit: pageSize,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      if (res.data.success) {
        setTransfers(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  const fetchWarehousesAndProducts = async () => {
    try {
      const isBranchUser = ['BRANCH_MANAGER', 'INVENTORY_OFFICER'].includes(user?.role?.name || '');
      
      const [allWhRes, scopedWhRes, prodRes] = await Promise.all([
        api.get('/inventory/warehouses', { params: { all: true } }),
        isBranchUser && user?.branch?.id 
          ? api.get('/inventory/warehouses', { params: { branchId: user.branch.id } })
          : null,
        api.get('/products', { params: { limit: 100 } }),
      ]);

      if (allWhRes.data.success) {
        setSourceWarehouses(allWhRes.data.data);
        if (!isBranchUser || !user?.branch?.id) {
          setDestWarehouses(allWhRes.data.data);
        }
      }

      if (scopedWhRes && scopedWhRes.data.success) {
        setDestWarehouses(scopedWhRes.data.data);
      }

      if (prodRes.data.success) setProducts(prodRes.data.data);
    } catch (err) {
      console.error('Failed to load selector options:', err);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  useEffect(() => {
    if (requestOpen) {
      fetchWarehousesAndProducts();
    }
  }, [requestOpen]);

  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/inventory/transfers/${id}`);
      if (res.data.success) {
        setDetailTransfer(res.data.data);
        setDetailOpen(true);
      }
    } catch {
      message.error('Failed to load transfer details');
    }
  };

  const handleStatusTransition = async (id: string, newStatus: string, reason?: string) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/inventory/transfers/${id}/transition`, { status: newStatus, reason });
      if (res.data.success) {
        message.success(`Transfer updated to ${newStatus}`);
        fetchTransfers();
        if (detailOpen) setDetailOpen(false);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update transfer status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRequest = async (values: any) => {
    try {
      setSubmitting(true);
      const res = await api.post('/inventory/transfers', values);
      if (res.data.success) {
        message.success('Stock transfer requested successfully');
        setRequestOpen(false);
        form.resetFields();
        fetchTransfers();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to request transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const isBranchUser = ['BRANCH_MANAGER', 'INVENTORY_OFFICER'].includes(user?.role?.name || '');
  const userBranchId = user?.branch?.id;

  const showApproveButton = (record: TransferRecord) => {
    if (record.status !== 'REQUESTED') return false;
    if (!isBranchUser) return true; // Super admin / HQ
    return record.sourceWarehouse?.branchId === userBranchId || record.destinationWarehouse?.branchId === userBranchId;
  };

  const showDispatchButton = (record: TransferRecord) => {
    if (record.status !== 'APPROVED') return false;
    if (!isBranchUser) return true; // Super admin / HQ
    return record.sourceWarehouse?.branchId === userBranchId || record.destinationWarehouse?.branchId === userBranchId;
  };

  const showCompleteButton = (record: TransferRecord) => {
    if (record.status !== 'IN_TRANSIT') return false;
    if (!isBranchUser) return true; // Super admin / HQ
    return record.sourceWarehouse?.branchId === userBranchId || record.destinationWarehouse?.branchId === userBranchId;
  };

  const showCancelButton = (record: TransferRecord) => {
    if (!['REQUESTED', 'APPROVED'].includes(record.status)) return false;
    if (!isBranchUser) return true;
    return record.sourceWarehouse?.branchId === userBranchId || record.destinationWarehouse?.branchId === userBranchId;
  };

  const columns = [
    {
      title: 'Transfer #',
      dataIndex: 'transferNumber',
      key: 'transferNumber',
      render: (num: string) => <Text code style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{num}</Text>,
    },
    {
      title: 'Source Warehouse',
      key: 'sourceWarehouse',
      render: (_: any, r: TransferRecord) => (
        <div>
          <Text strong>{r.sourceWarehouse?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>{r.sourceWarehouse?.branch?.name}</Text>
        </div>
      ),
    },
    {
      title: 'Direction',
      key: 'direction',
      render: () => <ArrowRightOutlined style={{ color: '#9CA3AF' }} />,
      align: 'center' as const,
      width: 60,
    },
    {
      title: 'Destination Warehouse',
      key: 'destinationWarehouse',
      render: (_: any, r: TransferRecord) => (
        <div>
          <Text strong>{r.destinationWarehouse?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>{r.destinationWarehouse?.branch?.name}</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s] || 'default'} style={{ border: 'none', borderRadius: '10px', fontWeight: 600 }}>
          {s.replace(/_/g, ' ')}
        </Tag>
      ),
    },
    {
      title: 'Requested By',
      key: 'creator',
      render: (_: any, r: TransferRecord) => <Text>{r.creator?.firstName} {r.creator?.lastName}</Text>,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (d: string) => dayjs(d).format('DD MMM YYYY, HH:mm'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, r: TransferRecord) => (
        <Space size="small">
          <Button type="link" icon={<EyeOutlined />} onClick={() => handleViewDetail(r.id)} style={{ padding: '0 4px' }}>
            View
          </Button>
          {showApproveButton(r) && (
            <Popconfirm
              title="Approve this stock request?"
              onConfirm={() => handleStatusTransition(r.id, 'APPROVED', 'Approved by warehouse manager')}
              okText="Approve"
            >
              <Button type="link" icon={<CheckCircleOutlined />} style={{ padding: '0 4px', color: '#10B981' }}>
                Approve
              </Button>
            </Popconfirm>
          )}
          {showDispatchButton(r) && (
            <Popconfirm
              title="Mark items as dispatched in transit?"
              onConfirm={() => handleStatusTransition(r.id, 'IN_TRANSIT', 'Dispatched from source warehouse')}
              okText="Dispatch"
            >
              <Button type="link" icon={<SendOutlined />} style={{ padding: '0 4px', color: '#F59E0B' }}>
                Dispatch
              </Button>
            </Popconfirm>
          )}
          {showCompleteButton(r) && (
            <Popconfirm
              title="Confirm receipt of all stock?"
              onConfirm={() => handleStatusTransition(r.id, 'COMPLETED', 'Received and verified')}
              okText="Complete"
            >
              <Button type="link" icon={<InboxOutlined />} style={{ padding: '0 4px', color: '#10B981' }}>
                Complete
              </Button>
            </Popconfirm>
          )}
          {showCancelButton(r) && (
            <Popconfirm
              title="Cancel this stock transfer?"
              onConfirm={() => handleStatusTransition(r.id, 'CANCELLED', 'Cancelled by manager')}
              okText="Cancel" okButtonProps={{ danger: true }}
            >
              <Button type="link" danger icon={<CloseCircleOutlined />} style={{ padding: '0 4px' }}>
                Cancel
              </Button>
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
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Inter-Branch Stock Transfers</Title>
          <Text type="secondary">Manage inventory transfers, approvals, and FEFO routing between regional branches</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchTransfers} style={{ borderRadius: '12px' }}>Refresh</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setRequestOpen(true)}
            style={{ borderRadius: '12px' }}
          >
            New Transfer Request
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Space wrap>
          <Input
            placeholder="Search transfer code or warehouse..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 280, borderRadius: '12px' }}
            allowClear
          />
          <Select
            value={statusFilter || 'all'}
            style={{ width: 180, borderRadius: '12px' }}
            onChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            {Object.keys(STATUS_COLOR).map((s) => (
              <Select.Option key={s} value={s}>{s.replace(/_/g, ' ')}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* List Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={transfers.map((t) => ({ ...t, key: t.id }))}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => { setPage(p); setPageSize(s); },
            style: { padding: '16px' },
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* Request Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>Request Stock Transfer</span>}
        open={requestOpen}
        onCancel={() => { setRequestOpen(false); form.resetFields(); }}
        footer={null}
        width={700}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRequest}
          style={{ marginTop: '20px' }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="sourceWarehouseId"
                label="Source Warehouse (Exporting)"
                rules={[{ required: true, message: 'Please select exporting warehouse!' }]}
              >
                <Select placeholder="Select source warehouse">
                  {sourceWarehouses.map((wh) => (
                    <Select.Option key={wh.id} value={wh.id}>{wh.name} ({wh.branch.name})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="destinationWarehouseId"
                label="Destination Warehouse (Importing)"
                rules={[{ required: true, message: 'Please select importing warehouse!' }]}
              >
                <Select placeholder="Select destination warehouse">
                  {destWarehouses.map((wh) => (
                    <Select.Option key={wh.id} value={wh.id}>{wh.name} ({wh.branch.name})</Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />
          <Text strong>Transfer Items Selection</Text>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <div style={{ marginTop: '12px' }}>
                {fields.map(({ key, name, ...restField }) => (
                  <Row gutter={16} key={key} align="middle" style={{ marginBottom: '12px' }}>
                    <Col span={14}>
                      <Form.Item
                        {...restField}
                        name={[name, 'productId']}
                        rules={[{ required: true, message: 'Select product!' }]}
                        style={{ marginBottom: 0 }}
                      >
                        <Select
                          showSearch
                          placeholder="Select product"
                          optionFilterProp="children"
                          options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        {...restField}
                        name={[name, 'quantity']}
                        rules={[
                          { required: true, message: 'Enter qty!' },
                          { type: 'number', min: 1, message: 'Min is 1' }
                        ]}
                        style={{ marginBottom: 0 }}
                      >
                        <InputNumber style={{ width: '100%' }} placeholder="Qty" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button type="text" danger onClick={() => remove(name)} icon={<CloseCircleOutlined />} />
                    </Col>
                  </Row>
                ))}
                <Form.Item style={{ marginTop: '12px' }}>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Product Line
                  </Button>
                </Form.Item>
              </div>
            )}
          </Form.List>

          <Form.Item name="notes" label="Transfer Purpose / Internal Notes">
            <Input.TextArea rows={2} placeholder="Explain why this transfer is needed..." />
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Request</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <Text strong style={{ fontSize: '18px' }}>Transfer Request {detailTransfer?.transferNumber}</Text>
            {detailTransfer && (
              <Tag color={STATUS_COLOR[detailTransfer.status]} style={{ border: 'none', borderRadius: '10px', fontWeight: 600 }}>
                {detailTransfer.status.replace(/_/g, ' ')}
              </Tag>
            )}
          </Space>
        }
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={
          detailTransfer ? (
            <Space>
              {showApproveButton(detailTransfer) && (
                <Popconfirm
                  title="Approve this stock request and reserve batches?"
                  onConfirm={() => handleStatusTransition(detailTransfer.id, 'APPROVED', 'Approved by warehouse manager')}
                >
                  <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading}>
                    Approve Request
                  </Button>
                </Popconfirm>
              )}
              {showDispatchButton(detailTransfer) && (
                <Popconfirm
                  title="Mark items as dispatched in transit?"
                  onConfirm={() => handleStatusTransition(detailTransfer.id, 'IN_TRANSIT', 'Dispatched from source warehouse')}
                >
                  <Button type="primary" icon={<SendOutlined />} loading={actionLoading} style={{ background: '#F59E0B', borderColor: '#F59E0B' }}>
                    Dispatch Stock
                  </Button>
                </Popconfirm>
              )}
              {showCompleteButton(detailTransfer) && (
                <Popconfirm
                  title="Confirm receipt of all transferred stock batches?"
                  onConfirm={() => handleStatusTransition(detailTransfer.id, 'COMPLETED', 'Received and verified')}
                >
                  <Button type="primary" icon={<InboxOutlined />} loading={actionLoading} style={{ background: '#10B981', borderColor: '#10B981' }}>
                    Confirm Delivery
                  </Button>
                </Popconfirm>
              )}
              {showCancelButton(detailTransfer) && (
                <Popconfirm
                  title="Cancel this stock transfer?"
                  onConfirm={() => handleStatusTransition(detailTransfer.id, 'CANCELLED', 'Cancelled by manager')}
                  okText="Cancel Transfer" okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>
                    Cancel Transfer
                  </Button>
                </Popconfirm>
              )}
              <Button onClick={() => setDetailOpen(false)}>Close</Button>
            </Space>
          ) : null
        }
        width={720}
        destroyOnHidden
      >
        {detailTransfer && (
          <>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: '20px', marginTop: '16px' }}>
              <Descriptions.Item label="Source Warehouse">{detailTransfer.sourceWarehouse?.name} ({detailTransfer.sourceWarehouse?.branch?.name})</Descriptions.Item>
              <Descriptions.Item label="Destination Warehouse">{detailTransfer.destinationWarehouse?.name} ({detailTransfer.destinationWarehouse?.branch?.name})</Descriptions.Item>
              <Descriptions.Item label="Requested By">{detailTransfer.creator?.firstName} {detailTransfer.creator?.lastName} ({detailTransfer.creator?.email})</Descriptions.Item>
              <Descriptions.Item label="Approver">{detailTransfer.approver ? `${detailTransfer.approver.firstName} ${detailTransfer.approver.lastName}` : '—'}</Descriptions.Item>
              <Descriptions.Item label="Date Requested">{dayjs(detailTransfer.createdAt).format('DD MMM YYYY, HH:mm:ss')}</Descriptions.Item>
              <Descriptions.Item label="Notes" span={2}>{detailTransfer.notes || '-'}</Descriptions.Item>
            </Descriptions>

            <Title level={5} style={{ marginBottom: '10px' }}>Transferred Medicine Lines</Title>
            <Table
              size="small"
              dataSource={detailTransfer.items.map((i) => ({ ...i, key: i.id }))}
              columns={[
                { title: 'Product Name', render: (_, r) => <div><Text strong>{r.product.name}</Text><br /><Text type="secondary" style={{ fontSize: '11px' }}>SKU: {r.product.sku}</Text></div> },
                { title: 'UOM', dataIndex: ['product', 'uom'] },
                { title: 'Qty Requested', dataIndex: 'quantity', render: (v) => <strong>{v}</strong> },
                { title: 'Assigned Batch', dataIndex: 'batchNumber', render: (v) => v ? <Text code>{v}</Text> : <Text type="secondary">Not allocated yet</Text> },
              ]}
              pagination={false}
            />
          </>
        )}
      </Modal>
    </div>
  );
};
export default Transfers;

