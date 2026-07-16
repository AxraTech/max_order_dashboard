import React, { useCallback, useEffect, useState } from 'react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import {
  Button, Card, Dropdown, Form, Input, InputNumber, Modal,
  Select, Space, Table, Tag, Typography, Badge, DatePicker, Popconfirm, Empty, App, Row, Col, Divider
} from 'antd';
import {
  DollarOutlined, EyeOutlined, ReloadOutlined, SendOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  FilePdfOutlined, BankOutlined, MoreOutlined,
  DownloadOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, EditOutlined
} from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';
import { useAuthStore } from '../../store/auth.store';
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
  id: string; productName?: string; description?: string;
  quantity: number; unitPrice: number; totalPrice: number; uom?: string;
}
interface PaymentRecord {
  id: string; amount: number; paymentDate: string; paymentMethod: string;
  reference?: string | null; notes?: string | null; discount?: number;
}
interface InvoiceRecord {
  id: string; invoiceNumber: string; status: string;
  invoiceDate: string; dueDate: string; createdAt?: string; updatedAt?: string;
  subtotal: number; tax: number; discount: number; totalAmount: number;
  manualDiscount?: number | null;
  cashDownDiscount?: number | null;
  cashback?: number | null;
  paidAmount: number; balanceDue: number;
  notes?: string | null;
  customer: { id: string; code: string; name: string; phone?: string; address?: string; township?: string; creditLimit?: any };
  order?: { id: string; orderNumber: string; status: string; branch?: { id: string; name: string; code: string; address?: string | null; phone?: string | null; email?: string | null }; salesRep?: { id: string; code: string; user?: { firstName: string; lastName: string } }; paymentMethod?: string | null; paymentReference?: string | null; paymentNotes?: string | null };
  items?: InvoiceItem[];
  payments?: PaymentRecord[];
}

const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero Kyats Only';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

  const convertChunk = (n: number): string => {
    let word = '';
    if (n >= 100) {
      word += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      word += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      word += ones[n] + ' ';
    }
    return word.trim();
  };

  let word = '';
  let scaleIndex = 0;
  let temp = Math.round(num);
  while (temp > 0) {
    const chunk = temp % 1000;
    if (chunk > 0) {
      const chunkWord = convertChunk(chunk);
      word = chunkWord + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + ' ' + word;
    }
    temp = Math.floor(temp / 1000);
    scaleIndex++;
  }

  const result = word.trim();
  if (!result) return 'Zero Kyats Only';
  return result.charAt(0).toUpperCase() + result.slice(1) + ' Kyats Only';
};

