import React, { useState, useEffect, useMemo } from 'react';
import { useAppData } from '../context/AppDataContext';
import { Briefcase, CheckCircle, XCircle, LogOut, Bell, Search, Mail, AlertTriangle, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CoordinatorDashboard = () => {
  const {
    currentUser, applicants, fetchApplicants, updateApplicantStatus,
    historyStats, fetchStats, createStudentAccount, fetchStudentAccounts, logout
  } = useAppData();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('list');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderMsg, setReminderMsg] = useState('');
  const [studentAccounts, setStudentAccounts] = useState([]);

  // Create account form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [createMsg, setCreateMsg] = useState('');

  useEffect(() => {
    fetchApplicants();
    fetchStats();
    loadStudentAccounts();
  }, []);

  const loadStudentAccounts = async () => {
    const data = await fetchStudentAccounts();
    setStudentAccounts(data);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') direction = 'descending';
    setSortConfig({ key, direction });
  };

  const sortedApplicants = useMemo(() => {
    let items = [...applicants].filter(app =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.student_id.includes(searchQuery)
    );
    items.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
    return items;
  }, [applicants, sortConfig, searchQuery]);

  const handleRemindClick = (label) => {
    setReminderMsg(`Success: Reminder sent to ${label}`);
    setTimeout(() => setReminderMsg(''), 3000);
  };

  const handleStatusChange = async (id, status) => {
    await updateApplicantStatus(id, status);
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreateMsg('');
    if (!newName || !newEmail || !newUsername || !newPassword) {
      setCreateMsg('Error: All fields are required.');
      return;
    }
    try {
      const user = await createStudentAccount({ name: newName, email: newEmail, username: newUsername, password: newPassword });
      setCreateMsg(`Success: Account created for ${user.name} (username: ${user.username})`);
      setNewName(''); setNewEmail(''); setNewUsername(''); setNewPassword('');
      await loadStudentAccounts();
    } catch (err) {
      setCreateMsg(`Error: ${err.message}`);
    }
  };

  // ─────────── APPLICATIONS LIST ─────────────────────
  const renderApplicationsList = () => (
    <div className="card w-full mt-4">
      <div className="card-header">
        <span className="card-title">Manage Applications</span>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Search ID or Name..." style={{ paddingLeft: '2rem', height: '2rem', padding: '0 0.5rem 0 2rem' }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('student_id')} style={{ cursor: 'pointer' }}>Student ID {sortConfig.key === 'student_id' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Applicant {sortConfig.key === 'name' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
              <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>Date {sortConfig.key === 'date' ? (sortConfig.direction === 'ascending' ? '↑' : '↓') : ''}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedApplicants.map(app => (
              <tr key={app.id}>
                <td>{app.student_id}</td>
                <td>
                  <p style={{ fontWeight: 500, margin: 0, color: 'var(--text-main)' }}>{app.name}</p>
                  <p style={{ fontSize: '0.75rem', margin: 0 }}>{app.email}</p>
                </td>
                <td>
                  <span className={`badge ${app.status.includes('Acceptance') ? 'badge-success' : app.status === 'Pending' ? 'badge-warning' : 'badge-error'}`}>{app.status}</span>
                </td>
                <td style={{ fontSize: '0.875rem' }}>{app.date}</td>
                <td>
                  <div className="flex gap-2">
                    <button className="btn btn-success" style={{ padding: '0.5rem', fontSize: '0.75rem' }} onClick={() => handleStatusChange(app.id, 'Final Acceptance')}>
                      <CheckCircle size={14} /> Accept
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.5rem', fontSize: '0.75rem' }} onClick={() => handleStatusChange(app.id, 'Rejected')}>
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedApplicants.length === 0 && (
              <tr><td colSpan="5" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>No applications found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─────────── REQUIREMENTS ──────────────────────────
  const renderRequirements = () => (
    <div className="card w-full mt-4">
      <div className="card-header"><span className="card-title">Missing Requirements Dashboard</span></div>
      {reminderMsg && <div className="badge badge-success mb-4" style={{ padding: '0.5rem', width: '100%', justifyContent: 'center' }}>{reminderMsg}</div>}
      <div className="table-container">
        <table>
          <thead><tr><th>Applicant</th><th>Docs Uploaded</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {applicants.map(app => (
              <tr key={`req-${app.id}`} style={!app.requirementsMet ? { background: 'rgba(239,68,68,0.05)' } : {}}>
                <td>{app.name} ({app.student_id})</td>
                <td>
                  {app.documents.length} files
                  {app.documents.length > 0 && <span style={{ fontSize: '0.7rem', display: 'block', color: 'var(--tmu-blue)' }}>{app.documents.join(', ')}</span>}
                </td>
                <td>
                  {app.requirementsMet
                    ? <span className="badge badge-success"><CheckCircle size={12} style={{ marginRight: '4px' }} /> Complete</span>
                    : <span className="badge badge-error"><AlertTriangle size={12} style={{ marginRight: '4px' }} /> Missing</span>}
                </td>
                <td>
                  {!app.requirementsMet && (
                    <button className="btn btn-secondary" style={{ padding: '0.5rem', fontSize: '0.75rem' }} onClick={() => handleRemindClick(app.name)}>
                      <Mail size={14} /> Remind
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─────────── STUDENT ACCOUNTS ──────────────────────
  const renderStudentAccounts = () => (
    <div className="mt-4">
      {/* Create Account Form */}
      <div className="card w-full">
        <div className="card-header"><span className="card-title">Create Student Account</span></div>
        <p className="mb-4" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Create a new student login. The student can then log in and submit their co-op application.
        </p>

        {createMsg && (
          <div className={`badge ${createMsg.includes('Error') ? 'badge-error' : 'badge-success'} mb-4`} style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}>
            {createMsg}
          </div>
        )}

        <form onSubmit={handleCreateAccount}>
          <div className="flex gap-4">
            <div className="form-group w-full">
              <label>Full Name</label>
              <input type="text" placeholder="e.g. Jane Doe" value={newName} onChange={e => setNewName(e.target.value)} />
            </div>
            <div className="form-group w-full">
              <label>Email Address</label>
              <input type="email" placeholder="e.g. jdoe@torontomu.ca" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="form-group w-full">
              <label>Username</label>
              <input type="text" placeholder="e.g. jdoe" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
            </div>
            <div className="form-group w-full">
              <label>Password</label>
              <input type="password" placeholder="Set initial password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
          </div>
          <button type="submit" className="btn btn-accent mt-2">
            <UserPlus size={18} /> Create Account
          </button>
        </form>
      </div>

      {/* Student Accounts Table */}
      <div className="card w-full mt-4">
        <div className="card-header">
          <span className="card-title">All Student Accounts</span>
          <span className="badge badge-neutral">{studentAccounts.length} students</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Application Status</th>
              </tr>
            </thead>
            <tbody>
              {studentAccounts.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{s.username}</td>
                  <td style={{ fontSize: '0.875rem' }}>{s.email}</td>
                  <td>
                    {s.hasApplied
                      ? <span className={`badge ${s.status.includes('Acceptance') ? 'badge-success' : s.status === 'Pending' ? 'badge-warning' : 'badge-error'}`}>{s.status}</span>
                      : <span className="badge" style={{ background: 'var(--bg-color)', color: 'var(--text-muted)' }}>Not yet applied</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ─────────── HISTORY ───────────────────────────────
  const renderHistory = () => (
    <div className="mt-4">
      <div className="grid-cols-4 w-full">
        <div className="card">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Total</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0, color: 'var(--tmu-blue)' }}>{historyStats.total_applications}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--status-success)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Accepted</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{historyStats.accepted}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--status-error)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Rejected</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{historyStats.rejected}</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--status-warning)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600 }}>Pending</p>
          <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{historyStats.pending}</p>
        </div>
      </div>

      <div className="card w-full mt-4">
        <div className="card-header"><span className="card-title">Recent Logs</span></div>
        <div className="table-container">
          <table>
            <thead><tr><th>Applicant</th><th>Outcome</th><th>Timestamp</th></tr></thead>
            <tbody>
              {applicants.filter(a => a.status !== 'Pending').map((app, i) => (
                <tr key={`hist-${i}`}>
                  <td>{app.name}</td>
                  <td><span className={`badge ${app.status.includes('Acceptance') ? 'badge-success' : 'badge-error'}`}>{app.status}</span></td>
                  <td>{app.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card w-full mt-4">
        <div className="card-header"><span className="card-title">Mass Reminders</span></div>
        <div className="form-group mb-4">
          <label>Select Group</label>
          <select>
            <option>All Students Missing Requirements</option>
            <option>All Pending Students</option>
            <option>All Students</option>
          </select>
        </div>
        <div className="form-group mb-4">
          <label>Message Content</label>
          <textarea rows="4" defaultValue="Please be reminded that the deadline for your Co-op Work Term Evaluations is approaching." />
        </div>
        {reminderMsg && <div className="badge badge-success mb-4" style={{ padding: '0.5rem', width: '100%', justifyContent: 'center' }}>{reminderMsg}</div>}
        <button className="btn btn-primary" onClick={() => handleRemindClick('selected group')}><Mail size={16} /> Send Mass Reminder</button>
      </div>
    </div>
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Briefcase size={32} />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Coordination</h2>
        </div>
        <nav className="sidebar-nav" style={{ flex: 1 }}>
          {[
            { key: 'list', label: 'Applications' },
            { key: 'accounts', label: 'Student Accounts' },
            { key: 'reqs', label: 'Requirements' },
            { key: 'history', label: 'History & Reminders' },
          ].map(tab => (
            <button key={tab.key}
              className={`nav-item w-full ${activeTab === tab.key ? 'active' : ''}`}
              style={{ border: 'none', background: activeTab === tab.key ? 'var(--bg-color)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => setActiveTab(tab.key)}>
              {tab.key === 'accounts' && <Users size={18} />}
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <button className="nav-item w-full" onClick={() => { logout(); navigate('/login'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ display: 'block' }}>
        <header className="topbar">
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>Coordinator Portal</h1>
            <p>Manage applications, track metrics, and contact students.</p>
          </div>
          <div className="flex items-center gap-4">
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Bell size={24} /></button>
            <div className="user-profile-badge">
              <span style={{ width: 28, height: 28, background: 'var(--tmu-blue-dark)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {currentUser?.name?.charAt(0) || 'C'}
              </span>
              <span>{currentUser?.name || 'Coordinator'}</span>
            </div>
          </div>
        </header>

        {activeTab === 'list' && renderApplicationsList()}
        {activeTab === 'accounts' && renderStudentAccounts()}
        {activeTab === 'reqs' && renderRequirements()}
        {activeTab === 'history' && renderHistory()}
      </main>
    </div>
  );
};

export default CoordinatorDashboard;
