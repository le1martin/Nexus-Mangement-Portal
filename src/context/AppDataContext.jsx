import React, { createContext, useState, useContext, useCallback } from 'react';

const AppDataContext = createContext();

export const useAppData = () => useContext(AppDataContext);

export const AppDataProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [historyStats, setHistoryStats] = useState({
    total_applications: 0, accepted: 0, rejected: 0, pending: 0
  });

  // ── Auth ─────────────────────────────────────────────
  const login = async (username, password) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    setCurrentUser(data);
    return data;
  };

  const logout = () => {
    setCurrentUser(null);
    setApplicants([]);
  };

  // ── Submit Application (student who has account but hasn't applied) ──
  const submitApplication = async ({ user_id, name, email, student_id }) => {
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, name, email, student_id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    // Update currentUser with the new applicantId
    setCurrentUser(prev => ({ ...prev, applicantId: data.applicantId }));
    return data;
  };

  // ── Coordinator: Create Student Account ─────────────
  const createStudentAccount = async ({ name, email, username, password }) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  // ── Coordinator: List all student accounts ──────────
  const fetchStudentAccounts = useCallback(async () => {
    const res = await fetch('/api/users/students');
    return res.json();
  }, []);

  // ── Applicants ──────────────────────────────────────
  const fetchApplicants = useCallback(async () => {
    const res = await fetch('/api/applicants');
    const data = await res.json();
    setApplicants(data);
    return data;
  }, []);

  const fetchApplicant = useCallback(async (id) => {
    const res = await fetch(`/api/applicants/${id}`);
    return res.json();
  }, []);

  const updateApplicantProfile = async (id, { name, email, student_id }) => {
    await fetch(`/api/applicants/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, student_id })
    });
  };

  const updateApplicantStatus = async (id, newStatus) => {
    await fetch(`/api/applicants/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    await fetchApplicants();
    await fetchStats();
  };

  // ── Documents ───────────────────────────────────────
  const uploadDocument = async (applicantId, filename) => {
    await fetch(`/api/applicants/${applicantId}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename })
    });
  };

  const fetchDocuments = useCallback(async (applicantId) => {
    const res = await fetch(`/api/applicants/${applicantId}/documents`);
    return res.json();
  }, []);

  const deleteDocument = async (docId) => {
    await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
  };

  // ── Feedback ────────────────────────────────────────
  const submitFeedback = async (applicantId, feedbackText, authorName) => {
    await fetch(`/api/applicants/${applicantId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: authorName, text: feedbackText })
    });
  };

  // ── Stats ───────────────────────────────────────────
  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/stats');
    const data = await res.json();
    setHistoryStats(data);
    return data;
  }, []);

  return (
    <AppDataContext.Provider value={{
      currentUser,
      login,
      logout,
      submitApplication,
      createStudentAccount,
      fetchStudentAccounts,
      applicants,
      fetchApplicants,
      fetchApplicant,
      updateApplicantProfile,
      updateApplicantStatus,
      uploadDocument,
      fetchDocuments,
      deleteDocument,
      submitFeedback,
      historyStats,
      fetchStats
    }}>
      {children}
    </AppDataContext.Provider>
  );
};
