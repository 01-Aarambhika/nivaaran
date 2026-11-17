import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { Plus, Clock, CheckCircle2, AlertTriangle, Layers, MapPin, MessageSquare, ChevronRight, RefreshCw, Lock } from 'lucide-react';

export default function StudentDashboard({
  onOpenFileModal,
  onSelectComplaint,
  refreshTrigger
}) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'resolved'
  const [categoryFilter, setCategoryFilter] = useState('all');

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints(user.token, { reporterUserId: user.userId });
      setComplaints(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [user, refreshTrigger]);

  const filtered = complaints.filter(c => {
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (activeTab === 'active') return ['submitted', 'assigned', 'in_progress', 'escalated'].includes(c.status);
    if (activeTab === 'resolved') return ['resolved', 'closed'].includes(c.status);
    return true;
  });

  const stats = {
    total: complaints.length,
    active: complaints.filter(c => ['submitted', 'assigned', 'in_progress', 'escalated'].includes(c.status)).length,
    resolved: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length,
    escalated: complaints.filter(c => c.status === 'escalated').length
  };

  return (
    <div>
      {/* Editorial Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Student Grievance Workspace</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Logged in as <strong>{user.fullName || user.userId}</strong> • Institute Roll No: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{user.userId}</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={loadComplaints} title="Refresh Complaints">
            <RefreshCw size={13} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={onOpenFileModal}>
            <Plus size={15} />
            <span>File New Grievance</span>
          </button>
        </div>
      </div>

      {/* Swiss Editorial Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Layers size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Filed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#B45309' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.active}</div>
            <div className="stat-label">Active / In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#047857' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved Issues</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#B91C1C' }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.escalated}</div>
            <div className="stat-label">Escalated Overdue</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar & Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div className="tabs-container" style={{ margin: 0 }}>
          <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            All ({complaints.length})
          </button>
          <button className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
            Active ({stats.active})
          </button>
          <button className={`tab-btn ${activeTab === 'resolved' ? 'active' : ''}`} onClick={() => setActiveTab('resolved')}>
            Resolved ({stats.resolved})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Category:
          </span>
          {['all', 'hostel', 'mess', 'campus'].map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textTransform: 'capitalize', padding: '0.25rem 0.65rem' }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Complaints List in Swiss Utility Container */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          Retrieving grievance records from institutional registry...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: '1.25rem' }}>
            No complaints found in this category view.
          </p>
          <button className="btn btn-primary" onClick={onOpenFileModal}>
            <Plus size={14} /> File a New Grievance
          </button>
        </div>
      ) : (
        <div className="complaints-list">
          {filtered.map(c => (
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
                    <span style={{ textTransform: 'capitalize' }}>{c.category}</span>
                    {c.isAnonymous && (
                      <>
                        <span>•</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--brand-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                          <Lock size={11} /> Anonymous
                        </span>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <MapPin size={13} style={{ color: 'var(--text-secondary)' }} />
                    {c.locationName || c.location}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    <Clock size={13} style={{ color: 'var(--text-secondary)' }} />
                    SLA: {new Date(c.deadline).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {c.comments && c.comments.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                      <MessageSquare size={13} />
                      {c.comments.length}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand-primary)', fontWeight: 600, fontSize: '0.8125rem' }}>
                  <span>Inspect Docket</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
