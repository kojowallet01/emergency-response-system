const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  type: { type: String, enum: ['fire','medical','crime'], required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number, default: 0 },
  description: { type: String },
  responderNumber: { type: String },
  voice_url: { type: String },
  media_urls: [{ type: String }],
  media_count: { type: Number, default: 0 },
  status: { type: String, enum: ['pending','responding','resolved'], default: 'pending' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Report', ReportSchema);
