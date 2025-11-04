import React, { useState } from 'react';
import { registerUser } from './services/api';

export default function Register(){
  const [form, setForm] = useState({ 
    email:'', 
    password:'', 
    role:'student',
    fullName: '',
    phone: '',
    institutionName: '',
    companyName: '',
    industry: '',
    address: '',
    contactPerson: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const additionalData = {
        fullName: form.fullName,
        phone: form.phone,
        status: 'active' // Default status
      };

      // Role-specific data
      if (form.role === 'institute') {
        additionalData.instituteName = form.institutionName;
        additionalData.address = form.address;
        additionalData.verified = false;
        additionalData.status = 'pending'; // Institutes need admin approval
      } else if (form.role === 'company') {
        additionalData.companyName = form.companyName;
        additionalData.industry = form.industry;
        additionalData.address = form.address;
        additionalData.contactPerson = form.contactPerson;
        additionalData.verified = false;
        additionalData.status = 'pending'; // Companies need admin approval
      } else if (form.role === 'student') {
        additionalData.studentName = form.fullName;
        additionalData.status = 'active'; // Students are active immediately
      }

      await registerUser(form.email, form.password, form.role, additionalData);
      alert('Registration successful! Please login.');
      setForm({ 
        email:'', 
        password:'', 
        role:'student', 
        fullName: '', 
        phone: '',
        institutionName: '', 
        companyName: '',
        industry: '',
        address: '', 
        contactPerson: ''
      });
    } catch (error) {
      alert('Registration failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3>Register</h3>
      <form onSubmit={submit}>
        {/* Common Fields */}
        <input 
          name="fullName" 
          placeholder={form.role === 'student' ? "Full Name" : "Contact Person Name"} 
          value={form.fullName} 
          onChange={handleChange} 
          className="form-control mb-2" 
          required 
        />
        
        <input 
          type="email" 
          name="email" 
          placeholder="Email" 
          value={form.email} 
          onChange={handleChange} 
          className="form-control mb-2" 
          required 
        />
        
        <input 
          type="password" 
          name="password" 
          placeholder="Password" 
          value={form.password} 
          onChange={handleChange} 
          className="form-control mb-2" 
          required 
        />
        
        <input 
          name="phone" 
          placeholder="Phone Number" 
          value={form.phone} 
          onChange={handleChange} 
          className="form-control mb-2" 
        />
        
        {/* Role Selection */}
        <select name="role" value={form.role} onChange={handleChange} className="form-select mb-3">
          <option value="student">Student</option>
          <option value="institute">Institute</option>
          <option value="company">Company</option>
        </select>
        
        {/* Institute-specific Fields */}
        {form.role === 'institute' && (
          <>
            <input 
              name="institutionName" 
              placeholder="Official Institution Name" 
              value={form.institutionName} 
              onChange={handleChange} 
              className="form-control mb-2" 
              required 
            />
            <input 
              name="address" 
              placeholder="Institution Address" 
              value={form.address} 
              onChange={handleChange} 
              className="form-control mb-2" 
              required 
            />
          </>
        )}
        
        {/* Company-specific Fields */}
        {form.role === 'company' && (
          <>
            <input 
              name="companyName" 
              placeholder="Official Company Name" 
              value={form.companyName} 
              onChange={handleChange} 
              className="form-control mb-2" 
              required 
            />
            <input 
              name="industry" 
              placeholder="Industry" 
              value={form.industry} 
              onChange={handleChange} 
              className="form-control mb-2" 
              required 
            />
            <input 
              name="address" 
              placeholder="Company Address" 
              value={form.address} 
              onChange={handleChange} 
              className="form-control mb-2" 
              required 
            />
            <input 
              name="contactPerson" 
              placeholder="Contact Person Name" 
              value={form.contactPerson} 
              onChange={handleChange} 
              className="form-control mb-2" 
              required 
            />
          </>
        )}
        
        <button className="btn btn-primary w-100" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      
      {/* Registration Notes */}
      <div className="mt-3">
        <small className="text-muted">
          {form.role === 'student' && 'Students can start using the platform immediately after registration.'}
          {form.role === 'institute' && 'Institutes require admin verification before they can manage courses and applications.'}
          {form.role === 'company' && 'Companies require admin verification before they can post jobs and view applicants.'}
        </small>
      </div>
    </div>
  );
};