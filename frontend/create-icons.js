// Simple script to create PWA icons using Canvas API in Node.js
const fs = require('fs');
const { createCanvas } = require('canvas');

// Function to create a simple book icon
function createBookIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, size, size);
  
  // Book stack
  const bookWidth = size * 0.6;
  const bookHeight = size * 0.08;
  const startY = size * 0.3;
  
  const colors = ['#a855f7', '#8b5cf6', '#7c3aed', '#6d28d9'];
  
  colors.forEach((color, index) => {
    ctx.fillStyle = color;
    ctx.fillRect(
      size * 0.2, 
      startY + index * bookHeight, 
      bookWidth, 
      bookHeight
    );
  });
  
  // Open book on top
  const openBookY = size * 0.15;
  const openBookWidth = size * 0.4;
  const openBookHeight = size * 0.2;
  
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(
    size * 0.3, 
    openBookY, 
    openBookWidth, 
    openBookHeight
  );
  
  ctx.strokeStyle = '#a855f7';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    size * 0.3, 
    openBookY, 
    openBookWidth, 
    openBookHeight
  );
  
  return canvas.toBuffer('image/png');
}

// Create icons
try {
  console.log('Creating PWA icons...');
  
  // Create 192x192 icon
  const icon192 = createBookIcon(192);
  fs.writeFileSync('public/logo192.png', icon192);
  
  // Create 512x512 icon
  const icon512 = createBookIcon(512);
  fs.writeFileSync('public/logo512.png', icon512);
  
  console.log('Icons created successfully!');
} catch (error) {
  console.log('Canvas not available, creating placeholder icons...');
  
  // Create simple placeholder files
  fs.writeFileSync('public/logo192.png', Buffer.from(''));
  fs.writeFileSync('public/logo512.png', Buffer.from(''));
}