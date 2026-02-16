const path = require('path');
const fs = require('fs').promises;
const Candidate = require('../models/Candidate');
const Job = require('../models/Job');
const { parseResumePDF } = require('../services/resumeParserService');
const { invalidateJobCache } = require('../config/redis');

const uploadsDir = path.join(__dirname, '../../uploads');

const upload = async (req, res) => {
  try {
    const { jobId } = req.body;
    const file = req.file;

    if (!jobId || !file) {
      return res.status(400).json({ error: 'Job ID and PDF file are required.' });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to add candidates to this job.' });
    }

    const parsed = await parseResumePDF(file.path);

    const candidate = await Candidate.create({
      name: parsed.name,
      email: parsed.email,
      skills: parsed.skills,
      totalExperience: parsed.totalExperience,
      rawText: parsed.rawText,
      job: jobId,
      resumePath: file.path,
    });

    await invalidateJobCache(jobId);

    res.status(201).json({
      message: 'Resume uploaded and parsed successfully.',
      candidate: {
        id: candidate._id,
        name: candidate.name,
        email: candidate.email,
        skills: candidate.skills,
        totalExperience: candidate.totalExperience,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getCandidates = async (req, res) => {
  try {
    const { jobId } = req.query;

    const filter = {};
    if (jobId) filter.job = jobId;

    const candidates = await Candidate.find(filter)
      .populate('job', 'title')
      .select('-rawText')
      .sort({ createdAt: -1 });

    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { upload, getCandidates };
