# 📋 SYSME POS - Commands Cheatsheet

Quick reference for all commonly used commands.

---

## 🚀 Installation & Setup

```bash
# Automated setup (recommended)
node setup.js

# Quick setup with defaults
node setup.js --quick

# Production configuration
node setup.js --production

# Development configuration
node setup.js --development

# Manual setup
npm install
cd backend && npm install
node backend/init-database.js
```

---

## 💻 Development

### Start Development Servers

```bash
# Backend only
cd backend && npm run dev
# or
cd backend && npm start

# Frontend only
npm run dev

# Both with Docker
docker-compose up

# Development mode with Docker
docker-compose -f docker-compose.dev.yml up
```

### Build for Production

```bash
# Build frontend
npm run build

# Preview production build
npm run preview

# Build Docker images
docker build -f Dockerfile.backend -t sysme-pos-backend .
docker build -f Dockerfile.frontend -t sysme-pos-frontend .
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test auth.test.js

# Watch mode
npm test -- --watch

# Integration tests only
npm test -- integration/

# Update snapshots
npm test -- -u

# Backend tests only
cd backend && npm test
```

---

## 💾 Database Operations

### Initialization

```bash
# Initialize database (creates schema + sample data)
node backend/init-database.js

# Seed demo data
node backend/seed-demo-data.js

# Clear and reseed demo data
node backend/seed-demo-data.js --clear
```

### Backup & Restore

```bash
# Create backup
./backend/backup.sh
bash backend/backup.sh  # Windows

# Backup with cloud upload
./backend/backup.sh --cloud

# Backup with cleanup
./backend/backup.sh --cleanup

# Backup with all features
./backend/backup.sh --cloud --cleanup

# Restore (interactive)
./backend/restore.sh
bash backend/restore.sh  # Windows

# Restore specific backup
./backend/restore.sh backup_20251120_143022.sqlite.gz

# Restore from backups directory
./backend/restore.sh backups/backup_20251120_143022.sqlite.gz
```

---

## 🏥 Health & Monitoring

```bash
# Full health check
node backend/health-check.js

# Quick check
node backend/health-check.js --quick

# JSON output (for automation)
node backend/health-check.js --json

# Pipe to file
node backend/health-check.js --json > health-report.json
```

---

## ⚡ Performance Testing

```bash
# Full benchmark
node backend/benchmark.js

# Quick benchmark
node backend/benchmark.js --quick

# API endpoints only
node backend/benchmark.js --api-only

# Database queries only
node backend/benchmark.js --db-only

# Generate JSON report
node backend/benchmark.js --report

# Quick benchmark with report
node backend/benchmark.js --quick --report
```

---

## 🐳 Docker Commands

### Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up

# Start in detached mode
docker-compose -f docker-compose.dev.yml up -d

# Stop containers
docker-compose -f docker-compose.dev.yml down

# Rebuild containers
docker-compose -f docker-compose.dev.yml up --build

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend
```

### Production

```bash
# Start production environment
docker-compose -f docker-compose.prod.yml up -d

# Stop production environment
docker-compose -f docker-compose.prod.yml down

# View production logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Scale service
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

### Maintenance

```bash
# Remove all containers and volumes
docker-compose down -v

# Prune unused images
docker image prune -a

# Clean up everything
docker system prune -a --volumes

# View container stats
docker stats

# Execute command in container
docker-compose exec backend sh
docker-compose exec frontend sh
```

---

## ☸️ Kubernetes Commands

```bash
# Apply all manifests
kubectl apply -f k8s/

# Apply specific manifest
kubectl apply -f k8s/deployment.yaml

# Delete all resources
kubectl delete -f k8s/

# View pods
kubectl get pods

# View services
kubectl get services

# View deployments
kubectl get deployments

# Describe pod
kubectl describe pod sysme-pos-backend-xxx

# View logs
kubectl logs -f sysme-pos-backend-xxx

# Execute command in pod
kubectl exec -it sysme-pos-backend-xxx -- sh

# Port forward
kubectl port-forward svc/sysme-pos-backend 3000:3000

# Scale deployment
kubectl scale deployment sysme-pos-backend --replicas=3

# Rolling update
kubectl set image deployment/sysme-pos-backend backend=sysme-pos-backend:v2.1.0

# Rollback
kubectl rollout undo deployment/sysme-pos-backend

# View rollout status
kubectl rollout status deployment/sysme-pos-backend
```

