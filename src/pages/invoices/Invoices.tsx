import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Descriptions, Dropdown, Form, Input, InputNumber, message, Modal,
  Select, Space, Table, Tag, Typography, Divider, Badge, DatePicker, Popconfirm, Row, Col, Empty,
} from 'antd';
import {
  DollarOutlined, EyeOutlined, ReloadOutlined, SendOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  FilePdfOutlined, BankOutlined, MoreOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  DRAFT: { color: 'default', label: 'Draft' },
  PENDING_APPROVAL: { color: 'warning', label: 'Pending Approval' },
  APPROVED: { color: 'cyan', label: 'Approved' },
  SENT: { color: 'blue', label: 'Sent' },
  PARTIALLY_PAID: { color: 'purple', label: 'Partially Paid' },
  PAID: { color: 'green', label: 'Paid' },
  OVERDUE: { color: 'red', label: 'Overdue' },
  CANCELLED: { color: 'default', label: 'Cancelled' },
};

interface InvoiceItem {
  id: string; productName: string; description?: string;
  quantity: number; unitPrice: number; totalPrice: number; uom?: string;
}
interface PaymentRecord {
  id: string; amount: number; paymentDate: string; paymentMethod: string;
  reference?: string | null; notes?: string | null;
}
interface InvoiceRecord {
  id: string; invoiceNumber: string; status: string;
  invoiceDate: string; dueDate: string;
  subtotal: number; tax: number; discount: number; totalAmount: number;
  paidAmount: number; balanceDue: number;
  notes?: string | null;
  customer: { id: string; code: string; name: string; phone?: string; address?: string; creditLimit?: any };
  order?: { id: string; orderNumber: string; status: string; branch?: { id: string; name: string; code: string } };
  items?: InvoiceItem[];
  payments?: PaymentRecord[];
}

