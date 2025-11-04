import React, { useState, useEffect } from 'react';
import { 
  auth,
  db,
  logoutUser,
  getAllInstitutions,
  verifyInstitution,
  getDocument
} from '../../services/api';
import { 
  collection, 
  query, 
  getDocs, 
  updateDoc, 
  doc,
  where,
  orderBy,
  onSnapshot 
} from 'firebase/firestore';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedItems, setSelectedItems] = useState({
    institutions: [],
    companies: [],
    users: []
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalInstitutions: 0,
    totalCompanies: 0,
    totalCourses: 0,
    totalApplications: 0,
    pendingVerifications: 0
  });
  const [analytics, setAnalytics] = useState({
    applicationsByStatus: {},
    usersByRole: {},
    monthlyGrowth: {}
  });
  const [systemHealth, setSystemHealth] = useState({
    database: 'healthy',
    storage: 'healthy',
    authentication: 'healthy',
    lastBackup: new Date()
  });

  useEffect(() => {
    loadAdminData();
    setupRealTimeListeners();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // Load all institutions
      const institutionsData = await getAllInstitutions();
      setInstitutions(institutionsData);

      // Load all companies
      const companiesQuery = query(collection(db, 'companies'));
      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesData = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCompanies(companiesData);

      // Load all users
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);

      // Load all courses
      const coursesQuery = query(collection(db, 'courses'));
      const coursesSnapshot = await getDocs(coursesQuery);
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesData);

      // Load all applications with enhanced data
      const applicationsQuery = query(collection(db, 'applications'));
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const applicationsData = await Promise.all(
        applicationsSnapshot.docs.map(async (doc) => {
          const appData = doc.data();
          
          let studentName = appData.studentName;
          let courseName = appData.courseName;
          let institutionName = appData.institutionName;
          
          // Fetch student name if not available
          if (!studentName) {
            try {
              const studentDoc = await getDocument('users', appData.studentId);
              if (studentDoc.exists()) {
                studentName = studentDoc.data().fullName || studentDoc.data().studentName || `Student ${appData.studentId.slice(0, 8)}`;
              }
            } catch (error) {
              console.error('Error fetching student name:', error);
            }
          }
          
          // Fetch course name if not available
          if (!courseName) {
            try {
              const courseDoc = await getDocument('courses', appData.courseId);
              if (courseDoc.exists()) {
                courseName = courseDoc.data().name;
              }
            } catch (error) {
              console.error('Error fetching course name:', error);
            }
          }
          
          // Fetch institution name if not available
          if (!institutionName) {
            try {
              const institutionDoc = await getDocument('institutions', appData.institutionId);
              if (institutionDoc.exists()) {
                institutionName = institutionDoc.data().name;
              }
            } catch (error) {
              console.error('Error fetching institution name:', error);
            }
          }
          
          return {
            id: doc.id,
            ...appData,
            studentName: studentName || `Student ${appData.studentId?.slice(0, 8) || 'N/A'}`,
            courseName: courseName || `Course ${appData.courseId?.slice(0, 8) || 'N/A'}`,
            institutionName: institutionName || `Institution ${appData.institutionId?.slice(0, 8) || 'N/A'}`
          };
        })
      );
      setApplications(applicationsData);

      // Calculate statistics
      const pendingVerifications = institutionsData.filter(inst => !inst.verified).length +
                                 companiesData.filter(comp => !comp.verified).length;

      // Calculate analytics
      const applicationsByStatus = applicationsData.reduce((acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      }, {});

      const usersByRole = usersData.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalUsers: usersData.length,
        totalInstitutions: institutionsData.length,
        totalCompanies: companiesData.length,
        totalCourses: coursesData.length,
        totalApplications: applicationsData.length,
        pendingVerifications: pendingVerifications
      });

      setAnalytics({
        applicationsByStatus,
        usersByRole,
        monthlyGrowth: calculateMonthlyGrowth(usersData)
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      alert('Error loading admin data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeListeners = () => {
    // Real-time listener for new institutions
    const institutionsUnsubscribe = onSnapshot(
      query(collection(db, 'institutions'), where('verified', '==', false)),
      (snapshot) => {
        const newInstitutions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInstitutions(prev => [...prev, ...newInstitutions]);
      }
    );

    return () => {
      institutionsUnsubscribe();
    };
  };

  const calculateMonthlyGrowth = (usersData) => {
    const monthlyCount = {};
    usersData.forEach(user => {
      const month = user.createdAt?.toDate().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyCount[month] = (monthlyCount[month] || 0) + 1;
    });
    return monthlyCount;
  };

  const handleVerifyInstitution = async (institutionId) => {
    try {
      setLoading(true);
      await verifyInstitution(institutionId);
      alert('Institution verified successfully!');
      loadAdminData();
    } catch (error) {
      alert('Verification failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCompany = async (companyId) => {
    try {
      setLoading(true);
      await updateDoc(doc(db, 'companies', companyId), {
        verified: true,
        status: 'active'
      });
      alert('Company verified successfully!');
      loadAdminData();
    } catch (error) {
      alert('Verification failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkVerify = async (type, ids) => {
    try {
      setLoading(true);
      const collectionName = type === 'institutions' ? 'institutions' : 'companies';
      
      const updatePromises = ids.map(id => 
        updateDoc(doc(db, collectionName, id), {
          verified: true,
          status: 'active'
        })
      );
      
      await Promise.all(updatePromises);
      alert(`${ids.length} ${type} verified successfully!`);
      setSelectedItems(prev => ({ ...prev, [type]: [] }));
      loadAdminData();
    } catch (error) {
      alert('Bulk verification failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId, userType) => {
    if (!window.confirm(`Are you sure you want to suspend this ${userType}?`)) {
      return;
    }

    try {
      setLoading(true);
      const collectionName = userType === 'institute' ? 'institutions' : 
                           userType === 'company' ? 'companies' : 'users';
      
      await updateDoc(doc(db, collectionName, userId), {
        status: 'suspended'
      });
      alert(`${userType} suspended successfully!`);
      loadAdminData();
    } catch (error) {
      alert('Suspension failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (userId, userType) => {
    try {
      setLoading(true);
      const collectionName = userType === 'institute' ? 'institutions' : 
                           userType === 'company' ? 'companies' : 'users';
      
      await updateDoc(doc(db, collectionName, userId), {
        status: 'active'
      });
      alert(`${userType} activated successfully!`);
      loadAdminData();
    } catch (error) {
      alert('Activation failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelection = (type, id) => {
    setSelectedItems(prev => {
      const currentSelection = prev[type];
      if (currentSelection.includes(id)) {
        return {
          ...prev,
          [type]: currentSelection.filter(itemId => itemId !== id)
        };
      } else {
        return {
          ...prev,
          [type]: [...currentSelection, id]
        };
      }
    });
  };

  const handleSelectAll = (type, items) => {
    const allIds = items.map(item => item.id);
    setSelectedItems(prev => ({
      ...prev,
      [type]: prev[type].length === allIds.length ? [] : allIds
    }));
  };

  const fixApplicationNames = async () => {
    try {
      setLoading(true);
      console.log('🛠️ Fixing application names in Firestore...');
      
      const updates = applications.map(async (application) => {
        if (!application.courseName || !application.studentName || !application.institutionName) {
          let studentName = application.studentName;
          let courseName = application.courseName;
          let institutionName = application.institutionName;
          
          // Fetch student name
          if (!studentName) {
            const studentDoc = await getDocument('users', application.studentId);
            if (studentDoc.exists()) {
              studentName = studentDoc.data().fullName || studentDoc.data().studentName || `Student ${application.studentId.slice(0, 8)}`;
            }
          }
          
          // Fetch course name
          if (!courseName) {
            const courseDoc = await getDocument('courses', application.courseId);
            if (courseDoc.exists()) {
              courseName = courseDoc.data().name;
            }
          }
          
          // Fetch institution name
          if (!institutionName) {
            const institutionDoc = await getDocument('institutions', application.institutionId);
            if (institutionDoc.exists()) {
              institutionName = institutionDoc.data().name;
            }
          }
          
          await updateDoc(doc(db, 'applications', application.id), {
            studentName: studentName || `Student ${application.studentId?.slice(0, 8) || 'N/A'}`,
            courseName: courseName || `Course ${application.courseId?.slice(0, 8) || 'N/A'}`,
            institutionName: institutionName || `Institution ${application.institutionId?.slice(0, 8) || 'N/A'}`
          });
        }
      });
      
      await Promise.all(updates);
      console.log('✅ All applications fixed in Firestore!');
      alert('Application names fixed in database! Refreshing data...');
      loadAdminData();
    } catch (error) {
      console.error('Error fixing applications:', error);
      alert('Error fixing applications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      alert('No data to export!');
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const csvData = data.map(row => 
      Object.values(row).map(field => 
        `"${field}"`
      ).join(',')
    ).join('\n');
    
    const csv = `${headers}\n${csvData}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('userRole');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const StatusBadge = ({ status, verified }) => {
    if (verified !== undefined) {
      return (
        <span className={`badge ${verified ? 'bg-success' : 'bg-warning'}`}>
          {verified ? 'Verified' : 'Pending'}
        </span>
      );
    }
    
    const statusColors = {
      active: 'success',
      suspended: 'danger',
      pending: 'warning'
    };
    
    return (
      <span className={`badge bg-${statusColors[status] || 'secondary'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  const ApplicationRow = ({ application }) => {
    return (
      <tr key={application.id}>
        <td>{application.id.slice(0, 8)}</td>
        <td>
          <strong>{application.studentName}</strong>
          {!application.studentName && (
            <div>
              <small className="text-muted">ID: {application.studentId?.slice(0, 8)}</small>
            </div>
          )}
        </td>
        <td>
          <strong>{application.courseName}</strong>
          {!application.courseName && (
            <div>
              <small className="text-muted">ID: {application.courseId}</small>
            </div>
          )}
        </td>
        <td>
          <strong>{application.institutionName}</strong>
          {!application.institutionName && (
            <div>
              <small className="text-muted">ID: {application.institutionId}</small>
            </div>
          )}
        </td>
        <td>
          <StatusBadge status={application.status} />
        </td>
        <td>{application.appliedAt?.toDate().toLocaleDateString()}</td>
      </tr>
    );
  };

  const SystemHealthCard = () => (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">System Health</h5>
        <div className="row">
          <div className="col-md-3">
            <div className={`alert alert-${systemHealth.database === 'healthy' ? 'success' : 'danger'}`}>
              <strong>Database:</strong> {systemHealth.database}
            </div>
          </div>
          <div className="col-md-3">
            <div className={`alert alert-${systemHealth.storage === 'healthy' ? 'success' : 'warning'}`}>
              <strong>Storage:</strong> {systemHealth.storage}
            </div>
          </div>
          <div className="col-md-3">
            <div className="alert alert-success">
              <strong>Auth:</strong> {systemHealth.authentication}
            </div>
          </div>
          <div className="col-md-3">
            <div className="alert alert-info">
              <strong>Last Backup:</strong><br/>
              {systemHealth.lastBackup.toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header with Logout Button */}
      <div className="row mb-4">
        <div className="col-10">
          <h2>Admin Dashboard</h2>
          <p>Platform Management Center</p>
        </div>
        <div className="col-2 text-end">
          <button 
            className="btn btn-outline-danger"
            onClick={handleLogout}
            title="Logout"
          >
            <i className="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav>
        <div className="nav nav-tabs" id="nav-tab" role="tablist">
          <button className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button className={`nav-link ${activeTab === 'institutions' ? 'active' : ''}`}
            onClick={() => setActiveTab('institutions')}>Institutions ({institutions.length})</button>
          <button className={`nav-link ${activeTab === 'companies' ? 'active' : ''}`}
            onClick={() => setActiveTab('companies')}>Companies ({companies.length})</button>
          <button className={`nav-link ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}>Courses ({courses.length})</button>
          <button className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}>Users ({users.length})</button>
          <button className={`nav-link ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}>Applications ({applications.length})</button>
          <button className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}>Reports</button>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="tab-content p-3 border border-top-0 rounded-bottom">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h4>Platform Overview</h4>
            
            <SystemHealthCard />
            
            <div className="row mt-4">
              <div className="col-md-2">
                <div className="card text-white bg-primary mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.totalUsers}</h5>
                    <p className="card-text">Total Users</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-white bg-success mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.totalInstitutions}</h5>
                    <p className="card-text">Institutions</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-white bg-info mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.totalCompanies}</h5>
                    <p className="card-text">Companies</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-white bg-warning mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.totalCourses}</h5>
                    <p className="card-text">Courses</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-white bg-secondary mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.totalApplications}</h5>
                    <p className="card-text">Applications</p>
                  </div>
                </div>
              </div>
              <div className="col-md-2">
                <div className="card text-white bg-danger mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.pendingVerifications}</h5>
                    <p className="card-text">Pending Verifications</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Section */}
            <div className="row mt-4">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Application Status Distribution</h5>
                    {Object.entries(analytics.applicationsByStatus).map(([status, count]) => (
                      <div key={status} className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-capitalize">{status}:</span>
                        <div className="d-flex align-items-center">
                          <strong className="me-2">{count}</strong>
                          <div className="progress" style={{ width: '100px', height: '10px' }}>
                            <div 
                              className="progress-bar" 
                              style={{ 
                                width: `${(count / stats.totalApplications) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">User Role Distribution</h5>
                    {Object.entries(analytics.usersByRole).map(([role, count]) => (
                      <div key={role} className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-capitalize">{role}:</span>
                        <div className="d-flex align-items-center">
                          <strong className="me-2">{count}</strong>
                          <div className="progress" style={{ width: '100px', height: '10px' }}>
                            <div 
                              className={`progress-bar bg-${role === 'admin' ? 'danger' : role === 'institute' ? 'info' : 'secondary'}`}
                              style={{ 
                                width: `${(count / stats.totalUsers) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="row mt-4">
              <div className="col-md-6">
                <h5>Pending Institution Verifications</h5>
                {institutions.filter(inst => !inst.verified).length === 0 ? (
                  <p>No pending institution verifications.</p>
                ) : (
                  <div className="list-group">
                    {institutions.filter(inst => !inst.verified).slice(0, 5).map(institution => (
                      <div key={institution.id} className="list-group-item">
                        <div className="d-flex w-100 justify-content-between">
                          <h6 className="mb-1">{institution.name}</h6>
                          <StatusBadge verified={institution.verified} />
                        </div>
                        <p className="mb-1">{institution.email}</p>
                        <small>Registered: {institution.createdAt?.toDate().toLocaleDateString()}</small>
                        <div className="mt-2">
                          <button 
                            className="btn btn-success btn-sm"
                            onClick={() => handleVerifyInstitution(institution.id)}
                          >
                            Verify
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-md-6">
                <h5>Recent Users</h5>
                {users.length === 0 ? (
                  <p>No users registered yet.</p>
                ) : (
                  <div className="list-group">
                    {users.slice(0, 5).map(user => (
                      <div key={user.id} className="list-group-item">
                        <div className="d-flex w-100 justify-content-between">
                          <h6 className="mb-1">
                            {user.fullName || user.studentName || user.email}
                            {!user.fullName && !user.studentName && (
                              <small className="text-muted d-block">({user.email})</small>
                            )}
                          </h6>
                          <span className={`badge bg-${user.role === 'admin' ? 'danger' : user.role === 'institute' ? 'info' : 'secondary'}`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="mb-1">Role: {user.role}</p>
                        <small>Joined: {user.createdAt?.toDate().toLocaleDateString()}</small>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Institutions Tab */}
        {activeTab === 'institutions' && (
          <div>
            <h4>Manage Institutions</h4>
            <div className="mb-3 d-flex gap-2">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search institutions..." 
              />
              {selectedItems.institutions.length > 0 && (
                <button 
                  className="btn btn-success"
                  onClick={() => handleBulkVerify('institutions', selectedItems.institutions)}
                  disabled={loading}
                >
                  Bulk Verify ({selectedItems.institutions.length})
                </button>
              )}
            </div>
            
            {institutions.length === 0 ? (
              <div className="alert alert-info">
                No institutions registered yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>
                        <input 
                          type="checkbox"
                          checked={selectedItems.institutions.length === institutions.length}
                          onChange={() => handleSelectAll('institutions', institutions)}
                        />
                      </th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Verification</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {institutions.map(institution => (
                      <tr key={institution.id}>
                        <td>
                          <input 
                            type="checkbox"
                            checked={selectedItems.institutions.includes(institution.id)}
                            onChange={() => handleToggleSelection('institutions', institution.id)}
                          />
                        </td>
                        <td>{institution.name}</td>
                        <td>{institution.email}</td>
                        <td>
                          <StatusBadge status={institution.status} />
                        </td>
                        <td>
                          <StatusBadge verified={institution.verified} />
                        </td>
                        <td>{institution.createdAt?.toDate().toLocaleDateString()}</td>
                        <td>
                          {!institution.verified && (
                            <button 
                              className="btn btn-success btn-sm me-1"
                              onClick={() => handleVerifyInstitution(institution.id)}
                              disabled={loading}
                            >
                              Verify
                            </button>
                          )}
                          {institution.status === 'active' ? (
                            <button 
                              className="btn btn-warning btn-sm"
                              onClick={() => handleSuspendUser(institution.id, 'institute')}
                              disabled={loading}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button 
                              className="btn btn-info btn-sm"
                              onClick={() => handleActivateUser(institution.id, 'institute')}
                              disabled={loading}
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <div>
            <h4>Manage Companies</h4>
            <div className="mb-3 d-flex gap-2">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search companies..." 
              />
              {selectedItems.companies.length > 0 && (
                <button 
                  className="btn btn-success"
                  onClick={() => handleBulkVerify('companies', selectedItems.companies)}
                  disabled={loading}
                >
                  Bulk Verify ({selectedItems.companies.length})
                </button>
              )}
            </div>
            
            {companies.length === 0 ? (
              <div className="alert alert-info">
                No companies registered yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>
                        <input 
                          type="checkbox"
                          checked={selectedItems.companies.length === companies.length}
                          onChange={() => handleSelectAll('companies', companies)}
                        />
                      </th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Verification</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map(company => (
                      <tr key={company.id}>
                        <td>
                          <input 
                            type="checkbox"
                            checked={selectedItems.companies.includes(company.id)}
                            onChange={() => handleToggleSelection('companies', company.id)}
                          />
                        </td>
                        <td>{company.name}</td>
                        <td>{company.email}</td>
                        <td>
                          <StatusBadge status={company.status} />
                        </td>
                        <td>
                          <StatusBadge verified={company.verified} />
                        </td>
                        <td>{company.createdAt?.toDate().toLocaleDateString()}</td>
                        <td>
                          {!company.verified && (
                            <button 
                              className="btn btn-success btn-sm me-1"
                              onClick={() => handleVerifyCompany(company.id)}
                              disabled={loading}
                            >
                              Verify
                            </button>
                          )}
                          {company.status === 'active' ? (
                            <button 
                              className="btn btn-warning btn-sm"
                              onClick={() => handleSuspendUser(company.id, 'company')}
                              disabled={loading}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button 
                              className="btn btn-info btn-sm"
                              onClick={() => handleActivateUser(company.id, 'company')}
                              disabled={loading}
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div>
            <h4>Manage Courses</h4>
            <div className="mb-3 d-flex gap-2">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search courses..." 
              />
              <button className="btn btn-primary">Add Course</button>
            </div>
            
            {courses.length === 0 ? (
              <div className="alert alert-info">No courses available.</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Course Name</th>
                      <th>Institution</th>
                      <th>Duration</th>
                      <th>Seats</th>
                      <th>Requirements</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(course => (
                      <tr key={course.id}>
                        <td>{course.name}</td>
                        <td>{course.institutionName}</td>
                        <td>{course.duration}</td>
                        <td>{course.seatsAvailable}</td>
                        <td>
                          <small>{course.requirements?.substring(0, 50)}...</small>
                        </td>
                        <td>
                          <StatusBadge status={course.status} />
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary me-1">
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <h4>Manage Users</h4>
            <div className="mb-3">
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search users..." 
              />
            </div>
            
            {users.length === 0 ? (
              <div className="alert alert-info">
                No users registered yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.fullName || user.studentName || 'No Name'}</strong>
                        </td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`badge bg-${user.role === 'admin' ? 'danger' : user.role === 'institute' ? 'info' : 'secondary'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <StatusBadge status={user.status} />
                        </td>
                        <td>{user.createdAt?.toDate().toLocaleDateString()}</td>
                        <td>
                          {user.status === 'active' ? (
                            <button 
                              className="btn btn-warning btn-sm"
                              onClick={() => handleSuspendUser(user.id, 'user')}
                              disabled={loading}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button 
                              className="btn btn-info btn-sm"
                              onClick={() => handleActivateUser(user.id, 'user')}
                              disabled={loading}
                            >
                              Activate
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div>
            <h4>All Applications</h4>
            
            {applications.some(app => !app.courseName || !app.studentName || !app.institutionName) && (
              <div className="alert alert-warning mb-3">
                <p>Some applications are showing IDs instead of names.</p>
                <button 
                  className="btn btn-info btn-sm"
                  onClick={fixApplicationNames}
                  disabled={loading}
                >
                  {loading ? 'Fixing...' : 'Fix Application Names in Database'}
                </button>
              </div>
            )}
            
            {applications.length === 0 ? (
              <div className="alert alert-info">
                No applications submitted yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Application ID</th>
                      <th>Student Name</th>
                      <th>Course Name</th>
                      <th>Institution Name</th>
                      <th>Status</th>
                      <th>Applied Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(application => (
                      <ApplicationRow 
                        key={application.id} 
                        application={application}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div>
            <h4>System Reports & Analytics</h4>
            <div className="row">
              <div className="col-md-8">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Platform Statistics</h5>
                    <div className="row">
                      <div className="col-md-6">
                        <ul className="list-group list-group-flush">
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Total Users:</span>
                            <strong>{stats.totalUsers}</strong>
                          </li>
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Students:</span>
                            <strong>{users.filter(u => u.role === 'student').length}</strong>
                          </li>
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Institutions:</span>
                            <strong>{stats.totalInstitutions}</strong>
                          </li>
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Companies:</span>
                            <strong>{stats.totalCompanies}</strong>
                          </li>
                        </ul>
                      </div>
                      <div className="col-md-6">
                        <ul className="list-group list-group-flush">
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Total Courses:</span>
                            <strong>{stats.totalCourses}</strong>
                          </li>
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Total Applications:</span>
                            <strong>{stats.totalApplications}</strong>
                          </li>
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Pending Verifications:</span>
                            <strong>{stats.pendingVerifications}</strong>
                          </li>
                          <li className="list-group-item d-flex justify-content-between">
                            <span>Active Users:</span>
                            <strong>{users.filter(u => u.status === 'active').length}</strong>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Quick Actions</h5>
                    <div className="d-grid gap-2">
                      <button 
                        className="btn btn-outline-primary"
                        onClick={() => exportToCSV(users, 'users-report')}
                      >
                        Export Users Data
                      </button>
                      <button 
                        className="btn btn-outline-success"
                        onClick={() => exportToCSV(applications, 'applications-report')}
                      >
                        Export Applications Data
                      </button>
                      <button 
                        className="btn btn-outline-info"
                        onClick={() => exportToCSV(institutions, 'institutions-report')}
                      >
                        Export Institutions Data
                      </button>
                      <button 
                        className="btn btn-outline-warning"
                        onClick={() => exportToCSV(companies, 'companies-report')}
                      >
                        Export Companies Data
                      </button>
                      <button 
                        className="btn btn-outline-info"
                        onClick={fixApplicationNames}
                        disabled={loading}
                      >
                        {loading ? 'Fixing...' : 'Fix Application Names'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Charts Section */}
            <div className="row mt-4">
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">Application Status Distribution</h5>
                    {Object.entries(analytics.applicationsByStatus).map(([status, count]) => (
                      <div key={status} className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-capitalize">{status}:</span>
                        <div className="d-flex align-items-center">
                          <strong className="me-2">{count}</strong>
                          <div className="progress" style={{ width: '150px', height: '20px' }}>
                            <div 
                              className={`progress-bar bg-${status === 'admitted' ? 'success' : status === 'pending' ? 'warning' : 'secondary'}`}
                              style={{ 
                                width: `${(count / stats.totalApplications) * 100}%` 
                              }}
                            >
                              {Math.round((count / stats.totalApplications) * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">User Growth Trend</h5>
                    {Object.entries(analytics.monthlyGrowth).map(([month, count]) => (
                      <div key={month} className="d-flex justify-content-between align-items-center mb-2">
                        <span>{month}:</span>
                        <div className="d-flex align-items-center">
                          <strong className="me-2">{count}</strong>
                          <div className="progress" style={{ width: '150px', height: '20px' }}>
                            <div 
                              className="progress-bar bg-info"
                              style={{ 
                                width: `${(count / stats.totalUsers) * 100}%` 
                              }}
                            >
                              {Math.round((count / stats.totalUsers) * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}