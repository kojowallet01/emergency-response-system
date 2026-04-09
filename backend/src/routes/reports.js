const express = require('express');
const multer = require('multer');
const path = require('path');
const Report = require('../models/report');

const router = express.Router();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});
const upload = multer({ storage });

module.exports = (io) => {
  router.post('/report', upload.single('image'), async (req, res) => {
    try {
      const { type, latitude, longitude, description } = req.body;
      if (!type || !latitude || !longitude) return res.status(400).json({ error: 'Missing required fields' });

      const image_url = req.file ? '/uploads/' + req.file.filename : undefined;

      const r = new Report({
        type,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        description,
        image_url
      });
      const saved = await r.save();
      if (io) io.emit('new-report', saved);
      res.json(saved);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.get('/reports', async (req, res) => {
    try {
      const reports = await Report.find().sort({ created_at: -1 }).lean();
      res.json(reports);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  router.patch('/report/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!['pending','responding','resolved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
      const updated = await Report.findByIdAndUpdate(id, { status }, { new: true });
      if (io) io.emit('update-report', updated);
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  return router;
};
