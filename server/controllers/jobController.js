const Job = require('../models/Job');
const { getRankings } = require('../services/scoringService');

const createJob = async (req, res) => {
  try {
    const { title, description, requiredSkills, niceToHaveSkills } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Job title is required.' });
    }

    const job = await Job.create({
      title,
      description: description || '',
      requiredSkills: requiredSkills || [],
      niceToHaveSkills: niceToHaveSkills || [],
      createdBy: req.user._id,
    });

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'email');

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('createdBy', 'email');
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    if (job.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view this job.' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRank = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }
    if (job.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to view rankings.' });
    }

    const rankings = await getRankings(req.params.id);
    res.json(rankings || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createJob, getJobs, getJobById, getRank };
