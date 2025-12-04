# 🤖 SYSME-POS v3.0.0 - JARVIS Mark VII Edition

## Sistema de Punto de Venta Inteligente con IA

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/Dysa-Devlmer/SYSME-POS)
[![JARVIS](https://img.shields.io/badge/JARVIS-Mark%20VII%20v2.1.0-green.svg)](https://github.com/Dysa-Devlmer/SYSME-POS)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Business%20API-25D366.svg)](https://github.com/Dysa-Devlmer/SYSME-POS)
[![Status](https://img.shields.io/badge/status-In%20Development-yellow.svg)](https://github.com/Dysa-Devlmer/SYSME-POS)

---

## 📋 Descripción

**SYSME-POS** es un sistema completo de punto de venta diseñado específicamente para restaurantes, ahora completamente **reestructurado** siguiendo la arquitectura **JARVIS Mark VII v2.1.0**.

### ✨ Características Destacadas

- 🧠 **Memoria Neural de 3 Niveles**: Working Memory, Long-term Memory, Episodic Memory
- 🤖 **Agente Autónomo**: Planificación, Ejecución y Auto-verificación
- 💬 **WhatsApp Business API**: Chatbot conversacional con IA
- 🔐 **Seguridad Avanzada**: JWT + RBAC + Auth Manager
- 📊 **Analytics con IA**: Predicciones y detección de anomalías
- ⚡ **Socket.IO**: Comunicación en tiempo real
- 🎯 **Arquitectura Modular**: Código limpio y escalable

---

## 🏗️ Arquitectura

```
SYSME-POS/
│
├── 📁 core/                          # ⭐ NÚCLEO JARVIS MARK VII
│   ├── api-server.js                 # API REST Server (Puerto 7777)
│   ├── autonomous-agent/             # Agente autónomo (Planner + Executor + Verifier)
│   ├── neural-memory/                # Memoria neural (3 niveles)
│   ├── security/                     # Auth Manager + JWT + RBAC
│   ├── backup/                       # Backup automático
│   ├── code-search/                  # Búsqueda semántica
│   ├── documentation/                # Generador de docs
│   ├── learning/                     # Pattern matching
│   ├── logging/                      # Sistema de logs
│   ├── performance/                  # Monitor de rendimiento
│   ├── proactive/                    # Agente proactivo
│   ├── scheduler/                    # Programador de tareas
│   ├── testing/                      # Test runner
│   ├── voice/                        # Comandos de voz
│   └── web-intelligence/             # Motor de búsqueda web + IA
│
├── 📁 web-interface/                 # ⭐ INTERFAZ WEB
│   ├── backend/                      # API Backend (Express + Socket.IO)
│   └── frontend/                     # React + Vite + TailwindCSS
│
├── 📁 backend/                       # Backend POS (Temporal - migrar a core/)
├── 📁 dashboard-web/                 # Frontend React (Puerto 5173)
│
├── 📁 tests/                         # ⭐ TESTS
│   ├── unit/                         # Tests unitarios
│   └── integration/                  # Tests de integración
│
├── 📁 memory/                        # Bases de datos SQLite
├── 📁 logs/                          # Logs del sistema
├── 📁 data/                          # Datos y contextos
├── 📁 templates/                     # Plantillas
│
├── 📄 package.json                   # Dependencies raíz
├── 📄 CHANGELOG.md                   # Historial de cambios
├── 📄 README-JARVIS.md               # Documentación JARVIS
└── 📄 LICENSE                        # Licencia MIT
```

---

## 🚀 Instalación Rápida

### Prerrequisitos
- Node.js v18+
- npm v9+
- MySQL 8.0+ (o SQLite)
- Git

### Instalación

```bash
# 1. Clonar repositorio
git clone https://github.com/Dysa-Devlmer/SYSME-POS.git
cd SYSME-POS

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 4. Iniciar JARVIS API Server
node core/api-server.js

# 5. En otra terminal - Backend POS
cd backend
npm install
npm run dev

# 6. En otra terminal - Frontend
cd dashboard-web
npm install
npm run dev
```

### Acceso al Sistema

- **Frontend**: http://localhost:5173
- **JARVIS API**: http://localhost:7777
- **Backend POS**: http://localhost:3001
- **Health Check**: http://localhost:7777/health

---

## 📊 Endpoints Principales

### JARVIS Core API
```
GET  /health                      # Estado del servidor
GET  /api                         # Info de la API
GET  /api/jarvis/status           # Estado de JARVIS
GET  /api/jarvis/metrics          # Métricas de rendimiento
```

### Socket.IO Events
```javascript
// Cliente conectado
socket.on('connection', (socket) => { ... })

// Eventos en tiempo real
socket.emit('sale:created', data)
socket.emit('inventory:updated', data)
socket.emit('whatsapp:message', data)
```

---

## 🔧 Configuración

### Variables de Entorno (.env)

```env
# API Configuration
API_PORT=7777
API_HOST=0.0.0.0
NODE_ENV=development

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3001

# JARVIS AI
ENABLE_JARVIS_AI=true
ENABLE_JARVIS_MEMORY=true
ENABLE_JARVIS_AUTONOMOUS=true

# WhatsApp Business API
WHATSAPP_API_KEY=your_api_key
WHATSAPP_PHONE_NUMBER=+56912345678
WHATSAPP_WEBHOOK_URL=https://yourdomain.com/webhook

# Database
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sysme_pos
DB_USER=root
DB_PASSWORD=
```

---

## 🎯 Estado del Proyecto

### ✅ Completado (v3.0.0)
- [x] Limpieza de código legacy (~50MB eliminados)
- [x] Estructura `core/` JARVIS Mark VII
- [x] API Server base (Puerto 7777)
- [x] Socket.IO integrado
- [x] Documentación inicial
- [x] CHANGELOG completo

### 🚧 En Desarrollo (Próximas semanas)
- [ ] Sistema de memoria neural (3 niveles)
- [ ] Agente autónomo completo
- [ ] WhatsApp Business API
- [ ] Chatbot conversacional con IA
- [ ] Tests unitarios e integración
- [ ] Migración completa backend a core/

---

## 📚 Documentación

- [README-JARVIS.md](./README-JARVIS.md) - Documentación detallada JARVIS
- [CHANGELOG.md](./CHANGELOG.md) - Historial de cambios
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guía de contribución
- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) - Código de conducta
- [SECURITY.md](./SECURITY.md) - Políticas de seguridad

---

## 🤝 Contribuir

Las contribuciones son bienvenidas! Ver [CONTRIBUTING.md](./CONTRIBUTING.md)

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

---

## 👥 Equipo

- **Desarrollo**: Dysa-Devlmer
- **IA Integration**: JARVIS Mark VII System
- **Arquitectura**: SYSME + JARVIS Bridge

---

## 📞 Soporte

- **Issues**: [GitHub Issues](https://github.com/Dysa-Devlmer/SYSME-POS/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Dysa-Devlmer/SYSME-POS/discussions)

---

**Versión**: 3.0.0
**Última Actualización**: 3 de Diciembre 2025
**Estado**: En desarrollo activo

---

🤖 Powered by JARVIS Mark VII v2.1.0
💼 Built with ❤️ for the restaurant industry
