import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { adminNotificationsAPI } from '../services/api';

const REFRESH_INTERVAL = 30000;

const relativeTime = (dateValue) => {
  const timestamp = new Date(dateValue).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';

  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  const [unit, unitSeconds] = units.find(([, unitLength]) => Math.abs(seconds) >= unitLength) || units.at(-1);
  return formatter.format(Math.round(seconds / unitSeconds), unit);
};

const getAdminId = () => {
  try {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return currentUser.id || null;
  } catch {
    return null;
  }
};

const AdminNotifications = () => {
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const requestInFlight = useRef(false);
  const [adminId, setAdminId] = useState(getAdminId);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState('');

  const loadNotifications = useCallback(async (silent = false) => {
    if (!adminId || !localStorage.getItem('authToken') || requestInFlight.current) return;
    requestInFlight.current = true;
    if (!silent) setIsLoading(true);
    try {
      const data = await adminNotificationsAPI.getMine();
      if (getAdminId() === adminId) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
        setError('');
      }
    } catch (loadError) {
      if (!silent && getAdminId() === adminId) {
        setError(loadError.response?.data?.message || 'Notifications could not be loaded.');
      }
    } finally {
      requestInFlight.current = false;
      setIsLoading(false);
    }
  }, [adminId]);

  useEffect(() => {
    const syncAdmin = () => {
      const nextAdminId = localStorage.getItem('authToken') ? getAdminId() : null;
      setAdminId(nextAdminId);
      if (!nextAdminId) {
        setNotifications([]);
        setUnreadCount(0);
        setIsOpen(false);
      }
    };

    window.addEventListener('auth-changed', syncAdmin);
    window.addEventListener('storage', syncAdmin);
    return () => {
      window.removeEventListener('auth-changed', syncAdmin);
      window.removeEventListener('storage', syncAdmin);
    };
  }, []);

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    if (!adminId) {
      setIsLoading(false);
      return undefined;
    }

    loadNotifications();
    const intervalId = window.setInterval(() => loadNotifications(true), REFRESH_INTERVAL);
    const handleFocus = () => loadNotifications(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [adminId, loadNotifications]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!panelRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  const markAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await adminNotificationsAPI.markAllRead();
      setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);
      setError('');
    } catch (markError) {
      setError(markError.response?.data?.message || 'Notifications could not be updated.');
    } finally {
      setIsMarkingAll(false);
    }
  };

  const openNotification = async (notification) => {
    setIsOpen(false);
    if (!notification.is_read) {
      setNotifications((items) => items.map((item) => (
        item.id === notification.id ? { ...item, is_read: true } : item
      )));
      setUnreadCount((count) => Math.max(0, count - 1));
      try {
        await adminNotificationsAPI.markRead(notification.id);
      } catch {
        loadNotifications(true);
      }
    }

    const destination = notification.link?.startsWith('/admin/')
      ? notification.link
      : '/admin/requests';
    navigate(destination);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        aria-controls="admin-notifications-panel"
        onClick={() => {
          const nextOpen = !isOpen;
          setIsOpen(nextOpen);
          if (nextOpen) loadNotifications(true);
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition hover:border-[#9eb99e] hover:text-[#1B5E20] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5E20]"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          id="admin-notifications-panel"
          aria-label="Notifications"
          className="absolute right-0 top-14 z-50 flex max-h-[min(34rem,calc(100vh-5rem))] w-[min(24rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        >
          <header className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
              <p className="mt-0.5 text-xs text-gray-500">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount || isMarkingAll}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-[#1B5E20] transition hover:bg-[#F1F8E9] disabled:cursor-not-allowed disabled:text-gray-400"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Mark all as read
            </button>
          </header>

          {error && <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}

          <div className="overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">You are all caught up.</p>
            ) : notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => openNotification(notification)}
                className={`block w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-[#F7FAF5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5E20] ${notification.is_read ? 'bg-white' : 'bg-[#F1F8E9]/70'}`}
              >
                <span className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.is_read ? 'bg-transparent' : 'bg-[#1B5E20]'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">{notification.title || 'Notification'}</span>
                      <span className="shrink-0 text-[11px] text-gray-500" title={new Date(notification.created_at).toLocaleString()}>
                        {relativeTime(notification.created_at)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-gray-700">{notification.message}</span>
                    <span className="mt-1.5 block text-[11px] text-gray-500">
                      {notification.type === 'or_uploaded' ? 'OR submission' : notification.type}
                      {' · '}{new Date(notification.created_at).toLocaleString()}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          <footer className="border-t border-gray-100 px-4 py-2 text-center">
            <span className="text-[11px] text-gray-500">Updates automatically every 30 seconds</span>
          </footer>
        </section>
      )}
    </div>
  );
};

export default AdminNotifications;