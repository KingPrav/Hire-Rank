const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  score:   { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 300, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Rating', ratingSchema);
