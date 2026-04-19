const express = require('express');
const multer = require('multer');
const path = require('path');
const { analyzeMatch } = require('../controllers/matchController');
const Analytics = require('../models/Analytics');
const Rating = require('../models/Rating');

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

// GET /api/match/stats — public counter + average rating for the UI
router.get('/stats', async (req, res) => {
  try {
    const [doc, ratingAgg] = await Promise.all([
      Analytics.findOne({}),
      Rating.aggregate([
        { $group: { _id: null, avg: { $avg: '$score' }, count: { $sum: 1 } } }
      ]),
    ]);
    const agg = ratingAgg[0];
    res.json({
      totalAnalyses:  doc?.totalAnalyses || 0,
      averageRating:  agg ? Math.round(agg.avg * 10) / 10 : null,
      totalRatings:   agg?.count || 0,
    });
  } catch {
    res.json({ totalAnalyses: 0, averageRating: null, totalRatings: 0 });
  }
});

// POST /api/match/rate — submit a star rating (1–5) with optional comment
router.post('/rate', async (req, res) => {
  try {
    const { score, comment } = req.body;
    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5.' });
    }
    await Rating.create({ score: Math.round(score), comment: comment?.trim() || '' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
