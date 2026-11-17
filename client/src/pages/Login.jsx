import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { login, quickLogin, loading } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Login form state
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Register form state
  const [regUserId, setRegUserId] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regError, setRegError] = useState('');
  const [registering, setRegistering] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await login(userId, password);
    } catch (err) {
      setLoginError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');
    setRegistering(true);

    try {
      await api.registerStudent({
        userId: regUserId.trim(),
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword
      });
      setRegSuccess('Student registration recorded. You may now authenticate with your roll number.');
      setUserId(regUserId);
      setPassword(regPassword);
      setTimeout(() => setTab('login'), 1200);
    } catch (err) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2.5rem auto', padding: '0 1rem' }}>
      {/* Editorial Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div 
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '4px',
            backgroundColor: 'var(--brand-primary)',
            color: '#FFFFFF',
            border: '1px solid var(--brand-primary)',
            fontSize: '1.75rem',
            marginBottom: '1rem',
          }}
        >
          🏛️
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>
          Nivaaran
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
          Campus Grievance Redressal Portal. IIIT Vadodara.
        </p>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        {/* Navigation Tabs with 2px brand indicator */}
        <div className="tabs-container" style={{ marginBottom: '1.75rem' }}>
          <button
            className={`tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => setTab('login')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            <LogIn size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Sign In
          </button>
          <button
            className={`tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => setTab('register')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            <UserPlus size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            Student Sign-Up
          </button>
        </div>

        {tab === 'login' ? (
          <div>
            {loginError && (
              <div className="alert-box alert-danger">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">
                  User ID (Roll No / Staff ID)
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 20251651078 or ADM001"
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  required
                />
                <span className="form-help">Enter your registered institutional identifier</span>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem' }}
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
              </button>
            </form>

            {/* Quick Demo Sign-in Section */}
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-hairline)' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'center' }}>
                Institutional Test Profiles
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickLogin('20251651078', 'demo123')}
                >
                  Student (Ritik)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickLogin('20251651001', 'demo123')}
                >
                  Student (Aarambhika)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickLogin('W101', 'warden123')}
                >
                  Hostel Warden
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickLogin('M201', 'mess123')}
                >
                  Mess In-Charge
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickLogin('S301', 'maint123')}
                >
                  Maintenance Staff
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => quickLogin('ADM001', 'admin123')}
                >
                  Administrator
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {regError && (
              <div className="alert-box alert-danger">
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{regError}</span>
              </div>
            )}
            {regSuccess && (
              <div className="alert-box alert-success">
                <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                <span>{regSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Student Roll Number (Numeric Only)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 20251651099"
                  value={regUserId}
                  onChange={e => setRegUserId(e.target.value)}
                  pattern="^[0-9]+$"
                  title="Roll number must be strictly numeric"
                  required
                />
                <span className="form-help">Strictly numeric institute roll number</span>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Priya Sharma"
                  value={regFullName}
                  onChange={e => setRegFullName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Institute Email</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="rollno@iiitv.ac.in"
                  value={regEmail}
                  onChange={e => setRegEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Choose an account password"
                  value={regPassword}
                  onChange={e => setRegPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.5rem', padding: '0.65rem' }}
                disabled={registering}
              >
                {registering ? 'Registering Account...' : 'Register Student Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
