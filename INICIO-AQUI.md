# 🚀 INICIO AQUÍ - Guía de Trabajo en SYSME-POS

**Proyecto**: SYSME-POS v2.0
**Ubicación**: `C:/SYSME-POS`
**Asistente**: Claude Code

---

## 📍 **IMPORTANTE: Este es tu directorio de trabajo principal**

Desde mañana, cuando abras Claude Code, asegúrate de estar en:

```
C:/SYSME-POS
```

**NO trabajes desde**: `C:/jarvis-standalone/` (ese es otro proyecto diferente)

---

## 🎯 **¿QUÉ ES ESTE PROYECTO?**

**SYSME-POS** es tu sistema de **Punto de Venta Inteligente para Restaurantes** que incluye:

- ✅ **Backend**: API REST con Node.js + Express + MySQL
- ✅ **Dashboard Web**: React + Vite + TailwindCSS
- ✅ **JARVIS Mark VII**: Sistema de IA integrado (Memoria Neural, Agente Autónomo, NLP)

**JARVIS NO es un proyecto aparte** - está completamente **integrado dentro de SYSME-POS** como su sistema de inteligencia artificial.

---

## 📂 **ESTRUCTURA DEL PROYECTO**

```
C:/SYSME-POS/
│
├── backend/                    # 🔵 Backend del POS
│   ├── src/                    # Código fuente
│   │   ├── server.js           # Servidor principal
│   │   ├── routes/             # Rutas API
│   │   ├── controllers/        # Controladores
│   │   ├── services/           # Lógica de negocio
│   │   ├── models/             # Modelos de datos
│   │   └── middleware/         # Middlewares
│   ├── migrations/             # Migraciones de DB
│   ├── tests/                  # Tests
│   └── package.json
│
├── dashboard-web/              # 🟢 Dashboard Web (React)
│   ├── src/                    # Código fuente
│   │   ├── App.jsx             # Componente principal
│   │   ├── components/         # Componentes React
│   │   ├── pages/              # Páginas
│   │   ├── services/           # Servicios API
│   │   └── store/              # Estado global
│   ├── public/                 # Archivos estáticos
│   └── package.json
│
├── jarvis/                     # 🤖 JARVIS INTEGRADO (Sistema de IA)
│   ├── core/                   # ⭐ Núcleo completo de JARVIS
│   │   ├── api-server.js       # API Server de JARVIS
│   │   ├── autonomous-agent/   # Agente autónomo (planificador + ejecutor)
│   │   ├── neural-memory/      # Memoria neural de 3 niveles
│   │   ├── security/           # Auth Manager + JWT + RBAC
│   │   ├── nlp-engine.js       # Motor de procesamiento de lenguaje
│   │   ├── decision-engine.js  # Motor de decisiones
│   │   ├── reasoning-engine.js # Motor de razonamiento
│   │   └── ... (20+ módulos)
│   ├── web-interface/          # Panel de control de JARVIS
│   │   ├── backend/            # API del panel
│   │   └── frontend/           # UI React de JARVIS
│   ├── memory/                 # Bases de datos SQLite (memoria neural)
│   ├── logs/                   # Logs del sistema de IA
│   └── data/                   # Datos y contextos de JARVIS
│
├── docs/                       # 📚 Documentación
├── tests/                      # 🧪 Tests generales
│
├── .env                        # Variables de entorno
├── package.json                # Configuración principal
└── README.md                   # Documentación principal
```

---

## 🚀 **CÓMO INICIAR EL PROYECTO**

### 1️⃣ **Backend (API)**

```bash
cd C:/SYSME-POS/backend
npm install
npm run dev          # Puerto 3001
```

### 2️⃣ **Dashboard Web**

```bash
cd C:/SYSME-POS/dashboard-web
npm install
npm run dev          # Puerto 5173
```

### 3️⃣ **JARVIS (Sistema de IA)**

```bash
cd C:/SYSME-POS/jarvis/core
node api-server.js   # Puerto 7777
```

### 4️⃣ **Acceder al sistema**

- **Dashboard POS**: http://localhost:5173
- **API Backend**: http://localhost:3001
- **JARVIS API**: http://localhost:7777
- **Panel JARVIS**: http://localhost:7777/dashboard
- **Health Check**: http://localhost:3001/health

