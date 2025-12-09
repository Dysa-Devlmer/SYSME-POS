# 🖥️ J.A.R.V.I.S. MARK VII - Panel Web

Panel de control web en tiempo real para J.A.R.V.I.S. MARK VII.

## 📋 Características

- ✅ **Dashboard** - Estadísticas en tiempo real del sistema
- 🧠 **Memorias** - Visualización del sistema de memoria
- ✅ **Tareas** - Gestión completa de tareas (CRUD)
- 📁 **Proyectos** - Listado de proyectos activos
- 🔌 **WebSocket** - Actualizaciones en tiempo real
- 🎨 **React + Tailwind** - UI moderna y responsiva

## 🚀 Inicio Rápido

### Opción 1: Script automático (Windows)

```bash
# Desde la raíz del proyecto
INICIAR-PANEL-WEB.bat
```

### Opción 2: Manual

```bash
# Terminal 1: Backend
node web-interface/backend/server.js

# Terminal 2: Frontend
cd web-interface/frontend
npm run dev
```

### Opción 3: Con Node.js

```bash
node web-interface/start-panel.js
```

## 🌐 URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **WebSocket**: ws://localhost:3001

## 📊 API Endpoints

### Dashboard
- `GET /api/dashboard` - Estadísticas generales

### Memorias
- `GET /api/memories` - Listar memorias

### Tareas
- `GET /api/tasks` - Listar tareas
- `POST /api/tasks` - Crear tarea
- `PUT /api/tasks/:id` - Actualizar tarea
- `DELETE /api/tasks/:id` - Eliminar tarea

### Proyectos
- `GET /api/projects` - Listar proyectos

### Búsqueda
- `POST /api/search` - Buscar en memoria/tareas

### Comandos
- `POST /api/command` - Ejecutar comando

### Health
- `GET /api/health` - Estado del servidor

## 🔌 Eventos WebSocket

### Cliente → Servidor
- `command:execute` - Ejecutar comando
- `request:refresh` - Solicitar actualización de datos
- `ping` - Health check

### Servidor → Cliente
- `connected` - Confirmación de conexión
- `data:updated` - Datos actualizados
- `task:created` - Nueva tarea creada
- `task:updated` - Tarea actualizada
- `task:deleted` - Tarea eliminada
- `command:executed` - Comando ejecutado
- `pong` - Respuesta a ping

## 📁 Estructura

```
web-interface/
├── backend/
│   ├── server.js           # Servidor Express + Socket.io
│   └── modules/
│       └── jarvis-api.js   # Integración con JARVIS core
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Componente principal
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   └── components/
│   │       ├── MemoriesPanel.jsx
│   │       ├── TasksPanel.jsx
│   │       ├── ProjectsPanel.jsx
│   │       └── CommandInput.jsx
│   ├── vite.config.js
│   └── package.json
└── start-panel.js          # Script de inicio
```

## 🛠️ Tecnologías

### Backend
- Node.js + Express.js
- Socket.io (WebSocket)
- fs-extra (File system)
- CORS, dotenv

### Frontend
- React 18
- Vite (Build tool)
- TailwindCSS (Styling)
- Axios (HTTP client)
- Socket.io-client (WebSocket)

## ⚙️ Configuración

Variables de entorno en `.env`:

```env
NODE_ENV=development
PORT=3001
JWT_SECRET=jarvis-secret-key-2025
REACT_PORT=5173
```

## 🧪 Testing

Checklist básico:

1. ✅ Dashboard carga estadísticas correctas
2. ✅ Panel de Memoria muestra recuerdos
3. ✅ Panel de Tareas permite crear/editar/eliminar
4. ✅ WebSocket actualiza datos en tiempo real
5. ✅ Comandos se ejecutan desde el input

## 📝 Desarrollo

```bash
# Instalar dependencias backend
npm install

# Instalar dependencias frontend
cd web-interface/frontend
npm install

# Modo desarrollo (con hot reload)
npm run dev
```

## 🚀 Producción

```bash
# Build frontend
cd web-interface/frontend
npm run build

# El backend servirá automáticamente los archivos estáticos desde dist/
node web-interface/backend/server.js
```

## 💡 Notas

- El backend se conecta automáticamente a los archivos JSON de datos existentes
- Las actualizaciones son bidireccionales gracias a WebSocket
- El panel es completamente responsivo (mobile-friendly)
- Todos los componentes son reutilizables y modulares

---

**Desarrollado para J.A.R.V.I.S. MARK VII - FASE 5**
Panel Web Completo | Version 1.0.0
