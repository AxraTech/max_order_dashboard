import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { AuditOutlined, BranchesOutlined, SafetyCertificateOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

const { Title, Text } = Typography;

interface AdminStats {
  users: number;
  roles: number;
  branches: number;
  auditLogs: number;
}

const actions = [
  {
    title: 'Admin Users',
    path: '/users',
    icon: <UserOutlined />,
    text: 'Create accounts, edit email/password, assign branch and role.',
    tag: 'Branch scoped',
  },
  {
    title: 'Roles & Access',
    path: '/roles',
    icon: <TeamOutlined />,
    text: 'Review RBAC modules, permission actions, and access scopes.',
    tag: 'RBAC',
  },
  {
    title: 'Branch Control',
    path: '/branches',
    icon: <BranchesOutlined />,
    text: 'Maintain branch records and check warehouse coverage.',
    tag: 'Operations',
  },
  {
    title: 'Audit Trail',
    path: '/audit-logs',
    icon: <AuditOutlined />,
    text: 'Inspect user activity and transaction changes.',
    tag: 'Compliance',
  },
];

export const Administration: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminStats>({ users: 0, roles: 0, branches: 0, auditLogs: 0 });

  useEffect(() => {
    Promise.allSettled([
      api.get('/users', { params: { limit: 1 } }),
      api.get('/roles'),
      api.get('/branches'),
      api.get('/audit-logs', { params: { limit: 1 } }),
    ]).then(([users, roles, branches, auditLogs]) => {
      setStats({
        users: users.status === 'fulfilled' ? users.value.data.meta?.total || 0 : 0,
        roles: roles.status === 'fulfilled' ? roles.value.data.data?.length || 0 : 0,
        branches: branches.status === 'fulfilled' ? branches.value.data.data?.length || 0 : 0,
        auditLogs: auditLogs.status === 'fulfilled' ? auditLogs.value.data.meta?.total || 0 : 0,
      });
    });
  }, []);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Administration</Title>
          <Text type="secondary">System control, branch admins, roles, and audit visibility</Text>
        </div>
        <Tag color="blue" icon={<SafetyCertificateOutlined />} style={{ padding: '6px 10px', borderRadius: 10, fontWeight: 700 }}>
          RBAC Enabled
        </Tag>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 18 }}>
        <Col xs={12} lg={6}><Card className="glass-card"><Statistic title="Admin Users" value={stats.users} /></Card></Col>
        <Col xs={12} lg={6}><Card className="glass-card"><Statistic title="Roles" value={stats.roles} /></Card></Col>
        <Col xs={12} lg={6}><Card className="glass-card"><Statistic title="Branches" value={stats.branches} /></Card></Col>
        <Col xs={12} lg={6}><Card className="glass-card"><Statistic title="Audit Events" value={stats.auditLogs} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        {actions.map((item) => (
          <Col xs={24} md={12} xl={6} key={item.path}>
            <Card
              hoverable
              className="glass-card"
              onClick={() => navigate(item.path)}
              style={{ height: '100%', borderTop: '3px solid var(--primary-color)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 150 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 26, color: 'var(--primary-color)' }}>{item.icon}</span>
                  <Tag color="purple" style={{ margin: 0 }}>{item.tag}</Tag>
                </div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>{item.title}</Title>
                  <Text type="secondary">{item.text}</Text>
                </div>
                <Text style={{ color: 'var(--primary-color)', fontWeight: 700, marginTop: 'auto' }}>Open</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};
