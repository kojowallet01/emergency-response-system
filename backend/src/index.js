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
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

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

const mapGoogleGeocodeResult = (item) => ({
  label: item.formatted_address,
  latitude: item.geometry?.location?.lat,
  longitude: item.geometry?.location?.lng,
  source: 'google'
});

const mapNominatimResult = (item) => ({
  label: item.display_name,
  latitude: Number(item.lat),
  longitude: Number(item.lon),
  source: 'nominatim'
});

const buildQueryVariants = (query) => {
  const base = String(query || '').trim();
  if (!base) return [];

  const withoutHouseNumber = base.replace(/^\s*\d+[a-zA-Z-]*\s+/, '').trim();
  const alajoVariant = base.replace(/aladjo/gi, 'alajo');
  const variants = [
    base,
    withoutHouseNumber,
    alajoVariant,
    `${base}, Accra, Ghana`,
    `${withoutHouseNumber || base}, Accra, Ghana`,
    `${alajoVariant}, Accra, Ghana`,
    `${base}, Ghana`
  ];

  return [...new Set(variants.filter(Boolean))];
};

const fetchGoogleAddressSuggestions = async (query, limit = 5) => {
  if (!GOOGLE_API_KEY) return [];

  const variants = buildQueryVariants(query);

  for (const variant of variants) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(variant)}&components=country:GH&key=${GOOGLE_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) continue;
    const data = await response.json();
    if (!Array.isArray(data.results)) continue;
    const mapped = data.results
      .slice(0, limit)
      .map(mapGoogleGeocodeResult)
      .filter(r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
    if (mapped.length) return mapped;
  }

  return [];
};

const fetchNominatimSuggestions = async (query, limit = 5) => {
  const variants = buildQueryVariants(query);

  const urls = variants.flatMap((variant) => [
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(variant)}&limit=${limit}&addressdetails=1&countrycodes=gh`,
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(variant)}&limit=${limit}&addressdetails=1`
  ]);

  for (const url of urls) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'emergency-response-system/1.0'
      }
    });
    if (!response.ok) continue;
    const data = await response.json();
    if (!Array.isArray(data)) continue;
    const mapped = data.map(mapNominatimResult).filter(r => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
    if (mapped.length) return mapped;
  }

  return [];
};

app.get('/geocode/suggest', async (req, res) => {
  try {
    const query = String(req.query.q || '').trim();
    if (query.length < 3) {
      return res.json([]);
    }

    let suggestions = [];
    if (GOOGLE_API_KEY) {
      suggestions = await fetchGoogleAddressSuggestions(query, 5);
    }
    if (!suggestions.length) {
      suggestions = await fetchNominatimSuggestions(query, 5);
    }

    res.json(suggestions);
  } catch (err) {
    console.error('Geocode suggest error:', err.message);
    res.status(500).json({ error: 'Unable to fetch address suggestions' });
  }
});

app.get('/geocode/resolve', async (req, res) => {
  try {
    const query = String(req.query.address || '').trim();
    if (query.length < 3) {
      return res.status(400).json({ error: 'Address is required' });
    }

    let suggestions = [];
    if (GOOGLE_API_KEY) {
      suggestions = await fetchGoogleAddressSuggestions(query, 1);
    }
    if (!suggestions.length) {
      suggestions = await fetchNominatimSuggestions(query, 1);
    }

    if (!suggestions.length) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json(suggestions[0]);
  } catch (err) {
    console.error('Geocode resolve error:', err.message);
    res.status(500).json({ error: 'Unable to resolve address' });
  }
});

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
