// Simple script to create placeholder icon files
const fs = require('fs');
const path = require('path');

// Create a simple 1x1 PNG (we'll replace with real icons later)
// This is a minimal valid PNG file
const createPlaceholderPNG = (size) => {
  // Minimal PNG header + IEND chunk (transparent 1x1 pixel)
  const png = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ]);
  return png;
};

const publicDir = path.join(__dirname, 'frontend', 'public');

// Create icon-192.png
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), createPlaceholderPNG(192));
console.log('✅ Created icon-192.png');

// Create icon-512.png
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), createPlaceholderPNG(512));
console.log('✅ Created icon-512.png');

console.log('\n🎉 Icons created successfully!');
console.log('📝 Note: These are placeholder icons. Replace them with your actual icons later.');
