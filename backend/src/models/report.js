const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  type: { type: String, enum: ['fire','medical','crime'], required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  description: { type: String },
  image_url: { type: String },
  status: { type: String, enum: ['pending','responding','resolved'], default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);