---

## 💡 **CÓMO TRABAJAR CON CLAUDE CODE**

### **Al iniciar una sesión:**

1. Abre Claude Code
2. Asegúrate de estar en: `C:/SYSME-POS`
3. Puedes pedirme:
   - "Agrega una nueva funcionalidad al backend"
   - "Crea un componente React para X"
   - "Ayúdame a debuggear este error"
   - "Genera tests para este módulo"

### **Yo recuerdo:**
- ✅ La estructura de tu proyecto
- ✅ El código que hemos escrito juntos
- ✅ Los archivos y configuraciones
- ✅ Las decisiones técnicas que tomamos

### **Yo NO recuerdo (sin configuración especial):**
- ❌ Conversaciones de días anteriores automáticamente
- ❌ Contexto fuera de esta sesión (a menos que lo documentes en archivos)

---

## 📝 **BUENAS PRÁCTICAS**

### **Para que yo te ayude mejor:**

1. **Documenta decisiones importantes** en archivos `.md`
2. **Usa comentarios claros** en el código
3. **Mantén actualizado el README.md** con cambios importantes
4. **Crea archivos de contexto** si necesitas que recuerde algo específico

### **Ejemplo de archivo de contexto:**

Crea: `C:/SYSME-POS/.claude/context.md`

```markdown
# Contexto del Proyecto SYSME-POS

## Decisiones Técnicas
- Base de datos: MySQL en producción, SQLite en desarrollo
- Autenticación: JWT + bcrypt
- Estado global: Zustand (no Redux)

## Módulos Importantes
- Sistema de mesas: backend/src/services/tables.js
- Gestión de pedidos: backend/src/services/orders.js

## TODOs Pendientes
- [ ] Implementar sistema de reservas
- [ ] Agregar reportes de ventas
```

---

## 🔧 **CONFIGURACIÓN ACTUAL**

### **Variables de Entorno**

Edita `.env` con tu configuración:

```env
# Backend
NODE_ENV=development
PORT=3001
DB_TYPE=mysql

# Base de Datos
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sysme_pos
DB_USER=root
DB_PASSWORD=

# JWT
JWT_SECRET=tu-secreto-aqui
JWT_EXPIRES_IN=7d
```

---

## 📞 **COMANDOS ÚTILES**

```bash
# Ver estado del proyecto
cd C:/SYSME-POS
ls -la

# Iniciar desarrollo completo
npm run dev

# Ejecutar tests
npm test

# Build para producción
npm run build

# Ver logs
tail -f logs/app.log
```

---

## ⚠️ **IMPORTANTE SOBRE JARVIS**

**JARVIS Mark VII está INTEGRADO en SYSME-POS**, no es un proyecto separado.

- **`C:/SYSME-POS/jarvis/`** → Sistema de IA completo (parte de SYSME-POS)
- **`C:/jarvis-standalone/`** → Versión standalone antigua (NO usar)

**JARVIS es el cerebro de SYSME-POS** que proporciona:
- 🧠 Memoria neural de 3 niveles
- 🤖 Agente autónomo para tareas
- 💬 Procesamiento de lenguaje natural (NLP)
- 📊 Analytics predictivos
- 🔐 Sistema de seguridad avanzado
- ⚡ Automatización inteligente

---

## 📚 **DOCUMENTACIÓN ADICIONAL**

- `README.md` - Información general del proyecto
- `CHANGELOG.md` - Historial de cambios
- `CONTRIBUTING.md` - Guía de contribución
- `docs/` - Documentación técnica detallada

---

## 🎯 **PRÓXIMOS PASOS SUGERIDOS**

1. ✅ Familiarízate con la estructura del proyecto
2. ✅ Configura tu `.env` con tus credenciales
3. ✅ Inicia backend y frontend para verificar que funciona
4. ✅ Lee `README.md` para más detalles
5. ✅ Empieza a desarrollar desde aquí

---

**¡Bienvenido a SYSME-POS!** 🍽️
**Este es tu nuevo hogar de desarrollo.**

Desde mañana, abre Claude Code en:
**`C:/SYSME-POS`**

Cualquier duda, solo pregunta. ¡Estoy aquí para ayudarte! 🤖
