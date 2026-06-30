import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Space, Button, Modal,
  Descriptions, Input, Select, message, Popconfirm, Tooltip
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, CloseCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import { useAuthStore } from '../../store/auth.store';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  REQUESTED: 'processing',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
};

const CONDITION_COLOR: Record<string, string> = {
  REUSABLE: 'green',
  DAMAGED: 'orange',
  EXPIRED: 'volcano',
};

interface ReturnItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber: string | null;
  condition: string;
  product: { name: string; sku: string };
}

interface ReturnRecord {
  id: string;
  returnNumber: string;
  status: string;
  returnDate: string;
  reason: string | null;
  totalAmount: number;
  subtotal: number;
  tax: number;
  customer: { name: string; code: string };
  branch: { name: string; code: string };
  creator: { firstName: string; lastName: string };
  approver: { firstName: string; lastName: string } | null;
  items: ReturnItem[];
  order: { orderNumber: string } | null;
  invoice: { invoiceNumber: string } | null;
}

export const SalesReturns: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detailReturn, setDetailReturn] = useState<ReturnRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  const { user } = useAuthStore();

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/sales-returns', {
        params: {
          page,
          limit: pageSize,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      if (res.data.success) {
        setReturns(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err) {
      message.error('Failed to fetch sales returns');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/sales-returns/${id}`);
      if (res.data.success) {
        setDetailReturn(res.data.data);
        setDetailOpen(true);
      }
    } catch {
      message.error('Failed to load return details');
    }
  };

  const handleStatusTransition = async (id: string, newStatus: string, reason?: string) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/sales-returns/${id}/transition`, { status: newStatus, reason });
      if (res.data.success) {
        message.success(`Sales return successfully ${newStatus.toLowerCase()}`);
        fetchReturns();
        setDetailOpen(false);
        setRejectModalOpen(false);
        setRejectReason('');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update return status');
    } finally {
      setActionLoading(false);
    }
  };

  const isManager = user && ['SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER'].includes(user.role.name);

  const columns = [
    {
      title: 'Return #',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      width: 140,
      render: (num: string) => <Text code style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{num}</Text>,
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_: any, record: ReturnRecord) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.customer.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.customer.code}</Text>
        </div>
      ),
    },
    {
      title: 'Branch',
      dataIndex: ['branch', 'name'],
      key: 'branch',
      width: 150,
    },
    {
      title: 'Reference',
      key: 'reference',
      render: (_: any, record: ReturnRecord) => (
        <Space direction="vertical" size={0}>
          {record.invoice && <Tag color="blue">Inv: {record.invoice.invoiceNumber}</Tag>}
          {record.order && <Tag color="cyan">Ord: {record.order.orderNumber}</Tag>}
          {!record.invoice && !record.order && <Text type="secondary">N/A</Text>}
        </Space>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'returnDate',
      key: 'returnDate',
      width: 130,
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Refund Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      align: 'right' as const,
      width: 140,
      render: (amt: number) => (
        <Text style={{ fontWeight: 600 }}>
          {Number(amt).toLocaleString()} {CURRENCY.symbol}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status]} style={{ fontWeight: 600 }}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: ReturnRecord) => (
        <Tooltip title="View Details">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetail(record.id)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>Sales Returns</Title>
          <Text type="secondary">Process medicine return requests and manage credit note generation</Text>
        </div>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={fetchReturns}
        />
      </div>

      <Card className="glass-panel" style={{ border: '1px solid var(--glass-border)' }}>
        <Space style={{ marginBottom: 16 }} size="middle" wrap>
          <Input
            placeholder="Search return # or customer..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
            onPressEnter={fetchReturns}
          />
          <Select
            placeholder="Filter Status"
            allowClear
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            style={{ width: 150 }}
          >
            <Select.Option value="REQUESTED">Requested</Select.Option>
            <Select.Option value="APPROVED">Approved</Select.Option>
            <Select.Option value="REJECTED">Rejected</Select.Option>
            <Select.Option value="CANCELLED">Cancelled</Select.Option>
          </Select>
          <Button type="primary" onClick={fetchReturns}>Apply Filters</Button>
          <Button onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>Reset</Button>
        </Space>

        <Table
          dataSource={returns}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            onChange: (p, ps) => { setPage(p); setPageSize(ps || 10); },
            showSizeChanger: true,
          }}
        />
      </Card>

      {/* Return Details Modal */}
      <Modal
        title={
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            Sales Return Details - <Text code>{detailReturn?.returnNumber}</Text>
          </div>
        }
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        width={750}
        footer={
          detailReturn?.status === 'REQUESTED' && isManager ? [
            <Button
              key="reject"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => setRejectModalOpen(true)}
              loading={actionLoading}
            >
              Reject Return
            </Button>,
            <Popconfirm
              key="approve"
              title="Approve Sales Return?"
              description="This will add items back to inventory stock, decrement customer outstanding balance, and generate a Credit Note invoice."
              onConfirm={() => handleStatusTransition(detailReturn.id, 'APPROVED')}
              okText="Yes, Approve"
              cancelText="Cancel"
            >
              <Button
                type="primary"
                style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
                icon={<CheckCircleOutlined />}
                loading={actionLoading}
              >
                Approve Return
              </Button>
            </Popconfirm>
          ] : [
            <Button key="close" onClick={() => setDetailOpen(false)}>Close</Button>
          ]
        }
      >
        {detailReturn && (
          <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '16px' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Return Date">
                {dayjs(detailReturn.returnDate).format('DD MMMM YYYY, hh:mm A')}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLOR[detailReturn.status]} style={{ fontWeight: 600 }}>
                  {detailReturn.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                <div>{detailReturn.customer.name} ({detailReturn.customer.code})</div>
              </Descriptions.Item>
              <Descriptions.Item label="Branch">
                {detailReturn.branch.name}
              </Descriptions.Item>
              <Descriptions.Item label="Order Link">
                {detailReturn.order?.orderNumber ? <Text code>{detailReturn.order.orderNumber}</Text> : 'None'}
              </Descriptions.Item>
              <Descriptions.Item label="Invoice Link">
                {detailReturn.invoice?.invoiceNumber ? <Text code>{detailReturn.invoice.invoiceNumber}</Text> : 'None'}
              </Descriptions.Item>
              <Descriptions.Item label="Created By">
                {detailReturn.creator.firstName} {detailReturn.creator.lastName}
              </Descriptions.Item>
              <Descriptions.Item label="Approved/Processed By">
                {detailReturn.approver ? `${detailReturn.approver.firstName} ${detailReturn.approver.lastName}` : 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Return Reason" span={2}>
                {detailReturn.reason || <Text type="secondary">No reason provided</Text>}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Title level={5} style={{ marginBottom: '12px', fontWeight: 600 }}>Returned Items</Title>
              <Table
                dataSource={detailReturn.items}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Product',
                    key: 'product',
                    render: (_: any, item: ReturnItem) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                        <Text type="secondary" style={{ fontSize: '11px' }}>SKU: {item.product.sku}</Text>
                      </div>
                    ),
                  },
                  {
                    title: 'Batch Number',
                    dataIndex: 'batchNumber',
                    key: 'batchNumber',
                    render: (bn) => bn ? <Text code>{bn}</Text> : <Text type="secondary">N/A</Text>,
                  },
                  {
                    title: 'Quantity',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    align: 'right',
                  },
                  {
                    title: 'Unit Price',
                    dataIndex: 'unitPrice',
                    key: 'unitPrice',
                    align: 'right',
                    render: (p) => `${Number(p).toLocaleString()} ${CURRENCY.symbol}`,
                  },
                  {
                    title: 'Total Price',
                    dataIndex: 'totalPrice',
                    key: 'totalPrice',
                    align: 'right',
                    render: (p) => `${Number(p).toLocaleString()} ${CURRENCY.symbol}`,
                  },
                  {
                    title: 'Condition',
                    dataIndex: 'condition',
                    key: 'condition',
                    render: (cond) => (
                      <Tag color={CONDITION_COLOR[cond]} style={{ fontWeight: 600 }}>
                        {cond}
                      </Tag>
                    ),
                  },
                ]}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Subtotal:</Text>
                  <Text>{Number(detailReturn.subtotal).toLocaleString()} {CURRENCY.symbol}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary">Tax (5%):</Text>
                  <Text>{Number(detailReturn.tax).toLocaleString()} {CURRENCY.symbol}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>
                  <Text style={{ fontWeight: 700 }}>Total Refund:</Text>
                  <Text style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                    {Number(detailReturn.totalAmount).toLocaleString()} {CURRENCY.symbol}
                  </Text>
                </div>
              </div>
            </div>
          </Space>
        )}
      </Modal>

      {/* Reject Reason input modal */}
      <Modal
        title="Reject Return Request"
        open={rejectModalOpen}
        onOk={() => {
          if (!rejectReason.trim()) {
            message.warning('Please enter a reason for rejection');
            return;
          }
          if (detailReturn) {
            handleStatusTransition(detailReturn.id, 'REJECTED', rejectReason);
          }
        }}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectReason('');
        }}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: '12px' }}>
          <Text>Please provide a reason for rejecting the sales return request:</Text>
          <Input.TextArea
            rows={4}
            placeholder="E.g., Medicine matches expired condition but returned quantity is incorrect..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </Space>
      </Modal>
    </div>
  );
};
