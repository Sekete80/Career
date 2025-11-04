import React, { useState, useEffect } from 'react';
import TranscriptUploadForm from './TranscriptUploadForm';
import CertificateForm from './CertificateForm';
import WorkExperienceForm from './WorkExperienceForm';
import SkillsForm from './SkillsForm';
import { 
  getAvailableCourses, 
  applyForCourse, 
  getDocument,
  auth,
  db,
  logoutUser,
  updateStudentProfile,
  uploadTranscript,
  addCertificate,
  addWorkExperience,
  getAvailableJobs,
  applyForJob,
  getStudentJobApplications
} from '../../services/api';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, addDoc } from 'firebase/firestore';

// Add this function to format the interview date
const formatInterviewDate = (interviewDate) => {
  if (!interviewDate) return 'Not scheduled';
  
  const date = interviewDate.toDate ? interviewDate.toDate() : new Date(interviewDate);
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Resume Generation Component
const ResumeGenerator = ({ studentProfile, onClose }) => {
  const [resumeFormat, setResumeFormat] = useState('modern');
  const [includePhoto, setIncludePhoto] = useState(false);
  const [generating, setGenerating] = useState(false);

  const generateResumeContent = () => {
    if (!studentProfile) return '';

    const user = auth.currentUser;
    const currentDate = new Date().toLocaleDateString();

    const resumeTemplates = {
      modern: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              line-height: 1.6; 
              color: #333; 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 20px;
            }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white; 
              padding: 30px; 
              border-radius: 10px;
              margin-bottom: 30px;
            }
            .contact-info { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 10px; 
              margin-top: 15px;
            }
            .section { 
              margin-bottom: 25px; 
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
              border-left: 4px solid #667eea;
            }
            .section-title { 
              color: #667eea; 
              border-bottom: 2px solid #667eea; 
              padding-bottom: 8px; 
              margin-bottom: 15px;
              font-size: 1.3em;
            }
            .skill-tag { 
              background: #667eea; 
              color: white; 
              padding: 5px 12px; 
              border-radius: 20px; 
              display: inline-block; 
              margin: 3px;
              font-size: 0.9em;
            }
            .experience-item, .education-item { 
              margin-bottom: 15px; 
              padding: 15px;
              background: white;
              border-radius: 6px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .date { 
              color: #666; 
              font-style: italic;
            }
            .generated-date {
              text-align: center;
              color: #666;
              margin-top: 30px;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${user?.displayName || 'Student Resume'}</h1>
            <p>${user?.email || 'No email provided'}</p>
            <div class="contact-info">
              <div>📧 ${user?.email || 'N/A'}</div>
              <div>📱 ${studentProfile.phone || 'Not provided'}</div>
              <div>📍 ${studentProfile.address || 'Not provided'}</div>
              <div>🎓 ${studentProfile.degree || 'Student'}</div>
            </div>
          </div>

          ${studentProfile.summary ? `
          <div class="section">
            <h2 class="section-title">Professional Summary</h2>
            <p>${studentProfile.summary}</p>
          </div>
          ` : ''}

          ${studentProfile.academicRecords && studentProfile.academicRecords.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Education</h2>
            ${studentProfile.academicRecords.map(record => `
              <div class="education-item">
                <h3>${record.schoolName || 'Educational Institution'}</h3>
                <p><strong>Degree:</strong> ${record.degree || 'Not specified'} | <strong>Year:</strong> ${record.year || 'N/A'}</p>
                <p><strong>GPA:</strong> ${record.gpa || 'Not specified'} | <strong>Major:</strong> ${record.major || 'Not specified'}</p>
                ${record.achievements ? `<p><strong>Achievements:</strong> ${record.achievements}</p>` : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${studentProfile.workExperience && studentProfile.workExperience.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Work Experience</h2>
            ${studentProfile.workExperience.map(exp => `
              <div class="experience-item">
                <h3>${exp.position || 'Position'} at ${exp.company || 'Company'}</h3>
                <p class="date">${exp.duration || 'Duration not specified'}</p>
                <p><strong>Responsibilities:</strong> ${exp.responsibilities || 'Not specified'}</p>
                ${exp.achievements ? `<p><strong>Achievements:</strong> ${exp.achievements}</p>` : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${studentProfile.certificates && studentProfile.certificates.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Certifications</h2>
            ${studentProfile.certificates.map(cert => `
              <div class="experience-item">
                <h3>${cert.name || 'Certificate Name'}</h3>
                <p><strong>Issuer:</strong> ${cert.issuer || 'Not specified'} | <strong>Date:</strong> ${cert.issueDate || 'N/A'}</p>
                ${cert.description ? `<p>${cert.description}</p>` : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${studentProfile.skills && studentProfile.skills.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Skills</h2>
            ${studentProfile.skills.map(skill => `
              <span class="skill-tag">${skill}</span>
            `).join('')}
          </div>
          ` : ''}

          <div class="generated-date">
            Resume generated on ${currentDate} via Career Guidance Platform
          </div>
        </body>
        </html>
      `,
      professional: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { 
              font-family: 'Georgia', serif; 
              line-height: 1.4; 
              color: #2c3e50; 
              max-width: 700px; 
              margin: 0 auto; 
              padding: 40px;
              background: #fdfdfd;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px double #2c3e50; 
              padding-bottom: 20px; 
              margin-bottom: 30px;
            }
            .name { 
              font-size: 2.2em; 
              margin: 0; 
              color: #2c3e50;
              letter-spacing: 1px;
            }
            .contact-info { 
              display: flex; 
              justify-content: center; 
              gap: 20px; 
              margin-top: 10px;
              flex-wrap: wrap;
            }
            .section { 
              margin-bottom: 25px; 
            }
            .section-title { 
              color: #2c3e50; 
              border-bottom: 1px solid #bdc3c7; 
              padding-bottom: 5px; 
              margin-bottom: 15px;
              font-size: 1.2em;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .item { 
              margin-bottom: 15px; 
            }
            .item-title { 
              font-weight: bold; 
              color: #34495e;
            }
            .item-subtitle { 
              color: #7f8c8d; 
              font-style: italic;
            }
            .skills { 
              display: grid; 
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
              gap: 10px; 
            }
            .skill-item { 
              background: #ecf0f1; 
              padding: 8px 12px; 
              border-radius: 4px; 
              text-align: center;
            }
            .generated-date {
              text-align: center;
              color: #7f8c8d;
              margin-top: 40px;
              font-size: 0.8em;
              border-top: 1px solid #bdc3c7;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="name">${user?.displayName || 'Professional Resume'}</h1>
            <div class="contact-info">
              <span>${user?.email || ''}</span>
              <span>${studentProfile.phone || ''}</span>
              <span>${studentProfile.address || ''}</span>
            </div>
          </div>

          ${studentProfile.summary ? `
          <div class="section">
            <h2 class="section-title">Summary</h2>
            <p>${studentProfile.summary}</p>
          </div>
          ` : ''}

          ${studentProfile.academicRecords && studentProfile.academicRecords.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Education</h2>
            ${studentProfile.academicRecords.map(record => `
              <div class="item">
                <div class="item-title">${record.schoolName || 'Institution'}</div>
                <div class="item-subtitle">${record.degree || ''} ${record.major ? `- ${record.major}` : ''} | ${record.year || ''}</div>
                ${record.gpa ? `<div>GPA: ${record.gpa}</div>` : ''}
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${studentProfile.workExperience && studentProfile.workExperience.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Experience</h2>
            ${studentProfile.workExperience.map(exp => `
              <div class="item">
                <div class="item-title">${exp.position || 'Position'}</div>
                <div class="item-subtitle">${exp.company || 'Company'} | ${exp.duration || ''}</div>
                <div>${exp.responsibilities || ''}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${studentProfile.skills && studentProfile.skills.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Skills</h2>
            <div class="skills">
              ${studentProfile.skills.map(skill => `
                <div class="skill-item">${skill}</div>
              `).join('')}
            </div>
          </div>
          ` : ''}

          ${studentProfile.certificates && studentProfile.certificates.length > 0 ? `
          <div class="section">
            <h2 class="section-title">Certifications</h2>
            ${studentProfile.certificates.map(cert => `
              <div class="item">
                <div class="item-title">${cert.name || 'Certificate'}</div>
                <div class="item-subtitle">${cert.issuer || ''} | ${cert.issueDate || ''}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="generated-date">
            Generated on ${currentDate} • Career Guidance Platform
          </div>
        </body>
        </html>
      `
    };

    return resumeTemplates[resumeFormat] || resumeTemplates.modern;
  };

  const handleGenerateResume = () => {
    setGenerating(true);
    
    setTimeout(() => {
      const resumeContent = generateResumeContent();
      const newWindow = window.open('', '_blank');
      newWindow.document.write(resumeContent);
      newWindow.document.close();
      
      setGenerating(false);
    }, 1000);
  };

  const handleDownloadPDF = () => {
    setGenerating(true);
    
    setTimeout(() => {
      const resumeContent = generateResumeContent();
      const newWindow = window.open('', '_blank');
      newWindow.document.write(resumeContent);
      newWindow.document.close();
      
      setTimeout(() => {
        newWindow.print();
        setGenerating(false);
      }, 500);
    }, 1000);
  };

  return (
    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Generate Resume</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Resume Format</label>
                  <select 
                    className="form-select"
                    value={resumeFormat}
                    onChange={(e) => setResumeFormat(e.target.value)}
                  >
                    <option value="modern">Modern Style</option>
                    <option value="professional">Professional Style</option>
                  </select>
                </div>
              </div>
              <div className="col-md-6">
                <div className="mb-3">
                  <label className="form-label">Options</label>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={includePhoto}
                      onChange={(e) => setIncludePhoto(e.target.checked)}
                    />
                    <label className="form-check-label">
                      Include Profile Photo
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Preview */}
            <div className="card mt-3">
              <div className="card-header">
                <h6 className="mb-0">Resume Preview</h6>
              </div>
              <div className="card-body">
                <div className="alert alert-info">
                  <strong>Your resume will include:</strong>
                  <ul className="mb-0 mt-2">
                    {studentProfile?.academicRecords?.length > 0 && (
                      <li>Education: {studentProfile.academicRecords.length} record(s)</li>
                    )}
                    {studentProfile?.workExperience?.length > 0 && (
                      <li>Work Experience: {studentProfile.workExperience.length} position(s)</li>
                    )}
                    {studentProfile?.certificates?.length > 0 && (
                      <li>Certifications: {studentProfile.certificates.length} certificate(s)</li>
                    )}
                    {studentProfile?.skills?.length > 0 && (
                      <li>Skills: {studentProfile.skills.length} skill(s)</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="btn btn-info"
              onClick={handleDownloadPDF}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Download PDF'}
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleGenerateResume}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Preview Resume'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [courses, setCourses] = useState([]);
  const [applications, setApplications] = useState([]);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [jobApplications, setJobApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);
  const [showResumeGenerator, setShowResumeGenerator] = useState(false);

  const studentId = auth.currentUser?.uid;

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      // Load available courses
      const availableCourses = await getAvailableCourses();
      setCourses(availableCourses);

      // Load student's applications
      const applicationsQuery = query(
        collection(db, 'applications'),
        where('studentId', '==', studentId)
      );
      const applicationsSnapshot = await getDocs(applicationsQuery);
      const apps = applicationsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setApplications(apps);

      // Load available jobs
      const jobs = await getAvailableJobs();
      setAvailableJobs(jobs);

      // Load student's job applications
      const jobApps = await getStudentJobApplications(studentId);
      setJobApplications(jobApps);

      // Load student profile
      const profileDoc = await getDocument('studentProfiles', studentId);
      if (profileDoc.exists()) {
        setStudentProfile(profileDoc.data());
      }
    } catch (error) {
      console.error('Error loading student data:', error);
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyForCourse = async (course) => {
    if (!studentId) {
      alert('Please login first');
      return;
    }

    if (!window.confirm(`Apply for ${course.name} at ${course.institutionName}?`)) {
      return;
    }

    try {
      setLoading(true);
      // Enhanced apply function with names
      await applyForCourseWithNames(studentId, course);
      alert('Application submitted successfully!');
      loadStudentData(); // Refresh data
    } catch (error) {
      alert('Application failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced apply function that stores names
  const applyForCourseWithNames = async (studentId, course) => {
    // Check if already applied to 2 courses in this institution
    const applicationsQuery = query(
      collection(db, 'applications'),
      where('studentId', '==', studentId),
      where('institutionId', '==', course.institutionId)
    );
    const existingApps = await getDocs(applicationsQuery);
    
    if (existingApps.size >= 2) {
      throw new Error('Maximum 2 applications per institution allowed');
    }

    // Create application WITH NAMES
    const applicationData = {
      studentId,
      courseId: course.id,
      institutionId: course.institutionId,
      courseName: course.name,
      institutionName: course.institutionName,
      status: 'pending',
      appliedAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await addDoc(collection(db, 'applications'), applicationData);
    return docRef.id;
  };

  // Job application function
  const handleApplyForJob = async (job) => {
    if (!studentId) {
      alert('Please login first');
      return;
    }

    if (!window.confirm(`Apply for ${job.title} at ${job.companyName}?`)) {
      return;
    }

    try {
      setLoading(true);
      await applyForJob(studentId, job.id);
      alert('Job application submitted successfully!');
      loadStudentData(); // Refresh data
    } catch (error) {
      alert('Job application failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ADDED BACK THE MISSING handleLogout FUNCTION
  const handleLogout = async () => {
    try {
      await logoutUser();
      localStorage.removeItem('userRole');
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Calculate profile completion percentage
  const calculateProfileCompletion = () => {
    if (!studentProfile) return 0;
    
    let completion = 0;
    const weights = {
      academicRecords: 30,
      certificates: 20,
      workExperience: 25,
      skills: 25
    };

    if (studentProfile.academicRecords && studentProfile.academicRecords.length > 0) {
      completion += weights.academicRecords;
    }
    if (studentProfile.certificates && studentProfile.certificates.length > 0) {
      completion += weights.certificates;
    }
    if (studentProfile.workExperience && studentProfile.workExperience.length > 0) {
      completion += weights.workExperience;
    }
    if (studentProfile.skills && studentProfile.skills.length > 0) {
      completion += weights.skills;
    }

    return completion;
  };

  // Remove skill function
  const handleRemoveSkill = async (skillToRemove) => {
    if (!studentId) return;
    
    try {
      const updatedSkills = studentProfile.skills.filter(skill => skill !== skillToRemove);
      await updateStudentProfile(studentId, { skills: updatedSkills });
      loadStudentData(); // Refresh profile data
    } catch (error) {
      alert('Error removing skill: ' + error.message);
    }
  };

  // Generate resume function - UPDATED
  const generateResume = () => {
    if (calculateProfileCompletion() < 50) {
      alert('Please complete at least 50% of your profile to generate a resume.');
      return;
    }
    setShowResumeGenerator(true);
  };

  // Download profile data function
  const downloadProfileData = () => {
    const profileData = {
      studentProfile,
      completion: calculateProfileCompletion() + '%'
    };
    const dataStr = JSON.stringify(profileData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'student-profile.json';
    link.click();
  };

  // ===== DEBUG FUNCTIONS =====

  // Debug function to check Firestore documents
  const debugFirestore = async () => {
    try {
      console.log('=== FIRESTORE DEBUG ===');
      console.log('Student ID from auth:', studentId);
      console.log('Current user:', auth.currentUser);
      
      // Check users collection
      const userDoc = await getDocument('users', studentId);
      console.log('User document exists:', userDoc.exists());
      if (userDoc.exists()) {
        console.log('User data:', userDoc.data());
      } else {
        console.log('❌ User document NOT found in Firestore');
      }
      
      // Check studentProfiles collection  
      const profileDoc = await getDocument('studentProfiles', studentId);
      console.log('Student profile exists:', profileDoc.exists());
      if (profileDoc.exists()) {
        console.log('Student profile data:', profileDoc.data());
      } else {
        console.log('❌ Student profile NOT found in Firestore');
      }
      
      // List all student profiles to see what's there
      const allProfiles = await getDocs(collection(db, 'studentProfiles'));
      console.log('All student profiles in database:');
      allProfiles.forEach(doc => {
        console.log('Document ID:', doc.id, 'Data:', doc.data().userId);
      });
      
      // List all users to see what's there
      const allUsers = await getDocs(collection(db, 'users'));
      console.log('All users in database:');
      allUsers.forEach(doc => {
        console.log('User ID:', doc.id, 'Role:', doc.data().role);
      });
      
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  // Debug function to check jobs
  const debugJobs = async () => {
    try {
      console.log('=== JOB DEBUG ===');
      const jobs = await getAvailableJobs();
      console.log('Available jobs:', jobs);
      console.log('Job applications:', jobApplications);
    } catch (error) {
      console.error('Job debug error:', error);
    }
  };

  // Function to create missing student profile
  const createMissingProfile = async () => {
    try {
      console.log('🛠️ Creating missing student profile...');
      
      await setDoc(doc(db, 'studentProfiles', studentId), {
        userId: studentId,
        academicRecords: [],
        certificates: [],
        workExperience: [],
        skills: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ Student profile created successfully!');
      alert('Student profile created! Please refresh the page.');
      loadStudentData(); // Refresh to load the new profile
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Error creating profile: ' + error.message);
    }
  };

  // Function to fix existing applications (add names to old applications)
  const fixExistingApplications = async () => {
    try {
      setLoading(true);
      console.log('🛠️ Fixing existing applications...');
      
      const updates = applications.map(async (application) => {
        // Only update if names are missing
        if (!application.courseName || !application.institutionName) {
          let courseName = application.courseName;
          let institutionName = application.institutionName;
          
          // Fetch course name
          if (!courseName) {
            const courseDoc = await getDocument('courses', application.courseId);
            if (courseDoc.exists()) {
              courseName = courseDoc.data().name;
            } else {
              courseName = `Course: ${application.courseId.slice(0, 8)}`;
            }
          }
          
          // Fetch institution name  
          if (!institutionName) {
            // First try to get from course data
            const courseDoc = await getDocument('courses', application.courseId);
            if (courseDoc.exists() && courseDoc.data().institutionName) {
              institutionName = courseDoc.data().institutionName;
            } else {
              // Fallback to institution document
              const instDoc = await getDocument('institutions', application.institutionId);
              if (instDoc.exists()) {
                institutionName = instDoc.data().name;
              } else {
                institutionName = `Institution: ${application.institutionId.slice(0, 8)}`;
              }
            }
          }
          
          // Update the application with names
          await updateDoc(doc(db, 'applications', application.id), {
            courseName,
            institutionName
          });
          
          console.log(`✅ Fixed application ${application.id}`);
        }
      });
      
      await Promise.all(updates);
      console.log('✅ All applications fixed!');
      alert('Applications fixed! Refreshing data...');
      loadStudentData(); // Refresh to show updated data
    } catch (error) {
      console.error('Error fixing applications:', error);
      alert('Error fixing applications: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Application Status Badge Component
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
  const ApplicationRow = ({ application }) => {
    // Use stored names if available, otherwise show IDs with loading
    const courseName = application.courseName || `Loading... (${application.courseId.slice(0, 8)})`;
    const institutionName = application.institutionName || `Loading... (${application.institutionId?.slice(0, 8) || 'N/A'})`;

    return (
      <tr key={application.id}>
        <td>
          <strong>{courseName}</strong>
          {!application.courseName && (
            <div>
              <small className="text-muted">ID: {application.courseId}</small>
            </div>
          )}
        </td>
        <td>
          {institutionName}
          {!application.institutionName && application.institutionId && (
            <div>
              <small className="text-muted">ID: {application.institutionId}</small>
            </div>
          )}
        </td>
        <td>{application.appliedAt?.toDate().toLocaleDateString()}</td>
        <td>
          <ApplicationStatusBadge status={application.status} />
        </td>
        <td>
          {application.status === 'admitted' && (
            <button className="btn btn-success btn-sm">
              Accept Admission
            </button>
          )}
          {application.status === 'pending' && (
            <button className="btn btn-outline-secondary btn-sm" disabled>
              Waiting...
            </button>
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
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Header with Logout Button */}
      <div className="row mb-4">
        <div className="col-10">
          <h2>Student Dashboard</h2>
          <p>Welcome to your career guidance platform</p>
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
          <button
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${activeTab === 'courses' ? 'active' : ''}`}
            onClick={() => setActiveTab('courses')}
          >
            Available Courses ({courses.length})
          </button>
          <button
            className={`nav-link ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}
          >
            My Applications ({applications.length})
          </button>
          <button
            className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            My Profile
          </button>
          <button
            className={`nav-link ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            Job Opportunities ({availableJobs.length})
          </button>
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
                    <p className="card-text">Course Applications</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-success mb-3">
                  <div className="card-body">
                    <h5 className="card-title">
                      {applications.filter(app => app.status === 'admitted').length}
                    </h5>
                    <p className="card-text">Admissions</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-warning mb-3">
                  <div className="card-body">
                    <h5 className="card-title">
                      {jobApplications.length}
                    </h5>
                    <p className="card-text">Job Applications</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card text-white bg-info mb-3">
                  <div className="card-body">
                    <h5 className="card-title">{availableJobs.length}</h5>
                    <p className="card-text">Available Jobs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Applications */}
            <h5>Recent Course Applications</h5>
            {applications.length === 0 ? (
              <p>No course applications yet. Browse courses to apply!</p>
            ) : (
              <div className="list-group">
                {applications.slice(0, 5).map(application => (
                  <div key={application.id} className="list-group-item">
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">
                        {application.courseName || `Course: ${application.courseId.slice(0, 8)}`}
                      </h6>
                      <ApplicationStatusBadge status={application.status} />
                    </div>
                    <p className="mb-1">
                      {application.institutionName || `Institution: ${application.institutionId?.slice(0, 8) || 'N/A'}`}
                    </p>
                    <small>Applied on: {application.appliedAt?.toDate().toLocaleDateString()}</small>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Job Applications */}
            <h5 className="mt-4">Recent Job Applications</h5>
            {jobApplications.length === 0 ? (
              <p>No job applications yet. Browse jobs to apply!</p>
            ) : (
              <div className="list-group">
                {jobApplications.slice(0, 5).map(application => (
                  <div key={application.id} className="list-group-item">
                    <div className="d-flex w-100 justify-content-between">
                      <h6 className="mb-1">{application.jobTitle}</h6>
                      <span className={`badge bg-${
                        application.status === 'pending' ? 'warning' :
                        application.status === 'shortlisted' ? 'info' :
                        application.status === 'interview_scheduled' ? 'primary' :
                        application.status === 'hired' ? 'success' :
                        application.status === 'rejected' ? 'danger' : 'secondary'
                      }`}>
                        {application.status?.charAt(0).toUpperCase() + application.status?.slice(1).replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mb-1">Company: {application.companyName}</p>
                    <small>Applied on: {application.appliedAt?.toDate().toLocaleDateString()}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Available Courses Tab */}
        {activeTab === 'courses' && (
          <div>
            <h4>Available Courses</h4>
            {courses.length === 0 ? (
              <div className="alert alert-info">
                No courses available at the moment. Check back later!
              </div>
            ) : (
              <div className="row">
                {courses.map(course => (
                  <div key={course.id} className="col-md-6 mb-3">
                    <div className="card">
                      <div className="card-body">
                        <h5 className="card-title">{course.name}</h5>
                        <h6 className="card-subtitle mb-2 text-muted">
                          {course.institutionName}
                        </h6>
                        <p className="card-text">{course.description}</p>
                        <p><strong>Requirements:</strong> {course.requirements}</p>
                        <p><strong>Duration:</strong> {course.duration}</p>
                        <p><strong>Seats:</strong> {course.seatsAvailable}</p>
                        
                        {/* Check if already applied */}
                        {applications.some(app => app.courseId === course.id) ? (
                          <button className="btn btn-secondary" disabled>
                            Already Applied
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleApplyForCourse(course)}
                            disabled={loading}
                          >
                            {loading ? 'Applying...' : 'Apply Now'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Applications Tab - FIXED WITH NAMES */}
        {activeTab === 'applications' && (
          <div>
            <h4>My Course Applications</h4>
            
            {/* Fix Applications Button - Show if some applications don't have names */}
            {applications.some(app => !app.courseName || !app.institutionName) && (
              <div className="alert alert-warning mb-3">
                <p>Some applications are showing IDs instead of names.</p>
                <button 
                  className="btn btn-info btn-sm"
                  onClick={fixExistingApplications}
                  disabled={loading}
                >
                  {loading ? 'Fixing...' : 'Fix Application Names'}
                </button>
              </div>
            )}
            
            {applications.length === 0 ? (
              <div className="alert alert-warning">
                You haven't applied to any courses yet. 
                <button 
                  className="btn btn-link p-0 ms-1"
                  onClick={() => setActiveTab('courses')}
                >
                  Browse available courses
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Course Name</th>
                      <th>Institution</th>
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
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div>
            <h4>My Profile</h4>
            
            {/* Profile Completion Status with Debug Buttons */}
            <div className="card mb-4">
              <div className="card-body">
                <h5>Profile Completion</h5>
                <div className="progress mb-3">
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${calculateProfileCompletion()}%`,
                      transition: 'width 0.5s ease-in-out'
                    }}
                  >
                    {calculateProfileCompletion()}% Complete
                  </div>
                </div>
                <p>Complete your profile to unlock job applications and get better job matches!</p>
                
                {/* DEBUG BUTTONS */}
                <div className="mt-3">
                  <button className="btn btn-warning btn-sm me-2" onClick={debugFirestore}>
                    Debug Firestore
                  </button>
                  <button className="btn btn-success btn-sm me-2" onClick={createMissingProfile}>
                    Create Missing Profile
                  </button>
                  <button className="btn btn-info btn-sm me-2" onClick={fixExistingApplications}>
                    Fix Application Names
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={debugJobs}>
                    Debug Jobs
                  </button>
                </div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6">
                {/* Academic Records */}
                <div className="card mb-4">
                  <div className="card-body">
                    <h5>Academic Records</h5>
                    {studentProfile?.academicRecords && studentProfile.academicRecords.length > 0 ? (
                      <div>
                        <p><strong>Transcripts uploaded:</strong> {studentProfile.academicRecords.length}</p>
                        <div className="mb-2">
                          {studentProfile.academicRecords.map((record, index) => (
                            <div key={index} className="alert alert-sm alert-info p-2 mb-1">
                              <small>{record.schoolName} - {record.year}</small>
                            </div>
                          ))}
                        </div>
                        <button 
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => document.getElementById('transcriptModal').style.display = 'block'}
                        >
                          Upload Another Transcript
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-warning">No academic records uploaded yet.</p>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => document.getElementById('transcriptModal').style.display = 'block'}
                        >
                          Upload Your Transcript
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Certificates */}
                <div className="card mb-4">
                  <div className="card-body">
                    <h5>Certificates & Qualifications</h5>
                    {studentProfile?.certificates && studentProfile.certificates.length > 0 ? (
                      <div>
                        <p><strong>Certificates added:</strong> {studentProfile.certificates.length}</p>
                        <div className="mb-2">
                          {studentProfile.certificates.map((cert, index) => (
                            <div key={index} className="alert alert-sm alert-success p-2 mb-1">
                              <small>{cert.name} - {cert.issuer}</small>
                            </div>
                          ))}
                        </div>
                        <button 
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => document.getElementById('certificateModal').style.display = 'block'}
                        >
                          Add Another Certificate
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-warning">No certificates added yet.</p>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => document.getElementById('certificateModal').style.display = 'block'}
                        >
                          Add Certificate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-6">
                {/* Work Experience */}
                <div className="card mb-4">
                  <div className="card-body">
                    <h5>Work Experience</h5>
                    {studentProfile?.workExperience && studentProfile.workExperience.length > 0 ? (
                      <div>
                        <p><strong>Work experiences:</strong> {studentProfile.workExperience.length}</p>
                        <div className="mb-2">
                          {studentProfile.workExperience.map((exp, index) => (
                            <div key={index} className="alert alert-sm alert-warning p-2 mb-1">
                              <small>{exp.position} at {exp.company} ({exp.duration})</small>
                            </div>
                          ))}
                        </div>
                        <button 
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => document.getElementById('experienceModal').style.display = 'block'}
                        >
                          Add Another Experience
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-warning">No work experience added yet.</p>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => document.getElementById('experienceModal').style.display = 'block'}
                        >
                          Add Work Experience
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Skills */}
                <div className="card mb-4">
                  <div className="card-body">
                    <h5>Skills</h5>
                    {studentProfile?.skills && studentProfile.skills.length > 0 ? (
                      <div>
                        <div className="mb-2">
                          {studentProfile.skills.map((skill, index) => (
                            <span key={index} className="badge bg-primary me-1 mb-1">
                              {skill}
                              <button 
                                type="button" 
                                className="btn-close btn-close-white ms-1"
                                style={{ fontSize: '0.7rem' }}
                                onClick={() => handleRemoveSkill(skill)}
                              ></button>
                            </span>
                          ))}
                        </div>
                        <button 
                          className="btn btn-outline-primary btn-sm me-1"
                          onClick={() => document.getElementById('skillsModal').style.display = 'block'}
                        >
                          Add More Skills
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="text-warning">No skills added yet.</p>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => document.getElementById('skillsModal').style.display = 'block'}
                        >
                          Add Skills
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions - UPDATED WITH FUNCTIONAL RESUME BUTTON */}
            <div className="card">
              <div className="card-body">
                <h5>Quick Actions</h5>
                <div className="d-grid gap-2 d-md-block">
                  <button 
                    className="btn btn-success me-2 mb-2" 
                    onClick={generateResume}
                    disabled={calculateProfileCompletion() < 50}
                    title={calculateProfileCompletion() < 50 ? 'Complete 50% of your profile to generate resume' : 'Generate professional resume'}
                  >
                    Generate Resume {calculateProfileCompletion() < 50 && '(50% required)'}
                  </button>
                  <button 
                    className="btn btn-info me-2 mb-2"
                    onClick={() => setActiveTab('jobs')}
                  >
                    View Job Opportunities ({availableJobs.length})
                  </button>
                  <button className="btn btn-warning mb-2" onClick={downloadProfileData}>
                    Download Profile Data
                  </button>
                </div>
                
                {/* Resume Generation Info */}
                {calculateProfileCompletion() < 50 && (
                  <div className="alert alert-warning mt-3">
                    <small>
                      <strong>Complete your profile to generate resume:</strong><br/>
                      • Upload academic transcripts<br/>
                      • Add work experience<br/>
                      • Include certificates<br/>
                      • List your skills
                    </small>
                  </div>
                )}
              </div>
            </div>

            {/* Modal for Transcript Upload */}
            <div id="transcriptModal" className="modal" style={{display: 'none'}}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Upload Academic Transcript</h5>
                    <button type="button" className="btn-close" onClick={() => document.getElementById('transcriptModal').style.display = 'none'}></button>
                  </div>
                  <div className="modal-body">
                    <TranscriptUploadForm 
                      studentId={studentId}
                      onSuccess={() => {
                        document.getElementById('transcriptModal').style.display = 'none';
                        loadStudentData();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal for Certificate Upload */}
            <div id="certificateModal" className="modal" style={{display: 'none'}}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add Certificate</h5>
                    <button type="button" className="btn-close" onClick={() => document.getElementById('certificateModal').style.display = 'none'}></button>
                  </div>
                  <div className="modal-body">
                    <CertificateForm 
                      studentId={studentId}
                      onSuccess={() => {
                        document.getElementById('certificateModal').style.display = 'none';
                        loadStudentData();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal for Work Experience */}
            <div id="experienceModal" className="modal" style={{display: 'none'}}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add Work Experience</h5>
                    <button type="button" className="btn-close" onClick={() => document.getElementById('experienceModal').style.display = 'none'}></button>
                  </div>
                  <div className="modal-body">
                    <WorkExperienceForm 
                      studentId={studentId}
                      onSuccess={() => {
                        document.getElementById('experienceModal').style.display = 'none';
                        loadStudentData();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal for Skills */}
            <div id="skillsModal" className="modal" style={{display: 'none'}}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Add Skills</h5>
                    <button type="button" className="btn-close" onClick={() => document.getElementById('skillsModal').style.display = 'none'}></button>
                  </div>
                  <div className="modal-body">
                    <SkillsForm 
                      studentId={studentId}
                      currentSkills={studentProfile?.skills || []}
                      onSuccess={() => {
                        document.getElementById('skillsModal').style.display = 'none';
                        loadStudentData();
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Tab - UPDATED WITH ENHANCED JOB APPLICATIONS SECTION */}
        {activeTab === 'jobs' && (
          <div>
            <h4>Job Opportunities ({availableJobs.length})</h4>
            
            {/* Student Profile Completion Status */}
            {(!studentProfile || !studentProfile.academicRecords || studentProfile.academicRecords.length === 0) && (
              <div className="alert alert-warning">
                <h5>Complete Your Profile to Apply for Jobs</h5>
                <p>To apply for jobs and receive job recommendations, you need to:</p>
                <ul>
                  <li>Upload your academic transcripts</li>
                  <li>Add your certificates and qualifications</li>
                  <li>Include your work experience</li>
                  <li>List your skills</li>
                </ul>
                <button 
                  className="btn btn-primary"
                  onClick={() => setActiveTab('profile')}
                >
                  Complete My Profile
                </button>
              </div>
            )}

            {/* Job Search and Filters */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-8">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search jobs by title, company, or keywords..." 
                    />
                  </div>
                  <div className="col-md-4">
                    <select className="form-select">
                      <option value="">All Job Types</option>
                      <option value="full-time">Full Time</option>
                      <option value="part-time">Part Time</option>
                      <option value="internship">Internship</option>
                      <option value="contract">Contract</option>
                      <option value="remote">Remote</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Job Listings */}
            {availableJobs.length === 0 ? (
              <div className="alert alert-info">
                No job opportunities available at the moment. Check back later!
                <br/>
                <small>Companies need to post jobs for them to appear here.</small>
              </div>
            ) : (
              <div className="row">
                {availableJobs.map(job => {
                  const hasApplied = jobApplications.some(app => app.jobId === job.id);
                  const canApply = studentProfile?.academicRecords && studentProfile.academicRecords.length > 0;
                  
                  return (
                    <div key={job.id} className="col-md-6 mb-3">
                      <div className="card h-100">
                        <div className="card-body">
                          <h5 className="card-title">{job.title}</h5>
                          <h6 className="card-subtitle mb-2 text-muted">
                            {job.companyName}
                          </h6>
                          <p className="card-text">{job.description}</p>
                          
                          <div className="mb-2">
                            <strong>Requirements:</strong>
                            <p className="small">{job.requirements}</p>
                          </div>
                          
                          <div className="mb-2">
                            <strong>Qualifications:</strong>
                            <p className="small">{job.qualifications}</p>
                          </div>
                          
                          <p><strong>Type:</strong> {job.jobType}</p>
                          <p><strong>Location:</strong> {job.location}</p>
                          <p><strong>Salary:</strong> {job.salary || 'Not specified'}</p>
                          <p><strong>Deadline:</strong> {job.deadline?.toDate().toLocaleDateString()}</p>
                          <p><strong>Posted:</strong> {job.createdAt?.toDate().toLocaleDateString()}</p>
                          
                          {hasApplied ? (
                            <button className="btn btn-secondary" disabled>
                              ✓ Already Applied
                            </button>
                          ) : canApply ? (
                            <button 
                              className="btn btn-primary"
                              onClick={() => handleApplyForJob(job)}
                              disabled={loading}
                            >
                              {loading ? 'Applying...' : 'Apply Now'}
                            </button>
                          ) : (
                            <button className="btn btn-secondary" disabled>
                              Complete Profile to Apply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* My Job Applications - ENHANCED SECTION */}
            <div className="mt-4">
              <h4>My Job Applications ({jobApplications.length})</h4>
              
              {jobApplications.length === 0 ? (
                <p>You haven't applied to any jobs yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Job Title</th>
                        <th>Company</th>
                        <th>Applied Date</th>
                        <th>Status</th>
                        <th>Interview Details</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobApplications.map(application => (
                        <tr key={application.id}>
                          <td>
                            <strong>{application.jobTitle}</strong>
                          </td>
                          <td>{application.companyName}</td>
                          <td>{application.appliedAt?.toDate().toLocaleDateString()}</td>
                          <td>
                            <span className={`badge bg-${
                              application.status === 'pending' ? 'warning' :
                              application.status === 'shortlisted' ? 'info' :
                              application.status === 'interview_scheduled' ? 'primary' :
                              application.status === 'hired' ? 'success' :
                              application.status === 'rejected' ? 'danger' : 'secondary'
                            }`}>
                              {application.status?.charAt(0).toUpperCase() + application.status?.slice(1).replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            {application.status === 'interview_scheduled' && application.interviewDate ? (
                              <div>
                                <div>
                                  <strong>Date:</strong> {formatInterviewDate(application.interviewDate)}
                                </div>
                                {application.interviewLocation && (
                                  <div>
                                    <strong>Location:</strong> {application.interviewLocation}
                                  </div>
                                )}
                                {application.scheduledAt && (
                                  <div>
                                    <small className="text-muted">
                                      Scheduled on: {application.scheduledAt.toDate().toLocaleDateString()}
                                    </small>
                                  </div>
                                )}
                              </div>
                            ) : application.status === 'shortlisted' ? (
                              <span className="text-info">Awaiting interview schedule</span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {application.status === 'interview_scheduled' && (
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => {
                                  alert(`Interview Details:\n\nDate: ${formatInterviewDate(application.interviewDate)}\nLocation: ${application.interviewLocation || 'To be confirmed'}`);
                                }}
                              >
                                View Details
                              </button>
                            )}
                            {application.status === 'pending' && (
                              <button className="btn btn-outline-secondary btn-sm" disabled>
                                Waiting...
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Interview Information Card */}
              {jobApplications.some(app => app.status === 'interview_scheduled') && (
                <div className="card mt-4 border-primary">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">📅 Upcoming Interviews</h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {jobApplications
                        .filter(app => app.status === 'interview_scheduled' && app.interviewDate)
                        .sort((a, b) => a.interviewDate.toDate() - b.interviewDate.toDate())
                        .map(application => (
                          <div key={application.id} className="col-md-6 mb-3">
                            <div className="card h-100 border-info">
                              <div className="card-body">
                                <h6 className="card-title text-primary">{application.jobTitle}</h6>
                                <p className="card-text">
                                  <strong>Company:</strong> {application.companyName}
                                </p>
                                <p className="card-text">
                                  <strong>Interview Date:</strong><br/>
                                  {formatInterviewDate(application.interviewDate)}
                                </p>
                                {application.interviewLocation && (
                                  <p className="card-text">
                                    <strong>Location:</strong> {application.interviewLocation}
                                  </p>
                                )}
                                <div className="mt-3">
                                  <button 
                                    className="btn btn-info btn-sm"
                                    onClick={() => {
                                      // Add to calendar functionality
                                      const interviewDate = application.interviewDate.toDate();
                                      const calendarEvent = {
                                        title: `Interview - ${application.jobTitle} at ${application.companyName}`,
                                        description: `Job Interview for ${application.jobTitle} position`,
                                        location: application.interviewLocation,
                                        start: interviewDate,
                                        end: new Date(interviewDate.getTime() + 60 * 60 * 1000) // 1 hour duration
                                      };
                                      
                                      // Simple alert for now - you can integrate with calendar APIs later
                                      alert(`Add this to your calendar:\n\nEvent: ${calendarEvent.title}\nDate: ${formatInterviewDate(application.interviewDate)}\nLocation: ${calendarEvent.location}`);
                                    }}
                                  >
                                    Add to Calendar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Job Matching Info */}
            <div className="alert alert-info mt-4">
              <h5>Smart Job Matching</h5>
              <p>Our system automatically matches you with jobs based on:</p>
              <ul>
                <li>Your academic performance and qualifications</li>
                <li>Relevant certificates and skills</li>
                <li>Work experience and internships</li>
                <li>Job requirements and preferences</li>
              </ul>
              <p>Complete your profile to get personalized job recommendations!</p>
            </div>
          </div>
        )}
      </div>

      {/* Resume Generator Modal */}
      {showResumeGenerator && (
        <ResumeGenerator 
          studentProfile={studentProfile}
          onClose={() => setShowResumeGenerator(false)}
        />
      )}
    </div>
  );
}