---

## 🔧 PM2 Process Management

```bash
# Start with ecosystem file
pm2 start ecosystem.config.js

# Start specific app
pm2 start backend/server.js --name sysme-pos-backend

# Stop all
pm2 stop all

# Stop specific app
pm2 stop sysme-pos-backend

# Restart all
pm2 restart all

# Restart specific app
pm2 restart sysme-pos-backend

# Delete all
pm2 delete all

# Delete specific app
pm2 delete sysme-pos-backend

# View status
pm2 status

# View logs
pm2 logs

# View specific app logs
pm2 logs sysme-pos-backend

# Monitor
pm2 monit

# Save process list
pm2 save

# Startup script (run on boot)
pm2 startup

# Flush logs
pm2 flush
```

---

## 📊 Logs & Debugging

```bash
# View backend logs
tail -f backend/logs/app.log

# View error logs
tail -f backend/logs/error.log

# View access logs
tail -f backend/logs/access.log

# View all logs
tail -f backend/logs/*.log

# Search logs
grep "error" backend/logs/app.log

# Count errors
grep -c "error" backend/logs/app.log

# View last 100 lines
tail -n 100 backend/logs/app.log

# Follow logs from beginning
tail -n +1 -f backend/logs/app.log
```

---

## 🔍 Code Quality

```bash
# ESLint
npx eslint src/
npx eslint backend/

# Fix auto-fixable issues
npx eslint src/ --fix
npx eslint backend/ --fix

# Prettier
npx prettier --write src/
npx prettier --write backend/

# Check formatting
npx prettier --check src/

# TypeScript type check
npx tsc --noEmit

# Type check with watch
npx tsc --noEmit --watch
```

---

## 📦 Dependencies

```bash
# Install all dependencies
npm install
cd backend && npm install

# Install specific package
npm install package-name
npm install --save-dev package-name

# Update dependencies
npm update
cd backend && npm update

# Check outdated packages
npm outdated
cd backend && npm outdated

# Audit security
npm audit
npm audit fix
npm audit fix --force

# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm cache clean --force
```

---

## 🌐 API Testing

```bash
# Health check
curl http://localhost:3000/health

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get products (with auth)
curl http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Create product
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"name":"Test Product","price":100}'

# Using httpie (alternative to curl)
http GET http://localhost:3000/health
http POST http://localhost:3000/api/auth/login username=admin password=admin123
```

---

## 🔐 Security

```bash
# Generate strong secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Check for vulnerabilities
npm audit
npm audit fix

# Security scan with Snyk
npx snyk test
npx snyk monitor

# Check dependencies
npx depcheck

# Update vulnerable packages
npm update
npm audit fix --force
```

---

## 🗄️ Database Queries

```bash
# Open SQLite database
sqlite3 backend/database.sqlite

# Common queries
sqlite> .tables                    # List all tables
sqlite> .schema products          # Show table schema
sqlite> SELECT * FROM products LIMIT 10;
sqlite> SELECT COUNT(*) FROM orders;
sqlite> .quit                      # Exit

# Execute query from file
sqlite3 backend/database.sqlite < query.sql

# Dump database to SQL
sqlite3 backend/database.sqlite .dump > dump.sql

# Import from SQL
sqlite3 backend/database.sqlite < dump.sql

# Vacuum database (optimize)
sqlite3 backend/database.sqlite "VACUUM;"

# Check database integrity
sqlite3 backend/database.sqlite "PRAGMA integrity_check;"
```

---

## 🚀 Deployment

