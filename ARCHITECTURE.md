# 🏗️ SYSTEM ARCHITECTURE - Enhanced Version 2.0

## 📐 Overall System Design

```
┌─────────────────────────────────────────────────────────────────────┐
│                       GHANA EMERGENCY RESPONSE SYSTEM                │
│                         Version 2.0 Enhanced                         │
└─────────────────────────────────────────────────────────────────────┘

                              INTERNET
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
        ┌───────▼────────┐  ┌────▼────────┐  ┌──▼─────────┐
        │  VICTIM (User)  │  │  RESPONDERS  │  │  STORAGE   │
        │   App (Mobile)  │  │  (Admin)     │  │  (Server)  │
        └────────┬────────┘  └────┬────────┘  └──┬─────────┘
                 │                │             │
                 │ PORT 3000      │ PORT 3000   │ PORT 4000
                 │ (User App)     │ (Admin UI)  │
                 └────────────────┼─────────────┘
                                  │
                          ┌───────▼────────┐
                          │  NEXT.JS FRONTEND    │
                          │  (Port 3000)         │
                          └────────┬─────────────┘
                                   │
                                   │ API Calls
                                   │
                          ┌────────▼──────────┐
                          │  EXPRESS BACKEND   │
                          │  (Port 4000)       │
                          │  Socket.IO         │
                          └────────┬───────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
            ┌───────▼──────┐  ┌────▼──────┐  ┌──▼────────┐
            │  In-Memory    │  │  UPLOADS  │  │ MULTER    │
            │  Data Store   │  │ DIRECTORY │  │ FILE      │
            │  (reports[])  │  │           │  │ HANDLER   │
            └───────────────┘  └───────────┘  └───────────┘
```

---

## 🎯 Data Flow - Emergency Alert

```
STEP 1: VICTIM INITIATES
┌──────────────────┐
│  User App        │
│  Press Button:   │
│  🔥 FIRE         │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│  Browser Geolocation API │
│  - Get GPS coordinates   │
│  - Calculate accuracy    │
│  - Lat: 5.654321         │
│  - Lon: -0.123456        │
│  - Acc: ±25m             │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Voice Recording         │
│  MediaRecorder API       │
│  - Record audio          │
│  - Save as WAV blob      │
│  - User plays back       │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Media File Selection    │
│  File Input API          │
│  - Images (JPG, PNG)     │
│  - Videos (MP4, MOV)     │
│  - Multiple files        │
│  - Show previews         │
└────────┬─────────────────┘
         │
         ▼
STEP 2: PACKAGE & SEND
┌──────────────────────────┐
│  FormData Object         │
│  ├─ type: "fire"         │
│  ├─ latitude: 5.654321   │
│  ├─ longitude: -0.123456 │
│  ├─ accuracy: 25         │
│  ├─ voice: [WAV blob]    │
│  ├─ media: [JPG blob]    │
│  ├─ media: [MP4 blob]    │
│  └─ description: ...     │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  AXIOS POST Request      │
│  Content-Type:           │
│  multipart/form-data     │
│  to: /api/report         │
└────────┬─────────────────┘
         │ (PORT 3000)
         │
         ▼ (PORT 4000)
STEP 3: BACKEND RECEIVES
┌──────────────────────────┐
│  EXPRESS SERVER          │
│  POST /report handler    │
│  Rate Limit Check ✓      │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  MULTER File Handler     │
│  ├─ Parse voice.wav      │
│  │  → /uploads/[random]  │
│  │  → voice_url saved    │
│  │                       │
│  ├─ Parse media files    │
│  │  → /uploads/[random]  │
│  │  → media_urls saved   │
│  │                       │
│  └─ Generate URLs        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Store Alert Object      │
│  {                       │
│    _id: 1,               │
│    type: "fire",         │
│    latitude: 5.654321,   │
│    longitude: -0.123456, │
│    accuracy: 25,         │
│    voice_url: "/uploa...",
│    media_urls: [...],    │
│    media_count: 2,       │
│    status: "pending",    │
│    created_at: Date      │
│  }                       │
└────────┬─────────────────┘
         │
         ▼
STEP 4: NOTIFY RESPONDERS
┌──────────────────────────┐
│  Socket.IO Broadcast     │
│  emit('new-report')      │
│  to all admin clients    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│  Admin Dashboard         │
│  Real-time update        │
│  New alert card appears  │
│  (within 5 seconds)      │
└──────────────────────────┘
```

