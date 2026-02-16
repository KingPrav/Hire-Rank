const mongoose = require('mongoose');

const weightedSkillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  weight: {
    type: Number,
    required: true,
    min: 0,
    max: 10,
  },
});

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  requiredSkills: [weightedSkillSchema],
  niceToHaveSkills: [weightedSkillSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', jobSchema);
