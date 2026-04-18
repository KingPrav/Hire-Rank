import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import styles from './MatchPage.module.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const LOADING_STEPS = [
  { label: 'Extracting PDF text', sub: 'Reading your resume...' },
  { label: 'Parsing sections', sub: 'Identifying experience, projects & skills...' },
  { label: 'Analyzing experience bullets', sub: 'Inferring what you actually know from what you did...' },
  { label: 'Reconciling skills', sub: 'Merging listed vs. demonstrated skills...' },
  { label: 'Validating & grounding', sub: 'Checking every skill against your resume text...' },
  { label: 'Parsing job description', sub: 'Extracting required & nice-to-have skills...' },
  { label: 'Scoring your fit', sub: 'Calculating weighted match score...' },
];

export default function MatchPage() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jdText, setJdText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const resultsRef = useRef(null);
  const stepTimerRef = useRef(null);

  // Fake step progression while waiting for server — communicates the AI pipeline
  useEffect(() => {
    if (loading) {
      setLoadingStep(0);
      let step = 0;
      // Advance every ~8s, slowing down as we approach the end
      const delays = [3000, 7000, 10000, 10000, 8000, 6000];
      const advance = (i) => {
        if (i >= delays.length) return;
        stepTimerRef.current = setTimeout(() => {
          setLoadingStep(i + 1);
          advance(i + 1);
        }, delays[i]);
      };
      advance(step);
    } else {
      clearTimeout(stepTimerRef.current);
    }
    return () => clearTimeout(stepTimerRef.current);
  }, [loading]);

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') { setResumeFile(file); setError(''); }
    else setError('Please upload a PDF file.');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) { setResumeFile(file); setError(''); }
  };

  const handleAnalyze = async () => {
    if (!resumeFile) return setError('Please upload your resume as a PDF.');
    if (!jdText.trim()) return setError('Please paste a job description.');
    if (jdText.trim().length < 100) return setError('Job description seems too short — paste the full JD for best results.');

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      formData.append('jobDescription', jdText);

      const { data } = await axios.post(`${API_BASE}/api/match`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong — check the server is running and your OpenAI key is set.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setResumeFile(null);
    setJdText('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const scoreColor = (pct) => pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e';
  const scoreLabel = (pct) => pct >= 75 ? 'Strong Match 🎯' : pct >= 50 ? 'Partial Match' : 'Weak Match';
  const scoreBg    = (pct) => pct >= 75 ? 'rgba(16,185,129,0.06)'  : pct >= 50 ? 'rgba(245,158,11,0.06)'  : 'rgba(244,63,94,0.06)';

  return (
    <div className={styles.page}>

      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <span className={styles.navLogo}>⬡</span>
            <span className={styles.navName}>HireRank</span>
          </div>
          <span className={styles.navBadge}>AI-Powered · Free</span>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      {!result && !loading && (
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroPill}>Built for students. Powered by AI.</div>
            <h1 className={styles.heroTitle}>
              One application away<br />
              <span className={styles.heroAccent}>from changing everything.</span>
            </h1>
            <div className={styles.affirmations}>
              <p className={styles.affirmLine}>
                <span className={styles.affirmQuote}>"</span>
                Your dream role doesn't care about your GPA —
                it cares whether your resume speaks its language.
                <span className={styles.affirmQuote}>"</span>
              </p>
              <div className={styles.affirmDivider} />
              <p className={styles.affirmLine}>
                <span className={styles.affirmQuote}>"</span>
                Stop guessing. Know exactly where you stand before you hit send.
                <span className={styles.affirmQuote}>"</span>
              </p>
            </div>
            <div className={styles.heroSteps}>
              {['Upload PDF', 'Paste JD', 'Get your score'].map((s, i) => (
                <div key={s} className={styles.heroStep}>
                  <span className={styles.heroStepNum}>{i + 1}</span>
                  <span className={styles.heroStepLabel}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Main ──────────────────────────────────────────────── */}
      <main className={styles.main}>

        {/* Loading state */}
        {loading && (
          <div className={styles.loadingCard}>
            <div className={styles.loadingOrb} />
            <h2 className={styles.loadingTitle}>Analyzing your resume</h2>
            <p className={styles.loadingHint}>Usually takes 30–60 seconds — the AI is reading your experience, not just matching keywords</p>
            <div className={styles.steps}>
              {LOADING_STEPS.map((step, i) => (
                <div
                  key={step.label}
                  className={`${styles.step} ${i < loadingStep ? styles.stepDone : ''} ${i === loadingStep ? styles.stepActive : ''}`}
                >
                  <span className={styles.stepIcon}>
                    {i < loadingStep ? '✓' : i === loadingStep ? <span className={styles.stepSpinner} /> : <span className={styles.stepDot} />}
                  </span>
                  <div className={styles.stepText}>
                    <span className={styles.stepLabel}>{step.label}</span>
                    {i === loadingStep && <span className={styles.stepSub}>{step.sub}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input form */}
        {!result && !loading && (
          <>
            <div className={styles.inputGrid}>

              {/* Resume upload */}
              <div className={styles.panel}>
                <label className={styles.panelLabel}>Your Resume</label>
                <div
                  className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''} ${resumeFile ? styles.dropzoneFilled : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileSelect} className={styles.hiddenInput} />
                  {resumeFile ? (
                    <div className={styles.fileSelected}>
                      <span className={styles.filePdfIcon}>PDF</span>
                      <div className={styles.fileInfo}>
                        <span className={styles.fileName}>{resumeFile.name}</span>
                        <span className={styles.fileSize}>{(resumeFile.size / 1024).toFixed(0)} KB · ready to analyze</span>
                      </div>
                      <button
                        className={styles.clearFile}
                        onClick={(e) => { e.stopPropagation(); setResumeFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        title="Remove file"
                      >✕</button>
                    </div>
                  ) : (
                    <div className={styles.dropzonePrompt}>
                      <div className={styles.uploadIconWrap}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="17 8 12 3 7 8"/>
                          <line x1="12" y1="3" x2="12" y2="15"/>
                        </svg>
                      </div>
                      <p className={styles.dropText}>Drop your PDF here</p>
                      <p className={styles.dropSub}>or <span className={styles.browseLink}>browse files</span> · max 5 MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* JD input */}
              <div className={styles.panel}>
                <label className={styles.panelLabel}>Job Description</label>
                <div className={styles.textareaWrap}>
                  <textarea
                    className={styles.textarea}
                    placeholder="Paste the full job description here — requirements, responsibilities, everything. The more detail, the more accurate the match."
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                  />
                  {jdText.length > 0 && (
                    <div className={styles.charBadge}>{jdText.length} chars</div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className={styles.errorBanner}>
                <span>⚠</span> {error}
              </div>
            )}

            <div className={styles.ctaRow}>
              <button
                className={`${styles.analyzeBtn} ${(!resumeFile || !jdText.trim()) ? styles.analyzeBtnDisabled : ''}`}
                onClick={handleAnalyze}
                disabled={!resumeFile || !jdText.trim()}
              >
                Analyze My Fit
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{marginLeft: 8}}>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <p className={styles.privacyNote}>🔒 Your resume is deleted immediately after analysis — never stored</p>
            </div>
          </>
        )}

        {/* Results */}
        {result && (
          <div className={styles.results} ref={resultsRef}>

            {/* Score hero */}
            <div className={styles.scoreCard} style={{ background: scoreBg(result.matchPercent), borderColor: scoreColor(result.matchPercent) + '33' }}>
              <div className={styles.scoreLeft}>
                <div className={styles.scoreRing} style={{ '--score-color': scoreColor(result.matchPercent) }}>
                  <svg viewBox="0 0 120 120" className={styles.scoreRingSvg}>
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"/>
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={scoreColor(result.matchPercent)} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(result.matchPercent / 100) * 327} 327`}
                      strokeDashoffset="0"
                      transform="rotate(-90 60 60)"
                      className={styles.scoreArc}
                    />
                  </svg>
                  <div className={styles.scoreInner}>
                    <span className={styles.scoreNum} style={{ color: scoreColor(result.matchPercent) }}>{result.matchPercent}<span className={styles.scorePct}>%</span></span>
                  </div>
                </div>
              </div>
              <div className={styles.scoreRight}>
                <h2 className={styles.scoreLabel} style={{ color: scoreColor(result.matchPercent) }}>
                  {scoreLabel(result.matchPercent)}
                </h2>
                <p className={styles.scoreDetail}>
                  {result.matchedCount} of {result.totalRequired} required skills matched
                </p>
                <div className={styles.scoreBar}>
                  <div className={styles.scoreBarFill} style={{ width: `${result.matchPercent}%`, background: scoreColor(result.matchPercent) }} />
                </div>
                <p className={styles.scorePoints}>{result.score} weighted points</p>
              </div>
            </div>

            {/* AI explanation */}
            <div className={styles.explanationCard}>
              <div className={styles.explanationHeader}>
                <span className={styles.aiTag}>AI Analysis</span>
                <h3 className={styles.explanationTitle}>What this means for you</h3>
              </div>
              <p className={styles.explanationText}>{result.explanation}</p>
            </div>

            {/* Skills grid */}
            <div className={styles.skillsGrid}>

              {result.matchedRequired.length > 0 && (
                <div className={styles.skillCard}>
                  <div className={styles.skillCardHeader}>
                    <span className={styles.skillCardDot} style={{ background: '#10b981' }} />
                    <span className={styles.skillCardTitle}>Required — You Have These</span>
                    <span className={styles.skillCardCount}>{result.matchedRequired.length}</span>
                  </div>
                  <div className={styles.chips}>
                    {result.matchedRequired.map((s) => (
                      <span key={s} className={`${styles.chip} ${styles.chipGreen}`}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.missingRequired.length > 0 && (
                <div className={styles.skillCard}>
                  <div className={styles.skillCardHeader}>
                    <span className={styles.skillCardDot} style={{ background: '#ef4444' }} />
                    <span className={styles.skillCardTitle}>Required — You're Missing These</span>
                    <span className={styles.skillCardCount}>{result.missingRequired.length}</span>
                  </div>
                  <div className={styles.chips}>
                    {result.missingRequired.map((s) => (
                      <span key={s} className={`${styles.chip} ${styles.chipRed}`}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {result.matchedNiceToHave.length > 0 && (
                <div className={styles.skillCard}>
                  <div className={styles.skillCardHeader}>
                    <span className={styles.skillCardDot} style={{ background: '#f59e0b' }} />
                    <span className={styles.skillCardTitle}>Nice-to-Have — You Have These</span>
                    <span className={styles.skillCardCount}>{result.matchedNiceToHave.length}</span>
                  </div>
                  <div className={styles.chips}>
                    {result.matchedNiceToHave.map((s) => (
                      <span key={s} className={`${styles.chip} ${styles.chipAmber}`}>{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* All candidate skills with source badges */}
              <div className={styles.skillCard}>
                <div className={styles.skillCardHeader}>
                  <span className={styles.skillCardDot} style={{ background: '#6366f1' }} />
                  <span className={styles.skillCardTitle}>Skills Detected on Your Resume</span>
                  <span className={styles.skillCardCount}>{result.allCandidateSkills.length}</span>
                </div>
                <div className={styles.sourceLegend}>
                  <span className={styles.legendItem}><span className={styles.legendDot} style={{background:'#10b981'}} /> proven + listed</span>
                  <span className={styles.legendItem}><span className={styles.legendDot} style={{background:'#6366f1'}} /> inferred from bullets</span>
                  <span className={styles.legendItem}><span className={styles.legendDot} style={{background:'#475569'}} /> listed only</span>
                </div>
                <div className={styles.chips}>
                  {result.allCandidateSkills.map((s) => (
                    <span
                      key={s.name}
                      className={`${styles.chip} ${s.source === 'both' ? styles.chipBoth : s.source === 'inferred' ? styles.chipInferred : styles.chipGray}`}
                      title={s.source === 'both' ? 'Proven in bullets + listed in skills section' : s.source === 'inferred' ? `Inferred from your experience (confidence: ${Math.round(s.confidence * 100)}%)` : 'Listed in skills section — not evidenced in bullets yet'}
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Flagged skills */}
            {result.flaggedSkills?.length > 0 && (
              <div className={styles.flaggedSection}>
                <div className={styles.flaggedHeader}>
                  <span className={styles.flaggedIcon}>⚠</span>
                  <div>
                    <h3 className={styles.flaggedTitle}>Resume Improvement Opportunities</h3>
                    <p className={styles.flaggedSub}>The AI couldn't ground these skills in your resume text. Add evidence bullets to make them defensible.</p>
                  </div>
                </div>
                <div className={styles.flaggedList}>
                  {result.flaggedSkills.map((f) => (
                    <div key={f.name} className={styles.flaggedCard}>
                      <div className={styles.flaggedTop}>
                        <span className={styles.flaggedName}>{f.name}</span>
                      </div>
                      <p className={styles.flaggedReason}>{f.reason}</p>
                      <p className={styles.flaggedAdvice}>💡 {f.advice}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.resetRow}>
              <button className={styles.resetBtn} onClick={handleReset}>
                ← Analyze another job
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className={styles.footer}>
        <p>HireRank · Built with LangGraph · gpt-4o-mini · No data stored</p>
      </footer>
    </div>
  );
}
