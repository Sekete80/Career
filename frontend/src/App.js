import React, { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import StudentDashboard from './components/student/StudentDashboard';
import InstituteDashboard from './components/institute/InstituteDashboard';
import AdminDashboard from './components/admin/AdminDashboard';
import CompanyDashboard from './components/company/CompanyDashboard';
import { auth, getDocument } from './services/api'; // ADD getDocument import
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        try {
          // ✅ FIX: Fetch user role from Firestore instead of localStorage
          const userDoc = await getDocument('users', user.uid);
          if (userDoc.exists()) {
            const role = userDoc.data().role;
            setUserRole(role);
            localStorage.setItem('userRole', role); // Keep localStorage as backup
            console.log('User role from Firestore:', role);
          } else {
            // Fallback to localStorage if Firestore document doesn't exist
            const role = localStorage.getItem('userRole') || 'student';
            setUserRole(role);
            console.log('User role from localStorage:', role);
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
          // Fallback to localStorage on error
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

  if (loading) {
    return (
      <div className="container py-4 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-4">
        <h1>Career Guidance Platform - Lesotho</h1>
        <p className="lead">Discover higher learning institutions and career opportunities</p>
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
    );
  }

  // Role-based routing - FIXED INDENTATION AND BRACKETS
  if (userRole === 'student') {
    return <StudentDashboard />;
  } else if (userRole === 'institute') {
    return <InstituteDashboard />;
  } else if (userRole === 'admin') {
    return <AdminDashboard />;
  } else if (userRole === 'company') {
    return <CompanyDashboard />;
  }

  return (
    <div className="container py-4">
      <h2>Welcome, {userRole}!</h2>
      <p>Dashboard for {userRole} role is under development.</p>
      <button 
        className="btn btn-secondary"
        onClick={() => {
          auth.signOut();
          localStorage.removeItem('userRole');
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default App;