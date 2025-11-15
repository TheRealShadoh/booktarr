# 📱 Mobile Wishlist Features - Implementation Guide

## Overview

BookTarr now includes three powerful mobile-specific features for book collection management while shopping or browsing online:

1. **Barcode Scanner for Wishlist** - Scan ISBNs to quickly add books to your wishlist
2. **Offline Wishlist** - Add books while offline, automatic sync when back online
3. **Quick Notes with Photos** - Snap photos of series at bookstores with notes

---

## ✨ Features Implemented

### 1. 📱 Barcode Scanner for Wishlist

**What it does:**
- Scan book ISBNs using your device's camera
- Automatically adds scanned books to your wishlist
- Works offline - scans are queued and synced when online
- Shows recent scans for quick reference

**How to use:**
1. Navigate to the "Wanted Books" page
2. Click on the "Wantlist" tab
3. In the "📱 Scan ISBNs" section, click "Scan ISBN for Wishlist"
4. Point your camera at a book barcode
5. The ISBN will be automatically detected
6. Review the detected ISBN and click "Add to Wishlist"
7. Book is added immediately (works offline!)

**Technical Details:**
- Uses `@zxing/library` for barcode detection
- Supports ISBN-13 and ISBN-10 formats
- Camera permission required (browser will prompt)
- Recent scans stored in localStorage
- Automatic sync via offline queue

**Offline Support:**
- ✅ Camera works offline
- ✅ ISBN detection works offline
- ✅ Wishlist additions saved locally
- ✅ Auto-syncs when back online via offline queue

---

### 2. 🛍️ Offline Wishlist Management

**What it does:**
- Full wishlist management while offline
- Automatic sync to backend when online
- Sync status indicator (✓ Synced / ⟳ Syncing / ✗ Error)
- LocalStorage backup for reliability

**How to use:**
1. Navigate to "Wanted Books" → "Wantlist" tab
2. Add books via:
   - ISBN scanner (see above)
   - Manual entry with title, author, ISBN
   - Missing from series quick-add
3. Set priority level (Low/Medium/High)
4. Add notes (e.g., "Looking for hardcover edition")
5. Check sync status at top of page

**Offline Workflow:**
1. Add items to wishlist (works without internet)
2. Items show "⟳ Syncing..." status badge
3. When you're back online:
   - Items automatically sync to backend
   - Status changes to "✓ Synced"
   - Cloud backup ensures no data loss

**Data Persistence:**
- Books stored in backend database
- Local copy in localStorage as backup
- Offline queue ensures reliable sync
- Up to 3 automatic retries for failed syncs

