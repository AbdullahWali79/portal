import React, { useState, useEffect } from 'react'
import axios from 'axios'
import AdminDashboard from './components/AdminDashboard'
import AuthModal from './components/AuthModal'
import './App.css'

interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'company' | 'job_seeker'
  phone?: string
}

interface Job {
  id: string
  title: string
  description: string
  location: string
  remote_ok: boolean
  employment_type: string
  experience_level: string
  salary_min?: number
  salary_max?: number
  currency: string
  visible: boolean
  created_at: string
  expires_at: string
  companies: {
    id: string
    name: string
    logo_url?: string
    location: string
  }
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [showAdminDashboard, setShowAdminDashboard] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    description: '',
    location: '',
    salary: ''
  })

  useEffect(() => {
    fetchJobs()
    checkUserAuth()
  }, [])

  const checkUserAuth = async () => {
    try {
      const token = localStorage.getItem('auth_token')
      if (token) {
        const response = await axios.get('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        setUser(response.data.user)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('auth_token')
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/api/posts')
      // Filter jobs that are visible and not expired
      const visibleJobs = response.data.posts?.filter((job: Job) => 
        job.visible === true && new Date(job.expires_at) > new Date()
      ) || []
      setJobs(visibleJobs)
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post('/api/jobs', newJob)
      setNewJob({ title: '', company: '', description: '', location: '', salary: '' })
      fetchJobs()
    } catch (error) {
      console.error('Error creating job:', error)
    }
  }

  if (loading) {
    return <div className="loading">Loading jobs...</div>
  }

  // Show admin dashboard if user is admin
  if (showAdminDashboard && user?.role === 'admin') {
    return <AdminDashboard />
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div>
            <h1>🚀 JobPortal</h1>
            <p>Find your dream job today</p>
          </div>
          <div className="header-actions">
            {user ? (
              <div className="user-info">
                <span>Welcome, {user.first_name}!</span>
                {user.role === 'admin' && (
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowAdminDashboard(true)}
                  >
                    Admin Dashboard
                  </button>
                )}
                <button 
                  className="btn btn-outline"
                  onClick={() => {
                    localStorage.removeItem('auth_token')
                    setUser(null)
                    setShowAdminDashboard(false)
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button 
                  className="btn btn-outline"
                  onClick={() => setShowAuthModal(true)}
                >
                  Login
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <section className="job-form">
          <h2>Post a New Job</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <input
                type="text"
                placeholder="Job Title"
                value={newJob.title}
                onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Company"
                value={newJob.company}
                onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Location"
                value={newJob.location}
                onChange={(e) => setNewJob({ ...newJob, location: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                placeholder="Salary (optional)"
                value={newJob.salary}
                onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })}
              />
            </div>
            <div className="form-group">
              <textarea
                placeholder="Job Description"
                value={newJob.description}
                onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
                required
              />
            </div>
            <button type="submit">Post Job</button>
          </form>
        </section>

        <section className="jobs-list">
          <h2>Available Jobs ({jobs.length})</h2>
          {jobs.length === 0 ? (
            <p className="no-jobs">No jobs available yet. Be the first to post one!</p>
          ) : (
            <div className="jobs-grid">
              {jobs.map((job) => (
                <div key={job.id} className="job-card">
                  <h3>{job.title}</h3>
                  <p className="company">{job.companies?.name || 'Unknown Company'}</p>
                  <p className="location">📍 {job.location}</p>
                  {job.remote_ok && <p className="remote">🌍 Remote OK</p>}
                  <p className="type-level">
                    {job.employment_type} • {job.experience_level}
                  </p>
                  {(job.salary_min || job.salary_max) && (
                    <p className="salary">
                      💰 ${job.salary_min?.toLocaleString() || '0'} - ${job.salary_max?.toLocaleString() || '0'} {job.currency}
                    </p>
                  )}
                  <p className="description">{job.description}</p>
                  <div className="job-meta">
                    <p className="date">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </p>
                    <p className="expiry">
                      Expires {new Date(job.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user: User) => {
          setUser(user)
          setShowAuthModal(false)
        }}
      />
    </div>
  )
}

export default App
