import React, { useEffect, useState } from 'react';
import {
  Card, Typography, InputNumber, Button, Form, Space, Divider, Tag, Spin,
  Row, Col, Tooltip, App as AntdApp, Alert, Input,
} from 'antd';
import {
  SettingOutlined, SaveOutlined, InfoCircleOutlined, PercentageOutlined,
  DollarOutlined, EditOutlined,
} from '@ant-design/icons';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';

const { Title, Text, Paragraph } = Typography;

interface ConfigItem {
  id: string;
  key: string;
  value: string;
  description: string | null;
  group: string;
}

type SettingsMap = Record<string, ConfigItem>;

const SETTING_META: Record<string, {
  label: string;
  description: string;
  unit: 'percent' | 'text';
  min?: number;
  max?: number;
  group: string;
  placeholder?: string;
}> = {
  TAX_RATE: {
    label: 'Tax Rate',
    description: 'Applied to all orders and sales returns at the time of creation.',
    unit: 'percent',
    min: 0, max: 100, group: 'Tax & Pricing', placeholder: '5',
  },
  CD_DISCOUNT_RATE: {
    label: 'Cash Down (CD) Discount Rate',
    description: 'Auto-applied when payment method is Cash Down, Bank Transfer, Mobile Banking, or Cheque.',
    unit: 'percent',
    min: 0, max: 100, group: 'Tax & Pricing', placeholder: '2',
  },
  ORDER_PREFIX: {
    label: 'Order Number Prefix',
    description: 'Prefix for new order numbers (e.g. "ORD" → ORD-123456).',
    unit: 'text', group: 'Numbering', placeholder: 'ORD',
  },
  INVOICE_PREFIX: {
    label: 'Invoice Number Prefix',
    description: 'Prefix for new invoice numbers.',
    unit: 'text', group: 'Numbering', placeholder: 'INV',
  },
  DELIVERY_PREFIX: {
    label: 'Delivery Order Prefix',
    description: 'Prefix for new delivery order numbers.',
    unit: 'text', group: 'Numbering', placeholder: 'DEL',
  },
};

const GROUP_ICON: Record<string, React.ReactNode> = {
  'Tax & Pricing': <PercentageOutlined style={{ color: '#7c3aed' }} />,
  'Numbering': <EditOutlined style={{ color: '#2563eb' }} />,
};

const GROUP_COLOR: Record<string, string> = {
  'Tax & Pricing': 'purple',
  'Numbering': 'blue',
};

