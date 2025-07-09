# Booktarr - Book Library Viewer

A full-stack application that fetches books from Skoolib and displays them in a Sonarr-style interface with metadata enrichment from Google Books API and Open Library.

## Features

- 📚 Fetches books from Skoolib share links
- 🔍 Enriches metadata using Google Books API and Open Library
- 📖 Groups books by series with expandable sections
- 🎨 Sonarr-style dark theme interface
- 💰 Displays pricing information when available
- 🔎 Search and filter functionality
- 📱 Responsive design
- 🐳 Fully dockerized

## Technology Stack

- **Backend**: FastAPI with Python 3.11
- **Frontend**: React 18 with TailwindCSS
- **APIs**: Google Books API, Open Library API
- **Deployment**: Docker & Docker Compose

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd booktarr
   ```

2. **Run with Docker Compose**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Development

### Backend Development

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

## API Endpoints

- `GET /api/books` - Fetch all books grouped by series
- `GET /health` - Health check endpoint
- `GET /` - API information

## Project Structure

```
booktarr/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI application
│   │   ├── models.py        # Pydantic models
│   │   ├── services/        # Business logic
│   │   └── routers/         # API routes
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   └── styles/          # CSS styles
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

## Configuration

### Environment Variables

- `REACT_APP_API_URL`: Frontend API URL (default: http://localhost:8000/api)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).