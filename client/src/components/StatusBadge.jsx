import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, PlayCircle, UserCheck, XCircle, Archive } from 'lucide-react';

const STATUS_CONFIG = {
  submitted: {
    label: 'Pending Intake',
    icon: Clock,
    style: {
      color: '#B45309',
      borderColor: '#F59E0B',
      backgroundColor: '#FFFBEB',
    },
  },
  assigned: {
    label: 'Assigned',
    icon: UserCheck,
    style: {
      color: '#1E3A5F',
      borderColor: '#3B82F6',
      backgroundColor: '#EFF6FF',
    },
  },
  in_progress: {
    label: 'In Progress',
    icon: PlayCircle,
    style: {
      color: '#1E3A5F',
      borderColor: '#3B82F6',
      backgroundColor: '#EFF6FF',
    },
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    style: {
      color: '#047857',
      borderColor: '#10B981',
      backgroundColor: '#ECFDF5',
    },
  },
  closed: {
    label: 'Closed',
    icon: Archive,
    style: {
      color: '#047857',
      borderColor: '#10B981',
      backgroundColor: '#ECFDF5',
    },
  },
  escalated: {
    label: 'Escalated',
    icon: AlertTriangle,
    style: {
      color: '#B91C1C',
      borderColor: '#EF4444',
      backgroundColor: '#FEF2F2',
    },
  },
  withdrawn: {
    label: 'Withdrawn',
    icon: XCircle,
    style: {
      color: '#52525B',
      borderColor: '#E2E0D8',
      backgroundColor: '#F3F1EC',
    },
  },
};

export default function StatusBadge({ status }) {
  const normalized = (status || 'submitted').toLowerCase();
  const conf = STATUS_CONFIG[normalized] || {
    label: status,
    icon: Clock,
    style: {
      color: '#B45309',
      borderColor: '#F59E0B',
      backgroundColor: '#FFFBEB',
    },
  };
  const Icon = conf.icon;

  return (
    <span
      className="badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.6875rem',
        fontWeight: 600,
        padding: '0.2rem 0.5rem',
        borderRadius: '4px',
        border: `1px solid ${conf.style.borderColor}`,
        color: conf.style.color,
        backgroundColor: conf.style.backgroundColor,
        lineHeight: 1.2,
      }}
    >
      <Icon size={12} strokeWidth={2} />
      <span>{conf.label}</span>
    </span>
  );
}
