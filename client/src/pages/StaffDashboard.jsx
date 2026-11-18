import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { PlayCircle, CheckCircle, Clock, AlertTriangle, MessageSquare, ChevronRight, RefreshCw, Lock, UserCheck } from 'lucide-react';

export default function StaffDashboard({
  onSelectComplaint,
  refreshTrigger
}) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  const getScopeName = () => {
    switch (user.role) {
      case 'warden': return 'Hostel Block Redressal Queue';
      case 'mess_incharge': return 'Mess & Dining Services Queue';
      case 'maintenance_staff': return 'Campus Infrastructure Queue';
      default: return 'Department Assigned Tasks';
    }
  };

  const getTargetCategory = () => {
    switch (user.role) {
      case 'warden': return 'hostel';
      case 'mess_incharge': return 'mess';
      case 'maintenance_staff': return 'campus';
      default: return '';
    }
  };

  const loadComplaints = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const cat = getTargetCategory();
      const myId = user.userId;
      const canonicalMyId = (myId === 'M001' ? 'M201' : (myId === 'W001' ? 'W101' : (myId === 'T001' ? 'S301' : myId)));

      const [catComplaints, allComplaints] = await Promise.all([
        api.getComplaints(user.token, cat ? { category: cat } : {}).catch(() => []),
        api.getComplaints(user.token, {}).catch(() => [])
      ]);

      const mergedMap = new Map();
      catComplaints.forEach(c => mergedMap.set(c.id, c));
      allComplaints.forEach(c => {
        if (c.assignedTo === myId || c.assignedTo === canonicalMyId || (c.category === cat)) {
          mergedMap.set(c.id, c);
        }
      });

      setComplaints(Array.from(mergedMap.values()));
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Real-time live synchronization
  useEffect(() => {
    loadComplaints(true);
    const interval = setInterval(() => {
      loadComplaints(false);
    }, 3000);
    return () => clearInterval(interval);
  }, [user, refreshTrigger]);

  const filtered = complaints.filter(c => {
    if (statusFilter === 'assigned') return c.status === 'assigned';
    if (statusFilter === 'pending') return c.status === 'submitted';
    if (statusFilter === 'in_progress') return c.status === 'in_progress';
    if (statusFilter === 'resolved') return ['resolved', 'closed'].includes(c.status);
    if (statusFilter === 'escalated') return c.status === 'escalated';
    return true;
  });

  const stats = {
    total: complaints.length,
    assigned: complaints.filter(c => c.status === 'assigned').length,
    pending: complaints.filter(c => c.status === 'submitted').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    resolved: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length,
    overdue: complaints.filter(c => c.isOverdue || c.status === 'escalated').length
  };

  const canonicalUserId = (user?.userId === 'M001' ? 'M201' : (user?.userId === 'W001' ? 'W101' : (user?.userId === 'T001' ? 'S301' : user?.userId)));

  return (
    <div>
      {/* Editorial Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{getScopeName()}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Staff Member: <strong>{user.fullName || user.userId}</strong> • Employee ID: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{user.userId}</code> • <span style={{ color: '#059669', fontWeight: 600 }}>🟢 Live Real-Time Queue</span>
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => loadComplaints(true)} title="Refresh Complaints">
          <RefreshCw size={13} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Swiss Editorial Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#1E3A5F' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.assigned}</div>
            <div className="stat-label">Assigned to Staff</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#B45309' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Intake</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#2563EB' }}>
            <PlayCircle size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.inProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#047857' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#B91C1C' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue / SLA Alerts</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs-container">
        <button className={`tab-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
          All Issues ({complaints.length})
        </button>
        <button className={`tab-btn ${statusFilter === 'assigned' ? 'active' : ''}`} onClick={() => setStatusFilter('assigned')}>
          Assigned ({stats.assigned})
        </button>
        <button className={`tab-btn ${statusFilter === 'pending' ? 'active' : ''}`} onClick={() => setStatusFilter('pending')}>
          Pending Intake ({stats.pending})
        </button>
        <button className={`tab-btn ${statusFilter === 'in_progress' ? 'active' : ''}`} onClick={() => setStatusFilter('in_progress')}>
          In Progress ({stats.inProgress})
        </button>
        <button className={`tab-btn ${statusFilter === 'resolved' ? 'active' : ''}`} onClick={() => setStatusFilter('resolved')}>
          Resolved ({stats.resolved})
        </button>
        <button className={`tab-btn ${statusFilter === 'escalated' ? 'active' : ''}`} onClick={() => setStatusFilter('escalated')}>
          Escalated ({stats.overdue})
        </button>
      </div>

      {/* Complaint List in Swiss Utility Style */}
      {loading && complaints.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          Retrieving department queue records...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            No complaints currently matching this queue filter.
          </p>
        </div>
      ) : (
        <div className="complaints-list">
          {filtered.map(c => {
            const isAssignedToMe = c.assignedTo === user?.userId || c.assignedTo === canonicalUserId;
            return (
              <div
                key={c.id}
                className="complaint-card"
                onClick={() => onSelectComplaint(c)}
              >
                <div className="complaint-card-header">
                  <div>
                    <div className="complaint-meta">
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                        {c.id}
                      </span>
                      <span>•</span>
                      <span>{c.locationName || c.location}</span>
                      {c.isAnonymous ? (
                        <>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--brand-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                            <Lock size={11} /> Anonymous Reporter
                          </span>
                        </>
                      ) : (
                        <>
                          <span>•</span>
                          <span>Student: <code style={{ fontFamily: 'var(--font-mono)' }}>{c.reporterUserId}</code></span>
                        </>
                      )}
                    </div>
                    <div className="complaint-title">{c.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <PriorityBadge priority={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                </div>

                <p className="complaint-desc">{c.description}</p>

                <div className="complaint-footer">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      <Clock size={13} style={{ color: 'var(--text-secondary)' }} />
                      SLA Deadline: {new Date(c.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8125rem' }}>
                      <UserCheck size={13} style={{ color: c.assignedTo ? 'var(--brand-primary)' : 'var(--text-secondary)' }} />
                      <span>Assigned: <strong>{c.assignedToName || c.assignedTo || 'Unassigned Intake'}</strong></span>
                      {isAssignedToMe && (
                        <span style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', borderRadius: '3px', padding: '0.1rem 0.4rem', fontSize: '0.6875rem', fontWeight: 700 }}>
                          Assigned to You
                        </span>
                      )}
                    </span>

                    {c.isOverdue && (
                      <span style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', border: '1px solid #EF4444', borderRadius: '4px', padding: '0.1rem 0.4rem', fontWeight: 700, fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertTriangle size={11} /> SLA BREACH
                      </span>
                    )}
                    {c.comments && c.comments.length > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                        <MessageSquare size={13} />
                        {c.comments.length}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.8125rem' }}>
                    <span>Review & Update</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
