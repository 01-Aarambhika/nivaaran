import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Plus } from 'lucide-react';

export default function Navbar({ onOpenNewComplaint }) {
  const { user, logout, quickLogin } = useAuth();

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'warden': return 'Hostel Warden';
      case 'mess_incharge': return 'Mess In-Charge';
      case 'maintenance_staff': return 'Maintenance Staff';
      default: return 'Student';
    }
  };

  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">🏛️</div>
        <div>
          <div className="brand-name">Nivaaran</div>
          <div className="brand-sub">IIIT Vadodara. Grievance Redressal Portal.</div>
        </div>
      </div>

      <div className="nav-actions">
        {user ? (
          <>
            {user.role === 'student' && onOpenNewComplaint && (
              <button className="btn btn-primary btn-sm" onClick={onOpenNewComplaint}>
                <Plus size={14} />
                <span>File Grievance</span>
              </button>
            )}

            <div className="user-badge">
              <User size={13} style={{ color: 'var(--text-secondary)' }} />
              <span>{user.fullName || user.userId}</span>
              <span className={`role-pill ${user.role}`}>
                {getRoleLabel(user.role)}
              </span>
            </div>

            {/* Institutional Role Switcher for Demonstration / Verification */}
            <div style={{ display: 'flex', gap: '0.25rem', borderLeft: '1px solid var(--border-hairline)', paddingLeft: '0.75rem', marginLeft: '0.25rem' }}>
              <button 
                title="Switch to Student view" 
                className={`btn btn-sm ${user.role === 'student' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => quickLogin('20251651078', 'demo123')}
              >
                Student
              </button>
              <button 
                title="Switch to Warden view" 
                className={`btn btn-sm ${user.role === 'warden' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => quickLogin('W101', 'warden123')}
              >
                Warden
              </button>
              <button 
                title="Switch to Mess view" 
                className={`btn btn-sm ${user.role === 'mess_incharge' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => quickLogin('M201', 'mess123')}
              >
                Mess
              </button>
              <button 
                title="Switch to Maintenance view" 
                className={`btn btn-sm ${user.role === 'maintenance_staff' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => quickLogin('S301', 'maint123')}
              >
                Maint
              </button>
              <button 
                title="Switch to Admin view" 
                className={`btn btn-sm ${user.role === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                onClick={() => quickLogin('ADM001', 'admin123')}
              >
                Admin
              </button>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={logout} title="Sign Out">
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </>
        ) : (
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Official Campus Redressal Portal
          </span>
        )}
      </div>
    </header>
  );
}
