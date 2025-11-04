import React, { useState } from 'react';
import { addWorkExperience } from '../../services/api';

export default function WorkExperienceForm({ studentId, onSuccess }) {
  const [form, setForm] = useState({
    company: '',
    position: '',
    duration: '',
    description: '',
    referenceContact: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId) return;

    try {
      setLoading(true);
      await addWorkExperience(studentId, form);
      alert('Work experience added successfully!');
      onSuccess();
    } catch (error) {
      alert('Error adding work experience: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-3">
        <label className="form-label">Company/Organization *</label>
        <input
          type="text"
          className="form-control"
          value={form.company}
          onChange={(e) => setForm({...form, company: e.target.value})}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Position/Role *</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g., Intern, Sales Assistant, Volunteer"
          value={form.position}
          onChange={(e) => setForm({...form, position: e.target.value})}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Duration *</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g., 3 months, June 2022 - August 2022"
          value={form.duration}
          onChange={(e) => setForm({...form, duration: e.target.value})}
          required
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea
          className="form-control"
          rows="3"
          placeholder="Describe your responsibilities and achievements..."
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Reference Contact (Optional)</label>
        <input
          type="text"
          className="form-control"
          placeholder="Supervisor name and contact"
          value={form.referenceContact}
          onChange={(e) => setForm({...form, referenceContact: e.target.value})}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? 'Adding...' : 'Add Work Experience'}
      </button>
    </form>
  );
}