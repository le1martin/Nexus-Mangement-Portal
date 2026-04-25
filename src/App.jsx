import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import Login from './components/Login';
import ApplicantDashboard from './components/ApplicantDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';

const PrivateRoute = ({ children, allowedRole }) => {
  const { currentUser } = useAppData();

  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRole && currentUser.role !== allowedRole) return <Navigate to={`/${currentUser.role}`} replace />;

  return children;
};

const AppRoutes = () => {
  const { currentUser } = useAppData();

  return (
    <Routes>
      <Route path="/" element={
        currentUser ? <Navigate to={`/${currentUser.role}`} replace /> : <Navigate to="/login" replace />
      } />

      <Route path="/login" element={
        currentUser ? <Navigate to={`/${currentUser.role}`} replace /> : <Login />
      } />

      <Route path="/applicant" element={
        <PrivateRoute allowedRole="applicant">
          <ApplicantDashboard />
        </PrivateRoute>
      } />

      <Route path="/coordinator" element={
        <PrivateRoute allowedRole="coordinator">
          <CoordinatorDashboard />
        </PrivateRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AppDataProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppDataProvider>
  );
}

export default App;