### Traditional VPS

```bash
# Clone repository
git clone https://github.com/your-repo/sysme-pos.git
cd sysme-pos

# Run setup
node setup.js --production

# Start with PM2
pm2 start ecosystem.config.js

# Configure Nginx
sudo cp nginx.prod.conf /etc/nginx/sites-available/sysme-pos
sudo ln -s /etc/nginx/sites-available/sysme-pos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL with Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

### Docker Production

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d --build

# Update application
git pull
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Backup database
docker-compose -f docker-compose.prod.yml exec backend bash backup.sh

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Kubernetes Production

```bash
# Deploy
kubectl apply -f k8s/

# Update
kubectl set image deployment/sysme-pos-backend backend=sysme-pos-backend:v2.1.0
kubectl set image deployment/sysme-pos-frontend frontend=sysme-pos-frontend:v2.1.0

# Scale
kubectl scale deployment sysme-pos-backend --replicas=3

# Monitor
kubectl get pods -w
kubectl logs -f deployment/sysme-pos-backend
```

---

## 🔄 Git Commands

```bash
# Clone repository
git clone https://github.com/your-repo/sysme-pos.git

# Pull latest changes
git pull origin main

# Create branch
git checkout -b feature/my-feature

# Stage changes
git add .

# Commit
git commit -m "feat: add new feature"

# Push
git push origin feature/my-feature

# View status
git status

# View logs
git log --oneline

# View diff
git diff

# Stash changes
git stash
git stash pop

# Tag release
git tag -a v2.1.0 -m "Version 2.1.0"
git push origin v2.1.0
```

---

## 📊 Monitoring

```bash
# System resources
htop
top
free -h
df -h

# Network
netstat -tulpn
ss -tulpn
lsof -i :3000

# Process info
ps aux | grep node
pgrep -f node

# Disk usage
du -sh *
du -sh backend/

# Database size
ls -lh backend/database.sqlite

# Logs size
du -sh backend/logs/

# Check ports
netstat -an | grep 3000
lsof -i :3000
```

---

## 🧹 Cleanup

```bash
# Clean node_modules
rm -rf node_modules backend/node_modules
npm install

# Clean build artifacts
rm -rf dist backend/dist

# Clean logs
rm -rf backend/logs/*

# Clean old backups (30+ days)
find backend/backups -name "*.gz" -mtime +30 -delete

# Clean Docker
docker system prune -a --volumes

# Clean npm cache
npm cache clean --force

# Clean all
rm -rf node_modules backend/node_modules dist backend/dist
npm install
cd backend && npm install
```

---

## 📝 Quick Workflows

### Daily Development

```bash
git pull
npm install
npm run dev
```

### Before Commit

```bash
npm run lint
npm run format
npm test
git add .
git commit -m "feat: description"
git push
```

### Deploy to Production

```bash
git pull
npm install
npm run build
pm2 restart all
```

### Create Backup

```bash
./backend/backup.sh --cloud --cleanup
```

### Performance Check

```bash
node backend/health-check.js
node backend/benchmark.js --quick
```

---

## 🆘 Troubleshooting

```bash
# Backend won't start - port in use
netstat -ano | findstr :3000  # Windows
lsof -ti:3000 | xargs kill   # Linux/Mac

# Database locked
rm backend/database.sqlite-shm
rm backend/database.sqlite-wal

# Permission denied
chmod +x backend/*.sh

# Module not found
rm -rf node_modules package-lock.json
npm install

# Docker issues
docker-compose down
docker system prune -a
docker-compose up --build
```

---

## 📚 Resources

- [README.md](README.md) - Main documentation
- [QUICK-START.md](QUICK-START.md) - Getting started
- [FAQ.md](FAQ.md) - Common questions
- [UTILITY-SCRIPTS.md](UTILITY-SCRIPTS.md) - Detailed scripts guide
- [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) - Production deployment

---

**Last Updated:** November 20, 2025
**Version:** 2.1.0
