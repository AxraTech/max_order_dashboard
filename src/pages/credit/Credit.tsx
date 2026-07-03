import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, message, Select, Space, Table, Tag, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { CURRENCY } from '../../types/index';

const { Title, Text } = Typography;

const STATUS_COLOR: Record<string, string> = {
  GOOD_STANDING: 'green',
  OVERDUE: 'orange',
  OVER_LIMIT: 'red',
  CREDIT_HOLD: 'volcano',
};

interface CreditRecord {
  id: string;
  creditLimit: number;
  temporaryIncrease: number;
  outstandingBalance: number;
  overdueAmount: number;
  status: string;
  customer: { id: string; code: string; name: string; paymentTermDays: number; branch?: { name: string } | null; _count: { orders: number; invoices: number } };
}

export const Credit: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<CreditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Load branches list
  useEffect(() => {
    api.get('/branches').then(res => {
      if (res.data.success) setBranches(res.data.data);
    }).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/credit', {
        params: {
          page,
          limit: pageSize,
          search: search || undefined,
          status: status || undefined,
          branchId: branchFilter !== 'all' ? branchFilter : undefined,
        }
      });
      if (res.data.success) {
        setItems(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load credit records');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, status, branchFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (record: CreditRecord, nextStatus: string) => {
    try {
      await api.put(`/credit/${record.customer.id}`, { status: nextStatus });
      message.success('Credit status updated');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update credit');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Credit Management</Title>
          <Text type="secondary">Monitor credit limits, overdue exposure, and customer holds</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
      </div>
      <Card className="glass-card" variant="borderless" style={{ marginBottom: 20 }}>
        <Space wrap>
          <Input prefix={<SearchOutlined />} placeholder="Search customer..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} allowClear style={{ width: 280 }} />
          <Select value={branchFilter} style={{ width: 200 }} onChange={(v) => { setBranchFilter(v); setPage(1); }}>
            <Select.Option value="all">All Branches</Select.Option>
            {branches.map((b) => <Select.Option key={b.id} value={b.id}>{b.name}</Select.Option>)}
          </Select>
          <Select value={status || 'all'} style={{ width: 200 }} onChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
            <Select.Option value="all">All Statuses</Select.Option>
            {Object.keys(STATUS_COLOR).map((s) => <Select.Option key={s} value={s}>{s.replace(/_/g, ' ')}</Select.Option>)}
          </Select>
        </Space>
      </Card>
      <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
        <Table
          loading={loading}
          dataSource={items.map((i) => ({ ...i, key: i.id }))}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
          scroll={{ x: 1100 }}
          columns={[
            { title: 'Customer', render: (_, r) => <div><Text strong>{r.customer.name}</Text><br /><Text type="secondary">{r.customer.code}</Text></div> },
            { title: 'Branch', render: (_, r) => <Text>{r.customer.branch?.name || '-'}</Text> },
            { title: 'Limit', dataIndex: 'creditLimit', render: (v) => <Text strong>{Number(v).toLocaleString()} {CURRENCY.symbol}</Text> },
            { title: 'Outstanding', dataIndex: 'outstandingBalance', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
            { title: 'Overdue', dataIndex: 'overdueAmount', render: (v) => `${Number(v).toLocaleString()} ${CURRENCY.symbol}` },
            { title: 'Terms', render: (_, r) => `${r.customer.paymentTermDays} days` },
            { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={STATUS_COLOR[s]}>{s.replace(/_/g, ' ')}</Tag> },
            {
              title: 'Action',
              render: (_, r) => (
                <Select value={r.status} style={{ width: 160 }} onChange={(v) => updateStatus(r, v)}>
                  {Object.keys(STATUS_COLOR).map((s) => <Select.Option key={s} value={s}>{s.replace(/_/g, ' ')}</Select.Option>)}
                </Select>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};
