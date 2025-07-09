# Booktarr Development Setup Guide

This guide will help you set up and run the Booktarr project locally for development and testing.

## Prerequisites

- Docker and Docker Compose installed
- Git (for version control)
- Node.js 16+ (for frontend development)
- Python 3.11+ (for backend development)

## Quick Start with Docker (Recommended)

### 1. Start the Full Stack

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd booktarr

# Start both backend and frontend services
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d
```

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 3. View Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Stop the Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

## Development Mode Setup

### Backend Development

1. **Set up Python environment**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

3. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run the development server**:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. **Run tests**:
```bash
pytest -v
pytest --cov=app  # With coverage
```

### Frontend Development

1. **Install Node.js dependencies**:
```bash
cd frontend
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start development server**:
```bash
npm start  # Runs on http://localhost:3000
```

4. **Run tests**:
```bash
npm test          # Interactive test runner
npm run test:ci   # Single test run
```

5. **Build for production**:
```bash
npm run build
npm run serve  # Serve production build
```

## Configuration

### Backend Configuration (.env)

```bash
# Application
APP_NAME=Booktarr
DEBUG=true
LOG_LEVEL=INFO

# API Configuration
API_PREFIX=/api
CORS_ORIGINS=["http://localhost:3000"]

# Cache Configuration
CACHE_TTL=3600
CACHE_MAX_SIZE=1000

# External APIs
GOOGLE_BOOKS_API_KEY=your_api_key_here  # Optional
SKOOLIB_URL=https://your-skoolib-share-url.com
```

### Frontend Configuration (.env)

```bash
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENABLE_PWA=true
REACT_APP_ENABLE_ANALYTICS=false
```

## Testing

### Backend Testing

```bash
cd backend

# Run all tests
pytest -v

# Run specific test file
pytest tests/test_skoolib_parser.py -v

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_cache_service.py::TestLRUCache::test_basic_set_get -v
```

### Frontend Testing

```bash
cd frontend

# Run tests in watch mode
npm test

# Run tests once
npm run test:ci

# Run specific test
npm test -- --testNamePattern="BookList"
```

## API Documentation

The backend automatically generates API documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## Key API Endpoints

### Books
- `GET /api/books` - Get all books grouped by series
- `GET /api/books/{isbn}` - Get specific book details
- `POST /api/books/refresh` - Refresh book cache

### Settings
- `GET /api/settings` - Get current settings
- `PUT /api/settings` - Update settings
- `POST /api/settings/validate` - Validate Skoolib URL

### System
- `GET /health` - Health check
- `GET /api/stats` - Cache statistics

## Development Workflow

### Adding a New Feature

1. Create a new branch:
```bash
git checkout -b feature/new-feature
```

2. Make your changes following the patterns in existing code

3. Add tests for your changes:
```bash
# Backend
pytest tests/test_your_feature.py -v

# Frontend  
npm test -- --testNamePattern="YourFeature"
```

4. Run linting and formatting:
```bash
# Backend
black app/
isort app/
mypy app/

# Frontend
npm run lint
npm run format
```

5. Commit and push:
```bash
git add .
git commit -m "feat: add new feature description"
git push origin feature/new-feature
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: If ports 3000 or 8000 are in use, modify the ports in docker-compose.yml

2. **Cache issues**: Clear Docker cache:
```bash
docker system prune -a
```

3. **Database connection**: Ensure your Skoolib URL is correctly configured in .env

4. **CORS errors**: Verify CORS_ORIGINS in backend .env matches your frontend URL

### Reset Everything

```bash
# Stop all containers
docker-compose down -v

# Remove all images
docker system prune -a

# Rebuild and restart
docker-compose up --build
```

## Development Tools

### Recommended VS Code Extensions

- Python extension pack
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Docker extension

### Database Tools

- View logs: `docker-compose logs -f backend`
- Access container: `docker-compose exec backend /bin/bash`
- Check cache stats: `curl http://localhost:8000/api/stats`

## Next Steps

1. **Configure Skoolib URL**: Add your Skoolib share URL to the backend .env file
2. **Test the Parser**: Use the API endpoints to test book parsing
3. **Customize Frontend**: Modify the React components to match your preferences
4. **Add Features**: Follow the INTEGRATION_ROADMAP.md for planned features

## Support

- Check the INTEGRATION_ROADMAP.md for project status
- Review CLAUDE.md for development guidelines
- Look at existing tests for examples
- Check the GitHub Issues for known problems

---

**Happy coding! 🚀**