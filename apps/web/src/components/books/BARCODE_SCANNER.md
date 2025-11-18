# Barcode Scanner Component

## Overview

The Barcode Scanner component enables users to add books to their library by scanning ISBN barcodes using their device camera. It integrates seamlessly with the existing ISBN search functionality.

## Features

- 📷 **Camera Access**: Uses device camera (back camera on mobile)
- 📊 **ISBN Detection**: Supports ISBN-10, ISBN-13, and EAN-13 formats
- ✍️ **Manual Entry**: Fallback option to manually enter ISBN
- 🔄 **Auto-Search**: Automatically searches for book after successful scan
- 📱 **Mobile Optimized**: Designed for mobile devices with touch-friendly UI

## Usage

### In Add Book Dialog

The barcode scanner is integrated into the "Add Book" dialog as a third tab:

1. Click "Add Book" button in library
2. Select "Scan Barcode" tab
3. Click "Start Scanning" to activate camera
4. Position barcode within the frame
5. Scanner automatically detects and searches for the book

### Manual Entry Fallback

If camera access is unavailable or scanning fails:

1. Use the "Manual Entry" input field below the scanner
2. Enter ISBN-10 or ISBN-13
3. Click "Search and Add" button

## Integration

### With Existing ISBN Search

The barcode scanner integrates with the existing ISBN search by:

1. Decoding barcode to ISBN string
2. Passing ISBN to the same `POST /api/books` endpoint
3. Using the same book metadata enrichment services
4. Maintaining format and ownership status selections

### Code Example

```typescript
import { BarcodeScanner } from './barcode-scanner';

function MyComponent() {
  const handleScan = (isbn: string) => {
    // ISBN is automatically passed to book search
    console.log('Scanned ISBN:', isbn);
  };

  return (
    <BarcodeScanner
      onScan={handleScan}
      onError={(error) => console.error(error)}
    />
  );
}
```

## Barcode Detection Library

### Current Status

The component includes the camera interface and ISBN extraction logic. For full barcode detection, install the ZXing library:

```bash
npm install @zxing/browser
```

### Why ZXing?

- **Browser-native**: Works in all modern browsers
- **No server required**: Client-side barcode detection
- **Multiple formats**: Supports EAN-13, UPC-A, CODE-128, and more
- **Well-maintained**: Active community and regular updates

### Implementation with ZXing

After installing `@zxing/browser`, update the `decodeBarcode` function in `barcode-scanner.tsx`:

```typescript
import { BrowserMultiFormatReader } from '@zxing/browser';

const codeReader = new BrowserMultiFormatReader();

const decodeBarcode = async (canvas: HTMLCanvasElement): Promise<string | null> => {
  try {
    const result = await codeReader.decodeFromCanvas(canvas);
    return result?.getText() || null;
  } catch (err) {
    return null;
  }
};
```

## Supported Barcode Formats

| Format | Description | Example |
|--------|-------------|---------|
| **ISBN-13** | 13-digit ISBN | 978-0-316-76917-4 |
| **ISBN-10** | 10-digit ISBN | 0-316-76917-0 |
| **EAN-13** | European Article Number | Same as ISBN-13 |

## Camera Permissions

### HTTPS Requirement

Modern browsers require HTTPS for camera access. Ensure your app is served over HTTPS in production.

### Development with HTTPS

For local development with camera access:

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Start Next.js with HTTPS
NODE_OPTIONS='--require ./https-dev-server.js' npm run dev
```

### Permission Prompts

On first use, the browser will prompt users to grant camera access. Users must:

1. Click "Allow" when prompted
2. Grant camera permissions in browser settings if previously denied

## Mobile Considerations

### Back Camera

The scanner automatically requests the back camera on mobile devices:

```typescript
{
  facingMode: 'environment' // Uses back camera
}
```

### Responsive Design

The component is fully responsive and includes:

- Touch-friendly buttons
- Optimized camera viewport
- Mobile-specific error messages

## Accessibility

- **Keyboard Navigation**: All controls accessible via keyboard
- **Screen Readers**: Proper ARIA labels and descriptions
- **High Contrast**: Works with high contrast modes
- **Alternative Methods**: Manual entry always available

## Error Handling

The component handles various error scenarios:

| Error | User Message | Solution |
|-------|--------------|----------|
| **No Camera** | "Camera access required" | Use manual entry |
| **Permission Denied** | "Camera permissions denied" | Check browser settings |
| **HTTPS Required** | "HTTPS required for camera" | Use HTTPS |
| **Invalid Barcode** | "Could not read barcode" | Try better lighting |

## Testing

### E2E Tests

Run barcode scanner tests:

```bash
npm run test:e2e barcode-scanner.spec.ts
```

Test coverage includes:

- Tab visibility and navigation
- Manual ISBN entry
- Camera permission handling
- Format and status selectors
- Mobile responsiveness

### Manual Testing Checklist

- [ ] Camera activates when clicking "Start Scanning"
- [ ] Video stream shows in viewport
- [ ] Scanning frame overlay visible
- [ ] Barcode detection works with test ISBN
- [ ] Manual entry works when camera unavailable
- [ ] Format selector options appear
- [ ] Status selector works correctly
- [ ] Book search triggered after scan
- [ ] Error messages display appropriately

## Future Enhancements

- [ ] QR code support for book data
- [ ] Batch scanning mode
- [ ] Scan history
- [ ] Offline scanning with sync
- [ ] Custom barcode formats
- [ ] Scan statistics

## Troubleshooting

### Scanner Not Starting

1. Check browser supports MediaDevices API
2. Verify HTTPS is being used
3. Check camera permissions in browser settings
4. Try different browser

### Poor Detection Rate

1. Ensure good lighting
2. Hold camera steady
3. Keep barcode in frame
4. Clean camera lens
5. Try manual entry as fallback

### Camera Shows Black Screen

1. Check if another app is using camera
2. Restart browser
3. Check browser camera permissions
4. Try different camera (if multiple available)

## Resources

- [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices)
- [ZXing Browser](https://github.com/zxing-js/browser)
- [ISBN Standards](https://www.isbn-international.org/)
- [Barcode Best Practices](https://www.gs1.org/standards/barcodes)
