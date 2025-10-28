import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [posts, setPosts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [toast, setToast] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    requirements: '',
    benefits: '',
    salary_min: '',
    salary_max: '',
    currency: 'USD',
    location: '',
    remote_ok: false,
    employment_type: 'full-time',
    experience_level: 'mid',
    contact_email: '',
    contact_phone: '',
    image_url: '',
    company_id: '',
    daysLimit: 7 // Default 7 days
  });

  const [extendForm, setExtendForm] = useState({
    extraDays: 7
  });

  // Get auth token
  const getAuthToken = () => {
    return localStorage.getItem('auth_token');
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch posts
  const fetchPosts = async () => {
    try {
      const response = await axios.get('/api/admin/posts', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      showToast('Failed to fetch posts', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch companies
  const fetchCompanies = async () => {
    try {
      const response = await axios.get('/api/admin/companies', {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      setCompanies(response.data.companies || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  // Create post
  const handleCreatePost = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/admin/posts', createForm, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      showToast('Post created successfully!');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        requirements: '',
        benefits: '',
        salary_min: '',
        salary_max: '',
        currency: 'USD',
        location: '',
        remote_ok: false,
        employment_type: 'full-time',
        experience_level: 'mid',
        contact_email: '',
        contact_phone: '',
        image_url: '',
        company_id: '',
        daysLimit: 7
      });
      fetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Failed to create post', 'error');
    }
  };

  // Extend post
  const handleExtendPost = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/api/admin/posts/${selectedPost.id}/extend`, extendForm, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        }
      });

      showToast(`Post extended by ${extendForm.extraDays} days!`);
      setShowExtendModal(false);
      setSelectedPost(null);
      setExtendForm({ extraDays: 7 });
      fetchPosts();
    } catch (error) {
      console.error('Error extending post:', error);
      showToast('Failed to extend post', 'error');
    }
  };

  // Open extend modal
  const openExtendModal = (post) => {
    setSelectedPost(post);
    setShowExtendModal(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if post is expired
  const isExpired = (expiryDate) => {
    return new Date(expiryDate) < new Date();
  };

  // Get days until expiry
  const getDaysUntilExpiry = (expiryDate) => {
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    fetchPosts();
    fetchCompanies();
  }, []);

  if (loading) {
    return <div className="loading">Loading admin dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Create New Post
        </button>
      </div>

      {/* Posts List */}
      <div className="posts-section">
        <h2>Job Posts ({posts.length})</h2>
        <div className="posts-grid">
          {posts.map(post => (
            <div key={post.id} className={`post-card ${isExpired(post.expires_at) ? 'expired' : ''}`}>
              <div className="post-header">
                <h3>{post.title}</h3>
                <div className="post-actions">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => openExtendModal(post)}
                  >
                    Extend
                  </button>
                </div>
              </div>
              
              <div className="post-details">
                <p><strong>Company:</strong> {post.companies?.name || 'Unknown'}</p>
                <p><strong>Location:</strong> {post.location}</p>
                <p><strong>Type:</strong> {post.employment_type}</p>
                <p><strong>Level:</strong> {post.experience_level}</p>
                {post.salary_min && (
                  <p><strong>Salary:</strong> ${post.salary_min.toLocaleString()} - ${post.salary_max?.toLocaleString()}</p>
                )}
              </div>

              <div className="post-meta">
                <div className="expiry-info">
                  <p><strong>Expires:</strong> {formatDate(post.expires_at)}</p>
                  <p className={`status ${isExpired(post.expires_at) ? 'expired' : 'active'}`}>
                    {isExpired(post.expires_at) ? 'EXPIRED' : `${getDaysUntilExpiry(post.expires_at)} days left`}
                  </p>
                </div>
                <div className="visibility-info">
                  <p><strong>Visible:</strong> {post.visible ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Create New Job Post</h2>
              <button 
                className="btn-close"
                onClick={() => setShowCreateModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreatePost} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Job Title *</label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({...createForm, title: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Company *</label>
                  <select
                    value={createForm.company_id}
                    onChange={(e) => setCreateForm({...createForm, company_id: e.target.value})}
                    required
                  >
                    <option value="">Select Company</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  rows="4"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Location *</label>
                  <input
                    type="text"
                    value={createForm.location}
                    onChange={(e) => setCreateForm({...createForm, location: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Show for (days) *</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={createForm.daysLimit}
                    onChange={(e) => setCreateForm({...createForm, daysLimit: parseInt(e.target.value)})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Employment Type *</label>
                  <select
                    value={createForm.employment_type}
                    onChange={(e) => setCreateForm({...createForm, employment_type: e.target.value})}
                    required
                  >
                    <option value="full-time">Full Time</option>
                    <option value="part-time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Experience Level *</label>
                  <select
                    value={createForm.experience_level}
                    onChange={(e) => setCreateForm({...createForm, experience_level: e.target.value})}
                    required
                  >
                    <option value="entry">Entry Level</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior Level</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Salary Min</label>
                  <input
                    type="number"
                    value={createForm.salary_min}
                    onChange={(e) => setCreateForm({...createForm, salary_min: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Salary Max</label>
                  <input
                    type="number"
                    value={createForm.salary_max}
                    onChange={(e) => setCreateForm({...createForm, salary_max: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Requirements</label>
                <textarea
                  value={createForm.requirements}
                  onChange={(e) => setCreateForm({...createForm, requirements: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Benefits</label>
                <textarea
                  value={createForm.benefits}
                  onChange={(e) => setCreateForm({...createForm, benefits: e.target.value})}
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Extend Post Modal */}
      {showExtendModal && selectedPost && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Extend Post: {selectedPost.title}</h2>
              <button 
                className="btn-close"
                onClick={() => setShowExtendModal(false)}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleExtendPost} className="modal-form">
              <div className="form-group">
                <label>Current Expiry: {formatDate(selectedPost.expires_at)}</label>
              </div>
              
              <div className="form-group">
                <label>Add Extra Days *</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={extendForm.extraDays}
                  onChange={(e) => setExtendForm({...extendForm, extraDays: parseInt(e.target.value)})}
                  required
                />
                <small>Enter number of days to extend the post visibility</small>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExtendModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Extend Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
