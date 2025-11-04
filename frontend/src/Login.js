import React, { useState } from 'react';
import { loginUser } from './services/api';

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
    <div>
      <h3>Login</h3>
      <form onSubmit={submit}>
        <input name="email" placeholder="Email" value={form.email} onChange={handleChange} className="form-control mb-2" />
        <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="form-control mb-2" />
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}