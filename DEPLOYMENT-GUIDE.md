# Guía de Deployment - SYSME POS v2.1

## 📋 Tabla de Contenidos

1. [Prerequisitos](#prerequisitos)
2. [Configuración del Servidor](#configuración-del-servidor)
3. [Deployment con Docker](#deployment-con-docker)
4. [Deployment Manual](#deployment-manual)
5. [Deployment en Cloud](#deployment-en-cloud)
6. [Configuración de Base de Datos](#configuración-de-base-de-datos)
7. [Configuración de Nginx](#configuración-de-nginx)
8. [SSL/HTTPS](#sslhttps)
9. [Monitoreo y Logs](#monitoreo-y-logs)
10. [Backup y Recuperación](#backup-y-recuperación)
11. [Troubleshooting](#troubleshooting)

## 🔧 Prerequisitos

### Servidor

**Especificaciones Mínimas:**
- CPU: 2 cores
- RAM: 4GB
- Disco: 20GB SSD
- SO: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

**Especificaciones Recomendadas:**
- CPU: 4+ cores
- RAM: 8GB+
- Disco: 50GB+ SSD
- SO: Ubuntu 22.04 LTS

### Software Requerido

```bash
Node.js >= 18.0.0
npm >= 9.0.0
MySQL >= 8.0 o PostgreSQL >= 14
Redis >= 7.0 (opcional pero recomendado)
Nginx >= 1.18
Git >= 2.30
PM2 (para process management)
```

## 🖥️ Configuración del Servidor

### 1. Actualizar Sistema

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### 2. Instalar Node.js

```bash
# Usando nvm (recomendado)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# O usando NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Instalar MySQL

```bash
# Ubuntu/Debian
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Configurar MySQL
sudo mysql
```

```sql
CREATE DATABASE sysme_pos;
CREATE USER 'sysme_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON sysme_pos.* TO 'sysme_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Instalar Redis (Opcional)

```bash
# Ubuntu/Debian
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Verificar
redis-cli ping
# Debe responder: PONG
```

### 5. Instalar Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 6. Instalar PM2

```bash
npm install -g pm2
pm2 startup
# Ejecutar el comando que PM2 sugiere
```

## 🐳 Deployment con Docker

### Opción 1: Docker Compose (Recomendado)

**1. Crear estructura de directorios:**

```bash
mkdir -p /opt/sysme-pos
cd /opt/sysme-pos
```

**2. Clonar repositorio:**

```bash
git clone https://github.com/your-org/sysme-pos.git .
```

**3. Configurar variables de entorno:**

```bash
cp .env.example .env
nano .env
```

```env
# Producción
NODE_ENV=production
PORT=3001

# Base de datos
DB_TYPE=mysql
DB_HOST=mysql
DB_PORT=3306
DB_USER=sysme_user
DB_PASSWORD=secure_password_here
DB_NAME=sysme_pos

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Seguridad
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
SESSION_SECRET=your-session-secret-min-32-chars

# CORS
CORS_ORIGIN=https://your-domain.com

# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@your-domain.com

# Logs
LOG_LEVEL=info
LOG_DIRECTORY=/var/log/sysme-pos
```

**4. Construir y ejecutar:**

```bash
docker-compose up -d
```

**5. Verificar servicios:**

```bash
docker-compose ps
docker-compose logs -f app
```

**6. Ejecutar migraciones:**

```bash
docker-compose exec app npm run migrate
```

**7. Crear usuario admin:**

```bash
docker-compose exec app npm run seed:admin
```

### Opción 2: Docker Manual

**1. Build de imágenes:**

```bash
# Backend
docker build -t sysme/pos-backend:2.1.0 -f Dockerfile .

# Frontend
docker build -t sysme/pos-frontend:2.1.0 -f web-interface/frontend/Dockerfile ./web-interface/frontend
```

**2. Crear red:**

```bash
docker network create sysme-network
```

**3. Ejecutar MySQL:**

```bash
docker run -d \
  --name sysme-mysql \
  --network sysme-network \
  -e MYSQL_ROOT_PASSWORD=root_password \
  -e MYSQL_DATABASE=sysme_pos \
  -e MYSQL_USER=sysme_user \
  -e MYSQL_PASSWORD=secure_password \
  -v sysme-mysql-data:/var/lib/mysql \
  mysql:8.0
```

**4. Ejecutar Redis:**

```bash
docker run -d \
  --name sysme-redis \
  --network sysme-network \
  -v sysme-redis-data:/data \
  redis:7-alpine
```

**5. Ejecutar Backend:**

```bash
docker run -d \
  --name sysme-backend \
  --network sysme-network \
  -p 3001:3001 \
  -e DB_HOST=sysme-mysql \
  -e REDIS_HOST=sysme-redis \
  --env-file .env \
  -v /opt/sysme-pos/logs:/var/log/sysme-pos \
  sysme/pos-backend:2.1.0
```

**6. Ejecutar Frontend:**

```bash
docker run -d \
  --name sysme-frontend \
  --network sysme-network \
  -p 5173:80 \
  sysme/pos-frontend:2.1.0
```

## 📦 Deployment Manual

### 1. Preparación del Servidor

```bash
# Crear usuario para la aplicación
sudo useradd -m -s /bin/bash sysme
sudo usermod -aG sudo sysme

# Cambiar a usuario sysme
sudo su - sysme
```

### 2. Clonar Repositorio

```bash
cd ~
git clone https://github.com/your-org/sysme-pos.git
cd sysme-pos
```

### 3. Configurar Backend

```bash
cd backend

# Instalar dependencias
npm ci --production

# Copiar y configurar .env
cp .env.example .env
nano .env

# Ejecutar migraciones
npm run migrate

# Seed de datos iniciales
npm run seed
```

### 4. Build Frontend

```bash
cd ../web-interface/frontend

# Instalar dependencias
npm ci

# Build para producción
npm run build

# Los archivos estarán en dist/
```

### 5. Configurar PM2

```bash
cd ~/sysme-pos/backend

# Crear ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'sysme-pos-backend',
    script: 'src/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/sysme-pos/error.log',
    out_file: '/var/log/sysme-pos/out.log',
    log_file: '/var/log/sysme-pos/combined.log',
    time: true
  }]
};
```

```bash
# Iniciar aplicación
pm2 start ecosystem.config.js

# Guardar configuración
pm2 save

# Verificar
pm2 status
pm2 logs
```

### 6. Configurar Auto-inicio

```bash
pm2 startup
# Ejecutar el comando que PM2 sugiere

pm2 save
```

## ☁️ Deployment en Cloud

### AWS (Amazon Web Services)

#### Opción 1: EC2 + RDS

**1. Crear EC2 Instance:**

```bash
# AMI: Ubuntu 22.04 LTS
# Tipo: t3.medium o superior
# Security Group:
#   - 22 (SSH)
#   - 80 (HTTP)
#   - 443 (HTTPS)
#   - 3001 (Backend - temporal)
```

**2. Crear RDS MySQL:**

```bash
# Engine: MySQL 8.0
# Instance: db.t3.small o superior
# Storage: 20GB SSD
# Backup: 7 días
# Security Group: Permitir conexión desde EC2
```

**3. Conectar y Configurar:**

```bash
# SSH a EC2
ssh -i your-key.pem ubuntu@ec2-ip

# Seguir pasos de "Deployment Manual"
# Configurar .env con endpoint de RDS
```

#### Opción 2: ECS (Elastic Container Service)

**1. Crear ECR Repository:**

```bash
aws ecr create-repository --repository-name sysme-pos
```

**2. Build y Push:**

```bash
# Login a ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Build
docker build -t sysme-pos .

# Tag
docker tag sysme-pos:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/sysme-pos:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/sysme-pos:latest
```

**3. Crear ECS Task Definition, Service y Cluster**

### Google Cloud Platform (GCP)

#### Cloud Run

**1. Build con Cloud Build:**

```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/sysme-pos
```

**2. Deploy:**

```bash
gcloud run deploy sysme-pos \
  --image gcr.io/PROJECT_ID/sysme-pos \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production \
  --add-cloudsql-instances PROJECT_ID:REGION:INSTANCE_NAME
```

### Azure

#### Azure App Service

**1. Crear Resource Group:**

```bash
az group create --name sysme-pos-rg --location eastus
```

**2. Crear App Service Plan:**

```bash
az appservice plan create \
  --name sysme-pos-plan \
  --resource-group sysme-pos-rg \
  --sku B2 \
  --is-linux
```

**3. Crear Web App:**

```bash
az webapp create \
  --resource-group sysme-pos-rg \
  --plan sysme-pos-plan \
  --name sysme-pos \
  --runtime "NODE|18-lts"
```

**4. Deploy:**

```bash
az webapp deployment source config \
  --name sysme-pos \
  --resource-group sysme-pos-rg \
  --repo-url https://github.com/your-org/sysme-pos \
  --branch master \
  --manual-integration
```

### DigitalOcean

#### Droplet

**1. Crear Droplet:**
- Imagen: Ubuntu 22.04 LTS
- Plan: Basic - $24/mo (2 vCPUs, 4GB RAM)
- Datacenter: Nearest to your users

**2. Configurar:**

Seguir pasos de "Deployment Manual"

#### App Platform

**1. Conectar GitHub Repository**

**2. Configurar:**
```yaml
name: sysme-pos
services:
- name: backend
  github:
    repo: your-org/sysme-pos
    branch: master
    deploy_on_push: true
  build_command: cd backend && npm ci
  run_command: cd backend && npm start
  envs:
  - key: NODE_ENV
    value: production
  http_port: 3001
  instance_count: 2
  instance_size_slug: basic-xxs

databases:
- name: sysme-db
  engine: MYSQL
  version: "8"
```

## 🗄️ Configuración de Base de Datos

### MySQL Production Config

```bash
# Editar MySQL config
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

```ini
[mysqld]
# Optimizaciones de performance
max_connections = 200
innodb_buffer_pool_size = 2G
innodb_log_file_size = 512M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT

# Configuración de character set
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# Slow query log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Binary logging (para backups)
log_bin = /var/log/mysql/mysql-bin.log
expire_logs_days = 7
max_binlog_size = 100M
```

```bash
# Reiniciar MySQL
sudo systemctl restart mysql
```

### Crear Índices Importantes

```sql
USE sysme_pos;

-- Índices de performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_inventory_product ON inventory(product_id);

-- Índices compuestos
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_products_category_status ON products(category_id, status);
```

## 🌐 Configuración de Nginx

### Como Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/sysme-pos
```

```nginx
# Upstream para backend
upstream backend {
    least_conn;
    server localhost:3001;
    # Para cluster con PM2
    # server localhost:3001;
    # server localhost:3002;
    # server localhost:3003;
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logs
    access_log /var/log/nginx/sysme-pos-access.log;
    error_log /var/log/nginx/sysme-pos-error.log;

    # Root para frontend (build de React)
    root /home/sysme/sysme-pos/web-interface/frontend/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Frontend (React SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer size
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # WebSocket Support
    location /socket.io/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static files caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Denegar acceso a archivos ocultos
    location ~ /\. {
        deny all;
    }
}
```

```bash
# Habilitar sitio
sudo ln -s /etc/nginx/sites-available/sysme-pos /etc/nginx/sites-enabled/

# Test configuración
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## 🔒 SSL/HTTPS

### Con Let's Encrypt (Certbot)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run

# El renewal es automático vía cron
```

### Renovación Manual

```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 📊 Monitoreo y Logs

### PM2 Monitoring

```bash
# Dashboard
pm2 monit

# Logs en tiempo real
pm2 logs

# Logs de app específica
pm2 logs sysme-pos-backend

# Métricas
pm2 describe sysme-pos-backend
```

### Configurar PM2 Plus (Monitoring Cloud)

```bash
pm2 link <secret_key> <public_key>
```

### Log Rotation

```bash
# Instalar PM2 log rotate
pm2 install pm2-logrotate

# Configurar
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### Nginx Logs

```bash
# Access log
tail -f /var/log/nginx/sysme-pos-access.log

# Error log
tail -f /var/log/nginx/sysme-pos-error.log

# Rotar logs
sudo logrotate -f /etc/logrotate.d/nginx
```

### Application Logs

```bash
# Ver logs
tail -f /var/log/sysme-pos/combined.log

# Buscar errores
grep -i error /var/log/sysme-pos/error.log
```

## 💾 Backup y Recuperación

### Backup Automático de Base de Datos

```bash
# Crear script de backup
sudo nano /usr/local/bin/backup-sysme-db.sh
```

```bash
#!/bin/bash

# Variables
DB_NAME="sysme_pos"
DB_USER="sysme_user"
DB_PASS="secure_password"
BACKUP_DIR="/backup/sysme-pos/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/sysme_pos_$DATE.sql.gz

# Eliminar backups antiguos
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log
echo "Backup completado: sysme_pos_$DATE.sql.gz"
```

```bash
# Dar permisos
sudo chmod +x /usr/local/bin/backup-sysme-db.sh

# Programar cron (diario a las 2 AM)
sudo crontab -e
```

```cron
0 2 * * * /usr/local/bin/backup-sysme-db.sh >> /var/log/sysme-backup.log 2>&1
```

### Backup de Archivos

```bash
# Script de backup de aplicación
#!/bin/bash

APP_DIR="/home/sysme/sysme-pos"
BACKUP_DIR="/backup/sysme-pos/files"
DATE=$(date +%Y%m%d_%H%M%S)

tar -czf $BACKUP_DIR/sysme-pos-files_$DATE.tar.gz \
    $APP_DIR/uploads \
    $APP_DIR/.env \
    --exclude=node_modules

# Limpiar backups viejos
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### Restauración de Base de Datos

```bash
# Restaurar desde backup
gunzip < /backup/sysme-pos/mysql/sysme_pos_20250122_020000.sql.gz | mysql -u sysme_user -p sysme_pos
```

### Backup a S3 (AWS)

```bash
# Instalar AWS CLI
sudo apt install awscli -y

# Configurar
aws configure

# Subir a S3
aws s3 sync /backup/sysme-pos/ s3://your-bucket/sysme-pos-backups/ --delete
```

## 🔍 Troubleshooting

### Backend no inicia

```bash
# Verificar logs
pm2 logs sysme-pos-backend

# Verificar puerto
sudo netstat -tlnp | grep 3001

# Verificar variables de entorno
pm2 env sysme-pos-backend

# Test manual
cd ~/sysme-pos/backend
NODE_ENV=production node src/server.js
```

### Error de conexión a base de datos

```bash
# Verificar MySQL está corriendo
sudo systemctl status mysql

# Test conexión
mysql -u sysme_user -p -h localhost sysme_pos

# Verificar credenciales en .env
cat ~/sysme-pos/backend/.env | grep DB_
```

### Nginx 502 Bad Gateway

```bash
# Verificar backend está corriendo
pm2 status

# Verificar Nginx config
sudo nginx -t

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar servicios
pm2 restart all
sudo systemctl restart nginx
```

### Alto uso de memoria

```bash
# Ver procesos
pm2 monit

# Limitar memoria en PM2
pm2 start ecosystem.config.js --max-memory-restart 1G

# Verificar memory leaks
pm2 describe sysme-pos-backend
```

### Logs llenos

```bash
# Ver uso de disco
df -h

# Limpiar logs antiguos
sudo find /var/log -name "*.log" -mtime +30 -delete

# Configurar rotación
sudo nano /etc/logrotate.d/sysme-pos
```

### Performance lenta

```bash
# Verificar MySQL slow queries
sudo tail -f /var/log/mysql/slow.log

# Verificar load average
uptime

# Top processes
htop

# Optimizar base de datos
mysql -u root -p
```

```sql
USE sysme_pos;
ANALYZE TABLE orders, products, users;
OPTIMIZE TABLE orders, products, users;
```

## 📋 Checklist de Deployment

### Pre-Deployment

- [ ] Tests pasan localmente
- [ ] Build de frontend exitoso
- [ ] Variables de entorno configuradas
- [ ] Base de datos respaldada
- [ ] Migraciones testeadas
- [ ] SSL certificates listos
- [ ] DNS configurado
- [ ] Monitoreo configurado

### Durante Deployment

- [ ] Modo mantenimiento activado (opcional)
- [ ] Pull latest code
- [ ] Instalar dependencias
- [ ] Build frontend
- [ ] Ejecutar migraciones
- [ ] Restart servicios
- [ ] Verificar health checks
- [ ] Test funcionalidad crítica

### Post-Deployment

- [ ] Verificar logs
- [ ] Test E2E básicos
- [ ] Monitorear performance
- [ ] Verificar backups
- [ ] Documentar cambios
- [ ] Notificar equipo

## 🎉 Conclusión

¡SYSME POS v2.1 está listo para producción!

Para soporte adicional, consulta:
- [CONTRIBUTING.md](./CONTRIBUTING.md)
- [README.md](./README.md)
- [GitHub Issues](https://github.com/your-org/sysme-pos/issues)

---

**Última actualización:** Enero 2025
**Versión:** 2.1.0
**Autor:** SYSME Development Team
