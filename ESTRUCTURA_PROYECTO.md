# 📁 Estructura del Proyecto SYSME 2.0

**Última reorganización:** 2025-10-26

## 🎯 Organización Actual

```
SYSME/
│
├── 📱 APLICACIONES
│   ├── backend/              # Servidor Node.js + Express + SQLite
│   │   ├── src/             # Código fuente
│   │   ├── data/            # Base de datos SQLite
│   │   └── scripts/         # Scripts de BD y utilidades
│   │
│   ├── dashboard-web/        # Frontend React + TypeScript
│   │   ├── src/             # Código fuente React
│   │   ├── public/          # Archivos estáticos
│   │   └── dist/            # Build de producción
│   │
│   └── desktop/             # Aplicación Electron (opcional)
│
├── 📚 DOCUMENTACIÓN
│   ├── docs/                # Documentación principal
│   │   ├── validation/      # Reportes de validación
│   │   │   ├── ANALISIS_VALIDACION_FINAL.md
│   │   │   ├── VALIDACION_CORREGIDA.md
│   │   │   ├── VALIDATION_REPORT_PRODUCTION.md
│   │   │   └── ANALISIS_COMPARATIVO_SISTEMAS.md
│   │   │
│   │   ├── reports/         # Reportes del sistema
│   │   │   ├── ESTADO_SISTEMA_PRODUCCION.md
│   │   │   └── RESUMEN_EVALUACION.txt
│   │   │
│   │   ├── ACCESO_SISTEMA.md
│   │   ├── SISTEMA_LISTO.txt
│   │   ├── UBICACION_REPORTES.md
│   │   └── README.md        # Índice de documentación
│   │
│   └── README.md            # README principal del proyecto
│
├── 🔧 SCRIPTS Y HERRAMIENTAS
│   ├── scripts/             # Scripts de gestión
│   │   ├── INICIAR_SISTEMA.bat
│   │   ├── start-production.bat
│   │   ├── stop-production.bat
│   │   ├── fix-and-restart-production.bat
│   │   └── README.md        # Guía de scripts
│   │
│   ├── .claude-agent/       # Agente de validación propio
│   │   └── validation-agent.js
│   │
│   └── testsprite_tests/    # Tests automatizados
│
├── ⚙️ CONFIGURACIÓN
│   ├── .env                 # Variables de entorno
│   ├── .env.example         # Ejemplo de configuración
│   ├── .gitignore          # Git ignore
│   ├── package.json         # Dependencias raíz
│   ├── ecosystem.config.cjs # PM2 config
│   └── .claude/             # Configuración Claude Code
│
└── 🗂️ OTROS
    ├── avances/             # Versiones de desarrollo
    ├── health-monitor/      # Monitoreo del sistema
    └── node_modules/        # Dependencias npm
```

## 🗂️ Descripción de Carpetas Principales

### `/backend` - Servidor API
**Puerto:** 47851 (producción) | 3001 (desarrollo)

Servidor Node.js con Express que maneja:
- API REST completa
- Autenticación JWT
- Base de datos SQLite
- WebSocket para tiempo real
- Logs y monitoreo

### `/dashboard-web` - Frontend Web
**Puerto:** 23847 (producción) | 5173 (desarrollo)

Aplicación React moderna con:
- TypeScript para seguridad de tipos
- Tailwind CSS para estilos
- Vite como bundler
- React Router para navegación
- Zustand para estado global

### `/docs` - Documentación Organizada

#### `/docs/validation` - Reportes de Validación
Contiene todos los reportes técnicos de validación del sistema:
- Análisis de validación completo
- Correcciones aplicadas
- Comparativas con sistema antiguo
- Reportes de producción

#### `/docs/reports` - Reportes del Sistema
Contiene reportes de estado y evaluación:
- Estado para producción
- Resúmenes ejecutivos
- Evaluaciones técnicas

### `/scripts` - Scripts de Gestión
Scripts .bat para Windows que facilitan:
- Inicio del sistema (desarrollo y producción)
- Detención de procesos
- Reinicio tras correcciones
- Mantenimiento general

### `/.claude-agent` - Agente de Validación
Herramienta personalizada que valida:
- Base de datos
- Backend API
- Frontend
- Integración completa

## 📄 Archivos en la Raíz

Solo archivos de configuración esenciales permanecen en la raíz:

- `README.md` - Documentación principal
- `package.json` - Dependencias del proyecto
- `.env` / `.env.example` - Variables de entorno
- `.gitignore` - Exclusiones de Git
- `ecosystem.config.cjs` - Configuración PM2
- `ESTRUCTURA_PROYECTO.md` - Este archivo

## 🎯 Navegación Rápida

### Para Usuarios Nuevos
```
1. Leer: docs/ACCESO_SISTEMA.md
2. Verificar: docs/SISTEMA_LISTO.txt
3. Iniciar: scripts/INICIAR_SISTEMA.bat
```

### Para Desarrolladores
```
1. Revisar: docs/validation/VALIDACION_CORREGIDA.md
2. Consultar: docs/reports/ESTADO_SISTEMA_PRODUCCION.md
3. Leer: README.md (raíz del proyecto)
```

### Para Gestión del Sistema
```
1. Iniciar producción: scripts/start-production.bat
2. Detener: scripts/stop-production.bat
3. Validar: node .claude-agent/validation-agent.js
```

## ✅ Cambios Recientes (2025-10-26)

- ✅ Reorganizados archivos de documentación a `/docs`
- ✅ Movidos scripts de gestión a `/scripts`
- ✅ Creados índices de navegación (README.md en cada carpeta)
- ✅ Eliminados archivos temporales de la raíz
- ✅ Estructura limpia y profesional

---

**Mantener esta estructura ayuda a:**
- Encontrar archivos rápidamente
- Entender la organización del proyecto
- Mantener el código limpio y profesional
- Facilitar el onboarding de nuevos desarrolladores
