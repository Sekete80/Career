import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import PasswordReset from './components/PasswordReset';
import StudentDashboard from './components/student/StudentDashboard';
import InstituteDashboard from './components/institute/InstituteDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import CompanyDashboard from './components/company/CompanyDashboard';
import { auth, getDocument } from './services/api';
import { onAuthStateChanged } from 'firebase/auth';

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-dark text-light mt-5 py-4">
      <div className="container-fluid">
        <div className="row">
          <div className="col-md-4">
            <h5>Career Guidance Platform - Lesotho</h5>
            <p className="mb-0">
              Empowering students to discover their career path and connect with educational institutions and employers.
            </p>
          </div>
          <div className="col-md-4">
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li><a href="/" className="text-light text-decoration-none">Home</a></li>
              <li><a href="/password-reset" className="text-light text-decoration-none">Forgot Password</a></li>
              <li><a href="/register" className="text-light text-decoration-none">Register</a></li>
            </ul>
          </div>
          <div className="col-md-4">
            <h6>Contact Information</h6>
            <ul className="list-unstyled">
              <li>📧 Email: support@careerguidance.ls</li>
              <li>📞 Phone: +266 1234 5678</li>
              <li>📍 Location: Maseru, Lesotho</li>
            </ul>
          </div>
        </div>
        <hr className="my-3 bg-light" />
        <div className="row">
          <div className="col-12 text-center">
            <p className="mb-0">
              &copy; {new Date().getFullYear()} Career Guidance Platform Lesotho. All rights reserved.
            </p>
            <small>Building the future of education and employment in Lesotho</small>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        try {
          const userDoc = await getDocument('users', user.uid);
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            setUserRole(role);
            localStorage.setItem('userRole', role);
            console.log('User role from Firestore:', role);
          } else {
            const role = localStorage.getItem('userRole') || 'student';
            setUserRole(role);
            console.log('User role from localStorage:', role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          const role = localStorage.getItem('userRole') || 'student';
          setUserRole(role);
        }
        
      } else {
        setUser(null);
        setUserRole(null);
        localStorage.removeItem('userRole');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Protected Route Component
  const ProtectedRoute = ({ children, requiredRole = null }) => {
    if (!user) {
      return <Navigate to="/" replace />;
    }
    
    if (requiredRole && userRole !== requiredRole) {
      return <Navigate to="/" replace />;
    }
    
    return children;
  };

  // Public Route Component (redirect to dashboard if already logged in)
  const PublicRoute = ({ children }) => {
    if (user) {
      const dashboardPath = `/${userRole}-dashboard`;
      return <Navigate to={dashboardPath} replace />;
    }
    return children;
  };

  if (loading) {
    return (
      <div className="container py-4 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="App d-flex flex-column min-vh-100">
        <div className="flex-grow-1">
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={
                <PublicRoute>
                  <div className="container py-4">
                    <div className="text-center mb-4">
                      <h1 className="display-4 text-primary">Career Guidance Platform - Lesotho</h1>
                      <p className="lead">Discover higher learning institutions and career opportunities in Lesotho</p>
                    </div>
                    <div className="row mt-4">
                      <div className="col-md-6">
                        <Login onLogin={(role) => {
                          setUserRole(role);
                          localStorage.setItem('userRole', role);
                        }} />
                      </div>
                      <div className="col-md-6">
                        <Register />
                      </div>
                    </div>
                  </div>
                </PublicRoute>
              } 
            />
            
            <Route 
              path="/password-reset" 
              element={
                <PublicRoute>
                  <PasswordReset />
                </PublicRoute>
              } 
            />

            {/* Protected Dashboard Routes */}
            <Route 
              path="/student-dashboard" 
              element={
                <ProtectedRoute requiredRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/institute-dashboard" 
              element={
                <ProtectedRoute requiredRole="institute">
                  <InstituteDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/admin-dashboard" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/company-dashboard" 
              element={
                <ProtectedRoute requiredRole="company">
                  <CompanyDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        
        {/* Footer - Appears on all pages */}
        <Footer />
      </div>
    </Router>
  );
}

export default App;