export const Settings: React.FC = () => {
  const { user } = useAuthStore();
  const { message } = AntdApp.useApp();

  const [configs, setConfigs] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  const isSuperAdmin = user?.role?.name === 'SUPER_ADMIN';

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        const map: SettingsMap = {};
        const initial: Record<string, string> = {};
        for (const item of res.data.data as ConfigItem[]) {
          map[item.key] = item;
          initial[item.key] = item.value;
        }
        setConfigs(map);
        setEditingValues(initial);
      }
    } catch {
      message.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const saveSetting = async (key: string) => {
    const value = editingValues[key];
    if (value === undefined || String(value).trim() === '') {
      message.warning('Value cannot be empty');
      return;
    }
    setSaving(s => ({ ...s, [key]: true }));
    try {
      const res = await api.put(`/settings/${key}`, { value: String(value) });
      if (res.data.success) {
        message.success(res.data.message || `"${key}" updated`);
        setConfigs(s => ({ ...s, [key]: res.data.data }));
      } else {
        message.error(res.data.message || 'Failed to update setting');
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Network error');
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  // Group the known keys
  const groupedKeys = Object.entries(SETTING_META).reduce<Record<string, string[]>>(
    (acc, [key, meta]) => {
      if (!acc[meta.group]) acc[meta.group] = [];
      acc[meta.group].push(key);
      return acc;
    }, {}
  );

  // Keys in DB but not in SETTING_META
  const unknownKeys = Object.keys(configs).filter(k => !SETTING_META[k]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: 900, margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <Space align="center" style={{ marginBottom: 6 }}>
          <SettingOutlined style={{ fontSize: 26, color: '#4F46E5' }} />
          <Title level={2} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
            System Settings
          </Title>
        </Space>
        <Paragraph style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
          Configure system-wide behaviour including tax rates, CD discount, and document numbering.
        </Paragraph>
        {!isSuperAdmin && (
          <Alert
            style={{ marginTop: 12, borderRadius: 10 }}
            type="warning"
            showIcon
            message="Read-only view — only Super Admin can modify settings."
          />
        )}
      </div>

      {/* Known grouped settings */}
      {Object.entries(groupedKeys).map(([group, keys]) => (
        <Card
          key={group}
          style={{ marginBottom: 24, borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
          title={
            <Space>
              {GROUP_ICON[group]}
              <Text strong style={{ fontSize: 15 }}>{group}</Text>
              <Tag color={GROUP_COLOR[group] || 'default'}>{keys.length} setting{keys.length !== 1 ? 's' : ''}</Tag>
            </Space>
          }
        >
          {keys.map((key, idx) => {
            const meta = SETTING_META[key];
            const current = configs[key];
            const isPercent = meta.unit === 'percent';

            return (
              <React.Fragment key={key}>
                {idx > 0 && <Divider style={{ margin: '18px 0' }} />}
                <Row gutter={16} align="middle" wrap={false}>
                  <Col flex="1" style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Space size={6}>
                        <Text strong style={{ fontSize: 14 }}>{meta.label}</Text>
                        <Tooltip title={meta.description}>
                          <InfoCircleOutlined style={{ color: '#9ca3af', fontSize: 13 }} />
                        </Tooltip>
                        {!current && (
                          <Tag color="orange" style={{ fontSize: 11 }}>Using default</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{meta.description}</Text>
                      {current && (
                        <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          Current:{' '}
                          <Text strong style={{ color: '#374151' }}>
                            {isPercent ? `${current.value}%` : current.value}
                          </Text>
                        </Text>
                      )}
                    </div>
                  </Col>
                  <Col>
                    <Space>
                      {isPercent ? (
                        <Space.Compact>
                          <InputNumber
                            min={meta.min}
                            max={meta.max}
                            step={0.1}
                            precision={2}
                            style={{ width: 110 }}
                            value={editingValues[key] !== undefined ? Number(editingValues[key]) : (current ? Number(current.value) : undefined)}
                            onChange={val => setEditingValues(s => ({ ...s, [key]: String(val ?? '') }))}
                            disabled={!isSuperAdmin}
                            placeholder={meta.placeholder}
                          />
                          <Button disabled style={{ cursor: 'default', color: '#374151' }}>%</Button>
                        </Space.Compact>
                      ) : (
                        <Input
                          style={{ width: 130, borderRadius: 8 }}
                          value={editingValues[key] || ''}
                          onChange={e => setEditingValues(s => ({ ...s, [key]: e.target.value }))}
                          disabled={!isSuperAdmin}
                          placeholder={meta.placeholder}
                        />
                      )}
                      {isSuperAdmin && (
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={saving[key]}
                          onClick={() => saveSetting(key)}
                          style={{ borderRadius: 8 }}
                        >
                          Save
                        </Button>
                      )}
                    </Space>
                  </Col>
                </Row>
              </React.Fragment>
            );
          })}
        </Card>
      ))}

      {/* Unrecognised DB keys */}
      {unknownKeys.length > 0 && (
        <Card
          title={<Space><DollarOutlined /><Text strong>Other Configurations</Text></Space>}
          style={{ borderRadius: 16, border: '1px solid #e5e7eb' }}
        >
          {unknownKeys.map((key, idx) => (
            <React.Fragment key={key}>
              {idx > 0 && <Divider style={{ margin: '16px 0' }} />}
              <Row gutter={16} align="middle" wrap={false}>
                <Col flex="1">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Text strong style={{ fontFamily: 'monospace' }}>{key}</Text>
                    {configs[key].description && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{configs[key].description}</Text>
                    )}
                  </div>
                </Col>
                <Col>
                  <Space>
                    <Input
                      style={{ width: 160, borderRadius: 8 }}
                      value={editingValues[key] || ''}
                      onChange={e => setEditingValues(s => ({ ...s, [key]: e.target.value }))}
                      disabled={!isSuperAdmin}
                    />
                    {isSuperAdmin && (
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving[key]}
                        onClick={() => saveSetting(key)}
                        style={{ borderRadius: 8 }}
                      >
                        Save
                      </Button>
                    )}
                  </Space>
                </Col>
              </Row>
            </React.Fragment>
          ))}
        </Card>
      )}
    </div>
  );
};
