import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, FileText, AlertCircle, Clock, Lock } from 'lucide-react';

export default function FileComplaintModal({ isOpen, onClose, onSuccess }) {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [category, setCategory] = useState('hostel');
  const [location, setLocation] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getCategories().then(cats => {
        setCategories(cats);
        if (cats.length > 0 && !category) setCategory(cats[0].id || cats[0].categoryId);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (category) {
      api.getLocations(category).then(locs => {
        setLocations(locs);
        if (locs.length > 0) setLocation(locs[0].id || locs[0].locationId);
      });
    }
  }, [category]);

  if (!isOpen) return null;

  const currentCat = categories.find(c => c.id === category);
  const slaHours = priority === 'urgent' ? (currentCat?.urgentSlaHours || 24) : (currentCat?.defaultSlaHours || 48);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Please provide both a grievance summary and detailed description');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const result = await api.fileComplaint(user.token, {
        category,
        location,
        title: title.trim(),
        description: description.trim(),
        priority,
        isAnonymous,
        reporterUserId: user.userId
      });
      onSuccess(result);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit grievance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
              <FileText size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Register Grievance Docket</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Formal intake subject to campus SLA resolution mandates</p>
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Department Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                {categories.map(c => {
                  const val = c.id || c.categoryId;
                  return <option key={val} value={val}>{c.name || c.displayName || val}</option>;
                })}
              </select>
              <span className="form-help">Designated administrative unit</span>
            </div>

            <div className="form-group">
              <label className="form-label">Campus Location / Zone</label>
              <select className="form-select" value={location} onChange={e => setLocation(e.target.value)}>
                {locations.map(l => {
                  const val = l.id || l.locationId;
                  return <option key={val} value={val}>{l.name || l.zoneName || val}</option>;
                })}
              </select>
              <span className="form-help">Specific area of incident</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Urgency Classification</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {['low', 'medium', 'high', 'urgent'].map(p => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`btn btn-sm ${priority === p ? (p === 'urgent' ? 'btn-danger' : 'btn-primary') : 'btn-secondary'}`}
                  style={{ textTransform: 'capitalize' }}
                >
                  {p}
                </button>
              ))}
            </div>
            <span className="form-help">Urgent priority escalates to shorter SLA windows</span>
          </div>

          <div className="form-group">
            <label className="form-label">Docket Title / Summary</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Water leak on 3rd floor washroom"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Description of Problem</label>
            <textarea
              className="form-textarea"
              placeholder="Provide explicit details, room numbers, and equipment identifiers to assist maintenance personnel..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Institutional SLA notice & Privacy Toggle */}
          <div style={{ backgroundColor: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)', borderRadius: '4px', padding: '0.875rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--brand-secondary)', marginBottom: '0.65rem' }}>
              <Clock size={15} />
              <span>Standard Redressal Deadline: <strong>{slaHours} hours</strong> from timestamp</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={e => setIsAnonymous(e.target.checked)}
                style={{ width: '15px', height: '15px', accentColor: 'var(--brand-primary)' }}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Lock size={12} style={{ color: 'var(--text-secondary)' }} />
                <span>Submit as Anonymous Grievance (Student identity redacted from staff views)</span>
              </span>
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Formal Grievance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