export const Invoices: React.FC = () => {
  const { message } = App.useApp();
  const { user } = useAuthStore();
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
  const [editOpen, setEditOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [products, setProducts] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<any[]>([]);

  const [editTotals, setEditTotals] = useState({ subtotal: 0, tax: 0, discount: 0, manualDiscount: 0, cashback: 0, partnerCommission: 0, totalAmount: 0, balanceDue: 0 });
  const canEditInvoice = user?.role?.name === 'SUPER_ADMIN' || user?.role?.name === 'ACCOUNTANT';

  const handleDownloadPDF = () => {
    if (!detail) return;
    const element = document.getElementById(`invoice-print-${detail.id}`);
    if (!element) return;

    const msgKey = 'download-pdf';
    message.loading({ content: 'Generating PDF download...', key: msgKey });

    const opt = {
      margin:       [0.3, 0.3, 0.3, 0.3],
      filename:     `Invoice-${detail.invoiceNumber}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2.5, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    html2pdf().set(opt).from(element).save().then(() => {
      message.success({ content: 'PDF downloaded successfully!', key: msgKey });
    }).catch((err: any) => {
      console.error(err);
      message.error({ content: 'Failed to generate PDF download', key: msgKey });
    });
  };

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



  useEffect(() => {
    api.get('/products', { params: { limit: 1000 } }).then(res => {
      if (res.data.success) setProducts(res.data.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchInvoices();
    const handleUpdate = () => { fetchInvoices(); };
    window.addEventListener('api-update:invoice', handleUpdate);
    window.addEventListener('api-update:payment', handleUpdate);
    return () => {
      window.removeEventListener('api-update:invoice', handleUpdate);
      window.removeEventListener('api-update:payment', handleUpdate);
    };
  }, [fetchInvoices]);

  const loadDetail = async (id: string) => {
    try {
      const res = await api.get(`/invoices/${id}`);
      if (res.data.success) { setDetail(res.data.data); setDetailOpen(true); }
    } catch { message.error('Failed to load invoice'); }
  };

  const openEditModal = () => {
    if (!detail) return;
    editForm.resetFields();
    
    const formItems = (detail.items || []).map(item => ({
      description: item.description || item.productName || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));

    const initialPromoDiscount = Math.max(0, Number(detail.discount) - Number(detail.manualDiscount || 0));

    editForm.setFieldsValue({
      dueDate: dayjs(detail.dueDate),
      tax: Number(detail.tax || 0),
      discount: initialPromoDiscount,
      manualDiscount: Number(detail.manualDiscount || 0),
      cashback: Number(detail.cashback || 0),
      partnerCommission: Number(detail.partnerCommission || 0),
      items: formItems,
    });

    // Construct static merged product options for the dropdowns
    const merged = [...products];
    (detail.items || []).forEach(item => {
      const desc = item.description || item.productName || '';
      if (desc && !products.some(p => p.name === desc)) {
        merged.unshift({
          id: `custom-${item.id}`,
          name: desc,
          sku: 'custom',
          price: Number(item.unitPrice),
        });
      }
    });
    setProductOptions(merged);

    setEditTotals({
      subtotal: Number(detail.subtotal),
      tax: Number(detail.tax || 0),
      discount: initialPromoDiscount,
      manualDiscount: Number(detail.manualDiscount || 0),
      cashback: Number(detail.cashback || 0),
      partnerCommission: Number(detail.partnerCommission || 0),
      totalAmount: Number(detail.totalAmount),
      balanceDue: Number(detail.balanceDue),
    });

    setEditOpen(true);
  };

  const handleFormValuesChange = (_changedValues: any, allValues: any) => {
    const items = allValues.items || [];
    
    let subtotal = 0;
    items.forEach((item: any) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      subtotal += qty * price;
    });

    const tax = Number(allValues.tax) || 0;
    const promoDiscount = Number(allValues.discount) || 0;
    const manualDiscount = Number(allValues.manualDiscount) || 0;
    const cashback = Number(allValues.cashback) || 0;
    const partnerCommission = Number(allValues.partnerCommission) || 0;
    const paidAmount = detail ? Number(detail.paidAmount) : 0;

    const totalAmount = subtotal + tax - promoDiscount - manualDiscount - cashback - partnerCommission;
    const balanceDue = Math.max(0, totalAmount - paidAmount);

    setEditTotals({
      subtotal,
      tax,
      discount: promoDiscount,
      manualDiscount,
      cashback,
      partnerCommission,
      totalAmount,
      balanceDue
    });
  };

  const saveInvoiceEdit = async () => {
    if (!detail) return;
    try {
      const values = await editForm.validateFields();
      
      const finalItems = (values.items || []).map((item: any) => ({
        description: item.description,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        totalPrice: Number(item.quantity || 1) * Number(item.unitPrice || 0),
      }));

      const finalSubtotal = finalItems.reduce((acc: number, cur: any) => acc + cur.totalPrice, 0);
      const finalTotal = finalSubtotal + Number(values.tax || 0) - Number(values.discount || 0) - Number(values.manualDiscount || 0) - Number(values.cashback || 0) - Number(values.partnerCommission || 0);
      const finalBalance = Math.max(0, finalTotal - Number(detail.paidAmount));

      setActionLoading(true);
      const payload = {
        dueDate: values.dueDate.toISOString(),
        tax: Number(values.tax || 0),
        discount: Number(values.discount || 0) + Number(values.manualDiscount || 0),
        manualDiscount: Number(values.manualDiscount || 0),
        cashback: Number(values.cashback || 0),
        partnerCommission: Number(values.partnerCommission || 0),
        subtotal: finalSubtotal,
        totalAmount: finalTotal,
        balanceDue: finalBalance,
        items: finalItems,
      };

      const res = await api.put(`/invoices/${detail.id}`, payload);
      if (res.data.success) {
        message.success('Invoice updated successfully');
        setEditOpen(false);
        fetchInvoices();
        loadDetail(detail.id);
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to update invoice');
    } finally {
      setActionLoading(false);
    }
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
      title: 'Invoice No.',
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
          {r.customer?.township && <Text type="secondary" style={{ fontSize: '12px' }}> ({r.customer.township})</Text>}
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
      render: (v: number) => <Text strong style={{ fontSize: '13px' }}>{Math.round(Number(v)).toLocaleString()} {CURRENCY.symbol}</Text>,
    },
    {
      title: 'Balance',
      dataIndex: 'balanceDue',
      key: 'balanceDue',
      width: 120,
      render: (v: number, r: InvoiceRecord) => (
        <Text style={{ color: v > 0 && r.status !== 'CANCELLED' ? '#DC2626' : '#10B981', fontWeight: 600 }}>
          {Math.round(Number(v)).toLocaleString()} {CURRENCY.symbol}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_: any, r: InvoiceRecord) => {
        const items: Array<{ key: string; label: React.ReactNode; icon?: React.ReactNode; danger?: boolean }> = [];
        items.push({ key: 'view', icon: <EyeOutlined />, label: 'View Invoice' });
        if (r.status === 'PENDING_APPROVAL') items.push({ key: 'approve', icon: <CheckCircleOutlined />, label: 'Approve' });
        if (r.status === 'APPROVED') items.push({ key: 'send', icon: <SendOutlined />, label: 'Send to Customer' });
        if (!['PAID', 'CANCELLED', 'DRAFT'].includes(r.status)) items.push({ key: 'pay', icon: <DollarOutlined />, label: 'Record Payment' });
        if (!['PAID', 'CANCELLED'].includes(r.status)) items.push({ key: 'cancel', icon: <CloseCircleOutlined />, label: 'Cancel Invoice', danger: true });

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
            placeholder="Search invoice or customer..."
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

      {/* Invoice Detail Modal */}
      <Modal
        title={null}
        open={detailOpen}
        onCancel={() => { setDetailOpen(false); setPaymentOpen(false); }}
        footer={null}
        width={900}
        destroyOnHidden
        style={{ top: 20 }}
      >
        <style>{`
          .invoice-table .ant-table-thead > tr > th {
            background-color: #3f51b5 !important;
            color: #fff !important;
            border-bottom: none !important;
            font-weight: 700 !important;
          }
          .invoice-table .ant-table-tbody > tr > td {
            border-bottom: 1px solid #f0f0f0 !important;
          }
        `}</style>

        {detail && (
          <div style={{ padding: '8px 0' }}>
            {/* Invoice Body */}
            <div id={`invoice-print-${detail.id}`} style={{ position: 'relative', overflow: 'hidden', padding: '36px', background: '#ffffff', borderRadius: '12px', border: '1px solid #e8e8e8', fontFamily: 'Inter, system-ui, sans-serif' }}>
              {/* Diagonal Text Watermark */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                pointerEvents: 'none',
                zIndex: 0,
                userSelect: 'none',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <div style={{
                  transform: 'rotate(-45deg)',
                  whiteSpace: 'nowrap',
                  fontSize: '60px',
                  fontWeight: 900,
                  color: '#1d4ed8',
                  opacity: 0.08,
                  letterSpacing: '1px'
                }}>
                  Myanma Executive Network Co.,Ltd.
                </div>
              </div>


              {/* Header: Company Info | Invoice Title & Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: '28px', color: '#3f51b5', fontWeight: 800 }}>MaxOrder</h1>
                  <p style={{ margin: '2px 0 6px 0', fontSize: '14px', color: '#666', fontWeight: 500 }}>Pharmaceutical Distribution</p>
                  <p style={{ margin: '2px 0', fontSize: '12px', color: '#444' }}>{detail.order?.branch?.address || 'No. 42, Pyay Road, Yangon, Myanmar'}</p>
                  <p style={{ margin: '2px 0', fontSize: '12px', color: '#444' }}>Phone: {detail.order?.branch?.phone || '01-2345678'} | Email: {detail.order?.branch?.email || 'billing@maxorder.com'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#000', letterSpacing: '1px' }}>INVOICE</h1>
                  <div style={{ marginTop: '8px' }}>
                    <Tag color={STATUS_MAP[detail.status]?.color === 'warning' ? 'orange' : STATUS_MAP[detail.status]?.color} style={{ border: 'none', borderRadius: '12px', padding: '4px 14px', fontWeight: 700, fontSize: '12px' }}>
                      {STATUS_MAP[detail.status]?.label || detail.status}
                    </Tag>
                  </div>
                </div>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', marginBottom: '24px' }} />

              {/* Grid: Invoice Details | Bill To | Credit Status */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '30px', marginBottom: '28px' }}>
                {/* Left Column: Invoice Details */}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                    <tbody>
                      {[
                        { label: 'Invoice No', value: detail.invoiceNumber },
                        { label: 'Invoice Date', value: dayjs(detail.invoiceDate).format('DD MMMM YYYY') },
                        { label: 'Due Date', value: dayjs(detail.dueDate).format('DD MMMM YYYY') },
                        { label: 'Order No', value: detail.order?.orderNumber || '—' },
                        { label: 'Branch', value: detail.order?.branch?.name || '—' },
                        { label: 'Customer Code', value: detail.customer?.code || '—' },
                      ].map((row, i) => (
                        <tr key={i}>
                          <td style={{ width: '100px', padding: '4px 0', color: '#666', fontWeight: 500 }}>{row.label}</td>
                          <td style={{ width: '15px', padding: '4px 0', color: '#666' }}>:</td>
                          <td style={{ padding: '4px 0', fontWeight: 700, color: '#111' }}>{row.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Middle Column: Bill To */}
                <div style={{ flex: 1.2, minWidth: '220px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 800, color: '#3f51b5', fontSize: '13px', letterSpacing: '0.5px', marginBottom: '8px' }}>BILL TO</div>
                  <div style={{ fontWeight: 700, color: '#111', fontSize: '14px', marginBottom: '4px' }}>{detail.customer?.name}</div>
                  {detail.customer?.phone && (
                    <div style={{ color: '#4B5563', marginBottom: '4px' }}>Phone: {detail.customer.phone}</div>
                  )}
                  <div style={{ color: '#4B5563', lineHeight: 1.5 }}>
                    {detail.customer?.address}
                    {detail.customer?.township && `, ${detail.customer.township}`}
                  </div>
                </div>

                {/* Right Column: Credit Status Box (Commented Out)
                <div style={{ width: '220px', background: '#F4F5FA', borderRadius: '8px', padding: '14px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 800, color: '#3f51b5', letterSpacing: '0.5px', marginBottom: '10px' }}>CREDIT STATUS</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#666', fontWeight: 500 }}>Credit Limit</span>
                    <span style={{ fontWeight: 700, color: '#111' }}>
                      {detail.customer?.creditLimit ? `${Number(detail.customer.creditLimit.creditLimit).toLocaleString()} K` : '0 K'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#666', fontWeight: 500 }}>Outstanding</span>
                    <span style={{ fontWeight: 700, color: '#EF4444' }}>
                      {detail.customer?.creditLimit ? `${Number(detail.customer.creditLimit.outstandingBalance).toLocaleString()} K` : '0 K'}
                    </span>
                  </div>
                </div>
                */}
              </div>

              {/* Product Table */}
              <Table
                className="invoice-table"
                dataSource={detail.items?.map((it, idx) => ({ ...it, key: it.id || idx })) || []}
                pagination={false}
                size="small"
                bordered={false}
                style={{ marginBottom: '28px' }}
                columns={[
                  {
                    title: 'No.',
                    width: 50,
                    align: 'center' as const,
                    render: (_: any, __: any, idx: number) => <span style={{ color: '#000', fontSize: '13px', fontWeight: 500 }}>{idx + 1}</span>,
                  },
                  {
                    title: 'PRODUCT',
                    key: 'product',
                    render: (_: any, r: any) => {
                      const desc = r.productName || r.description || '';
                      const batchRegex = /\(Batch:\s*([^)]+)\)/i;
                      const match = desc.match(batchRegex);
                      const pName = (match ? desc.replace(batchRegex, '') : desc)
                        .replace('(FOC)', '').replace('(Sample)', '').replace('(Promo Free)', '').trim();
                      const isFOC = desc.includes('(FOC)');
                      const isSample = desc.includes('(Sample)');
                      const isPromoFree = desc.includes('(Promo Free)');
                      return (
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#111' }}>
                          {pName}
                          {isPromoFree && <Tag color="gold" style={{ marginLeft: 6, fontSize: '11px', borderRadius: 6 }}>Free (Promo)</Tag>}
                          {isFOC && <Tag color="green" style={{ marginLeft: 6, fontSize: '11px', borderRadius: 6 }}>FOC</Tag>}
                          {isSample && <Tag color="blue" style={{ marginLeft: 6, fontSize: '11px', borderRadius: 6 }}>Sample</Tag>}
                        </div>
                      );
                    }
                  },
                  {
                    title: 'BATCH',
                    key: 'batch',
                    width: 200,
                    render: (_: any, r: any) => {
                      const desc = r.productName || r.description || '';
                      const batchRegex = /\(Batch:\s*([^)]+)\)/i;
                      const match = desc.match(batchRegex);
                      return <span style={{ fontSize: '12px', color: '#555' }}>{match ? match[1] : '—'}</span>;
                    }
                  },
                  {
                    title: 'QTY',
                    dataIndex: 'quantity',
                    key: 'quantity',
                    width: 70,
                    align: 'center' as const,
                    render: (v: number) => <span style={{ fontSize: '13px', fontWeight: 700, color: '#000' }}>{v}</span>,
                  },
                  {
                    title: 'UNIT PRICE',
                    dataIndex: 'unitPrice',
                    key: 'unitPrice',
                    width: 120,
                    align: 'right' as const,
                    render: (v: number) => <span style={{ fontSize: '13px', fontWeight: 700, color: '#000' }}>{Math.round(Number(v)).toLocaleString()} {CURRENCY.symbol}</span>,
                  },
                  {
                    title: 'TOTAL',
                    dataIndex: 'totalPrice',
                    key: 'totalPrice',
                    width: 120,
                    align: 'right' as const,
                    render: (v: number) => <span style={{ fontWeight: 700, fontSize: '13px', color: '#000' }}>{Math.round(Number(v)).toLocaleString()} {CURRENCY.symbol}</span>,
                  },
                ]}
              />

              {/* Bottom: Notes & Payment Info | Totals */}
              <div style={{ display: 'flex', gap: '30px', marginTop: '24px', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                {/* Left Side: Notes & Payment Info */}
                <div style={{ flex: 1.3, fontSize: '12px' }}>
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontWeight: 700, color: '#000' }}>Amount in Words:</span>
                    <div style={{ color: '#555', marginTop: '4px', fontStyle: 'italic', fontWeight: 500 }}>{numberToWords(detail.totalAmount)}</div>
                  </div>
                  
                  <div style={{ marginBottom: '18px' }}>
                    <div style={{ fontWeight: 800, color: '#3f51b5', fontSize: '12px', letterSpacing: '0.5px', marginBottom: '6px' }}>NOTES</div>
                    <ol style={{ paddingLeft: '14px', margin: 0, color: '#555', lineHeight: 1.6 }}>
                      <li>Please make payment before the due date.</li>
                      <li>Goods once sold will not be returned or exchanged.</li>
                    </ol>
                  </div>

                  <div>
                    <div style={{ fontWeight: 800, color: '#3f51b5', fontSize: '12px', letterSpacing: '0.5px', marginBottom: '8px' }}>PAYMENT INFORMATION</div>
                    <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '110px', padding: '3px 0', color: '#666', fontWeight: 500 }}>Payment Term</td>
                          <td style={{ width: '15px', padding: '3px 0', color: '#666' }}>:</td>
                          <td style={{ padding: '3px 0', fontWeight: 700, color: '#111' }}>
                            {(() => {
                              const notes = detail.order?.paymentNotes || '';
                              const method = detail.order?.paymentMethod || '';
                              if (!method && !detail.payments?.length) return 'Credit';
                              if (notes.includes('Cash Down') || method === 'CASH_DOWN') return 'Cash Down';
                              if (method) return method.replace(/_/g, ' ');
                              return 'Credit';
                            })()}
                          </td>
                        </tr>
                        {(detail.order?.paymentMethod || (detail.payments && detail.payments.length > 0)) && (
                          <tr>
                            <td style={{ padding: '3px 0', color: '#666', fontWeight: 500 }}>Payment Method</td>
                            <td style={{ padding: '3px 0', color: '#666' }}>:</td>
                            <td style={{ padding: '3px 0', fontWeight: 700, color: '#111' }}>
                              {detail.payments?.[0]?.paymentMethod?.replace(/_/g, ' ') || detail.order?.paymentMethod?.replace(/_/g, ' ') || '—'}
                            </td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ padding: '3px 0', color: '#666', fontWeight: 500 }}>Reference No.</td>
                          <td style={{ padding: '3px 0', color: '#666' }}>:</td>
                          <td style={{ padding: '3px 0', fontWeight: 700, color: '#111' }}>{detail.payments?.[0]?.reference || detail.order?.paymentReference || '—'}</td>
                        </tr>
                        {detail.order?.salesRep?.user && (
                          <tr>
                            <td style={{ padding: '3px 0', color: '#666', fontWeight: 500 }}>Collected By</td>
                            <td style={{ padding: '3px 0', color: '#666' }}>:</td>
                            <td style={{ padding: '3px 0', fontWeight: 700, color: '#111' }}>
                              {detail.order.salesRep.user.firstName} {detail.order.salesRep.user.lastName}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>Please send payment slip to our billing department.</p>
                  </div>
                       {/* Right Side: Totals */}
                <div style={{ width: '280px', fontSize: '13px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Subtotal</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#111' }}>{Math.round(Number(detail.subtotal)).toLocaleString()} {CURRENCY.symbol}</td>
                      </tr>
                      {Number(detail.discount) - Number(detail.manualDiscount || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Promotion Discount</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>-{Math.round(Number(detail.discount) - Number(detail.manualDiscount || 0)).toLocaleString()} {CURRENCY.symbol}</td>
                        </tr>
                      )}
                      {Number(detail.manualDiscount || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Manual Discount</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>-{Math.round(Number(detail.manualDiscount)).toLocaleString()} {CURRENCY.symbol}</td>
                        </tr>
                      )}
                      {Number(detail.cashDownDiscount || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>COD Discount</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>-{Math.round(Number(detail.cashDownDiscount)).toLocaleString()} {CURRENCY.symbol}</td>
                        </tr>
                      )}
                      {Number(detail.cashback || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Cashback</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>-{Math.round(Number(detail.cashback)).toLocaleString()} {CURRENCY.symbol}</td>
                        </tr>
                      )}
                      {Number(detail.partnerCommission || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Partner Coms</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#DC2626' }}>-{Math.round(Number(detail.partnerCommission)).toLocaleString()} {CURRENCY.symbol}</td>
                        </tr>
                      )}
                      {Number(detail.tax || 0) > 0 && (
                        <tr>
                          <td style={{ padding: '6px 0', color: '#555', fontWeight: 500 }}>Tax</td>
                          <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#111' }}>+{Math.round(Number(detail.tax)).toLocaleString()} {CURRENCY.symbol}</td>
                        </tr>
                      )}
                      
                      <tr style={{ borderTop: '1px solid #e8e8e8', borderBottom: '1px solid #e8e8e8' }}>
                        <td style={{ padding: '10px 0', color: '#000', fontWeight: 800, fontSize: '14px' }}>TOTAL</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 900, color: '#3f51b5', fontSize: '16px' }}>{Math.round(Number(detail.totalAmount)).toLocaleString()} {CURRENCY.symbol}</td>
                      </tr>

                      <tr>
                        <td style={{ padding: '8px 0 6px 0', color: '#555', fontWeight: 500 }}>Paid</td>
                        <td style={{ padding: '8px 0 6px 0', textAlign: 'right', fontWeight: 700, color: '#10B981' }}>{Math.round(Number(detail.paidAmount)).toLocaleString()} {CURRENCY.symbol}</td>
                      </tr>

                      <tr style={{ borderTop: '1px solid #eaeaea' }}>
                        <td style={{ padding: '10px 0', color: '#000', fontWeight: 800, fontSize: '14px' }}>BALANCE DUE</td>
                        <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 900, color: '#DC2626', fontSize: '16px' }}>{Math.round(Number(detail.balanceDue)).toLocaleString()} {CURRENCY.symbol}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>            </div>
              </div>

              {/* Footer */}
              <hr style={{ border: 'none', borderTop: '1px solid #e8e8e8', marginTop: '30px', marginBottom: '15px' }} />
              <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', fontSize: '11px', color: '#666', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <PhoneOutlined style={{ color: '#3f51b5' }} />
                  <span>{detail.order?.branch?.phone || '01-2345678'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MailOutlined style={{ color: '#3f51b5' }} />
                  <span>{detail.order?.branch?.email || 'billing@maxorder.com'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <EnvironmentOutlined style={{ color: '#3f51b5' }} />
                  <span>{detail.order?.branch?.address || 'No.42, Pyay Road, Yangon, Myanmar'}</span>
                </div>
              </div>

            </div>

            {/* Actions Panel Bottom */}
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {canEditInvoice && (
                <Button
                  type="default"
                  icon={<EditOutlined />}
                  onClick={openEditModal}
                  style={{ borderRadius: '10px', height: '40px', fontWeight: 600, borderColor: '#4F46E5', color: '#4F46E5' }}
                >
                  Edit Invoice
                </Button>
              )}
              {detail.status === 'PENDING_APPROVAL' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={actionLoading}
                  onClick={() => updateStatus(detail, 'APPROVED')}
                  style={{ borderRadius: '10px', height: '40px', fontWeight: 600, background: '#4F46E5', borderColor: '#4F46E5' }}
                >
                  Approve Invoice
                </Button>
              )}
              {detail.status === 'APPROVED' && (
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={actionLoading}
                  onClick={() => updateStatus(detail, 'SENT')}
                  style={{ borderRadius: '10px', height: '40px', fontWeight: 600, background: '#4F46E5', borderColor: '#4F46E5' }}
                >
                  Send to Customer
                </Button>
              )}
              {!['PAID', 'CANCELLED', 'DRAFT'].includes(detail.status) && (
                <Button
                  type="default"
                  icon={<DollarOutlined />}
                  onClick={() => { form.setFieldsValue({ amount: Number(detail.balanceDue), paymentMethod: 'BANK_TRANSFER', paymentDate: dayjs() }); setPaymentOpen(true); }}
                  style={{ borderRadius: '10px', height: '40px', fontWeight: 600 }}
                >
                  Record Payment
                </Button>
              )}
              <Button
                type="default"
                icon={<DownloadOutlined />}
                onClick={handleDownloadPDF}
                style={{ borderRadius: '10px', height: '40px', fontWeight: 600 }}
              >
                Download PDF
              </Button>
              {!['PAID', 'CANCELLED'].includes(detail.status) && (
                <Popconfirm
                  title="Cancel this invoice?"
                  onConfirm={() => updateStatus(detail, 'CANCELLED')}
                  okText="Yes, Cancel"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    loading={actionLoading}
                    style={{ borderRadius: '10px', height: '40px', fontWeight: 600 }}
                  >
                    Cancel Invoice
                  </Button>
                </Popconfirm>
              )}
              <Button
                onClick={() => { setDetailOpen(false); setPaymentOpen(false); }}
                style={{ borderRadius: '10px', height: '40px', fontWeight: 600 }}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Invoice Modal */}
      <Modal
        title={<span><EditOutlined style={{ color: 'var(--primary-color)' }} /> <span style={{ fontWeight: 700 }}>Edit Invoice Details</span></span>}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={saveInvoiceEdit}
        okText="Save Changes"
        confirmLoading={actionLoading}
        width={750}
        destroyOnHidden
        style={{ top: 20 }}
      >
        <Form form={editForm} layout="vertical" onValuesChange={handleFormValuesChange} style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="dueDate" label="Due Date" rules={[{ required: true, message: 'Due date is required' }]}>
                <DatePicker style={{ width: '100%', borderRadius: '10px' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="tax" label="Tax Amount">
                <InputNumber min={0} addonAfter="K" style={{ width: '100%', borderRadius: '10px' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item name="discount" label="Promo Discount">
                <InputNumber min={0} addonAfter="K" style={{ width: '100%', borderRadius: '10px' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="manualDiscount" label="Manual Discount">
                <InputNumber min={0} addonAfter="K" style={{ width: '100%', borderRadius: '10px' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="cashback" label="Cashback">
                <InputNumber min={0} addonAfter="K" style={{ width: '100%', borderRadius: '10px' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="partnerCommission" label="Partner Coms">
                <InputNumber min={0} addonAfter="K" style={{ width: '100%', borderRadius: '10px' }} />
              </Form.Item>
            </Col>
          </Row>



          <Divider style={{ margin: '16px 0' }} />
          <Title level={5} style={{ marginBottom: 12 }}>Product Items</Title>

          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'description']}
                      rules={[{ required: true, message: 'Product required' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Select product"
                        style={{ width: 280 }}
                        optionFilterProp="label"
                        onChange={(_, option: any) => {
                          if (option) {
                            editForm.setFieldValue(['items', name, 'unitPrice'], Number(option.price) || 0);
                            handleFormValuesChange(null, editForm.getFieldsValue());
                          }
                        }}
                      >
                        {productOptions.map((p: any) => (
                          <Select.Option key={p.id} value={p.name} label={`${p.name} (${p.sku})`} price={p.price || 0}>
                            {p.name} - {p.price ? `${Number(p.price).toLocaleString()} ${CURRENCY.symbol}` : `0 ${CURRENCY.symbol}`}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                    
                    <Form.Item
                      {...restField}
                      name={[name, 'quantity']}
                      rules={[{ required: true, message: 'Qty required' }]}
                    >
                      <InputNumber placeholder="Qty" min={1} style={{ width: 80, borderRadius: '8px' }} />
                    </Form.Item>

                    <Form.Item
                      {...restField}
                      name={[name, 'unitPrice']}
                      rules={[{ required: true, message: 'Price required' }]}
                    >
                      <InputNumber placeholder="Price" min={0} style={{ width: 110, borderRadius: '8px' }} addonAfter="K" />
                    </Form.Item>

                    <Form.Item>
                      <Select 
                        style={{ width: 100 }} 
                        placeholder="Type"
                        onChange={(val) => {
                          const currentDesc = editForm.getFieldValue(['items', name, 'description']) || '';
                          let newDesc = currentDesc.replace(/\(FOC\)/g, '').replace(/\(Sample\)/g, '').trim();
                          if (val === 'FOC') {
                            newDesc = `${newDesc} (FOC)`;
                            editForm.setFieldValue(['items', name, 'unitPrice'], 0);
                          } else if (val === 'Sample') {
                            newDesc = `${newDesc} (Sample)`;
                            editForm.setFieldValue(['items', name, 'unitPrice'], 0);
                          }
                          editForm.setFieldValue(['items', name, 'description'], newDesc);
                          handleFormValuesChange(null, editForm.getFieldsValue());
                        }}
                      >
                        <Select.Option value="Regular">Regular</Select.Option>
                        <Select.Option value="FOC">FOC</Select.Option>
                        <Select.Option value="Sample">Sample</Select.Option>
                      </Select>
                    </Form.Item>

                    <Button type="link" danger onClick={() => remove(name)}>Delete</Button>
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 })} block style={{ borderRadius: '10px' }}>
                    Add Product Item
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Card style={{ background: '#f9fafb', borderRadius: '12px', marginTop: 16 }} styles={{ body: { padding: 16 } }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Subtotal:</span>
                <span style={{ fontWeight: 700 }}>{Math.round(editTotals.subtotal).toLocaleString()} {CURRENCY.symbol}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Discounts, Cashback &amp; Coms:</span>
                <span style={{ fontWeight: 700, color: '#DC2626' }}>
                  -{Math.round(editTotals.discount + editTotals.manualDiscount + editTotals.cashback + editTotals.partnerCommission).toLocaleString()} {CURRENCY.symbol}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#666' }}>Tax:</span>
                <span style={{ fontWeight: 700 }}>+{Math.round(editTotals.tax).toLocaleString()} {CURRENCY.symbol}</span>
              </div>
              <div style={{ borderTop: '1px solid #e8e8e8', paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#3f51b5' }}>Estimated Total:</span>
                <span style={{ fontWeight: 900, color: '#3f51b5', fontSize: '15px' }}>{Math.round(editTotals.totalAmount).toLocaleString()} {CURRENCY.symbol}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, color: '#DC2626' }}>Estimated Balance Due:</span>
                <span style={{ fontWeight: 900, color: '#DC2626', fontSize: '15px' }}>{Math.round(editTotals.balanceDue).toLocaleString()} {CURRENCY.symbol}</span>
              </div>
            </div>
          </Card>
        </Form>
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
              { value: 'CASH_DOWN', label: 'Cash Down' },
              { value: 'CHEQUE', label: 'Cheque' },
              { value: 'MOBILE_BANKING', label: 'Mobile Banking' },
              { value: 'CREDIT_NOTE', label: 'Credit Note' },
              { value: 'CREDIT_BALANCE', label: 'Credit Balance' },
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
