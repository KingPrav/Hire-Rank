import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import styles from './JobForm.module.css';

const emptySkill = () => ({ name: '', weight: 5 });

export default function JobCreate() {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkills, setRequiredSkills] = useState([emptySkill()]);
  const [niceToHaveSkills, setNiceToHaveSkills] = useState([emptySkill()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!isAuth) navigate('/login');
  }, [isAuth, navigate]);

  const addRequired = () => setRequiredSkills([...requiredSkills, emptySkill()]);
  const addNiceToHave = () => setNiceToHaveSkills([...niceToHaveSkills, emptySkill()]);

  const updateRequired = (i, field, val) => {
    const next = [...requiredSkills];
    next[i] = { ...next[i], [field]: field === 'weight' ? Number(val) || 0 : val };
    setRequiredSkills(next);
  };

  const updateNiceToHave = (i, field, val) => {
    const next = [...niceToHaveSkills];
    next[i] = { ...next[i], [field]: field === 'weight' ? Number(val) || 0 : val };
    setNiceToHaveSkills(next);
  };

  const removeRequired = (i) => setRequiredSkills(requiredSkills.filter((_, idx) => idx !== i));
  const removeNiceToHave = (i) => setNiceToHaveSkills(niceToHaveSkills.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const req = requiredSkills.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), weight: s.weight || 5 }));
      const nice = niceToHaveSkills.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), weight: s.weight || 5 }));
      const { data } = await api.post('/api/jobs', {
        title: title.trim(),
        description: description.trim(),
        requiredSkills: req,
        niceToHaveSkills: nice,
      });
      navigate(`/jobs/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create job.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <Link to="/dashboard" className={styles.back}>← Dashboard</Link>
        <h1>Create Job</h1>
        <form onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.field}>
            <label>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior React Developer"
              required
            />
          </div>
          <div className={styles.field}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Job description..."
              rows={3}
            />
          </div>

          <div className={styles.section}>
            <h3>Required Skills (name, weight 0-10)</h3>
            {requiredSkills.map((s, i) => (
              <div key={i} className={styles.skillRow}>
                <input
                  value={s.name}
                  onChange={(e) => updateRequired(i, 'name', e.target.value)}
                  placeholder="e.g. JavaScript"
                />
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={s.weight}
                  onChange={(e) => updateRequired(i, 'weight', e.target.value)}
                  className={styles.weight}
                />
                <button type="button" onClick={() => removeRequired(i)} className={styles.remove}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={addRequired} className={styles.addBtn}>
              + Add required skill
            </button>
          </div>

          <div className={styles.section}>
            <h3>Nice-to-Have Skills</h3>
            {niceToHaveSkills.map((s, i) => (
              <div key={i} className={styles.skillRow}>
                <input
                  value={s.name}
                  onChange={(e) => updateNiceToHave(i, 'name', e.target.value)}
                  placeholder="e.g. Docker"
                />
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={s.weight}
                  onChange={(e) => updateNiceToHave(i, 'weight', e.target.value)}
                  className={styles.weight}
                />
                <button type="button" onClick={() => removeNiceToHave(i)} className={styles.remove}>
                  ×
                </button>
              </div>
            ))}
            <button type="button" onClick={addNiceToHave} className={styles.addBtn}>
              + Add nice-to-have skill
            </button>
          </div>

          <div className={styles.actions}>
            <button type="button" onClick={() => navigate('/dashboard')} className={styles.cancel}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.submit}>
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
