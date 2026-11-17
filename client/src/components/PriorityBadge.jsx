import React from 'react';

const PRIORITY_STYLES = {
  low: {
    color: '#52525B',
    borderColor: '#E2E0D8',
    backgroundColor: '#F3F1EC',
  },
  medium: {
    color: '#1E3A5F',
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
  },
  high: {
    color: '#B45309',
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  urgent: {
    color: '#B91C1C',
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
};

export default function PriorityBadge({ priority }) {
  const p = (priority || 'medium').toLowerCase();
  const style = PRIORITY_STYLES[p] || PRIORITY_STYLES.medium;

  return (
    <span
      className="priority-badge"
      style={{
        fontFamily: 'var(--font-mono)',
        fontVariantNumeric: 'tabular-nums',
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        padding: '0.15rem 0.45rem',
        borderRadius: '4px',
        border: `1px solid ${style.borderColor}`,
        color: style.color,
        backgroundColor: style.backgroundColor,
        display: 'inline-block',
      }}
    >
      {p}
    </span>
  );
}
