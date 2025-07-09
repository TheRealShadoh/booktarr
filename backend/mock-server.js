const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = 8000;

// Mock Skoolib URL
const SKOOLIB_URL = 'https://skoolib.net/share/library/d14ba5a0-b081-70ba-a7e4-237b4befefed*library2025-07-07T23:44:27.734Z.1/books';
const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes';

// Enable CORS
app.use(cors());
app.use(express.json());

// In-memory cache
const cache = new Map();

// Helper function to fetch book metadata
async function fetchBookMetadata(isbn) {
  try {
    const response = await axios.get(`${GOOGLE_BOOKS_API}?q=isbn:${isbn}`);
    const data = response.data;
    
    if (data.totalItems > 0) {
      const volume = data.items[0].volumeInfo;
      const saleInfo = data.items[0].saleInfo || {};
      
      return {
        title: volume.title,
        authors: volume.authors || [],
        series: extractSeriesInfo(volume),
        cover_image: volume.imageLinks?.thumbnail,
        pricing: extractPricing(saleInfo)
      };
    }
  } catch (error) {
    console.error('Error fetching from Google Books:', error.message);
  }
  return null;
}

// Extract series info from volume
function extractSeriesInfo(volume) {
  const title = volume.title || '';
  const patterns = [
    /(.+?)\s+(?:Book|Volume|#)\s*(\d+)/i,
    /(.+?)\s+(\d+)/i,
    /(.+?):\s*(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

// Extract pricing info
function extractPricing(saleInfo) {
  if (saleInfo.saleability === 'FOR_SALE' && saleInfo.retailPrice) {
    return { retail: saleInfo.retailPrice.amount };
  }
  return null;
}

// Group books by series
function groupBooksBySeries(books) {
  const seriesMap = new Map();
  const standalone = [];
  
  for (const book of books) {
    if (book.series) {
      if (!seriesMap.has(book.series)) {
        seriesMap.set(book.series, []);
      }
      seriesMap.get(book.series).push(book);
    } else {
      standalone.push(book);
    }
  }
  
  const groups = [];
  for (const [seriesName, seriesBooks] of seriesMap) {
    groups.push({
      series_name: seriesName,
      books: seriesBooks.sort((a, b) => a.title.localeCompare(b.title))
    });
  }
  
  if (standalone.length > 0) {
    groups.push({
      series_name: 'Standalone',
      books: standalone.sort((a, b) => a.title.localeCompare(b.title))
    });
  }
  
  return groups;
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.get('/', (req, res) => {
  res.json({ message: 'Booktarr API', version: '1.0.0' });
});

app.get('/api/books', async (req, res) => {
  try {
    // Check cache first
    const cached = cache.get('all_books');
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return res.json(cached.data);
    }
    
    // Fetch from Skoolib
    let skoolibBooks = [];
    try {
      const response = await axios.get(SKOOLIB_URL);
      skoolibBooks = response.data;
    } catch (error) {
      console.error('Error fetching from Skoolib:', error.message);
      // Return mock data if Skoolib is unavailable
      skoolibBooks = [
        {
          id: '1',
          title: 'The Fellowship of the Ring',
          author: 'J.R.R. Tolkien',
          isbn13: '9780547928210',
          shelves: ['Fantasy', 'Adventure']
        },
        {
          id: '2', 
          title: 'The Two Towers',
          author: 'J.R.R. Tolkien',
          isbn13: '9780547928203',
          shelves: ['Fantasy', 'Adventure']
        },
        {
          id: '3',
          title: 'The Return of the King',
          author: 'J.R.R. Tolkien',
          isbn13: '9780547928197',
          shelves: ['Fantasy', 'Adventure']
        },
        {
          id: '4',
          title: 'Dune',
          author: 'Frank Herbert',
          isbn13: '9780441172719',
          shelves: ['Science Fiction']
        },
        {
          id: '5',
          title: 'The Martian',
          author: 'Andy Weir',
          isbn13: '9780553418026',
          shelves: ['Science Fiction']
        }
      ];
    }
    
    // Enrich with metadata
    const enrichedBooks = [];
    for (const book of skoolibBooks) {
      const isbn = book.isbn13 || book.isbn10;
      let metadata = null;
      
      if (isbn) {
        metadata = await fetchBookMetadata(isbn);
      }
      
      enrichedBooks.push({
        id: book.id || isbn || book.title || 'unknown',
        title: metadata?.title || book.title || 'Unknown Title',
        author: metadata?.authors?.join(', ') || book.author || 'Unknown Author',
        isbn10: book.isbn10 || null,
        isbn13: book.isbn13 || null,
        shelves: book.shelves || [],
        series: metadata?.series || null,
        cover_image: metadata?.cover_image || null,
        pricing: metadata?.pricing || null
      });
    }
    
    // Group by series
    const groupedBooks = groupBooksBySeries(enrichedBooks);
    
    // Cache result
    cache.set('all_books', { data: groupedBooks, timestamp: Date.now() });
    
    res.json(groupedBooks);
  } catch (error) {
    console.error('Error processing books:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Booktarr API server running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Books API: http://localhost:${PORT}/api/books`);
});