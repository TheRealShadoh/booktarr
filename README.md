# 📚 BookTarr - Full-Stack Book Collection Management System

<div align="center">

![BookTarr Logo](https://via.placeholder.com/200x100/2563eb/ffffff?text=BookTarr)

**A modern, feature-complete book collection management system with React frontend, Python FastAPI backend, and comprehensive testing.**

[![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.8%2B-blue)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-green)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Latest-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## ✨ Features

### 📖 Book Management
- **Multi-source Search**: Search by ISBN, title, author, or series using Google Books, OpenLibrary, and AniList APIs
- **Barcode Scanning**: Mobile camera support for ISBN scanning with HTTPS
- **Metadata Enrichment**: Automatic metadata fetching and enhancement from multiple sources
- **Series Tracking**: Complete series management with volume tracking and completion status
- **Reading Progress**: Track reading status, progress, ratings, and notes

### 🔍 Search & Discovery
- **Advanced Search**: Filter by genre, author, series, reading status, and more
- **Intelligent Series Detection**: Automatically detects manga/light novel volume numbers
- **Cover Art Management**: Automatic cover download, caching, and thumbnail generation
- **Release Calendar**: Track upcoming releases from tracked series

### 📱 Modern Interface
- **Progressive Web App**: Install as a native app on mobile and desktop
- **Responsive Design**: Works perfectly on phones, tablets, and desktop
- **Dark/Light Themes**: Customizable themes and UI preferences
- **Offline Support**: Works without internet connection using cached data

### 🔧 Developer Experience
- **Cross-Platform**: Works on Windows, Linux, macOS, and containers
- **Dynamic IP Detection**: Automatically configures for any network
- **HTTPS Development**: Self-signed certificates for mobile camera access
- **Comprehensive Testing**: E2E tests with Playwright and visual verification
- **Hot Reload**: Both frontend and backend support live development

## 🚀 Quick Start

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/your-username/booktarr.git
cd booktarr

# Install all dependencies and start development environment
npm run dev
```

That's it! The system will:
- ✅ Automatically detect your network IP
- ✅ Generate SSL certificates for HTTPS
- ✅ Start backend server (FastAPI)
- ✅ Start frontend server (React + HTTPS)
- ✅ Configure proxy settings
- ✅ Open in your browser

### Manual Setup

If you prefer manual setup:

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies (Python 3.8+ required)
cd backend
pip install -r requirements.txt
cd ..

# Start development environment
npm run dev
```

## 📱 Mobile Access

1. **Start the development server**: `npm run dev`
2. **Look for the mobile URL**: `https://your-ip:3000`
3. **Open on your phone**: Navigate to that URL
4. **Accept certificate warning**: Click through security warnings
5. **Grant camera permissions**: Enable camera for barcode scanning

The system automatically configures for mobile access with HTTPS and camera support!

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    BookTarr System                         │
├─────────────────────┬───────────────────────────────────────┤
│   Frontend (React)  │          Backend (FastAPI)           │
│                     │                                       │
│ ┌─────────────────┐ │ ┌───────────────┐ ┌─────────────────┐ │
│ │ Component Layer │ │ │   API Routes  │ │   Data Models   │ │
│ │ - BookCard      │ │ │ - Books       │ │ - Book          │ │  
│ │ - SeriesCard    │ │ │ - Series      │ │ - Edition       │ │
│ │ │ - Scanner     │ │ │ - Reading     │ │ - Series        │ │
│ │ - Settings      │ │ │ - Import      │ │ - Progress      │ │
│ └─────────────────┘ │ └───────────────┘ └─────────────────┘ │
│                     │                                       │
│ ┌─────────────────┐ │ ┌───────────────┐ ┌─────────────────┐ │
│ │ Service Layer   │ │ │   Services    │ │   External APIs │ │
│ │ - API Client    │ │ │ - Metadata    │ │ - Google Books  │ │
│ │ - State Mgmt    │ │ │ - Import      │ │ - OpenLibrary   │ │
│ │ - Offline Queue │ │ │ - Series      │ │ - AniList       │ │
│ └─────────────────┘ │ └───────────────┘ └─────────────────┘ │
├─────────────────────┴───────────────────────────────────────┤
│                    Database Layer                          │
│   SQLite with SQLModel ORM - Books, Series, Progress       │
└─────────────────────────────────────────────────────────────┘
```

## 💻 Development Commands

### Core Commands
```bash
npm run dev                    # Start full development environment
npm run dev:backend           # Backend only  
npm run dev:frontend          # Frontend only
npm run build                 # Build for production
npm run start:prod           # Production server
```

### Testing & Quality
```bash
npm run test                 # All tests (unit + E2E)
npm run test:e2e            # End-to-end tests with Playwright
npm run test:backend        # Backend unit tests
npm run test:frontend       # Frontend unit tests
npm run validate           # System health check
```

### Utilities
```bash
npm run setup              # Install all dependencies
npm run cert:generate      # Generate SSL certificates
npm run cert:clean         # Clean SSL certificates
npm run clean              # Clean all build artifacts
```

## 🧪 Testing

BookTarr includes comprehensive testing:

### Backend Tests (pytest)
```bash
cd backend
python -m pytest tests/
```

### Frontend Tests (Playwright E2E)
```bash
cd frontend
npm run test:playwright
```

### Visual Testing
The system includes automated screenshot capture for visual regression testing:
- Component tests with real data
- E2E workflow tests
- Cross-browser compatibility tests
- Mobile responsive tests

## 📁 Project Structure

```
booktarr/
├── 📁 frontend/              # React TypeScript frontend
│   ├── 📁 src/
│   │   ├── 📁 components/    # React components
│   │   ├── 📁 services/      # API clients and utilities
│   │   ├── 📁 hooks/         # Custom React hooks
│   │   └── 📁 types/         # TypeScript definitions
│   ├── 📁 tests/             # Playwright E2E tests
│   └── 📄 package.json
├── 📁 backend/               # Python FastAPI backend
│   ├── 📁 routes/            # API route handlers
│   ├── 📁 services/          # Business logic services
│   ├── 📁 models/            # SQLModel database models
│   ├── 📁 clients/           # External API clients
│   ├── 📁 tests/             # Backend unit tests
│   └── 📄 requirements.txt
├── 📁 scripts/               # Cross-platform build scripts
├── 📁 sample_data/           # Sample CSV data for testing
├── 📄 package.json           # Root package configuration
└── 📄 README.md
```

## 🔧 Configuration

### Environment Variables

```bash
# Frontend (.env)
HTTPS=true                           # Enable HTTPS for mobile camera
HOST=0.0.0.0                        # Bind to all network interfaces
REACT_APP_ENABLE_PWA=true           # Enable Progressive Web App

# Backend
DATABASE_URL=sqlite:///booktarr.db   # Database connection
GOOGLE_BOOKS_API_KEY=your_key_here  # Google Books API (optional)
```

### Network Configuration
The system automatically detects and configures for your current network:
- ✅ Home WiFi networks (192.168.x.x)
- ✅ Corporate networks (10.x.x.x)
- ✅ VPN connections
- ✅ Mobile hotspots
- ✅ Docker containers

## 🌐 API Endpoints

### Search & Discovery
- `GET /api/search/books?query=<query>` - Search books by ISBN, title, or author
- `GET /api/books/` - Get all books in collection
- `GET /api/series/` - Get all series with completion status

### Book Management  
- `POST /api/books/` - Add a new book
- `PUT /api/books/{book_id}` - Update book information
- `DELETE /api/books/{book_id}` - Remove book from collection

### Import & Export
- `POST /api/books/import` - Import books from CSV
- `GET /api/books/export` - Export collection to CSV
- `GET /api/import/history` - View import history

### Reading Progress
- `PUT /api/reading/progress` - Update reading progress
- `GET /api/reading/stats` - Get reading statistics
- `POST /api/reading/books/{isbn}/start-reading` - Start reading a book

### Settings & Configuration
- `GET /api/settings/` - Get application settings
- `PUT /api/settings/` - Update settings
- `GET /api/health` - Health check endpoint

## 📸 Screenshots

<!-- Screenshots will be added here -->

### Desktop Interface
![Desktop Library View](screenshots/desktop-library.png)
![Desktop Series View](screenshots/desktop-series.png)

### Mobile Interface  
![Mobile Library](screenshots/mobile-library.png)
![Barcode Scanner](screenshots/mobile-scanner.png)

### Book Management
![Book Details](screenshots/book-details.png)
![Metadata Editor](screenshots/metadata-editor.png)

## 🐳 Docker Deployment

### Quick Docker Start

The easiest way to run BookTarr in production:

```bash
# 1. Create environment file
cp .env.docker .env

# 2. Add your API keys to .env (optional but recommended)
# GOOGLE_BOOKS_API_KEY=your_key_here

# 3. Build and start containers
docker-compose up --build -d

# 4. Access the application
# http://localhost (frontend)
# http://localhost:8000/docs (API documentation)
```

### What Gets Deployed

- **Frontend**: Nginx serving optimized React build (Port 80)
- **Backend**: Python FastAPI application (Port 8000)
- **Data Persistence**: Named volumes for database, covers, and cache

### Docker Features

✅ **Multi-stage builds** for optimized image sizes
✅ **Health checks** for both frontend and backend
✅ **Volume persistence** for database and cover images
✅ **Non-root containers** for security
✅ **Automatic dependency installation**
✅ **Network isolation** with custom bridge network

### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up --build -d

# Backup database
docker run --rm -v booktarr-db:/data -v $(pwd):/backup alpine \
  tar czf /backup/booktarr-backup.tar.gz -C /data .
```

### Production Deployment

For detailed production deployment instructions, including:
- SSL/HTTPS configuration
- Volume backups
- Performance tuning
- Monitoring setup
- Database migration

See **[DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)** for complete documentation.

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Run tests**: `npm run test`
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Guidelines
- Write tests for new features
- Follow TypeScript and Python type hints
- Use the provided linting and formatting tools
- Update documentation for new features

## 📋 Roadmap

### v1.1 (Next Release)
- [ ] Advanced search filters
- [ ] Collection analytics and insights
- [ ] Enhanced mobile PWA features
- [ ] Docker production deployment

### v1.2 (Future)
- [ ] Multi-user support with authentication
- [ ] Cloud sync and backup
- [ ] Advanced recommendation engine
- [ ] Community features and sharing

### v2.0 (Long-term)
- [ ] Plugin system for custom metadata sources
- [ ] Advanced cataloging features
- [ ] Integration with library systems
- [ ] AI-powered book recommendations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Books API** - Primary metadata source
- **OpenLibrary** - Additional book data
- **AniList** - Manga and light novel metadata
- **React Community** - Frontend framework and ecosystem
- **FastAPI** - Modern Python web framework
- **Playwright** - E2E testing framework

## 💬 Support

- 📧 **Email**: support@booktarr.dev
- 💬 **Discord**: [BookTarr Community](https://discord.gg/booktarr)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/booktarr/issues)
- 📖 **Documentation**: [docs.booktarr.dev](https://docs.booktarr.dev)

---

<div align="center">

**Built with ❤️ by the BookTarr team**

[![Follow on GitHub](https://img.shields.io/github/followers/your-username?style=social)](https://github.com/your-username)
[![Star on GitHub](https://img.shields.io/github/stars/your-username/booktarr?style=social)](https://github.com/your-username/booktarr)

</div>