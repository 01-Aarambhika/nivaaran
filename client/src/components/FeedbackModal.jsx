import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, Star, RotateCcw, CheckCircle, AlertCircle } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose, complaint, onSuccess }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isReopen, setIsReopen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !complaint) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError('Please provide verification comments');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const updated = await api.submitFeedback(user.token, complaint.id, {
        rating: isReopen ? 1 : rating,
        comment: comment.trim(),
        reopen: isReopen
      });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Action failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: isReopen ? 'var(--status-urgent-bg)' : 'var(--status-resolved-bg)',
                border: `1px solid ${isReopen ? 'var(--status-urgent-border)' : 'var(--status-resolved-border)'}`,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isReopen ? 'var(--status-urgent-text)' : 'var(--status-resolved-text)'
              }}
            >
              {isReopen ? <RotateCcw size={18} /> : <CheckCircle size={18} />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {isReopen ? 'Reopen Grievance Docket' : 'Confirm Resolution'}
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{complaint.id}</span> • {complaint.title}
              </p>
            </div>
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

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${!isReopen ? 'btn-success' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setIsReopen(false)}
          >
            <CheckCircle size={13} />
            <span>Problem Fixed (Accept)</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${isReopen ? 'btn-danger' : 'btn-secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setIsReopen(true)}
          >
            <RotateCcw size={13} />
            <span>Not Fixed (Reopen)</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isReopen && (
            <div className="form-group" style={{ alignItems: 'center' }}>
              <label className="form-label">Redressal Quality Rating</label>
              <div style={{ display: 'flex', gap: '0.4rem', margin: '0.5rem 0' }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.15rem' }}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      size={24}
                      color={star <= rating ? '#B45309' : '#D4D4D8'}
                      fill={star <= rating ? '#F59E0B' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              {isReopen ? 'Specific reason for reopening docket' : 'Feedback & Verification Notes'}
            </label>
            <textarea
              className="form-textarea"
              placeholder={isReopen ? 'Describe in detail what remains unresolved or broken...' : 'Confirm if the repairs are satisfactory and complete...'}
              value={comment}
              onChange={e => setComment(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className={`btn ${isReopen ? 'btn-danger' : 'btn-primary'}`}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : isReopen ? 'Reopen Docket' : 'Accept & Close Docket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
