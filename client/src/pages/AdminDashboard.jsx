import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { Users, AlertTriangle, FileText, CheckCircle2, UserPlus, Clock, ChevronRight, RefreshCw, Search, Shield, Lock, Star, ShieldCheck } from 'lucide-react';

export default function AdminDashboard({
  onSelectComplaint,
  onOpenAssign,
  refreshTrigger
}) {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [slaSnapshots, setSlaSnapshots] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('complaints'); // 'complaints' | 'staff' | 'audit' | 'sla'

  // Complaints filter
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // New staff form state
  const [newStaffId, setNewStaffId] = useState('');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('warden');
  const [newStaffScope, setNewStaffScope] = useState('hostel');
  const [newStaffPassword, setNewStaffPassword] = useState('staff123');
  const [staffSuccess, setStaffSuccess] = useState('');
  const [staffError, setStaffError] = useState('');
  const [creatingStaff, setCreatingStaff] = useState(false);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [cmps, audits, slas, staff] = await Promise.all([
        api.getComplaints(user.token),
        api.getAuditEvents(),
        api.getSlaSnapshots(),
        api.getStaffList()
      ]);
      setComplaints(cmps);
      setAuditEvents(audits);
      setSlaSnapshots(slas);
      setStaffList(staff);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    // Real-time polling every 3s
    const interval = setInterval(() => loadData(false), 3000);
    return () => clearInterval(interval);
  }, [user, refreshTrigger]);

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffError('');
    setStaffSuccess('');
    setCreatingStaff(true);

    try {
      await api.createStaffAccount(user.token, {
        userId: newStaffId.trim(),
        fullName: newStaffName.trim(),
        email: newStaffEmail.trim(),
        role: newStaffRole,
        departmentScope: newStaffScope,
        password: newStaffPassword
      });
      setStaffSuccess(`Successfully created ${newStaffRole} account for ${newStaffName}.`);
      setNewStaffId('');
      setNewStaffName('');
      setNewStaffEmail('');
      const updated = await api.getStaffList();
      setStaffList(updated);
    } catch (err) {
      setStaffError(err.message || 'Failed to provision staff account');
    } finally {
      setCreatingStaff(false);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.title.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        (c.reporterUserId && c.reporterUserId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const stats = {
    total: complaints.length,
    submitted: complaints.filter(c => c.status === 'submitted').length,
    inProgress: complaints.filter(c => ['assigned', 'in_progress'].includes(c.status)).length,
    resolved: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length,
    escalated: complaints.filter(c => c.status === 'escalated').length
  };

  return (
    <div>
      {/* Editorial Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Institutional Governance & Administration</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Central administration console • Staff assignment dispatch, telemetry metrics & immutable audit registry
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh All Data">
          <RefreshCw size={13} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Global Metric Cards in Swiss Editorial Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <FileText size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Grievances</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#B45309' }}>
            <Clock size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.submitted}</div>
            <div className="stat-label">Awaiting Assignment</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#047857' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="stat-value">{stats.resolved}</div>
            <div className="stat-label">Resolved Dockets</div>
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

      {/* Navigation Tabs with 2px indicator bar */}
      <div className="tabs-container">
        <button className={`tab-btn ${currentTab === 'complaints' ? 'active' : ''}`} onClick={() => setCurrentTab('complaints')}>
          All Complaints ({complaints.length})
        </button>
        <button className={`tab-btn ${currentTab === 'staff' ? 'active' : ''}`} onClick={() => setCurrentTab('staff')}>
          Staff Management ({staffList.length})
        </button>
        <button className={`tab-btn ${currentTab === 'sla' ? 'active' : ''}`} onClick={() => setCurrentTab('sla')}>
          SLA Compliance Telemetry
        </button>
        <button className={`tab-btn ${currentTab === 'audit' ? 'active' : ''}`} onClick={() => setCurrentTab('audit')}>
          Audit Trail Log ({auditEvents.length})
        </button>
        <button className={`tab-btn ${currentTab === 'feedback' ? 'active' : ''}`} onClick={() => setCurrentTab('feedback')}>
          ⭐ Student Reviews ({complaints.filter(c => c.feedback).length})
        </button>
      </div>

      {/* ── TAB 1: ALL COMPLAINTS ────────────────────────────────────────── */}
      {currentTab === 'complaints' && (
        <div>
          {/* Swiss Filter Toolbar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                className="form-input"
                style={{ paddingLeft: '2.1rem' }}
                placeholder="Search by ticket ID, keyword or reporter roll number..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select className="form-select" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All Categories</option>
              <option value="hostel">Hostel</option>
              <option value="mess">Mess</option>
              <option value="campus">Campus</option>
            </select>

            <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="escalated">Escalated</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {filteredComplaints.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              No complaints match the filtered criteria.
            </div>
          ) : (
            <div className="complaints-list">
              {filteredComplaints.map(c => (
                <div key={c.id} className="complaint-card" onClick={() => onSelectComplaint(c)}>
                  <div className="complaint-card-header">
                    <div>
                      <div className="complaint-meta">
                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                          {c.id}
                        </span>
                        <span>•</span>
                        <span style={{ textTransform: 'capitalize' }}>{c.category}</span>
                        <span>•</span>
                        <span>{c.locationName || c.location}</span>
                        {c.isAnonymous && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--brand-secondary)', fontWeight: 600, fontSize: '0.75rem' }}>
                            • <Lock size={11} /> Anonymous
                          </span>
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
                      <span>Reporter: <strong style={{ fontFamily: 'var(--font-mono)' }}>{c.isAnonymous ? 'Anonymous' : c.reporterUserId}</strong></span>
                      <span>Assigned: <strong>{c.assignedToName || c.assignedTo || 'Unassigned'}</strong></span>
                      {c.isOverdue && (
                        <span style={{ color: '#B91C1C', backgroundColor: '#FEF2F2', border: '1px solid #EF4444', borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 700, fontSize: '0.6875rem' }}>
                          ⚠️ SLA BREACH
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {['submitted', 'assigned'].includes(c.status) && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={(e) => { e.stopPropagation(); onOpenAssign(c); }}
                        >
                          {c.status === 'assigned' ? 'Reassign Staff' : 'Dispatch Staff'}
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm">
                        <span>Details</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: STAFF MANAGEMENT ───────────────────────────────────────── */}
      {currentTab === 'staff' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              Active Campus Staff Roster
            </h3>
            <div className="table-container">
              <table className="swiss-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Identifier</th>
                    <th>Department Scope</th>
                    <th>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map(s => (
                    <tr key={s.userId}>
                      <td style={{ fontWeight: 600 }}>{s.fullName}</td>
                      <td><code>{s.userId}</code></td>
                      <td style={{ textTransform: 'capitalize' }}>{s.departmentScope || 'Campus'}</td>
                      <td>
                        <span className={`role-pill ${s.role}`}>
                          {s.role.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={18} style={{ color: 'var(--brand-primary)' }} />
              Provision Staff Account
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Enforces role-based permissions. Staff members can only update issues within their designated category scope.
            </p>

            {staffSuccess && (
              <div className="alert-box alert-success">
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{staffSuccess}</span>
              </div>
            )}
            {staffError && (
              <div className="alert-box alert-danger">
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{staffError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff}>
              <div className="form-group">
                <label className="form-label">Staff ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. W102 or M202"
                  value={newStaffId}
                  onChange={e => setNewStaffId(e.target.value)}
                  required
                />
                <span className="form-help">Unique department staff identifier</span>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Chandra"
                  value={newStaffName}
                  onChange={e => setNewStaffName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Institutional Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="staff@iiitv.ac.in"
                  value={newStaffEmail}
                  onChange={e => setNewStaffEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Role Category</label>
                <select
                  className="form-select"
                  value={newStaffRole}
                  onChange={e => {
                    const r = e.target.value;
                    setNewStaffRole(r);
                    if (r === 'warden') setNewStaffScope('hostel');
                    if (r === 'mess_incharge') setNewStaffScope('mess');
                    if (r === 'maintenance_staff') setNewStaffScope('campus');
                  }}
                >
                  <option value="warden">Hostel Warden (Hostel Scope)</option>
                  <option value="mess_incharge">Mess In-Charge (Mess Scope)</option>
                  <option value="maintenance_staff">Maintenance Staff (Campus Scope)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Initial Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={newStaffPassword}
                  onChange={e => setNewStaffPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={creatingStaff}>
                {creatingStaff ? 'Provisioning...' : 'Provision Staff Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 3: SLA & TELEMETRY ────────────────────────────────────────── */}
      {currentTab === 'sla' && (
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            Service Level Agreement Compliance Rate
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {slaSnapshots.map((s, idx) => (
              <div key={idx} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {s.categoryId} Department
                  </span>
                  <span 
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: s.complianceRate >= 90 ? '#047857' : '#B45309'
                    }}
                  >
                    {s.complianceRate}%
                  </span>
                </div>
                
                {/* Structural progress bar */}
                <div style={{ height: '6px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: '2px', overflow: 'hidden', marginBottom: '0.85rem' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${s.complianceRate}%`,
                      backgroundColor: s.complianceRate >= 90 ? '#10B981' : '#F59E0B',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                  <span>Resolved: <strong>{s.totalResolved}</strong></span>
                  <span style={{ color: s.breaches > 0 ? '#B91C1C' : 'var(--text-secondary)' }}>
                    Breaches: <strong>{s.breaches}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB 4: AUDIT TRAIL ────────────────────────────────────────────── */}
      {currentTab === 'audit' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
              Immutable Microservice Audit Log
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              Service Port: 8085 • Tamper-Evident SHA-256 Ledger
            </span>
          </div>

          <div className="table-container">
            <table className="swiss-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Target Entity</th>
                  <th>Actor ID</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditEvents.map(a => (
                  <tr key={a.eventId}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--brand-secondary)', fontSize: '0.8125rem' }}>
                        {a.eventType}
                      </span>
                    </td>
                    <td>
                      <code>{a.entityType}/{a.entityId}</code>
                    </td>
                    <td>
                      <code>{a.actorUserId}</code>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      {new Date(a.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 5: STUDENT REVIEWS & FEEDBACK (ADMIN ONLY) ───────────── */}
      {currentTab === 'feedback' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Student Quality Sign-Off & Reviews (Admin Access)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginTop: '0.2rem' }}>
              Direct confidential feedback submitted by students upon resolution. Visible only to campus administration for quality audit.
            </p>
          </div>

          {complaints.filter(c => c.feedback).length === 0 ? (
            <div className="card empty-state" style={{ padding: '2.5rem' }}>
              <Star size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto 0.75rem auto' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                No student reviews recorded yet. Reviews appear automatically when students confirm resolution.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
              {complaints.filter(c => c.feedback).map(c => (
                <div
                  key={c.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    border: '1px solid #86EFAC',
                    backgroundColor: '#F0FDF4',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                  onClick={() => onSelectComplaint(c)}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8125rem', color: '#166534' }}>
                        {c.trackingNumber || c.id}
                      </span>
                      <div style={{ color: '#D97706', letterSpacing: '2px', fontSize: '0.95rem' }}>
                        {'★'.repeat(c.feedback.rating)}{'☆'.repeat(5 - c.feedback.rating)}
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#15803D', marginLeft: '4px' }}>
                          ({c.feedback.rating}/5)
                        </span>
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#14532D', marginBottom: '0.5rem' }}>
                      {c.title}
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '4px', border: '1px solid #BBF7D0', marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.8125rem', color: '#14532D', fontStyle: 'italic', lineHeight: 1.45 }}>
                        "{c.feedback.comment}"
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#15803D', borderTop: '1px solid #BBF7D0', paddingTop: '0.5rem' }}>
                    <span>Reporter: <code>{c.reporterUserId || c.reporterId}</code></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontWeight: 600 }}>
                      Inspect Docket <ChevronRight size={13} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