export const Invoices: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<InvoiceRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices', {
        params: { page, limit: pageSize, status: status || undefined, search: search || undefined },
      });
      if (res.data.success) {
        setInvoices(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch { } finally { setLoading(false); }
  }, [page, pageSize, status, search]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const loadDetail = async (id: string) => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data.success) { setDetail(res.data.data); setDetailOpen(true); }
    } catch { message.error('Failed to load invoice'); }
  };

  const updateStatus = async (invoice: InvoiceRecord, nextStatus: string) => {
    try {
      setActionLoading(true);
      await api.post(`/invoices/${invoice.id}/status`, { status: nextStatus });
      message.success(`Invoice ${STATUS_MAP[nextStatus]?.label || nextStatus}`);
      fetchInvoices();
      setDetailOpen(false);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update');
    } finally { setActionLoading(false); }
  };

  const recordPayment = async () => {
    if (!detail) return;
    try {
      const values = await form.validateFields();
      setActionLoading(true);
      await api.post(`/invoices/${detail.id}/payments`, {
        ...values,
        paymentDate: values.paymentDate ? values.paymentDate.toISOString() : undefined,
      });
      message.success('Payment recorded');
      setPaymentOpen(false);
      form.resetFields();
      fetchInvoices();
      loadDetail(detail.id);
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Failed');
    } finally { setActionLoading(false); }
  };

  const isOverdue = (dueDate: string, balance: number) => balance > 0 && new Date(dueDate) < new Date();

  const columns = [
    {
      title: 'Invoice #',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 130,
      render: (v: string) => (
        <a onClick={() => loadDetail(v === 'N/A' ? '' : invoices.find(i => i.invoiceNumber === v)?.id || '')}>
          <Text code style={{ fontWeight: 700, color: 'var(--primary-color)', fontSize: '13px' }}>{v}</Text>
        </a>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      width: 160,
      render: (_: any, r: InvoiceRecord) => (
        <div>
          <Text strong style={{ fontSize: '13px' }}>{r.customer?.name}</Text>
          <br /><Text type="secondary" style={{ fontSize: '11px' }}>{r.customer?.code}</Text>
        </div>
      ),
    },
    {
      title: 'Branch',
      key: 'branch',
      width: 120,
      render: (_: any, r: InvoiceRecord) => <Text>{r.order?.branch?.name || '—'}</Text>,
    },
    {
      title: 'Invoice Date',
      dataIndex: 'invoiceDate',
      key: 'invoiceDate',
      width: 110,
      render: (d: string) => d ? dayjs(d).format('DD MMM YYYY') : '—',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 120,
      render: (d: string, r: InvoiceRecord) => (
        <Space size={4}>
          <Text style={{ color: isOverdue(d, r.balanceDue) ? '#DC2626' : undefined, fontWeight: isOverdue(d, r.balanceDue) ? 600 : undefined }}>
            {d ? dayjs(d).format('DD MMM YYYY') : '—'}
          </Text>
          {isOverdue(d, r.balanceDue) && <Badge status="error" title="Overdue" />}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: string) => (
        <Tag color={STATUS_MAP[s]?.color} style={{ border: 'none', borderRadius: '10px', fontWeight: 600 }}>
          {STATUS_MAP[s]?.label || s}
        </Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (v: number) => <Text strong style={{ fontSize: '13px' }}>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text>,
    },
    {
      title: 'Balance',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      width: 120,
      render: (v: number, r: InvoiceRecord) => (
        <Text style={{ color: v > 0 && r.status !== 'CANCELLED' ? '#DC2626' : '#10B981', fontWeight: 600 }}>
          {Number(v).toLocaleString()} {CURRENCY.symbol}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, r: InvoiceRecord) => {
        const items: Array<{ key: string; label: React.ReactNode; icon?: React.ReactNode; danger?: boolean }> = [];
        items.push({
          key: 'view',
          icon: <EyeOutlined />,
          label: 'View Invoice',
        });
        if (r.status === 'PENDING_APPROVAL') {
          items.push({
            key: 'approve',
            icon: <CheckCircleOutlined />,
            label: 'Approve',
          });
        }
        if (r.status === 'APPROVED') {
          items.push({
            key: 'send',
            icon: <SendOutlined />,
            label: 'Send to Customer',
          });
        }
        if (!['PAID', 'CANCELLED', 'DRAFT'].includes(r.status)) {
          items.push({
            key: 'pay',
            icon: <DollarOutlined />,
            label: 'Record Payment',
          });
        }
        if (!['PAID', 'CANCELLED'].includes(r.status)) {
          items.push({
            key: 'cancel',
            icon: <CloseCircleOutlined />,
            label: 'Cancel Invoice',
            danger: true,
          });
        }

        const onMenuClick = ({ key }: { key: string }) => {
          switch (key) {
            case 'view': loadDetail(r.id); break;
            case 'approve': updateStatus(r, 'APPROVED'); break;
            case 'send': updateStatus(r, 'SENT'); break;
            case 'pay':
              loadDetail(r.id);
              setTimeout(() => {
                form.setFieldsValue({ amount: Number(r.balanceDue), paymentMethod: 'BANK_TRANSFER', paymentDate: dayjs() });
                setPaymentOpen(true);
              }, 300);
              break;
            case 'cancel': updateStatus(r, 'CANCELLED'); break;
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
    <div className="animate-fade-in" style={{ paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Invoices</Title>
          <Text type="secondary">Approve, send, and settle customer invoices</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchInvoices} style={{ borderRadius: '12px' }}>Refresh</Button>
        </Space>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: 20 }}>
        <Space wrap>
          <Input
            placeholder="Search invoice # or customer..."
            prefix={<FilePdfOutlined />}
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 260, borderRadius: '12px' }} allowClear
          />
          <Select
            value={status || 'all'} style={{ width: 200, borderRadius: '12px' }}
            onChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.label}</Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
        {invoices.length === 0 && !loading ? (
          <Empty description="No invoices found." style={{ padding: '60px 0' }} />
        ) : (
          <Table
            columns={columns}
            dataSource={invoices.map((i) => ({ ...i, key: i.id }))}
            loading={loading}
            pagination={{
              current: page, pageSize, total, showSizeChanger: true,
              onChange: (p, s) => { setPage(p); setPageSize(s); },
              style: { padding: '16px' },
            }}
            scroll={{ x: 1300 }}
          />
        )}
      </Card>

      {/* Invoice Detail Modal — A4-style preview */}
      <Modal
        title={null}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setPaymentOpen(false); }}
        footer={null}
        width={820}
        destroyOnHidden
        style={{ top: 20 }}
      >
        {detail && (
          <div style={{ padding: '8px 0' }}>
            {/* Company + Invoice Header */}
            <div id={`invoice-print-${detail.id}`} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', padding: '32px' }}>
              {/* Header Row */}
              <Row justify="space-between" align="top" style={{ marginBottom: 24 }}>
                <Col>
                  <Title level={3} style={{ margin: 0, fontWeight: 800, color: 'var(--primary-color)' }}>MaxOrder</Title>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Pharmaceutical Distribution</Text>
                  <br /><Text style={{ fontSize: '12px' }}>No. 42, Pyay Road, Yangon</Text>
                  <br /><Text style={{ fontSize: '12px' }}>Phone: 01-2345678 | Email: billing@maxorder.com</Text>
                </Col>
                <Col style={{ textAlign: 'right' }}>
                  <Title level={4} style={{ margin: 0, fontWeight: 700, letterSpacing: '1px' }}>INVOICE</Title>
                  <Tag color={STATUS_MAP[detail.status]?.color} style={{ marginTop: 4, borderRadius: '10px', fontWeight: 600 }}>
                    {STATUS_MAP[detail.status]?.label || detail.status}
                  </Tag>
                </Col>
              </Row>
              <Divider style={{ margin: '0 0 20px 0' }} />

              {/* Invoice Meta */}
              <Row gutter={24} style={{ marginBottom: 20 }}>
                <Col span={12}>
                  <Descriptions column={1} size="small" colon={false}>
                    <Descriptions.Item label={<Text strong>Invoice #</Text>}><Text code style={{ fontSize: '14px', fontWeight: 700 }}>{detail.invoiceNumber}</Text></Descriptions.Item>
                    <Descriptions.Item label={<Text strong>Invoice Date</Text>}>{dayjs(detail.invoiceDate).format('DD MMMM YYYY')}</Descriptions.Item>
                    <Descriptions.Item label={<Text strong>Due Date</Text>}>
                      <Text style={{ color: isOverdue(detail.dueDate, detail.balanceDue) ? '#DC2626' : undefined, fontWeight: isOverdue(detail.dueDate, detail.balanceDue) ? 600 : undefined }}>
                        {dayjs(detail.dueDate).format('DD MMMM YYYY')}
                        {isOverdue(detail.dueDate, detail.balanceDue) && <Badge status="error" style={{ marginLeft: 8 }} />}
                      </Text>
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col span={12}>
                  <Descriptions column={1} size="small" colon={false}>
                    <Descriptions.Item label={<Text strong>Order</Text>}>{detail.order?.orderNumber || '—'}</Descriptions.Item>
                    <Descriptions.Item label={<Text strong>Branch</Text>}>{detail.order?.branch?.name || '—'}</Descriptions.Item>
                    <Descriptions.Item label={<Text strong>Customer Code</Text>}>{detail.customer?.code}</Descriptions.Item>
                  </Descriptions>
                </Col>
              </Row>

              {/* Bill To */}
              <Card size="small" style={{ marginBottom: 20, background: '#f9fafb', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                <Row>
                  <Col span={12}>
                    <Text strong style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280' }}>Bill To</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text strong style={{ fontSize: '15px' }}>{detail.customer?.name}</Text>
                      {detail.customer?.phone && <><br /><Text style={{ fontSize: '13px' }}>{detail.customer.phone}</Text></>}
                      {detail.customer?.address && <><br /><Text style={{ fontSize: '12px' }} type="secondary">{detail.customer.address}</Text></>}
                    </div>
                  </Col>
                  <Col span={12}>
                    {detail.customer?.creditLimit && (
                      <>
                        <Text strong style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280' }}>Credit Status</Text>
                        <div style={{ marginTop: 4 }}>
                          <Text style={{ fontSize: '13px' }}>
                            Limit: {Number(detail.customer.creditLimit.creditLimit).toLocaleString()} {CURRENCY.symbol}
                          </Text>
                          <br /><Text style={{ fontSize: '13px' }}>
                            Outstanding: {Number(detail.customer.creditLimit.outstandingBalance).toLocaleString()} {CURRENCY.symbol}
                          </Text>
                        </div>
                      </>
                    )}
                  </Col>
                </Row>
              </Card>

              {/* Line Items */}
              <Table
                dataSource={detail.items?.map((it, idx) => ({ ...it, key: it.id || idx })) || []}
                pagination={false}
                size="small"
                style={{ marginBottom: 20 }}
                columns={[
                  { title: '#', width: 40, render: (_: any, __: any, idx: number) => <Text type="secondary">{idx + 1}</Text> },
                  { title: 'Product', dataIndex: 'productName', key: 'productName', render: (v: string) => <Text strong>{v}</Text> },
                  { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 60 },
                  { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 110, render: (v: number) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
                  { title: 'Total', dataIndex: 'totalPrice', key: 'totalPrice', width: 120, render: (v: number) => <Text strong>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> },
                ]}
                summary={() => (
                  <Table.Summary>
                    <Table.Summary.Row style={{ fontWeight: 600 }}>
                      <Table.Summary.Cell index={0} colSpan={3} />
                      <Table.Summary.Cell index={3}>Subtotal</Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>{Number(detail.subtotal || detail.totalAmount).toLocaleString()} {CURRENCY.symbol}</Table.Summary.Cell>
                    </Table.Summary.Row>
                    {detail.discount > 0 && (
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3} />
                        <Table.Summary.Cell index={3}>Discount</Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>-{Number(detail.discount).toLocaleString()} {CURRENCY.symbol}</Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                    <Table.Summary.Row style={{ fontWeight: 700, fontSize: '15px' }}>
                      <Table.Summary.Cell index={0} colSpan={3} />
                      <Table.Summary.Cell index={3}>Total</Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <span style={{ color: 'var(--primary-color)' }}>
                          {Number(detail.totalAmount).toLocaleString()} {CURRENCY.symbol}
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3} />
                      <Table.Summary.Cell index={3}>Paid</Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <span style={{ color: '#10B981' }}>
                          {Number(detail.paidAmount).toLocaleString()} {CURRENCY.symbol}
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row style={{ fontWeight: 700 }}>
                      <Table.Summary.Cell index={0} colSpan={3} />
                      <Table.Summary.Cell index={3}>Balance Due</Table.Summary.Cell>
                      <Table.Summary.Cell index={4}>
                        <span style={{ color: Number(detail.balanceDue) > 0 ? '#DC2626' : '#10B981' }}>
                          {Number(detail.balanceDue).toLocaleString()} {CURRENCY.symbol}
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />

              {/* Notes */}
              {detail.notes && (
                <Card size="small" style={{ marginBottom: 16, background: '#f9fafb', borderRadius: '10px' }}>
                  <Text strong style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280' }}>Notes</Text>
                  <br /><Text>{detail.notes}</Text>
                </Card>
              )}

              {/* Payment History */}
              {detail.payments && detail.payments.length > 0 && (
                <>
                  <Divider style={{ margin: '0 0 12px 0' }} />
                  <Text strong style={{ fontSize: '13px', display: 'block', marginBottom: 8 }}>
                    <BankOutlined /> Payment History
                  </Text>
                  <Table
                    dataSource={detail.payments.map((p) => ({ ...p, key: p.id }))}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: 'Date', dataIndex: 'paymentDate', render: (d: string) => dayjs(d).format('DD MMM YYYY') },
                      { title: 'Method', dataIndex: 'paymentMethod', render: (m: string) => m.replace(/_/g, ' ') },
                      { title: 'Reference', dataIndex: 'reference', render: (v: string) => v || '—' },
                      { title: 'Amount', dataIndex: 'amount', render: (v: number) => <Text strong style={{ color: '#10B981' }}>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> },
                    ]}
                  />
                </>
              )}
            </div>

            {/* Actions */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              {detail.status === 'PENDING_APPROVAL' && (
                <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading} onClick={() => updateStatus(detail, 'APPROVED')}>Approve Invoice</Button>
              )}
              {detail.status === 'APPROVED' && (
                <Button type="primary" icon={<SendOutlined />} loading={actionLoading} onClick={() => updateStatus(detail, 'SENT')}>Send to Customer</Button>
              )}
              {!['PAID', 'CANCELLED', 'DRAFT'].includes(detail.status) && (
                <Button type="default" icon={<DollarOutlined />} onClick={() => { form.setFieldsValue({ amount: Number(detail.balanceDue), paymentMethod: 'BANK_TRANSFER', paymentDate: dayjs() }); setPaymentOpen(true); }}>Record Payment</Button>
              )}
              {!['PAID', 'CANCELLED'].includes(detail.status) && (
                <Popconfirm title="Cancel this invoice?" onConfirm={() => updateStatus(detail, 'CANCELLED')} okText="Yes, Cancel" okButtonProps={{ danger: true }}>
                  <Button danger icon={<CloseCircleOutlined />} loading={actionLoading}>Cancel Invoice</Button>
                </Popconfirm>
              )}
              <Button onClick={() => { setDetailOpen(false); setPaymentOpen(false); }}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        title={<Space><BankOutlined /><span>Record Payment</span></Space>}
        open={paymentOpen}
        onCancel={() => { setPaymentOpen(false); form.resetFields(); }}
        onOk={recordPayment}
        okText="Record Payment"
        confirmLoading={actionLoading}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="amount" label="Amount" rules={[{ required: true, message: 'Amount is required' }]}>
            <InputNumber
              min={1} max={detail ? Number(detail.balanceDue) : undefined}
              style={{ width: '100%', borderRadius: '10px' }}
              formatter={(value) => value ? String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={(value) => (value ? Number(value.replace(/,/g, '')) : 0) as any}
              addonAfter={CURRENCY.symbol}
            />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
            <Select style={{ borderRadius: '10px' }} options={[
              { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
              { value: 'CASH', label: 'Cash' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'MOBILE_BANKING', label: 'Mobile Banking' },
            ]} />
          </Form.Item>
          <Form.Item name="paymentDate" label="Payment Date">
            <DatePicker style={{ width: '100%', borderRadius: '10px' }} />
          </Form.Item>
          <Form.Item name="reference" label="Reference / Cheque No.">
            <Input placeholder="e.g. CHQ-001234" style={{ borderRadius: '10px' }} />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional notes..." style={{ borderRadius: '10px' }} />
          </Form.Item>
        </Form>
        {detail && (
          <Card size="small" style={{ background: '#f9fafb', borderRadius: '10px', marginTop: 8 }}>
            <Space direction="vertical" size={4}>
              <Text type="secondary">Invoice: <Text strong>{detail.invoiceNumber}</Text></Text>
              <Text type="secondary">Balance Due: <Text strong style={{ color: '#DC2626' }}>{Number(detail.balanceDue).toLocaleString()} {CURRENCY.symbol}</Text></Text>
            </Space>
          </Card>
        )}
      </Modal>
    </div>
  );
};
