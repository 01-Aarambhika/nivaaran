import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import Timeline from './Timeline';
import { X, Send, AlertTriangle, PlayCircle, CheckCircle, Trash2, UserCheck, Clock, MapPin, Lock, ShieldCheck } from 'lucide-react';

export default function ComplaintDetailDrawer({
  complaint,
  onClose,
  onUpdate,
  onOpenAssign,
  onOpenFeedback
}) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [showEscalateInput, setShowEscalateInput] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  if (!complaint) return null;

  const isReporter = user?.userId === complaint.reporterUserId;
  const isAssignedStaff = user?.userId === complaint.assignedTo;
  const isAdmin = user?.role === 'admin';
  const isStaff = ['warden', 'mess_incharge', 'maintenance_staff'].includes(user?.role);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await api.addComment(user.token, complaint.id, commentText.trim(), user);
      setCommentText('');
      const updated = await api.getComplaint(complaint.id, user.token);
      onUpdate(updated);
    } catch (err) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus, note) => {
    setActionLoading(true);
    setError('');
    try {
      const updated = await api.updateStatus(user.token, complaint.id, newStatus, complaint.etag, note);
      onUpdate(updated);
    } catch (err) {
      setError(err.message || 'Status transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async () => {
    if (!escalateReason.trim()) return;
    setActionLoading(true);
    setError('');
    try {
      const updated = await api.escalateComplaint(user.token, complaint.id, escalateReason.trim());
      setShowEscalateInput(false);
      setEscalateReason('');
      onUpdate(updated);
    } catch (err) {
      setError(err.message || 'Escalation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm('Are you sure you want to withdraw this grievance docket?')) return;
    setActionLoading(true);
    setError('');
    try {
      await api.withdrawComplaint(user.token, complaint.id);
      const updated = await api.getComplaint(complaint.id, user.token);
      onUpdate(updated);
    } catch (err) {
      setError(err.message || 'Could not withdraw complaint');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-drawer" onClick={e => e.stopPropagation()}>
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
              {complaint.id}
            </span>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        {error && (
          <div className="alert-box alert-danger">
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)', lineHeight: 1.25 }}>
          {complaint.title}
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <MapPin size={13} style={{ color: 'var(--text-secondary)' }} />
            <span>{complaint.locationName || complaint.location} ({complaint.category})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
            <Clock size={13} style={{ color: 'var(--text-secondary)' }} />
            <span>Target SLA: {new Date(complaint.deadline).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
          </div>
        </div>

        {/* Docket Details Card */}
        <div style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)', borderRadius: '4px', padding: '1.15rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Docket Statement
          </div>
          <p style={{ fontSize: '0.875rem', lineHeight: '1.6', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
            {complaint.description}
          </p>

          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <span>
              Filed by:{' '}
              {complaint.isAnonymous ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', color: 'var(--brand-secondary)', fontWeight: 600 }}>
                  <Lock size={11} /> Anonymous Student
                </span>
              ) : (
                <code style={{ fontFamily: 'var(--font-mono)' }}>{complaint.reporterUserId}</code>
              )}
            </span>
            <span>Assigned: <strong>{complaint.assignedToName || complaint.assignedTo || 'Unassigned'}</strong></span>
          </div>
        </div>

        {/* Action Dispatch Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1.25rem' }}>
          {(isStaff || isAdmin) && complaint.status === 'assigned' && (
            <>
              <button
                className="btn btn-primary btn-sm"
                disabled={actionLoading}
                onClick={() => handleStatusChange('in_progress', 'Staff initiated physical inspection / repair works')}
              >
                <PlayCircle size={14} /> Start Resolution Work
              </button>
              <button
                className="btn btn-success btn-sm"
                disabled={actionLoading}
                onClick={() => handleStatusChange('resolved', 'Work completed and verified by staff')}
              >
                <CheckCircle size={14} /> Mark as Resolved
              </button>
            </>
          )}

          {(isStaff || isAdmin) && complaint.status === 'in_progress' && (
            <button
              className="btn btn-success btn-sm"
              disabled={actionLoading}
              onClick={() => handleStatusChange('resolved', 'Work completed and verified by staff')}
            >
              <CheckCircle size={14} /> Mark as Resolved
            </button>
          )}

          {isAdmin && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onOpenAssign(complaint)}
            >
              <UserCheck size={14} /> Dispatch / Reassign Staff
            </button>
          )}

          {isAdmin && complaint.status === 'resolved' && (
            <button
              className="btn btn-primary btn-sm"
              disabled={actionLoading}
              onClick={() => handleStatusChange('closed', 'Administrative review completed and docket officially closed')}
            >
              <CheckCircle size={14} /> Admin Confirm & Close Docket
            </button>
          )}

          {isReporter && complaint.status === 'submitted' && (
            <button
              className="btn btn-danger btn-sm"
              disabled={actionLoading}
              onClick={handleWithdraw}
            >
              <Trash2 size={14} /> Withdraw Grievance
            </button>
          )}

          {isReporter && (complaint.status === 'resolved' || complaint.status === 'closed') && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => onOpenFeedback(complaint)}
            >
              <CheckCircle size={14} /> {complaint.feedback ? 'Update Review / Reopen' : '⭐ Submit Review & Feedback (Admin Only)'}
            </button>
          )}

          {['submitted', 'assigned', 'in_progress'].includes(complaint.status) && (
            <button
              className="btn btn-warning btn-sm"
              onClick={() => setShowEscalateInput(!showEscalateInput)}
            >
              <AlertTriangle size={14} /> Escalate Overdue
            </button>
          )}
        </div>

        {showEscalateInput && (
          <div className="alert-box alert-warning" style={{ display: 'block', marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ color: '#B45309', marginBottom: '0.35rem' }}>
              Reason for Escalation
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. SLA window exceeded without physical attendance"
              value={escalateReason}
              onChange={e => setEscalateReason(e.target.value)}
              style={{ marginBottom: '0.65rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowEscalateInput(false)}>
                Cancel
              </button>
              <button className="btn btn-warning btn-sm" onClick={handleEscalate} disabled={actionLoading || !escalateReason.trim()}>
                Confirm Escalation
              </button>
            </div>
          </div>
        )}

        {/* Existing Feedback Record (Confidential to Admin) */}
        {complaint.feedback && (
          <div style={{ marginBottom: '1.5rem' }}>
            {isAdmin ? (
              <div style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #86EFAC',
                borderRadius: 'var(--radius-global)',
                padding: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700, fontSize: '0.875rem' }}>
                    <ShieldCheck size={16} />
                    <span>Confidential Student Review (Admin View Only)</span>
                  </div>
                  <div style={{ color: '#D97706', fontSize: '1.1rem', letterSpacing: '2px' }}>
                    {'★'.repeat(complaint.feedback.rating)}{'☆'.repeat(5 - complaint.feedback.rating)}
                    <span style={{ fontSize: '0.8125rem', color: '#15803D', fontWeight: 600, marginLeft: '6px' }}>
                      ({complaint.feedback.rating}/5)
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.875rem', color: '#14532D', fontStyle: 'italic', lineHeight: 1.5, margin: '0.4rem 0' }}>
                  "{complaint.feedback.comment}"
                </p>
                <div style={{ fontSize: '0.75rem', color: '#15803D', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #BBF7D0', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                  <span>Reporter Roll Number: <code style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{complaint.reporterUserId || complaint.reporterId}</code></span>
                  <span>Recorded: {new Date(complaint.feedback.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ) : isReporter ? (
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #CBD5E1',
                borderRadius: 'var(--radius-global)',
                padding: '0.875rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                    Your Submitted Review (Confidential to Admin)
                  </span>
                  <span style={{ color: '#D97706', letterSpacing: '1px' }}>
                    {'★'.repeat(complaint.feedback.rating)}{'☆'.repeat(5 - complaint.feedback.rating)}
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  "{complaint.feedback.comment}"
                </p>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-global)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.78125rem',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Lock size={13} style={{ color: '#0F766E' }} />
                <span>Student review submitted directly to Campus Administration (Confidential).</span>
              </div>
            )}
          </div>
        )}

        {/* Status History Timeline */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Audit & Transition History
          </h3>
          <Timeline history={complaint.history} />
        </div>

        {/* Comments & Discussion */}
        <div style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: '1.25rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Discussion & Status Notes ({complaint.comments?.length || 0})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1rem' }}>
            {(!complaint.comments || complaint.comments.length === 0) ? (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No remarks recorded yet.
              </p>
            ) : (
              complaint.comments.map(c => (
                <div key={c.id} style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)', borderRadius: '4px', padding: '0.75rem', fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{c.authorName || c.authorId}</strong>
                    <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                      {new Date(c.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ color: 'var(--text-primary)' }}>{c.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Post a factual update or query..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              disabled={submittingComment}
            />
            <button type="submit" className="btn btn-primary" disabled={submittingComment || !commentText.trim()} title="Post Update">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
