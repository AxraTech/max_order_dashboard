import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Space, Button, Modal,
  Descriptions, Input, Select, message, Popconfirm, Tooltip
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, EyeOutlined, CloseCircleOutlined,
  CheckCircleOutlined, DollarOutlined
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

interface ExchangeItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchNumber: string | null;
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
  settlementType: 'REFUND_CASH' | 'EXCHANGE_PRODUCT';
  refundStatus: 'PENDING' | 'COMPLETED' | 'N_A';
  refundMethod: string | null;
  refundNotes: string | null;
  customer: { name: string; code: string };
  branch: { name: string; code: string };
  creator: { firstName: string; lastName: string };
  approver: { firstName: string; lastName: string } | null;
  items: ReturnItem[];
  exchangeItems?: ExchangeItem[];
  order: { orderNumber: string } | null;
  invoice: { invoiceNumber: string } | null;
  replacementOrder: { id: string; orderNumber: string; status: string; totalAmount: number } | null;
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

  // Disburse Refund State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundMethod, setRefundMethod] = useState('CASH');
  const [refundNotes, setRefundNotes] = useState('');
  const [disburseLoading, setDisburseLoading] = useState(false);

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

  const handleDisburseRefund = async () => {
    if (!detailReturn) return;
    try {
      setDisburseLoading(true);
      const res = await api.post(`/sales-returns/${detailReturn.id}/disburse-refund`, {
        refundMethod,
        refundNotes: refundNotes || undefined,
      });
      if (res.data.success) {
        message.success('Cash refund successfully recorded as disbursed');
        setRefundModalOpen(false);
        setRefundNotes('');
        handleViewDetail(detailReturn.id);
        fetchReturns();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to disburse refund');
    } finally {
      setDisburseLoading(false);
    }
  };

  const isManager = user && ['SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER'].includes(user.role.name);
  const isFinanceOrManager = user && ['SUPER_ADMIN', 'HQ_MANAGER', 'BRANCH_MANAGER', 'FINANCE_OFFICER'].includes(user.role.name);

  const columns = [
    {
      title: 'Return #',
      dataIndex: 'returnNumber',
      key: 'returnNumber',
      width: 130,
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
      title: 'Settlement',
      key: 'settlementType',
      width: 170,
      render: (_: any, record: ReturnRecord) => (
        <div>
          {record.settlementType === 'EXCHANGE_PRODUCT' ? (
            <Space direction="vertical" size={2}>
              <Tag color="cyan" style={{ fontWeight: 600 }}>🔄 Product Exchange</Tag>
              {record.replacementOrder && (
                <Tag color="blue" style={{ fontSize: '11px' }}>
                  Ord: {record.replacementOrder.orderNumber}
                </Tag>
              )}
            </Space>
          ) : (
            <Space direction="vertical" size={2}>
              <Tag color="gold" style={{ fontWeight: 600 }}>💵 Cash Refund</Tag>
              {record.refundStatus === 'COMPLETED' ? (
                <Tag color="green" style={{ fontSize: '11px' }}>Completed</Tag>
              ) : (
                <Tag color="orange" style={{ fontSize: '11px' }}>Pending Payout</Tag>
              )}
            </Space>
          )}
        </div>
      ),
    },
    {
      title: 'Branch',
      dataIndex: ['branch', 'name'],
      key: 'branch',
      width: 140,
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
      width: 120,
      render: (date: string) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Total Value',
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
      width: 110,
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
          <Text type="secondary">Review and approve customer returns, cash refunds, and product exchanges</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => fetchReturns()}>
          Refresh
        </Button>
      </div>

      <Card>
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            placeholder="Search by Return Number or Customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '320px' }}
            allowClear
          />
          <Select
            placeholder="Filter by Status"
            value={statusFilter || undefined}
            onChange={(val) => setStatusFilter(val || '')}
            style={{ width: '220px' }}
            allowClear
          >
            <Select.Option value="REQUESTED">Requested (Pending Approval)</Select.Option>
            <Select.Option value="APPROVED">Approved</Select.Option>
            <Select.Option value="REJECTED">Rejected</Select.Option>
            <Select.Option value="CANCELLED">Cancelled</Select.Option>
          </Select>
        </div>

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
        width={850}
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
              description={
                detailReturn.settlementType === 'EXCHANGE_PRODUCT'
                  ? "This will restock returned inventory, deduct replacement items from warehouse stock, and create a paid Replacement Order (0 MMK balance) ready for delivery."
                  : "This will restock returned inventory, auto-offset unpaid invoice balance if applicable, generate a Credit Note invoice, and record pending cash refund."
              }
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
          ] : detailReturn?.status === 'APPROVED' && detailReturn?.settlementType === 'REFUND_CASH' && detailReturn?.refundStatus === 'PENDING' && isFinanceOrManager ? [
            <Button
              key="disburse"
              type="primary"
              style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b' }}
              icon={<DollarOutlined />}
              onClick={() => setRefundModalOpen(true)}
            >
              Disburse Cash Refund
            </Button>,
            <Button key="close" onClick={() => setDetailOpen(false)}>Close</Button>
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
              <Descriptions.Item label="Settlement Way">
                {detailReturn.settlementType === 'EXCHANGE_PRODUCT' ? (
                  <Tag color="cyan" style={{ fontWeight: 600 }}>🔄 Product Exchange</Tag>
                ) : (
                  <Tag color="gold" style={{ fontWeight: 600 }}>💵 Cash Refund / Credit Note</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Settlement Status">
                {detailReturn.settlementType === 'EXCHANGE_PRODUCT' ? (
                  detailReturn.replacementOrder ? (
                    <Tag color="blue">Order: {detailReturn.replacementOrder.orderNumber}</Tag>
                  ) : <Tag color="default">Pending Replacement Dispatch</Tag>
                ) : (
                  detailReturn.refundStatus === 'COMPLETED' ? (
                    <Tag color="green">Refund Completed ({detailReturn.refundMethod || 'Disbursed'})</Tag>
                  ) : (
                    <Tag color="orange">Pending Cash Refund Payout</Tag>
                  )
                )}
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
              {detailReturn.refundNotes && (
                <Descriptions.Item label="Settlement Notes" span={2}>
                  <Text type="secondary">{detailReturn.refundNotes}</Text>
                </Descriptions.Item>
              )}
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

            {/* Exchange Replacement Items Table */}
            {detailReturn.settlementType === 'EXCHANGE_PRODUCT' && detailReturn.exchangeItems && detailReturn.exchangeItems.length > 0 && (
              <div>
                <Title level={5} style={{ marginBottom: '12px', fontWeight: 600, color: '#0284c7' }}>
                  🔄 Replacement Products (Customer Receives)
                </Title>
                <Table
                  dataSource={detailReturn.exchangeItems}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Replacement Product',
                      key: 'product',
                      render: (_: any, item: ExchangeItem) => (
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                          <Text type="secondary" style={{ fontSize: '11px' }}>SKU: {item.product.sku}</Text>
                        </div>
                      ),
                    },
                    {
                      title: 'Batch',
                      dataIndex: 'batchNumber',
                      render: (bn) => bn ? <Text code>{bn}</Text> : 'Auto-allocated',
                    },
                    {
                      title: 'Quantity',
                      dataIndex: 'quantity',
                      align: 'right',
                    },
                    {
                      title: 'Unit Price',
                      dataIndex: 'unitPrice',
                      align: 'right',
                      render: (p) => `${Number(p).toLocaleString()} ${CURRENCY.symbol}`,
                    },
                    {
                      title: 'Total Price',
                      dataIndex: 'totalPrice',
                      align: 'right',
                      render: (p) => `${Number(p).toLocaleString()} ${CURRENCY.symbol}`,
                    },
                  ]}
                />
              </div>
            )}

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
                  <Text style={{ fontWeight: 700 }}>Total Value:</Text>
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

      {/* Disburse Cash Refund Modal */}
      <Modal
        title={
          <div style={{ fontSize: '18px', fontWeight: 700 }}>
            Disburse Cash Refund - <Text code>{detailReturn?.returnNumber}</Text>
          </div>
        }
        open={refundModalOpen}
        onOk={handleDisburseRefund}
        onCancel={() => setRefundModalOpen(false)}
        confirmLoading={disburseLoading}
        okText="Confirm Disbursal"
        okButtonProps={{ style: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' } }}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: '12px' }} size="middle">
          <div style={{ background: '#fef3c7', padding: '12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <Text type="secondary">Refund Amount to Customer:</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#b45309' }}>
              {Number(detailReturn?.totalAmount || 0).toLocaleString()} {CURRENCY.symbol}
            </div>
            <Text style={{ fontSize: '12px', color: '#78350f' }}>
              Customer: {detailReturn?.customer.name}
            </Text>
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Disbursal Method</Text>
            <Select
              value={refundMethod}
              onChange={setRefundMethod}
              style={{ width: '100%' }}
              options={[
                { value: 'CASH', label: 'Cash (Drawer Payout)' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'MOBILE_BANKING', label: 'Mobile Banking (KBZPay / WavePay)' },
                { value: 'CHEQUE', label: 'Cheque' },
              ]}
            />
          </div>

          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Disbursal Reference / Voucher Notes</Text>
            <Input.TextArea
              rows={3}
              placeholder="e.g. Cash voucher #1209 or Bank transaction ref..."
              value={refundNotes}
              onChange={(e) => setRefundNotes(e.target.value)}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};
