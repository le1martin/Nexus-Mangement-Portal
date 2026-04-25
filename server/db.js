import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'csa.db');

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL CHECK(role IN ('applicant','coordinator','supervisor')),
    name        TEXT    NOT NULL,
    email       TEXT
  );

  CREATE TABLE IF NOT EXISTS applicants (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER UNIQUE REFERENCES users(id),
    student_id      TEXT    NOT NULL,
    name            TEXT    NOT NULL,
    email           TEXT    NOT NULL,
    status          TEXT    DEFAULT 'Pending',
    date            TEXT,
    requirements_met INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS documents (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_id  INTEGER REFERENCES applicants(id),
    filename      TEXT    NOT NULL,
    uploaded_at   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS feedback (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    applicant_id  INTEGER REFERENCES applicants(id),
    author        TEXT    NOT NULL,
    text          TEXT    NOT NULL,
    created_at    TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS history_stats (
    id                INTEGER PRIMARY KEY CHECK (id = 1),
    total_applications INTEGER DEFAULT 0,
    accepted          INTEGER DEFAULT 0,
    rejected          INTEGER DEFAULT 0,
    pending           INTEGER DEFAULT 0
  );
`);

// ── Seed only when tables are empty ─────────────────────
const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;

if (userCount === 0) {
  const insertUser = db.prepare(
    'INSERT INTO users (username, password, role, name, email) VALUES (?, ?, ?, ?, ?)'
  );
  const insertApplicant = db.prepare(
    'INSERT INTO applicants (user_id, student_id, name, email, status, date, requirements_met) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertDoc = db.prepare(
    'INSERT INTO documents (applicant_id, filename) VALUES (?, ?)'
  );
  const insertFeedback = db.prepare(
    'INSERT INTO feedback (applicant_id, author, text) VALUES (?, ?, ?)'
  );

  const seed = db.transaction(() => {
    // ── Users ───────────────────────────────────────────
    // Students who HAVE submitted applications
    insertUser.run('achen',       'password123', 'applicant',   'Alex Chen',         'achen@torontomu.ca');       // 1
    insertUser.run('psharma',     'password123', 'applicant',   'Priya Sharma',      'psharma@torontomu.ca');     // 2
    insertUser.run('mjohnson',    'password123', 'applicant',   'Marcus Johnson',    'mjohnson@torontomu.ca');    // 3
    insertUser.run('srodriguez',  'password123', 'applicant',   'Sofia Rodriguez',   'srodriguez@torontomu.ca'); // 4

    // Students who have accounts but have NOT submitted an application yet
    insertUser.run('dkim',        'password123', 'applicant',   'David Kim',         'dkim@torontomu.ca');        // 5
    insertUser.run('jlee',        'password123', 'applicant',   'Jamie Lee',         'jlee@torontomu.ca');        // 6

    // Coordinator
    insertUser.run('coordinator', 'password123', 'coordinator', 'Dr. Sarah Mitchell','smitchell@torontomu.ca');   // 7

    // ── Applicant records (only for students who have applied) ──
    insertApplicant.run(1, '501847293', 'Alex Chen',       'achen@torontomu.ca',      'Provisional Acceptance', '2026-03-25', 1);
    insertApplicant.run(2, '501932156', 'Priya Sharma',    'psharma@torontomu.ca',    'Pending',                '2026-03-26', 0);
    insertApplicant.run(3, '501764028', 'Marcus Johnson',  'mjohnson@torontomu.ca',   'Final Acceptance',       '2026-03-20', 1);
    insertApplicant.run(4, '501618374', 'Sofia Rodriguez', 'srodriguez@torontomu.ca', 'Rejected',               '2026-03-21', 0);
    // NOTE: users 5 (dkim) and 6 (jlee) have NO applicant row — they haven't applied yet

    // ── Documents ───────────────────────────────────────
    insertDoc.run(1, 'Resume.pdf');
    insertDoc.run(3, 'Resume.pdf');
    insertDoc.run(3, 'WorkTermReport_1.pdf');
    insertDoc.run(4, 'Resume.pdf');

    // ── Feedback ────────────────────────────────────────
    insertFeedback.run(3, 'Supervisor John', 'Great team player.');

    // ── History stats ───────────────────────────────────
    db.prepare(
      'INSERT INTO history_stats (id, total_applications, accepted, rejected, pending) VALUES (1, 120, 45, 20, 55)'
    ).run();
  });

  seed();
  console.log('✅ Database seeded with mock data.');
}

export default db;