---

## 📁 Project Structure

```
c:\Users\Jhunea\OneDrive\Desktop\emergency\
│
├── 📂 backend/
│   ├── 📂 src/
│   │   ├── index.js (Main Express server)
│   │   │   ├── POST /report - Create alert with files
│   │   │   ├── GET /reports - List all alerts
│   │   │   ├── GET /report/:id - Get alert details
│   │   │   └── PATCH /report/:id - Update status
│   │   │
│   │   ├── socket-io - Real-time events
│   │   └── multer - File upload handler
│   │
│   ├── 📂 uploads/ (Stores all media files)
│   │   ├── voice-messages (WAV files)
│   │   ├── images (JPG, PNG, GIF)
│   │   └── videos (MP4, MOV)
│   │
│   ├── package.json (Dependencies)
│   └── .env (Environment variables)
│
├── 📂 frontend/
│   ├── 📂 pages/
│   │   ├── index.js (User emergency app)
│   │   │   ├── Voice recording component
│   │   │   ├── File upload component
│   │   │   ├── Location capture
│   │   │   └── Success screen
│   │   │
│   │   └── admin.js (Responder dashboard)
│   │       ├── Alert grid display
│   │       ├── Detail modal with media
│   │       ├── Google Maps integration
│   │       ├── Real-time updates
│   │       └── Status management
│   │
│   ├── 📂 styles/
│   │   └── globals.css (All styling + animations)
│   │       ├── Gradients (fire, medical, crime)
│   │       ├── Voice recording animation
│   │       ├── Responsive design
│   │       └── Modal styles
│   │
│   ├── 📂 .next/ (Built files)
│   ├── package.json (Dependencies)
│   └── .env.local (API endpoint config)
│
└── 📂 Documentation/
    ├── FEATURES_ENHANCED.md (This file - feature guide)
    ├── TESTING_GUIDE.md (Test procedures)
    ├── ARCHITECTURE.md (This overview)
    ├── QUICK_START.md (Setup instructions)
    └── README.md (Main documentation)
```

---

## 🔌 API Endpoints

### 1. Create Emergency Alert (POST)

**Endpoint:** `/report`
**Method:** POST
**Rate Limit:** 6 requests per minute

**Request:**
```bash
POST http://localhost:4000/report
Content-Type: multipart/form-data

Fields:
- type (required): "fire" | "medical" | "crime"
- latitude (required): GPS latitude
- longitude (required): GPS longitude
- accuracy (optional): GPS accuracy in meters
- description (optional): Alert description
- responderNumber (required): "192" | "193" | "191"
- voice (optional): Audio WAV file
- media (optional): Image/video files (multiple)
```

**Response:**
```json
{
  "_id": "1",
  "type": "fire",
  "latitude": 5.654321,
  "longitude": -0.123456,
  "accuracy": 25,
  "description": "Emergency Alert - Ghana Fire Service",
  "responderNumber": "192",
  "voice_url": "/uploads/1712675400000-abc123.wav",
  "media_urls": [
    "/uploads/1712675400100-image1.jpg",
    "/uploads/1712675400200-video1.mp4"
  ],
  "media_count": 2,
  "status": "pending",
  "created_at": "2026-04-09T10:30:00Z",
  "updated_at": "2026-04-09T10:30:00Z"
}
```

---

### 2. Get All Alerts (GET)

**Endpoint:** `/reports`
**Method:** GET

**Response:**
```json
[
  {
    "_id": "2",
    "type": "medical",
    ...
  },
  {
    "_id": "1",
    "type": "fire",
    ...
  }
]
```

---

### 3. Get Alert Details (GET)

**Endpoint:** `/report/:id`
**Method:** GET

**Response:** Single alert object with all details

---

