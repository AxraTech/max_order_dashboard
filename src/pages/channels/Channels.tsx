import React, { useEffect, useState } from 'react';
import { Card, Typography, Table, Button, Space, Modal, Form, Input, message, Tag, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

const { Title } = Typography;

export const Channels: React.FC = () => {
  const [mainChannels, setMainChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Main Channel Modal
  const [mainModalOpen, setMainModalOpen] = useState(false);
  const [editingMain, setEditingMain] = useState<any>(null);
  const [mainForm] = Form.useForm();

  // Sub Channel Modal
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [activeMainId, setActiveMainId] = useState<string>('');
  const [subForm] = Form.useForm();

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const res = await api.get('/channels/main');
      if (res.data.success) {
        setMainChannels(res.data.data);
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  // Main Channel Actions
  const handleMainSubmit = async (values: any) => {
    try {
      if (editingMain) {
        await api.put(`/channels/main/${editingMain.id}`, values);
        message.success('Main channel updated');
      } else {
        await api.post('/channels/main', values);
        message.success('Main channel created');
      }
      setMainModalOpen(false);
      mainForm.resetFields();
      fetchChannels();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const deleteMainChannel = async (id: string) => {
    try {
      await api.delete(`/channels/main/${id}`);
      message.success('Main channel deleted');
      fetchChannels();
    } catch (err: any) {
      message.error('Delete failed');
    }
  };

  // Sub Channel Actions
  const handleSubSubmit = async (values: any) => {
    try {
      if (editingSub) {
        await api.put(`/channels/sub/${editingSub.id}`, values);
        message.success('Sub channel updated');
      } else {
        await api.post('/channels/sub', { ...values, mainChannelId: activeMainId });
        message.success('Sub channel created');
      }
      setSubModalOpen(false);
      subForm.resetFields();
      fetchChannels();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Action failed');
    }
  };

  const deleteSubChannel = async (id: string) => {
    try {
      await api.delete(`/channels/sub/${id}`);
      message.success('Sub channel deleted');
      fetchChannels();
    } catch (err: any) {
      message.error('Delete failed');
    }
  };

  const mainColumns = [
    { title: 'Main Channel Name', dataIndex: 'name', key: 'name' },
    {
      title: 'Sub Channels',
      key: 'subChannels',
      render: (_: any, record: any) => (
        <Space size={[0, 8]} wrap>
          {record.subChannels?.map((sub: any) => (
            <Tag
              key={sub.id}
              closable
              onClose={(e) => { e.preventDefault(); deleteSubChannel(sub.id); }}
              style={{ padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <span onClick={() => { setEditingSub(sub); subForm.setFieldsValue(sub); setSubModalOpen(true); }} style={{ cursor: 'pointer' }}>
                {sub.name} <EditOutlined style={{ fontSize: '10px' }} />
              </span>
            </Tag>
          ))}
          <Tag
            color="processing"
            style={{ cursor: 'pointer', borderRadius: '12px', borderStyle: 'dashed' }}
            onClick={() => { setActiveMainId(record.id); setEditingSub(null); subForm.resetFields(); setSubModalOpen(true); }}
          >
            <PlusOutlined /> Add Sub Channel
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditingMain(record); mainForm.setFieldsValue(record); setMainModalOpen(true); }} />
          <Popconfirm title="Delete this main channel?" onConfirm={() => deleteMainChannel(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Channels Configuration</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingMain(null); mainForm.resetFields(); setMainModalOpen(true); }} style={{ borderRadius: '12px' }}>
          Add Main Channel
        </Button>
      </div>

      <Card className="glass-card" variant="borderless">
        <Table
          columns={mainColumns}
          dataSource={mainChannels}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title={editingMain ? "Edit Main Channel" : "New Main Channel"}
        open={mainModalOpen}
        onCancel={() => setMainModalOpen(false)}
        onOk={() => mainForm.submit()}
      >
        <Form form={mainForm} layout="vertical" onFinish={handleMainSubmit}>
          <Form.Item name="name" label="Main Channel Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Retail" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingSub ? "Edit Sub Channel" : "New Sub Channel"}
        open={subModalOpen}
        onCancel={() => setSubModalOpen(false)}
        onOk={() => subForm.submit()}
      >
        <Form form={subForm} layout="vertical" onFinish={handleSubSubmit}>
          <Form.Item name="name" label="Sub Channel Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Supermarket" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
