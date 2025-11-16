# BookTarr Quick Start Guide

## First Time Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Generate SSL Certificates (Already Done!)

✅ Certificates have already been generated and are valid until **November 16, 2026**

To verify:
```bash
npm run cert:test
```

To regenerate if needed:
```bash
npm run cert:generate
```

### 3. Start Development Server

```bash
# Start both frontend and backend
npm run dev
```

The development server will start at:
- **Desktop:** `https://localhost:3000`
- **Mobile:** `https://21.0.0.142:3000` (use your actual LAN IP shown in console)
- **Backend API:** `http://localhost:8000`

## Accessing from Desktop Browser

When you first visit `https://localhost:3000`, you'll see a security warning:

1. Click **"Advanced"** (Chrome/Edge) or equivalent
2. Click **"Proceed to localhost"** or **"Accept Risk"**
3. ✅ You're in!

## Accessing from Mobile (For Camera Scanning)

### Prerequisites:
- ✅ Your phone must be on the **same WiFi network** as your computer
- ✅ Note the IP address shown when you run `npm run dev` (e.g., `21.0.0.142`)

### Steps:
1. On your phone, open your browser (Safari for iOS, Chrome for Android)
2. Navigate to: `https://[YOUR_IP]:3000` (e.g., `https://21.0.0.142:3000`)
3. You'll see a security warning - this is expected for self-signed certificates
4. Tap **"Advanced"** → **"Proceed"** (or equivalent on your device)
5. ✅ Camera scanning will now work!

**Note:** You may need to accept the certificate warning each time you restart the dev server or if your IP changes.

## Testing Camera Access

1. Navigate to **"Add Book"** in the app
2. Click/tap **"Scan Barcode"**
3. Your browser will prompt for camera permission - **Allow it**
4. ✅ If you see the camera feed, everything is working!

## Common Commands

```bash
# Development
npm run dev              # Start full dev environment with HTTPS
npm run dev:frontend     # Frontend only
npm run dev:backend      # Backend only

# Certificates
npm run cert:test        # Verify HTTPS configuration
npm run cert:generate    # Generate new certificates
npm run cert:clean       # Remove old certificates

# Testing
npm run test             # Run all tests
npm run test:e2e         # Run end-to-end tests

# Build
npm run build            # Build for production
npm run start:prod       # Run production server
```

## Troubleshooting

### Camera not working
- Ensure you're using `https://` (not `http://`)
- Check that you accepted the certificate warning
- Verify camera permissions in browser settings
- Make sure your device is on the same WiFi network

### Certificate expired or wrong IP
```bash
npm run cert:clean && npm run cert:generate
```

### Port already in use
```bash
# Find and kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port (edit frontend/package.json)
```

### Backend not responding
```bash
# Check if backend is running
curl http://localhost:8000/api/health

# Restart backend only
npm run dev:backend
```

## Next Steps

1. ✅ **Read HTTPS_SETUP_GUIDE.md** for detailed certificate information
2. ✅ **Check CLAUDE.md** for complete project documentation
3. ✅ **Visit the app** and start adding books!

## File Structure

```
booktarr/
├── frontend/          # React frontend application
│   ├── src/          # Source code
│   ├── certs/        # SSL certificates (auto-generated)
│   └── public/       # Static assets
├── backend/          # Python FastAPI backend
│   ├── main.py       # FastAPI application
│   ├── routes/       # API endpoints
│   └── models/       # Database models
├── certs/            # Root SSL certificates
├── scripts/          # Development scripts
└── package.json      # Root package configuration
```

## Important Notes

⚠️ **Self-signed certificates are for development only!**
- These certificates will show security warnings - this is normal
- Only accept these warnings on your own devices
- For production, use proper SSL certificates (Let's Encrypt, etc.)

🔐 **Never commit certificates to version control!**
- Certificates are in `.gitignore`
- Regenerate certificates on each development machine

📱 **Mobile camera requires HTTPS:**
- Modern browsers require HTTPS to access camera
- Self-signed certificates work perfectly for this
- You just need to accept the security warning once

---

**Need more help?**
- See **HTTPS_SETUP_GUIDE.md** for detailed HTTPS setup
- See **CLAUDE.md** for complete project documentation
- Check the console output when running `npm run dev`
