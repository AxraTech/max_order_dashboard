import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button, Card, Checkbox, Collapse, Form, Input, message, Modal, Popconfirm, Select, Space, Table, Tag, Typography,
} from 'antd';
import { DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

interface PermissionRecord {
  id: string;
  module: string;
  action: string;
  description?: string | null;
}

interface RolePermission {
  scope: string;
  permission: PermissionRecord;
}

interface RoleRecord {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  isSystem: boolean;
  permissions: RolePermission[];
  _count: { users: number };
}

const ACTION_ORDER = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'EXPORT'];

export const Roles: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRecord | null>(null);
  const [permissionRole, setPermissionRole] = useState<RoleRecord | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [scope, setScope] = useState<'ALL' | 'BRANCH' | 'OWN'>('BRANCH');
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, permissionsRes] = await Promise.all([api.get('/roles'), api.get('/roles/permissions')]);
      if (rolesRes.data.success) setRoles(rolesRes.data.data);
      if (permissionsRes.data.success) setPermissions(permissionsRes.data.data);
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const rows = useMemo(() => roles.map((role) => ({
    key: role.id,
    role,
    displayName: role.displayName,
    name: role.name,
    users: role._count?.users || 0,
    scope: role.permissions?.[0]?.scope || '-',
    modules: Array.from(new Set(role.permissions.map((p) => p.permission.module))).length,
  })), [roles]);

  const permissionsByModule = useMemo(() => {
    return permissions.reduce<Record<string, PermissionRecord[]>>((acc, permission) => {
      acc[permission.module] = acc[permission.module] || [];
      acc[permission.module].push(permission);
      acc[permission.module].sort((a, b) => ACTION_ORDER.indexOf(a.action) - ACTION_ORDER.indexOf(b.action));
      return acc;
    }, {});
  }, [permissions]);

  const openCreate = () => {
    setEditingRole(null);
    form.resetFields();
    setRoleModalOpen(true);
  };

  const openEdit = (role: RoleRecord) => {
    setEditingRole(role);
    form.setFieldsValue({
      name: role.name,
      displayName: role.displayName,
      description: role.description,
    });
    setRoleModalOpen(true);
  };

  const submitRole = async () => {
    try {
      const values = await form.validateFields();
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, values);
        message.success('Role updated');
      } else {
        await api.post('/roles', values);
        message.success('Role created');
      }
      setRoleModalOpen(false);
      fetchData();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || 'Failed to save role');
    }
  };

  const openPermissions = (role: RoleRecord) => {
    setPermissionRole(role);
    setSelectedPermissionIds(role.permissions.map((p) => p.permission.id));
    setScope((role.permissions[0]?.scope as 'ALL' | 'BRANCH' | 'OWN') || 'BRANCH');
    setPermissionModalOpen(true);
  };

  const savePermissions = async () => {
    if (!permissionRole) return;
    try {
      await api.put(`/roles/${permissionRole.id}/permissions`, { permissionIds: selectedPermissionIds, scope });
      message.success('Permissions updated');
      setPermissionModalOpen(false);
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to update permissions');
    }
  };

  const deleteRole = async (role: RoleRecord) => {
    try {
      await api.delete(`/roles/${role.id}`);
      message.success('Role deleted');
      fetchData();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to delete role');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Roles & Access</Title>
          <Text type="secondary">Create roles, assign permissions, and control RBAC scopes</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>New Role</Button>
        </Space>
      </div>

      <Card className="glass-card" variant="borderless" styles={{ body: { padding: 0 } }}>
        <Table
          loading={loading}
          dataSource={rows}
          expandable={{
            expandedRowRender: ({ role }) => {
              const moduleGroups = role.permissions.reduce<Record<string, RolePermission[]>>((acc, item) => {
                acc[item.permission.module] = acc[item.permission.module] || [];
                acc[item.permission.module].push(item);
                return acc;
              }, {});

              return (
                <Collapse
                  ghost
                  items={Object.entries(moduleGroups).map(([moduleName, perms]) => ({
                    key: moduleName,
                    label: <Text strong>{moduleName}</Text>,
                    children: (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {perms
                          .sort((a, b) => ACTION_ORDER.indexOf(a.permission.action) - ACTION_ORDER.indexOf(b.permission.action))
                          .map((perm) => (
                            <Tag key={perm.permission.id} color={perm.scope === 'ALL' ? 'red' : perm.scope === 'BRANCH' ? 'blue' : 'green'}>
                              {perm.permission.action} - {perm.scope}
                            </Tag>
                          ))}
                      </div>
                    ),
                  }))}
                />
              );
            },
          }}
          columns={[
            { title: 'Role', render: (_, r) => <div><Text strong>{r.displayName}</Text><br /><Text type="secondary">{r.name}</Text></div> },
            { title: 'Description', render: (_, r) => r.role.description || '-' },
            { title: 'Type', render: (_, r) => <Tag color={r.role.isSystem ? 'blue' : 'green'}>{r.role.isSystem ? 'System' : 'Custom'}</Tag> },
            { title: 'Users', dataIndex: 'users' },
            { title: 'Modules', dataIndex: 'modules' },
            { title: 'Default Scope', dataIndex: 'scope', render: (v) => <Tag>{v}</Tag> },
            {
              title: 'Actions',
              render: (_, r) => (
                <Space>
                  <Button type="link" icon={<KeyOutlined />} onClick={() => openPermissions(r.role)}>Permissions</Button>
                  <Button type="link" icon={<EditOutlined />} disabled={r.role.isSystem} onClick={() => openEdit(r.role)}>Edit</Button>
                  <Popconfirm title="Delete this role?" onConfirm={() => deleteRole(r.role)} disabled={r.role.isSystem || r.users > 0}>
                    <Button type="link" danger icon={<DeleteOutlined />} disabled={r.role.isSystem || r.users > 0}>Delete</Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal open={roleModalOpen} title={editingRole ? 'Edit Role' : 'New Role'} onCancel={() => setRoleModalOpen(false)} onOk={submitRole} okText={editingRole ? 'Save' : 'Create'}>
        <Form form={form} layout="vertical">
          {!editingRole && (
            <Form.Item name="name" label="Role Code" rules={[{ required: true }]}>
              <Input placeholder="Example: AREA_MANAGER" />
            </Form.Item>
          )}
          <Form.Item name="displayName" label="Display Name" rules={[{ required: true }]}>
            <Input placeholder="Example: Area Manager" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal open={permissionModalOpen} title={`Permissions - ${permissionRole?.displayName || ''}`} onCancel={() => setPermissionModalOpen(false)} onOk={savePermissions} width={780} okText="Save Permissions">
        <Space style={{ marginBottom: 16 }}>
          <Text strong>Scope</Text>
          <Select value={scope} style={{ width: 180 }} onChange={setScope}>
            <Select.Option value="ALL">All Branches</Select.Option>
            <Select.Option value="BRANCH">Own Branch</Select.Option>
            <Select.Option value="OWN">Own Records</Select.Option>
          </Select>
        </Space>
        <Collapse
          defaultActiveKey={Object.keys(permissionsByModule)}
          items={Object.entries(permissionsByModule).map(([moduleName, perms]) => ({
            key: moduleName,
            label: <Text strong>{moduleName}</Text>,
            children: (
              <Checkbox.Group
                value={selectedPermissionIds}
                onChange={(values) => {
                  // Get IDs that belong to this module
                  const modulePermissionIds = perms.map((p) => p.id);
                  // Keep selections from OTHER modules, then add new selections from this module
                  const otherModuleSelections = selectedPermissionIds.filter(
                    (id) => !modulePermissionIds.includes(id)
                  );
                  setSelectedPermissionIds([...otherModuleSelections, ...(values as string[])]);
                }}
              >
                <Space wrap>
                  {perms.map((permission) => (
                    <Checkbox key={permission.id} value={permission.id}>{permission.action}</Checkbox>
                  ))}
                </Space>
              </Checkbox.Group>
            ),
          }))}
        />
      </Modal>
    </div>
  );
};
