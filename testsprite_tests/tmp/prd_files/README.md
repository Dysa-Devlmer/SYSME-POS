# 🚀 SYSME 2.0 - Sistema Moderno de Gestión para Hostelería

## 📋 Descripción

SYSME 2.0 es la modernización completa del sistema de punto de venta para hostelería, transformado de una aplicación monolítica obsoleta a una arquitectura moderna de microservicios con tecnologías actuales.

### ✨ Características Principales

- **🔐 Seguridad Empresarial**: Autenticación JWT, encriptación de datos, protección CSRF
- **🌐 API REST Moderna**: Node.js + Express con documentación OpenAPI
- **⚛️ Dashboard Reactivo**: React 18 + TypeScript + Tailwind CSS
- **📱 PWA Móvil**: Aplicación web progresiva para carta digital
- **🐳 Containerizado**: Despliegue con Docker y Docker Compose
- **📊 Monitoreo**: Logs centralizados, métricas y alertas
- **⚡ Alto Rendimiento**: Redis para cache, optimización de imágenes
- **🔄 Tiempo Real**: WebSockets para actualizaciones instantáneas

## 🏗️ Arquitectura

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Frontend Web      │    │   Mobile PWA        │    │   Legacy PHP        │
│   (React + TS)      │    │   (React PWA)       │    │   (Compatibility)   │
└─────────┬───────────┘    └─────────┬───────────┘    └─────────┬───────────┘
          │                          │                          │
          └──────────────┬───────────────────────────────────────┘
                         │
            ┌─────────────▼───────────┐
            │    Nginx Proxy          │
            │    (Load Balancer)      │
            └─────────────┬───────────┘
                         │
            ┌─────────────▼───────────┐
            │    Backend API          │
            │    (Node.js + Express)  │
            └─────────────┬───────────┘
                         │
         ┌───────────────┬┴───────────────┐
         │               │                │
   ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
   │   MySQL   │   │   Redis   │   │  Storage  │
   │ Database  │   │   Cache   │   │  (Files)  │
   └───────────┘   └───────────┘   └───────────┘
```

## 🚀 Despliegue Rápido

### Prerrequisitos

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (para desarrollo)
- Git

### Instalación con Docker

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd SYSME

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 3. Construir y ejecutar
docker-compose up -d

# 4. Ejecutar migraciones de seguridad
docker-compose exec backend node scripts/migrate-security.js

# 5. Verificar servicios
docker-compose ps
```

### Acceso a la Aplicación

- **Dashboard Admin**: http://localhost:3000
- **Carta Móvil**: http://localhost:3002
- **API Backend**: http://localhost:3001
- **API Docs**: http://localhost:3001/docs

### Credenciales por Defecto

```
Usuario: admin
Password: admin123
```

**⚠️ IMPORTANTE**: Cambiar credenciales por defecto inmediatamente.

## 🛠️ Desarrollo Local

### Backend (API)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend (Dashboard)

```bash
cd dashboard-web
npm install
npm run dev
```

### Mobile (PWA)

```bash
cd dashboard-mobile
npm install
npm run dev
```

## 📊 Monitoreo y Logs

### Verificar Estado de Servicios

```bash
# Estado de contenedores
docker-compose ps

# Logs de servicios
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mysql

# Health checks
curl http://localhost:3001/health
curl http://localhost:3000/health
```

### Métricas Importantes

- **CPU y Memoria**: `docker stats`
- **Conexiones BD**: Logs de MySQL
- **Cache Hit Rate**: Métricas de Redis
- **Response Times**: Logs de Nginx

## 🔒 Seguridad

### Configuraciones Implementadas

- ✅ Autenticación JWT con refresh tokens
- ✅ Encriptación de configuraciones sensibles
- ✅ Validación de entrada con Joi
- ✅ Rate limiting y protección DDOS
- ✅ Headers de seguridad (HSTS, CSP, etc.)
- ✅ SQL Injection prevention (PDO/Prepared statements)
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ Password hashing (Argon2/bcrypt)

### Actualizar Seguridad

```bash
# Ejecutar migraciones de seguridad
docker-compose exec backend npm run migrate:security

# Generar nuevos tokens JWT
docker-compose exec backend npm run tokens:regenerate

# Actualizar passwords
docker-compose exec backend npm run passwords:update
```

## 🗄️ Base de Datos

### Backup

```bash
# Backup completo
docker-compose exec mysql mysqldump -u root -p sysme > backup_$(date +%Y%m%d).sql

# Backup automático (cron)
# 0 2 * * * /path/to/backup-script.sh
```

### Restore

```bash
# Restaurar backup
docker-compose exec -T mysql mysql -u root -p sysme < backup_20240101.sql
```

### Migraciones

