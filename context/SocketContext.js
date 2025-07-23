import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = useSelector((state) => state.user);
  const token = useSelector((state) => state.token);

  useEffect(() => {
    if (user) {
      const newSocket = io('http://localhost:3001');
      
      newSocket.on('connect', () => {
        console.log('Connected to server');
        newSocket.emit('join', user._id);
      });

      newSocket.on('new_notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        if (Notification.permission === 'granted') {
          new Notification('Social Connect', {
            body: notification.message,
            icon: '/favicon.ico'
          });
        }
      });

      setSocket(newSocket);
      loadNotifications();

      return () => newSocket.close();
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user || !token) return;
    
    try {
      const response = await fetch(`http://localhost:3001/notifications/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:3001/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`http://localhost:3001/notifications/user/${user._id}/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const value = {
    socket,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    loadNotifications
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
