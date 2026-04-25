require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Create a .env file or set the environment variable and try again.');
  process.exit(1);
}

const Report = require('./models/report');

async function run() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB for seeding');

    // Sample reports to insert
    const samples = [
      {
        type: 'fire',
        latitude: 5.6037,
        longitude: -0.1870,
        accuracy: 10,
        description: 'Small fire near market',
        responderNumber: '+233501234567',
        media_urls: [],
        media_count: 0,
        status: 'pending'
      },
      {
        type: 'medical',
        latitude: 5.6148,
        longitude: -0.2059,
        accuracy: 12,
        description: 'Person unconscious on the street',
        responderNumber: '+233501234568',
        media_urls: [],
        media_count: 0,
        status: 'pending'
      },
      {
        type: 'crime',
        latitude: 5.6292,
        longitude: -0.1794,
        accuracy: 8,
        description: 'Reported theft at the kiosk',
        responderNumber: '+233501234569',
        media_urls: [],
        media_count: 0,
        status: 'pending'
      }
    ];

    // Insert samples
    const created = await Report.insertMany(samples);
    console.log(`Inserted ${created.length} sample reports`);
  } catch (err) {
    console.error('Seeding failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

run();
