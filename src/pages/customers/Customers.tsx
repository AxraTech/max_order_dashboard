import React, { useEffect, useState, useCallback } from 'react';
import {
  Card, Typography, Table, Tag, Input, Select, Space, Row, Col,
  Button, Modal, Form, InputNumber, Switch, message, Popconfirm, Tooltip, Descriptions, Badge,
  Upload, Progress, Alert, Divider, DatePicker, Tabs,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined,
  DeleteOutlined, PhoneOutlined, MailOutlined, CheckCircleOutlined,
  UploadOutlined, DownloadOutlined, InboxOutlined, CheckCircleFilled,
  CalendarOutlined, EnvironmentOutlined, DollarOutlined,
  UserOutlined, IdcardOutlined, FileExcelOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import { api } from '../../services/api';
import { CURRENCY, CustomerCategory } from '../../types/index';

const { Title, Text, Paragraph } = Typography;

interface TerritoryInfo {
  id: string;
  code: string;
  name: string;
  region: string;
}

interface BranchInfo {
  id: string;
  code: string;
  name: string;
  city: string;
}

interface CreditLimitInfo {
  creditLimit: number;
  outstandingBalance: number;
  overdueAmount: number;
  status: string;
}

interface CustomerSalesRepRecord {
  salesRep: {
    code: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  isPrimary: boolean;
}

interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  township: string | null;
  region: string | null;
  district: string | null;
  category: CustomerCategory;
  mainChannel: { id: string, name: string } | null;
  subChannel: { id: string, name: string } | null;
  paymentTermDays: number;
  isActive: boolean;
  dateOfBirth?: string | null;
  nrcNo?: string | null;
  fax?: string | null;
  receiptType?: string | null;
  creditTerm?: string | null;
  arcoa?: string | null;
  type?: string | null;
  cusType1?: string | null;
  cusType2?: string | null;
  division?: string | null;
  customerDate?: string | null;
  branchCode?: string | null;
  territory: TerritoryInfo | null;
  branch: BranchInfo | null;
  creditLimit: CreditLimitInfo | null;
  customerSalesReps?: CustomerSalesRepRecord[];
  _count: { orders: number };
}



const CREDIT_STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'processing'> = {
  GOOD_STANDING: 'success',
  OVERDUE: 'warning',
  OVER_LIMIT: 'error',
  CREDIT_HOLD: 'error',
};

export const Customers: React.FC = () => {
  // Data State
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [territories, setTerritories] = useState<TerritoryInfo[]>([]);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [mainChannels, setMainChannels] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');
  const [territoryFilter, setTerritoryFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);

  // Create/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    totalRows: number;
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
    errorCount: number;
    errors: Array<{ row: number; code?: string; error: string }>;
  } | null>(null);

  // Detail Modal
  const [detailCustomer, setDetailCustomer] = useState<CustomerRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Export Customers to Excel
  const [exportLoading, setExportLoading] = useState(false);
  const handleExportExcel = async () => {
    try {
      setExportLoading(true);
      message.loading({ content: 'Exporting customers to Excel...', key: 'exportCust' });
      const res = await api.get('/customers', {
        params: {
          page: 1,
          limit: 10000,
          search: search || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          branchId: branchFilter !== 'all' ? branchFilter : undefined,
          territoryId: territoryFilter !== 'all' ? territoryFilter : undefined,
          isActive: activeFilter !== 'all' ? String(activeFilter === 'active') : undefined,
        },
      });

      if (!res.data.success || !res.data.data || res.data.data.length === 0) {
        message.warning({ content: 'No customer data found to export', key: 'exportCust' });
        return;
      }

      const rawList = res.data.data;
      const exportData = rawList.map((c: any, index: number) => {
        const primarySR = c.customerSalesReps?.find((csr: any) => csr.isPrimary)?.salesRep || c.customerSalesReps?.[0]?.salesRep;
        const srName = primarySR?.user ? `${primarySR.user.firstName} ${primarySR.user.lastName}` : (primarySR?.code || '');
        return {
          'No': index + 1,
          'Customer Code': c.code,
          'Customer Name': c.name,
          'Category': c.category || '',
          'Contact Person': c.contactPerson || '',
          'Phone': c.phone || '',
          'Email': c.email || '',
          'Address': c.address || '',
          'Township': c.township || '',
          'City': c.city || '',
          'District': c.district || '',
          'Region': c.region || '',
          'Territory': c.territory?.name || '',
          'Branch': c.branch?.name || c.branchCode || '',
          'Division': c.division || '',
          'Receipt Type': c.receiptType || '',
          'Payment Term': c.creditTerm || (c.paymentTermDays ? `${c.paymentTermDays} Days` : ''),
          'Credit Limit': c.creditLimit?.creditLimit != null ? Number(c.creditLimit.creditLimit) : '',
          'Outstanding Balance': c.creditLimit?.outstandingBalance != null ? Number(c.creditLimit.outstandingBalance) : 0,
          'Credit Status': c.creditLimit?.status || '',
          'Main Channel': c.mainChannel?.name || c.type || '',
          'Sub Channel': c.subChannel?.name || c.cusType1 || '',
          'Sales Rep': srName,
          'Status': c.isActive ? 'Active' : 'Inactive',
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Customers');
      const filename = `Customers_Export_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`;
      XLSX.writeFile(wb, filename);
      message.success({ content: `Successfully exported ${exportData.length} customers!`, key: 'exportCust' });
    } catch (err: any) {
      console.error(err);
      message.error({ content: 'Failed to export customers to Excel', key: 'exportCust' });
    } finally {
      setExportLoading(false);
    }
  };

  // Download Sample Customer Template
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'No', 'Customer ID', 'Customer Name', 'Date Of Birth', 'NRC No.', 'Contact Person',
      'Address', 'Phone', 'Fax', 'Email Address', 'Receipt Type', 'Credit Term', 'Credit Limit',
      'ARCOA', 'Type', 'Cus Type 1', 'Cus Type 2', 'Div:', 'Township', 'Customer Date', 'Branch ID', 'Branch'
    ];
    const sampleRows = [
      [1, '7000001', 'Academy Clinic (AL)', '', '', 'Dr. Aung', 'Baho Road', '095123456', '', 'academy@example.com', 'Invoice', '14D', 3000000, 'AR', 'MEDICALCHANNEL', 'RETAIL/POS', 'GENERALCLINIC', 'LD', 'AHLONE', '01/05/2025', 'HO', 'Yangon'],
      [2, '1400001', 'Central Pharmacy (MDY)', '', '', 'Daw Thida', '78th Road', '097987654', '', '', 'Invoice', '30D', 5000000, 'AR', 'TRADECHANNEL', 'OTC/PHARMACY', 'DRUGSTORE', 'MD', 'CHAN AYE THAR ZAN', '28/05/2026', 'MDY', 'Mandalay']
    ];

    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'Customer_Import_Template.xlsx');
    message.success('Sample customer import template downloaded');
  };

  // Execute Excel Import
  const handleExecuteImport = async () => {
    if (!importFile) {
      message.warning('Please select an Excel file (.xlsx or .xls) to upload');
      return;
    }

    try {
      setImporting(true);
      setImportResults(null);
      const formData = new FormData();
      formData.append('file', importFile);

      const res = await api.post('/customers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        setImportResults(res.data.data);
        message.success(res.data.message || 'Customers processed successfully');
        fetchCustomers();
      } else {
        message.error(res.data.message || 'Import failed');
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to import customer Excel file');
    } finally {
      setImporting(false);
    }
  };

  // Fetch territories for filter/form dropdowns
  useEffect(() => {
    api.get('/territories').then(res => {
      if (res.data.success) setTerritories(res.data.data);
    }).catch(() => { });
    api.get('/branches').then(res => {
      if (res.data.success) setBranches(res.data.data);
    }).catch(() => { });
    api.get('/channels/main').then(res => {
      if (res.data.success) setMainChannels(res.data.data);
    }).catch(() => { });
  }, []);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/customers', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: search || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          branchId: branchFilter !== 'all' ? branchFilter : undefined,
          territoryId: territoryFilter !== 'all' ? territoryFilter : undefined,
          isActive: activeFilter !== 'all' ? String(activeFilter === 'active') : undefined,
        },
      });
      if (res.data.success) {
        setCustomers(res.data.data);
        setTotalItems(res.data.meta?.total || 0);
      }
    } catch {
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, search, categoryFilter, branchFilter, territoryFilter, activeFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchCustomers();
    };
    window.addEventListener('api-update:customer', handleUpdate);
    return () => {
      window.removeEventListener('api-update:customer', handleUpdate);
    };
  }, [fetchCustomers]);

  // ---- Create / Edit ----
  const openCreateModal = () => {
    setEditingCustomer(null);
    form.resetFields();
    form.setFieldsValue({
      category: 'REGULAR',
      paymentTermDays: 30,
      creditTerm: '30D',
      receiptType: 'Invoice',
      arcoa: 'AR',
      division: 'LD',
      branchCode: 'HO',
      customerDate: dayjs(),
      isActive: true,
    });
    if (branches.length > 0) {
      form.setFieldValue('branchId', branches[0].id);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (record: CustomerRecord) => {
    setEditingCustomer(record);
    form.setFieldsValue({
      name: record.name,
      contactPerson: record.contactPerson,
      phone: record.phone,
      email: record.email,
      address: record.address,
      city: record.city,
      township: record.township,
      region: record.region,
      district: record.district,
      category: record.category,
      mainChannelId: record.mainChannel?.id,
      subChannelId: record.subChannel?.id,
      paymentTermDays: record.paymentTermDays,
      territoryId: record.territory?.id || null,
      branchId: record.branch?.id || null,
      creditLimit: record.creditLimit?.creditLimit ? Number(record.creditLimit.creditLimit) : undefined,
      isActive: record.isActive,
      dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
      nrcNo: record.nrcNo,
      fax: record.fax,
      receiptType: record.receiptType || 'Invoice',
      creditTerm: record.creditTerm || (record.paymentTermDays ? `${record.paymentTermDays}D` : '30D'),
      arcoa: record.arcoa || 'AR',
      type: record.type,
      cusType1: record.cusType1,
      cusType2: record.cusType2,
      division: record.division,
      customerDate: record.customerDate ? dayjs(record.customerDate) : null,
      branchCode: record.branchCode || 'HO',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);
      const payload = {
        ...values,
        dateOfBirth: values.dateOfBirth ? (values.dateOfBirth.toISOString ? values.dateOfBirth.toISOString() : values.dateOfBirth) : null,
        customerDate: values.customerDate ? (values.customerDate.toISOString ? values.customerDate.toISOString() : values.customerDate) : null,
      };

      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, payload);
        message.success('Customer updated successfully');
      } else {
        await api.post('/customers', payload);
        message.success('Customer created successfully');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Delete ----
  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/customers/${id}`);
      message.success('Customer deleted');
      fetchCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  // ---- Approve / Activate Customer ----
  const handleApproveCustomer = async (id: string) => {
    try {
      await api.put(`/customers/${id}`, { isActive: true });
      message.success('Customer approved and activated successfully');
      fetchCustomers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to approve customer');
    }
  };

  // ---- View Detail ----
  const handleViewDetail = async (id: string) => {
    try {
      const res = await api.get(`/customers/${id}`);
      if (res.data.success) {
        setDetailCustomer(res.data.data);
        setDetailOpen(true);
      }
    } catch {
      message.error('Failed to load customer details');
    }
  };

  // ---- Table Columns ----
  const columns: ColumnsType<CustomerRecord> = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      render: (code: string, record: CustomerRecord) => (
        <div style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Text code style={{ fontWeight: 700, color: '#4F46E5', fontSize: '13px', whiteSpace: 'nowrap', letterSpacing: '0.5px' }}>
            {code}
          </Text>
          {record.division && (
            <Tag color="cyan" style={{ fontSize: '10px', padding: '0 4px', margin: 0, borderRadius: '4px', fontWeight: 600, lineHeight: '18px', whiteSpace: 'nowrap' }}>
              {record.division}
            </Tag>
          )}
          {record.branchCode && (
            <Tag color="purple" style={{ fontSize: '10px', padding: '0 4px', margin: 0, borderRadius: '4px', fontWeight: 600, lineHeight: '18px', whiteSpace: 'nowrap' }}>
              {record.branchCode}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Customer Name',
      key: 'name',
      width: 240,
      render: (_: any, record: CustomerRecord) => (
        <div style={{ minWidth: 200 }}>
          <div style={{ fontWeight: 600, color: '#111827', fontSize: '13px', lineHeight: '18px', marginBottom: '4px' }}>
            {record.name}
          </div>
          <Space size={4} wrap>
            <Tag color={
              record.category === 'VIP' ? 'gold' :
                record.category === 'WHOLESALE' ? 'blue' :
                  record.category === 'DEALER' ? 'purple' : 'default'
            } style={{ borderRadius: '6px', fontSize: '11px', fontWeight: 600, border: 'none', margin: 0 }}>
              {record.category}
            </Tag>
            {record.contactPerson && (
              <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                👤 {record.contactPerson}
              </Text>
            )}
          </Space>
          {record.nrcNo && (
            <div style={{ marginTop: '3px' }}>
              <Text type="secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                <IdcardOutlined style={{ marginRight: 4 }} />{record.nrcNo}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 180,
      render: (_: any, record: CustomerRecord) => (
        <Space direction="vertical" size={2}>
          {record.phone ? (
            <Text style={{ fontSize: '13px' }}>
              <PhoneOutlined style={{ marginRight: 6, color: '#10B981' }} />
              {record.phone}
            </Text>
          ) : <Text type="secondary" style={{ fontSize: '12px' }}>No phone</Text>}
          {record.email && (
            <Text style={{ fontSize: '12px' }} type="secondary" ellipsis={{ tooltip: record.email }}>
              <MailOutlined style={{ marginRight: 6, color: '#6366F1' }} />
              {record.email}
            </Text>
          )}
          {record.fax && (
            <Text style={{ fontSize: '11px' }} type="secondary">
              Fax: {record.fax}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Township / Location',
      key: 'location',
      width: 170,
      render: (_: any, record: CustomerRecord) => (
        <Space direction="vertical" size={2}>
          {record.township && (
            <Tag color="geekblue" style={{ borderRadius: '6px', fontWeight: 600, margin: 0 }}>
              {record.township}
            </Tag>
          )}
          <Text style={{ fontSize: '12px', color: '#4B5563' }}>
            {record.city || record.region || (record.address ? record.address.substring(0, 20) + '...' : '—')}
          </Text>
          {record.address && (
            <Tooltip title={record.address}>
              <Text type="secondary" style={{ fontSize: '11px', cursor: 'pointer' }} ellipsis>
                📍 {record.address}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Channel & Type',
      key: 'channel',
      width: 180,
      render: (_: any, record: CustomerRecord) => {
        const mainName = record.mainChannel?.name || record.type;
        const subName = record.subChannel?.name || record.cusType2 || record.cusType1;
        return (
          <Space direction="vertical" size={2}>
            {mainName ? (
              <Tag color="blue" style={{ borderRadius: '6px', border: 'none', fontWeight: 600, margin: 0 }}>
                {mainName}
              </Tag>
            ) : <Text type="secondary">—</Text>}
            {subName && (
              <Tag color="magenta" style={{ borderRadius: '6px', border: 'none', fontSize: '11px', margin: 0 }}>
                {subName}
              </Tag>
            )}
            {record.cusType1 && record.cusType1 !== subName && (
              <Text type="secondary" style={{ fontSize: '10px' }}>
                Type 1: {record.cusType1}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Branch & Territory',
      key: 'branch',
      width: 150,
      render: (_: any, record: CustomerRecord) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: '13px', fontWeight: 500 }}>
            {record.branch ? record.branch.name : (record.branchCode ? `Branch (${record.branchCode})` : 'All Branches')}
          </Text>
          {record.territory && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              🗺️ {record.territory.name}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Payment & Credit',
      key: 'credit',
      width: 170,
      render: (_: any, record: CustomerRecord) => {
        const cl = record.creditLimit;
        const term = record.creditTerm || (record.paymentTermDays ? `${record.paymentTermDays}D` : '30D');
        return (
          <Space direction="vertical" size={2}>
            {cl && cl.creditLimit ? (
              <Text style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                {Number(cl.creditLimit).toLocaleString()} {CURRENCY.symbol}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>No limit</Text>
            )}
            <Space size={4} wrap>
              <Tag color="volcano" style={{ borderRadius: '4px', fontSize: '10px', padding: '0 4px', margin: 0, fontWeight: 600 }}>
                {term}
              </Tag>
              {record.receiptType && (
                <Tag color="default" style={{ borderRadius: '4px', fontSize: '10px', padding: '0 4px', margin: 0 }}>
                  {record.receiptType}
                </Tag>
              )}
              {record.arcoa && (
                <Tag color="gold" style={{ borderRadius: '4px', fontSize: '10px', padding: '0 4px', margin: 0 }}>
                  {record.arcoa}
                </Tag>
              )}
            </Space>
            {cl && (
              <Space size={4}>
                <Badge status={CREDIT_STATUS_COLORS[cl.status] || 'default'} />
                <Text style={{ fontSize: '11px' }} type="secondary">
                  {cl.status.replace('_', ' ')}
                </Text>
              </Space>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Customer Date',
      key: 'customerDate',
      width: 130,
      render: (_: any, record: CustomerRecord) => (
        record.customerDate ? (
          <Space size={4}>
            <CalendarOutlined style={{ color: 'var(--text-secondary)' }} />
            <Text style={{ fontSize: '12px' }}>
              {dayjs(record.customerDate).format('DD/MM/YYYY')}
            </Text>
          </Space>
        ) : <Text type="secondary">—</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 125,
      render: (_: any, record: CustomerRecord) => (
        <Tag color={record.isActive ? 'green' : 'orange'} style={{ borderRadius: '8px', border: 'none', fontWeight: 600 }}>
          {record.isActive ? 'Active' : 'Pending Activation'}
        </Tag>
      ),
    },
    {
      title: 'Submitted By / SR',
      key: 'salesRep',
      width: 155,
      render: (_: any, record: CustomerRecord) => {
        const primarySR = record.customerSalesReps?.find(csr => csr.isPrimary)?.salesRep || record.customerSalesReps?.[0]?.salesRep;
        if (!primarySR) return <Text type="secondary">—</Text>;
        return (
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: '13px' }}>{primarySR.user.firstName} {primarySR.user.lastName}</Text>
            <Text type="secondary" style={{ fontSize: '11px' }}>{primarySR.code}</Text>
          </Space>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_: any, record: CustomerRecord) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record.id)}
            />
          </Tooltip>
          {!record.isActive && (
            <Popconfirm
              title="Approve and activate this customer?"
              onConfirm={() => handleApproveCustomer(record.id)}
              okText="Approve"
            >
              <Tooltip title="Approve Customer">
                <Button
                  type="text"
                  size="small"
                  icon={<CheckCircleOutlined style={{ color: '#10B981' }} />}
                />
              </Tooltip>
            </Popconfirm>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this customer?"
            description="Customers with orders will be deactivated instead."
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      {/* Page Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Customers</Title>
          <Text type="secondary">Manage customer accounts, credit limits, and excel batch imports</Text>
        </div>
        <Space size="middle" wrap>
          <Button
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            loading={exportLoading}
            style={{ borderRadius: '12px', color: '#16A34A', borderColor: '#86EFAC', fontWeight: 600 }}
          >
            Export Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadTemplate}
            style={{ borderRadius: '12px' }}
          >
            Download Template
          </Button>
          <Button
            icon={<UploadOutlined />}
            onClick={() => {
              setIsImportModalOpen(true);
              setImportResults(null);
              setImportFile(null);
            }}
            style={{ borderRadius: '12px', borderColor: '#6366F1', color: '#6366F1', fontWeight: 600 }}
          >
            Import Excel
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            style={{ borderRadius: '12px' }}
          >
            Add Customer
          </Button>
        </Space>
      </div>

      {/* Filters */}
      <Card className="glass-card" variant="borderless" style={{ marginBottom: '20px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input
              placeholder="Search by name, code, contact or phone..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ borderRadius: '12px' }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={categoryFilter}
              onChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Categories</Select.Option>
              <Select.Option value="REGULAR">Regular</Select.Option>
              <Select.Option value="VIP">VIP</Select.Option>
              <Select.Option value="WHOLESALE">Wholesale</Select.Option>
              <Select.Option value="DEALER">Dealer</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={branchFilter}
              onChange={(val) => { setBranchFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Branches</Select.Option>
              {branches.map((b) => (
                <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={territoryFilter}
              onChange={(val) => { setTerritoryFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Territories</Select.Option>
              {territories.map((t) => (
                <Select.Option key={t.id} value={t.id}>{t.name}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={5}>
            <Select
              style={{ width: '100%', borderRadius: '12px' }}
              value={activeFilter}
              onChange={(val) => { setActiveFilter(val); setCurrentPage(1); }}
            >
              <Select.Option value="all">All Status</Select.Option>
              <Select.Option value="active">Active</Select.Option>
              <Select.Option value="inactive">Inactive</Select.Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: '0px' } }}>
        <Table
          columns={columns}
          dataSource={customers.map((item) => ({ ...item, key: item.id }))}
          loading={loading}
          scroll={{ x: 1600 }}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: totalItems,
            showSizeChanger: true,
            onChange: (page, size) => { setCurrentPage(page); setPageSize(size); },
            style: { padding: '16px' },
          }}
        />
      </Card>

      {/* Create / Edit Modal */}
      <Modal
        title={
          <span style={{ fontWeight: 700, fontSize: '18px' }}>
            {editingCustomer ? `Edit Customer: ${editingCustomer.name} (${editingCustomer.code})` : 'Create New Customer'}
          </span>
        }
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: '16px' }}
        >
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: (
                  <span>
                    <UserOutlined /> Basic & Identity
                  </span>
                ),
                children: (
                  <div style={{ paddingTop: '8px' }}>
                    <Row gutter={16}>
                      <Col span={14}>
                        <Form.Item
                          name="name"
                          label="Customer Name"
                          rules={[{ required: true, message: 'Please input customer name!' }]}
                        >
                          <Input placeholder="e.g. Academy Clinic (AL)" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={10}>
                        <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                          <Select style={{ borderRadius: '8px' }}>
                            <Select.Option value="REGULAR">Regular</Select.Option>
                            <Select.Option value="VIP">VIP</Select.Option>
                            <Select.Option value="WHOLESALE">Wholesale</Select.Option>
                            <Select.Option value="DEALER">Dealer</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="contactPerson" label="Contact Person">
                          <Input placeholder="e.g. Dr. Aung" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="phone" label="Phone Number">
                          <Input placeholder="e.g. 09-5123456" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="email"
                          label="Email Address (optional)"
                          rules={[{ type: 'email', message: 'Please enter a valid email!' }]}
                        >
                          <Input placeholder="e.g. academy@example.com" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="fax" label="Fax (optional)">
                          <Input placeholder="e.g. 01-123456" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    {!editingCustomer && (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Form.Item
                            name="password"
                            label="Password (optional for portal)"
                            rules={[{ min: 6, message: 'Password must be at least 6 characters' }]}
                            extra="Leave blank if customer portal login is not needed"
                          >
                            <Input.Password placeholder="Customer login password" style={{ borderRadius: '8px' }} />
                          </Form.Item>
                        </Col>
                      </Row>
                    )}

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="nrcNo" label="NRC No.">
                          <Input placeholder="e.g. 12/LKN(N)123456" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="dateOfBirth" label="Date of Birth">
                          <DatePicker style={{ width: '100%', borderRadius: '8px' }} format="YYYY-MM-DD" placeholder="Select DOB" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: 'location_channels',
                label: (
                  <span>
                    <EnvironmentOutlined /> Location & Channels
                  </span>
                ),
                children: (
                  <div style={{ paddingTop: '8px' }}>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="township" label="Township">
                          <Input placeholder="e.g. AHLONE" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="city" label="City">
                          <Input placeholder="e.g. Yangon" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="region" label="Region / State">
                          <Input placeholder="e.g. Yangon Region" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="district" label="District">
                          <Input placeholder="e.g. West District" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item name="address" label="Street Address">
                          <Input.TextArea placeholder="Full street address..." style={{ borderRadius: '8px' }} rows={2} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ margin: '12px 0' }}>Channel & Business Classification</Divider>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="mainChannelId" label="Main Channel (System)">
                          <Select
                            allowClear
                            placeholder="Select main channel"
                            style={{ borderRadius: '8px' }}
                            onChange={(val) => {
                              form.setFieldValue('subChannelId', undefined);
                              const selected = mainChannels.find(mc => mc.id === val);
                              if (selected) {
                                form.setFieldValue('type', selected.name);
                              }
                            }}
                          >
                            {mainChannels.map(mc => (
                              <Select.Option key={mc.id} value={mc.id}>{mc.name}</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="type" label="Type / Channel Code (Excel Type)" tooltip="e.g. MEDICALCHANNEL, TRADECHANNEL">
                          <Input placeholder="e.g. MEDICALCHANNEL" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, curr) => prev.mainChannelId !== curr.mainChannelId}
                        >
                          {() => {
                            const selectedMainId = form.getFieldValue('mainChannelId');
                            const selectedMain = mainChannels.find(mc => mc.id === selectedMainId);
                            const subChannels = selectedMain ? selectedMain.subChannels : [];
                            return (
                              <Form.Item name="subChannelId" label="Sub Channel (System)">
                                <Select
                                  allowClear
                                  placeholder="Select sub channel"
                                  style={{ borderRadius: '8px' }}
                                  disabled={!selectedMainId}
                                  onChange={(val) => {
                                    const sc = subChannels?.find((s: any) => s.id === val);
                                    if (sc) {
                                      form.setFieldValue('cusType2', sc.name);
                                    }
                                  }}
                                >
                                  {subChannels.map((sc: any) => (
                                    <Select.Option key={sc.id} value={sc.id}>{sc.name}</Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="cusType1" label="Cus Type 1" tooltip="e.g. RETAIL/POS, WHOLESALE/DISTRIBUTOR">
                          <Input placeholder="e.g. RETAIL/POS" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="cusType2" label="Cus Type 2" tooltip="e.g. GENERALCLINIC, DRUGSTORE">
                          <Input placeholder="e.g. GENERALCLINIC" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Divider style={{ margin: '12px 0' }}>Branch & Territory Assignment</Divider>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item name="branchId" label="Assigned Branch">
                          <Select
                            placeholder="All branches"
                            allowClear
                            style={{ borderRadius: '8px' }}
                            onChange={(val) => {
                              const b = branches.find(br => br.id === val);
                              if (b) {
                                form.setFieldValue('branchCode', b.code);
                              }
                            }}
                          >
                            {branches.map((b) => (
                              <Select.Option key={b.id} value={b.id}>{b.name} ({b.code})</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="branchCode" label="Branch Code / ID" tooltip="e.g. HO, 7000000">
                          <Input placeholder="e.g. HO" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="territoryId" label="Territory">
                          <Select
                            placeholder="Select territory"
                            allowClear
                            style={{ borderRadius: '8px' }}
                          >
                            {territories.map((t) => (
                              <Select.Option key={t.id} value={t.id}>{t.name} ({t.region})</Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: 'financials',
                label: (
                  <span>
                    <DollarOutlined /> Terms, Financials & Dates
                  </span>
                ),
                children: (
                  <div style={{ paddingTop: '8px' }}>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item name="paymentTermDays" label="Payment Term (Days)" normalize={(v) => v === '' ? undefined : Number(v)}>
                          <InputNumber
                            min={0}
                            max={365}
                            style={{ width: '100%', borderRadius: '8px' }}
                            onChange={(val) => {
                              if (val !== undefined && val !== null) {
                                form.setFieldValue('creditTerm', `${val}D`);
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="creditTerm" label="Credit Term Tag" tooltip="e.g. 14D, 30D, 45D, 60D">
                          <Input placeholder="e.g. 30D" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="creditLimit" label={`Credit Limit (${CURRENCY.symbol})`} normalize={(v) => v === '' ? undefined : Number(v)}>
                          <InputNumber
                            min={0}
                            style={{ width: '100%', borderRadius: '8px' }}
                            placeholder="Amount in MMK"
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item name="receiptType" label="Receipt Type" tooltip="e.g. Invoice, Cash">
                          <Input placeholder="e.g. Invoice" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="arcoa" label="AR COA Account" tooltip="e.g. AR, 1001-AR">
                          <Input placeholder="e.g. AR" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="division" label="Division Code (Div:)" tooltip="e.g. LD, MD">
                          <Input placeholder="e.g. LD" style={{ borderRadius: '8px' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="customerDate" label="Customer / Registration Date">
                          <DatePicker style={{ width: '100%', borderRadius: '8px' }} format="YYYY-MM-DD" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="isActive" label="Active Status" valuePropName="checked" style={{ paddingTop: '28px' }}>
                          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
            ]}
          />

          <Divider style={{ margin: '16px 0' }} />

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => { setIsModalOpen(false); form.resetFields(); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting} style={{ borderRadius: '8px' }}>
                {editingCustomer ? 'Update Customer' : 'Create Customer'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Import Excel Modal */}
      <Modal
        title={
          <Space>
            <UploadOutlined style={{ color: '#6366F1', fontSize: '20px' }} />
            <span style={{ fontWeight: 700, fontSize: '18px' }}>Import Customers from Excel</span>
          </Space>
        }
        open={isImportModalOpen}
        onCancel={() => {
          if (!importing) {
            setIsImportModalOpen(false);
            setImportFile(null);
            setImportResults(null);
          }
        }}
        footer={null}
        width={720}
        destroyOnHidden
      >
        <Space orientation="vertical" size="middle" style={{ width: '100%', marginTop: '12px' }}>
          <Alert
            message="Excel Format Guidelines"
            description={
              <div>
                <Paragraph style={{ margin: 0, fontSize: '13px' }}>
                  Supports <code>customer_(Account Update).xlsx</code> and standard templates. Header row is auto-detected dynamically (supports Row 1, 2, or 3).
                </Paragraph>
                <div style={{ marginTop: '8px' }}>
                  <Button
                    size="small"
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={handleDownloadTemplate}
                    style={{ padding: 0 }}
                  >
                    Download Standard Excel Template (.xlsx)
                  </Button>
                </div>
              </div>
            }
            type="info"
            showIcon
          />

          <Upload.Dragger
            accept=".xlsx, .xls"
            maxCount={1}
            beforeUpload={(file) => {
              setImportFile(file);
              setImportResults(null);
              return false;
            }}
            onRemove={() => {
              setImportFile(null);
              setImportResults(null);
            }}
            style={{ padding: '20px', borderRadius: '12px', background: '#F9FAFB' }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#6366F1', fontSize: '48px' }} />
            </p>
            <p className="ant-upload-text" style={{ fontWeight: 600 }}>
              {importFile ? importFile.name : 'Click or drag customer Excel file to this area'}
            </p>
            <p className="ant-upload-hint" style={{ color: '#6B7280' }}>
              Support for single .xlsx or .xls files up to 20MB.
            </p>
          </Upload.Dragger>

          {importing && (
            <div style={{ textAlign: 'center', padding: '16px' }}>
              <Progress percent={100} status="active" showInfo={false} strokeColor="#6366F1" />
              <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                Processing and syncing customer records...
              </Text>
            </div>
          )}

          {importResults && (
            <Card
              size="small"
              style={{
                borderRadius: '12px',
                borderColor: importResults.errorCount === 0 ? '#10B981' : '#F59E0B',
                background: '#F0FDF4',
              }}
            >
              <Space orientation="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircleFilled style={{ color: '#10B981', fontSize: '18px' }} />
                  <Text strong style={{ fontSize: '15px' }}>Import Completed</Text>
                </div>
                <Row gutter={[16, 8]}>
                  <Col span={6}>
                    <Text type="secondary">Total Read:</Text> <Text strong>{importResults.totalRows}</Text>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Created:</Text> <Text strong style={{ color: '#10B981' }}>{importResults.importedCount}</Text>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Updated:</Text> <Text strong style={{ color: '#0EA5E9' }}>{importResults.updatedCount}</Text>
                  </Col>
                  <Col span={6}>
                    <Text type="secondary">Skipped:</Text> <Text strong style={{ color: '#6B7280' }}>{importResults.skippedCount}</Text>
                  </Col>
                </Row>

                {importResults.errors && importResults.errors.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <Text type="danger" strong>Errors ({importResults.errors.length}):</Text>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '12px', color: '#DC2626' }}>
                      {importResults.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>Row {err.row} ({err.code || 'No Code'}): {err.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Space>
            </Card>
          )}

          <Divider style={{ margin: '8px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <Button
              onClick={() => {
                setIsImportModalOpen(false);
                setImportFile(null);
                setImportResults(null);
              }}
              disabled={importing}
            >
              {importResults ? 'Close' : 'Cancel'}
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleExecuteImport}
              loading={importing}
              disabled={!importFile}
              style={{ borderRadius: '8px' }}
            >
              Start Import
            </Button>
          </div>
        </Space>
      </Modal>

      {/* Detail Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '18px' }}>Customer Details</span>}
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={720}
        destroyOnHidden
      >
        {detailCustomer && (
          <Space orientation="vertical" size="middle" style={{ width: '100%', marginTop: '16px' }}>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Customer ID / Code">
                <Text code strong>{detailCustomer.code}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Customer Name">
                <Text strong>{detailCustomer.name}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Contact Person">{detailCustomer.contactPerson || '—'}</Descriptions.Item>
              <Descriptions.Item label="Phone">{detailCustomer.phone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailCustomer.email || '—'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Badge status={detailCustomer.isActive ? 'success' : 'warning'} text={detailCustomer.isActive ? 'Active' : 'Pending Activation'} />
              </Descriptions.Item>
              <Descriptions.Item label="Township">{detailCustomer.township || '—'}</Descriptions.Item>
              <Descriptions.Item label="City">{detailCustomer.city || '—'}</Descriptions.Item>
              <Descriptions.Item label="Region">{detailCustomer.region || '—'}</Descriptions.Item>
              <Descriptions.Item label="District">{detailCustomer.district || '—'}</Descriptions.Item>
              <Descriptions.Item label="Street Address" span={2}>{detailCustomer.address || '—'}</Descriptions.Item>

              <Descriptions.Item label="Main Channel">
                {detailCustomer.mainChannel
                  ? <Tag color="geekblue" style={{ borderRadius: '8px', border: 'none', fontWeight: 600 }}>{detailCustomer.mainChannel.name}</Tag>
                  : (detailCustomer.type ? <Tag color="default">{detailCustomer.type}</Tag> : '—')}
              </Descriptions.Item>
              <Descriptions.Item label="Sub Channel">
                {detailCustomer.subChannel
                  ? <Tag color="purple" style={{ borderRadius: '8px', border: 'none', fontWeight: 600 }}>{detailCustomer.subChannel.name}</Tag>
                  : (detailCustomer.cusType2 || detailCustomer.cusType1 || '—')}
              </Descriptions.Item>

              <Descriptions.Item label="Branch">
                {detailCustomer.branch
                  ? `${detailCustomer.branch.name} (${detailCustomer.branch.code})`
                  : (detailCustomer.branchCode || 'All Branches')}
              </Descriptions.Item>
              <Descriptions.Item label="Territory">
                {detailCustomer.territory
                  ? `${detailCustomer.territory.name} (${detailCustomer.territory.region})`
                  : '—'}
              </Descriptions.Item>

              <Descriptions.Item label="Payment Terms">
                {detailCustomer.paymentTermDays} Days ({detailCustomer.creditTerm || `${detailCustomer.paymentTermDays}D`})
              </Descriptions.Item>
              <Descriptions.Item label="Receipt Type">{detailCustomer.receiptType || 'Invoice'}</Descriptions.Item>
              <Descriptions.Item label="AR COA">{detailCustomer.arcoa || 'AR'}</Descriptions.Item>
              <Descriptions.Item label="Division Code">{detailCustomer.division || '—'}</Descriptions.Item>
              <Descriptions.Item label="Customer Date">
                {detailCustomer.customerDate ? new Date(detailCustomer.customerDate).toLocaleDateString() : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {detailCustomer.dateOfBirth ? new Date(detailCustomer.dateOfBirth).toLocaleDateString() : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="NRC No.">{detailCustomer.nrcNo || '—'}</Descriptions.Item>
              <Descriptions.Item label="Fax">{detailCustomer.fax || '—'}</Descriptions.Item>

              <Descriptions.Item label="Submitted By / SR">
                {(() => {
                  const primarySR = detailCustomer.customerSalesReps?.find(csr => csr.isPrimary)?.salesRep || detailCustomer.customerSalesReps?.[0]?.salesRep;
                  if (!primarySR) return '—';
                  return `${primarySR.user?.firstName} ${primarySR.user?.lastName} (${primarySR.code})`;
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Total Orders">{detailCustomer._count?.orders ?? 0}</Descriptions.Item>
            </Descriptions>

            {detailCustomer.creditLimit && (
              <Card size="small" title="Credit Information" style={{ borderRadius: '12px' }}>
                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="Credit Limit">
                    <Text strong>{Number(detailCustomer.creditLimit.creditLimit).toLocaleString()} {CURRENCY.symbol}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Badge status={CREDIT_STATUS_COLORS[detailCustomer.creditLimit.status] || 'default'} />
                    <Text style={{ marginLeft: 6 }}>{detailCustomer.creditLimit.status.replace('_', ' ')}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="Outstanding">
                    {Number(detailCustomer.creditLimit.outstandingBalance).toLocaleString()} {CURRENCY.symbol}
                  </Descriptions.Item>
                  <Descriptions.Item label="Overdue">
                    <Text type="danger">
                      {Number(detailCustomer.creditLimit.overdueAmount).toLocaleString()} {CURRENCY.symbol}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            )}

            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setDetailOpen(false)}>Close</Button>
                <Button
                  type="primary"
                  onClick={() => {
                    setDetailOpen(false);
                    openEditModal(detailCustomer);
                  }}
                >
                  Edit Customer
                </Button>
              </Space>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};
