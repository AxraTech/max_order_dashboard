import { create } from 'zustand';
import { api } from '../services/api';
import { io, Socket } from 'socket.io-client';
import { playNotificationSound } from '../utils/audio';

export interface Notification {
  id: string;
  userId: string;
  type: 'ORDER' | 'INVENTORY' | 'CREDIT' | 'SYSTEM' | 'DELIVERY' | 'PAYMENT' | 'INVOICE' | 'CUSTOMER';
  title: string;
  message: string;
  isRead: boolean;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  socket: Socket | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  initSocket: (userId: string) => void;
  disconnectSocket: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  socket: null,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        set({
          notifications: response.data.data,
          unreadCount: response.data.unreadCount || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      const response = await api.patch(`/notifications/${id}/read`);
      if (response.data.success) {
        const notifications = get().notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        );
        const unreadCount = Math.max(0, get().unreadCount - 1);
        set({ notifications, unreadCount });
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      const response = await api.patch('/notifications/read-all');
      if (response.data.success) {
        const notifications = get().notifications.map((n) => ({ ...n, isRead: true }));
        set({ notifications, unreadCount: 0 });
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  initSocket: (userId: string) => {
    console.log('Initializing socket connection for user:', userId);
    const existingSocket = get().socket;
    if (existingSocket) return;

    const token = sessionStorage.getItem('maxorder_access_token');
    
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (
      window.location.origin.includes('localhost') || window.location.hostname.match(/^127\.\d+\.\d+\.\d+$/) || window.location.hostname.match(/^192\.168\./)
        ? `${window.location.protocol}//${window.location.hostname}:4000`
        : window.location.origin
    );
      
    console.log('Connecting to socket server at:', socketUrl);

    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      console.log('Socket.io connected successfully');
    });

    socketInstance.on('notification', (newNoti: Notification) => {
      console.log('Real-time notification received:', newNoti);
      
      playNotificationSound();
      
      set((state) => ({
        notifications: [newNoti, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      }));
    });

    socketInstance.on('order_updated', (data) => {
      window.dispatchEvent(new CustomEvent('api-update:order', { detail: data }));
    });

    socketInstance.on('delivery_updated', (data) => {
      window.dispatchEvent(new CustomEvent('api-update:delivery', { detail: data }));
    });

    socketInstance.on('payment_updated', (data) => {
      window.dispatchEvent(new CustomEvent('api-update:payment', { detail: data }));
    });

    socketInstance.on('invoice_updated', (data) => {
      window.dispatchEvent(new CustomEvent('api-update:invoice', { detail: data }));
    });

    socketInstance.on('customer_updated', (data) => {
      window.dispatchEvent(new CustomEvent('api-update:customer', { detail: data }));
    });

    set({ socket: socketInstance });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },
}));
