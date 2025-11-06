import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  confirmPasswordReset,
  verifyPasswordResetCode
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration with environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyC4du80mlcHlH27RZwYNAGCBAMv9yaWFuQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "fir-90a10.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "fir-90a10",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "fir-90a10.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1097580106507",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1097580106507:web:d97eb4992bfa189dd1480e",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-1LEXKTTS1Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// ===== AUTHENTICATION FUNCTIONS =====
export const registerUser = async (email, password, role, additionalData = {}) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  // Send email verification
  await sendEmailVerification(user);
  
  // Store user role and data in Firestore
  await setDoc(doc(db, 'users', user.uid), {
    email: email,
    role: role,
    createdAt: new Date(),
    emailVerified: false,
    status: 'active',
    ...additionalData
  });

  // Create role-specific profile
  if (role === 'student') {
    await setDoc(doc(db, 'studentProfiles', user.uid), {
      userId: user.uid,
      academicRecords: [],
      certificates: [],
      workExperience: [],
      skills: [],
      createdAt: new Date()
    });
  } else if (role === 'institute') {
    await setDoc(doc(db, 'institutions', user.uid), {
      userId: user.uid,
      name: additionalData.instituteName || '',
      status: 'pending',
      verified: false,
      createdAt: new Date()
    });
  } else if (role === 'company') {
    await setDoc(doc(db, 'companies', user.uid), {
      userId: user.uid,
      name: additionalData.companyName || '',
      status: 'pending', 
      verified: false,
      createdAt: new Date()
    });
  }
  
  return user;
};

export const loginUser = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (!userDoc.exists()) {
    throw new Error('User data not found');
  }
  
  return { 
    user, 
    userData: userDoc.data(),
    role: userDoc.data().role 
  };
};

export const logoutUser = async () => {
  await signOut(auth);
};

/**
 * Send password reset email to user
 */
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('✅ Password reset email sent successfully');
    return { success: true, message: 'Password reset email sent successfully' };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    let errorMessage = 'Failed to send password reset email';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email address';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Invalid email address';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Too many attempts. Please try again later';
        break;
      default:
        errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Verify password reset code
 */
export const verifyResetCode = async (code) => {
  try {
    await verifyPasswordResetCode(auth, code);
    return { success: true, message: 'Reset code is valid' };
  } catch (error) {
    console.error('❌ Error verifying reset code:', error);
    throw new Error('Invalid or expired reset code');
  }
};

/**
 * Confirm password reset with new password
 */
