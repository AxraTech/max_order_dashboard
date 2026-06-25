import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Descriptions, Form, Input, InputNumber, message, Modal,
  Select, Space, Table, Tag, Typography,
} from 'antd';
import { DollarOutlined, EyeOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'default',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'cyan',
  SENT: 'blue',
  PARTIALLY_PAID: 'purple',
  PAID: 'green',
  OVERDUE: 'red',
  CANCELLED: 'default',
};

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  customer: { code: string; name: string };
  order?: { orderNumber: string; status: string; branch?: { name: string } };
  payments?: Array<{ id: string; amount: number; paymentDate: string; paymentMethod: string; reference?: string | null }>;
}

export const Invoices: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [status, setStatus] = useState('');
  const [detail, setDetail] = useState<InvoiceRecord | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/invoices', {
        params: { page, limit: pageSize, status: status || undefined },
      });
      if (res.data.success) {
        setInvoices(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, status]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const updateStatus = async (invoice: InvoiceRecord, nextStatus: string) => {
    try {
      await api.post(`/invoices/${invoice.id}/status`, { status: nextStatus });
      message.success(`Invoice ${nextStatus.replace(/_/g, ' ')}`);
      fetchInvoices();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update invoice');
    }
  };

  const recordPayment = async () => {
    if (!detail) return;
    try {
      const values = await form.validateFields();
      await api.post(`/invoices/${detail.id}/payments`, values);
      message.success('Payment recorded');
      setPaymentOpen(false);
      setDetail(null);
      form.resetFields();
      fetchInvoices();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Invoices</Title>
          <Text type="secondary">Approve, send, and settle customer invoices</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchInvoices}>Refresh</Button>
      </div>

      <Card className="glass-card" variant="borderless" style={{ marginBottom: 20 }}>
        <Select value={status || 'all'} style={{ width: 220 }} onChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
          <Select.Option value="all">All Statuses</Select.Option>
          {Object.keys(STATUS_COLOR).map((s) => <Select.Option key={s} value={s}>{s.replace(/_/g, ' ')}</Select.Option>)}
        </Select>
      </Card>

      <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
        <Table
          loading={loading}
          dataSource={invoices.map((i) => ({ ...i, key: i.id }))}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
          scroll={{ x: 1100 }}
          columns={[
            { title: 'Invoice #', dataIndex: 'invoiceNumber', render: (v) => <Text code strong>{v}</Text> },
            { title: 'Customer', render: (_, r) => <div><Text strong>{r.customer?.name}</Text><br /><Text type="secondary">{r.customer?.code}</Text></div> },
            { title: 'Order', render: (_, r) => <Text>{r.order?.orderNumber || '-'}</Text> },
            { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={STATUS_COLOR[s]}>{s.replace(/_/g, ' ')}</Tag> },
            { title: 'Total', dataIndex: 'totalAmount', render: (v) => <Text strong>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> },
            { title: 'Balance', dataIndex: 'balanceDue', render: (v) => <Text>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> },
            { title: 'Due', dataIndex: 'dueDate', render: (v) => new Date(v).toLocaleDateString() },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Button type="link" icon={<EyeOutlined />} onClick={() => setDetail(r)}>View</Button>
                  {r.status === 'PENDING_APPROVAL' && <Button type="link" onClick={() => updateStatus(r, 'APPROVED')}>Approve</Button>}
                  {r.status === 'APPROVED' && <Button type="link" icon={<SendOutlined />} onClick={() => updateStatus(r, 'SENT')}>Send</Button>}
                  {!['PAID', 'CANCELLED', 'DRAFT'].includes(r.status) && (
                    <Button type="link" icon={<DollarOutlined />} onClick={() => { setDetail(r); form.setFieldsValue({ amount: Number(r.balanceDue), paymentMethod: 'CASH' }); setPaymentOpen(true); }}>
                      Pay
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={!!detail && !paymentOpen} onCancel={() => setDetail(null)} footer={<Button onClick={() => setDetail(null)}>Close</Button>} title={detail?.invoiceNumber}>
        {detail && (
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Customer">{detail.customer?.name}</Descriptions.Item>
            <Descriptions.Item label="Order">{detail.order?.orderNumber || '-'}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={STATUS_COLOR[detail.status]}>{detail.status.replace(/_/g, ' ')}</Tag></Descriptions.Item>
            <Descriptions.Item label="Total">{Number(detail.totalAmount).toLocaleString()} {CURRENCY.symbol}</Descriptions.Item>
            <Descriptions.Item label="Paid">{Number(detail.paidAmount).toLocaleString()} {CURRENCY.symbol}</Descriptions.Item>
            <Descriptions.Item label="Balance">{Number(detail.balanceDue).toLocaleString()} {CURRENCY.symbol}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal open={paymentOpen} title={`Record Payment - ${detail?.invoiceNumber}`} onCancel={() => setPaymentOpen(false)} onOk={recordPayment} okText="Record Payment">
        <Form form={form} layout="vertical">
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Payment Method" rules={[{ required: true }]}>
            <Select options={[{ value: 'CASH' }, { value: 'BANK_TRANSFER' }, { value: 'CHEQUE' }]} />
          </Form.Item>
          <Form.Item name="reference" label="Reference">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