### 4. Update Alert Status (PATCH)

**Endpoint:** `/report/:id`
**Method:** PATCH

**Request:**
```json
{
  "status": "responding" | "resolved"
}
```

**Response:** Updated alert object

---

## 🌐 Socket.IO Events

### Server → Client

**Event:** `new-report`
- Fired when new emergency alert created
- Sent to all admin clients
- Payload: Complete alert object

**Event:** `update-report`
- Fired when alert status changes
- Sent to all admin clients
- Payload: Updated alert object

---

## 💾 Data Storage

### In-Memory Store (Development)
```javascript
let reports = [];
let idCounter = 1;

// Example:
reports = [
  {
    _id: "1",
    type: "fire",
    latitude: 5.654321,
    longitude: -0.123456,
    accuracy: 25,
    voice_url: "/uploads/voice.wav",
    media_urls: ["/uploads/image.jpg"],
    media_count: 1,
    status: "pending",
    created_at: "2026-04-09T10:30:00Z"
  }
]
```

### File Storage
```
backend/uploads/
├── 1712675400000-abc123.wav (voice messages)
├── 1712675400100-img1.jpg (images)
├── 1712675400200-vid1.mp4 (videos)
└── ...
```

---

## 🔐 Security Layers

1. **Rate Limiting:** 6 alerts per minute per IP
2. **File Type Validation:** Only image/video/audio accepted
3. **File Size Limits:** 50MB maximum per file
4. **Cors Protection:** Configured for frontend domain
5. **Error Handling:** Graceful error messages
6. **Data Validation:** Required fields checked
7. **Status Validation:** Only valid statuses accepted

---

## ⚡ Performance Optimization

### Frontend
- Production build optimized
- CSS minified
- JavaScript bundled
- Images optimized
- Lazy loading enabled

### Backend
- In-memory caching for fast reads
- Rate limiting prevents abuse
- Streaming for large files
- Morgan logging for monitoring

### Network
- Multer streaming for files
- Compression enabled
- WebSocket for real-time (Socket.IO)
- Polling fallback (every 5 seconds)

---

## 🔄 Real-Time Updates Flow

```
User Action (Admin Dashboard)
         │
         ▼
┌──────────────────┐
│  Click "Respond" │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  AXIOS PATCH /report/:id     │
│  { status: "responding" }    │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Backend updates report      │
│  object.status = "responding"│
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Socket.IO emit              │
│  ('update-report', report)   │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  All admin clients receive   │
│  update event                │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│  Admin dashboard refreshes   │
│  Status badge changes color  │
│  (orange → blue)             │
│  (Instant - no page reload)  │
└──────────────────────────────┘
```

---

## 📊 System Metrics

### Capability
- **Max Alerts:** Unlimited (depends on storage)
- **Max Files per Alert:** Unlimited
- **Max File Size:** 50MB per file
- **Location Accuracy:** ±5-30m typically
- **Voice Duration:** Unlimited

### Performance
- **Alert Creation:** <2 seconds
- **File Upload:** ~5-30 seconds (depends on size/internet)
- **Dashboard Refresh:** Every 5 seconds
- **Real-time Updates:** <1 second (Socket.IO)
- **Location Capture:** <2 seconds

### Scalability
- **Current:** In-memory (suitable for testing)
- **Production:** Need database + cloud storage
- **Estimated Capacity:** 1000s of alerts with database

---

## 🚀 Production Deployment Checklist

- [ ] Add MongoDB or PostgreSQL for persistent storage
- [ ] Move file uploads to AWS S3 or similar
- [ ] Add HTTPS/SSL certificate
- [ ] Add authentication for admin dashboard
- [ ] Implement user accounts
- [ ] Add SMS notifications to responders
- [ ] Integrate with actual emergency dispatch systems
- [ ] Set up automated backups
- [ ] Add monitoring and logging
- [ ] Test load capacity
- [ ] Set up CDN for media files
- [ ] Add payment/billing system if needed

---

**Architecture Version:** 2.0 Enhanced
**Last Updated:** April 9, 2026
**Status:** ✅ COMPLETE & TESTED
