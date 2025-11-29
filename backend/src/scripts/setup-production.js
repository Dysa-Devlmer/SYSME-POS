/**
 * Production Setup Script
 * Configures the system for production deployment
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../..');

// Generate secure random secrets
const generateSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

// Create production directories
const createProductionDirectories = () => {
  const directories = [
    'logs',
    'backups',
    'uploads',
    'ssl',
    'tmp'
  ];

  directories.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    }
  });
};

// Generate production environment file
const generateProductionEnv = () => {
  const envPath = path.join(rootDir, '.env.production');

  if (fs.existsSync(envPath)) {
    console.log('⚠️  .env.production already exists, backing up...');
    fs.copyFileSync(envPath, `${envPath}.backup.${Date.now()}`);
  }

  const productionEnv = `# SYSME Production Environment Configuration
# Generated on ${new Date().toISOString()}

# Environment
NODE_ENV=production

# Server Configuration
PORT=3001
API_VERSION=v1

# Security Secrets (CHANGE THESE!)
JWT_SECRET=${generateSecret()}
JWT_REFRESH_SECRET=${generateSecret()}
SESSION_SECRET=${generateSecret()}

# Database Configuration (MySQL)
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sysme_production
DB_USER=sysme_user
DB_PASSWORD=CHANGE_THIS_PASSWORD
DB_SSL=false

# Database Pool Configuration
DB_POOL_MIN=5
DB_POOL_MAX=20

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_THIS_PASSWORD
REDIS_DB=0

# CORS Configuration
CORS_ORIGIN=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# SSL Configuration
HTTPS_ENABLED=true
SSL_CERT_PATH=./ssl/certificate.crt
SSL_KEY_PATH=./ssl/private.key

# Logging
LOG_LEVEL=info
LOG_TO_FILE=true
LOG_FILE_PATH=./logs/sysme.log

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-email-password
SMTP_FROM_NAME=SYSME Restaurant System
SMTP_FROM_EMAIL=noreply@your-domain.com

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=./backups

# Restaurant Configuration
RESTAURANT_NAME=Tu Restaurante
RESTAURANT_ADDRESS=Dirección del Restaurante
RESTAURANT_PHONE=+1234567890
RESTAURANT_EMAIL=contacto@turestaurante.com
TZ=America/Mexico_City

# Kitchen Printer Configuration
KITCHEN_PRINTER_ENABLED=true
KITCHEN_PRINTER_IP=192.168.1.100
KITCHEN_PRINTER_PORT=9100

# Receipt Printer Configuration
RECEIPT_PRINTER_ENABLED=true
RECEIPT_PRINTER_IP=192.168.1.101
RECEIPT_PRINTER_PORT=9100
`;

  fs.writeFileSync(envPath, productionEnv);
  console.log('✓ Generated .env.production with secure secrets');
};

// Create SSL certificate placeholder
const createSSLPlaceholder = () => {
  const sslDir = path.join(rootDir, 'ssl');
  const readmePath = path.join(sslDir, 'README.md');

  const sslReadme = `# SSL Certificates

Place your SSL certificates in this directory:

## Required Files:
- \`certificate.crt\` - Your SSL certificate
- \`private.key\` - Your private key
- \`ca-bundle.crt\` - Certificate Authority bundle (if required)

## For Let's Encrypt:
If using Let's Encrypt, your files are typically located at:
\`/etc/letsencrypt/live/your-domain.com/\`

Copy them to this directory:
\`\`\`bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./ssl/certificate.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./ssl/private.key
\`\`\`

## For Self-Signed Certificates (Development):
Generate self-signed certificates:
\`\`\`bash
openssl req -x509 -newkey rsa:4096 -keyout private.key -out certificate.crt -days 365 -nodes
\`\`\`

## Security Note:
Make sure SSL files have proper permissions:
\`\`\`bash
chmod 600 private.key
chmod 644 certificate.crt
\`\`\`
`;

  fs.writeFileSync(readmePath, sslReadme);
  console.log('✓ Created SSL setup instructions');
};

// Create production package.json scripts
const updatePackageScripts = () => {
  const packagePath = path.join(rootDir, 'package.json');

  if (!fs.existsSync(packagePath)) {
    console.log('⚠️  package.json not found, skipping script update');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

  const productionScripts = {
    "start": "NODE_ENV=production node src/server.js",
    "start:prod": "NODE_ENV=production node src/server.js",
    "migrate:mysql": "node src/scripts/migrate-to-mysql.js",
    "setup:prod": "node src/scripts/setup-production.js",
    "backup:db": "node src/scripts/backup-database.js",
    "health:check": "curl -f http://localhost:3001/health || exit 1"
  };

  packageJson.scripts = {
    ...packageJson.scripts,
    ...productionScripts
  };

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✓ Updated package.json with production scripts');
};

// Create systemd service file
const createSystemdService = () => {
  const servicePath = path.join(rootDir, 'sysme.service');
  const serviceContent = `[Unit]
Description=SYSME Restaurant POS System
After=network.target mysql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=${rootDir}
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/server.js
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectHome=yes
ProtectSystem=strict
ReadWritePaths=${rootDir}

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
`;

  fs.writeFileSync(servicePath, serviceContent);
  console.log('✓ Created systemd service file (sysme.service)');
  console.log('  To install: sudo cp sysme.service /etc/systemd/system/');
  console.log('  To enable: sudo systemctl enable sysme');
  console.log('  To start: sudo systemctl start sysme');
};

// Create nginx configuration
const createNginxConfig = () => {
  const nginxPath = path.join(rootDir, 'nginx-sysme.conf');
  const nginxContent = `# SYSME Restaurant POS - Nginx Configuration
# Place this file in /etc/nginx/sites-available/sysme
# Then: sudo ln -s /etc/nginx/sites-available/sysme /etc/nginx/sites-enabled/

upstream sysme_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # API Backend
    location /api/ {
        proxy_pass http://sysme_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://sysme_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static Files
    location /uploads/ {
        alias ${rootDir}/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Health Check
    location /health {
        proxy_pass http://sysme_backend;
        access_log off;
    }

    # Frontend (if serving from same domain)
    location / {
        root /var/www/sysme-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # Security
    client_max_body_size 10M;
    server_tokens off;
}
`;

  fs.writeFileSync(nginxPath, nginxContent);
  console.log('✓ Created nginx configuration (nginx-sysme.conf)');
};

// Create monitoring and health check scripts
const createMonitoringScripts = () => {
  const monitoringDir = path.join(rootDir, 'scripts', 'monitoring');
  fs.mkdirSync(monitoringDir, { recursive: true });

  // Health check script
  const healthCheckScript = `#!/bin/bash
# Health Check Script for SYSME

echo "🏥 SYSME Health Check - $(date)"

# Check if service is running
if systemctl is-active --quiet sysme; then
    echo "✓ Service is running"
else
    echo "✗ Service is not running"
    exit 1
fi

# Check HTTP endpoint
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✓ HTTP endpoint responsive"
else
    echo "✗ HTTP endpoint not responding"
    exit 1
fi

# Check database connection
if mysql -u$DB_USER -p$DB_PASSWORD -h$DB_HOST -e "SELECT 1" $DB_NAME > /dev/null 2>&1; then
    echo "✓ Database connection OK"
else
    echo "✗ Database connection failed"
    exit 1
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 85 ]; then
    echo "✓ Disk usage OK ($DISK_USAGE%)"
else
    echo "⚠️  Disk usage high ($DISK_USAGE%)"
fi

echo "✅ Health check completed"
`;

  fs.writeFileSync(path.join(monitoringDir, 'health-check.sh'), healthCheckScript);
  fs.chmodSync(path.join(monitoringDir, 'health-check.sh'), '755');

  console.log('✓ Created monitoring scripts');
};

// Main setup function
const setupProduction = async () => {
  console.log('🚀 Setting up SYSME for production deployment...\n');

  try {
    createProductionDirectories();
    generateProductionEnv();
    createSSLPlaceholder();
    updatePackageScripts();
    createSystemdService();
    createNginxConfig();
    createMonitoringScripts();

    console.log('\n✅ Production setup completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. 🔐 Update .env.production with your actual database and email credentials');
    console.log('2. 🛡️  Place your SSL certificates in the ssl/ directory');
    console.log('3. 🗄️  Set up MySQL database and run the migration script');
    console.log('4. 🌐 Configure nginx with the provided configuration');
    console.log('5. 🔧 Install and enable the systemd service');
    console.log('6. 🔥 Configure firewall rules');
    console.log('7. 📊 Set up log rotation and monitoring');
    console.log('8. 🔄 Configure automated backups');
    console.log('\n📚 Commands to run:');
    console.log('   npm run migrate:mysql    # Migrate data to MySQL');
    console.log('   npm run start:prod       # Start in production mode');
    console.log('   ./scripts/monitoring/health-check.sh  # Check system health');

  } catch (error) {
    console.error('❌ Production setup failed:', error.message);
    process.exit(1);
  }
};

// Run setup if called directly
if (import.meta.url === \`file://\${process.argv[1]}\`) {
  setupProduction();
}

export { setupProduction };