import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Home from './components/Home';
import StudentDashboard from './components/StudentDashboard';
import ParentDashboard from './components/ParentDashboard';
import AdminDashboard from './components/AdminDashboard';
import TeacherDashboard from './components/TeacherDashboard';

import Layout from './components/Layout';

const PrivateRoute: React.FC<{ children: React.ReactNode; allowedRoles: string[] }> = ({ 
  children, 
  allowedRoles 
}) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentUser || !userData) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(userData.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Giriş sonrası direkt dashboard'a yönlendirme
  const getDefaultRoute = () => {
    if (!currentUser || !userData) return "/login";
    
    switch (userData.role) {
      case 'student': return '/student';
      case 'teacher': return '/teacher';
      case 'parent': return '/parent';
      case 'admin': return '/admin';
      default: return '/login';
    }
  };

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={currentUser ? <Navigate to={getDefaultRoute()} replace /> : <Login />} 
      />
      
      {/* Protected routes */}
      <Route 
        path="/" 
        element={currentUser ? <Navigate to={getDefaultRoute()} replace /> : <Navigate to="/login" replace />} 
      />
      
      {/* Home route (ara sayfa) - artık kullanılmıyor ama compatibility için tutalım */}
      <Route 
        path="/home" 
        element={currentUser ? <Home /> : <Navigate to="/login" replace />} 
      />
      <Route 
        path="/register" 
        element={
          <PrivateRoute allowedRoles={['admin', 'teacher']}>
            <Register />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/teacher" 
        element={
          <PrivateRoute allowedRoles={['teacher']}>
            <Layout>
              <TeacherDashboard />
            </Layout>
          </PrivateRoute>
        } 
      />
      <Route 
        path="/student" 
        element={
          <PrivateRoute allowedRoles={['student']}>
            <Layout>
              <StudentDashboard />
            </Layout>
          </PrivateRoute>
        } 
      />
      <Route 
        path="/parent" 
        element={
          <PrivateRoute allowedRoles={['parent']}>
            <Layout>
              <ParentDashboard />
            </Layout>
          </PrivateRoute>
        } 
      />
      <Route 
        path="/teacher" 
        element={
          <PrivateRoute allowedRoles={['teacher']}>
            <TeacherDashboard />
          </PrivateRoute>
        } 
      />
      <Route 
        path="/admin" 
        element={
          <PrivateRoute allowedRoles={['admin']}>
            <Layout>
              <AdminDashboard />
            </Layout>
          </PrivateRoute>
        } 
      />

      
      {/* Catch all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
};

export default App; 