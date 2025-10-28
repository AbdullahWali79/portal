import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

interface Job {
  id: number
  title: string
  company: string
  description: string
  location: string
  salary?: string
  created_at: string
}

function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    description: '',
    location: '',
    salary: ''
  })

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const response = await axios.get('/api/jobs')
      setJobs(response.data)
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

  return (
    <div className="app">
      <header className="header">
        <h1>🚀 JobPortal</h1>
        <p>Find your dream job today</p>
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
                  <p className="company">{job.company}</p>
                  <p className="location">📍 {job.location}</p>
                  {job.salary && <p className="salary">💰 {job.salary}</p>}
                  <p className="description">{job.description}</p>
                  <p className="date">
                    Posted {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