**Features:**
- Set priority levels (low/medium/high)
- Add notes and series information
- Visual sync status indicator
- Remove books with confirmation
- Duplicate detection (won't add same ISBN twice)

---

### 3. 📸 Bookstore Photo Discovery

**What it does:**
- Snap photos of book series you find at bookstores
- Add notes about volume numbers, pricing, availability
- Store photos locally with metadata
- Remember series to look for later
- Optional cloud sync capability

**How to use:**
1. In "Wanted Books" page, click the blue camera button (bottom right)
2. Click "📷 Take Photo"
3. Point your camera at a book series display
4. Click "📸 Capture" to take the photo
5. Fill in the form:
   - **Series Name**: e.g., "Stormlight Archive"
   - **Location**: e.g., "Barnes & Noble Downtown"
   - **Notes**: Volume numbers, prices, availability
6. Click "Save"
7. Photo is stored locally with metadata

**Photo Gallery Features:**
- Browse all captured photos
- View series name and location
- See capture date and notes
- Delete photos anytime
- Sync offline photos to backend
- Search-friendly metadata

**Offline Features:**
- ✅ Full camera access offline
- ✅ Photos stored locally (no internet needed)
- ✅ Manual sync option for offline photos
- ✅ No data loss during sync

**Storage:**
- Photos stored as base64 in localStorage
- Metadata (series name, location, notes) searchable
- Auto-cleanup of old photos available
- Can sync to backend for cloud backup

---

## 🏗️ Architecture

### Component Structure

```
WantedPage.tsx
├── PhotoNotesCapture.tsx
│   ├── Camera initialization
│   ├── Photo capture
│   └── Photo gallery with notes
├── ScannerWishlistButton.tsx
│   ├── Barcode scanning
│   ├── ISBN detection
│   └── Recent scans display
└── Wishlist backend integration
    ├── API persistence
    ├── Offline queue sync
    └── LocalStorage backup
```

### Data Flow

```
User Action
    ↓
Local State Update (immediate)
    ↓
LocalStorage Save (backup)
    ↓
Offline Queue Operation (if online)
    ↓
Backend API Sync
    ↓
Sync Status Update
```

### Offline Support Architecture

```
Online
├── User adds book
├── Update local state
├── Save to localStorage
├── Queue operation
└── Immediate API call

Offline
├── User adds book
├── Update local state
├── Save to localStorage
├── Queue operation
└── Wait for network

Back Online
├── Offline sync service activates
├── Process queued operations
├── Retry with exponential backoff
└── Update sync status
```

---

## 🚀 Backend API Endpoints

New endpoints used (or required for full functionality):

### Wishlist Management
```
POST /api/reading/books/{isbn}/add-to-wishlist
DELETE /api/reading/books/{isbn}/remove-from-wishlist
PUT /api/reading/books/{isbn}/wishlist-notes
GET /api/reading/books/status/want_to_read
```

### Photo Sync (Future)
```
POST /api/photos/upload
POST /api/photos/sync
GET /api/photos
```

---

## 🧪 Testing Guide

### Testing Wishlist Backend Persistence

**Test Offline → Online Sync:**
1. Open DevTools (F12)
2. Network tab → Throttle to "Offline"
3. Add 3 books to wishlist
4. Check status shows "⟳ Syncing..."
5. Refresh page - books should still be there
6. Turn network back online
7. Status should change to "✓ Synced"

**Test Duplicate Prevention:**
1. Scan the same ISBN twice
2. Should only appear once in wishlist
3. Try manual add with same ISBN
4. Should not create duplicate

**Test Offline Data Loss Prevention:**
1. Add books while offline
2. Close browser completely
3. Reopen - wishlist should be restored
4. Books should sync when online

### Testing Barcode Scanner

**Test Scanner Functionality:**
1. Click "Scan ISBN for Wishlist"
2. Try scanning different book barcodes
3. Check ISBN is detected correctly
4. Click "Add to Wishlist"
5. Book appears in list

**Test Offline Scanning:**
1. Turn off network
2. Scan ISBN
3. Book is added to offline wishlist
4. List shows pending sync status
5. Turn network back on
6. Book syncs to backend

**Test Recent Scans:**
1. Scan 5+ different ISBNs
2. Recent scans list shows last 5
3. Dates are correct
4. Clicking a recent scan shows details

### Testing Photo Capture

**Test Basic Photo Capture:**
1. Click camera button (bottom right)
2. Click "📷 Take Photo"
3. Take a photo of something
4. Fill in series name and notes
5. Click "Save"
6. Photo appears in gallery

**Test Offline Photo Storage:**
1. Turn off network
2. Take multiple photos
3. All photos saved locally
4. Refresh page - photos still there
5. Turn network back on
6. Click "Sync Offline" if available

**Test Photo Metadata:**
1. Capture photo with all fields:
   - Series name
   - Location
   - Notes
2. Check gallery shows all metadata
3. Notes are searchable and editable

### Testing Sync Status

**Test Status Indicators:**
1. Add book online - shows "✓ Synced" immediately
2. Add book offline - shows "⟳ Syncing..."
3. Simulate network error - shows "✗ Error"
4. Network recovers - status updates to "✓ Synced"

---

## 🔧 Browser Requirements

### Camera Access
- Modern browser with `MediaDevices` API support:
  - Chrome/Edge 55+
  - Firefox 55+
  - Safari 14.5+ (iOS)
  - Samsung Internet 8+

### Barcode Scanning
- Browser support for `@zxing/library`:
  - All modern browsers
  - Requires HTTPS or localhost (for camera access)

### LocalStorage
- Minimum 5MB for wishlist and photos (browser dependent)
- Usually 5-10MB available on most devices

### Mobile Considerations
- ✅ Touch-optimized UI
- ✅ Camera works on mobile browsers
- ✅ PWA installable
- ✅ Works offline
- ✅ Responsive design

---

## 📝 Usage Scenarios

### Scenario 1: Bookstore Shopping
```
1. Visit bookstore
2. Find interesting series on shelf
3. Use "📱 Scan ISBNs" to scan covers
4. Add to wishlist (works offline!)
5. Take photo of full series with notes about volumes
6. Review wishlist later when home
7. Sync happens automatically when online
```

### Scenario 2: Online Browsing
```
1. Browsing Amazon Kindle books
2. Find series you want
3. Add to wishlist via scanner (if barcode visible)
4. Or manually add with ISBN from product page
5. Set priority if looking for specific edition
6. Automatic backend sync
```

### Scenario 3: Series Tracking
```
1. Capture photo of series at bookstore
2. Note which volumes you found and their prices
3. Track which ones you already own
4. Use "Missing From Series" view to see gaps
5. Plan your future purchases
```

---

## 🐛 Troubleshooting

### Camera Permission Denied
- **Problem**: "Unable to access camera" error
- **Solution**:
  1. Check browser camera permissions
  2. Allow camera access when prompted
  3. For HTTPS sites, ensure you're on secure connection
  4. Try in incognito/private mode if still blocked

### ISBN Not Detected
- **Problem**: Barcode not scanning
- **Solution**:
  1. Ensure barcode is well-lit
  2. Keep barcode centered in frame
  3. Try moving phone closer/further away
  4. Adjust lighting (no glare on barcode)
  5. Try manual ISBN entry as alternative

### Wishlist Not Syncing
- **Problem**: "⟳ Syncing..." won't change to "✓ Synced"
- **Solution**:
  1. Check internet connection
  2. Check browser console for errors
  3. Refresh page
  4. Check if backend is running
  5. Try removing and re-adding the item

### Photos Not Saving
- **Problem**: Photos deleted after closing browser
- **Solution**:
  1. Check browser allows localStorage
  2. Disable private/incognito mode
  3. Increase available storage
  4. Try clearing cache and reloading
  5. Use Firefox or Chrome if possible

### Sync Error After Long Offline Period
- **Problem**: Items won't sync after being offline for days
- **Solution**:
  1. Backend may have been updated
  2. Try manually re-adding items
  3. Clear localStorage and refresh
  4. Contact developer if issue persists

---

## 🚀 Future Enhancements

Potential improvements for next versions:

1. **Cloud Photo Sync**
   - Upload photos to cloud storage
   - Cloud backup of wishlist data
   - Photo gallery in web interface

2. **Series Discovery**
   - Automatic series detection from photo
   - Price tracking across books
   - Availability alerts

3. **Wishlist Sharing**
   - Share wishlist with friends
   - Public wishlist profiles
   - Gift registry features

4. **Advanced Search**
   - Search by photo metadata
   - Location-based recommendations
   - Price comparison

5. **Mobile App**
   - Native iOS/Android apps
   - Better camera integration
   - Push notifications

6. **Social Features**
   - Wishlist recommendations
   - Community bookstore finds
   - Reading community

---

## 📞 Support

For issues or questions about mobile features:
1. Check this guide first
2. Check browser console for error messages
3. Test in another browser
4. Report bugs with:
   - Browser/device info
   - Steps to reproduce
   - Error messages
   - Screenshot

---

## 📚 Technical Documentation

### Component Props

#### ScannerWishlistButton
```typescript
interface ScannerWishlistButtonProps {
  onISBNScanned?: (isbn: string) => void;      // Called when ISBN detected
  onError?: (error: string) => void;            // Called on camera errors
  onAddedToWishlist?: (isbn: string, title?: string) => void;  // Called when added
}
```

#### PhotoNotesCapture
```typescript
interface PhotoNotesCaptureProps {
  onCapture?: (photo: PhotoNote) => void;  // Called when photo saved
  onClose?: () => void;                    // Called when modal closes
}

interface PhotoNote {
  id: string;                  // Unique identifier
  imageData: string;           // Base64 encoded image
  notes?: string;              // User notes
  timestamp: number;           // Capture time
  seriesName?: string;         // Series name
  location?: string;           // Bookstore location
  isSynced?: boolean;          // Sync status
}
```

### Local Storage Keys
```
booktarr_wantlist          // Wishlist backup
booktarr_photo_notes       // Photo metadata
booktarr_scanner_wishlist  // Recent scans
```

---

## ✅ Implementation Checklist

- [x] Barcode scanner component with ISBN detection
- [x] Scanner integration with wishlist
- [x] Photo capture with camera access
- [x] Photo notes and metadata
- [x] Offline wishlist storage
- [x] Backend API integration
- [x] Offline queue support
- [x] Sync status indicators
- [x] LocalStorage backup
- [x] Recent scans history
- [x] Photo gallery
- [x] Error handling
- [x] Mobile-optimized UI
- [ ] Cloud photo sync (future)
- [ ] Advanced series recognition (future)

---

## 📄 License

Part of BookTarr project. See main LICENSE file for details.
