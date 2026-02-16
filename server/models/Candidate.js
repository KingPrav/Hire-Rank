const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  years: {
    type: Number,
    default: 0,
    min: 0,
  },
});

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  skills: [skillSchema],
  totalExperience: {
    type: Number,
    default: 0,
    min: 0,
  },
  rawText: {
    type: String,
    default: '',
  },
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  resumePath: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

candidateSchema.index({ job: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
