# Production Security Configuration

**Last Updated**: 2025-11-15
**Purpose**: Security headers and configuration for production deployment of BookTarr

## 🔒 Content Security Policy (CSP)

### Recommended CSP Header

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://books.google.com https://openlibrary.org https://graphql.anilist.co https://covers.openlibrary.org;
  media-src 'self' blob:;
  worker-src 'self' blob:;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
```

### CSP Breakdown

- **default-src 'self'**: Only allow resources from same origin by default
- **script-src 'self' 'unsafe-inline' 'unsafe-eval'**: Allow scripts from same origin and inline (required for React)
- **style-src 'self' 'unsafe-inline' https://fonts.googleapis.com**: Allow styles from same origin, inline CSS, and Google Fonts
- **font-src 'self' https://fonts.gstatic.com**: Allow fonts from same origin and Google Fonts CDN
- **img-src 'self' data: https: blob:**: Allow images from same origin, data URIs, HTTPS, and blob URLs (for camera)
- **connect-src**: Whitelist external APIs (Google Books, OpenLibrary, AniList)
- **media-src 'self' blob:**: Allow media from same origin and blob URLs
- **worker-src 'self' blob:**: Allow service workers and blob workers
- **frame-ancestors 'none'**: Prevent page from being embedded in iframes (clickjacking protection)
- **base-uri 'self'**: Restrict base element URLs
- **form-action 'self'**: Only allow form submissions to same origin
- **upgrade-insecure-requests**: Automatically upgrade HTTP to HTTPS

### CSP Implementation Options

#### Option 1: Nginx Configuration

```nginx
# /etc/nginx/sites-available/booktarr
server {
    listen 443 ssl http2;
    server_name booktarr.example.com;

    # SSL Configuration
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://books.google.com https://openlibrary.org https://graphql.anilist.co https://covers.openlibrary.org; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Frontend
    location / {
        root /var/www/booktarr/frontend/build;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name booktarr.example.com;
    return 301 https://$server_name$request_uri;
}
```

#### Option 2: Apache Configuration

```apache
# /etc/apache2/sites-available/booktarr.conf
<VirtualHost *:443>
    ServerName booktarr.example.com
    DocumentRoot /var/www/booktarr/frontend/build

    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /path/to/fullchain.pem
    SSLCertificateKeyFile /path/to/privkey.pem
    SSLProtocol all -SSLv3 -TLSv1 -TLSv1.1
    SSLCipherSuite HIGH:!aNULL:!MD5
    SSLHonorCipherOrder on

    # Security Headers
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; connect-src 'self' https://books.google.com https://openlibrary.org https://graphql.anilist.co https://covers.openlibrary.org; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    # Frontend routing
    <Directory /var/www/booktarr/frontend/build>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # React Router support
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Backend API proxy
    ProxyPass /api http://localhost:8000
    ProxyPassReverse /api http://localhost:8000
    ProxyPreserveHost On

    # Deny access to hidden files
    <DirectoryMatch "^\.|\/\.">
        Require all denied
    </DirectoryMatch>
</VirtualHost>

# HTTP to HTTPS redirect
<VirtualHost *:80>
    ServerName booktarr.example.com
    Redirect permanent / https://booktarr.example.com/
</VirtualHost>
```

#### Option 3: FastAPI Backend Middleware

```python
# backend/main.py - Add to existing FastAPI app
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        # Only add security headers in production
        if os.getenv('ENV') == 'production':
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            response.headers['Permissions-Policy'] = 'camera=(), microphone=(), geolocation=(), payment=()'
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
            response.headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https: blob:; "
                "connect-src 'self' https://books.google.com https://openlibrary.org https://graphql.anilist.co https://covers.openlibrary.org; "
                "media-src 'self' blob:; "
                "worker-src 'self' blob:; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'; "
                "upgrade-insecure-requests;"
            )

        return response

# Add to your FastAPI app
app.add_middleware(SecurityHeadersMiddleware)

# HTTPS redirect (only in production)
if os.getenv('ENV') == 'production':
    app.add_middleware(HTTPSRedirectMiddleware)

# Trusted host middleware (prevent host header attacks)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["booktarr.example.com", "www.booktarr.example.com"]
)
```

## 🛡️ Additional Security Headers

### X-Frame-Options
```http
X-Frame-Options: DENY
```
Prevents clickjacking by preventing the page from being embedded in iframes.

### X-Content-Type-Options
```http
X-Content-Type-Options: nosniff
```
Prevents browsers from MIME-sniffing the content type.

### X-XSS-Protection
```http
X-XSS-Protection: 1; mode=block
```
Enables browser's XSS filter (legacy browsers).

### Referrer-Policy
```http
Referrer-Policy: strict-origin-when-cross-origin
```
Controls how much referrer information is sent with requests.

### Permissions-Policy
```http
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
```
Disables browser features not used by the application.

### Strict-Transport-Security (HSTS)
```http
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```
Forces HTTPS connections for 1 year (including subdomains).

## 🔐 CORS Configuration

### Development CORS (Backend)
```python
# backend/main.py - Current development config
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Production CORS (Backend)
```python
# backend/main.py - Production config
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://booktarr.example.com",
        "https://www.booktarr.example.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
    max_age=3600,  # Cache preflight requests for 1 hour
)
```

