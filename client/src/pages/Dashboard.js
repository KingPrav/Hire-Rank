import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from './Dashboard.module.css';

export default function Dashboard() {
  const { user, logout, isAuth } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuth) {
      navigate('/login');
      return;
    }
    loadJobs();
  }, [isAuth, navigate]);

  const loadJobs = async () => {
    try {
      const { data } = await api.get('/api/jobs');
      setJobs(data);
    } catch (err) {
      if (err.response?.status === 401) logout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.logo}>HireRank</h1>
          <p className={styles.user}>{user?.email}</p>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          Logout
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.actions}>
          <h2>Your Jobs</h2>
          <Link to="/jobs/new" className={styles.createBtn}>
            + New Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className={styles.empty}>
            <p>No jobs yet. Create your first job to start ranking candidates.</p>
            <Link to="/jobs/new" className={styles.createBtnLarge}>
              Create Job
            </Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {jobs.map((job) => (
              <Link key={job._id} to={`/jobs/${job._id}`} className={styles.card}>
                <h3>{job.title}</h3>
                <p className={styles.desc}>
                  {job.description || 'No description'}
                </p>
                <div className={styles.meta}>
                  <span>{job.requiredSkills?.length || 0} required skills</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
