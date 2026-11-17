import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, UserCheck, AlertCircle } from 'lucide-react';

export default function AssignModal({ isOpen, onClose, complaint, onSuccess }) {
  const { user } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getStaffList().then(list => {
        setStaffList(list);
        if (list.length > 0) setSelectedStaff(list[0].userId);
      });
    }
  }, [isOpen]);

  if (!isOpen || !complaint) return null;

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setSubmitting(true);
    setError('');

    try {
      const updated = await api.assignComplaint(user.token, complaint.id, selectedStaff);
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to dispatch staff assignment');
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
            <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
              <UserCheck size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Dispatch Staff Member</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{complaint.id}</span> • {complaint.category}
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

        <form onSubmit={handleAssign}>
          <div className="form-group">
            <label className="form-label">Responsible Department Personnel</label>
            <select
              className="form-select"
              value={selectedStaff}
              onChange={e => setSelectedStaff(e.target.value)}
            >
              {staffList.map(s => (
                <option key={s.userId} value={s.userId}>
                  {s.fullName} ({s.role.replace('_', ' ')}), ID: {s.userId}
                </option>
              ))}
            </select>
            <span className="form-help">Designated personnel will receive ticket notification</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Dispatching...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
