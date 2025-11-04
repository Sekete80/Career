import React, { useState } from 'react';
import { updateStudentProfile } from '../../services/api';

export default function SkillsForm({ studentId, currentSkills, onSuccess }) {
  const [newSkill, setNewSkill] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim() || !studentId) return;

    try {
      setLoading(true);
      const updatedSkills = [...(currentSkills || []), newSkill.trim()];
      await updateStudentProfile(studentId, { skills: updatedSkills });
      setNewSkill('');
      onSuccess();
    } catch (error) {
      alert('Error adding skill: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleAddSkill} className="mb-3">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Enter a skill (e.g., JavaScript, Communication, Leadership)"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Adding...' : 'Add'}
          </button>
        </div>
      </form>
      
      <div className="mb-3">
        <h6>Current Skills:</h6>
        <div className="d-flex flex-wrap gap-1">
          {currentSkills && currentSkills.map((skill, index) => (
            <span key={index} className="badge bg-secondary">
              {skill}
            </span>
          ))}
          {(!currentSkills || currentSkills.length === 0) && (
            <p className="text-muted">No skills added yet</p>
          )}
        </div>
      </div>
      
      <div className="alert alert-info">
        <small>
          <strong>Tip:</strong> Add relevant skills like:
          <br/>- Technical skills (Programming, Software)
          <br/>- Soft skills (Communication, Teamwork)  
          <br/>- Language skills (English, Sesotho)
          <br/>- Industry-specific skills
        </small>
      </div>
    </div>
  );
}