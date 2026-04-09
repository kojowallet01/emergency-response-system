require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 4000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// In-memory store for demo/testing
let reports = [];
let idCounter = 1;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Multer setup for multiple files
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    cb(null, `${timestamp}-${random}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB per file
  fileFilter: (req, file, cb) => {
    // Allow images, videos, and audio
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'audio/wav', 'audio/mpeg', 'audio/ogg'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

// Serve uploads
app.use('/uploads', express.static(uploadsDir));

// Rate limiter
const createLimiter = rateLimit({ windowMs: 60 * 1000, max: 6, message: 'Too many reports' });

// Routes
app.post('/report', createLimiter, upload.any(), (req, res) => {
  try {
    const { type, latitude, longitude, accuracy, description, responderNumber } = req.body;
    if (!type || !latitude || !longitude) {
      return res.status(400).json({ error: 'Missing required fields: type, latitude, longitude' });
    }
    
    // Separate files by type
    let voiceUrl = null;
    let mediaUrls = [];
    let mediaCount = 0;

    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const fileUrl = '/uploads/' + file.filename;
        
        // Check if it's a voice file
        if (file.fieldname === 'voice' || file.mimetype.startsWith('audio/')) {
          voiceUrl = fileUrl;
        } else {
          // Regular media (image/video)
          mediaUrls.push(fileUrl);
        }
      });
      mediaCount = mediaUrls.length;
    }

    const report = {
      _id: String(idCounter++),
      type,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      accuracy: parseFloat(accuracy) || 0,
      description,
      responderNumber,
      voice_url: voiceUrl,
      media_urls: mediaUrls,
      media_count: mediaCount,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    };
    
    reports.push(report);
    io.emit('new-report', report);
    res.json(report);
  } catch (err) {
    console.error('Error creating report:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/reports', (req, res) => {
  try {
    res.json([...reports].reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/report/:id', (req, res) => {
  try {
    const report = reports.find(r => r._id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/report/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending', 'responding', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const report = reports.find(r => r._id === id);
    if (!report) return res.status(404).json({ error: 'Not found' });
    
    report.status = status;
    report.updated_at = new Date();
    io.emit('update-report', report);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

server.listen(PORT, () => {
  console.log('Server started on port ' + PORT);
  console.log('Backend ready for testing!');
});
