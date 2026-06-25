import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card, Input, message, Select, Space, Table, Tag, Typography } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

interface AuditRecord {
  id: string;
  action: string;
  module: string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: {
    email: string;
    firstName: string;
    lastName: string;
    role?: { displayName: string };
  } | null;
}

export const AuditLogs: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AuditRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [action, setAction] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-logs', {
        params: {
          page,
          limit: pageSize,
          search: search || undefined,
          module: moduleName || undefined,
          action: action || undefined,
        },
      });
      if (res.data.success) {
        setItems(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, moduleName, action]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Audit Logs</Title>
          <Text type="secondary">Track user actions, module changes, and transaction history</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
      </div>

      <Card className="glass-card" variant="borderless" style={{ marginBottom: 20 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="Search user, entity, or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            allowClear
            style={{ width: 280 }}
          />
          <Select value={moduleName || 'all'} style={{ width: 180 }} onChange={(v) => { setModuleName(v === 'all' ? '' : v); setPage(1); }}>
            <Select.Option value="all">All Modules</Select.Option>
            {['ORDERS', 'INVENTORY', 'INVOICING', 'CREDIT', 'MASTER_DATA', 'ADMIN'].map((m) => <Select.Option key={m} value={m}>{m}</Select.Option>)}
          </Select>
          <Select value={action || 'all'} style={{ width: 160 }} onChange={(v) => { setAction(v === 'all' ? '' : v); setPage(1); }}>
            <Select.Option value="all">All Actions</Select.Option>
            {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT'].map((a) => <Select.Option key={a} value={a}>{a}</Select.Option>)}
          </Select>
        </Space>
      </Card>

      <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
        <Table
          loading={loading}
          dataSource={items.map((item) => ({ ...item, key: item.id }))}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
          scroll={{ x: 1050 }}
          columns={[
            { title: 'Time', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString() },
            { title: 'User', render: (_, r) => r.user ? <div><Text strong>{r.user.firstName} {r.user.lastName}</Text><br /><Text type="secondary">{r.user.email}</Text></div> : <Text type="secondary">System</Text> },
            { title: 'Role', render: (_, r) => <Text>{r.user?.role?.displayName || '-'}</Text> },
            { title: 'Module', dataIndex: 'module', render: (v) => <Tag>{v}</Tag> },
            { title: 'Action', dataIndex: 'action', render: (v) => <Tag color={v === 'DELETE' ? 'red' : v === 'CREATE' ? 'green' : 'blue'}>{v}</Tag> },
            { title: 'Entity', render: (_, r) => <div><Text>{r.entityType}</Text><br /><Text type="secondary">{r.entityId || '-'}</Text></div> },
            { title: 'IP', dataIndex: 'ipAddress', render: (v) => v || '-' },
          ]}
        />
      </Card>
    </div>
  );
};
