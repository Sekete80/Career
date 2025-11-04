import React, { useState } from 'react';
import { addCertificate } from '../../services/api';

export default function CertificateForm({ studentId, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    issuer: '',
    date: '',
    description: ''
  });
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setFile(null);
        setFileName('');
        return;
      }

      // Check file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please upload a PDF, JPEG, PNG, or Word document');
        setFile(null);
        setFileName('');
        return;
      }

      setFile(selectedFile);
      setFileName(selectedFile.name);
      setError('');
    }
  };

  const removeFile = () => {
    setFile(null);
    setFileName('');
    setError('');
    // Reset file input
    const fileInput = document.getElementById('certificateFile');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId) return;

    try {
      setLoading(true);
      setError('');

      // Basic validation
      if (!form.name || !form.issuer) {
        throw new Error('Please fill in all required fields');
      }

      // Create form data for file upload
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('issuer', form.issuer);
      formData.append('date', form.date);
      formData.append('description', form.description);
      
      if (file) {
        formData.append('certificateFile', file);
        formData.append('fileName', fileName);
      }

      await addCertificate(studentId, formData);
      
      alert('Certificate added successfully!');
      
      // Reset form
      setForm({
        name: '',
        issuer: '',
        date: '',
        description: ''
      });
      removeFile();
      
      onSuccess();
    } catch (error) {
      console.error('Error adding certificate:', error);
      setError(error.message);
      alert('Error adding certificate: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="mb-3">
        <label className="form-label">Certificate Name *</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g., Microsoft Certified Professional, First Aid Certificate"
          value={form.name}
          onChange={(e) => setForm({...form, name: e.target.value})}
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Issuing Organization *</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g., Microsoft, Red Cross"
          value={form.issuer}
          onChange={(e) => setForm({...form, issuer: e.target.value})}
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Date Obtained</label>
        <input
          type="date"
          className="form-control"
          value={form.date}
          onChange={(e) => setForm({...form, date: e.target.value})}
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Description</label>
        <textarea
          className="form-control"
          rows="3"
          placeholder="Describe what this certificate represents..."
          value={form.description}
          onChange={(e) => setForm({...form, description: e.target.value})}
        />
      </div>

      {/* File Upload Section */}
      <div className="mb-4">
        <label className="form-label">Upload Certificate File (Optional)</label>
        <div className="file-upload-area">
          {!file ? (
            <div className="border rounded p-4 text-center">
              <input
                type="file"
                id="certificateFile"
                className="d-none"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              />
              <label htmlFor="certificateFile" className="btn btn-outline-primary mb-2">
                <i className="bi bi-cloud-upload me-2"></i>
                Choose File
              </label>
              <p className="small text-muted mb-0">
                Supported formats: PDF, JPG, PNG, DOC, DOCX (Max 5MB)
              </p>
            </div>
          ) : (
            <div className="border rounded p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <i className="bi bi-file-earmark-text me-2"></i>
                  <strong>{fileName}</strong>
                  <small className="text-muted ms-2">
                    ({formatFileSize(file.size)})
                  </small>
                </div>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={removeFile}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex gap-2">
        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              Uploading...
            </>
          ) : (
            'Add Certificate'
          )}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => document.getElementById('certificateModal').style.display = 'none'}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}