## 🍪 Cookie Security

### Secure Cookie Configuration
```python
# backend/routes/*.py - When setting cookies
response.set_cookie(
    key="session",
    value=session_token,
    httponly=True,       # Prevent JavaScript access
    secure=True,         # Only send over HTTPS
    samesite="strict",   # CSRF protection
    max_age=3600,        # 1 hour expiration
    domain="booktarr.example.com"
)
```

## 🚀 Production Deployment Checklist

### Pre-Deployment Security Checks

- [ ] **HTTPS Enforcement**
  - [ ] Valid SSL/TLS certificate installed
  - [ ] HTTP to HTTPS redirect configured
  - [ ] HSTS header enabled
  - [ ] Certificate auto-renewal configured (Let's Encrypt)

- [ ] **Security Headers**
  - [ ] Content-Security-Policy configured
  - [ ] X-Frame-Options set to DENY
  - [ ] X-Content-Type-Options set to nosniff
  - [ ] X-XSS-Protection enabled
  - [ ] Referrer-Policy configured
  - [ ] Permissions-Policy configured

- [ ] **CORS Configuration**
  - [ ] Production origins whitelisted
  - [ ] Development origins removed
  - [ ] Credentials handling reviewed
  - [ ] Allowed methods restricted

- [ ] **Cookie Security**
  - [ ] HttpOnly flag enabled
  - [ ] Secure flag enabled
  - [ ] SameSite attribute configured
  - [ ] Appropriate expiration times set

- [ ] **Environment Configuration**
  - [ ] Debug mode disabled (`NODE_ENV=production`)
  - [ ] Verbose logging disabled
  - [ ] Error stack traces hidden from users
  - [ ] Environment variables secured

- [ ] **Dependency Security**
  - [ ] Run `npm audit fix` (frontend)
  - [ ] Run `pip check` (backend)
  - [ ] Update critical vulnerabilities
  - [ ] Review dependency licenses

- [ ] **Database Security**
  - [ ] Database backups encrypted
  - [ ] Database credentials secured
  - [ ] Connection pooling configured
  - [ ] Query timeout limits set

- [ ] **API Security**
  - [ ] Rate limiting implemented
  - [ ] Request size limits configured
  - [ ] Input validation on all endpoints
  - [ ] API authentication reviewed (if multi-user)

- [ ] **Network Security**
  - [ ] Firewall rules configured
  - [ ] Only necessary ports open (80, 443)
  - [ ] Internal services not exposed
  - [ ] Intrusion detection configured

- [ ] **Monitoring & Logging**
  - [ ] Error monitoring setup (Sentry, etc.)
  - [ ] Access logs configured
  - [ ] Security event logging enabled
  - [ ] Log rotation configured

- [ ] **Application Security**
  - [ ] No hardcoded secrets in code
  - [ ] No sensitive data in localStorage
  - [ ] No console.log in production
  - [ ] Source maps disabled or protected

## 📊 Security Testing

### Pre-Launch Security Tests

1. **Manual Security Testing**
   - [ ] Test HTTPS enforcement
   - [ ] Verify security headers with browser dev tools
   - [ ] Test CORS with different origins
   - [ ] Check cookie flags in browser
   - [ ] Verify no mixed content warnings

2. **Automated Security Scanning**
   - [ ] Run OWASP ZAP scan
   - [ ] Run security headers check (securityheaders.com)
   - [ ] Run SSL/TLS test (ssllabs.com)
   - [ ] Run vulnerability scan (npm audit, Snyk)

3. **Penetration Testing (Optional)**
   - [ ] SQL injection testing
   - [ ] XSS testing
   - [ ] CSRF testing
   - [ ] Session management testing
   - [ ] Authentication bypass testing

## 🔧 Environment Variables

### Required Production Environment Variables

```bash
# Backend (.env)
ENV=production
DEBUG=false
DATABASE_URL=sqlite:///./booktarr_production.db
SECRET_KEY=<generate-strong-secret-key>
ALLOWED_HOSTS=booktarr.example.com,www.booktarr.example.com

# Frontend (.env.production)
REACT_APP_API_URL=https://booktarr.example.com/api
REACT_APP_ENV=production
GENERATE_SOURCEMAP=false
```

### Secret Key Generation

```bash
# Generate secure secret key (Python)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate secure secret key (OpenSSL)
openssl rand -base64 32
```

## 📝 Security Incident Response

### In Case of Security Breach

1. **Immediate Actions**
   - Isolate affected systems
   - Revoke compromised credentials
   - Enable maintenance mode
   - Preserve logs for forensics

2. **Assessment**
   - Identify scope of breach
   - Determine data affected
   - Review access logs
   - Document timeline

3. **Remediation**
   - Patch vulnerabilities
   - Reset all credentials
   - Update security policies
   - Restore from clean backup

4. **Communication**
   - Notify affected users (if applicable)
   - Report to authorities (if required)
   - Update security documentation
   - Conduct post-mortem

## 📚 References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [SecurityHeaders.com Scanner](https://securityheaders.com/)
- [SSL Labs Server Test](https://www.ssllabs.com/ssltest/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Next Review**: Quarterly or before major releases
**Maintained By**: DevOps/Security Team
