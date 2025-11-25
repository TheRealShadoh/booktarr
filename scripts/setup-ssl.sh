#!/bin/bash
set -e

#######################################
# SSL/TLS Certificate Setup Script
# Sets up SSL certificates for production deployment
#######################################

echo "🔒 BookTarr SSL/TLS Setup"
echo "=========================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Warning: Running as root"
fi

# Create SSL directory
mkdir -p ssl

# Function to generate self-signed certificate (development)
generate_self_signed() {
  echo "📝 Generating self-signed certificate for development..."

  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout ssl/nginx.key \
    -out ssl/nginx.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

  echo "✅ Self-signed certificate generated"
  echo "   Certificate: ssl/nginx.crt"
  echo "   Key: ssl/nginx.key"
  echo ""
  echo "⚠️  Note: This is for development only. Use Let's Encrypt for production."
}

# Function to set up Let's Encrypt (production)
setup_letsencrypt() {
  echo "🌐 Setting up Let's Encrypt certificate..."

  # Check if certbot is installed
  if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot is not installed"
    echo ""
    echo "Install certbot:"
    echo "  Ubuntu/Debian: sudo apt-get install certbot"
    echo "  CentOS/RHEL: sudo yum install certbot"
    echo "  macOS: brew install certbot"
    exit 1
  fi

  # Get domain name
  read -p "Enter your domain name: " DOMAIN

  if [ -z "$DOMAIN" ]; then
    echo "❌ Domain name is required"
    exit 1
  fi

  # Stop nginx if running
  docker-compose stop nginx 2>/dev/null || true

  # Obtain certificate
  sudo certbot certonly --standalone \
    -d "$DOMAIN" \
    --email "admin@$DOMAIN" \
    --agree-tos \
    --non-interactive

  # Copy certificates to SSL directory
  sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ssl/nginx.crt
  sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" ssl/nginx.key
  sudo chmod 644 ssl/nginx.crt
  sudo chmod 600 ssl/nginx.key

  echo "✅ Let's Encrypt certificate installed"
  echo "   Certificate: ssl/nginx.crt"
  echo "   Key: ssl/nginx.key"
  echo ""
  echo "📅 Certificate will expire in 90 days"
  echo "   Set up auto-renewal: sudo certbot renew --dry-run"
}

# Main menu
echo "Choose SSL setup method:"
echo "1) Self-signed certificate (development)"
echo "2) Let's Encrypt (production)"
echo "3) Exit"
echo ""
read -p "Enter choice [1-3]: " choice

case $choice in
  1)
    generate_self_signed
    ;;
  2)
    setup_letsencrypt
    ;;
  3)
    echo "Exiting..."
    exit 0
    ;;
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "🎉 SSL setup complete!"
echo ""
echo "Next steps:"
echo "1. Update nginx.conf with SSL configuration"
echo "2. Restart nginx: docker-compose restart nginx"
echo "3. Test HTTPS access: https://yourdomain.com"
