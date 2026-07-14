import React from 'react';
import { Form, Input, Button, Card, Typography, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { LoginRequest } from '../../types/index';

const { Title, Text } = Typography;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error } = useAuthStore();
  
  const from = location.state?.from?.pathname || '/dashboard';

  const onFinish = async (values: LoginRequest) => {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch (err) {
      // Error is handled in the store
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background elements */}
      <div className="animate-float" style={{
        position: 'absolute', top: '10%', left: '15%', width: '300px', height: '300px',
        background: 'radial-gradient(circle, rgba(79,70,229,0.2) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%'
      }} />
      <div className="animate-float" style={{
        position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0) 70%)', borderRadius: '50%',
        animationDelay: '-3s'
      }} />

      <Card
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '24px',
          borderRadius: '24px',
        }}
        variant="borderless"
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src="/logo.png" alt="MEN Logo" style={{ height: 64, margin: '0 auto 16px', display: 'block' }} />
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: '#1d4ed8' }}>Myanma Executive Network Co.,Ltd.</Title>
          <Text type="secondary">Sign in to the Admin Dashboard</Text>
        </div>

        {error && (
          <Alert title={error} type="error" showIcon style={{ marginBottom: '24px', borderRadius: '8px' }} />
        )}

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="identifier"
            rules={[
              { required: true, message: 'Please input your Email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: 'var(--text-secondary)' }} />} 
              placeholder="Email address" 
              style={{ borderRadius: '12px' }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
              placeholder="Password"
              style={{ borderRadius: '12px' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: '32px' }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              style={{ width: '100%', borderRadius: '12px', height: '48px', fontWeight: 600 }}
              loading={isLoading}
            >
              Sign In
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};


