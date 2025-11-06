import React, { useState } from 'react';
import { loginUser } from './services/api';
import { Link } from 'react-router-dom';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({...form, [e.target.name]: e.target.value });

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { user, role } = await loginUser(form.email, form.password);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', user.uid);
      onLogin(role);
    } catch (error) {
      alert('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-center mb-0">Login to Your Account</h3>
            </div>
            <div className="card-body">
              <form onSubmit={submit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email Address</label>
                  <input 
                    type="email" 
                    name="email" 
                    placeholder="Enter your email" 
                    value={form.email} 
                    onChange={handleChange} 
                    className="form-control" 
                    required 
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input 
                    type="password" 
                    name="password" 
                    placeholder="Enter your password" 
                    value={form.password} 
                    onChange={handleChange} 
                    className="form-control" 
                    required 
                  />
                </div>
                <button className="btn btn-primary w-100" disabled={loading}>
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>

              {/* Forgot Password Link */}
              <div className="text-center mt-3">
                <Link to="/password-reset" className="text-decoration-none">
                  Forgot your password?
                </Link>
              </div>

              {/* Register Links */}
              <div className="text-center mt-3">
                <p className="mb-1">Don't have an account?</p>
                <div className="d-flex justify-content-center gap-3">
                  <Link to="/register?role=student" className="text-decoration-none">
                    Register as Student
                  </Link>
                  <Link to="/register?role=institute" className="text-decoration-none">
                    Register as Institute
                  </Link>
                  <Link to="/register?role=company" className="text-decoration-none">
                    Register as Company
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}