export const confirmPasswordReset = async (code, newPassword) => {
  try {
    await confirmPasswordReset(auth, code, newPassword);
    console.log('✅ Password reset successfully');
    return { success: true, message: 'Password reset successfully' };
  } catch (error) {
    console.error('❌ Error confirming password reset:', error);
    let errorMessage = 'Failed to reset password';
    
    switch (error.code) {
      case 'auth/weak-password':
        errorMessage = 'Password is too weak';
        break;
      case 'auth/expired-action-code':
        errorMessage = 'Reset code has expired';
        break;
      case 'auth/invalid-action-code':
        errorMessage = 'Invalid reset code';
        break;
      default:
        errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
};

// ===== STUDENT FUNCTIONS =====
export const getAvailableCourses = async () => {
  const q = query(collection(db, 'courses'), where('status', '==', 'active'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const applyForCourse = async (studentId, courseId, institutionId, documents = {}) => {
  // Check if already applied to 2 courses in this institution
  const applicationsQuery = query(
    collection(db, 'applications'),
    where('studentId', '==', studentId),
    where('institutionId', '==', institutionId)
  );
  const existingApps = await getDocs(applicationsQuery);
  
  if (existingApps.size >= 2) {
    throw new Error('Maximum 2 applications per institution allowed');
  }

  // Create application
  const applicationData = {
    studentId,
    courseId,
    institutionId,
    status: 'pending',
    appliedAt: new Date(),
    documents,
    updatedAt: new Date()
  };

  const docRef = await addDoc(collection(db, 'applications'), applicationData);
  return docRef.id;
};

// ===== JOB FUNCTIONS =====
export const postJob = async (companyId, jobData) => {
  try {
    const jobWithMeta = {
      ...jobData,
      companyId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await addDoc(collection(db, 'jobPostings'), jobWithMeta);
    console.log('✅ Job posted successfully:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error posting job:', error);
    throw error;
  }
};

export const getAvailableJobs = async (filters = {}) => {
  try {
    let q = query(
      collection(db, 'jobPostings'), 
      where('status', '==', 'active')
    );
    
    if (filters.jobType) {
      q = query(q, where('jobType', '==', filters.jobType));
    }
    
    const querySnapshot = await getDocs(q);
    const jobs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('📋 Available jobs:', jobs.length);
    return jobs;
  } catch (error) {
    console.error('❌ Error fetching jobs:', error);
    throw error;
  }
};

export const getJobPostings = async (filters = {}) => {
  let q = query(collection(db, 'jobPostings'), where('status', '==', 'active'));
  
  if (filters.jobType) {
    q = query(q, where('jobType', '==', filters.jobType));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const applyForJob = async (studentId, jobId, coverLetter = '') => {
  // Check if already applied
  const applicationsQuery = query(
    collection(db, 'jobApplications'),
    where('studentId', '==', studentId),
    where('jobId', '==', jobId)
  );
  const existingApps = await getDocs(applicationsQuery);
  
  if (!existingApps.empty) {
    throw new Error('You have already applied for this job');
  }

  // Get job details
  const jobDoc = await getDoc(doc(db, 'jobPostings', jobId));
  if (!jobDoc.exists()) {
    throw new Error('Job posting not found');
  }
  const jobData = jobDoc.data();

  // Create job application
  const applicationData = {
    studentId,
    jobId,
    companyId: jobData.companyId,
    jobTitle: jobData.title,
    companyName: jobData.companyName,
    coverLetter,
    status: 'pending',
    appliedAt: new Date(),
    updatedAt: new Date()
  };

  const docRef = await addDoc(collection(db, 'jobApplications'), applicationData);
  return docRef.id;
};

export const getStudentJobApplications = async (studentId) => {
  try {
    const q = query(
      collection(db, 'jobApplications'),
      where('studentId', '==', studentId)
    );
    const querySnapshot = await getDocs(q);
    const applications = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Manual sort
    return applications.sort((a, b) => {
      const dateA = a.appliedAt?.toDate() || new Date(0);
      const dateB = b.appliedAt?.toDate() || new Date(0);
      return dateB - dateA;
    });
  } catch (error) {
    console.error('Error fetching job applications:', error);
    return [];
  }
};

// ===== PROFILE FUNCTIONS =====
export const updateStudentProfile = async (studentId, profileData) => {
  try {
    await updateDoc(doc(db, 'studentProfiles', studentId), {
      ...profileData,
      updatedAt: new Date()
    });
    console.log('✅ Profile updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
};

export const uploadTranscript = async (studentId, transcriptData) => {
  try {
    console.log('🔄 Starting transcript upload for:', studentId);
    
    const profileRef = doc(db, 'studentProfiles', studentId);
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      throw new Error('Student profile not found in Firestore');
    }
    
    const currentData = profileDoc.data();
    const academicRecords = currentData.academicRecords || [];
    
    console.log('📚 Current records:', academicRecords);
    
    const newRecord = {
      schoolName: transcriptData.schoolName,
      year: transcriptData.year,
      program: transcriptData.program || '',
      gpa: transcriptData.gpa || '',
      uploadedAt: new Date()
    };
    
    console.log('➕ Adding new record:', newRecord);
    
    await updateDoc(profileRef, {
      academicRecords: [...academicRecords, newRecord],
      updatedAt: new Date()
    });
    
    console.log('✅ Transcript uploaded successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error uploading transcript:', error);
    throw new Error(`Failed to upload transcript: ${error.message}`);
  }
};

export const addCertificate = async (studentId, certificateData) => {
  try {
    console.log('🔄 Adding certificate for:', studentId);
    
    const profileRef = doc(db, 'studentProfiles', studentId);
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      throw new Error('Student profile not found in Firestore');
    }
    
    const currentData = profileDoc.data();
    const certificates = currentData.certificates || [];
    
    const newCertificate = {
      name: certificateData.name,
      issuer: certificateData.issuer,
      date: certificateData.date || '',
      description: certificateData.description || '',
      addedAt: new Date()
    };
    
    await updateDoc(profileRef, {
      certificates: [...certificates, newCertificate],
      updatedAt: new Date()
    });
    
    console.log('✅ Certificate added successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error adding certificate:', error);
    throw new Error(`Failed to add certificate: ${error.message}`);
  }
};

export const addWorkExperience = async (studentId, experienceData) => {
  try {
    console.log('🔄 Adding work experience for:', studentId);
    
    const profileRef = doc(db, 'studentProfiles', studentId);
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      throw new Error('Student profile not found in Firestore');
    }
    
    const currentData = profileDoc.data();
    const workExperience = currentData.workExperience || [];
    
    const newExperience = {
      company: experienceData.company,
      position: experienceData.position,
      duration: experienceData.duration,
      description: experienceData.description || '',
      referenceContact: experienceData.referenceContact || '',
      addedAt: new Date()
    };
    
    await updateDoc(profileRef, {
      workExperience: [...workExperience, newExperience],
      updatedAt: new Date()
    });
    
    console.log('✅ Work experience added successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Error adding work experience:', error);
    throw new Error(`Failed to add work experience: ${error.message}`);
  }
};

// ===== INSTITUTION FUNCTIONS =====
export const addCourse = async (institutionId, courseData) => {
  const courseWithMeta = {
    ...courseData,
    institutionId,
    status: 'active',
    createdAt: new Date()
  };
  
  const docRef = await addDoc(collection(db, 'courses'), courseWithMeta);
  return docRef.id;
};

export const getInstitutionApplications = async (institutionId) => {
  const q = query(
    collection(db, 'applications'),
    where('institutionId', '==', institutionId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===== COMPANY FUNCTIONS =====
export const getCompanyJobPostings = async (companyId) => {
  const q = query(
    collection(db, 'jobPostings'),
    where('companyId', '==', companyId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getCompanyJobApplications = async (companyId) => {
  const q = query(
    collection(db, 'jobApplications'),
    where('companyId', '==', companyId)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ===== ADMIN FUNCTIONS =====
export const getAllInstitutions = async () => {
  const q = query(collection(db, 'institutions'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const verifyInstitution = async (institutionId) => {
  await updateDoc(doc(db, 'institutions', institutionId), {
    verified: true,
    status: 'active'
  });
};

export const getAllCompanies = async () => {
  const q = query(collection(db, 'companies'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const verifyCompany = async (companyId) => {
  await updateDoc(doc(db, 'companies', companyId), {
    verified: true,
    status: 'active'
  });
};

// ===== HELPER FUNCTIONS =====
export const getDocument = (collection, id) => getDoc(doc(db, collection, id));
export const setDocument = (collection, id, data) => setDoc(doc(db, collection, id), data);
export const updateDocument = (collection, id, data) => updateDoc(doc(db, collection, id), data);
export const addDocument = (collection, data) => addDoc(collection(db, collection), data);

export default app;