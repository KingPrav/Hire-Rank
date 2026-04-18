const express = require('express');
const cors = require('cors');
const multer = require('multer');

const matchRoutes = require('./routes/matchRoutes');

// Legacy recruiter routes — kept but no longer surfaced in the UI
const authRoutes = require('./routes/authRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const jobRoutes = require('./routes/jobRoutes');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Student-facing match endpoint (public, no auth)
app.use('/api/match', matchRoutes);

// Legacy routes
app.use('/api/auth', authRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/jobs', jobRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max 5MB.' });
    }
  }
  if (err.message === 'Only PDF files are allowed.') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: err.message || 'Server error.' });
});

module.exports = app;
