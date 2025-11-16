# HTTPS Setup Guide for BookTarr

## Overview

BookTarr uses **self-signed SSL certificates** for local HTTPS development. This is required for:
- 📱 **Camera API access** (mobile barcode scanning)
- 🔐 **Secure contexts** (required by modern browsers)
- 🌐 **LAN access** from mobile devices on your local network

## Automatic Setup (Already Done!)

The certificates have been **automatically generated** and are valid for:
- ✅ `localhost`
- ✅ `127.0.0.1`
- ✅ Your current LAN IP: `21.0.0.142`
- ✅ `*.local` domains
- ✅ Valid for: **1 year** (until November 16, 2026)

**Certificate Locations:**
- Root: `/certs/`
- Frontend: `/frontend/certs/`

## Manual Steps Required

### 1. Accept Certificate on Desktop Browser (One-time Setup)

When you first visit `https://localhost:3000`, your browser will show a security warning because the certificate is self-signed.

#### Chrome/Edge:
1. You'll see "Your connection is not private"
2. Click **"Advanced"**
3. Click **"Proceed to localhost (unsafe)"**
4. ✅ Done! The certificate is now trusted for this session

#### Firefox:
1. You'll see "Warning: Potential Security Risk Ahead"
2. Click **"Advanced"**
3. Click **"Accept the Risk and Continue"**
4. ✅ Done!

#### Safari:
1. You'll see "This Connection Is Not Private"
2. Click **"Show Details"**
3. Click **"visit this website"**
4. Enter your Mac password if prompted
5. ✅ Done!

### 2. Accept Certificate on Mobile Device (Required for Camera)

To use the barcode scanner on your phone:

#### iOS (iPhone/iPad):
1. **Connect to the same WiFi** as your development machine
2. Open Safari and navigate to: `https://21.0.0.142:3000`
3. You'll see a warning: "This Connection Is Not Private"
4. Tap **"Show Details"**
5. Tap **"visit this website"**
6. Tap **"Visit Website"** again to confirm
7. ✅ Camera scanning will now work!

**Note:** You may need to re-accept the certificate each time you restart the dev server.

#### Android (Chrome/Samsung Internet):
1. **Connect to the same WiFi** as your development machine
2. Open Chrome and navigate to: `https://21.0.0.142:3000`
3. You'll see "Your connection is not private"
4. Tap **"Advanced"**
5. Tap **"Proceed to 21.0.0.142 (unsafe)"**
6. ✅ Camera scanning will now work!

### 3. Optional: Permanently Trust Certificate (Advanced)

If you want to avoid the security warning every time:

#### macOS:
```bash
# Add certificate to system keychain
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain \
  /path/to/booktarr/certs/localhost.pem
```

#### Windows:
1. Open `mmc.exe` (Microsoft Management Console)
2. File → Add/Remove Snap-in
3. Select "Certificates" → Add → Computer account → Local computer
4. Navigate to: Trusted Root Certification Authorities → Certificates
5. Right-click → All Tasks → Import
6. Browse to: `C:\path\to\booktarr\certs\localhost.pem`
7. Complete the wizard

#### Linux (Ubuntu/Debian):
```bash
# Copy certificate to trusted store
sudo cp /path/to/booktarr/certs/localhost.pem \
  /usr/local/share/ca-certificates/booktarr.crt

# Update certificate store
sudo update-ca-certificates
```

#### iOS (Permanent Trust):
1. Email yourself the `localhost.pem` file
2. Open the email on your iPhone and tap the attachment
3. Follow prompts to install the profile
4. Go to: Settings → General → About → Certificate Trust Settings
5. Enable full trust for "localhost"

⚠️ **Warning:** Only permanently trust certificates on devices you control!

## Starting the Development Server

The dev server automatically uses these certificates:

```bash
# Start full development environment with HTTPS
npm run dev

# The server will start at:
# - Desktop: https://localhost:3000
# - Mobile:  https://21.0.0.142:3000
# - Backend: http://localhost:8000 (HTTP only)
```

## Regenerating Certificates

If your LAN IP changes or certificates expire:

```bash
# Clean old certificates
npm run cert:clean

# Generate new certificates
npm run cert:generate

# Or both at once
npm run cert:clean && npm run cert:generate
```

The script will automatically detect your current LAN IP and generate certificates for it.

## Verifying Camera Access

Once HTTPS is working:

1. Navigate to BookTarr in your browser
2. Go to **"Add Book"** → **"Scan Barcode"**
3. Your browser should prompt for camera permission
4. ✅ If you see the camera feed, HTTPS is working correctly!

If the camera doesn't work:
- ✅ Check that URL shows `https://` (not `http://`)
- ✅ Check that you accepted the certificate warning
- ✅ Check browser console for errors (F12 → Console tab)
- ✅ Verify camera permissions are granted (browser settings)

## Troubleshooting

### "ERR_CERT_AUTHORITY_INVALID"
**Solution:** This is expected for self-signed certificates. Click "Advanced" and proceed.

### Camera not working on mobile
**Solution:**
1. Ensure you're using `https://` (not `http://`)
2. Ensure your phone is on the **same WiFi network**
3. Re-accept the certificate warning
4. Check that camera permissions are granted in browser settings

### Certificate expired
**Solution:**
```bash
npm run cert:clean && npm run cert:generate
```

### Wrong IP address in certificate
**Solution:** Your LAN IP changed. Regenerate certificates:
```bash
npm run cert:clean && npm run cert:generate
```

### Backend API calls failing
**Note:** The backend runs on HTTP (port 8000) - this is normal. Only the frontend needs HTTPS for camera access. The frontend proxies API calls to the backend automatically.

## Technical Details

**Certificate Type:** Self-signed RSA 2048-bit
**Validity:** 1 year from generation date
**Includes:**
- Common Name (CN): localhost
- Subject Alternative Names (SAN):
  - DNS: localhost, booktarr.local, *.local
  - IP: 127.0.0.1, [your LAN IP]

**Why self-signed?**
- ✅ Works without internet connection
- ✅ Works on any network (home, office, offline)
- ✅ No domain name required
- ✅ Free and automatic
- ✅ Perfect for local development

**Why not Let's Encrypt?**
- ❌ Requires a public domain name
- ❌ Requires internet connection
- ❌ Requires port 80/443 open to the internet
- ❌ Overkill for local development

## Security Notes

⚠️ **Self-signed certificates are for development only!**

- **DO NOT** use these certificates in production
- **DO NOT** share your private key files
- **DO NOT** permanently trust certificates on shared devices
- **DO** regenerate certificates if they're compromised

For production deployment, use:
- Let's Encrypt (if you have a domain)
- A reverse proxy with proper certificates
- Cloud hosting with automatic HTTPS

## Quick Reference

**Certificate Files:**
- `certs/localhost-key.pem` - Private key (keep secret!)
- `certs/localhost.pem` - Public certificate
- `certs/cert-info.json` - Certificate details

**Commands:**
- `npm run cert:generate` - Generate new certificates
- `npm run cert:clean` - Remove old certificates
- `npm run dev` - Start dev server with HTTPS

**URLs:**
- Desktop: `https://localhost:3000`
- Mobile: `https://[YOUR_LAN_IP]:3000`
- API: `http://localhost:8000`

---

**Need help?** Check the console output when running `npm run dev` - it will show your exact URLs and LAN IP address.
