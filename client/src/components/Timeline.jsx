import React from 'react';

export default function Timeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
        No audit history records available.
      </p>
    );
  }

  return (
    <div className="timeline">
      {history.map((item, idx) => (
        <div key={idx} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-title">
            {item.status.replace('_', ' ')}
          </div>
          <div className="timeline-time">
            {new Date(item.timestamp).toLocaleString('en-IN', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </div>
          {item.note && <div className="timeline-note">{item.note}</div>}
        </div>
      ))}
    </div>
  );
}
