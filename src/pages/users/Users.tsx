import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Form, Input, message, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography,
} from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
  role: { id: string; name: string; displayName: string };
  branch?: { id: string; code: string; name: string } | null;
}

interface RoleRecord {
  id: string;
  name: string;
  displayName: string;
}

interface BranchRecord {
  id: string;
  code: string;
  name: string;
}

export const Users: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    Promise.all([api.get('/roles'), api.get('/branches')])
      .then(([roleRes, branchRes]) => {
        if (roleRes.data.success) setRoles(roleRes.data.data);
        if (branchRes.data.success) setBranches(branchRes.data.data);
      })
      .catch((err) => message.error(err.response?.data?.message || 'Failed to load roles/branches'));
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/users', {
        params: {
          page,
          limit: pageSize,
          search: search || undefined,
          roleId: roleId || undefined,
          branchId: branchId || undefined,
          isActive: status || undefined,
        },
      });
      if (res.data.success) {
        setUsers(res.data.data);
        setTotal(res.data.meta?.total || 0);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, roleId, branchId, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: UserRecord) => {
    setEditing(record);
    form.setFieldsValue({
      email: record.email,
      firstName: record.firstName,
      lastName: record.lastName,
      phone: record.phone,
      roleId: record.role.id,
      branchId: record.branch?.id || null,
      isActive: record.isActive,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (editing && !values.password) {
        delete values.password;
      }
      if (editing) {
        await api.put(`/users/${editing.id}`, values);
        message.success('User updated');
      } else {
        await api.post('/users', values);
        message.success('User created');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save user');
    }
  };

  const toggleActive = async (record: UserRecord) => {
    try {
      await api.patch(`/users/${record.id}/${record.isActive ? 'deactivate' : 'activate'}`);
      message.success(record.isActive ? 'User deactivated' : 'User activated');
      fetchUsers();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update user status');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Admin Users</Title>
          <Text type="secondary">Manage admin accounts, roles, passwords, and branch assignments</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Admin User</Button>
        </Space>
      </div>

      <Card className="glass-card" variant="borderless" style={{ marginBottom: 20 }}>
        <Space wrap>
          <Input prefix={<SearchOutlined />} placeholder="Search name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} allowClear style={{ width: 260 }} />
          <Select value={roleId || 'all'} style={{ width: 220 }} onChange={(v) => { setRoleId(v === 'all' ? '' : v); setPage(1); }}>
            <Select.Option value="all">All Roles</Select.Option>
            {roles.map((r) => <Select.Option key={r.id} value={r.id}>{r.displayName}</Select.Option>)}
          </Select>
          <Select value={branchId || 'all'} style={{ width: 220 }} onChange={(v) => { setBranchId(v === 'all' ? '' : v); setPage(1); }}>
            <Select.Option value="all">All Branches</Select.Option>
            {branches.map((b) => <Select.Option key={b.id} value={b.id}>{b.name} ({b.code})</Select.Option>)}
          </Select>
          <Select value={status || 'all'} style={{ width: 150 }} onChange={(v) => { setStatus(v === 'all' ? '' : v); setPage(1); }}>
            <Select.Option value="all">All Status</Select.Option>
            <Select.Option value="true">Active</Select.Option>
            <Select.Option value="false">Inactive</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
        <Table
          loading={loading}
          dataSource={users.map((u) => ({ ...u, key: u.id }))}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, onChange: (p, s) => { setPage(p); setPageSize(s); } }}
          scroll={{ x: 1050 }}
          columns={[
            { title: 'User', render: (_, r) => <div><Text strong>{r.firstName} {r.lastName}</Text><br /><Text type="secondary">{r.email}</Text></div> },
            { title: 'Phone', dataIndex: 'phone', render: (v) => v || '-' },
            { title: 'Role', render: (_, r) => <Tag color={r.role.name === 'SUPER_ADMIN' ? 'red' : r.role.name === 'BRANCH_MANAGER' ? 'blue' : 'default'}>{r.role.displayName}</Tag> },
            { title: 'Branch', render: (_, r) => r.branch ? <Text>{r.branch.name} ({r.branch.code})</Text> : <Tag>HQ / Global</Tag> },
            { title: 'Status', render: (_, r) => <Tag color={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Active' : 'Inactive'}</Tag> },
            { title: 'Last Login', dataIndex: 'lastLoginAt', render: (v) => v ? new Date(v).toLocaleString() : '-' },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(r)}>Edit</Button>
                  <Popconfirm title={`${r.isActive ? 'Deactivate' : 'Activate'} this user?`} onConfirm={() => toggleActive(r)}>
                    <Button type="link" danger={r.isActive}>{r.isActive ? 'Deactivate' : 'Activate'}</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={modalOpen} title={editing ? 'Edit Admin User' : 'New Admin User'} onCancel={() => setModalOpen(false)} onOk={submit} okText={editing ? 'Save' : 'Create'} width={640}>
        <Form form={form} layout="vertical" initialValues={{ isActive: true }}>
          <Form.Item name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={editing ? 'New Password' : 'Password'}
            rules={editing ? [{ min: 6 }] : [{ required: true, min: 6 }]}
            tooltip={editing ? 'Leave blank to keep the current password.' : undefined}
          >
            <Input.Password placeholder={editing ? 'Leave blank to keep current password' : undefined} />
          </Form.Item>
          <Space style={{ width: '100%' }} size="middle">
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="roleId" label="Role" rules={[{ required: true }]}>
            <Select options={roles.map((r) => ({ value: r.id, label: r.displayName }))} />
          </Form.Item>
          <Form.Item name="branchId" label="Branch Assignment">
            <Select allowClear placeholder="HQ / Global user" options={branches.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))} />
          </Form.Item>
          {editing && (
            <Form.Item name="isActive" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};
