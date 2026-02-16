import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from './JobDetail.module.css';

export default function JobDetail() {
  const { id } = useParams();
  const { isAuth, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [activeTab, setActiveTab] = useState('rankings');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (!isAuth) {
      navigate('/login');
      return;
    }
    loadData();
  }, [id, isAuth, navigate]);

  const loadData = async () => {
    try {
      const [jobRes, candidatesRes, rankingsRes] = await Promise.all([
        api.get(`/api/jobs/${id}`),
        api.get('/api/candidates', { params: { jobId: id } }),
        api.get(`/api/jobs/${id}/rank`),
      ]);
      setJob(jobRes.data);
      setCandidates(candidatesRes.data);
      setRankings(rankingsRes.data);
    } catch (err) {
      if (err.response?.status === 401) logout();
      else if (err.response?.status === 404) navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setUploadError('Only PDF files are allowed.');
      return;
    }

    setUploadError('');
    setUploading(true);
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('jobId', id);

    try {
      await api.post('/api/candidates/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      loadData();
    } catch (err) {
      setUploadError(err.response?.data?.error || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading || !job) {
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
          <Link to="/dashboard" className={styles.back}>← Dashboard</Link>
          <h1>{job.title}</h1>
          {job.description && <p className={styles.desc}>{job.description}</p>}
        </div>
      </header>

      <div className={styles.uploadSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={styles.uploadBtn}
        >
          {uploading ? 'Uploading...' : '+ Upload Resume (PDF)'}
        </button>
        {uploadError && <span className={styles.uploadError}>{uploadError}</span>}
      </div>

      <div className={styles.tabs}>
        <button
          className={activeTab === 'rankings' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('rankings')}
        >
          Rankings
        </button>
        <button
          className={activeTab === 'candidates' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('candidates')}
        >
          Candidates ({candidates.length})
        </button>
      </div>

      {activeTab === 'rankings' && (
        <div className={styles.rankings}>
          {rankings.length === 0 ? (
            <p className={styles.empty}>Upload resumes to see rankings.</p>
          ) : (
            <div className={styles.rankingList}>
              {rankings.map((r, i) => (
                <div key={r.candidateId} className={styles.rankingCard}>
                  <div className={styles.rankBadge}>#{i + 1}</div>
                  <div className={styles.rankContent}>
                    <h3>{r.name}</h3>
                    <p className={styles.email}>{r.email}</p>
                    <div className={styles.scoreRow}>
                      <span className={styles.score}>Score: {r.score}</span>
                      <span className={styles.match}>{r.matchPercent}% match</span>
                    </div>
                    <div className={styles.skills}>
                      {r.skills?.slice(0, 6).map((s, j) => (
                        <span key={j} className={styles.skillTag}>
                          {s.name} {s.years ? `(${s.years}y)` : ''}
                        </span>
                      ))}
                      {(r.skills?.length || 0) > 6 && (
                        <span className={styles.skillTag}>+{r.skills.length - 6} more</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'candidates' && (
        <div className={styles.candidates}>
          {candidates.length === 0 ? (
            <p className={styles.empty}>No candidates yet.</p>
          ) : (
            <div className={styles.candidateList}>
              {candidates.map((c) => (
                <div key={c._id} className={styles.candidateCard}>
                  <h3>{c.name}</h3>
                  <p className={styles.email}>{c.email}</p>
                  <div className={styles.skills}>
                    {c.skills?.map((s, j) => (
                      <span key={j} className={styles.skillTag}>
                        {s.name} {s.years ? `(${s.years}y)` : ''}
                      </span>
                    ))}
                  </div>
                  <p className={styles.exp}>Total exp: {c.totalExperience || 0} years</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
