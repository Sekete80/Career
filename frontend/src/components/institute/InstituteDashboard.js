import React, { useState, useEffect } from 'react';
import { 
  getInstitutionApplications,
  addCourse,
  auth,
  db,
  logoutUser,
  getDocument
} from '../../services/api';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';

export default function InstituteDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [applications, setApplications] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [institute, setInstitute] = useState(null);
  
  const [newCourse, setNewCourse] = useState({
    name: '',
    description: '',
    requirements: '',
    duration: '',
    seatsAvailable: 0,
    faculty: ''
  });

  const instituteId = auth.currentUser?.uid;

  useEffect(() => {
    if (instituteId) {
      loadInstituteData();
    }
  }, [instituteId]);

  const loadInstituteData = async () => {
    setLoading(true);
    try {
      // Load institute profile
      const instituteDoc = await getDocs(query(collection(db, 'institutions'), where('userId', '==', instituteId)));
      if (!instituteDoc.empty) {
        setInstitute(instituteDoc.docs[0].data());
      }

      // Load applications for this institute
      const apps = await getInstitutionApplications(instituteId);
      
      // Enhance applications with student and course names
      const enhancedApps = await Promise.all(
        apps.map(async (app) => {
          let studentName = app.studentName;
          let courseName = app.courseName;
          
          // Fetch student name if not available
          if (!studentName) {
            try {
              const studentDoc = await getDocument('users', app.studentId);
              if (studentDoc.exists()) {
                studentName = studentDoc.data().fullName || studentDoc.data().studentName || `Student ${app.studentId.slice(0, 8)}`;
              }
            } catch (error) {
              console.error('Error fetching student name:', error);
            }
          }
          
          // Fetch course name if not available
          if (!courseName) {
            try {
              const courseDoc = await getDocument('courses', app.courseId);
              if (courseDoc.exists()) {
                courseName = courseDoc.data().name;
              }
            } catch (error) {
              console.error('Error fetching course name:', error);
            }
          }
          
          return {
            ...app,
            studentName: studentName || `Student ${app.studentId.slice(0, 8)}`,
            courseName: courseName || `Course ${app.courseId.slice(0, 8)}`
          };
        })
      );
      
      setApplications(enhancedApps);

      // Load institute's courses
      const coursesQuery = query(
        collection(db, 'courses'),
        where('institutionId', '==', instituteId)
      );
      const coursesSnapshot = await getDocs(coursesQuery);
      const instituteCourses = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(instituteCourses);

    } catch (error) {
      console.error('Error loading institute data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!instituteId) return;

    try {
      setLoading(true);
      await addCourse(instituteId, {
        ...newCourse,
        institutionName: institute?.name || 'Our Institution',
        status: 'active'
      });
      
      alert('Course added successfully!');
      setNewCourse({
        name: '', description: '', requirements: '', duration: '', seatsAvailable: 0, faculty: ''
      });
      loadInstituteData(); // Refresh courses list
    } catch (error) {
      alert('Failed to add course: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (applicationId, action) => {
    try {
      setLoading(true);
      const applicationRef = doc(db, 'applications', applicationId);
      
      if (action === 'admit') {
        await updateDoc(applicationRef, {
          status: 'admitted',
          processedAt: new Date(),
          processedBy: instituteId
        });
        alert('Student admitted successfully!');
      } else if (action === 'reject') {
        await updateDoc(applicationRef, {
          status: 'rejected',
          processedAt: new Date(),
          processedBy: instituteId
        });
        alert('Application rejected.');
      } else if (action === 'waitlisted') {
        await updateDoc(applicationRef, {
          status: 'waitlisted',
          processedAt: new Date()
        });
        alert('Student moved to waiting list.');
      }
      
      loadInstituteData(); // Refresh applications
    } catch (error) {
      alert('Action failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to fix existing applications with names
  const fixApplicationNames = async () => {
    try {
      setLoading(true);
      console.log('🛠️ Fixing application names...');
      
      const updates = applications.map(async (application) => {
        // Only update if names are missing in Firestore
        if (!application.courseName || !application.studentName) {
          let studentName = application.studentName;
          let courseName = application.courseName;
          
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
          
          // Update the application in Firestore
          await updateDoc(doc(db, 'applications', application.id), {
            studentName,
            courseName
          });
        }
      });
      
      await Promise.all(updates);
      console.log('✅ All applications fixed!');
      alert('Application names fixed! Refreshing data...');
      loadInstituteData();
    } catch (error) {
      console.error('Error fixing applications:', error);
      alert('Error fixing applications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('userRole');
      window.location.reload(); // Refresh to show login page
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const ApplicationStatusBadge = ({ status }) => {
    const statusColors = {
      pending: 'warning',
      admitted: 'success',
      rejected: 'danger',
      waitlisted: 'info'
    };
    
    return (
      <span className={`badge bg-${statusColors[status] || 'secondary'}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  // Application Row Component with proper names
  const ApplicationRow = ({ application, onAction }) => {
    return (
      <tr key={application.id}>
        <td>{application.id.slice(0, 8)}</td>
        <td>
          <strong>{application.courseName}</strong>
          {!application.courseName && (
            <div>
              <small className="text-muted">ID: {application.courseId}</small>
            </div>
          )}
        </td>
        <td>
          <strong>{application.studentName}</strong>
          {!application.studentName && (
            <div>
              <small className="text-muted">ID: {application.studentId?.slice(0, 8)}</small>
            </div>
          )}
        </td>
        <td>{application.appliedAt?.toDate().toLocaleDateString()}</td>
        <td>
          <ApplicationStatusBadge status={application.status} />
        </td>
        <td>
          {application.status === 'pending' && (
            <>
              <button 
                className="btn btn-success btn-sm me-1"
                onClick={() => onAction(application.id, 'admit')}
                disabled={loading}
              >
                Admit
              </button>
              <button 
                className="btn btn-warning btn-sm me-1"
                onClick={() => onAction(application.id, 'waitlisted')}
                disabled={loading}
              >
                Waitlist
              </button>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => onAction(application.id, 'reject')}
                disabled={loading}
              >
                Reject
              </button>
            </>
          )}
          {application.status !== 'pending' && (
            <span className="text-muted">Processed</span>
          )}
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading institute dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header with Logout Button */}
      <div className="row mb-4">
        <div className="col-10">
          <h2>Institute Dashboard</h2>
          <p>Welcome, {institute?.name || 'Institution'}</p>
          <p className={`badge ${institute?.verified ? 'bg-success' : 'bg-warning'}`}>
            {institute?.verified ? 'Verified' : 'Pending Verification'}
          </p>
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
          <button className={`nav-link ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}>Applications ({applications.length})</button>
          <button className={`nav-link ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}>Manage Courses ({courses.length})</button>
          <button className={`nav-link ${activeTab === 'add-course' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-course')}>Add New Course</button>
          <button className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}>Institute Profile</button>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="tab-content p-3 border border-top-0 rounded-bottom">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h4>Quick Overview</h4>
            <div className="row">
              <div className="col-md-3">
                <div className="card text-white bg-primary mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{applications.length}</h5>
                    <p className="card-text">Total Applications</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-success mb-3">
                  <div className="card-body">
                    <h5 className="card-title">
                      {applications.filter(app => app.status === 'admitted').length}
                    </h5>
                    <p className="card-text">Admitted Students</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-warning mb-3">
                  <div className="card-body">
                    <h5 className="card-title">
                      {applications.filter(app => app.status === 'pending').length}
                    </h5>
                    <p className="card-text">Pending Applications</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-info mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{courses.length}</h5>
                    <p className="card-text">Active Courses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Applications */}
            <h5>Recent Applications</h5>
            {applications.length === 0 ? (
              <p>No applications yet.</p>
            ) : (
              <div className="list-group">
                {applications.slice(0, 5).map(application => (
                  <div key={application.id} className="list-group-item">
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">
                        {application.studentName || `Student ${application.studentId?.slice(0, 8)}`}
                      </h6>
                      <ApplicationStatusBadge status={application.status} />
                    </div>
                    <p className="mb-1">
                      Applied for: {application.courseName || `Course ${application.courseId}`}
                    </p>
                    <small>Applied: {application.appliedAt?.toDate().toLocaleDateString()}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applications Tab - FIXED WITH NAMES */}
        {activeTab === 'applications' && (
          <div>
            <h4>Student Applications</h4>
            
            {/* Fix Applications Button - Show if some applications don't have names */}
            {applications.some(app => !app.courseName || !app.studentName) && (
              <div className="alert alert-warning mb-3">
                <p>Some applications are showing IDs instead of names.</p>
                <button 
                  className="btn btn-info btn-sm"
                  onClick={fixApplicationNames}
                  disabled={loading}
                >
                  {loading ? 'Fixing...' : 'Fix Application Names'}
                </button>
              </div>
            )}
            
            {applications.length === 0 ? (
              <div className="alert alert-info">
                No student applications received yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Application ID</th>
                      <th>Course Name</th>
                      <th>Student Name</th>
                      <th>Applied Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map(application => (
                      <ApplicationRow 
                        key={application.id} 
                        application={application}
                        onAction={handleApplicationAction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Manage Courses Tab */}
        {activeTab === 'courses' && (
          <div>
            <h4>Manage Courses</h4>
            {courses.length === 0 ? (
              <div className="alert alert-warning">
                No courses added yet. <span className="btn btn-link p-0" onClick={() => setActiveTab('add-course')}>Add your first course</span>
              </div>
            ) : (
              <div className="row">
                {courses.map(course => (
                  <div key={course.id} className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h5 className="card-title">{course.name}</h5>
                        <p className="card-text">{course.description}</p>
                        <p><strong>Requirements:</strong> {course.requirements}</p>
                        <p><strong>Duration:</strong> {course.duration}</p>
                        <p><strong>Seats Available:</strong> {course.seatsAvailable}</p>
                        <p><strong>Applications Received:</strong> {
                          applications.filter(app => app.courseId === course.id).length
                        }</p>
                        <p><strong>Status:</strong> 
                          <span className={`badge ${course.status === 'active' ? 'bg-success' : 'bg-secondary'} ms-1`}>
                            {course.status}
                          </span>
                        </p>
                        <button className="btn btn-outline-primary btn-sm me-1">
                          Edit
                        </button>
                        <button className="btn btn-outline-danger btn-sm">
                          Deactivate
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Course Tab */}
        {activeTab === 'add-course' && (
          <div>
            <h4>Add New Course</h4>
            <div className="card">
              <div className="card-body">
                <form onSubmit={handleAddCourse}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Course Name *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCourse.name}
                          onChange={(e) => setNewCourse({...newCourse, name: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Faculty/Department</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newCourse.faculty}
                          onChange={(e) => setNewCourse({...newCourse, faculty: e.target.value})}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Duration *</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., 3 years, 4 semesters"
                          value={newCourse.duration}
                          onChange={(e) => setNewCourse({...newCourse, duration: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Description *</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          value={newCourse.description}
                          onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Requirements *</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="e.g., High School Diploma with Mathematics and Science"
                          value={newCourse.requirements}
                          onChange={(e) => setNewCourse({...newCourse, requirements: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Seats Available *</label>
                        <input
                          type="number"
                          className="form-control"
                          value={newCourse.seatsAvailable}
                          onChange={(e) => setNewCourse({...newCourse, seatsAvailable: parseInt(e.target.value)})}
                          required
                          min="1"
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding Course...' : 'Add Course'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <h4>Institute Profile</h4>
            <div className="card">
              <div className="card-body">
                <h5>Institute Information</h5>
                <p><strong>Name:</strong> {institute?.name || 'Not set'}</p>
                <p><strong>Email:</strong> {auth.currentUser?.email}</p>
                <p><strong>Address:</strong> {institute?.address || 'Not provided'}</p>
                <p><strong>Total Courses:</strong> {courses.length}</p>
                <p><strong>Total Applications:</strong> {applications.length}</p>
                <p><strong>Status:</strong> 
                  <span className={`badge ${institute?.verified ? 'bg-success' : 'bg-warning'} ms-1`}>
                    {institute?.verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </p>
                
                <div className="mt-3">
                  <button className="btn btn-outline-primary me-2">
                    Edit Profile
                  </button>
                  <button 
                    className="btn btn-outline-info"
                    onClick={fixApplicationNames}
                    disabled={loading}
                  >
                    Fix Application Names
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}