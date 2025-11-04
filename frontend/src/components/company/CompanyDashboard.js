import React, { useState, useEffect } from 'react';
import { 
  auth,
  db,
  logoutUser,
  getDocument
} from '../../services/api';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc
} from 'firebase/firestore';

export default function CompanyDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);
  const [jobPostings, setJobPostings] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [qualifiedCandidates, setQualifiedCandidates] = useState([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalApplications: 0,
    shortlisted: 0,
    interviews: 0
  });
  
  const [newJob, setNewJob] = useState({
    title: '',
    description: '',
    requirements: '',
    qualifications: '',
    location: '',
    salary: '',
    jobType: 'full-time',
    deadline: '',
    status: 'active'
  });

  const companyId = auth.currentUser?.uid;

  useEffect(() => {
    if (companyId) {
      loadCompanyData();
    }
  }, [companyId]);

  // Enhanced data loading with student user information
  const loadCompanyData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading company data with student information...');
      
      // Load company profile
      const allCompaniesSnapshot = await getDocs(collection(db, 'companies'));
      const companyData = allCompaniesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .find(comp => comp.userId === companyId);
      setCompany(companyData);

      // Load ALL job postings and filter manually
      const allJobsSnapshot = await getDocs(collection(db, 'jobPostings'));
      let jobsData = allJobsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(job => job.companyId === companyId)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate() || new Date(0);
          const dateB = b.createdAt?.toDate() || new Date(0);
          return dateB - dateA;
        });
      setJobPostings(jobsData);

      // Load ALL job applications and filter manually - WITH ENHANCED STUDENT DATA
      const allApplicationsSnapshot = await getDocs(collection(db, 'jobApplications'));
      let applicantsData = await Promise.all(
        allApplicationsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(app => app.companyId === companyId)
          .map(async (appData) => {
            let studentProfile = null;
            let studentUser = null;
            
            try {
              // Get student profile for academic information
              const profileDoc = await getDocument('studentProfiles', appData.studentId);
              if (profileDoc.exists()) {
                studentProfile = profileDoc.data();
              }
              
              // Get student user data for name and email
              const userDoc = await getDocument('users', appData.studentId);
              if (userDoc.exists()) {
                studentUser = userDoc.data();
              }
            } catch (error) {
              console.error('Error fetching student data:', error);
            }
            
            return {
              ...appData,
              studentProfile: studentProfile,
              studentUser: studentUser // This contains name and email
            };
          })
      );
      
      // Manual sorting by appliedAt
      applicantsData = applicantsData.sort((a, b) => {
        const dateA = a.appliedAt?.toDate() || new Date(0);
        const dateB = b.appliedAt?.toDate() || new Date(0);
        return dateB - dateA;
      });
      
      setApplicants(applicantsData);

      // Calculate statistics
      setStats({
        totalJobs: jobsData.length,
        totalApplications: applicantsData.length,
        shortlisted: applicantsData.filter(app => app.status === 'shortlisted').length,
        interviews: applicantsData.filter(app => app.status === 'interview_scheduled').length
      });

      console.log('✅ Company data loaded with student information!');

    } catch (error) {
      console.error('❌ Error loading company data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePostJob = async (e) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      setLoading(true);
      const jobData = {
        ...newJob,
        companyId: companyId,
        companyName: company?.name || 'Our Company',
        createdAt: new Date(),
        deadline: new Date(newJob.deadline),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'jobPostings'), jobData);
      
      alert('Job posted successfully!');
      setNewJob({
        title: '', description: '', requirements: '', qualifications: '', 
        location: '', salary: '', jobType: 'full-time', deadline: '', status: 'active'
      });
      loadCompanyData(); // Refresh job postings
    } catch (error) {
      alert('Failed to post job: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // In CompanyDashboard.js - Update the handleApplicationAction function
const handleApplicationAction = async (applicationId, action) => {
  try {
    setLoading(true);
    const applicationRef = doc(db, 'jobApplications', applicationId);
    
    if (action === 'shortlist') {
      await updateDoc(applicationRef, {
        status: 'shortlisted',
        updatedAt: new Date()
      });
      alert('Applicant shortlisted!');
    } else if (action === 'reject') {
      await updateDoc(applicationRef, {
        status: 'rejected',
        updatedAt: new Date()
      });
      alert('Application rejected.');
    } else if (action === 'schedule') {
      const interviewDate = prompt('Enter interview date and time (YYYY-MM-DD HH:MM):');
      const interviewLocation = prompt('Enter interview location (or type "Online" for virtual interview):');
      
      if (interviewDate && interviewLocation) {
        await updateDoc(applicationRef, {
          status: 'interview_scheduled',
          interviewDate: new Date(interviewDate),
          interviewLocation: interviewLocation,
          scheduledAt: new Date(),
          updatedAt: new Date()
        });
        alert(`Interview scheduled!\nDate: ${interviewDate}\nLocation: ${interviewLocation}`);
      }
    } else if (action === 'hire') {
      await updateDoc(applicationRef, {
        status: 'hired',
        updatedAt: new Date()
      });
      alert('Candidate hired!');
    }
    
    loadCompanyData(); // Refresh applications
  } catch (error) {
    alert('Action failed: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  // Enhanced qualified applicants matching algorithm
  const findQualifiedApplicants = async (jobId) => {
    try {
      setLoading(true);
      
      // Get the specific job details
      const job = jobPostings.find(j => j.id === jobId);
      if (!job) {
        alert('Job not found!');
        return;
      }

      // Get all student profiles
      const allProfilesSnapshot = await getDocs(collection(db, 'studentProfiles'));
      const allStudents = allProfilesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const qualified = [];
      
      allStudents.forEach(student => {
        const score = calculateMatchScore(student, job);
        
        if (score >= 60) { // Only show candidates with 60%+ match
          qualified.push({
            ...student,
            matchScore: score,
            strengths: getCandidateStrengths(student, job)
          });
        }
      });
      
      // Sort by match score (highest first)
      qualified.sort((a, b) => b.matchScore - a.matchScore);
      setQualifiedCandidates(qualified);
      
      alert(`Found ${qualified.length} qualified candidates for "${job.title}"`);
      
    } catch (error) {
      console.error('Error finding qualified applicants:', error);
      alert('Error finding qualified applicants: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate match score between student and job
  const calculateMatchScore = (student, job) => {
    let score = 0;
    const maxScore = 100;

    // Academic performance (30%)
    if (student.academicRecords && student.academicRecords.length > 0) {
      const latestRecord = student.academicRecords[student.academicRecords.length - 1];
      if (latestRecord.gpa) {
        const gpa = parseFloat(latestRecord.gpa);
        if (gpa >= 3.5) score += 30;
        else if (gpa >= 3.0) score += 25;
        else if (gpa >= 2.5) score += 20;
        else score += 10;
      } else {
        score += 15; // Default score if no GPA
      }
    }

    // Certificates matching (25%)
    if (student.certificates && student.certificates.length > 0) {
      const certCount = student.certificates.length;
      score += Math.min(certCount * 5, 25);
    }

    // Work experience (25%)
    if (student.workExperience && student.workExperience.length > 0) {
      const expCount = student.workExperience.length;
      score += Math.min(expCount * 8, 25);
    }

    // Skills matching (20%)
    if (student.skills && student.skills.length > 0) {
      const jobRequirements = job.requirements.toLowerCase();
      const matchingSkills = student.skills.filter(skill => 
        jobRequirements.includes(skill.toLowerCase())
      );
      score += Math.min(matchingSkills.length * 4, 20);
    }

    return Math.min(score, maxScore);
  };

  // Get candidate strengths for display
  const getCandidateStrengths = (student, job) => {
    const strengths = [];
    
    if (student.academicRecords && student.academicRecords.length > 0) {
      const latestRecord = student.academicRecords[student.academicRecords.length - 1];
      if (latestRecord.gpa && parseFloat(latestRecord.gpa) >= 3.0) {
        strengths.push(`Strong academic record (GPA: ${latestRecord.gpa})`);
      }
    }
    
    if (student.certificates && student.certificates.length > 0) {
      strengths.push(`${student.certificates.length} professional certificates`);
    }
    
    if (student.workExperience && student.workExperience.length > 0) {
      strengths.push(`${student.workExperience.length} work experiences`);
    }
    
    if (student.skills && student.skills.length > 0) {
      const jobRequirements = job.requirements.toLowerCase();
      const relevantSkills = student.skills.filter(skill => 
        jobRequirements.includes(skill.toLowerCase())
      );
      if (relevantSkills.length > 0) {
        strengths.push(`Relevant skills: ${relevantSkills.slice(0, 3).join(', ')}`);
      }
    }
    
    return strengths.slice(0, 3); // Return top 3 strengths
  };

  const handleContactCandidate = (studentId, email) => {
    if (email && email !== 'No email available') {
      alert(`Contact candidate at: ${email}\n\nStudent ID: ${studentId}`);
    } else {
      alert(`Contact feature for student: ${studentId}\n(Email not available)`);
    }
  };

  const handleUpdateProfile = async () => {
    const newIndustry = prompt('Enter your industry:', company?.industry || '');
    const newAddress = prompt('Enter your address:', company?.address || '');
    const newContactPerson = prompt('Enter contact person:', company?.contactPerson || '');
    const newPhone = prompt('Enter phone number:', company?.phone || '');

    if (newIndustry !== null) {
      try {
        setLoading(true);
        await updateDoc(doc(db, 'companies', companyId), {
          industry: newIndustry,
          address: newAddress,
          contactPerson: newContactPerson,
          phone: newPhone,
          updatedAt: new Date()
        });
        alert('Profile updated successfully!');
        loadCompanyData();
      } catch (error) {
        alert('Error updating profile: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  // ADD THE MISSING handleLogout FUNCTION
  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('userRole');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const StatusBadge = ({ status }) => {
    const statusColors = {
      active: 'success',
      inactive: 'secondary',
      shortlisted: 'warning',
      rejected: 'danger',
      interview_scheduled: 'info',
      hired: 'success',
      pending: 'primary'
    };
    
    return (
      <span className={`badge bg-${statusColors[status] || 'secondary'}`}>
        {status?.replace('_', ' ').charAt(0).toUpperCase() + status?.replace('_', ' ').slice(1)}
      </span>
    );
  };

  // Update the ApplicationRow component to show actual names and emails
  const ApplicationRow = ({ application }) => {
    const studentProfile = application.studentProfile;
    const studentUser = application.studentUser;
    
    // Get student name - try different possible fields
    const studentName = studentUser?.fullName || 
                       studentUser?.studentName || 
                       studentUser?.name || 
                       `Student ${application.studentId?.slice(0, 8)}`;
    
    const studentEmail = studentUser?.email || 'No email available';

    return (
      <tr key={application.id}>
        <td>
          <div>
            <strong>{studentName}</strong>
            <div>
              <small className="text-muted">{studentEmail}</small>
            </div>
            {studentProfile && (
              <div>
                <small className="text-muted">
                  {studentProfile.academicRecords?.length > 0 && 
                    `GPA: ${studentProfile.academicRecords[studentProfile.academicRecords.length - 1].gpa || 'N/A'}`
                  }
                </small>
              </div>
            )}
          </div>
        </td>
        <td>{application.jobTitle}</td>
        <td>
          {studentProfile ? (
            <div>
              <div><strong>Certificates:</strong> {studentProfile.certificates?.length || 0}</div>
              <div><strong>Experience:</strong> {studentProfile.workExperience?.length || 0} roles</div>
              <div><strong>Skills:</strong> {studentProfile.skills?.length || 0}</div>
            </div>
          ) : (
            'Profile not available'
          )}
        </td>
        <td>{application.appliedAt?.toDate().toLocaleDateString()}</td>
        <td>
          <StatusBadge status={application.status} />
        </td>
        <td>
          {application.status === 'pending' && (
            <>
              <button 
                className="btn btn-success btn-sm me-1"
                onClick={() => handleApplicationAction(application.id, 'shortlist')}
                disabled={loading}
              >
                Shortlist
              </button>
              <button 
                className="btn btn-danger btn-sm"
                onClick={() => handleApplicationAction(application.id, 'reject')}
                disabled={loading}
              >
                Reject
              </button>
            </>
          )}
          {application.status === 'shortlisted' && (
            <>
              <button 
                className="btn btn-info btn-sm me-1"
                onClick={() => handleApplicationAction(application.id, 'schedule')}
                disabled={loading}
              >
                Schedule Interview
              </button>
              <button 
                className="btn btn-success btn-sm"
                onClick={() => handleApplicationAction(application.id, 'hire')}
                disabled={loading}
              >
                Hire
              </button>
            </>
          )}
          {application.status === 'interview_scheduled' && (
            <button 
              className="btn btn-success btn-sm"
              onClick={() => handleApplicationAction(application.id, 'hire')}
              disabled={loading}
            >
              Mark as Hired
            </button>
          )}
          {application.status === 'hired' && (
            <span className="text-success">✓ Hired</span>
          )}
          {application.status === 'rejected' && (
            <span className="text-danger">✗ Rejected</span>
          )}
        </td>
      </tr>
    );
  };

  // Update the dashboard recent applications to show names and emails
  const RecentApplicationItem = ({ application }) => {
    const studentUser = application.studentUser;
    
    const studentName = studentUser?.fullName || 
                       studentUser?.studentName || 
                       studentUser?.name || 
                       `Student ${application.studentId?.slice(0, 8)}`;
    
    const studentEmail = studentUser?.email || 'No email available';

    return (
      <div key={application.id} className="list-group-item">
        <div className="d-flex w-100 justify-content-between">
          <h6 className="mb-1">
            {studentName} - {application.jobTitle}
          </h6>
          <StatusBadge status={application.status} />
        </div>
        <p className="mb-1">Email: {studentEmail}</p>
        {application.studentProfile && (
          <div className="small text-muted">
            {application.studentProfile.academicRecords?.length > 0 && 
              `GPA: ${application.studentProfile.academicRecords[application.studentProfile.academicRecords.length - 1].gpa || 'N/A'} | `
            }
            Certificates: {application.studentProfile.certificates?.length || 0} | 
            Experience: {application.studentProfile.workExperience?.length || 0}
          </div>
        )}
        <small>Applied: {application.appliedAt?.toDate().toLocaleDateString()}</small>
      </div>
    );
  };

  // Update the qualified candidates to show names and emails
  const QualifiedCandidateCard = ({ candidate }) => {
    // For qualified candidates, we need to fetch user data separately
    const [candidateUser, setCandidateUser] = useState(null);
    
    useEffect(() => {
      const fetchCandidateUser = async () => {
        try {
          const userDoc = await getDocument('users', candidate.id);
          if (userDoc.exists()) {
            setCandidateUser(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching candidate user data:', error);
        }
      };
      
      fetchCandidateUser();
    }, [candidate.id]);

    const candidateName = candidateUser?.fullName || 
                         candidateUser?.studentName || 
                         candidateUser?.name || 
                         `Candidate ${candidate.id.slice(0, 8)}`;
    
    const candidateEmail = candidateUser?.email || 'No email available';

    return (
      <div className="col-md-6 mb-3">
        <div className="card h-100">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <h5 className="card-title">{candidateName}</h5>
                <p className="card-subtitle small text-muted mb-1">{candidateEmail}</p>
              </div>
              <div className="text-end">
                <span className={`badge bg-${candidate.matchScore >= 80 ? 'success' : candidate.matchScore >= 60 ? 'warning' : 'info'}`}>
                  {candidate.matchScore}% Match
                </span>
              </div>
            </div>
            
            {/* Academic Info */}
            {candidate.academicRecords && candidate.academicRecords.length > 0 && (
              <div className="mb-2">
                <strong>Academic Record:</strong>
                {candidate.academicRecords.map((record, index) => (
                  <div key={index} className="small">
                    {record.schoolName} - {record.year} {record.gpa && `(GPA: ${record.gpa})`}
                  </div>
                ))}
              </div>
            )}
            
            {/* Certificates */}
            {candidate.certificates && candidate.certificates.length > 0 && (
              <div className="mb-2">
                <strong>Certificates:</strong> {candidate.certificates.length}
                <div className="small text-muted">
                  {candidate.certificates.slice(0, 2).map(cert => cert.name).join(', ')}
                  {candidate.certificates.length > 2 && '...'}
                </div>
              </div>
            )}
            
            {/* Work Experience */}
            {candidate.workExperience && candidate.workExperience.length > 0 && (
              <div className="mb-2">
                <strong>Work Experience:</strong> {candidate.workExperience.length} roles
              </div>
            )}
            
            {/* Skills */}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="mb-3">
                <strong>Skills:</strong>
                <div>
                  {candidate.skills.slice(0, 5).map((skill, index) => (
                    <span key={index} className="badge bg-secondary me-1 mb-1">
                      {skill}
                    </span>
                  ))}
                  {candidate.skills.length > 5 && '...'}
                </div>
              </div>
            )}
            
            {/* Strengths */}
            {candidate.strengths && candidate.strengths.length > 0 && (
              <div className="mb-3">
                <strong>Strengths:</strong>
                <ul className="small mb-0">
                  {candidate.strengths.map((strength, index) => (
                    <li key={index}>{strength}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => handleContactCandidate(candidate.id, candidateUser?.email)}
            >
              Contact Candidate
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading company dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header with Logout Button */}
      <div className="row mb-4">
        <div className="col-10">
          <h2>Company Dashboard</h2>
          <p>Welcome, {company?.name || 'Company'}</p>
          <p className={`badge ${company?.verified ? 'bg-success' : 'bg-warning'}`}>
            {company?.verified ? 'Verified' : 'Pending Verification'}
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
          <button className={`nav-link ${activeTab === 'post-job' ? 'active' : ''}`}
            onClick={() => setActiveTab('post-job')}>Post New Job</button>
          <button className={`nav-link ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}>My Jobs ({jobPostings.length})</button>
          <button className={`nav-link ${activeTab === 'applicants' ? 'active' : ''}`}
            onClick={() => setActiveTab('applicants')}>Applicants ({applicants.length})</button>
          <button className={`nav-link ${activeTab === 'qualified' ? 'active' : ''}`}
            onClick={() => setActiveTab('qualified')}>
            Qualified Candidates {qualifiedCandidates.length > 0 && `(${qualifiedCandidates.length})`}
          </button>
          <button className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}>Company Profile</button>
        </div>
      </nav>

      {/* Tab Content */}
      <div className="tab-content p-3 border border-top-0 rounded-bottom">
        
        {/* Dashboard Tab - UPDATED TO SHOW NAMES */}
        {activeTab === 'dashboard' && (
          <div>
            <h4>Company Overview</h4>
            <div className="row">
              <div className="col-md-3">
                <div className="card text-white bg-primary mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.totalJobs}</h5>
                    <p className="card-text">Active Jobs</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-success mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.shortlisted}</h5>
                    <p className="card-text">Shortlisted</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-warning mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.totalApplications}</h5>
                    <p className="card-text">Total Applications</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-info mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{stats.interviews}</h5>
                    <p className="card-text">Interviews</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Applications - NOW SHOWS NAMES AND EMAILS */}
            <h5>Recent Job Applications</h5>
            {applicants.length === 0 ? (
              <p>No job applications received yet.</p>
            ) : (
              <div className="list-group">
                {applicants.slice(0, 5).map(application => (
                  <RecentApplicationItem key={application.id} application={application} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Post Job Tab */}
        {activeTab === 'post-job' && (
          <div>
            <h4>Post New Job Opportunity</h4>
            <div className="card">
              <div className="card-body">
                <form onSubmit={handlePostJob}>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Job Title *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newJob.title}
                          onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                          required
                          placeholder="e.g., Software Engineer, Marketing Intern"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Job Type *</label>
                        <select
                          className="form-select"
                          value={newJob.jobType}
                          onChange={(e) => setNewJob({...newJob, jobType: e.target.value})}
                          required
                        >
                          <option value="full-time">Full Time</option>
                          <option value="part-time">Part Time</option>
                          <option value="contract">Contract</option>
                          <option value="internship">Internship</option>
                          <option value="remote">Remote</option>
                        </select>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Location *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newJob.location}
                          onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                          required
                          placeholder="e.g., Maseru, Lesotho or Remote"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Salary Range</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g., M30,000 - M40,000 per year"
                          value={newJob.salary}
                          onChange={(e) => setNewJob({...newJob, salary: e.target.value})}
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Application Deadline *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={newJob.deadline}
                          onChange={(e) => setNewJob({...newJob, deadline: e.target.value})}
                          required
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Job Description *</label>
                        <textarea
                          className="form-control"
                          rows="3"
                          placeholder="Describe the role, responsibilities, and what you're looking for..."
                          value={newJob.description}
                          onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Requirements *</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="Required skills, experience, and competencies..."
                          value={newJob.requirements}
                          onChange={(e) => setNewJob({...newJob, requirements: e.target.value})}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Qualifications *</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="Educational qualifications, certificates, etc..."
                          value={newJob.qualifications}
                          onChange={(e) => setNewJob({...newJob, qualifications: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Posting Job...' : 'Post Job Opportunity'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* My Jobs Tab */}
        {activeTab === 'jobs' && (
          <div>
            <h4>My Job Postings</h4>
            {jobPostings.length === 0 ? (
              <div className="alert alert-info">
                No job postings yet. <span className="btn btn-link p-0" onClick={() => setActiveTab('post-job')}>Post your first job</span>
              </div>
            ) : (
              <div className="row">
                {jobPostings.map(job => (
                  <div key={job.id} className="col-md-6 mb-3">
                    <div className="card h-100">
                      <div className="card-body">
                        <h5 className="card-title">{job.title}</h5>
                        <p className="card-text">{job.description}</p>
                        <p><strong>Type:</strong> {job.jobType}</p>
                        <p><strong>Location:</strong> {job.location}</p>
                        <p><strong>Salary:</strong> {job.salary || 'Not specified'}</p>
                        <p><strong>Deadline:</strong> {job.deadline?.toDate().toLocaleDateString()}</p>
                        <p><strong>Status:</strong> 
                          <StatusBadge status={job.status} />
                        </p>
                        <p><strong>Posted:</strong> {job.createdAt?.toDate().toLocaleDateString()}</p>
                        
                        <div className="mt-3">
                          <button 
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={() => findQualifiedApplicants(job.id)}
                            disabled={loading}
                          >
                            Find Qualified Candidates
                          </button>
                          <button className="btn btn-outline-secondary btn-sm me-1">
                            Edit
                          </button>
                          <button className="btn btn-outline-danger btn-sm">
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applicants Tab - UPDATED TO SHOW NAMES IN TABLE */}
        {activeTab === 'applicants' && (
          <div>
            <h4>Job Applicants</h4>
            {applicants.length === 0 ? (
              <div className="alert alert-info">
                No applicants yet. Candidates will appear here when they apply to your jobs.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Applicant Name & Email</th>
                      <th>Job Title</th>
                      <th>Qualifications</th>
                      <th>Applied Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicants.map(application => (
                      <ApplicationRow key={application.id} application={application} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Qualified Candidates Tab */}
        {activeTab === 'qualified' && (
          <div>
            <h4>Qualified Candidates</h4>
            <div className="alert alert-info">
              <h5>Smart Candidate Matching</h5>
              <p>Our algorithm finds the best candidates based on:</p>
              <ul>
                <li>Academic performance and GPA</li>
                <li>Relevant certificates and qualifications</li>
                <li>Work experience and internships</li>
                <li>Skills matching your job requirements</li>
              </ul>
              <p>Select a job posting to find qualified candidates:</p>
            </div>

            {jobPostings.length === 0 ? (
              <div className="alert alert-warning">
                No job postings available. <span className="btn btn-link p-0" onClick={() => setActiveTab('post-job')}>Post a job first</span>
              </div>
            ) : qualifiedCandidates.length === 0 ? (
              <div className="row">
                {jobPostings.map(job => (
                  <div key={job.id} className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h5 className="card-title">{job.title}</h5>
                        <p className="card-text">{job.description.substring(0, 100)}...</p>
                        <p><strong>Requirements:</strong> {job.requirements.substring(0, 50)}...</p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => findQualifiedApplicants(job.id)}
                          disabled={loading}
                        >
                          Find Qualified Candidates
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>Top Matching Candidates</h5>
                  <button 
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setQualifiedCandidates([])}
                  >
                    Clear Results
                  </button>
                </div>
                <div className="row">
                  {qualifiedCandidates.map(candidate => (
                    <QualifiedCandidateCard key={candidate.id} candidate={candidate} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <h4>Company Profile</h4>
            <div className="card">
              <div className="card-body">
                <h5>Company Information</h5>
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Company Name:</strong> {company?.name || 'Not set'}</p>
                    <p><strong>Industry:</strong> {company?.industry || 'Not provided'}</p>
                    <p><strong>Email:</strong> {auth.currentUser?.email}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Address:</strong> {company?.address || 'Not provided'}</p>
                    <p><strong>Contact Person:</strong> {company?.contactPerson || 'Not provided'}</p>
                    <p><strong>Phone:</strong> {company?.phone || 'Not provided'}</p>
                  </div>
                </div>
                <p><strong>Status:</strong> 
                  <span className={`badge ${company?.verified ? 'bg-success' : 'bg-warning'} ms-1`}>
                    {company?.verified ? 'Verified' : 'Pending Verification'}
                  </span>
                </p>
                <p><strong>Registered:</strong> {company?.createdAt?.toDate().toLocaleDateString()}</p>
                
                <button 
                  className="btn btn-outline-primary mt-3"
                  onClick={handleUpdateProfile}
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Edit Profile'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}