import React, { useState, useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';
import { GraduationCap, FileText, CheckCircle, UploadCloud, LogOut, Bell, Trash2, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ApplicantDashboard = () => {
  const {
    currentUser, fetchApplicant, fetchDocuments, updateApplicantProfile,
    uploadDocument, deleteDocument, submitApplication, logout
  } = useAppData();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeUser, setActiveUser] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Profile form state
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  // Application form state (for students who haven't applied)
  const [appName, setAppName] = useState('');
  const [appStudentId, setAppStudentId] = useState('');
  const [appEmail, setAppEmail] = useState('');
  const [appMessage, setAppMessage] = useState('');
  const [appResumeFile, setAppResumeFile] = useState(null);

  const [dragActive, setDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const hasApplied = currentUser?.applicantId !== null;

  useEffect(() => {
    if (currentUser) {
      if (hasApplied) {
        loadApplicant();
        loadDocuments();
      } else {
        // Pre-fill from the user account
        setAppName(currentUser.name || '');
        setAppEmail(currentUser.email || '');
        setLoading(false);
      }
    }
  }, [currentUser]);

  const loadApplicant = async () => {
    const data = await fetchApplicant(currentUser.applicantId);
    setActiveUser(data);
    setName(data.name);
    setStudentId(data.student_id);
    setEmail(data.email);
    setLoading(false);
  };

  const loadDocuments = async () => {
    const docs = await fetchDocuments(currentUser.applicantId);
    setDocuments(docs);
  };

  // ── Submit new application ───────────────────────────
  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    setAppMessage('');

    if (!appName || !appStudentId || !appEmail) {
      setAppMessage('Error: All text fields are required.');
      return;
    }
    if (!appResumeFile) {
      setAppMessage('Error: You must upload a resume (PDF).');
      return;
    }
    if (!/^[A-Za-z\s]+$/.test(appName)) {
      setAppMessage('Error: Name must contain only letters and spaces.');
      return;
    }
    if (!/^\d{7,}$/.test(appStudentId)) {
      setAppMessage('Error: Student ID must follow university format (at least 7 digits).');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(appEmail)) {
      setAppMessage('Error: Please enter a valid email address.');
      return;
    }

    try {
      const { applicantId } = await submitApplication({
        user_id: currentUser.id,
        name: appName,
        email: appEmail,
        student_id: appStudentId
      });
      
      // Upload the resume document directly after creating the application
      await uploadDocument(applicantId, appResumeFile.name);

      setAppMessage('Success: Your application has been submitted!');
    } catch (err) {
      setAppMessage(`Error: ${err.message}`);
    }
  };

  // ── Profile update ──────────────────────────────────
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!name || !studentId || !email) { setMessage('Error: All fields are required.'); return; }
    const emailValid = email.includes('@');
    const idValid = /^\d+$/.test(studentId) && studentId.length >= 7;

    if (emailValid && idValid) {
      await updateApplicantProfile(currentUser.applicantId, { name, email, student_id: studentId });
      await loadApplicant();
      setMessage('Success: Profile updated successfully.');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage('Error: Invalid format for Email or ID.');
    }
  };

  // ── File handlers ───────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  };
  const handleFileSelect = (e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };

  const processFile = async (file) => {
    if (file.type !== 'application/pdf') { setUploadMessage('Error: Only PDF files are supported.'); return; }
    if (file.size > 5000000) { setUploadMessage('Error: File size too large. Max 5MB.'); return; }
    await uploadDocument(currentUser.applicantId, file.name);
    await loadApplicant();
    await loadDocuments();
    setUploadMessage('Success: Document uploaded.');
    setTimeout(() => setUploadMessage(''), 3000);
  };

  const handleDeleteDoc = async (docId) => {
    await deleteDocument(docId);
    await loadApplicant();
    await loadDocuments();
  };

  const getStatusBadge = (status) => {
    if (status.includes('Acceptance')) return 'badge-success';
    if (status === 'Pending') return 'badge-warning';
    return 'badge-error';
  };

  if (loading || (hasApplied && !activeUser)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>Loading…</p>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  NOT YET APPLIED — Show application form
  // ══════════════════════════════════════════════════════
  if (!hasApplied) {
    return (
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <GraduationCap size={32} />
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Portal</h2>
          </div>
          <nav className="sidebar-nav" style={{ flex: 1 }}>
            <button className="nav-item w-full active" style={{ border: 'none', background: 'var(--bg-color)', cursor: 'pointer', textAlign: 'left' }}>
              <Send size={20} /> Submit Application
            </button>
          </nav>
          <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <button className="nav-item w-full" onClick={() => { logout(); navigate('/login'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
              <LogOut size={20} /> Logout
            </button>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div>
              <h1 style={{ marginBottom: '0.25rem' }}>Hello, {currentUser.name.split(' ')[0]}!</h1>
              <p>You haven't submitted your co-op application yet. Fill in the form below to apply.</p>
            </div>
            <div className="user-profile-badge">
              <span style={{ width: 28, height: 28, background: 'var(--tmu-blue)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {currentUser.name.charAt(0)}
              </span>
              <span>{currentUser.name}</span>
            </div>
          </header>

          <div className="card" style={{ maxWidth: 600 }}>
            <div className="card-header">
              <span className="card-title">Submit New Application</span>
            </div>

            <p className="mb-4" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Please verify your information and provide your student ID to complete your co-op application.
            </p>

            {appMessage && (
              <div className={`badge ${appMessage.includes('Error') ? 'badge-error' : 'badge-success'} mb-4`} style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}>
                {appMessage}
              </div>
            )}

            <form onSubmit={handleApplicationSubmit}>
              <div className="form-group">
                <label>Full Name <span style={{ color: 'var(--status-error)', fontSize: '0.75rem' }}>(letters and spaces only)</span></label>
                <input type="text" value={appName} onChange={e => setAppName(e.target.value)} placeholder="e.g. David Kim" />
              </div>
              <div className="form-group">
                <label>Student ID <span style={{ color: 'var(--status-error)', fontSize: '0.75rem' }}>(university format, min 7 digits)</span></label>
                <input type="text" value={appStudentId} onChange={e => setAppStudentId(e.target.value)} placeholder="e.g. 501285940" />
              </div>
              <div className="form-group mb-4">
                <label>Email Address</label>
                <input type="email" value={appEmail} onChange={e => setAppEmail(e.target.value)} placeholder="e.g. dkim@torontomu.ca" />
              </div>

              <div className="form-group mb-4">
                <label>Resume Upload <span style={{ color: 'var(--status-error)', fontSize: '0.75rem' }}>(Required, PDF only)</span></label>
                <div className="dropzone" style={{ padding: '1rem', background: 'var(--bg-color)' }}>
                  <input 
                    type="file" 
                    accept="application/pdf"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        if (e.target.files[0].type !== 'application/pdf') {
                          setAppMessage('Error: Resume must be a PDF file.');
                        } else {
                          setAppResumeFile(e.target.files[0]);
                          setAppMessage('');
                        }
                      }
                    }}
                    style={{ fontSize: '0.875rem' }}
                  />
                  {appResumeFile && (
                    <p style={{ margin: '0.5rem 0 0 0', color: 'var(--tmu-blue)', fontSize: '0.875rem', fontWeight: 500 }}>
                      Selected: {appResumeFile.name}
                    </p>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-accent w-full mt-2" style={{ padding: '1rem', fontSize: '1rem' }}>
                <Send size={20} /> Submit Application
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════
  //  HAS APPLIED — Show normal dashboard
  // ══════════════════════════════════════════════════════

  // ── Dashboard tab content ───────────────────────────
  const renderDashboard = () => (
    <>
      <div className="grid-cols-2">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Admission Status</span>
            <span className={`badge ${getStatusBadge(activeUser.status)}`}>{activeUser.status}</span>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-color)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-main)' }}>Decision Date:</p>
            <p style={{ margin: 0, fontSize: '0.875rem' }}>{activeUser.date}</p>
            {activeUser.feedback.length > 0 && (
              <div className="mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <p style={{ margin: 0, fontWeight: 500, color: 'var(--text-main)', fontSize: '0.875rem' }}>Latest Feedback:</p>
                <p style={{ margin: 0, fontSize: '0.875rem', fontStyle: 'italic' }}>"{activeUser.feedback.at(-1).text}"</p>
                <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>- {activeUser.feedback.at(-1).author}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Applicant Profile</span></div>
          {message && <div className={`badge ${message.includes('Error') ? 'badge-error' : 'badge-success'} mb-4`} style={{ width: '100%', padding: '0.5rem', justifyContent: 'center' }}>{message}</div>}
          <form onSubmit={handleProfileSubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="flex gap-4">
              <div className="form-group w-full">
                <label>Student ID</label>
                <input type="text" value={studentId} onChange={e => setStudentId(e.target.value)} />
              </div>
              <div className="form-group w-full">
                <label>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary mt-2">Update Profile</button>
          </form>
        </div>
      </div>

      <div className="card mt-2">
        <div className="card-header"><span className="card-title">Work Term PDF Upload</span></div>
        <p className="mb-4" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Upload your work term report and evaluations. PDF only.</p>
        {uploadMessage && <div className={`badge ${uploadMessage.includes('Error') ? 'badge-error' : 'badge-success'} mb-4`} style={{ padding: '0.5rem' }}>{uploadMessage}</div>}
        <div className="dropzone" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          style={dragActive ? { background: 'rgba(0,76,155,0.1)', borderColor: 'var(--tmu-blue-dark)' } : {}}>
          <div className="dropzone-icon"><UploadCloud size={32} /></div>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--tmu-blue)', marginBottom: '0.25rem' }}>Drag & drop your PDF file here</p>
            <p style={{ fontSize: '0.875rem' }}>or <button type="button" style={{ border: 'none', background: 'none', color: 'var(--tmu-gold-dark)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }} onClick={() => document.getElementById('file-upload').click()}>browse</button></p>
            <input type="file" id="file-upload" style={{ display: 'none' }} onChange={handleFileSelect} accept="application/pdf" />
            <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Max: 5MB</p>
          </div>
        </div>
      </div>
    </>
  );

  // ── Documents tab content ───────────────────────────
  const renderDocuments = () => (
    <div className="card">
      <div className="card-header">
        <span className="card-title">My Documents</span>
        <span className="badge badge-neutral">{documents.length} file{documents.length !== 1 ? 's' : ''}</span>
      </div>
      {uploadMessage && <div className={`badge ${uploadMessage.includes('Error') ? 'badge-error' : 'badge-success'} mb-4`} style={{ padding: '0.5rem', width: '100%', justifyContent: 'center' }}>{uploadMessage}</div>}
      <div className="dropzone mb-4" onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        style={dragActive ? { background: 'rgba(0,76,155,0.1)', borderColor: 'var(--tmu-blue-dark)', padding: '1.5rem' } : { padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <UploadCloud size={24} color="var(--tmu-blue)" />
          <div>
            <p style={{ fontWeight: 600, color: 'var(--tmu-blue)', margin: 0 }}>Upload a new PDF</p>
            <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--text-muted)' }}>Drag & drop or <button type="button" style={{ border: 'none', background: 'none', color: 'var(--tmu-gold-dark)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', padding: 0 }} onClick={() => document.getElementById('file-upload-docs').click()}>browse</button></p>
          </div>
        </div>
        <input type="file" id="file-upload-docs" style={{ display: 'none' }} onChange={handleFileSelect} accept="application/pdf" />
      </div>
      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p>No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>File Name</th><th>Uploaded At</th><th>Actions</th></tr></thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id}>
                  <td><div className="flex items-center gap-2"><FileText size={16} color="var(--tmu-blue)" /><span style={{ fontWeight: 500 }}>{doc.filename}</span></div></td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{doc.uploaded_at || 'N/A'}</td>
                  <td><button className="btn btn-danger" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }} onClick={() => handleDeleteDoc(doc.id)}><Trash2 size={14} /> Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <GraduationCap size={32} />
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Portal</h2>
        </div>
        <nav className="sidebar-nav" style={{ flex: 1 }}>
          <button className={`nav-item w-full ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} style={{ border: 'none', background: activeTab === 'dashboard' ? 'var(--bg-color)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <CheckCircle size={20} /> Dashboard
          </button>
          <button className={`nav-item w-full ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')} style={{ border: 'none', background: activeTab === 'documents' ? 'var(--bg-color)' : 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <FileText size={20} /> Documents
          </button>
        </nav>
        <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <button className="nav-item w-full" onClick={() => { logout(); navigate('/login'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1 style={{ marginBottom: '0.25rem' }}>Welcome back, {activeUser.name.split(' ')[0]}!</h1>
            <p>Manage your co-op application and track your status.</p>
          </div>
          <div className="flex items-center gap-4">
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Bell size={24} /></button>
            <div className="user-profile-badge">
              <span style={{ width: 28, height: 28, background: 'var(--tmu-blue)', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{activeUser.name.charAt(0)}</span>
              <span>{activeUser.student_id}</span>
            </div>
          </div>
        </header>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'documents' && renderDocuments()}
      </main>
    </div>
  );
};

export default ApplicantDashboard;
