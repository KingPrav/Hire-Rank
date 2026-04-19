const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  totalAnalyses: { type: Number, default: 0 },
  totalUsers:    { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Analytics', analyticsSchema);
