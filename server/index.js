import express from 'express';
import cors from 'cors';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

// ─────────────────────────────────────────────────────────
//  AUTH
// ─────────────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.prepare(
    'SELECT id, username, role, name, email FROM users WHERE username = ? AND password = ?'
  ).get(username, password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  // If the user is an applicant, check if they have submitted an application
  let applicantId = null;
  if (user.role === 'applicant') {
    const applicant = db.prepare('SELECT id FROM applicants WHERE user_id = ?').get(user.id);
    applicantId = applicant?.id ?? null;
  }

  res.json({ ...user, applicantId });
});

// ─────────────────────────────────────────────────────────
//  COORDINATOR: CREATE STUDENT ACCOUNTS
// ─────────────────────────────────────────────────────────
app.post('/api/users', (req, res) => {
  const { name, email, username, password } = req.body;

  if (!name || !email || !username || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[A-Za-z\s]+$/.test(name)) {
    return res.status(400).json({ error: 'Name must contain only letters and spaces.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already exists.' });
  }

  try {
    const info = db.prepare(
      'INSERT INTO users (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)'
    ).run(username, password, 'applicant', name, email);

    res.json({ id: info.lastInsertRowid, username, name, email, role: 'applicant' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create account: ' + err.message });
  }
});

// List all student user accounts (for coordinator to see who has/hasn't applied)
app.get('/api/users/students', (_req, res) => {
  const students = db.prepare(
    `SELECT u.id, u.username, u.name, u.email,
            a.id AS applicant_id, a.status
     FROM users u
     LEFT JOIN applicants a ON a.user_id = u.id
     WHERE u.role = 'applicant'
     ORDER BY u.id`
  ).all();

  res.json(students.map(s => ({
    ...s,
    hasApplied: s.applicant_id !== null
  })));
});

// ─────────────────────────────────────────────────────────
//  STUDENT: SUBMIT APPLICATION
// ─────────────────────────────────────────────────────────
app.post('/api/apply', (req, res) => {
  const { user_id, name, email, student_id } = req.body;

  if (!user_id || !name || !email || !student_id) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (!/^[A-Za-z\s]+$/.test(name)) {
    return res.status(400).json({ error: 'Name must contain only letters and spaces.' });
  }
  if (!/^\d{7,}$/.test(student_id)) {
    return res.status(400).json({ error: 'Student ID must be at least 7 digits.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // Check user exists
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  // Check not already applied
  const existingApp = db.prepare('SELECT id FROM applicants WHERE user_id = ?').get(user_id);
  if (existingApp) return res.status(409).json({ error: 'You have already submitted an application.' });

  // Check student_id uniqueness
  const existingId = db.prepare('SELECT id FROM applicants WHERE student_id = ?').get(student_id);
  if (existingId) return res.status(409).json({ error: 'This student ID is already registered in another application.' });

  try {
    const now = new Date().toISOString().split('T')[0];
    const info = db.prepare(
      'INSERT INTO applicants (user_id, student_id, name, email, status, date, requirements_met) VALUES (?, ?, ?, ?, ?, ?, 0)'
    ).run(user_id, student_id, name, email, 'Pending', now);

    // Update stats
    db.prepare('UPDATE history_stats SET total_applications = total_applications + 1, pending = pending + 1 WHERE id = 1').run();

    res.json({ applicantId: info.lastInsertRowid, status: 'Pending' });
  } catch (err) {
    res.status(500).json({ error: 'Application failed: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────
//  APPLICANTS
// ─────────────────────────────────────────────────────────
app.get('/api/applicants', (_req, res) => {
  const applicants = db.prepare('SELECT * FROM applicants').all();

  const enriched = applicants.map((a) => {
    const documents = db.prepare('SELECT filename, uploaded_at FROM documents WHERE applicant_id = ?').all(a.id);
    const feedback  = db.prepare('SELECT author, text, created_at FROM feedback WHERE applicant_id = ?').all(a.id);
    return {
      ...a,
      requirementsMet: !!a.requirements_met,
      documents: documents.map(d => d.filename),
      feedback
    };
  });

  res.json(enriched);
});

app.get('/api/applicants/:id', (req, res) => {
  const a = db.prepare('SELECT * FROM applicants WHERE id = ?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });

  const documents = db.prepare('SELECT filename, uploaded_at FROM documents WHERE applicant_id = ?').all(a.id);
  const feedback  = db.prepare('SELECT author, text, created_at FROM feedback WHERE applicant_id = ?').all(a.id);

  res.json({
    ...a,
    requirementsMet: !!a.requirements_met,
    documents: documents.map(d => d.filename),
    feedback
  });
});

app.put('/api/applicants/:id', (req, res) => {
  const { name, email, student_id } = req.body;
  db.prepare('UPDATE applicants SET name = ?, email = ?, student_id = ? WHERE id = ?')
    .run(name, email, student_id, req.params.id);
  res.json({ success: true });
});

app.patch('/api/applicants/:id/status', (req, res) => {
  const { status } = req.body;
  const now = new Date().toISOString().split('T')[0];
  db.prepare('UPDATE applicants SET status = ?, date = ? WHERE id = ?')
    .run(status, now, req.params.id);

  if (status.includes('Acceptance')) {
    db.prepare('UPDATE history_stats SET accepted = accepted + 1 WHERE id = 1').run();
  } else if (status === 'Rejected') {
    db.prepare('UPDATE history_stats SET rejected = rejected + 1 WHERE id = 1').run();
  }

  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────
//  DOCUMENTS
// ─────────────────────────────────────────────────────────
app.post('/api/applicants/:id/documents', (req, res) => {
  const { filename } = req.body;
  db.prepare('INSERT INTO documents (applicant_id, filename) VALUES (?, ?)').run(req.params.id, filename);
  db.prepare('UPDATE applicants SET requirements_met = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.get('/api/applicants/:id/documents', (req, res) => {
  const docs = db.prepare('SELECT id, filename, uploaded_at FROM documents WHERE applicant_id = ?').all(req.params.id);
  res.json(docs);
});

app.delete('/api/documents/:docId', (req, res) => {
  const doc = db.prepare('SELECT applicant_id FROM documents WHERE id = ?').get(req.params.docId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.docId);

  const remaining = db.prepare('SELECT COUNT(*) as cnt FROM documents WHERE applicant_id = ?').get(doc.applicant_id);
  if (remaining.cnt === 0) {
    db.prepare('UPDATE applicants SET requirements_met = 0 WHERE id = ?').run(doc.applicant_id);
  }

  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────
//  FEEDBACK
// ─────────────────────────────────────────────────────────
app.post('/api/applicants/:id/feedback', (req, res) => {
  const { author, text } = req.body;
  db.prepare('INSERT INTO feedback (applicant_id, author, text) VALUES (?, ?, ?)')
    .run(req.params.id, author, text);
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────
//  HISTORY STATS
// ─────────────────────────────────────────────────────────
app.get('/api/stats', (_req, res) => {
  const stats = db.prepare('SELECT * FROM history_stats WHERE id = 1').get();
  res.json(stats);
});

// ─────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 CSA API server running on http://localhost:${PORT}`);
});
