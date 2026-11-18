import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Bell, Check, Clock, AlertCircle, CheckCircle2, Star, MessageSquare } from 'lucide-react';

export default function NotificationBell({ onSelectComplaint }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications(user.userId, user.token);
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch {}
  };

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 2500);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectNotif = async (notif) => {
    await api.markNotificationRead(notif.id);
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    setIsOpen(false);
    if (notif.relatedComplaintId && onSelectComplaint) {
      const comp = await api.getComplaint(notif.relatedComplaintId, user?.token);
      if (comp) onSelectComplaint(comp);
    }
  };

  const handleMarkAllRead = async () => {
    for (const n of notifications) {
      await api.markNotificationRead(n.id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'COMPLAINT_ASSIGNED':
        return <AlertCircle size={15} color="#B45309" />;
      case 'COMPLAINT_RESOLVED':
        return <CheckCircle2 size={15} color="#047857" />;
      case 'FEEDBACK_SUBMITTED':
        return <Star size={15} color="#F59E0B" fill="#F59E0B" />;
      default:
        return <MessageSquare size={15} color="#1E3A5F" />;
    }
  };

  if (!user) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => {
          setIsOpen(!isOpen);
          fetchNotifs();
        }}
        title="Institutional Notifications"
        style={{
          position: 'relative',
          padding: '0.35rem 0.6rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          cursor: 'pointer'
        }}
      >
        <Bell size={15} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Alerts</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              borderRadius: '9999px',
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '0.1rem 0.35rem',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              border: '2px solid var(--bg-surface)'
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-global)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border-hairline)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={14} style={{ color: 'var(--brand-primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                Notifications ({notifications.length})
              </span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}
              >
                <Check size={12} /> Mark read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                No notifications yet. You're completely up to date.
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleSelectNotif(n)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border-hairline)',
                    backgroundColor: n.read ? 'transparent' : 'rgba(27, 67, 50, 0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start'
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'rgba(27, 67, 50, 0.04)'}
                >
                  <div style={{ marginTop: '2px', flexShrink: 0 }}>
                    {getIcon(n.eventType)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: n.read ? 600 : 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                        {n.title}
                      </span>
                      {!n.read && (
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            backgroundColor: '#2563EB',
                            borderRadius: '50%',
                            display: 'inline-block'
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: '0.78125rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: '0.2rem 0' }}>
                      {n.message || n.body}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.6875rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
                      <Clock size={10} />
                      <span>{new Date(n.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {n.relatedComplaintId && (
                        <>
                          <span>•</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{n.relatedComplaintId}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