```bash
# Ejecutar migraciones pendientes
docker-compose exec backend npm run db:migrate

# Rollback última migración
docker-compose exec backend npm run db:rollback
```

## 🔧 Configuración Avanzada

### Variables de Entorno Críticas

```env
# Seguridad (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=your_super_secret_key_min_32_chars
DB_ROOT_PASSWORD=secure_root_password
DB_PASS=secure_db_password

# URLs y Puertos
VITE_API_URL=http://localhost:3001/api/v1
CORS_ORIGIN=http://localhost:3000,http://localhost:3002

# Características
ENABLE_2FA=true
ENABLE_AUDIT_LOG=true
ENABLE_EMAIL_NOTIFICATIONS=true
```

### SSL/HTTPS (Producción)

```bash
# Generar certificados SSL
mkdir nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# Descomentar configuración HTTPS en nginx/conf.d/sysme.conf
# Reiniciar nginx
docker-compose restart nginx
```

## 📈 Escalabilidad

### Optimizaciones

```bash
# Optimizar imágenes
docker-compose exec backend npm run images:optimize

# Limpiar cache
docker-compose exec redis redis-cli FLUSHALL

# Optimizar base de datos
docker-compose exec mysql mysql -u root -p -e "OPTIMIZE TABLE productos, categorias, ventas;"
```

### Múltiples Instancias

```yaml
# docker-compose.prod.yml
services:
  backend:
    deploy:
      replicas: 3
  
  nginx:
    depends_on:
      - backend
```

## 🐛 Resolución de Problemas

### Problemas Comunes

**Error de conexión a base de datos**:
```bash
# Verificar estado de MySQL
docker-compose exec mysql mysql -u root -p -e "SELECT 1;"

# Recrear contenedor MySQL
docker-compose down mysql
docker-compose up -d mysql
```

**Error de cache Redis**:
```bash
# Limpiar Redis
docker-compose exec redis redis-cli FLUSHALL

# Reiniciar Redis
docker-compose restart redis
```

**Problemas de permisos**:
```bash
# Corregir permisos de uploads
sudo chown -R 1001:1001 uploads/
chmod -R 755 uploads/
```

### Logs de Debug

```bash
# Logs detallados
docker-compose logs -f --tail=100 backend
docker-compose logs -f --tail=100 mysql
docker-compose logs -f --tail=100 redis

# Logs de errores específicos
grep -i error logs/app.log
grep -i "sql" logs/app.log
grep -i "auth" logs/security.log
```

## 🔄 Actualizaciones

### Actualizar SYSME

```bash
# 1. Backup
./scripts/backup.sh

# 2. Descargar nueva versión
git pull origin main

# 3. Actualizar contenedores
docker-compose pull
docker-compose up -d --build

# 4. Ejecutar migraciones
docker-compose exec backend npm run db:migrate

# 5. Verificar servicios
docker-compose ps
```

### Rollback

```bash
# Rollback a versión anterior
git checkout <previous-version>
docker-compose up -d --build
docker-compose exec backend npm run db:rollback
```

## 📞 Soporte

### Contacto Técnico

- **Email**: soporte.tecnico@sysme.local
- **Documentación**: `/docs` en cada servicio
- **Issues**: GitHub Issues del repositorio

### Logs para Soporte

```bash
# Generar reporte completo
./scripts/generate-support-report.sh

# El reporte incluye:
# - Versiones de servicios
# - Estado de contenedores
# - Logs recientes
# - Configuraciones (sin credenciales)
```

## 📚 Documentación Adicional

- [API Documentation](./docs/API.md)
- [Frontend Development](./docs/FRONTEND.md)
- [Mobile PWA Development](./docs/MOBILE.md)
- [Database Schema](./docs/DATABASE.md)
- [Security Guide](./docs/SECURITY.md)
- [Performance Optimization](./docs/PERFORMANCE.md)

## 🆕 Changelog

### v2.0.0 (2024-12-XX)
- ✨ Arquitectura completamente renovada
- ✨ Seguridad empresarial implementada
- ✨ PWA móvil para carta digital
- ✨ Dashboard React moderno
- ✨ API REST con documentación
- ✨ Containerización con Docker
- ✨ Sistema de logs y métricas
- 🐛 Corrección de vulnerabilidades críticas
- ⚡ Mejoras de rendimiento significativas

### v1.0.0 (Legacy)
- Sistema PHP monolítico (deprecado)
- Vulnerabilidades de seguridad identificadas
- Requiere migración urgente

---

**🎉 ¡SYSME 2.0 está listo para producción!**

La modernización está completa. El sistema ahora cuenta con:
- Seguridad empresarial
- Arquitectura escalable
- Tecnologías modernas
- Despliegue automatizado
- Monitoreo completo

Para cualquier duda durante la implementación, consulta la documentación técnica o contacta al equipo de soporte.