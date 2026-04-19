const express = require('express');
const multer = require('multer');
const path = require('path');
const { analyzeMatch } = require('../controllers/matchController');
const Analytics = require('../models/Analytics');

const router = express.Router();

// Store uploaded resumes temporarily in /uploads — controller deletes after parsing
const storage = multer.diskStorage({
  destination: path.join(__dirname, '../../uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed.'));
    }
    cb(null, true);
  },
});

// POST /api/match — no auth required (public student tool)
router.post('/', upload.single('resume'), analyzeMatch);

// GET /api/match/stats — public counter for the UI
router.get('/stats', async (req, res) => {
  try {
    const doc = await Analytics.findOne({});
    res.json({
      totalAnalyses: doc?.totalAnalyses || 0,
    });
  } catch {
    res.json({ totalAnalyses: 0 });
  }
});

module.exports = router;
