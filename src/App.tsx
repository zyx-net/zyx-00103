import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Manuscripts from './pages/Manuscripts/Manuscripts';
import ManuscriptDetail from './pages/Manuscripts/ManuscriptDetail';
import Corrections from './pages/Corrections/Corrections';
import CorrectionDetail from './pages/Corrections/CorrectionDetail';
import CorrectionForm from './pages/Corrections/CorrectionForm';
import History from './pages/History/History';
import Settings from './pages/Settings/Settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, checkAuth } = useAuthStore();

  useEffect(() => {
    if (token && !user) {
      checkAuth();
    }
  }, [token, user, checkAuth]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manuscripts"
          element={
            <ProtectedRoute>
              <Layout>
                <Manuscripts />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/manuscripts/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ManuscriptDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/corrections"
          element={
            <ProtectedRoute>
              <Layout>
                <Corrections />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/corrections/new"
          element={
            <ProtectedRoute>
              <Layout>
                <CorrectionForm />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/corrections/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <CorrectionDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/corrections/:id/edit"
          element={
            <ProtectedRoute>
              <Layout>
                <CorrectionForm />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <Layout>
                <History />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <Settings />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
