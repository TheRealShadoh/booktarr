FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including Playwright requirements
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    wget \
    gnupg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Create non-root user first
RUN useradd -m -u 1000 appuser 

# Create data directory for database with proper permissions
RUN mkdir -p /app/data && chown -R appuser:appuser /app

# Create shared directory for Playwright browsers
RUN mkdir -p /opt/playwright && chmod 755 /opt/playwright

# Install Playwright browsers in shared location
ENV PLAYWRIGHT_BROWSERS_PATH=/opt/playwright
RUN playwright install --with-deps chromium

# Set proper permissions for playwright browsers
RUN chmod -R 755 /opt/playwright

# Switch to appuser
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]