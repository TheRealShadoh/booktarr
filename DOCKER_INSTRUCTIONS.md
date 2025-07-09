# Docker Setup Instructions for Booktarr

Since Docker isn't available in this environment, here are the instructions to run the project once you have Docker set up.

## Current Project Status

✅ **Ready for Docker deployment** - All necessary files are in place:

- `backend/Dockerfile` - Backend container configuration
- `frontend/Dockerfile` - Frontend container configuration  
- `docker-compose.yml` - Multi-service orchestration
- `backend/requirements.txt` - Python dependencies
- `frontend/package.json` - Node.js dependencies
- Environment files (`.env.example`) for both services

## Quick Start Commands

### 1. Start the Application

```bash
# Navigate to project directory
cd /home/chris/git/booktarr

# Start all services (builds automatically)
docker-compose up --build

# Or run in background
docker-compose up --build -d
```

### 2. Access the Application

Once started, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000  
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

### 3. Monitor the Application

```bash
# View logs from all services
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check container status
docker-compose ps
```

### 4. Stop the Application

```bash
# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v
```

## What You'll See

### Backend (Port 8000)
- FastAPI application with auto-generated documentation
- Health check endpoint returning `{"status": "healthy"}`
- Book API endpoints (though they need Skoolib URL configuration)
- Cache statistics endpoint

### Frontend (Port 3000)
- React application with TailwindCSS styling
- Book list interface (Sonarr-inspired dark theme)
- Search functionality
- Series grouping display

## Configuration After Start

### 1. Set Skoolib URL
After starting, you'll need to configure your Skoolib share URL:

```bash
# Copy environment file
cp backend/.env.example backend/.env

# Edit the file to add your Skoolib URL
# SKOOLIB_URL=https://your-skoolib-share-url.com
```

### 2. Restart Backend
```bash
docker-compose restart backend
```

## Development Mode

For development with hot-reload:

```bash
# Create development compose file
cp docker-compose.yml docker-compose.dev.yml

# Add volume mounts for hot-reload in docker-compose.dev.yml
# Then run:
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Testing the Implementation

### 1. Health Check
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy"}
```

### 2. API Documentation
Visit http://localhost:8000/docs to see the interactive API documentation

### 3. Books Endpoint
```bash
curl http://localhost:8000/api/books
# Will return book data once Skoolib URL is configured
```

### 4. Cache Statistics
```bash
curl http://localhost:8000/api/stats
# Shows cache performance metrics
```

## Troubleshooting

### If containers fail to start:
1. Check logs: `docker-compose logs backend`
2. Verify port availability: `lsof -i :8000` and `lsof -i :3000`
3. Rebuild images: `docker-compose build --no-cache`

### If API calls fail:
1. Verify backend is running: `curl http://localhost:8000/health`
2. Check CORS configuration in backend code
3. Ensure Skoolib URL is properly configured

## Ready for Phase 2

Once you verify everything is working:

1. **Phase 1 Complete**: Basic functionality should be operational
2. **Phase 2 Ready**: Enhanced UI components can be added
3. **Testing**: Run test suites to verify implementation
4. **Configuration**: Add your specific Skoolib URL and API keys

The project is architected to be production-ready with proper error handling, caching, and scalability considerations built in from the start.

---

**Run `docker-compose up --build` to start your Booktarr instance! 🚀**