import React, { useState } from 'react';
import { uploadTranscript } from '../../services/api';

const TranscriptUploadForm = ({ studentId, onSuccess }) => {
  const [formData, setFormData] = useState({
    schoolName: '',
    year: '',
    program: '',
    gpa: '',
    subjects: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Available subjects
  const availableSubjects = [
    'English',
    'Sesotho', 
    'Mathematics',
    'Physical Science',
    'Biology',
    'History',
    'Geography',
    'Economics',
    'Business Studies',
    'Accounting',
    'Computer Studies',
    'Travel & Tourism',
    'Agriculture',
    'Art & Design',
    'Music',
    'Drama',
    'Religious Studies',
    'Life Skills'
  ];

  // Available grades
  const availableGrades = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'U', 'X'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubjectChange = (index, field, value) => {
    const updatedSubjects = [...formData.subjects];
    updatedSubjects[index] = {
      ...updatedSubjects[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      subjects: updatedSubjects
    }));
  };

  const addSubject = () => {
    setFormData(prev => ({
      ...prev,
      subjects: [...prev.subjects, { name: '', grade: '' }]
    }));
  };

  const removeSubject = (index) => {
    const updatedSubjects = formData.subjects.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      subjects: updatedSubjects
    }));
  };

  const calculateGPA = () => {
    // Simple GPA calculation based on grades
    const gradePoints = {
      'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 
      'E': 0.5, 'F': 0, 'G': 0, 'U': 0, 'X': 0
    };

    const validSubjects = formData.subjects.filter(subject => 
      subject.name && subject.grade && gradePoints[subject.grade] !== undefined
    );

    if (validSubjects.length === 0) return '';

    const totalPoints = validSubjects.reduce((sum, subject) => {
      return sum + gradePoints[subject.grade];
    }, 0);

    return (totalPoints / validSubjects.length).toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate form
      if (!formData.schoolName || !formData.year) {
        throw new Error('Please fill in all required fields');
      }

      if (formData.subjects.length === 0) {
        throw new Error('Please add at least one subject');
      }

      // Validate all subjects have names and grades
      const incompleteSubjects = formData.subjects.filter(
        subject => !subject.name || !subject.grade
      );
      
      if (incompleteSubjects.length > 0) {
        throw new Error('Please select both subject and grade for all entries');
      }

      // Auto-calculate GPA if not provided
      const finalGPA = formData.gpa || calculateGPA();

      const transcriptData = {
        schoolName: formData.schoolName,
        year: formData.year,
        program: formData.program,
        gpa: finalGPA,
        subjects: formData.subjects,
        uploadedAt: new Date()
      };

      await uploadTranscript(studentId, transcriptData);
      
      // Reset form
      setFormData({
        schoolName: '',
        year: '',
        program: '',
        gpa: '',
        subjects: []
      });
      
      onSuccess();
      
    } catch (error) {
      console.error('Error uploading transcript:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const autoFillGPA = () => {
    const calculatedGPA = calculateGPA();
    if (calculatedGPA) {
      setFormData(prev => ({
        ...prev,
        gpa: calculatedGPA
      }));
    }
  };

  return (
    <div className="transcript-upload-form">
      <h5>Add Academic Record</h5>
      
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="schoolName" className="form-label">
              School Name *
            </label>
            <input
              type="text"
              className="form-control"
              id="schoolName"
              name="schoolName"
              value={formData.schoolName}
              onChange={handleInputChange}
              required
              placeholder="Enter school name"
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="year" className="form-label">
              Year Completed *
            </label>
            <input
              type="number"
              className="form-control"
              id="year"
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              required
              min="1900"
              max="2030"
              placeholder="e.g., 2023"
            />
          </div>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label htmlFor="program" className="form-label">
              Program/Stream
            </label>
            <input
              type="text"
              className="form-control"
              id="program"
              name="program"
              value={formData.program}
              onChange={handleInputChange}
              placeholder="e.g., Science, Commerce, Arts"
            />
          </div>
          <div className="col-md-6">
            <label htmlFor="gpa" className="form-label">
              GPA (Optional)
            </label>
            <div className="input-group">
              <input
                type="text"
                className="form-control"
                id="gpa"
                name="gpa"
                value={formData.gpa}
                onChange={handleInputChange}
                placeholder="Auto-calculated from grades"
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={autoFillGPA}
                disabled={formData.subjects.length === 0}
              >
                Auto Calculate
              </button>
            </div>
            <small className="form-text text-muted">
              Leave empty to auto-calculate from grades
            </small>
          </div>
        </div>

        {/* Subjects Section */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6>Subjects & Grades</h6>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary"
              onClick={addSubject}
            >
              + Add Subject
            </button>
          </div>

          {formData.subjects.length === 0 ? (
            <div className="alert alert-info">
              Please add your subjects and grades
            </div>
          ) : (
            <div className="subjects-list">
              {formData.subjects.map((subject, index) => (
                <div key={index} className="card mb-2">
                  <div className="card-body py-2">
                    <div className="row align-items-center">
                      <div className="col-md-6">
                        <label className="form-label">Subject</label>
                        <select
                          className="form-select"
                          value={subject.name}
                          onChange={(e) => 
                            handleSubjectChange(index, 'name', e.target.value)
                          }
                          required
                        >
                          <option value="">Select Subject</option>
                          {availableSubjects.map(sub => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Grade</label>
                        <select
                          className="form-select"
                          value={subject.grade}
                          onChange={(e) => 
                            handleSubjectChange(index, 'grade', e.target.value)
                          }
                          required
                        >
                          <option value="">Select Grade</option>
                          {availableGrades.map(grade => (
                            <option key={grade} value={grade}>
                              {grade}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label">&nbsp;</label>
                        <button
                          type="button"
                          className="btn btn-outline-danger w-100"
                          onClick={() => removeSubject(index)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grade Legend */}
        <div className="alert alert-light mb-4">
          <h6>Grade Legend:</h6>
          <div className="row small">
            <div className="col-md-3"><strong>A:</strong> Excellent (80-100%)</div>
            <div className="col-md-3"><strong>B:</strong> Good (70-79%)</div>
            <div className="col-md-3"><strong>C:</strong> Average (60-69%)</div>
            <div className="col-md-3"><strong>D:</strong> Pass (50-59%)</div>
            <div className="col-md-3"><strong>E:</strong> Marginal (40-49%)</div>
            <div className="col-md-3"><strong>F:</strong> Fail (30-39%)</div>
            <div className="col-md-3"><strong>G:</strong> Poor (20-29%)</div>
            <div className="col-md-3"><strong>U:</strong> Ungraded/Fail</div>
            <div className="col-md-3"><strong>X:</strong> Absent/No result</div>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || formData.subjects.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Uploading...
              </>
            ) : (
              'Upload Transcript'
            )}
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => document.getElementById('transcriptModal').style.display = 'none'}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default TranscriptUploadForm;