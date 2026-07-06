import React from 'react';
import { Badge, Popover, Button, List, Typography, Space, Tag, Empty } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import { useNotificationStore } from '../../store/notification.store';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Text, Title } = Typography;

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();

  const handleNotificationClick = async (noti: any) => {
    if (!noti.isRead) {
      await markAsRead(noti.id);
    }
    
    // Navigate based on target entity
    if (noti.referenceType === 'ORDER') {
      navigate('/orders');
    } else if (noti.referenceType === 'DELIVERY') {
      navigate('/delivery');
    } else if (noti.referenceType === 'INVOICE') {
      navigate('/invoices');
    }
  };

  const getTagColor = (type: string) => {
    switch (type) {
      case 'ORDER': return 'cyan';
      case 'DELIVERY': return 'purple';
      case 'PAYMENT': return 'success';
      case 'INVOICE': return 'magenta';
      case 'INVENTORY': return 'orange';
      default: return 'default';
    }
  };

  const popoverContent = (
    <div style={{ width: 360, maxHeight: 480, display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '12px 16px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0' 
      }}>
        <Title level={5} style={{ margin: 0, fontWeight: 600 }}>Notifications</Title>
        {unreadCount > 0 && (
          <Button 
            type="link" 
            size="small" 
            onClick={markAllAsRead}
            style={{ padding: 0, height: 'auto', fontSize: '12px' }}
          >
            Mark all as read
          </Button>
        )}
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380 }}>
        {notifications.length === 0 ? (
          <div style={{ padding: '32px 0' }}>
            <Empty description="No notifications yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        ) : (
          <List
            dataSource={notifications}
            itemLayout="horizontal"
            renderItem={(item) => (
              <List.Item
                onClick={() => handleNotificationClick(item)}
                style={{
                  padding: '12px 16px',
                  cursor: 'pointer',
                  backgroundColor: item.isRead ? 'transparent' : '#f0fdf4', // subtle green for unread
                  transition: 'background-color 0.2s',
                  borderBottom: '1px solid #f5f5f5',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <Space size={6}>
                        <Tag color={getTagColor(item.type)} style={{ margin: 0, fontSize: '10px', borderRadius: '4px', padding: '0 4px', lineHeight: '1.5' }}>
                          {item.type}
                        </Tag>
                        <Text strong={!item.isRead} style={{ fontSize: '13px' }}>
                          {item.title}
                        </Text>
                      </Space>
                      {!item.isRead && (
                        <div style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          backgroundColor: '#10B981',
                          flexShrink: 0 
                        }} />
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#4b5563', marginBottom: '4px', lineHeight: '1.4' }}>
                      {item.message}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      {dayjs(item.createdAt).format('MMM D, h:mm a')}
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      placement="bottomRight"
      overlayStyle={{ padding: 0 }}
      arrow
    >
      <Badge count={unreadCount} size="small" style={{ backgroundColor: '#EF4444' }}>
        <Button
          type="text"
          shape="circle"
          icon={<BellOutlined style={{ fontSize: '20px' }} />}
          style={{ 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#4b5563'
          }}
        />
      </Badge>
    </Popover>
  );
};
