import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { LogIn, GraduationCap, Building, Briefcase } from 'lucide-react';

const Login = () => {
  const { login } = useAppData();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    const demoAccounts = {
      applicant: 'dkim',         // student who has NOT applied yet
      coordinator: 'coordinator'
    };
    setLoading(true);
    try {
      const user = await login(demoAccounts[role], 'password123');
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 style={{ color: 'var(--tmu-blue)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <GraduationCap size={40} color="var(--tmu-gold)" />
          TMU Co-op Support
        </h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Enter your credentials to access the portal.
        </p>

        {error && (
          <div className="badge badge-error mb-4 flex justify-center w-full" style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLoginSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input type="text" placeholder="Enter your username" value={username} onChange={(e) => { setUsername(e.target.value); setError(''); }} />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }} />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-4" style={{ padding: '1rem', fontSize: '1rem' }} disabled={loading}>
            <LogIn size={20} /> {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6">
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Quick demo access:</p>
          <div className="flex gap-2 justify-between">
            <button className="btn btn-secondary" onClick={() => handleQuickLogin('applicant')} disabled={loading} style={{ fontSize: '0.8rem', padding: '0.5rem', flex: 1 }}>
              <GraduationCap size={16} /> Applicant
            </button>
            <button className="btn btn-secondary" onClick={() => handleQuickLogin('coordinator')} disabled={loading} style={{ fontSize: '0.8rem', padding: '0.5rem', flex: 1 }}>
              <Briefcase size={16} /> Coordinator
            </button>
          </div>
        </div>

        <div className="mt-6" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'left', background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
          <p style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Demo Accounts (password: password123)</p>
          <table style={{ width: '100%', fontSize: '0.75rem' }}>
            <tbody>
              <tr><td style={{ padding: '2px 0' }}><strong>dkim</strong></td><td>Student – hasn't applied yet</td></tr>
              <tr><td style={{ padding: '2px 0' }}><strong>jlee</strong></td><td>Student – hasn't applied yet</td></tr>
              <tr><td style={{ padding: '2px 0' }}><strong>achen</strong></td><td>Student – already applied</td></tr>
              <tr><td style={{ padding: '2px 0' }}><strong>coordinator</strong></td><td>Coordinator – Dr. Sarah Mitchell</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Login;
