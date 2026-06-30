import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DatabaseOutlined, ShopOutlined, TeamOutlined, EnvironmentOutlined, IdcardOutlined, ContactsOutlined, AuditOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const items = [
  { title: 'Customers', path: '/customers', icon: <TeamOutlined /> },
  { title: 'Products', path: '/products', icon: <ShopOutlined /> },
  { title: 'Branches', path: '/branches', icon: <EnvironmentOutlined /> },
  { title: 'Sales Representatives', path: '/sales-reps', icon: <IdcardOutlined /> },
  { title: 'Sales Teams', path: '/sales-teams', icon: <TeamOutlined /> },
  { title: 'Inventory', path: '/inventory', icon: <DatabaseOutlined /> },
  { title: 'Suppliers', path: '/suppliers', icon: <ContactsOutlined /> },
  { title: 'Dealers', path: '/dealers', icon: <AuditOutlined /> },
];

export const Masters: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Masters</Title>
        <Text type="secondary">Central reference data used by orders, credit, inventory, and invoicing</Text>
      </div>
      <Row gutter={[16, 16]} style={{ display: 'flex', flexWrap: 'wrap' }}>
        {items.map((item) => (
          <Col xs={24} sm={12} lg={8} key={item.path} style={{ display: 'flex' }}>
            <Card hoverable className="glass-card" onClick={() => navigate(item.path)} style={{ width: '100%', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24, color: 'var(--primary-color)' }}>{item.icon}</span>
                <div>
                  <Title level={4} style={{ margin: 0 }}>{item.title}</Title>
                  <Text type="secondary">Open {item.title.toLowerCase()} management</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};
