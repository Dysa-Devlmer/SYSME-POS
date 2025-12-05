# 🚢 SYSME POS - Deployment Guide

Complete guide for deploying SYSME POS to production.

---

## 📋 Pre-Deployment Checklist

### Security
- [ ] Change default admin password
- [ ] Update `JWT_SECRET` to secure random string
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS/SSL
- [ ] Review and update `.env` variables
- [ ] Setup firewall rules
- [ ] Enable rate limiting
- [ ] Configure backup schedule

### Configuration
- [ ] Set `NODE_ENV=production`
- [ ] Configure production database (if not SQLite)
- [ ] Setup email service (SMTP)
- [ ] Configure error tracking (Sentry)
- [ ] Setup monitoring (Prometheus/Grafana)
- [ ] Configure log rotation
- [ ] Review file upload limits

### Testing
- [ ] Run all tests: `npm test`
- [ ] Test API endpoints
- [ ] Test frontend build
- [ ] Load testing
- [ ] Security audit

---

## 🐳 Docker Deployment (Recommended)

### 1. Build Images

```bash
docker-compose build
```

### 2. Production Configuration

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=/data/database.sqlite
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./data:/data
      - ./logs:/app/logs
      - ./backups:/app/backups
    ports:
      - "3000:3000"
    restart: unless-stopped

  frontend:
    build:
      context: .
      dockerfile: frontend.Dockerfile
    environment:
      - VITE_API_URL=https://api.yourdomain.com/api
    ports:
      - "80:80"
    restart: unless-stopped
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    ports:
      - "443:443"
    restart: unless-stopped
    depends_on:
      - frontend
      - backend
```

### 3. Deploy

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Verify

```bash
docker-compose ps
docker-compose logs -f
```

---

## 🖥️ Manual Deployment

### 1. Setup Production Server

**Requirements:**
- Ubuntu 20.04+ or similar
- Node.js 18+
- nginx
- SSL certificate

### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install nginx
sudo apt install -y nginx

# Install PM2 (process manager)
sudo npm install -g pm2
```

### 3. Deploy Backend

```bash
# Clone/copy your code
cd /var/www/sysme-pos
cd backend

# Install dependencies
npm install --production

# Initialize database
node init-database.js

# Start with PM2
pm2 start server.js --name sysme-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Build & Deploy Frontend

```bash
cd /var/www/sysme-pos

# Build for production
npm run build

# Move build to nginx
sudo cp -r dist/* /var/www/html/
```

### 5. Configure nginx

Create `/etc/nginx/sites-available/sysme-pos`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Enable gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/sysme-pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL with Let's Encrypt

```bash
# Install certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com

# Auto-renewal is configured automatically
```

---

## ☁️ Cloud Platform Deployment

### Heroku

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create sysme-pos-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

### AWS (EC2)

1. Launch EC2 instance (t2.micro for testing, t2.medium+ for production)
2. Install Node.js, nginx, PM2
3. Follow manual deployment steps
4. Configure security groups (ports 80, 443, 22)
5. Setup Elastic IP
6. Configure Route 53 for DNS

### DigitalOcean

1. Create Droplet (Ubuntu 20.04)
2. Follow manual deployment steps
3. Add domain to DigitalOcean DNS
4. Configure firewall
5. Setup automatic backups

---

## 🔄 Database Migration

### SQLite to PostgreSQL (Production)

1. **Export SQLite data:**
```bash
sqlite3 database.sqlite .dump > dump.sql
```

2. **Setup PostgreSQL:**
```bash
sudo apt install postgresql
sudo -u postgres createdb sysmepos
sudo -u postgres createuser sysmepos
```

3. **Import data:**
```bash
# Clean dump file first
# Then import
psql -U sysmepos -d sysmepos < dump.sql
```

4. **Update backend config:**
```env
DATABASE_URL=postgresql://sysmepos:password@localhost:5432/sysmepos
```

---

## 📊 Monitoring Setup

### PM2 Monitoring

```bash
# Install PM2 Plus
pm2 plus

# Monitor
pm2 monit
pm2 logs
```

### Prometheus + Grafana

See `monitoring/` folder for configuration files.

### Log Management

```bash
# View logs
pm2 logs sysme-backend

# Rotate logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔐 Security Hardening

### 1. Firewall (UFW)

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Fail2Ban

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 3. Regular Updates

```bash
# Setup automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

---

## 💾 Backup Strategy

### Automated Daily Backups

```bash
# Create backup script
cat > /usr/local/bin/sysme-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/sysme-pos"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
cp /var/www/sysme-pos/backend/database.sqlite $BACKUP_DIR/db_$DATE.sqlite

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/sysme-pos/backend/uploads

# Keep only last 7 days
find $BACKUP_DIR -name "*.sqlite" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/sysme-backup.sh
```

### Cron Job

```bash
# Run daily at 2 AM
crontab -e

# Add line:
0 2 * * * /usr/local/bin/sysme-backup.sh
```

---

## 🔍 Health Checks

### Uptime Monitoring

Use services like:
- UptimeRobot (free)
- Pingdom
- StatusCake

Monitor:
- https://yourdomain.com
- https://api.yourdomain.com/health

### Application Health

```bash
curl https://api.yourdomain.com/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 12345,
  "database": "connected",
  "memory": {
    "used": "150MB",
    "total": "512MB"
  }
}
```

---

## 🚨 Troubleshooting Production

### High Memory Usage

```bash
# Check memory
free -h

# Restart PM2
pm2 restart all

# Increase Node.js memory
NODE_OPTIONS=--max-old-space-size=2048 pm2 restart sysme-backend
```

### Database Locked

```bash
# Check processes
lsof database.sqlite

# Restart backend
pm2 restart sysme-backend
```

### 502 Bad Gateway

```bash
# Check backend is running
pm2 status

# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check logs
pm2 logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📱 Mobile/PWA Deployment

The frontend is PWA-ready:

1. Build with `npm run build`
2. Deploy to HTTPS (required for PWA)
3. Users can "Add to Home Screen"
4. Works offline with service worker

---

## ✅ Post-Deployment

- [ ] Test all critical features
- [ ] Verify backups are running
- [ ] Check logs for errors
- [ ] Monitor performance
- [ ] Update documentation
- [ ] Train staff
- [ ] Setup support channels

---

## 📞 Support

- 📖 [Documentation](README.md)
- 🐛 [Report Issues](https://github.com/your-repo/issues)
- 💬 [Community](https://discord.gg/your-server)

---

**🎉 Your SYSME POS is now in production!**

*Remember to keep your system updated and monitor regularly.*
